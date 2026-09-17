<?php
/**
 * =============================================================================
 * api/opac.php — Высоконагруженный технологический шлюз к OPAC-Global (ЦГБ г. Владимира)
 * =============================================================================
 * Архитектура и реализация технологического конвейера:
 * 1. Сессионный менеджер:
 *    - Пул сессий и автоматическая аутентификация в cgiopac/opacg/opac.exe
 *    - Файловая блокировка flock (LOCK_EX) с двойной проверкой (double-checked locking)
 *      для предотвращения dog-pile / thundering herd эффекта
 *    - TTL сессии 3600 сек (60 минут) с упреждающим окном обновления (60 сек)
 *    - Автоматический перелогин при обнаружении истечения сессии в ответах direct.exe
 * 2. Сетевой транспорт cURL:
 *    - User-Agent браузера Mozilla/5.0
 *    - Таймауты: CURLOPT_CONNECTTIMEOUT = 4s, CURLOPT_TIMEOUT = 10s
 *    - Защита SSL: CURLOPT_SSL_VERIFYPEER = true с авто-fallback при сбоях CA
 *    - Защита OPAC от перегрузки (Rate Limiting: токен-пауза 200мс)
 * 3. Двухуровневое кэширование:
 *    - Поисковые библиографические запросы: cache/opac_search_{md5}.json (TTL 14400s / 4ч)
 *    - Экземпляры и движение книг: cache/opac_copies_{md5}.json (TTL 3600s / 1ч)
 *    - Атомарная запись через .tmp и rename
 * 4. Каскадный поиск (Cascade Fallback):
 *    - Запросы с явными метками (TI, AU, FT, SH...) выполняются напрямую
 *    - Свободный текст: фразовый поиск FT -> конъюнкция терминов -> поиск по заглавию
 * 5. Парсинг XML и сопоставление филиалов:
 *    - Чистый PHP-парсер без обязательной зависимости от ext-xml / ext-dom
 *    - Обогащение экземпляров контактными данными из branches_cache.json
 *
 * Совместимо с PHP 7.4, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5+
 * Разработка: Программист-технолог веб-сервисов
 * =============================================================================
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

if (file_exists(__DIR__ . '/OpacClient.php')) {
    require_once __DIR__ . '/OpacClient.php';
}

// -----------------------------------------------------------------------------
// Конфигурация по умолчанию и загрузка переопределений из config.php
// -----------------------------------------------------------------------------
$opacGlobalConfig = [
    'opac_base_url'        => 'https://opac.lib33.ru',
    'opac_login'           => 'CGBRD',
    'opac_password'        => 'MNBVCXZ',
    'opac_type_access'     => 'PayAccess',
    'opac_db_id'           => '62',
    'opac_rate_limit_ms'   => 200,
    'opac_connect_timeout' => 4,
    'opac_timeout'         => 10,
    'opac_session_ttl'     => 3600,     // 1 час
    'opac_search_ttl'      => 14400,    // 4 часа
    'opac_copies_ttl'      => 3600,     // 1 час
    'user_agent'           => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

$configFile = __DIR__ . DIRECTORY_SEPARATOR . 'config.php';
if (is_readable($configFile)) {
    $customConfig = include $configFile;
    if (is_array($customConfig)) {
        foreach ($opacGlobalConfig as $k => $defVal) {
            if (isset($customConfig[$k]) && $customConfig[$k] !== '') {
                $opacGlobalConfig[$k] = $customConfig[$k];
            }
        }
    }
}

/**
 * Получение текущей конфигурации OPAC
 *
 * @param string|null $key Ключ параметра
 * @return mixed
 */
function opac_get_config($key = null)
{
    global $opacGlobalConfig;
    if ($key === null) {
        return $opacGlobalConfig;
    }
    return $opacGlobalConfig[$key] ?? null;
}

/**
 * Путь к директории кэша (автоматически создаётся при отсутствии)
 *
 * @return string
 */
function opac_get_cache_dir()
{
    $cacheDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'cache';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0775, true);
    }
    return $cacheDir;
}

/**
 * Атомарная запись данных в файл (защита от повреждения при сбоях)
 *
 * @param string $path Путь к целевому файлу
 * @param mixed $data Данные для сериализации в JSON
 * @return bool
 */
function opac_atomic_write_json($path, $data)
{
    $tmp = $path . '.tmp.' . getmypid() . '.' . microtime(true);
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    $written = @file_put_contents($tmp, $json);
    if ($written === false) {
        return false;
    }
    return @rename($tmp, $path);
}

/**
 * Защита от перегрузки OPAC-сервера (Rate Limiting)
 * Обеспечивает минимальный зазор между последовательными исходящими запросами
 */
function opac_rate_limit()
{
    $rateLimitMs = (int)opac_get_config('opac_rate_limit_ms');
    if ($rateLimitMs <= 0) {
        return;
    }

    $lockFile = opac_get_cache_dir() . DIRECTORY_SEPARATOR . 'opac_rate.lock';
    $fp = @fopen($lockFile, 'c+');
    if (!$fp) {
        usleep($rateLimitMs * 1000);
        return;
    }

    if (@flock($fp, LOCK_EX)) {
        $lastTimeStr = trim((string)@stream_get_contents($fp));
        $lastTime = $lastTimeStr !== '' ? (float)$lastTimeStr : 0.0;
        $now = microtime(true);
        $elapsedMs = ($now - $lastTime) * 1000.0;

        if ($lastTime > 0 && $elapsedMs < $rateLimitMs) {
            $sleepMicro = (int)(($rateLimitMs - $elapsedMs) * 1000);
            if ($sleepMicro > 0) {
                usleep($sleepMicro);
            }
        }

        @ftruncate($fp, 0);
        @rewind($fp);
        @fwrite($fp, (string)microtime(true));
        @fflush($fp);
        @flock($fp, LOCK_UN);
    }

    @fclose($fp);
}

// -----------------------------------------------------------------------------
// 1. Сетевой транспорт cURL
// -----------------------------------------------------------------------------

/**
 * Выполнение HTTP-запроса через cURL к сервисам OPAC-Global
 *
 * @param string $url URL назначения
 * @param array|string $postFields POST-параметры (ассоциативный массив или query string)
 * @param string|null $cookieStr Строка cookie (например: "OGSSOSession=...; numsean=...")
 * @return array Массив [ok, http_code, body, headers, cookies, errno, error]
 */
function opac_make_request($url, $postFields, $cookieStr = null)
{
    if (!function_exists('curl_init')) {
        return [
            'ok'        => false,
            'http_code' => 0,
            'body'      => '',
            'headers'   => [],
            'cookies'   => [],
            'errno'     => -1,
            'error'     => 'Модуль PHP cURL не установлен на сервере.',
        ];
    }

    // Защита от перегрузки удалённого сервера
    opac_rate_limit();

    $payload = is_array($postFields) ? http_build_query($postFields) : (string)$postFields;
    $connectTimeout = (int)opac_get_config('opac_connect_timeout');
    $timeout = (int)opac_get_config('opac_timeout');
    $userAgent = (string)opac_get_config('user_agent');

    $makeAttempt = function ($sslVerifyPeer, $sslVerifyHost) use ($url, $payload, $cookieStr, $connectTimeout, $timeout, $userAgent) {
        $ch = curl_init();
        $headers = [
            'User-Agent: ' . $userAgent,
            'Accept: text/xml, text/html, */*',
            'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
        ];
        if (!empty($cookieStr)) {
            $headers[] = 'Cookie: ' . $cookieStr;
        }

        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER         => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 5,
            CURLOPT_CONNECTTIMEOUT => $connectTimeout,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_SSL_VERIFYPEER => $sslVerifyPeer,
            CURLOPT_SSL_VERIFYHOST => $sslVerifyHost,
            CURLOPT_HTTPHEADER     => $headers,
        ]);

        $rawResponse = curl_exec($ch);
        $httpCode    = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $headerSize  = (int)curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $errno       = curl_errno($ch);
        $error       = curl_error($ch);
        curl_close($ch);

        $headerStr = '';
        $body = '';
        if ($rawResponse !== false && $headerSize > 0) {
            $headerStr = substr($rawResponse, 0, $headerSize);
            $body      = substr($rawResponse, $headerSize);
        } elseif ($rawResponse !== false) {
            $body = $rawResponse;
        }

        // Парсинг Set-Cookie
        $cookies = [];
        if ($headerStr !== '') {
            if (preg_match_all('/^Set-Cookie:\s*([^;=\s]+)=([^;\r\n]*)/mi', $headerStr, $matches, PREG_SET_ORDER)) {
                foreach ($matches as $m) {
                    $cookies[$m[1]] = trim($m[2]);
                }
            }
        }

        return [
            'ok'        => ($httpCode >= 200 && $httpCode < 300 && $errno === 0),
            'http_code' => $httpCode,
            'body'      => $body,
            'headers'   => $headerStr,
            'cookies'   => $cookies,
            'errno'     => $errno,
            'error'     => $error,
        ];
    };

    // Первая попытка со строгой валидацией SSL
    $result = $makeAttempt(true, 2);

    // Автоматический fallback при устаревших сертификатах хостинга (SSL errno 60 / 77)
    if ($result['errno'] === 60 || $result['errno'] === 77) {
        $result = $makeAttempt(false, 0);
        $result['ssl_fallback'] = true;
    }

    return $result;
}

// -----------------------------------------------------------------------------
// 2. Авторизация и пулинг сессий (CGBRD / MNBVCXZ)
// -----------------------------------------------------------------------------

/**
 * Проверка, содержит ли ответ ошибку истечения/отсутствия сессии
 *
 * @param string $body Тело ответа (XML или HTML)
 * @return bool
 */
function opac_is_session_expired_response($body)
{
    if (empty($body)) {
        return false;
    }
    // Типичные сигнатуры завершения сеанса в OPAC-Global:
    // <error signature="SessionStorageSqliteException:8" ...>Сеанс работы с OPAC-Global завершен</error>
    // Отсутствует обязательный аргумент 'session'
    // Необходима повторная авторизация
    return (
        stripos($body, 'SessionStorageSqliteException') !== false ||
        stripos($body, 'Сеанс работы с OPAC-Global завершен') !== false ||
        stripos($body, 'Необходима повторная авторизация') !== false ||
        stripos($body, "Отсутствует обязательный аргумент 'session'") !== false ||
        stripos($body, 'session expired') !== false
    );
}

/**
 * Получение активной сессии OPAC-Global (с flock блокировкой и кэшированием)
 *
 * @param bool $forceRefresh Принудительно запросить новую сессию
 * @return array Данные сессии [OGSSOSession, numsean, identif, created_at, expires_at]
 */
function opac_get_session($forceRefresh = false)
{
    $cacheDir = opac_get_cache_dir();
    $sessionFile = $cacheDir . DIRECTORY_SEPARATOR . 'opac_session.json';
    $lockFile = $cacheDir . DIRECTORY_SEPARATOR . 'opac_session.lock';
    $ttl = (int)opac_get_config('opac_session_ttl');

    // 1. Быстрая проверка без блокировки: если сессия свежая, возвращаем сразу
    if (!$forceRefresh && is_file($sessionFile)) {
        $raw = @file_get_contents($sessionFile);
        $cached = json_decode((string)$raw, true);
        if (is_array($cached)
            && !empty($cached['OGSSOSession'])
            && !empty($cached['numsean'])
            && isset($cached['expires_at'])
            // Окно безопасности 60 сек до реального истечения
            && time() < ((int)$cached['expires_at'] - 60)
        ) {
            $cached['from_cache'] = true;
            return $cached;
        }
    }

    // 2. Захват эксклюзивной файловой блокировки для обновления
    $fp = @fopen($lockFile, 'c+');
    if (!$fp) {
        // Если не удалось открыть lock-файл, выполняем прямой запрос
        return opac_authenticate_direct();
    }

    @flock($fp, LOCK_EX);

    // 3. Double-checked locking: пока мы ждали блокировку, другой параллельный процесс
    // мог уже успешно обновить сессию
    if (!$forceRefresh && is_file($sessionFile)) {
        $raw = @file_get_contents($sessionFile);
        $cached = json_decode((string)$raw, true);
        if (is_array($cached)
            && !empty($cached['OGSSOSession'])
            && !empty($cached['numsean'])
            && isset($cached['expires_at'])
            && time() < ((int)$cached['expires_at'] - 60)
        ) {
            @flock($fp, LOCK_UN);
            @fclose($fp);
            $cached['from_cache'] = true;
            return $cached;
        }
    }

    // 4. Запрос новой сессии к шлюзу opac.exe
    $session = opac_authenticate_direct();

    if (!empty($session['OGSSOSession']) && !empty($session['numsean'])) {
        opac_atomic_write_json($sessionFile, $session);
    }

    @flock($fp, LOCK_UN);
    @fclose($fp);

    return $session;
}

/**
 * Прямой запрос аутентификации к opac.exe
 *
 * @return array
 */
function opac_authenticate_direct()
{
    $baseUrl    = rtrim((string)opac_get_config('opac_base_url'), '/');
    $login      = (string)opac_get_config('opac_login');
    $password   = (string)opac_get_config('opac_password');
    $typeAccess = (string)opac_get_config('opac_type_access');
    $ttl        = (int)opac_get_config('opac_session_ttl');

    $url = $baseUrl . '/cgiopac/opacg/opac.exe';
    $postData = [
        'arg0'       => $login,
        'arg1'       => $password,
        'TypeAccess' => $typeAccess,
    ];

    $resp = opac_make_request($url, $postData);

    if (!$resp['ok']) {
        return [
            'ok'        => false,
            'error'     => 'Сетевая ошибка авторизации в OPAC: ' . ($resp['error'] ?: 'HTTP ' . $resp['http_code']),
            'http_code' => $resp['http_code'],
            'errno'     => $resp['errno'],
        ];
    }

    $cookieSession = $resp['cookies']['OGSSOSession'] ?? '';
    $body = $resp['body'];

    // Извлечение параметров сессии из JavaScript-переменных в теле ответа:
    // var identif="CGBRD";
    // var numsean="4267100";
    $identif = '';
    if (preg_match('/var\s+identif\s*=\s*"([^"]+)";/i', $body, $mId)) {
        $identif = trim($mId[1]);
    } else {
        $identif = $login;
    }

    $numsean = '';
    if (preg_match('/var\s+numsean\s*=\s*"([^"]+)";/i', $body, $mNum)) {
        $numsean = trim($mNum[1]);
    }

    if (empty($cookieSession) || empty($numsean)) {
        return [
            'ok'           => false,
            'error'        => 'Не удалось разобрать сессию OPAC: отсутствуют cookie OGSSOSession или переменная numsean.',
            'cookies_got'  => array_keys($resp['cookies']),
            'numsean_got'  => $numsean,
            'preview_body' => substr(strip_tags($body), 0, 300),
        ];
    }

    $now = time();
    return [
        'ok'           => true,
        'OGSSOSession' => $cookieSession,
        'numsean'      => $numsean,
        'identif'      => $identif,
        'created_at'   => $now,
        'expires_at'   => $now + $ttl,
    ];
}

// -----------------------------------------------------------------------------
// 3. Парсеры XML ответов OPAC-Global (чистый PHP, 0 внешних зависимостей)
// -----------------------------------------------------------------------------

/**
 * Проверка наличия узла <error> и извлечение сообщения об ошибке
 *
 * @param string $xml
 * @return array|null [message, action, signature, type] либо null если ошибок нет
 */
function opac_extract_xml_error($xml)
{
    if (stripos($xml, '<error') === false) {
        return null;
    }

    $result = [
        'signature' => '',
        'type'      => '',
        'comment'   => '',
        'message'   => '',
        'action'    => '',
    ];

    if (preg_match('/<error\s+([^>]*?)>(.*?)<\/error>/s', $xml, $mErr)) {
        $attrStr = $mErr[1];
        $inner = $mErr[2];

        if (preg_match('/signature="([^"]*)"/i', $attrStr, $m)) {
            $result['signature'] = $m[1];
        }
        if (preg_match('/type="([^"]*)"/i', $attrStr, $m)) {
            $result['type'] = $m[1];
        }
        if (preg_match('/comment="([^"]*)"/i', $attrStr, $m)) {
            $result['comment'] = $m[1];
        }

        if (preg_match('/<message>(.*?)<\/message>/s', $inner, $mMsg)) {
            preg_match_all('/<entry>(.*?)<\/entry>/s', $mMsg[1], $entries);
            $result['message'] = implode('; ', array_map('trim', $entries[1] ?? []));
        }

        if (preg_match('/<action>(.*?)<\/action>/s', $inner, $mAct)) {
            preg_match_all('/<entry>(.*?)<\/entry>/s', $mAct[1], $entries);
            $result['action'] = implode('; ', array_map('trim', $entries[1] ?? []));
        }

        return $result;
    }

    return null;
}

/**
 * Парсинг библиографического ответа сервиса opacfindd.FindView
 *
 * @param string $xml
 * @return array
 */
function opac_parse_search_xml($xml)
{
    $error = opac_extract_xml_error($xml);
    if ($error !== null) {
        return [
            'ok'    => false,
            'error' => $error['message'] ?: 'Ошибка поиска OPAC-Global',
            'error_details' => $error,
            'total_found'   => 0,
            'items'         => [],
        ];
    }

    $totalFound = 0;
    if (preg_match('/<document[^>]*\bsize="(\d+)"/i', $xml, $mSize)) {
        $totalFound = (int)$mSize[1];
    }

    $maxLastResult = 0;
    if (preg_match('/<document[^>]*\bmaxLastResult="(\d+)"/i', $xml, $mMax)) {
        $maxLastResult = (int)$mMax[1];
    }

    $items = [];
    if (preg_match('/<result>(.*?)<\/result>/s', $xml, $mResult)) {
        // Извлекаем все <entry id="..." ...>...</entry> верхнего уровня
        preg_match_all('/<entry\s+([^>]*?\bid="[^"]*"[^>]*?)>(.*?)<\/entry>\s*(?=<entry\s+[^>]*\bid="|<\/result>|$)/s', $mResult[1], $entryMatches, PREG_SET_ORDER);

        foreach ($entryMatches as $entry) {
            $attrStr = $entry[1];
            $body    = $entry[2];

            $attrs = [];
            if (preg_match_all('/([a-zA-Z0-9_-]+)="([^"]*)"/', $attrStr, $mAttrs, PREG_SET_ORDER)) {
                foreach ($mAttrs as $ma) {
                    $attrs[$ma[1]] = html_entity_decode($ma[2], ENT_QUOTES | ENT_XML1, 'UTF-8');
                }
            }

            // Парсинг строк SHOTFORM
            $shotformLines = [];
            if (preg_match('/<SHOTFORM>(.*?)<\/SHOTFORM>/s', $body, $mShot)) {
                if (preg_match('/<content>(.*?)<\/content>/s', $mShot[1], $mContent)) {
                    preg_match_all('/<entry>(.*?)<\/entry>/s', $mContent[1], $cEntries);
                    foreach ($cEntries[1] as $cline) {
                        $shotformLines[] = trim(html_entity_decode($cline, ENT_QUOTES | ENT_XML1, 'UTF-8'));
                    }
                }
            }

            // Доступные действия (например, SEE6 — движение экземпляров)
            $actions = [];
            if (preg_match_all('/<action>\s*<entry\s+id="([^"]*)"\s+title="([^"]*)"\s*\/>/i', $body, $mActions, PREG_SET_ORDER)) {
                foreach ($mActions as $ma) {
                    $actions[$ma[1]] = html_entity_decode($ma[2], ENT_QUOTES | ENT_XML1, 'UTF-8');
                }
            }

            // Экземпляры AVAILABLEEXEMPLARS
            $availPossible = 0;
            $availQuantity = 0;
            if (preg_match('/<AVAILABLEEXEMPLARS[^>]*\bpossible="(\d+)"[^>]*\bquantity="(\d+)"/i', $body, $mAvail)) {
                $availPossible = (int)$mAvail[1];
                $availQuantity = (int)$mAvail[2];
            } elseif (preg_match('/<AVAILABLEEXEMPLARS[^>]*\bquantity="(\d+)"[^>]*\bpossible="(\d+)"/i', $body, $mAvail)) {
                $availQuantity = (int)$mAvail[1];
                $availPossible = (int)$mAvail[2];
            }

            // Интеллектуальный разбор библиографической строки SHOTFORM
            $meta = opac_parse_shotform_lines($shotformLines);

            $items[] = [
                'id'                  => $attrs['id'] ?? '',
                'isn'                 => $attrs['isn'] ?? '',
                'iddb'                => $attrs['iddb'] ?? '62',
                'level'               => $attrs['level'] ?? 'Full',
                'status'              => $attrs['status'] ?? 'NEW',
                'title'               => $meta['title'],
                'author'              => $meta['author'],
                'year'                => $meta['year'],
                'imprint'             => $meta['imprint'],
                'shelfmark'           => $meta['shelfmark'],
                'inventory'           => $meta['inventory'],
                'locations'           => $meta['locations'],
                'available_possible'  => $availPossible,
                'available_quantity'  => $availQuantity,
                'actions'             => $actions,
                'shotform_raw'        => $shotformLines,
            ];
        }
    }

    return [
        'ok'              => true,
        'total_found'     => $totalFound,
        'max_last_result' => $maxLastResult,
        'count'           => count($items),
        'items'           => $items,
    ];
}

/**
 * Разбор текстовых строк SHOTFORM на структурированные поля
 *
 * @param array $lines
 * @return array
 */
function opac_parse_shotform_lines(array $lines)
{
    $author = '';
    $title = '';
    $year = '';
    $imprint = '';
    $shelfmark = '';
    $inventory = '';
    $locations = [];

    $firstLine = $lines[0] ?? '';
    if ($firstLine !== '') {
        // Формат строки: "Автор, Заглавие - Год.- Стр."
        if (preg_match('/^([^,]+),\s*(.*?)(?:\s*-\s*(\d{4}))/u', $firstLine, $m)) {
            $author = trim($m[1]);
            $title  = trim($m[2]);
            $year   = trim($m[3]);
        } elseif (preg_match('/^(.*?)(?:\s*-\s*(\d{4}))/u', $firstLine, $m)) {
            $title = trim($m[1]);
            $year  = trim($m[2]);
        } else {
            $title = $firstLine;
        }
        $imprint = $firstLine;
    }

    foreach ($lines as $line) {
        if (preg_match('/Шифр\s+([^;]+)/u', $line, $mShifr)) {
            $shelfmark = trim($mShifr[1]);
        }
        if (preg_match('/Инв\.номер\s+([^;]+)/u', $line, $mInv)) {
            $inventory = trim($mInv[1]);
        }
        if (preg_match_all('/Место хранения:\s*([^;,\.]+)/u', $line, $mLoc)) {
            foreach ($mLoc[1] as $loc) {
                $clean = trim($loc);
                if ($clean !== '' && !in_array($clean, $locations, true)) {
                    $locations[] = $clean;
                }
            }
        }
    }

    return [
        'author'    => $author,
        'title'     => $title,
        'year'      => $year,
        'imprint'   => $imprint,
        'shelfmark' => $shelfmark,
        'inventory' => $inventory,
        'locations' => $locations,
    ];
}

/**
 * Загрузка реестра филиалов из branches_cache.json
 *
 * @return array
 */
function opac_load_branches()
{
    static $branches = null;
    if ($branches !== null) {
        return $branches;
    }

    $branchesFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'branches_cache.json';
    if (is_file($branchesFile)) {
        $raw = @file_get_contents($branchesFile);
        $decoded = json_decode((string)$raw, true);
        if (is_array($decoded)) {
            $branches = $decoded;
            return $branches;
        }
    }

    $branches = [];
    return $branches;
}

/**
 * Сопоставление кода/метки OPAC с филиалом библиотечной системы Владимира
 *
 * @param string $branchCode Код филиала из subfield "b" (например, "ф1", "ф4", "аб", "чз")
 * @param string $locationStr Строка местонахождения из атрибута location
 * @return array|null Данные филиала
 */
function opac_map_branch($branchCode, $locationStr = '')
{
    // 1. Первичное сопоставление по эталонному библиотечному словарю OpacClient
    if (class_exists('OpacClient')) {
        $resolved = OpacClient::resolveBranchBySigla((string)$branchCode);
        if (!$resolved && !empty($locationStr)) {
            $siglaFromLoc = OpacClient::extractSiglaFromPermanentLocation($locationStr);
            $resolved = OpacClient::resolveBranchBySigla($siglaFromLoc);
        }
        if ($resolved) {
            return [
                'branch_num'     => $resolved['branch_num'],
                'branch_name'    => $resolved['branch_name'],
                'department'     => $resolved['department'] ?? '',
                'address'        => $resolved['address'],
                'phone'          => $resolved['phone'],
                'district'       => $resolved['district'],
                'is_dobroye'     => $resolved['is_dobroye'],
                'is_center'      => $resolved['is_center'],
                'branch_url'     => 'https://biblioteka33.ru'
            ];
        }
    }

    $branches = opac_load_branches();
    if (empty($branches)) {
        return null;
    }

    $branchCodeClean = mb_strtolower(trim((string)$branchCode), 'UTF-8');
    $locationClean   = mb_strtolower(trim((string)$locationStr), 'UTF-8');

    // Определение номера филиала
    $targetNum = null;

    // Проверка кодов "ф1", "ф-1", "ф12"
    if (preg_match('/^ф[\s-]*(\d+)/u', $branchCodeClean, $m)) {
        $targetNum = 'Ф-' . (int)$m[1];
    } elseif (preg_match('/цгб-ф(\d+)/u', $locationClean, $m)) {
        $targetNum = 'Ф-' . (int)$m[1];
    } elseif (preg_match('/филиал\s*(?:№|no\.|#)?\s*(\d+)/u', $locationClean, $m)) {
        $targetNum = 'Ф-' . (int)$m[1];
    } elseif (in_array($branchCodeClean, ['аб', 'чз', 'до', 'ибо', 'ооо', 'кх'], true) ||
              strpos($locationClean, 'цгб') !== false) {
        $targetNum = 'ЦГБ';
    } elseif (strpos($branchCodeClean, 'цдб') !== false || strpos($locationClean, 'цдб') !== false) {
        $targetNum = 'ЦДБ';
    }

    if ($targetNum !== null) {
        foreach ($branches as $b) {
            if (isset($b['branch_num']) && mb_strtoupper($b['branch_num'], 'UTF-8') === mb_strtoupper($targetNum, 'UTF-8')) {
                return $b;
            }
        }
    }

    return null;
}

/**
 * Парсинг ответа со списком экземпляров opacholdd.MoveCopies
 *
 * @param string $xml
 * @return array
 */
function opac_parse_copies_xml($xml)
{
    $error = opac_extract_xml_error($xml);
    if ($error !== null) {
        return [
            'ok'            => false,
            'error'         => $error['message'] ?: 'Ошибка получения экземпляров OPAC',
            'error_details' => $error,
            'copies'        => [],
        ];
    }

    $idbr = '';
    $iddb = '62';
    $found = 0;
    $free = 0;
    $outform = '';

    if (preg_match('/<document\s+([^>]*?)>/i', $xml, $mDoc)) {
        $docAttrs = $mDoc[1];
        if (preg_match('/idbr="([^"]*)"/i', $docAttrs, $m)) {
            $idbr = html_entity_decode($m[1], ENT_QUOTES | ENT_XML1, 'UTF-8');
        }
        if (preg_match('/iddb="([^"]*)"/i', $docAttrs, $m)) {
            $iddb = $m[1];
        }
        if (preg_match('/found="(\d+)"/i', $docAttrs, $m)) {
            $found = (int)$m[1];
        }
        if (preg_match('/free="(\d+)"/i', $docAttrs, $m)) {
            $free = (int)$m[1];
        }
        if (preg_match('/outform="([^"]*)"/i', $docAttrs, $m)) {
            $outform = html_entity_decode($m[1], ENT_QUOTES | ENT_XML1, 'UTF-8');
        }
    }

    $copies = [];
    if (preg_match('/<copies>(.*?)<\/copies>/s', $xml, $mCopies)) {
        preg_match_all('/<entry\s+([^>]*?)>(.*?)<\/entry>\s*(?=<entry|<\/copies>|$)/s', $mCopies[1], $entryMatches, PREG_SET_ORDER);

        foreach ($entryMatches as $entry) {
            $attrStr = $entry[1];
            $body    = $entry[2];

            $attrs = [];
            if (preg_match_all('/([a-zA-Z0-9_-]+)="([^"]*)"/', $attrStr, $mAttrs, PREG_SET_ORDER)) {
                foreach ($mAttrs as $ma) {
                    $attrs[$ma[1]] = html_entity_decode($ma[2], ENT_QUOTES | ENT_XML1, 'UTF-8');
                }
            }

            // Подполя field899
            $subfields = [];
            if (preg_match_all('/<entry\s+sub="([^"]*)"\s+value="([^"]*)"\s*\/>/i', $body, $mSubs, PREG_SET_ORDER)) {
                foreach ($mSubs as $ms) {
                    $subfields[$ms[1]] = html_entity_decode($ms[2], ENT_QUOTES | ENT_XML1, 'UTF-8');
                }
            }

            $loc = $attrs['location'] ?? '';
            $permLoc = $attrs['permanentLocation'] ?? '';
            $subB = $subfields['b'] ?? '';

            // Доступность для выдачи (не списан и не заблокирован)
            $isNotAvailable = (
                stripos($loc, 'не доступен для книговыдачи') !== false ||
                stripos($loc, 'списан') !== false ||
                ($attrs['status'] ?? '') === '0'
            );
            $isAvailable = !$isNotAvailable;

            // Сопоставление с реестром филиалов
            $branchInfo = opac_map_branch($subB, $loc !== '' ? $loc : $permLoc);

            $copies[] = [
                'inventory'          => $attrs['inventory'] ?? ($subfields['x'] ?? ''),
                'barcode'            => $attrs['barcode'] ?? '',
                'shifr'              => $attrs['shifr'] ?? ($subfields['j'] ?? ''),
                'location'           => $loc,
                'permanent_location' => $permLoc,
                'status_code'        => $attrs['status'] ?? '',
                'is_available'       => $isAvailable,
                'subfield_b'         => $subB,
                'subfield_a'         => $subfields['a'] ?? '',
                'branch_code'        => $branchInfo['branch_num'] ?? $subB,
                'branch_name'        => $branchInfo['branch_name'] ?? ($loc ?: $permLoc),
                'branch_address'     => $branchInfo['address'] ?? null,
                'branch_phone'       => $branchInfo['phone'] ?? null,
                'branch_district'    => $branchInfo['district'] ?? null,
                'is_dobroye'         => !empty($branchInfo['is_dobroye']),
                'is_center'          => !empty($branchInfo['is_center']),
                'branch_url'         => $branchInfo['branch_url'] ?? null,
                'field899'           => $subfields,
            ];
        }
    }

    return [
        'ok'           => true,
        'idbr'         => $idbr,
        'iddb'         => $iddb,
        'found'        => $found,
        'free'         => $free,
        'outform'      => $outform,
        'total'        => count($copies),
        'total_copies' => count($copies),
        'copies'       => $copies,
    ];
}

// -----------------------------------------------------------------------------
// 4. Поисковый шлюз и получение экземпляров (с двухуровневым кэшированием)
// -----------------------------------------------------------------------------

/**
 * Нормализация и форматирование поискового выражения для OPAC-Global
 *
 * @param string $query Входной запрос
 * @return string Корректное выражение с метками (FT, TI, AU...)
 */
function opac_format_query($query)
{
    $q = trim((string)$query);
    if ($q === '') {
        return '';
    }

    // Если запрос уже содержит метки OPAC или операторы в скобках
    if (preg_match('/^(?:FT|TI|AU|SH|BC|IN|PU|PY|LA|FD)\s+/i', $q) ||
        preg_match('/^\s*\(\s*(?:FT|TI|AU|SH|BC|IN|PU|PY)/i', $q)
    ) {
        return $q;
    }

    // Разделение на слова
    $words = preg_split('/[\s,]+/u', $q, -1, PREG_SPLIT_NO_EMPTY);
    if (empty($words)) {
        return "FT '{$q}'";
    }

    if (count($words) === 1) {
        // Одиночное слово — полнотекстовый поиск
        return "FT {$words[0]}";
    }

    // Несколько слов: конъюнкция терминов (FT слово1 AND FT слово2 ...)
    $parts = [];
    foreach ($words as $w) {
        // Очистка от спецсимволов кавычек
        $cleanWord = str_replace(["'", '"'], '', $w);
        if ($cleanWord !== '') {
            $parts[] = "FT {$cleanWord}";
        }
    }

    if (count($parts) > 1) {
        return '(' . implode(' AND ', $parts) . ')';
    }

    return "FT '{$q}'";
}

/**
 * Библиографический поиск в каталоге ЦГБ (opacfindd.FindView)
 * Кэш: cache/opac_search_{md5}.json (TTL 14400 сек / 4 часа)
 *
 * @param string $query Поисковое выражение
 * @param int $length Лимит записей на порцию (по умолчанию 5)
 * @param int $start Смещение от начала (0-indexed)
 * @return array
 */
function opac_search_raw($query, $length = 5, $start = 0)
{
    $query = trim((string)$query);
    if ($query === '') {
        return [
            'ok'          => false,
            'error'       => 'Поисковый запрос не может быть пустым.',
            'total_found' => 0,
            'items'       => [],
        ];
    }

    $length = max(1, min(50, (int)$length));
    $start  = max(0, (int)$start);

    // Проверка кэша первого уровня (поисковые запросы)
    $cacheDir  = opac_get_cache_dir();
    $cacheKey  = md5($query . '|' . $length . '|' . $start);
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . "opac_search_{$cacheKey}.json";
    $searchTtl = (int)opac_get_config('opac_search_ttl');

    if (is_file($cacheFile)) {
        $mtime = @filemtime($cacheFile);
        if ($mtime !== false && (time() - $mtime) < $searchTtl) {
            $cached = json_decode((string)@file_get_contents($cacheFile), true);
            if (is_array($cached) && isset($cached['ok'])) {
                $cached['_cached']    = true;
                $cached['_cached_at'] = $mtime;
                return $cached;
            }
        }
    }

    // Получение сессии
    $session = opac_get_session(false);
    if (empty($session['ok']) || empty($session['numsean'])) {
        return [
            'ok'    => false,
            'error' => 'Ошибка авторизации в OPAC-Global: ' . ($session['error'] ?? 'не удалось получить сессию'),
        ];
    }

    $baseUrl   = rtrim((string)opac_get_config('opac_base_url'), '/');
    $directUrl = $baseUrl . '/cgiopac/opacg/direct.exe';
    $dbId      = (string)opac_get_config('opac_db_id');
    $bodyExpr  = opac_format_query($query);

    $buildPost = function ($sess) use ($dbId, $length, $start, $bodyExpr) {
        return [
            '_service'               => 'opacfindd.FindView',
            '_version'               => '2.7.0',
            '_wait'                  => '6M',
            'length'                 => (string)$length,
            'start'                  => (string)$start,
            'userId'                 => $sess['identif'],
            'session'                => $sess['numsean'],
            'iddb'                   => $dbId,
            'outformList[0]/outform' => 'SHOTFORM',
            'outformList[1]/outform' => 'AVAILABLEEXEMPLARS',
            'query/body'             => $bodyExpr,
        ];
    };

    $cookieStr = 'OGSSOSession=' . $session['OGSSOSession'] . '; numsean=' . $session['numsean'];
    $resp = opac_make_request($directUrl, $buildPost($session), $cookieStr);

    // Автоматический перелогин при протухании сессии
    if (!$resp['ok'] || opac_is_session_expired_response($resp['body'])) {
        $session = opac_get_session(true);
        if (!empty($session['ok']) && !empty($session['numsean'])) {
            $cookieStr = 'OGSSOSession=' . $session['OGSSOSession'] . '; numsean=' . $session['numsean'];
            $resp = opac_make_request($directUrl, $buildPost($session), $cookieStr);
        }
    }

    if (!$resp['ok']) {
        return [
            'ok'        => false,
            'error'     => 'Сетевая ошибка обращения к поисковому шлюзу OPAC: ' . ($resp['error'] ?: 'HTTP ' . $resp['http_code']),
            'http_code' => $resp['http_code'],
        ];
    }

    $parsed = opac_parse_search_xml($resp['body']);
    $parsed['query']        = $query;
    $parsed['query_expr']   = $bodyExpr;
    $parsed['length']       = $length;
    $parsed['start']        = $start;
    $parsed['raw_xml']      = $resp['body'];

    if ($parsed['ok']) {
        opac_atomic_write_json($cacheFile, $parsed);
    }

    return $parsed;
}

/**
 * Получение точного списка экземпляров и филиалов книги (opacholdd.MoveCopies)
 * Кэш: cache/opac_copies_{md5}.json (TTL 3600 сек / 1 час)
 *
 * @param string $recordId Идентификатор библиографической записи (idbr, например: "RU VLADIMIR\BIBL\0002736712")
 * @return array
 */
function opac_get_copies_raw($recordId)
{
    $recordId = trim((string)$recordId);
    if ($recordId === '') {
        return [
            'ok'     => false,
            'error'  => 'Идентификатор записи (recordId/idbr) не может быть пустым.',
            'copies' => [],
        ];
    }

    // Проверка кэша второго уровня (экземпляры книги)
    $cacheDir  = opac_get_cache_dir();
    $cacheKey  = md5($recordId);
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . "opac_copies_{$cacheKey}.json";
    $copiesTtl = (int)opac_get_config('opac_copies_ttl');

    if (is_file($cacheFile)) {
        $mtime = @filemtime($cacheFile);
        if ($mtime !== false && (time() - $mtime) < $copiesTtl) {
            $cached = json_decode((string)@file_get_contents($cacheFile), true);
            if (is_array($cached) && isset($cached['ok'])) {
                $cached['_cached']    = true;
                $cached['_cached_at'] = $mtime;
                return $cached;
            }
        }
    }

    // Получение сессии
    $session = opac_get_session(false);
    if (empty($session['ok']) || empty($session['numsean'])) {
        return [
            'ok'    => false,
            'error' => 'Ошибка авторизации в OPAC-Global: ' . ($session['error'] ?? 'не удалось получить сессию'),
        ];
    }

    $baseUrl   = rtrim((string)opac_get_config('opac_base_url'), '/');
    $directUrl = $baseUrl . '/cgiopac/opacg/direct.exe';
    $dbId      = (string)opac_get_config('opac_db_id');

    $buildPost = function ($sess) use ($dbId, $recordId) {
        return [
            '_service' => 'opacholdd.MoveCopies',
            '_version' => '1.0.0',
            'iddb'     => $dbId,
            'idbr'     => $recordId,
            'id'       => $sess['identif'],
            'userId'   => $sess['identif'],
            'session'  => $sess['numsean'],
        ];
    };

    $cookieStr = 'OGSSOSession=' . $session['OGSSOSession'] . '; numsean=' . $session['numsean'];
    $resp = opac_make_request($directUrl, $buildPost($session), $cookieStr);

    // Автоматический перелогин при ошибке сессии
    if (!$resp['ok'] || opac_is_session_expired_response($resp['body'])) {
        $session = opac_get_session(true);
        if (!empty($session['ok']) && !empty($session['numsean'])) {
            $cookieStr = 'OGSSOSession=' . $session['OGSSOSession'] . '; numsean=' . $session['numsean'];
            $resp = opac_make_request($directUrl, $buildPost($session), $cookieStr);
        }
    }

    if (!$resp['ok']) {
        return [
            'ok'        => false,
            'error'     => 'Сетевая ошибка обращения к сервису экземпляров: ' . ($resp['error'] ?: 'HTTP ' . $resp['http_code']),
            'http_code' => $resp['http_code'],
        ];
    }

    $parsed = opac_parse_copies_xml($resp['body']);
    $parsed['record_id'] = $recordId;
    $parsed['raw_xml']   = $resp['body'];

    if ($parsed['ok']) {
        opac_atomic_write_json($cacheFile, $parsed);
    }

    return $parsed;
}

/**
 * Каскадный поиск (Cascade Fallback):
 * Уровень 1: Термины через конъюнкцию (FT w1 AND FT w2 ...)
 * Уровень 2: Точная фраза в кавычках FT 'phrase'
 * Уровень 3: Поиск в заглавии (TI w1 AND TI w2 ...)
 *
 * @param string $query
 * @param int $length
 * @param int $start
 * @return array
 */
function opac_cascade_search($query, $length = 5, $start = 0)
{
    $clean = trim((string)$query);
    if ($clean === '') {
        return opac_search_raw($query, $length, $start);
    }

    // Если запрос содержит синтаксис OPAC — выполняем напрямую
    if (preg_match('/^(?:FT|TI|AU|SH|BC|IN)\s+/i', $clean) || strpos($clean, '(') !== false) {
        return opac_search_raw($clean, $length, $start);
    }

    // 1-й каскад: стандартное форматирование
    $res1 = opac_search_raw($clean, $length, $start);
    if (!empty($res1['ok']) && ($res1['total_found'] ?? 0) > 0) {
        $res1['cascade_tier'] = 1;
        return $res1;
    }

    // 2-й каскад: фразовый поиск в кавычках FT '...'
    $phraseQuery = "FT '" . str_replace(["'", '"'], '', $clean) . "'";
    $res2 = opac_search_raw($phraseQuery, $length, $start);
    if (!empty($res2['ok']) && ($res2['total_found'] ?? 0) > 0) {
        $res2['cascade_tier'] = 2;
        return $res2;
    }

    // 3-й каскад: поиск по заглавию TI
    $words = preg_split('/[\s,]+/u', $clean, -1, PREG_SPLIT_NO_EMPTY);
    if (count($words) > 1) {
        $tiParts = [];
        foreach ($words as $w) {
            $cw = str_replace(["'", '"'], '', $w);
            if ($cw !== '') {
                $tiParts[] = "TI {$cw}";
            }
        }
        $tiQuery = '(' . implode(' AND ', $tiParts) . ')';
        $res3 = opac_search_raw($tiQuery, $length, $start);
        if (!empty($res3['ok']) && ($res3['total_found'] ?? 0) > 0) {
            $res3['cascade_tier'] = 3;
            return $res3;
        }
    }

    // Возвращаем результат первого поиска (с total_found = 0)
    $res1['cascade_tier'] = 0;
    return $res1;
}

/**
 * Удобная обертка для поиска книг в OPAC-Global (каскадный поиск)
 *
 * @param string $query Поисковый запрос
 * @param int $length Лимит записей
 * @param int $start Смещение
 * @param bool $cascade Использовать ли каскадный fallback
 * @return array
 */
function opac_search_books($query, $length = 5, $start = 0, $cascade = true)
{
    return $cascade ? opac_cascade_search($query, $length, $start) : opac_search_raw($query, $length, $start);
}

/**
 * Удобная обертка для получения информации об экземплярах книги
 *
 * @param string $recordId
 * @return array
 */
function opac_get_book_copies($recordId)
{
    return opac_get_copies_raw($recordId);
}

/**
 * Разрешение сигнатуры/сиглы филиала в структурированный массив
 *
 * @param string $branchCode
 * @param string $locationStr
 * @return array|null
 */
function opac_resolve_branch($branchCode, $locationStr = '')
{
    return opac_map_branch($branchCode, $locationStr);
}

// -----------------------------------------------------------------------------
// 5. Обработчик входящих HTTP / CLI запросов (микросервис API)
// -----------------------------------------------------------------------------

/**
 * Обработка внешних запросов к api/opac.php через GET / POST / CLI
 */
function opac_handle_http_request()
{
    $isCli = (PHP_SAPI === 'cli');

    if (!$isCli) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Content-Type: application/json; charset=UTF-8');

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    $rawInput = $isCli ? '' : file_get_contents('php://input');
    $rawInput = preg_replace('/^\xEF\xBB\xBF/', '', (string)$rawInput);
    $jsonData = json_decode($rawInput, true);

    $params = array_merge(
        $_GET ?? [],
        $_POST ?? [],
        is_array($jsonData) ? $jsonData : []
    );

    // Поддержка аргументов командной строки (CLI)
    if ($isCli && empty($params) && !empty($_SERVER['argv'])) {
        $argv = $_SERVER['argv'];
        if (isset($argv[1])) {
            $arg1 = trim($argv[1]);
            if (strpos($arg1, '--') === 0) {
                foreach ($argv as $arg) {
                    if (preg_match('/^--([a-zA-Z0-9_-]+)=(.*)$/', $arg, $mArg)) {
                        $params[$mArg[1]] = $mArg[2];
                    }
                }
            } else {
                $params['action'] = $arg1;
                if (isset($argv[2])) {
                    if ($arg1 === 'search' || $arg1 === 'find') {
                        $params['action'] = 'search';
                        $params['q'] = $argv[2];
                        if (isset($argv[3])) $params['length'] = (int)$argv[3];
                        if (isset($argv[4])) $params['start'] = (int)$argv[4];
                    } elseif ($arg1 === 'copies' || $arg1 === 'holdings') {
                        $params['action'] = 'copies';
                        $params['id'] = $argv[2];
                    }
                }
            }
        }
    }

    $action = isset($params['action']) ? trim((string)$params['action']) : 'status';

    switch ($action) {
        // Проверка статуса сессии
        case 'status':
        case 'session':
            $force = !empty($params['refresh']);
            $session = opac_get_session($force);
            $safeSession = [
                'ok'            => !empty($session['ok']),
                'has_cookie'    => !empty($session['OGSSOSession']),
                'identif'       => $session['identif'] ?? 'CGBRD',
                'numsean'       => $session['numsean'] ?? '',
                'created_at'    => $session['created_at'] ?? 0,
                'expires_at'    => $session['expires_at'] ?? 0,
                'ttl_remaining' => isset($session['expires_at']) ? max(0, $session['expires_at'] - time()) : 0,
                'from_cache'    => !empty($session['from_cache']),
            ];
            if (!empty($session['error'])) {
                $safeSession['error'] = $session['error'];
            }
            echo json_encode($safeSession, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit;

        // Поиск библиографических записей
        case 'search':
            $query   = isset($params['query']) ? (string)$params['query'] : (string)($params['q'] ?? '');
            $length  = isset($params['length']) ? (int)$params['length'] : 5;
            $start   = isset($params['start']) ? (int)$params['start'] : 0;
            $cascade = !empty($params['cascade']);

            if ($cascade) {
                $result = opac_cascade_search($query, $length, $start);
            } else {
                $result = opac_search_raw($query, $length, $start);
            }

            // Не отдаём сырой XML клиенту по умолчанию для экономии трафика, если не запрошено
            if (empty($params['include_xml']) && isset($result['raw_xml'])) {
                unset($result['raw_xml']);
            }

            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            exit;

        // Получение экземпляров и филиалов по idbr
        case 'copies':
            $recordId = isset($params['idbr']) ? (string)$params['idbr'] : (string)($params['id'] ?? ($params['record_id'] ?? ''));
            $result = opac_get_copies_raw($recordId);

            if (empty($params['include_xml']) && isset($result['raw_xml'])) {
                unset($result['raw_xml']);
            }

            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            exit;

        // Очистка кэша
        case 'clear_cache':
            $cacheDir = opac_get_cache_dir();
            $deleted = 0;
            $patterns = ['opac_search_*.json', 'opac_copies_*.json'];
            foreach ($patterns as $pattern) {
                $files = glob($cacheDir . DIRECTORY_SEPARATOR . $pattern);
                if ($files) {
                    foreach ($files as $f) {
                        if (@unlink($f)) {
                            $deleted++;
                        }
                    }
                }
            }
            echo json_encode(['ok' => true, 'deleted_files' => $deleted], JSON_UNESCAPED_UNICODE);
            exit;

        default:
            http_response_code(400);
            echo json_encode([
                'ok'    => false,
                'error' => "Неизвестное действие '{$action}'. Доступные действия: status, search, copies, clear_cache.",
            ], JSON_UNESCAPED_UNICODE);
            exit;
    }
}

// Запуск обработчика, если скрипт вызван напрямую через HTTP-сервер
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    opac_handle_http_request();
}

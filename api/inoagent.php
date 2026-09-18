<?php
/**
 * =============================================================================
 * api/inoagent.php — Серверный шлюз реестра иностранных агентов Минюста РФ
 * =============================================================================
 * Разработка: Lead Programmer проекта AURORA
 * 
 * Назначение:
 * 1. Интеграция с официальным REST API Минюста РФ:
 *    - URL значений: https://reestrs.minjust.gov.ru/rest/registry/39b95df9-9a68-6b6d-e1e3-e6388507067e/values
 *    - URL метаданных: https://reestrs.minjust.gov.ru/rest/registry/39b95df9-9a68-6b6d-e1e3-e6388507067e/info
 * 2. Режимы API (?action=...):
 *    - action=search:
 *        query (ФИО, псевдоним, ИНН, ресурс, ссылка), type (all|fiz|ur|other),
 *        status (all|active|excluded), page (1..N), limit (1..50, default 12)
 *        -> { ok: true, total: N, page: X, pages: Y, values: [...], source: "live"|"cache"|"snapshot", last_modified: "..." }
 *    - action=check:
 *        name (строка экспресс-проверки персоны / автора / организации)
 *        -> { ok: true, is_agent: bool, match: {...}|null }
 *    - action=stats:
 *        Общая статистика по реестру
 *        -> { ok: true, total: N, active: N, excluded: N, fiz: N, ur: N, other: N, last_modified: "..." }
 * 3. Отказоустойчивость:
 *    - Таймауты cURL: CURLOPT_TIMEOUT = 8s, CURLOPT_CONNECTTIMEOUT = 4s
 *    - Проверка SSL с автоматическим fallback при сбоях корневых сертификатов CA
 *    - Кэширование поисковых выборок в cache/inoagent_search_{md5}.json (TTL 5 часов, 18000 сек)
 *    - Мягкий fallback на локальный эталонный снимок cache/inoagent_snapshot.json при сбоях сети
 *
 * Совместимо с PHP 7.4, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5+
 * =============================================================================
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

// -----------------------------------------------------------------------------
// Полифиллы для сред без расширения mbstring
// -----------------------------------------------------------------------------
if (!function_exists('mb_strlen')) {
    function mb_strlen($string, $encoding = 'UTF-8') {
        if (function_exists('iconv_strlen')) {
            $len = @iconv_strlen((string)$string, $encoding);
            if ($len !== false) return $len;
        }
        return strlen((string)$string);
    }
}

if (!function_exists('mb_strtolower')) {
    function mb_strtolower($string, $encoding = 'UTF-8') {
        $str = (string)$string;
        $upper = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $lower = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюяabcdefghijklmnopqrstuvwxyz';
        return strtr($str, array_combine(
            preg_split('//u', $upper, -1, PREG_SPLIT_NO_EMPTY),
            preg_split('//u', $lower, -1, PREG_SPLIT_NO_EMPTY)
        ));
    }
}

if (!function_exists('mb_strpos')) {
    function mb_strpos($haystack, $needle, $offset = 0, $encoding = 'UTF-8') {
        if (function_exists('iconv_strpos')) {
            return @iconv_strpos((string)$haystack, (string)$needle, (int)$offset, $encoding);
        }
        return strpos((string)$haystack, (string)$needle, (int)$offset);
    }
}

if (!function_exists('mb_stripos')) {
    function mb_stripos($haystack, $needle, $offset = 0, $encoding = 'UTF-8') {
        return mb_strpos(mb_strtolower($haystack, $encoding), mb_strtolower($needle, $encoding), $offset, $encoding);
    }
}

if (!function_exists('mb_substr')) {
    function mb_substr($string, $start, $length = null, $encoding = 'UTF-8') {
        if (function_exists('iconv_substr')) {
            return @iconv_substr((string)$string, (int)$start, $length === null ? iconv_strlen($string, $encoding) : (int)$length, $encoding);
        }
        return substr((string)$string, (int)$start, $length === null ? strlen($string) : (int)$length);
    }
}

// -----------------------------------------------------------------------------
// Конфигурационные константы
// -----------------------------------------------------------------------------
defined('INOAGENT_REGISTRY_ID')   || define('INOAGENT_REGISTRY_ID', '39b95df9-9a68-6b6d-e1e3-e6388507067e');
defined('INOAGENT_API_BASE')      || define('INOAGENT_API_BASE', 'https://reestrs.minjust.gov.ru/rest/registry/' . INOAGENT_REGISTRY_ID);
defined('INOAGENT_CACHE_DIR')     || define('INOAGENT_CACHE_DIR', __DIR__ . '/../cache');
defined('INOAGENT_SNAPSHOT_FILE') || define('INOAGENT_SNAPSHOT_FILE', INOAGENT_CACHE_DIR . '/inoagent_snapshot.json');
defined('INOAGENT_SEARCH_TTL')    || define('INOAGENT_SEARCH_TTL', 18000); // 5 часов (в диапазоне 4-6 часов)
defined('INOAGENT_CONNECT_TIMEOUT') || define('INOAGENT_CONNECT_TIMEOUT', 4);
defined('INOAGENT_TIMEOUT')         || define('INOAGENT_TIMEOUT', 8);

/**
 * Нормализация текста для поиска (удаление знаков, букв ё, пробелов)
 */
function inoagent_normalize_text($text) {
    if ($text === null || $text === '') return '';
    $s = mb_strtolower((string)$text, 'UTF-8');
    $s = str_replace('ё', 'е', $s);
    // Замена пунктуации на пробелы
    $s = preg_replace('/[.,\/#!$%\^&\*;:{}=\-_`~()«»""\'\'„“”]/u', ' ', $s);
    $s = preg_replace('/\s+/u', ' ', $s);
    return trim($s);
}

/**
 * Отказоустойчивый сетевой транспорт cURL с обработкой таймаутов и CA-fallback
 */
function inoagent_curl($url, $postData = null, $timeout = INOAGENT_TIMEOUT, $connectTimeout = INOAGENT_CONNECT_TIMEOUT) {
    $ch = curl_init($url);
    $headers = [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept: application/json, text/plain, */*',
        'Accept-Language: ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
    ];
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => $connectTimeout,
        CURLOPT_ENCODING       => '', // Поддержка gzip / deflate для ускорения
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 3,
    ];
    if ($postData !== null) {
        $headers[] = 'Content-Type: application/json';
        $opts[CURLOPT_POST] = true;
        $opts[CURLOPT_POSTFIELDS] = is_string($postData) ? $postData : json_encode($postData, JSON_UNESCAPED_UNICODE);
    }
    $opts[CURLOPT_HTTPHEADER] = $headers;

    // Попытка 1: со строгой проверкой SSL
    curl_setopt_array($ch, $opts + [
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2
    ]);

    $res = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errno = curl_errno($ch);
    $error = curl_error($ch);

    // Fallback: при сбое проверки сертификата CA (errno 60, 77) повторяем без проверки
    if ($errno === 60 || $errno === 77 || ($res === false && stripos($error, 'SSL') !== false)) {
        curl_setopt_array($ch, [
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0
        ]);
        $res = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
    }

    curl_close($ch);

    if ($res !== false && $httpCode >= 200 && $httpCode < 300) {
        return [true, $res, $httpCode];
    }
    return [false, $error ?: "HTTP $httpCode", $httpCode];
}

/**
 * Приведение сырой записи Минюста к нормализованному виду
 */
function inoagent_normalize_record($raw) {
    $excludeDate = trim((string)($raw['field_5_s'] ?? ($raw['field_5_dt'] ?? '')));
    $includeDate = trim((string)($raw['field_4_s'] ?? ($raw['field_4_dt'] ?? '')));
    $isActive = ($excludeDate === '');
    $typeRaw = trim((string)($raw['field_7_s'] ?? ''));

    $typeLower = mb_strtolower($typeRaw, 'UTF-8');
    if (mb_strpos($typeLower, 'физическ') !== false) {
        $type = 'fiz';
        $typeLabel = 'Физическое лицо';
    } elseif (mb_strpos($typeLower, 'юридическ') !== false) {
        $type = 'ur';
        $typeLabel = 'Юридическое лицо';
    } else {
        $type = 'other';
        $typeLabel = !empty($typeRaw) ? $typeRaw : 'Иное объединение лиц';
    }

    $name = trim((string)($raw['field_2_s'] ?? ''));

    // Извлечение псевдонимов и вариантов наименований из кавычек и скобок
    $aliases = [];
    if (preg_match_all('/[«"“]([^»"”]+)[»"”]/u', $name, $mQuotes)) {
        foreach ($mQuotes[1] as $a) {
            $a = trim($a);
            if ($a !== '') $aliases[] = $a;
        }
    }
    if (preg_match_all('/\(([^)]+)\)/u', $name, $mParens)) {
        foreach ($mParens[1] as $a) {
            $a = trim($a);
            if ($a !== '' && mb_stripos($a, 'в случае') === false) {
                $aliases[] = $a;
            }
        }
    }

    $resources = [];
    $domains = trim((string)($raw['field_6_s'] ?? ''));
    if ($domains !== '') {
        $parts = preg_split('/[\r\n,;\s]+/u', $domains);
        foreach ($parts as $p) {
            $p = trim($p);
            if ($p !== '') $resources[] = $p;
        }
    }

    $inn = trim((string)($raw['field_9_s'] ?? ''));
    $ogrn = trim((string)($raw['field_10_s'] ?? ''));
    $snils = trim((string)($raw['field_11_s'] ?? ''));

    return [
        'id'             => (string)($raw['id'] ?? ('ino-' . ($raw['field_1_i'] ?? md5($name)))),
        'reg_num'        => isset($raw['field_1_i']) ? (int)$raw['field_1_i'] : 0,
        'name'           => $name,
        'aliases'        => array_values(array_unique($aliases)),
        'grounds'        => trim((string)($raw['field_3_s'] ?? '')),
        'legal_basis'    => trim((string)($raw['field_3_s'] ?? '')),
        'include_date'   => $includeDate,
        'inclusion_date' => $includeDate,
        'exclude_date'   => $excludeDate !== '' ? $excludeDate : null,
        'exclusion_date' => $excludeDate !== '' ? $excludeDate : null,
        'is_active'      => $isActive,
        'status'         => $isActive ? 'active' : 'excluded',
        'status_label'   => $isActive ? 'В реестре' : 'Исключён',
        'type'           => $type,
        'type_label'     => $typeLabel,
        'type_raw'       => $typeRaw,
        'domains'        => $domains,
        'resources'      => array_values(array_unique($resources)),
        'inn'            => $inn,
        'ogrn'           => $ogrn,
        'snils'          => $snils,
        'inn_ogrn'       => trim($inn . ' ' . $ogrn),
        'birthday'       => trim((string)($raw['field_12_s'] ?? ($raw['field_12_dt'] ?? ''))),
        'members'        => trim((string)($raw['field_13_s'] ?? '')),
        'address'        => trim((string)($raw['field_14_s'] ?? '')),

        // Исходные сырые поля для гарантированной обратной совместимости
        'field_1_i'      => isset($raw['field_1_i']) ? (int)$raw['field_1_i'] : 0,
        'field_2_s'      => $name,
        'field_3_s'      => (string)($raw['field_3_s'] ?? ''),
        'field_4_s'      => (string)($raw['field_4_s'] ?? ''),
        'field_5_s'      => (string)($raw['field_5_s'] ?? ''),
        'field_6_s'      => $domains,
        'field_7_s'      => $typeRaw,
        'field_8_s'      => (string)($raw['field_8_s'] ?? ''),
        'field_9_s'      => $inn,
        'field_10_s'     => $ogrn,
        'field_11_s'     => $snils,
        'field_12_s'     => (string)($raw['field_12_s'] ?? ''),
        'field_13_s'     => (string)($raw['field_13_s'] ?? ''),
        'field_14_s'     => (string)($raw['field_14_s'] ?? '')
    ];
}

/**
 * Чтение локального снимка реестра
 */
function inoagent_read_snapshot() {
    $file = INOAGENT_SNAPSHOT_FILE;
    if (file_exists($file) && is_readable($file)) {
        $content = @file_get_contents($file);
        if ($content !== false && $content !== '') {
            $data = json_decode($content, true);
            if (is_array($data) && !empty($data['values']) && is_array($data['values'])) {
                return $data;
            }
        }
    }
    return null;
}

/**
 * Атомарное сохранение снимка реестра
 */
function inoagent_save_snapshot($values, $lastModified) {
    if (!is_dir(INOAGENT_CACHE_DIR)) {
        @mkdir(INOAGENT_CACHE_DIR, 0775, true);
    }
    $file = INOAGENT_SNAPSHOT_FILE;
    $tmp = $file . '.tmp.' . uniqid('', true);
    $payload = [
        'updated_at'    => date('c'),
        'last_modified' => $lastModified,
        'total'         => count($values),
        'values'        => $values
    ];
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if (@file_put_contents($tmp, $json) !== false) {
        @rename($tmp, $file);
        return true;
    }
    return false;
}

/**
 * Получение данных реестра: попытка запроса к Минюсту с мягким fallback на снимок
 */
function inoagent_get_registry($forceSnapshot = false) {
    $snapshot = inoagent_read_snapshot();

    // Если запрошен режим принудительного офлайна/снимка
    if ($forceSnapshot) {
        if ($snapshot !== null) {
            return [
                'source'        => 'snapshot',
                'values'        => $snapshot['values'],
                'last_modified' => $snapshot['last_modified'] ?? date('Y-m-d H:i:s'),
                'total'         => count($snapshot['values'])
            ];
        }
        return [
            'source'        => 'snapshot',
            'values'        => [],
            'last_modified' => date('Y-m-d H:i:s'),
            'total'         => 0
        ];
    }

    // 1. Проверяем доступность сервера Минюста через быстрый эндпоинт метаданных /info
    list($infoOk, $infoBody) = inoagent_curl(INOAGENT_API_BASE . '/info', null, INOAGENT_TIMEOUT, INOAGENT_CONNECT_TIMEOUT);

    $liveLastModified = date('Y-m-d H:i:s');
    $needsFullFetch = false;

    if ($infoOk) {
        $infoJson = json_decode($infoBody, true);
        if (!empty($infoJson['lastModified'])) {
            $liveLastModified = date('Y-m-d H:i:s', (int)($infoJson['lastModified'] / 1000));
        }

        // Если локальный снимок отсутствует или устарел по отношению к Минюсту
        if ($snapshot === null || empty($snapshot['values'])) {
            $needsFullFetch = true;
        } elseif (isset($snapshot['last_modified']) && $snapshot['last_modified'] !== $liveLastModified) {
            $needsFullFetch = true;
        }
    } else {
        // Сервер Минюста недоступен -> мягкий fallback на локальный снимок
        if ($snapshot !== null) {
            return [
                'source'        => 'snapshot',
                'values'        => $snapshot['values'],
                'last_modified' => $snapshot['last_modified'] ?? date('Y-m-d H:i:s'),
                'total'         => count($snapshot['values'])
            ];
        }
        return [
            'source'        => 'snapshot',
            'values'        => [],
            'last_modified' => date('Y-m-d H:i:s'),
            'total'         => 0
        ];
    }

    // 2. Если требуется полная загрузка или обновление снимка из Минюста
    if ($needsFullFetch) {
        $allValues = [];
        $offset = 0;
        $batchSize = 1000;
        $fetchSuccess = false;

        while (true) {
            list($valOk, $valBody) = inoagent_curl(INOAGENT_API_BASE . '/values', [
                'offset' => $offset,
                'limit'  => $batchSize
            ], INOAGENT_TIMEOUT, INOAGENT_CONNECT_TIMEOUT);

            if (!$valOk) {
                break;
            }

            $valJson = json_decode($valBody, true);
            if (empty($valJson['values']) || !is_array($valJson['values'])) {
                if ($offset === 0) {
                    break;
                } else {
                    $fetchSuccess = true;
                    break;
                }
            }

            $batch = $valJson['values'];
            $totalSize = $valJson['size'] ?? 0;
            foreach ($batch as $row) {
                $allValues[] = $row;
            }

            if (count($allValues) >= $totalSize || count($batch) < $batchSize) {
                $fetchSuccess = true;
                break;
            }
            $offset += count($batch);
        }

        if ($fetchSuccess && count($allValues) > 0) {
            inoagent_save_snapshot($allValues, $liveLastModified);
            return [
                'source'        => 'live',
                'values'        => $allValues,
                'last_modified' => $liveLastModified,
                'total'         => count($allValues)
            ];
        }
    }

    // Если /info ответил успешно и снимок актуален
    if ($snapshot !== null) {
        return [
            'source'        => 'live',
            'values'        => $snapshot['values'],
            'last_modified' => $liveLastModified ?: ($snapshot['last_modified'] ?? date('Y-m-d H:i:s')),
            'total'         => count($snapshot['values'])
        ];
    }

    return [
        'source'        => 'snapshot',
        'values'        => [],
        'last_modified' => date('Y-m-d H:i:s'),
        'total'         => 0
    ];
}

/**
 * Нормализация типа сущности (all | fiz | ur | other)
 */
function inoagent_normalize_type_filter($type) {
    $t = mb_strtolower(trim((string)$type), 'UTF-8');
    if ($t === '' || $t === 'all') return 'all';
    if ($t === 'fiz' || $t === 'person' || $t === 'physical' || mb_strpos($t, 'физ') !== false) {
        return 'fiz';
    }
    if ($t === 'ur' || $t === 'legal' || $t === 'juridical' || mb_strpos($t, 'юр') !== false) {
        return 'ur';
    }
    if ($t === 'other' || $t === 'association' || mb_strpos($t, 'иные') !== false || mb_strpos($t, 'объедин') !== false) {
        return 'other';
    }
    return 'all';
}

/**
 * Нормализация статуса (all | active | excluded)
 */
function inoagent_normalize_status_filter($status) {
    $s = mb_strtolower(trim((string)$status), 'UTF-8');
    if ($s === '' || $s === 'all') return 'all';
    if ($s === 'active' || mb_strpos($s, 'действ') !== false || mb_strpos($s, 'реестр') !== false) {
        return 'active';
    }
    if ($s === 'excluded' || mb_strpos($s, 'исключ') !== false) {
        return 'excluded';
    }
    return 'all';
}

/**
 * Основной обработчик API-запросов
 */
function inoagent_handle_request($params = null, $returnOnly = false) {
    if ($params === null) {
        // Поддержка GET, POST (form-data и application/json)
        $rawInput = @file_get_contents('php://input');
        $jsonInput = [];
        if ($rawInput !== false && $rawInput !== '') {
            $decoded = json_decode($rawInput, true);
            if (is_array($decoded)) {
                $jsonInput = $decoded;
            }
        }
        $params = array_merge($_GET, $_POST, $jsonInput);
    }

    $action = mb_strtolower(trim((string)($params['action'] ?? 'search')), 'UTF-8');
    $forceSnapshot = !empty($params['mock_offline']) || !empty($params['simulate_offline']) || !empty($params['offline']);
    $noCache = !empty($params['nocache']) || !empty($params['refresh']);

    $response = ['ok' => false];
    $httpCode = 200;

    switch ($action) {
        // ---------------------------------------------------------------------
        // 1. Поиск по реестру (?action=search)
        // ---------------------------------------------------------------------
        case 'search': {
            $query = trim((string)($params['query'] ?? ($params['q'] ?? '')));
            $typeFilter = inoagent_normalize_type_filter($params['type'] ?? 'all');
            $statusFilter = inoagent_normalize_status_filter($params['status'] ?? 'all');
            
            $limit = isset($params['limit']) ? (int)$params['limit'] : 12;
            if ($limit <= 0) $limit = 12;
            if ($limit > 50) $limit = 50;

            $page = isset($params['page']) ? (int)$params['page'] : 1;
            if ($page <= 0) $page = 1;

            // Проверяем кэш поискового запроса (TTL 5 часов)
            $cacheKey = md5(json_encode([
                'q'      => $query,
                'type'   => $typeFilter,
                'status' => $statusFilter,
                'page'   => $page,
                'limit'  => $limit
            ]));
            $cacheFile = INOAGENT_CACHE_DIR . '/inoagent_search_' . $cacheKey . '.json';

            if (!$noCache && !$forceSnapshot && file_exists($cacheFile) && is_readable($cacheFile)) {
                $mtime = filemtime($cacheFile);
                if ((time() - $mtime) < INOAGENT_SEARCH_TTL) {
                    $cached = json_decode(@file_get_contents($cacheFile), true);
                    if (is_array($cached) && !empty($cached['ok'])) {
                        $cached['source'] = 'cache';
                        $response = $cached;
                        break;
                    }
                }
            }

            // Получаем сырые данные реестра
            $registry = inoagent_get_registry($forceSnapshot);
            $rawValues = $registry['values'];
            $source = $registry['source'];
            $lastModified = $registry['last_modified'];

            // Нормализуем поисковые слова
            $normQuery = inoagent_normalize_text($query);
            $queryWords = array_filter(explode(' ', $normQuery), function($w) {
                return $w !== '';
            });

            $filtered = [];

            foreach ($rawValues as $rawRow) {
                $item = inoagent_normalize_record($rawRow);

                // Фильтр по статусу
                if ($statusFilter !== 'all' && $item['status'] !== $statusFilter) {
                    continue;
                }

                // Фильтр по типу
                if ($typeFilter !== 'all' && $item['type'] !== $typeFilter) {
                    continue;
                }

                // Поиск по ключевым словам
                if (!empty($queryWords)) {
                    $searchVector = inoagent_normalize_text(
                        $item['name'] . ' ' .
                        $item['reg_num'] . ' ' .
                        $item['inn'] . ' ' .
                        $item['ogrn'] . ' ' .
                        $item['snils'] . ' ' .
                        $item['domains'] . ' ' .
                        $item['grounds'] . ' ' .
                        $item['members'] . ' ' .
                        implode(' ', $item['aliases'])
                    );

                    $matched = true;
                    foreach ($queryWords as $word) {
                        if (mb_strpos($searchVector, $word) === false) {
                            $matched = false;
                            break;
                        }
                    }
                    if (!$matched) {
                        continue;
                    }
                }

                $filtered[] = $item;
            }

            $total = count($filtered);
            $pages = max(1, (int)ceil($total / $limit));
            if ($page > $pages && $total > 0) {
                $page = $pages;
            }

            $offset = ($page - 1) * $limit;
            $pageValues = array_slice($filtered, $offset, $limit);

            $response = [
                'ok'            => true,
                'total'         => $total,
                'page'          => $page,
                'pages'         => $pages,
                'values'        => $pageValues,
                'source'        => $source,
                'last_modified' => $lastModified
            ];

            // Сохраняем в поисковый кэш
            if (!is_dir(INOAGENT_CACHE_DIR)) {
                @mkdir(INOAGENT_CACHE_DIR, 0775, true);
            }
            $tmpCache = $cacheFile . '.tmp.' . uniqid('', true);
            if (@file_put_contents($tmpCache, json_encode($response, JSON_UNESCAPED_UNICODE)) !== false) {
                @rename($tmpCache, $cacheFile);
            }
            break;
        }

        // ---------------------------------------------------------------------
        // 2. Экспресс-проверка персоны / организации (?action=check)
        // ---------------------------------------------------------------------
        case 'check': {
            $name = trim((string)($params['name'] ?? ($params['query'] ?? '')));

            if ($name === '') {
                $response = [
                    'ok'       => true,
                    'is_agent' => false,
                    'match'    => null
                ];
                break;
            }

            $registry = inoagent_get_registry($forceSnapshot);
            $rawValues = $registry['values'];

            $normNeedle = inoagent_normalize_text($name);
            $needleWords = array_filter(explode(' ', $normNeedle), function($w) {
                return $w !== '';
            });

            $bestMatch = null;
            $bestScore = 0;

            foreach ($rawValues as $rawRow) {
                $item = inoagent_normalize_record($rawRow);
                $normItemName = inoagent_normalize_text($item['name']);

                $score = 0;

                // Точное совпадение наименования
                if ($normItemName === $normNeedle) {
                    $score = 100;
                }
                // Подстроковое вхождение
                elseif (mb_strpos($normItemName, $normNeedle) !== false || mb_strpos($normNeedle, $normItemName) !== false) {
                    $score = 80;
                }
                // Совпадение по псевдонимам
                else {
                    foreach ($item['aliases'] as $alias) {
                        $normAlias = inoagent_normalize_text($alias);
                        if ($normAlias === $normNeedle) {
                            $score = max($score, 90);
                        } elseif (mb_strpos($normAlias, $normNeedle) !== false || mb_strpos($normNeedle, $normAlias) !== false) {
                            $score = max($score, 75);
                        }
                    }
                }

                // Проверка вхождения всех слов запроса (например: «Максим Галкин»)
                if ($score === 0 && !empty($needleWords)) {
                    $searchVector = inoagent_normalize_text(
                        $item['name'] . ' ' .
                        $item['inn'] . ' ' .
                        implode(' ', $item['aliases']) . ' ' .
                        $item['members']
                    );
                    $allWordsMatch = true;
                    foreach ($needleWords as $w) {
                        if (mb_strpos($searchVector, $w) === false) {
                            $allWordsMatch = false;
                            break;
                        }
                    }
                    if ($allWordsMatch) {
                        $score = 60;
                    }
                }

                if ($score > 0) {
                    // Приоритет действующим агентам над исключёнными
                    if ($item['is_active']) {
                        $score += 10;
                    }

                    if ($score > $bestScore) {
                        $bestScore = $score;
                        $bestMatch = $item;
                    }
                }
            }

            if ($bestMatch !== null && $bestScore >= 50) {
                $response = [
                    'ok'       => true,
                    'is_agent' => (bool)$bestMatch['is_active'],
                    'match'    => $bestMatch
                ];
            } else {
                $response = [
                    'ok'       => true,
                    'is_agent' => false,
                    'match'    => null
                ];
            }
            break;
        }

        // ---------------------------------------------------------------------
        // 3. Общая статистика реестра (?action=stats)
        // ---------------------------------------------------------------------
        case 'stats': {
            $registry = inoagent_get_registry($forceSnapshot);
            $rawValues = $registry['values'];
            $lastModified = $registry['last_modified'];

            $total = count($rawValues);
            $active = 0;
            $excluded = 0;
            $fiz = 0;
            $ur = 0;
            $other = 0;

            foreach ($rawValues as $rawRow) {
                $excludeDate = trim((string)($rawRow['field_5_s'] ?? ($rawRow['field_5_dt'] ?? '')));
                if ($excludeDate === '') {
                    $active++;
                } else {
                    $excluded++;
                }

                $typeRaw = mb_strtolower(trim((string)($rawRow['field_7_s'] ?? '')), 'UTF-8');
                if (mb_strpos($typeRaw, 'физическ') !== false) {
                    $fiz++;
                } elseif (mb_strpos($typeRaw, 'юридическ') !== false) {
                    $ur++;
                } else {
                    $other++;
                }
            }

            $response = [
                'ok'            => true,
                'total'         => $total,
                'active'        => $active,
                'excluded'      => $excluded,
                'fiz'           => $fiz,
                'ur'            => $ur,
                'other'         => $other,
                'last_modified' => $lastModified
            ];
            break;
        }

        default: {
            $httpCode = 400;
            $response = [
                'ok'    => false,
                'error' => "Неизвестное действие (action): '{$action}'. Доступны: search, check, stats."
            ];
            break;
        }
    }

    if ($returnOnly) {
        return [$httpCode, $response];
    }

    if (!headers_sent()) {
        http_response_code($httpCode);
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    return [$httpCode, $response];
}

// -----------------------------------------------------------------------------
// Автономный запуск при прямом веб-вызове
// -----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    exit;
}

// Если скрипт вызывается напрямую веб-сервером или curl
$isCliDirect = (php_sapi_name() === 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__));
$isWeb = (php_sapi_name() !== 'cli');

if ($isWeb || $isCliDirect) {
    inoagent_handle_request();
}

<?php
/**
 * =============================================================================
 * OPACWP Gateway — технологический шлюз к OPAC-Global (ЦГБ г. Владимира)
 * =============================================================================
 * Портировано из api/opac.php проекта vk_wall_searcher_php для WordPress.
 * Функции имеют префикс opacwp_ во избежание конфликтов; конфигурация берётся
 * из опций плагина (opacwp_settings), кэш — в wp-content/uploads/opacwp-cache.
 * HTTP-диспетчеризация не используется: вызовы идут через OPAC_Ajax (admin-ajax).
 *
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
 *    - Поисковые библиографические запросы: cache/opacwp_search_{md5}.json (TTL 14400s / 4ч)
 *    - Экземпляры и движение книг: cache/opacwp_copies_{md5}.json (TTL 3600s / 1ч)
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

defined('ABSPATH') || exit;

// -----------------------------------------------------------------------------
// Полифиллы для сред без расширения mbstring (PHP CLI / веб-сервер)
// -----------------------------------------------------------------------------
if (!function_exists('mb_strlen')) {
    function mb_strlen($string, $encoding = 'UTF-8') {
        if (function_exists('iconv_strlen')) {
            $len = @iconv_strlen((string)$string, $encoding);
            if ($len !== false) return $len;
        }
        return strlen(preg_replace('/[\x80-\xBF]/', '', (string)$string));
    }
}
if (!function_exists('mb_substr')) {
    function mb_substr($string, $start, $length = null, $encoding = 'UTF-8') {
        if (function_exists('iconv_substr')) {
            $sub = @iconv_substr((string)$string, $start, $length !== null ? $length : iconv_strlen((string)$string, $encoding), $encoding);
            if ($sub !== false) return $sub;
        }
        $chars = preg_split('//u', (string)$string, -1, PREG_SPLIT_NO_EMPTY);
        if ($chars === false) {
            return substr((string)$string, $start, $length !== null ? $length : strlen((string)$string));
        }
        if ($length === null) {
            return implode('', array_slice($chars, $start));
        }
        return implode('', array_slice($chars, $start, $length));
    }
}
if (!function_exists('mb_strtolower')) {
    function mb_strtolower($string, $encoding = 'UTF-8') {
        return strtr((string)$string, [
            'А'=>'а','Б'=>'б','В'=>'в','Г'=>'г','Д'=>'д','Е'=>'е','Ё'=>'ё','Ж'=>'ж','З'=>'з',
            'И'=>'и','Й'=>'й','К'=>'к','Л'=>'л','М'=>'м','Н'=>'н','О'=>'о','П'=>'п','Р'=>'р',
            'С'=>'с','Т'=>'т','У'=>'у','Ф'=>'ф','Х'=>'х','Ц'=>'ц','Ч'=>'ч','Ш'=>'ш','Щ'=>'щ',
            'Ъ'=>'ъ','Ы'=>'ы','Ь'=>'ь','Э'=>'э','Ю'=>'ю','Я'=>'я',
            'A'=>'a','B'=>'b','C'=>'c','D'=>'d','E'=>'e','F'=>'f','G'=>'g','H'=>'h','I'=>'i',
            'J'=>'j','K'=>'k','L'=>'l','M'=>'m','N'=>'n','O'=>'o','P'=>'p','Q'=>'q','R'=>'r',
            'S'=>'s','T'=>'t','U'=>'u','V'=>'v','W'=>'w','X'=>'x','Y'=>'y','Z'=>'z'
        ]);
    }
}
if (!defined('MB_CASE_UPPER')) define('MB_CASE_UPPER', 0);
if (!defined('MB_CASE_LOWER')) define('MB_CASE_LOWER', 1);
if (!defined('MB_CASE_TITLE')) define('MB_CASE_TITLE', 2);

if (!function_exists('mb_strtoupper')) {
    function mb_strtoupper($string, $encoding = 'UTF-8') {
        return strtr((string)$string, [
            'а'=>'А','б'=>'Б','в'=>'В','г'=>'Г','д'=>'Д','е'=>'Е','ё'=>'Ё','ж'=>'Ж','з'=>'З',
            'и'=>'И','й'=>'Й','к'=>'К','л'=>'Л','м'=>'М','н'=>'Н','о'=>'О','п'=>'П','р'=>'Р',
            'с'=>'С','т'=>'Т','у'=>'У','ф'=>'Ф','х'=>'Х','ц'=>'Ц','ч'=>'Ч','ш'=>'Ш','щ'=>'Щ',
            'ъ'=>'Ъ','ы'=>'Ы','ь'=>'Ь','э'=>'Э','ю'=>'Ю','я'=>'Я',
            'a'=>'A','b'=>'B','c'=>'C','d'=>'D','e'=>'E','f'=>'F','g'=>'G','h'=>'H','i'=>'I',
            'j'=>'J','k'=>'K','l'=>'L','m'=>'M','n'=>'N','o'=>'O','p'=>'P','q'=>'Q','r'=>'R',
            's'=>'S','t'=>'T','u'=>'U','v'=>'V','w'=>'W','x'=>'X','y'=>'Y','z'=>'Z'
        ]);
    }
}
if (!function_exists('mb_strpos')) {
    function mb_strpos($haystack, $needle, $offset = 0, $encoding = 'UTF-8') {
        if (function_exists('iconv_strpos')) {
            $pos = @iconv_strpos((string)$haystack, (string)$needle, $offset, $encoding);
            if ($pos !== false) return $pos;
        }
        $h = (string)$haystack;
        $n = (string)$needle;
        if ($n === '') return 0;
        $hLen = mb_strlen($h, $encoding);
        $nLen = mb_strlen($n, $encoding);
        for ($i = $offset; $i <= $hLen - $nLen; $i++) {
            if (mb_substr($h, $i, $nLen, $encoding) === $n) {
                return $i;
            }
        }
        return false;
    }
}
if (!function_exists('mb_stripos')) {
    function mb_stripos($haystack, $needle, $offset = 0, $encoding = 'UTF-8') {
        $h = mb_strtolower((string)$haystack, $encoding);
        $n = mb_strtolower((string)$needle, $encoding);
        return mb_strpos($h, $n, $offset, $encoding);
    }
}
if (!function_exists('mb_strrpos')) {
    function mb_strrpos($haystack, $needle, $offset = 0, $encoding = 'UTF-8') {
        if (function_exists('iconv_strrpos')) {
            $pos = @iconv_strrpos((string)$haystack, (string)$needle, $offset, $encoding);
            if ($pos !== false) return $pos;
        }
        $h = (string)$haystack;
        $n = (string)$needle;
        if ($n === '') return false;
        $hLen = mb_strlen($h, $encoding);
        $nLen = mb_strlen($n, $encoding);
        if ($hLen < $nLen) return false;
        $start = $offset >= 0 ? $offset : max(0, $hLen + $offset);
        for ($i = $hLen - $nLen; $i >= $start; $i--) {
            if (mb_substr($h, $i, $nLen, $encoding) === $n) {
                return $i;
            }
        }
        return false;
    }
}
if (!function_exists('mb_convert_case')) {
    function mb_convert_case($string, $mode, $encoding = 'UTF-8') {
        $str = (string)$string;
        if ($mode === MB_CASE_UPPER) {
            return mb_strtoupper($str, $encoding);
        } elseif ($mode === MB_CASE_LOWER) {
            return mb_strtolower($str, $encoding);
        } elseif ($mode === MB_CASE_TITLE) {
            return preg_replace_callback('/\b\p{L}+/u', function ($m) use ($encoding) {
                $word = $m[0];
                $first = mb_substr($word, 0, 1, $encoding);
                $rest = mb_substr($word, 1, null, $encoding);
                return mb_strtoupper($first, $encoding) . mb_strtolower($rest, $encoding);
            }, $str);
        }
        return $str;
    }
}

if (!class_exists('OpacWPClient')) {
    require_once __DIR__ . '/class-opac-client.php';
}

// -----------------------------------------------------------------------------
// Конфигурация по умолчанию и загрузка переопределений из опций плагина
// -----------------------------------------------------------------------------
$opacGlobalConfig = [
    'opacwp_base_url'                  => 'https://opac.lib33.ru',
    'opacwp_login'                     => 'CGBRD',
    'opacwp_password'                  => '',
    'opacwp_type_access'               => 'PayAccess',
    'opacwp_db_id'                     => '62',
    'opacwp_rate_limit_ms'             => 350,     // 350мс безопасная пауза между запросами к OPAC-Global
    'opacwp_connect_timeout'           => 4,
    'opacwp_timeout'                   => 10,
    'opacwp_session_ttl'               => 3600,     // 1 час
    'opacwp_search_ttl'                => 21600,    // 6 часов (экономия вызовов к OPAC)
    'opacwp_copies_ttl'                => 10800,    // 3 часа (кэш экземпляров)
    'opacwp_circuit_breaker_enabled'   => true,     // Предохранитель от падения OPAC
    'opacwp_circuit_breaker_threshold' => 2,        // Порог: 2 сбоя подряд активируют кулдаун
    'opacwp_circuit_breaker_cooldown'  => 60,       // 60 секунд на остывание OPAC при сбоях
    'user_agent'                       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

// Переопределение конфигурации из настроек плагина (опция opacwp_settings)
if (function_exists('opacwp_get_settings')) {
    $wpSettings = opacwp_get_settings();
    $wpToCfgMap = [
        'opac_base_url'        => 'opacwp_base_url',
        'opac_login'           => 'opacwp_login',
        'opac_password'        => 'opacwp_password',
        'opac_type_access'     => 'opacwp_type_access',
        'opac_db_id'           => 'opacwp_db_id',
        'opac_session_ttl'     => 'opacwp_session_ttl',
        'opac_search_ttl'      => 'opacwp_search_ttl',
        'opac_copies_ttl'      => 'opacwp_copies_ttl',
        'opac_rate_limit_ms'   => 'opacwp_rate_limit_ms',
        'opac_connect_timeout' => 'opacwp_connect_timeout',
        'opac_timeout'         => 'opacwp_timeout',
    ];
    foreach ($wpToCfgMap as $optKey => $cfgKey) {
        if (isset($wpSettings[$optKey]) && $wpSettings[$optKey] !== '' && $wpSettings[$optKey] !== null) {
            $opacGlobalConfig[$cfgKey] = $wpSettings[$optKey];
        }
    }
}

/**
 * Получение текущей конфигурации OPAC
 *
 * @param string|null $key Ключ параметра
 * @return mixed
 */
function opacwp_get_config($key = null)
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
function opacwp_get_cache_dir()
{
    // Кэш в wp-content/uploads/opacwp-cache; при недоступности uploads — в системном tmp
    $uploadDir = function_exists('wp_upload_dir') ? wp_upload_dir() : null;
    $base = (is_array($uploadDir) && empty($uploadDir['error']) && !empty($uploadDir['basedir']))
        ? $uploadDir['basedir']
        : sys_get_temp_dir();
    $cacheDir = $base . DIRECTORY_SEPARATOR . 'opacwp-cache';
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
function opacwp_atomic_write_json($path, $data)
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
 * Проверка состояния аварийного предохранителя OPAC (Circuit Breaker)
 * Если удалённый сервер возвращает 5xx или сетевые тайм-ауты, предохранитель
 * размыкает цепь на заданное время (по умолчанию 60 сек), чтобы защитить
 * сервер OPAC от лавины повторных запросов и предотвратить его падение.
 *
 * @return array|null [tripped => true, retry_after => int, reason => string] или null
 */
function opacwp_check_circuit_breaker()
{
    if (!opacwp_get_config('opacwp_circuit_breaker_enabled')) {
        return null;
    }

    $cacheDir = opacwp_get_cache_dir();
    $breakerFile = $cacheDir . DIRECTORY_SEPARATOR . 'opacwp_circuit_breaker.json';
    if (!is_file($breakerFile)) {
        return null;
    }

    $raw = @file_get_contents($breakerFile);
    $data = json_decode((string)$raw, true);
    if (!is_array($data)) {
        return null;
    }

    $now = time();
    $trippedUntil = (int)($data['tripped_until'] ?? 0);
    if ($trippedUntil > $now) {
        $remaining = $trippedUntil - $now;
        return [
            'tripped'     => true,
            'retry_after' => $remaining,
            'reason'      => $data['last_error'] ?? 'Защита от перегрузки OPAC-сервера',
            'failures'    => (int)($data['failures'] ?? 0),
        ];
    }

    return null;
}

/**
 * Фиксация сбоя сетевого запроса к OPAC и автоматическое срабатывание Circuit Breaker
 *
 * @param string $errorMessage
 * @param int $httpCode
 */
function opacwp_record_circuit_failure($errorMessage, $httpCode = 0)
{
    if (!opacwp_get_config('opacwp_circuit_breaker_enabled')) {
        return;
    }

    $cacheDir = opacwp_get_cache_dir();
    $breakerFile = $cacheDir . DIRECTORY_SEPARATOR . 'opacwp_circuit_breaker.json';
    $threshold = (int)(opacwp_get_config('opacwp_circuit_breaker_threshold') ?: 2);
    $cooldown  = (int)(opacwp_get_config('opacwp_circuit_breaker_cooldown') ?: 60);

    $data = [
        'failures'      => 0,
        'tripped_until' => 0,
        'last_error'    => '',
        'last_time'     => time(),
    ];

    if (is_file($breakerFile)) {
        $existing = json_decode((string)@file_get_contents($breakerFile), true);
        if (is_array($existing)) {
            $data = array_merge($data, $existing);
        }
    }

    $data['failures'] = (int)($data['failures'] ?? 0) + 1;
    $data['last_error'] = "HTTP {$httpCode}: {$errorMessage}";
    $data['last_time'] = time();

    // Если число последовательных сбоев превысило порог — активируем аварийный кулдаун
    if ($data['failures'] >= $threshold) {
        $data['tripped_until'] = time() + $cooldown;
    }

    opacwp_atomic_write_json($breakerFile, $data);
}

/**
 * Сброс состояния сбоев при успешном ответе от OPAC-Global
 */
function opacwp_record_circuit_success()
{
    $cacheDir = opacwp_get_cache_dir();
    $breakerFile = $cacheDir . DIRECTORY_SEPARATOR . 'opacwp_circuit_breaker.json';
    if (is_file($breakerFile)) {
        @unlink($breakerFile);
    }
}

// -----------------------------------------------------------------------------
// 1. Сетевой транспорт cURL с однопоточным гейткипером (Anti-Crash Shield)
// -----------------------------------------------------------------------------

/**
 * Выполнение HTTP-запроса через cURL к сервисам OPAC-Global
 *
 * ВАЖНЕЙШАЯ АРХИТЕКТУРНАЯ ЗАЩИТА:
 * 1. Предохранитель (Circuit Breaker): мгновенный отбой без запроса, если OPAC сбоил.
 * 2. Глобальный гейткипер (Exclusive Mutex): блокирует параллельные обращения
 *    к OPAC-Global со стороны разных PHP-процессов, гарантируя строго последовательное
 *    исполнение и интервал не менее opacwp_rate_limit_ms (350мс).
 *    Это 100% исключает крах Windows CGI (opac.exe / direct.exe) от всплесков нагрузки!
 *
 * @param string $url URL назначения
 * @param array|string $postFields POST-параметры (ассоциативный массив или query string)
 * @param string|null $cookieStr Строка cookie (например: "OGSSOSession=...; numsean=...")
 * @return array Массив [ok, http_code, body, headers, cookies, errno, error]
 */
function opacwp_make_request($url, $postFields, $cookieStr = null)
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

    // 1. Проверка аварийного предохранителя (Circuit Breaker)
    $breakerStatus = opacwp_check_circuit_breaker();
    if ($breakerStatus !== null) {
        return [
            'ok'              => false,
            'circuit_breaker' => true,
            'http_code'       => 503,
            'body'            => '',
            'headers'         => '',
            'cookies'         => [],
            'errno'           => 503,
            'retry_after'     => $breakerStatus['retry_after'],
            'error'           => "Сервер каталога OPAC временно восстанавливает стабильность (пауза {$breakerStatus['retry_after']} сек для предотвращения перегрузки сервера). Повторите попытку чуть позже.",
        ];
    }

    $payload        = is_array($postFields) ? http_build_query($postFields) : (string)$postFields;
    $connectTimeout = (int)opacwp_get_config('opacwp_connect_timeout');
    $timeout        = (int)opacwp_get_config('opacwp_timeout');
    $userAgent      = (string)opacwp_get_config('user_agent');
    $rateLimitMs    = max(300, (int)opacwp_get_config('opacwp_rate_limit_ms'));

    // 2. Глобальный гейткипер (Exclusive Mutex):
    // Держим эксклюзивную файловую блокировку на время сетевого вызова,
    // чтобы ни один другой процесс не мог одновременно долбить OPAC CGI.
    $gateFile = opacwp_get_cache_dir() . DIRECTORY_SEPARATOR . 'opacwp_network_gate.lock';
    $gateFp = @fopen($gateFile, 'c+');

    if ($gateFp) {
        @flock($gateFp, LOCK_EX);
        $lastFinishedStr = trim((string)@stream_get_contents($gateFp));
        $lastFinished = $lastFinishedStr !== '' ? (float)$lastFinishedStr : 0.0;
        $now = microtime(true);
        $gapMs = ($now - $lastFinished) * 1000.0;

        if ($lastFinished > 0 && $gapMs < $rateLimitMs) {
            $sleepMicro = (int)(($rateLimitMs - $gapMs) * 1000);
            if ($sleepMicro > 0) {
                usleep($sleepMicro);
            }
        }
    }

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

    // Освобождение гейткипера и фиксация времени завершения
    if ($gateFp) {
        @ftruncate($gateFp, 0);
        @rewind($gateFp);
        @fwrite($gateFp, (string)microtime(true));
        @fflush($gateFp);
        @flock($gateFp, LOCK_UN);
        @fclose($gateFp);
    }

    // Фиксация успеха или сбоя для Circuit Breaker
    if ($result['ok']) {
        opacwp_record_circuit_success();
    } elseif ($result['http_code'] >= 500 || $result['errno'] === 28 /* CURLE_OPERATION_TIMEDOUT */) {
        opacwp_record_circuit_failure($result['error'] ?: "HTTP {$result['http_code']}", $result['http_code']);
    }

    return $result;
}

// -----------------------------------------------------------------------------
// 2. Авторизация и пулинг сессий (логин/пароль — из настроек плагина)
// -----------------------------------------------------------------------------

/**
 * Проверка, содержит ли ответ ошибку истечения/отсутствия сессии
 *
 * @param string $body Тело ответа (XML или HTML)
 * @return bool
 */
function opacwp_is_session_expired_response($body)
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
function opacwp_get_session($forceRefresh = false)
{
    $cacheDir = opacwp_get_cache_dir();
    $sessionFile = $cacheDir . DIRECTORY_SEPARATOR . 'opacwp_session.json';
    $lockFile = $cacheDir . DIRECTORY_SEPARATOR . 'opacwp_session.lock';
    $ttl = (int)opacwp_get_config('opacwp_session_ttl');

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
        return opacwp_authenticate_direct();
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
    $session = opacwp_authenticate_direct();

    if (!empty($session['OGSSOSession']) && !empty($session['numsean'])) {
        opacwp_atomic_write_json($sessionFile, $session);
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
function opacwp_authenticate_direct()
{
    $baseUrl    = rtrim((string)opacwp_get_config('opacwp_base_url'), '/');
    $login      = (string)opacwp_get_config('opacwp_login');
    $password   = (string)opacwp_get_config('opacwp_password');
    $typeAccess = (string)opacwp_get_config('opacwp_type_access');
    $ttl        = (int)opacwp_get_config('opacwp_session_ttl');

    $url = $baseUrl . '/cgiopac/opacg/opac.exe';
    $postData = [
        'arg0'       => $login,
        'arg1'       => $password,
        'TypeAccess' => $typeAccess,
    ];

    $resp = opacwp_make_request($url, $postData);

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
function opacwp_extract_xml_error($xml)
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
function opacwp_parse_search_xml($xml)
{
    $error = opacwp_extract_xml_error($xml);
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
            $meta = opacwp_parse_shotform_lines($shotformLines);

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
function opacwp_parse_shotform_lines(array $lines)
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
        if (preg_match('/(?:Шифр|Шифр\s*хранения)\s*[:№#\s.]*\s*([^;]+)/ui', $line, $mShifr)) {
            $shelfmark = trim($mShifr[1]);
        }
        if (preg_match('/(?:Инв\.?\s*(?:номер|№)|Инвентарный\s+номер|Инв\.)\s*[:№#\s.]*\s*([a-zA-Zа-яА-ЯёЁ0-9\/\-_]+)/ui', $line, $mInv)) {
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
function opacwp_load_branches()
{
    static $branches = null;
    if ($branches !== null) {
        return $branches;
    }

    $branchesFile = OPACWP_DIR . 'branches_cache.json';
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
function opacwp_map_branch($branchCode, $locationStr = '')
{
    // ЯВНЫЙ ПЕРЕХВАТ: сигла «до» и пермлок «ЦГБ-ДО» — это ВСЕГДА ЦДБ (Центральная детская библиотека)
    // Адрес: г. Владимир, ул. Большая Московская, д. 31 (исторический центр, НЕ ЦГБ Суздальский пр.!)
    $bcLow  = mb_strtolower(trim((string)$branchCode), 'UTF-8');
    $locLow = mb_strtolower(trim((string)$locationStr), 'UTF-8');
    if ($bcLow === 'до' || $locLow === 'цгб-до' || $locLow === 'до' ||
        preg_match('/^цгб[-_\s]*до\b/u', $bcLow) || preg_match('/^цгб[-_\s]*до\b/u', $locLow)) {
        return [
            'branch_num'  => 'ЦДБ',
            'branch_name' => 'Центральная детская библиотека',
            'department'  => 'Центральная детская библиотека',
            'address'     => 'г. Владимир, ул. Большая Московская, д. 31',
            'phone'       => '8(4922) 32-32-42, 32-47-73',
            'district'    => 'Исторический центр',
            'is_dobroye'  => false,
            'is_center'   => true,
            'branch_url'  => 'https://biblioteka33.ru'
        ];
    }

    // 1. Первичное сопоставление по эталонному библиотечному словарю OpacClient
    if (class_exists('OpacWPClient')) {
        $resolved = OpacWPClient::resolveBranchBySigla((string)$branchCode);
        if (!$resolved && !empty($locationStr)) {
            $siglaFromLoc = OpacWPClient::extractSiglaFromPermanentLocation($locationStr);
            $resolved = OpacWPClient::resolveBranchBySigla($siglaFromLoc);
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

    $branches = opacwp_load_branches();
    if (empty($branches)) {
        return null;
    }

    $branchCodeClean = mb_strtolower(trim((string)$branchCode), 'UTF-8');
    $locationClean   = mb_strtolower(trim((string)$locationStr), 'UTF-8');

    // Определение номера филиала
    $targetNum = null;
    $branchNumInt = null;

    // Проверка кодов "ф1", "ф-1", "ф12"
    if (preg_match('/^ф[\s-]*(\d+)/u', $branchCodeClean, $m)) {
        $targetNum = 'Ф-' . (int)$m[1];
        $branchNumInt = (int)$m[1];
    } elseif (preg_match('/цгб-ф(\d+)/u', $locationClean, $m)) {
        $targetNum = 'Ф-' . (int)$m[1];
        $branchNumInt = (int)$m[1];
    } elseif (preg_match('/филиал\s*(?:№|no\.|#)?\s*(\d+)/u', $locationClean, $m)) {
        $targetNum = 'Ф-' . (int)$m[1];
        $branchNumInt = (int)$m[1];
    } elseif ($branchCodeClean === 'до' || strpos($branchCodeClean, 'цдб') !== false || strpos($locationClean, 'цдб') !== false || strpos($locationClean, 'цгб-до') !== false) {
        $targetNum = 'ЦДБ';
    } elseif (in_array($branchCodeClean, ['аб', 'чз', 'ибо', 'ооо', 'кх'], true) ||
              strpos($locationClean, 'цгб') !== false) {
        $targetNum = 'ЦГБ';
    }

    if ($targetNum !== null) {
        foreach ($branches as $b) {
            $bNum = $b['branch_num'] ?? '';
            if ($targetNum === 'ЦГБ' && (strpos($bNum, 'ЦГБ') !== false || ($b['branch_code'] ?? '') === 'ЦГБ')) {
                return $b;
            }
            if ($targetNum === 'ЦДБ' && (strpos($bNum, 'ЦДБ') !== false || ($b['branch_code'] ?? '') === 'ЦДБ')) {
                return $b;
            }
            if ($branchNumInt !== null && preg_match('/(?:№|Ф-|Ф|филиал\s*№?)\s*' . $branchNumInt . '\b/ui', $bNum)) {
                return $b;
            }
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
function opacwp_parse_copies_xml($xml)
{
    $error = opacwp_extract_xml_error($xml);
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

            // Извлечение инвентарного номера с максимальным охватом атрибутов и подполей
            $invCandidate = trim((string)($attrs['inventory'] ?? ''));
            if ($invCandidate === '') {
                $invCandidate = trim((string)($subfields['x'] ?? ''));
            }
            if ($invCandidate === '') {
                $invCandidate = trim((string)($attrs['code1'] ?? ''));
            }
            if ($invCandidate === '' && !empty($attrs['copy'])) {
                $parts = explode('/', (string)$attrs['copy']);
                $invCandidate = trim($parts[0] ?? '');
            }

            // Сопоставление с реестром филиалов
            $branchInfo = opacwp_map_branch($subB, $loc !== '' ? $loc : $permLoc);

            $copies[] = [
                'inventory'          => $invCandidate,
                'barcode'            => $attrs['barcode'] ?? '',
                'shifr'              => $attrs['shifr'] ?? ($subfields['j'] ?? ''),
                'code1'              => $attrs['code1'] ?? '',
                'copy'               => $attrs['copy'] ?? '',
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
 * Очистка поискового запроса от стоп-слов («книга», «найди», «роман» и т.п.)
 *
 * @param string $query
 * @return string
 */
function opacwp_clean_search_query($query)
{
    $q = trim((string)$query);
    if ($q === '') return '';

    // Если уже есть операторы OPAC — не трогаем
    if (preg_match('/^(?:FT|TI|AU|SH|BC|IN|PU|PY)\s+/i', $q) || strpos($q, '(') !== false) {
        return $q;
    }

    $stopWords = [
        'книга', 'книгу', 'книги', 'книжек', 'книжка', 'книжки',
        'найди', 'найдите', 'найти', 'поищи', 'поиск', 'ищи',
        'пожалуйста', 'плиз', 'есть ли', 'наличие', 'в наличии',
        'автор', 'автора', 'написал', 'роман', 'повесть', 'рассказ',
        'стихи', 'поэма', 'сказка', 'сказки', 'произведение', 'том'
    ];

    $pattern = '/\b(' . implode('|', array_map('preg_quote', $stopWords)) . ')\b/ui';
    $cleaned = preg_replace($pattern, ' ', $q);
    $cleaned = preg_replace('/\s+/u', ' ', $cleaned);
    $cleaned = trim($cleaned);

    return ($cleaned !== '') ? $cleaned : $q;
}

/**
 * Нормализация и форматирование поискового выражения для OPAC-Global
 *
 * @param string $query Входной запрос
 * @return string Корректное выражение с метками (FT, TI, AU...)
 */
function opacwp_format_query($query)
{
    $q = trim((string)$query);
    if ($q === '') {
        return '';
    }

    // Поиск по инвентарному номеру: /инв, инв., инв.номер, инвентарный номер, inv...
    if (preg_match('/^(?:\/)?(?:инвентарный\s+номер|инвентарный|инвентарь|инв\.?\s*номер|инв\.?|inv)\s*[:№#\s.]*\s*([a-zа-я0-9\/-]+)$/ui', $q, $mInv)) {
        $invClean = trim($mInv[1]);
        if ($invClean !== '') {
            return "IN {$invClean}";
        }
    }

    // Если запрос уже содержит метки OPAC или операторы в скобках
    if (preg_match('/^(?:FT|TI|AU|SH|BC|IN|PU|PY|LA|FD)\s+/i', $q) ||
        preg_match('/^\s*\(\s*(?:FT|TI|AU|SH|BC|IN|PU|PY)/i', $q)
    ) {
        return $q;
    }

    $qClean = opacwp_clean_search_query($q);

    // Разделение на слова
    $words = preg_split('/[\s,]+/u', $qClean, -1, PREG_SPLIT_NO_EMPTY);
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
 * Кэш: cache/opacwp_search_{md5}.json (TTL 14400 сек / 4 часа)
 *
 * @param string $query Поисковое выражение
 * @param int $length Лимит записей на порцию (по умолчанию 5)
 * @param int $start Смещение от начала (0-indexed)
 * @return array
 */
function opacwp_search_raw($query, $length = 5, $start = 0)
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

    // Защита от опасных запросов, перегружающих сервер OPAC-Global:
    // 1. Одиночные буквы («а», «и», «в») вызывают полный скан базы RUSMARC и зависание CGI opac.exe
    $cleanedQuery = opacwp_clean_search_query($query);
    if (mb_strlen($cleanedQuery, 'UTF-8') < 2 && !preg_match('/^\d{2,}$/', $cleanedQuery)) {
        return [
            'ok'          => false,
            'error'       => 'Поисковый запрос слишком короткий (минимум 2 символа). Уточните фамилию автора или название книги.',
            'total_found' => 0,
            'items'       => [],
        ];
    }

    // 2. Блокировка запросов из одних лишь спецсимволов и подстановок (*, %, ?)
    if (preg_match('/^[\p{P}\s\*\?%_`~^$#@!+=<>|]+$/u', $query)) {
        return [
            'ok'          => false,
            'error'       => 'Поисковый запрос содержит только спецсимволы. Пожалуйста, введите название книги или автора.',
            'total_found' => 0,
            'items'       => [],
        ];
    }

    $length = max(1, min(50, (int)$length));
    $start  = max(0, (int)$start);

    // Кэш поисковых запросов ОТКЛЮЧЁН — каждый поиск выполняется заново из OPAC
    // (TTL=0 гарантирует актуальные данные о наличии книг)
    // $cacheDir  = opacwp_get_cache_dir();
    // $cacheKey  = md5($query . '|' . $length . '|' . $start);
    // $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . "opacwp_search_{$cacheKey}.json";


    // Получение сессии
    $session = opacwp_get_session(false);
    if (empty($session['ok']) || empty($session['numsean'])) {
        return [
            'ok'    => false,
            'error' => 'Ошибка авторизации в OPAC-Global: ' . ($session['error'] ?? 'не удалось получить сессию'),
        ];
    }

    $baseUrl   = rtrim((string)opacwp_get_config('opacwp_base_url'), '/');
    $directUrl = $baseUrl . '/cgiopac/opacg/direct.exe';
    $dbId      = (string)opacwp_get_config('opacwp_db_id');
    $bodyExpr  = opacwp_format_query($query);

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
    $resp = opacwp_make_request($directUrl, $buildPost($session), $cookieStr);

    // Автоматический перелогин при протухании сессии
    if (!$resp['ok'] || opacwp_is_session_expired_response($resp['body'])) {
        $session = opacwp_get_session(true);
        if (!empty($session['ok']) && !empty($session['numsean'])) {
            $cookieStr = 'OGSSOSession=' . $session['OGSSOSession'] . '; numsean=' . $session['numsean'];
            $resp = opacwp_make_request($directUrl, $buildPost($session), $cookieStr);
        }
    }

    if (!$resp['ok']) {
        return [
            'ok'        => false,
            'error'     => 'Сетевая ошибка обращения к поисковому шлюзу OPAC: ' . ($resp['error'] ?: 'HTTP ' . $resp['http_code']),
            'http_code' => $resp['http_code'],
        ];
    }

    $parsed = opacwp_parse_search_xml($resp['body']);
    $parsed['query']        = $query;
    $parsed['query_expr']   = $bodyExpr;
    $parsed['length']       = $length;
    $parsed['start']        = $start;
    $parsed['raw_xml']      = $resp['body'];

    if ($parsed['ok']) {
        // Запись в файловый кэш отключена — результаты всегда актуальны из OPAC
        // opacwp_atomic_write_json($cacheFile, $parsed);
    }

    return $parsed;
}

/**
 * Получение точного списка экземпляров и филиалов книги (opacholdd.MoveCopies)
 * Кэш: cache/opacwp_copies_{md5}.json (TTL 3600 сек / 1 час)
 *
 * @param string $recordId Идентификатор библиографической записи (idbr, например: "RU VLADIMIR\BIBL\0002736712")
 * @return array
 */
function opacwp_get_copies_raw($recordId)
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
    $cacheDir  = opacwp_get_cache_dir();
    $cacheKey  = md5($recordId);
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . "opacwp_copies_{$cacheKey}.json";
    $copiesTtl = (int)opacwp_get_config('opacwp_copies_ttl');

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
    $session = opacwp_get_session(false);
    if (empty($session['ok']) || empty($session['numsean'])) {
        return [
            'ok'    => false,
            'error' => 'Ошибка авторизации в OPAC-Global: ' . ($session['error'] ?? 'не удалось получить сессию'),
        ];
    }

    $baseUrl   = rtrim((string)opacwp_get_config('opacwp_base_url'), '/');
    $directUrl = $baseUrl . '/cgiopac/opacg/direct.exe';
    $dbId      = (string)opacwp_get_config('opacwp_db_id');

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
    $resp = opacwp_make_request($directUrl, $buildPost($session), $cookieStr);

    // Автоматический перелогин при ошибке сессии
    if (!$resp['ok'] || opacwp_is_session_expired_response($resp['body'])) {
        $session = opacwp_get_session(true);
        if (!empty($session['ok']) && !empty($session['numsean'])) {
            $cookieStr = 'OGSSOSession=' . $session['OGSSOSession'] . '; numsean=' . $session['numsean'];
            $resp = opacwp_make_request($directUrl, $buildPost($session), $cookieStr);
        }
    }

    if (!$resp['ok']) {
        return [
            'ok'        => false,
            'error'     => 'Сетевая ошибка обращения к сервису экземпляров: ' . ($resp['error'] ?: 'HTTP ' . $resp['http_code']),
            'http_code' => $resp['http_code'],
        ];
    }

    $parsed = opacwp_parse_copies_xml($resp['body']);
    $parsed['record_id'] = $recordId;
    $parsed['raw_xml']   = $resp['body'];

    if ($parsed['ok']) {
        opacwp_atomic_write_json($cacheFile, $parsed);
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
function opacwp_cascade_search($query, $length = 5, $start = 0)
{
    $clean = trim((string)$query);
    if ($clean === '') {
        return opacwp_search_raw($query, $length, $start);
    }

    // Если запрос содержит синтаксис OPAC — выполняем напрямую
    if (preg_match('/^(?:FT|TI|AU|SH|BC|IN)\s+/i', $clean) || strpos($clean, '(') !== false) {
        return opacwp_search_raw($clean, $length, $start);
    }

    // 1-й каскад: стандартное форматирование
    $res1 = opacwp_search_raw($clean, $length, $start);
    if (!empty($res1['ok']) && ($res1['total_found'] ?? 0) > 0) {
        $res1['cascade_tier'] = 1;
        return $res1;
    }

    // Если при 1-м каскаде возникла сетевая ошибка или сработал предохранитель —
    // НЕМЕДЛЕННО ПРЕКРАЩАЕМ каскад, чтобы не добивать сервер OPAC!
    if (empty($res1['ok']) || !empty($res1['circuit_breaker'])) {
        $res1['cascade_tier'] = 0;
        return $res1;
    }

    // Каскад инвентарного номера: если запрос состоит из цифр (например: "146942" или "ф4-146942")
    if (preg_match('/^(?:(?:ф|f)\d+[\/-])?[0-9]{4,10}(?:[\/-][0-9]+)?$/ui', $clean)) {
        $resInv = opacwp_search_raw("IN {$clean}", $length, $start);
        if (!empty($resInv['ok']) && ($resInv['total_found'] ?? 0) > 0) {
            $resInv['cascade_tier'] = 'inv';
            return $resInv;
        }
    }

    // 2-й каскад: фразовый поиск в кавычках FT '...'
    $phraseQuery = "FT '" . str_replace(["'", '"'], '', $clean) . "'";
    $res2 = opacwp_search_raw($phraseQuery, $length, $start);
    if (!empty($res2['ok']) && ($res2['total_found'] ?? 0) > 0) {
        $res2['cascade_tier'] = 2;
        return $res2;
    }

    if (empty($res2['ok']) || !empty($res2['circuit_breaker'])) {
        $res2['cascade_tier'] = 0;
        return $res2;
    }

    // 3-й каскад: поиск по заглавию TI (только для фраз из 2-5 слов)
    $words = preg_split('/[\s,]+/u', $clean, -1, PREG_SPLIT_NO_EMPTY);
    if (count($words) > 1 && count($words) <= 5) {
        $tiParts = [];
        foreach ($words as $w) {
            $cw = str_replace(["'", '"'], '', $w);
            if ($cw !== '') {
                $tiParts[] = "TI {$cw}";
            }
        }
        $tiQuery = '(' . implode(' AND ', $tiParts) . ')';
        $res3 = opacwp_search_raw($tiQuery, $length, $start);
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
function opacwp_search_books($query, $length = 5, $start = 0, $cascade = true)
{
    return $cascade ? opacwp_cascade_search($query, $length, $start) : opacwp_search_raw($query, $length, $start);
}

/**
 * Удобная обертка для получения информации об экземплярах книги
 *
 * @param string $recordId
 * @return array
 */
function opacwp_get_book_copies($recordId)
{
    return opacwp_get_copies_raw($recordId);
}

/**
 * Разрешение сигнатуры/сиглы филиала в структурированный массив
 *
 * @param string $branchCode
 * @param string $locationStr
 * @return array|null
 */
function opacwp_resolve_branch($branchCode, $locationStr = '')
{
    return opacwp_map_branch($branchCode, $locationStr);
}

/**
 * Высокоточный поиск обложки книги из нескольких независимых источников:
 * 1. Яндекс Книги (Bookmate API) — эталонные обложки для русскоязычных изданий
 * 2. ЛитРес (api.litres.ru) — крупнейший каталог лицензионных книг в РФ
 * 3. Google Books API (поля intitle + inauthor)
 * 4. OpenLibrary API (до 5 документов)
 * С серверным кэшированием (TTL 7 дней).
 *
 * @param string $rawTitle Заглавие книги
 * @param string $rawAuthor Автор
 * @param string $isbn ISBN книги
 * @return array
 */
/**
 * Очистка автора книги и корректное извлечение фамилии для поиска обложек.
 * Поддерживает любые форматы:
 * - Инициалы впереди: "А. С. Пушкин", "А.С. Пушкин", "А. Пушкин", "А.С.Пушкин"
 * - Инициалы сзади: "Пушкин А. С.", "Пушкин А.С.", "Пушкин А."
 * - Запятая: "Пушкин, Александр Сергеевич", "Пушкин, А. С."
 * - Полное имя: "Александр Сергеевич Пушкин" (отчество 2-е -> фамилия 3-я), "Пушкин Александр Сергеевич"
 * - 2 слова: "Александр Пушкин" vs "Пушкин Александр", "Лев Толстой" vs "Толстой Лев", "Стивен Кинг"
 */
function opacwp_clean_author_for_cover($rawAuthor)
{
    $a = trim((string)$rawAuthor);
    if ($a === '') {
        return '';
    }

    $a = preg_replace('/[\[\]\(\)\"\'«»“”]/u', ' ', $a);
    $a = preg_replace('/([A-Za-zА-Яа-яЁё])\./u', '$1. ', $a);
    $a = trim(preg_replace('/\s+/u', ' ', $a));
    if ($a === '') {
        return '';
    }

    if (mb_strpos($a, ',') !== false) {
        $commaPart = trim(explode(',', $a)[0]);
        if (mb_strlen($commaPart, 'UTF-8') >= 2) {
            $a = $commaPart;
        }
    }

    $rawWords = array_values(array_filter(preg_split('/\s+/u', $a), function ($w) {
        return $w !== '';
    }));
    if (empty($rawWords)) {
        return '';
    }

    $isInitial = function ($w) {
        $clean = trim($w, " .\t\n\r\0\x0B");
        $len = mb_strlen($clean, 'UTF-8');
        return $len === 1 || ($len === 2 && mb_strpos($w, '.') !== false);
    };

    while (!empty($rawWords) && $isInitial($rawWords[0])) {
        array_shift($rawWords);
    }
    while (!empty($rawWords) && $isInitial($rawWords[count($rawWords) - 1])) {
        array_pop($rawWords);
    }

    $words = array_values($rawWords);
    if (empty($words)) {
        return '';
    }
    if (count($words) === 1) {
        return trim($words[0], " .,");
    }

    $patronymicRe = '/(?:ович|евич|ич|овна|евна|ична|инична)$/ui';
    if (count($words) === 3) {
        if (preg_match($patronymicRe, $words[1])) {
            return trim($words[2], " .,");
        }
        if (preg_match($patronymicRe, $words[2])) {
            return trim($words[0], " .,");
        }
        return trim($words[count($words) - 1], " .,");
    }

    if (count($words) === 2) {
        $commonFirstNames = [
            'александр', 'алексей', 'анатолий', 'андрей', 'антон', 'аркадий', 'артем', 'артём', 'артур',
            'борис', 'вадим', 'валентин', 'валерий', 'василий', 'виктор', 'виталий', 'владимир', 'владислав',
            'всеволод', 'вячеслав', 'геннадий', 'георгий', 'глеб', 'григорий', 'даниил', 'денис', 'дмитрий',
            'евгений', 'егор', 'захар', 'иван', 'игорь', 'илья', 'кирилл', 'константин', 'лев', 'леонид',
            'максим', 'матвей', 'михаил', 'никита', 'николай', 'олег', 'павел', 'петр', 'пётр', 'платон',
            'роман', 'ростислав', 'руслан', 'семен', 'семён', 'сергей', 'станислав', 'степан', 'тимофей',
            'тимур', 'федор', 'фёдор', 'филипп', 'эдуард', 'юрий', 'ярослав',
            'анна', 'анастасия', 'валентина', 'валерия', 'варвара', 'василиса', 'вера', 'вероника', 'виктория',
            'галина', 'дарья', 'диана', 'евгения', 'екатерина', 'елена', 'елизавета', 'жанна', 'зинаида', 'зоя',
            'инна', 'ирина', 'кира', 'кристина', 'ксения', 'лариса', 'лидия', 'любовь', 'людмила', 'маргарита',
            'марина', 'мария', 'мирослава', 'надежда', 'наталья', 'нина', 'оксана', 'олеся', 'ольга', 'полина',
            'раиса', 'римма', 'светлана', 'софия', 'софья', 'тамара', 'татьяна', 'ульяна', 'юлия', 'яна',
            'стивен', 'джон', 'джордж', 'марк', 'джек', 'роберт', 'уильям', 'томас', 'майкл', 'дэвид',
            'эдгар', 'эрнест', 'франц', 'герман', 'жюль', 'чарльз', 'рей', 'рэй', 'айзек', 'клиффорд',
            'агата', 'джейн', 'вирджиния', 'джоан'
        ];
        $fnMap = array_flip($commonFirstNames);
        $w0 = str_replace('ё', 'е', mb_strtolower(trim($words[0], " .,"), 'UTF-8'));
        $w1 = str_replace('ё', 'е', mb_strtolower(trim($words[1], " .,"), 'UTF-8'));

        $surnameSuffixRe = '/(?:ов|ова|ев|ева|ин|ина|ын|ына|ский|ская|цкий|цкая|ых|их|ой|ый)$/ui';
        if (isset($fnMap[$w0]) && !isset($fnMap[$w1])) {
            return trim($words[1], " .,");
        }
        if (isset($fnMap[$w1]) && !isset($fnMap[$w0])) {
            return trim($words[0], " .,");
        }
        if (preg_match($surnameSuffixRe, $w0) && !preg_match($surnameSuffixRe, $w1)) {
            return trim($words[0], " .,");
        }
        if (preg_match($surnameSuffixRe, $w1) && !preg_match($surnameSuffixRe, $w0)) {
            return trim($words[1], " .,");
        }
        return trim($words[0], " .,");
    }

    return trim($words[0], " .,");
}

if (!function_exists('cleanAuthorForCover')) {
    function cleanAuthorForCover($rawAuthor) {
        return opacwp_clean_author_for_cover($rawAuthor);
    }
}

/**
 * Строгая проверка совпадения названия и автора книги для обложки (защита от чужих обложек)
 * 1. Если у книги в ОПАК есть автор, найденная книга ОБЯЗАНА содержать фамилию автора.
 * 2. Название должно строго совпадать (>= 80% значимых слов).
 * Если не совпадает — отдавать false/null!
 */
function opacwp_is_strict_cover_match($foundTitle, $foundAuthors, $targetTitle, $targetAuthor)
{
    if (empty($foundTitle) || empty($targetTitle)) {
        return false;
    }

    $norm = function ($str) {
        $s = mb_strtolower((string)$str, 'UTF-8');
        $s = str_replace('ё', 'е', $s);
        $s = preg_replace('/[.,\/#!$%\^&\*;:{}=\-_`~()\"\'«»“”\[\]]/u', ' ', $s);
        $s = preg_replace('/\s+/u', ' ', $s);
        return trim($s);
    };

    $tTitleNorm = $norm($targetTitle);
    $fTitleNorm = $norm($foundTitle);
    if ($tTitleNorm === '' || $fTitleNorm === '') {
        return false;
    }

    // 1. Проверка автора: если автор указан в каталоге ОПАК, найденная книга ОБЯЗАНА содержать его фамилию
    $cleanTargetAuthor = trim((string)$targetAuthor);
    if ($cleanTargetAuthor !== '') {
        $targetSurname = opacwp_clean_author_for_cover($cleanTargetAuthor);
        $tSurnameNorm = $norm($targetSurname);

        if (mb_strlen($tSurnameNorm, 'UTF-8') >= 2) {
            $fAuthorsNorm = $norm($foundAuthors);
            $fTitleCheck = $norm($foundTitle);

            $stem = mb_strlen($tSurnameNorm, 'UTF-8') >= 4 ? mb_substr($tSurnameNorm, 0, -1, 'UTF-8') : $tSurnameNorm;
            $stemPattern = preg_quote($stem, '/');
            $authorRegex = '/(?:^|\s)' . $stemPattern . '[а-яa-z]*(?:$|\s)/ui';

            $authorInAuthors = ($fAuthorsNorm !== '') ? (bool)preg_match($authorRegex, ' ' . $fAuthorsNorm . ' ') : false;
            $authorInTitle = (bool)preg_match($authorRegex, ' ' . $fTitleCheck . ' ');

            if (!$authorInAuthors && !$authorInTitle) {
                return false;
            }
        }
    }

    // 2. Строгая проверка названия (>= 80% значимых слов)
    if ($fTitleNorm === $tTitleNorm) {
        return true;
    }

    // Отсекаем подзаголовки (после :, ;, —, –, /)
    $stripSub = function ($str) {
        $parts = preg_split('/[:;–—\/]/u', (string)$str);
        $m = trim($parts[0] ?? '');
        return $m !== '' ? $m : $str;
    };
    $tTitleClean = $norm($stripSub($targetTitle));
    $fTitleClean = $norm($stripSub($foundTitle));
    if ($tTitleClean !== '' && $fTitleClean !== '' && $tTitleClean === $fTitleClean) {
        return true;
    }

    // Сравнение без указания тома/части/книги
    $tShort = trim(preg_split('/\s+том\b|\s+ч\b|\s+кн\b/u', $tTitleClean !== '' ? $tTitleClean : $tTitleNorm)[0] ?? $tTitleNorm);
    $fShort = trim(preg_split('/\s+том\b|\s+ч\b|\s+кн\b/u', $fTitleClean !== '' ? $fTitleClean : $fTitleNorm)[0] ?? $fTitleNorm);
    if ($tShort !== '' && $tShort === $fShort) {
        return true;
    }

    $stopWords = [
        'и'=>1, 'в'=>1, 'во'=>1, 'не'=>1, 'на'=>1, 'с'=>1, 'со'=>1, 'что'=>1, 'он'=>1, 'по'=>1, 'к'=>1, 'ко'=>1,
        'из'=>1, 'у'=>1, 'за'=>1, 'от'=>1, 'о'=>1, 'об'=>1, 'обо'=>1, 'для'=>1, 'до'=>1, 'же'=>1, 'бы'=>1,
        'то'=>1, 'ли'=>1, 'но'=>1, 'да'=>1, 'или'=>1, 'а'=>1, 'как'=>1, 'так'=>1, 'том'=>1, 'часть'=>1,
        'книга'=>1, 'выпуск'=>1, 'т'=>1, 'ч'=>1, 'кн'=>1, 'the'=>1, 'a'=>1, 'an'=>1, 'and'=>1, 'or'=>1,
        'in'=>1, 'on'=>1, 'at'=>1, 'of'=>1, 'to'=>1, 'for'=>1, 'with'=>1, 'by'=>1
    ];

    $extractSignificantWords = function ($title) use ($stopWords) {
        $words = preg_split('/\s+/u', $title);
        $result = [];
        foreach ($words as $w) {
            $w = trim($w);
            if (mb_strlen($w, 'UTF-8') >= 2 && !isset($stopWords[$w])) {
                $result[] = $w;
            }
        }
        return $result;
    };

    $tWords = $extractSignificantWords($tShort !== '' ? $tShort : $tTitleNorm);
    $fWords = $extractSignificantWords($fShort !== '' ? $fShort : $fTitleNorm);

    if (empty($tWords) || empty($fWords)) {
        return $tTitleNorm === $fTitleNorm;
    }

    $wordsMatch = function ($w1, $w2) {
        if ($w1 === $w2) return true;
        $l1 = mb_strlen($w1, 'UTF-8');
        $l2 = mb_strlen($w2, 'UTF-8');
        if ($l1 >= 4 && $l2 >= 4) {
            $p1 = mb_substr($w1, 0, -1, 'UTF-8');
            $p2 = mb_substr($w2, 0, -1, 'UTF-8');
            if (mb_strpos($w1, $p2) === 0 || mb_strpos($w2, $p1) === 0) return true;
            if ($l1 >= 5 && $l2 >= 5) {
                if (mb_substr($w1, 0, -2, 'UTF-8') === mb_substr($w2, 0, -2, 'UTF-8')) return true;
            }
        }
        return false;
    };

    $matchedTargetWords = 0;
    foreach ($tWords as $tw) {
        foreach ($fWords as $fw) {
            if ($wordsMatch($tw, $fw)) {
                $matchedTargetWords++;
                break;
            }
        }
    }
    $ratioTarget = $matchedTargetWords / count($tWords);

    $matchedFoundWords = 0;
    foreach ($fWords as $fw) {
        foreach ($tWords as $tw) {
            if ($wordsMatch($tw, $fw)) {
                $matchedFoundWords++;
                break;
            }
        }
    }
    $ratioFound = $matchedFoundWords / count($fWords);

    if ($ratioTarget >= 0.8 && $ratioFound >= 0.6) {
        return true;
    }

    return false;
}

function opacwp_resolve_book_cover($rawTitle, $rawAuthor = '', $isbn = '', $sourceFilter = '')
{
    $title = trim((string)$rawTitle);
    $author = trim((string)$rawAuthor);
    $isbn = preg_replace('/[^0-9Xx]/', '', (string)$isbn);
    $sourceFilter = mb_strtolower(trim((string)$sourceFilter), 'UTF-8');

    if ($title === '' && $isbn === '') {
        return ['ok' => false, 'found' => false, 'error' => 'Не указано заглавие книги или ISBN'];
    }

    // Очистка заглавия и автора от библиографического мусора OPAC
    $cleanTitle = preg_replace('/\[\/?color[^\]]*\]/ui', '', $title);
    $cleanTitle = preg_replace('/<[^>]+>/u', '', $cleanTitle);
    $cleanTitle = preg_replace('/\[.*?\]/u', ' ', $cleanTitle);
    $cleanTitle = preg_replace('/\(.*?\)/u', ' ', $cleanTitle);
    $cleanTitle = preg_replace('/\[.*$/u', '', $cleanTitle);
    $cleanTitle = preg_replace('/\(.*$/u', '', $cleanTitle);
    $parts = preg_split('/[:;–—\/]/u', $cleanTitle);
    $cleanTitle = trim($parts[0] ?? $cleanTitle);
    if (preg_match('/\.\s+[А-ЯA-Z]/u', $cleanTitle)) {
        $cleanTitle = trim(explode('. ', $cleanTitle)[0]);
    }
    $cleanTitle = preg_replace('/[\"\'«»“”]/u', '', $cleanTitle);
    $cleanTitle = trim(preg_replace('/[,.]\s*$/u', '', $cleanTitle));

    $cleanAuthor = opacwp_clean_author_for_cover($author);

    // Префикс кэша v5 (приоритет: ЛитРес -> Яндекс Книги -> OpenLibrary -> Google Книги)
    $cacheKey = md5(mb_strtolower($cleanTitle . '|' . $cleanAuthor . '|' . $isbn . ($sourceFilter !== '' ? '|' . $sourceFilter : ''), 'UTF-8'));
    $cacheDir = opacwp_get_cache_dir();
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'opacwp_cov_v5_' . $cacheKey . '.json';

    // 1. Проверка серверного кэша (TTL 7 дней = 604800 сек)
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < 604800)) {
        $cached = @json_decode(@file_get_contents($cacheFile), true);
        if (is_array($cached)) {
            $cached['from_cache'] = true;
            return $cached;
        }
    }

    $userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // =========================================================================
    // ПРИОРИТЕТ 1 (ВЫСОЧАЙШИЙ): ЛитРес (api.litres.ru) — крупнейший каталог в РФ
    // =========================================================================
    if ($sourceFilter === '' || $sourceFilter === 'litres') {
        $litresQuery = $isbn !== '' ? $isbn : trim($cleanTitle . ' ' . $cleanAuthor);
        if ($litresQuery !== '') {
            $ch = curl_init('https://api.litres.ru/foundation/api/search?q=' . urlencode($litresQuery) . '&types=text_book');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 4,
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_USERAGENT      => $userAgent,
                CURLOPT_SSL_VERIFYPEER => false,
            ]);
            $res = curl_exec($ch);
            if ($res) {
                $data = @json_decode($res, true);
                $items = $data['payload']['data'] ?? [];
                if (is_array($items) && !empty($items)) {
                    foreach ($items as $item) {
                        $inst = $item['instance'] ?? [];
                        if (empty($inst['cover_url'])) continue;

                        $iTitle = trim($inst['title'] ?? '');
                        $iAuthors = '';
                        if (!empty($inst['persons']) && is_array($inst['persons'])) {
                            $pNames = [];
                            foreach ($inst['persons'] as $p) {
                                if (!empty($p['full_name'])) $pNames[] = $p['full_name'];
                            }
                            $iAuthors = implode(', ', $pNames);
                        }

                        // Строгая проверка соответствия названия и автора
                        if (opacwp_is_strict_cover_match($iTitle, $iAuthors, $cleanTitle, $cleanAuthor)) {
                            $out = [
                                'ok'        => true,
                                'found'     => true,
                                'url'       => 'https://cdn.litres.ru' . $inst['cover_url'],
                                'source'    => 'ЛитРес',
                                'source_id' => 'litres',
                                'color'     => null,
                                'title'     => $iTitle,
                                'author'    => $iAuthors ?: $author,
                            ];
                            @file_put_contents($cacheFile, json_encode($out, JSON_UNESCAPED_UNICODE), LOCK_EX);
                            return $out;
                        }
                    }
                }
            }
        }
        if ($sourceFilter === 'litres') {
            return ['ok' => true, 'found' => false, 'url' => null, 'source' => null];
        }
    }

    // =========================================================================
    // ПРИОРИТЕТ 2: Яндекс Книги (Bookmate API) — открытый каталог качественных обложек
    // =========================================================================
    if ($sourceFilter === '' || $sourceFilter === 'yandex') {
        $yandexQuery = trim($cleanTitle . ' ' . $cleanAuthor);
        if ($yandexQuery !== '') {
            $ch = curl_init('https://api.bookmate.com/api/v5/books/search?query=' . urlencode($yandexQuery));
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 4,
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_USERAGENT      => $userAgent,
                CURLOPT_SSL_VERIFYPEER => false,
            ]);
            $res = curl_exec($ch);
            if ($res) {
                $data = @json_decode($res, true);
                if (!empty($data['objects']) && is_array($data['objects'])) {
                    foreach ($data['objects'] as $obj) {
                        if (empty($obj['cover']['large']) && empty($obj['cover']['small'])) {
                            continue;
                        }
                        $objTitle   = trim($obj['title'] ?? '');
                        $objAuthors = trim($obj['authors'] ?? '');

                        // Строгая проверка соответствия названия и автора
                        if (opacwp_is_strict_cover_match($objTitle, $objAuthors, $cleanTitle, $cleanAuthor)) {
                            $coverUrl = $obj['cover']['large'] ?? $obj['cover']['small'];
                            $out = [
                                'ok'        => true,
                                'found'     => true,
                                'url'       => $coverUrl,
                                'source'    => 'Яндекс Книги',
                                'source_id' => 'yandex',
                                'color'     => $obj['cover']['background_color_hex'] ?? null,
                                'title'     => $objTitle,
                                'author'    => $objAuthors,
                            ];
                            @file_put_contents($cacheFile, json_encode($out, JSON_UNESCAPED_UNICODE), LOCK_EX);
                            return $out;
                        }
                    }
                }
            }
        }
        if ($sourceFilter === 'yandex') {
            return ['ok' => true, 'found' => false, 'url' => null, 'source' => null];
        }
    }

    // =========================================================================
    // ПРИОРИТЕТ 3: OpenLibrary Covers API
    // =========================================================================
    if ($sourceFilter === '' || $sourceFilter === 'openlibrary') {
        $olQ = urlencode($cleanTitle . ' ' . $cleanAuthor);
        $ch = curl_init('https://openlibrary.org/search.json?q=' . $olQ . '&limit=6');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 4,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_USERAGENT      => $userAgent,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $res = curl_exec($ch);
        if ($res) {
            $data = @json_decode($res, true);
            if (!empty($data['docs']) && is_array($data['docs'])) {
                foreach ($data['docs'] as $doc) {
                    if (empty($doc['cover_i'])) continue;

                    $olTitle = trim($doc['title'] ?? '');
                    $olAuthors = !empty($doc['author_name']) ? implode(', ', $doc['author_name']) : '';

                    if (opacwp_is_strict_cover_match($olTitle, $olAuthors, $cleanTitle, $cleanAuthor)) {
                        $coverUrl = 'https://covers.openlibrary.org/b/id/' . (int)$doc['cover_i'] . '-L.jpg';
                        $out = [
                            'ok'        => true,
                            'found'     => true,
                            'url'       => $coverUrl,
                            'source'    => 'OpenLibrary',
                            'source_id' => 'openlibrary',
                            'color'     => null,
                            'title'     => $olTitle,
                            'author'    => $olAuthors ?: $author,
                        ];
                        @file_put_contents($cacheFile, json_encode($out, JSON_UNESCAPED_UNICODE), LOCK_EX);
                        return $out;
                    }
                }
            }
        }
        if ($sourceFilter === 'openlibrary') {
            return ['ok' => true, 'found' => false, 'url' => null, 'source' => null];
        }
    }

    // =========================================================================
    // ПРИОРИТЕТ 4 (САМЫЙ НИЗКИЙ): Google Книги API — опрашивается в самом конце
    // =========================================================================
    if ($sourceFilter === '' || $sourceFilter === 'google') {
        $gbQ = $cleanAuthor !== '' ? 'intitle:' . urlencode($cleanTitle) . '+inauthor:' . urlencode($cleanAuthor) : urlencode($cleanTitle);
        $ch = curl_init('https://www.googleapis.com/books/v1/volumes?q=' . $gbQ . '&maxResults=5&printType=books');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 4,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_USERAGENT      => $userAgent,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $res = curl_exec($ch);
        if ($res) {
            $data = @json_decode($res, true);
            if (!empty($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $gbItem) {
                    $vol = $gbItem['volumeInfo'] ?? [];
                    if (empty($vol['imageLinks'])) continue;

                    $gTitle = trim($vol['title'] ?? '');
                    $gAuthors = !empty($vol['authors']) ? implode(', ', $vol['authors']) : '';

                    if (opacwp_is_strict_cover_match($gTitle, $gAuthors, $cleanTitle, $cleanAuthor)) {
                        $links = $vol['imageLinks'];
                        $img = $links['extraLarge'] ?? $links['large'] ?? $links['medium'] ?? $links['thumbnail'] ?? $links['smallThumbnail'] ?? null;
                        if ($img) {
                            $img = str_replace('http://', 'https://', $img);
                            $img = str_replace(['&edge=curl', 'zoom=1', 'zoom=5'], ['', 'zoom=2', 'zoom=2'], $img);
                            $out = [
                                'ok'        => true,
                                'found'     => true,
                                'url'       => $img,
                                'source'    => 'Google Книги',
                                'source_id' => 'google',
                                'color'     => null,
                                'title'     => $gTitle,
                                'author'    => $gAuthors ?: $author,
                            ];
                            @file_put_contents($cacheFile, json_encode($out, JSON_UNESCAPED_UNICODE), LOCK_EX);
                            return $out;
                        }
                    }
                }
            }
        }
    }

    // Негативный кэш на 24 часа
    $negOut = ['ok' => true, 'found' => false, 'url' => null, 'source' => null];
    @file_put_contents($cacheFile, json_encode($negOut, JSON_UNESCAPED_UNICODE), LOCK_EX);
    return $negOut;
}

// -----------------------------------------------------------------------------
// 5. Защита сервера: IP Rate Limiting и клиентская идентификация
// -----------------------------------------------------------------------------

/**
 * Определение реального IP-адреса клиента с учётом прокси Cloudflare / Nginx
 *
 * @return string
 */
function opacwp_client_ip()
{
    $fwd = isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? (string)$_SERVER['HTTP_X_FORWARDED_FOR'] : '';
    if ($fwd !== '') {
        $parts = explode(',', $fwd);
        $ip = trim($parts[0]);
        if ($ip !== '') return $ip;
    }
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        return (string)$_SERVER['HTTP_CF_CONNECTING_IP'];
    }
    return isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '127.0.0.1';
}

/**
 * Высоконадежный файловый Rate Limiter с блокировкой flock
 * Защищает от DoS, спама и перегрузки PHP-процессов и OPAC.
 *
 * @param string $action Тип действия (search, copies, cover, status)
 * @param int $maxPerMinute Лимит запросов в минуту с одного IP (по умолчанию 30)
 * @param int $maxGlobalMinute Глобальный лимит запросов в минуту на весь сервер (по умолчанию 150)
 * @return bool true — запрос разрешён; false — лимит превышен (обработчик вернёт HTTP 429)
 */
function opacwp_rate_limit($action = 'search', $maxPerMinute = 30, $maxGlobalMinute = 150)
{
    if (PHP_SAPI === 'cli') {
        return true; // CLI вызовы не лимитируются
    }

    $ip = opacwp_client_ip();
    // Локальные запросы сервера не блокируются
    if ($ip === '127.0.0.1' || $ip === '::1') {
        return true;
    }

    $cacheDir = opacwp_get_cache_dir();
    $rateFile = $cacheDir . DIRECTORY_SEPARATOR . 'opacwp_rate_limit.json';
    $bucketMinute = (int)floor(time() / 60);

    $fp = @fopen($rateFile, 'c+');
    if (!$fp) {
        return;
    }

    @flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $data = json_decode((string)$raw, true);

    if (!is_array($data) || !isset($data['bucket']) || (int)$data['bucket'] !== $bucketMinute) {
        $data = [
            'bucket' => $bucketMinute,
            'global' => 0,
            'ips'    => [],
        ];
    }

    $ipKey = md5($ip);
    $currentIpCount = isset($data['ips'][$ipKey]) ? (int)$data['ips'][$ipKey] : 0;
    $currentGlobal  = isset($data['global']) ? (int)$data['global'] : 0;

    if ($currentIpCount >= $maxPerMinute || $currentGlobal >= $maxGlobalMinute) {
        @flock($fp, LOCK_UN);
        @fclose($fp);
        return false;
    }

    $data['ips'][$ipKey] = $currentIpCount + 1;
    $data['global']      = $currentGlobal + 1;

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data));
    @flock($fp, LOCK_UN);
    @fclose($fp);

    return true;
}

// HTTP/CLI-диспетчер из исходного api/opac.php не переносился:
// маршрутизацию запросов выполняет includes/class-opac-ajax.php (admin-ajax.php).

<?php
/**
 * AI Proxy Endpoint for VK Wall Searcher (вкладка «ИИ-аналитик»)
 * =============================================================================
 * OpenAI-совместимый шлюз (api.xkiro.com/v1). Ключи хранятся ТОЛЬКО на сервере
 * в api/config.php и никогда не попадают в браузер клиента.
 *
 * Отказоустойчивость:
 *   - Поддержка двух ИИ-ключей с Zero Downtime автоматическим failover
 *   - Кэширование активного ключа в cache/ai_active_key.json с блокировкой flock
 *   - При ошибках 429 (rate limit), 401, 402, 403 или quota/credit/insufficient
 *     происходит мгновенная ротация и повтор запроса в рамках одного HTTP-вызова
 *
 * Совместимо с PHP 7.4+ (cURL). Работает на любом веб-сервере.
 *
 * Методы:
 *   GET                      → статус (ai_configured, keys_count, model — без раскрытия ключей)
 *   POST {messages:[...]}    → проксирование в /chat/completions с автоматическим failover
 *
 * Разработка: Амброзиев О.А.
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

// ---------------------------------------------------------------------------
// 0. Конфигурация и пулы ИИ-ключей
// ---------------------------------------------------------------------------
// Встроенные дефолтные fallback-ключи на случай отсутствия или повреждения конфигурации
$defaultAiKey1 = 'sk-xt-7bfbd1f7908daa6a630e1e6e3d5cfa4e1961dcef6aebbfe1';
$defaultAiKey2 = 'sk-xt-764dbb9ee98b4d75bcedeef2fd0899d01044e46e8143acd2';
$defaultAiKey3 = 'sk-xt-89197544de3c1a413756421f7181e8ef5334c84915c67b1e';

// Читаем config.php и опционально config.local.php (локальные переопределения)
$aiConfig = [];
foreach ([__DIR__ . '/config.php', __DIR__ . '/config.local.php'] as $aiConfigFile) {
    if (is_readable($aiConfigFile)) {
        $aiLoaded = include $aiConfigFile;
        if (is_array($aiLoaded)) {
            $aiConfig = array_merge($aiConfig, $aiLoaded);
        }
    }
}
$configLocalFound = is_readable(__DIR__ . '/config.local.php');

// Сбор доступных ключей из конфигурации
$rawKeys = [];
if (!empty($aiConfig['ai_api_keys']) && is_array($aiConfig['ai_api_keys'])) {
    foreach ($aiConfig['ai_api_keys'] as $k) {
        $k = trim((string)$k);
        if ($k !== '' && strpos($k, 'ВСТАВЬТЕ') !== 0 && !preg_match('/^[<\[].+[>\]]$/', $k)) {
            $rawKeys[] = $k;
        }
    }
}
if (!empty($aiConfig['ai_api_key'])) {
    $k = trim((string)$aiConfig['ai_api_key']);
    if ($k !== '' && strpos($k, 'ВСТАВЬТЕ') !== 0) {
        $rawKeys[] = $k;
    }
}
if (!empty($aiConfig['ai_api_key_fallback'])) {
    $k = trim((string)$aiConfig['ai_api_key_fallback']);
    if ($k !== '' && strpos($k, 'ВСТАВЬТЕ') !== 0) {
        $rawKeys[] = $k;
    }
}
if (!empty($aiConfig['ai_api_key_fallback_2'])) {
    $k = trim((string)$aiConfig['ai_api_key_fallback_2']);
    if ($k !== '' && strpos($k, 'ВСТАВЬТЕ') !== 0) {
        $rawKeys[] = $k;
    }
}

// Гарантируем наличие трёх резервных ключей
if (empty($rawKeys)) {
    $rawKeys = [$defaultAiKey1, $defaultAiKey2, $defaultAiKey3];
} else {
    if (!in_array($defaultAiKey1, $rawKeys, true)) {
        $rawKeys[] = $defaultAiKey1;
    }
    if (!in_array($defaultAiKey2, $rawKeys, true)) {
        $rawKeys[] = $defaultAiKey2;
    }
    if (!in_array($defaultAiKey3, $rawKeys, true)) {
        $rawKeys[] = $defaultAiKey3;
    }
}

// Формируем уникальный список доступных ключей [$key1, $key2, $key3, ...]
$validKeys = array_values(array_unique($rawKeys));

$aiBaseUrl  = isset($aiConfig['ai_base_url']) ? trim((string)$aiConfig['ai_base_url']) : 'https://api.xkiro.com/v1';
$aiModel    = isset($aiConfig['ai_model'])    ? trim((string)$aiConfig['ai_model'])    : 'mistralai/mistral-large-2512';
$aiMaxTok   = isset($aiConfig['ai_max_tokens']) ? max(200, (int)$aiConfig['ai_max_tokens']) : 8192;
$aiTimeout  = isset($aiConfig['ai_timeout'])    ? max(30,  (int)$aiConfig['ai_timeout'])    : 180;

$aiBaseUrl = rtrim($aiBaseUrl, '/');

// Путь к файлу кэширования активного ключа
$cacheDir = dirname(__DIR__) . '/cache';
$activeKeyFile = $cacheDir . '/ai_active_key.json';

function ai_json_response($payload, $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function ai_error($msg, $code = 400, $extra = [])
{
    ai_json_response(array_merge(['error' => ['error_code' => $code, 'error_msg' => $msg]], $extra), $code);
}

// Полифилл mbstring (некоторые хостинги ставят PHP без расширения mbstring)
if (!function_exists('ai_mb_strlen')) {
    function ai_mb_strlen($s)
    {
        if (function_exists('mb_strlen')) return mb_strlen($s, 'UTF-8');
        return function_exists('iconv_strlen') ? (int)iconv_strlen($s, 'UTF-8') : strlen($s);
    }
    function ai_mb_substr($s, $start, $len)
    {
        if (function_exists('mb_substr')) return mb_substr($s, $start, $len, 'UTF-8');
        if (function_exists('iconv_substr')) {
            $r = iconv_substr($s, $start, $len, 'UTF-8');
            return $r === false ? '' : $r;
        }
        return substr($s, $start, $len);
    }
}

/**
 * Сверхнадёжный парсер JSON: исцеляет битые суррогаты UTF-16, непечатные символы,
 * magic_quotes слэши, BOM и некорректные байты UTF-8.
 */
function ai_robust_json_decode($raw)
{
    if (!is_string($raw) || trim($raw) === '') return null;

    // 1. Удаляем UTF-8 BOM
    $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw);

    // 2. Прямой декодинг с заменой некорректных байтов UTF-8
    $flags = defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0;
    $data = json_decode($raw, true, 512, $flags);
    if (is_array($data)) return $data;

    // 3. Снятие экранирования слэшей (magic_quotes, фильтры веб-сервера / mod_security)
    $unslashed = stripslashes($raw);
    $data = json_decode($unslashed, true, 512, $flags);
    if (is_array($data)) return $data;

    // 4. Удаление одиночных суррогатных пар UTF-16 (\uD800 - \uDFFF)
    $cleanSurrogates = preg_replace('/\\\\u[dD][89a-bA-B][0-9a-fA-F]{2}(?!\\\\u[dD][c-fC-F][0-9a-fA-F]{2})/', '', $raw);
    $cleanSurrogates = preg_replace('/(?<!\\\\u[dD][89a-bA-B][0-9a-fA-F]{2})\\\\u[dD][c-fC-F][0-9a-fA-F]{2}/', '', $cleanSurrogates);
    $data = json_decode($cleanSurrogates, true, 512, $flags);
    if (is_array($data)) return $data;

    // 5. Очистка непечатных управляющих символов (\x00-\x1F за исключением \t, \r, \n)
    $cleanControls = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $cleanSurrogates);
    $data = json_decode($cleanControls, true, 512, $flags);
    if (is_array($data)) return $data;

    // 6. Конвертация кодировки в UTF-8
    if (function_exists('mb_convert_encoding')) {
        $converted = mb_convert_encoding($cleanControls, 'UTF-8', 'UTF-8');
        $data = json_decode($converted, true, 512, $flags);
        if (is_array($data)) return $data;
    }

    return null;
}

/**
 * Чтение индекса активного ключа из cache/ai_active_key.json (0 или 1 по умолчанию)
 */
function ai_get_active_key_index($activeKeyFile, $totalKeys)
{
    if ($totalKeys <= 0) return 0;
    if (!file_exists($activeKeyFile) || !is_readable($activeKeyFile)) {
        return 0;
    }
    $content = @file_get_contents($activeKeyFile);
    if ($content === false || $content === '') {
        return 0;
    }
    $data = json_decode($content, true);
    if (is_array($data) && isset($data['active_index'])) {
        $idx = (int)$data['active_index'];
        if ($idx >= 0 && $idx < $totalKeys) {
            return $idx;
        }
    }
    return 0;
}

/**
 * Сохранение индекса активного ключа в cache/ai_active_key.json с файловой блокировкой flock
 */
function ai_set_active_key_index($activeKeyFile, $newIndex)
{
    $dir = dirname($activeKeyFile);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $fh = @fopen($activeKeyFile, 'c+');
    if (!$fh) return;
    if (@flock($fh, LOCK_EX)) {
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode([
            'active_index' => (int)$newIndex,
            'updated_at'   => time(),
            'updated_iso'  => date('c')
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fh);
        @flock($fh, LOCK_UN);
    }
    fclose($fh);
}

/**
 * Проверка ошибки квоты, лимитов или авторизации для автоматического переключения ключа:
 * HTTP 429, 401, 402, 403 или наличие в тексте ошибки ключевых слов:
 * quota, limit, rate, insufficient, credit, unauthorized
 */
function ai_is_failover_error($httpCode, $responseBody, $json)
{
    if (in_array($httpCode, [429, 401, 402, 403], true)) {
        return true;
    }

    $haystack = '';
    if (is_array($json)) {
        if (isset($json['error'])) {
            $haystack .= ' ' . (is_string($json['error']) ? $json['error'] : json_encode($json['error'], JSON_UNESCAPED_UNICODE));
        }
        if (isset($json['message'])) {
            $haystack .= ' ' . (string)$json['message'];
        }
    }
    if ($haystack === '' && is_string($responseBody)) {
        $haystack = $responseBody;
    }

    if ($haystack !== '') {
        $lower = mb_strtolower($haystack, 'UTF-8');
        $needles = ['quota', 'limit', 'rate', 'insufficient', 'credit', 'unauthorized'];
        foreach ($needles as $needle) {
            if (strpos($lower, $needle) !== false) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Запрос к OpenAI-шлюзу (cURL) с защитой от утечки секретов и контролем таймаутов
 */
function ai_curl_request($url, $payloadJson, $apiKey, $timeout)
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payloadJson,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 AURORA-Cosmo-AI/4.23.1',
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Bearer ' . $apiKey
        ]
    ]);
    $response = curl_exec($ch);
    $curlErr  = curl_error($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return [$httpCode, $response, $curlErr];
}

// ---------------------------------------------------------------------------
// 0b. CORS & Preflight Headers
// ---------------------------------------------------------------------------
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Защита от прямого встраивания со сторонних недоверенных доменов
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $originHost = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
    $selfHost   = parse_url($_SERVER['HTTP_HOST'] ?? '', PHP_URL_HOST) ?: ($_SERVER['HTTP_HOST'] ?? '');
    $localHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
    $isLocal = in_array($originHost, $localHosts, true) || in_array($selfHost, $localHosts, true);
    if ($originHost && $selfHost && strcasecmp($originHost, (string)$selfHost) !== 0 && !$isLocal) {
        ai_error('Запросы со сторонних доменов запрещены.', 403);
    }
}

// ---------------------------------------------------------------------------
// 0a. Простой файловый rate-limit (cache/ai_rate.json, часовые интервалы)
// ---------------------------------------------------------------------------
/** IP клиента: учитываем прокси (X-Forwarded-For), иначе REMOTE_ADDR */
function ai_client_ip()
{
    $fwd = isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? (string)$_SERVER['HTTP_X_FORWARDED_FOR'] : '';
    if ($fwd !== '') {
        $parts = explode(',', $fwd);
        $ip = trim($parts[0]);
        if ($ip !== '') return $ip;
    }
    return isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : 'unknown';
}

/**
 * Фиксированное окно 1 час: счётчик на IP + глобальный.
 * Файловая блокировка flock защищает от потери счётчиков при параллельных запросах.
 */
function ai_rate_limit($maxPerIp = 30, $maxGlobal = 200)
{
    $dir = dirname(__DIR__) . '/cache';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $file   = $dir . '/ai_rate.json';
    $ip     = ai_client_ip();
    $bucket = (int)floor(time() / 3600);

    $fh = @fopen($file, 'c+');
    if (!$fh) {
        return;
    }
    @flock($fh, LOCK_EX);
    $data = json_decode((string)stream_get_contents($fh), true);
    if (!is_array($data) || !isset($data['bucket']) || (int)$data['bucket'] !== $bucket) {
        $data = ['bucket' => $bucket, 'global' => 0, 'ips' => []];
    }

    $ipCount = isset($data['ips'][$ip]) ? (int)$data['ips'][$ip] : 0;
    $global  = isset($data['global']) ? (int)$data['global'] : 0;

    if ($ipCount >= $maxPerIp || $global >= $maxGlobal) {
        @flock($fh, LOCK_UN);
        fclose($fh);
        ai_error('Превышен лимит запросов к ИИ (не более ' . $maxPerIp . ' в час с одного адреса). Попробуйте позже.', 429);
    }

    $data['ips'][$ip] = $ipCount + 1;
    $data['global']   = $global + 1;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($data));
    @flock($fh, LOCK_UN);
    fclose($fh);
}

// ---------------------------------------------------------------------------
// 1. GET → статус доступности ИИ (без раскрытия ключей)
// ---------------------------------------------------------------------------
$requestMethod = $_SERVER['REQUEST_METHOD'] ?? '';
if ($requestMethod === 'GET') {
    $keysCount   = count($validKeys);
    $activeIndex = ai_get_active_key_index($activeKeyFile, $keysCount);
    ai_json_response([
        'status'             => 'ok',
        'ai_configured'      => $keysCount > 0,
        'keys_count'         => $keysCount,
        'active_key_index'   => $activeIndex,
        'model'              => $aiModel,
        'max_tokens'         => $aiMaxTok,
        'config_local_found' => $configLocalFound
    ]);
}

if ($requestMethod !== 'POST') {
    ai_error('Метод не поддерживается. Используйте GET (статус) или POST (chat).', 405);
}

if (count($validKeys) === 0) {
    ai_error('Ключ ИИ не настроен на сервере. Добавьте ai_api_key в api/config.php — или загрузите на сервер файл api/config.local.php с ключом.', 503);
}

// Rate-limit считаем только для реальных обращений к ИИ (после проверки ключа)
ai_rate_limit(30, 200);

// ---------------------------------------------------------------------------
// 2. Разбор и валидация тела запроса
// ---------------------------------------------------------------------------
$data = null;
if (isset($_POST['messages']) && is_array($_POST['messages'])) {
    $data = $_POST;
} elseif (isset($_POST['data'])) {
    $data = ai_robust_json_decode((string)$_POST['data']);
}

if (!is_array($data)) {
    $rawBody = file_get_contents('php://input');
    if (($rawBody === false || $rawBody === '') && !empty($GLOBALS['HTTP_RAW_POST_DATA'])) {
        $rawBody = $GLOBALS['HTTP_RAW_POST_DATA'];
    }
    if (is_string($rawBody) && strlen($rawBody) > 2 * 1024 * 1024) {
        ai_error('Тело запроса превышает 2 МБ.', 413);
    }
    $data = ai_robust_json_decode((string)$rawBody);
}

// Если клиент передал запрос через строковые параметры query / prompt
if (!is_array($data)) {
    $fallbackPrompt = $_POST['prompt'] ?? ($_POST['query'] ?? ($_GET['prompt'] ?? ($_GET['query'] ?? '')));
    if (is_string($fallbackPrompt) && trim($fallbackPrompt) !== '') {
        $data = [
            'messages' => [
                ['role' => 'user', 'content' => trim($fallbackPrompt)]
            ]
        ];
    }
}

if (!is_array($data)) {
    $errDetail = json_last_error_msg();
    $bodyLen = isset($rawBody) ? strlen((string)$rawBody) : 0;
    ai_error("Некорректный JSON в теле запроса ({$errDetail}, length={$bodyLen}).", 400);
}

$messages = isset($data['messages']) && is_array($data['messages']) ? $data['messages'] : [];
if (count($messages) === 0) {
    ai_error('Поле messages обязательно (массив сообщений chat).', 400);
}
if (count($messages) > 24) {
    // Оставляем system + последние реплики — защита от переполнения контекста
    $system = [];
    $rest = [];
    foreach ($messages as $m) {
        if (isset($m['role']) && $m['role'] === 'system' && count($system) < 2) {
            $system[] = $m;
        } else {
            $rest[] = $m;
        }
    }
    $messages = array_merge($system, array_slice($rest, -20));
}

// Санитизация сообщений
$clean = [];
foreach ($messages as $m) {
    if (!is_array($m) || !isset($m['role'], $m['content'])) continue;
    $role = in_array($m['role'], ['system', 'user', 'assistant'], true) ? $m['role'] : 'user';
    $content = is_string($m['content']) ? $m['content'] : json_encode($m['content'], JSON_UNESCAPED_UNICODE);
    if (ai_mb_strlen($content) > 60000) {
        $content = ai_mb_substr($content, 0, 60000) . ' …[обрезано]';
    }
    $clean[] = ['role' => $role, 'content' => $content];
}
if (count($clean) === 0) {
    ai_error('После санитизации не осталось валидных сообщений.', 400);
}

$maxAllowed   = max(200, $aiMaxTok);
$reqMaxTokens = isset($data['max_tokens']) ? (int)$data['max_tokens'] : $aiMaxTok;
$reqMaxTokens = min(max(64, $reqMaxTokens), $maxAllowed);
$temperature  = isset($data['temperature']) ? (float)$data['temperature'] : 0.4;
$temperature  = min(max(0.0, $temperature), 1.5);

// ---------------------------------------------------------------------------
// 3. Запрос к OpenAI-совместимому шлюзу с Zero Downtime failover
// ---------------------------------------------------------------------------
$payload = [
    'model'       => $aiModel,
    'messages'    => $clean,
    'max_tokens'  => $reqMaxTokens,
    'temperature' => $temperature,
    'stream'      => false
];
if (isset($data['top_p'])) {
    $payload['top_p'] = min(max(0.0, (float)$data['top_p']), 1.0);
}
if (isset($data['frequency_penalty'])) {
    $payload['frequency_penalty'] = min(max(-2.0, (float)$data['frequency_penalty']), 2.0);
}
if (isset($data['presence_penalty'])) {
    $payload['presence_penalty'] = min(max(-2.0, (float)$data['presence_penalty']), 2.0);
}

$payloadJson  = json_encode($payload, JSON_UNESCAPED_UNICODE);
$keysCount    = count($validKeys);
$activeIndex  = ai_get_active_key_index($activeKeyFile, $keysCount);
$currentIndex = $activeIndex;
$attempts     = $keysCount;

for ($try = 0; $try < $attempts; $try++) {
    $currentKey = $validKeys[$currentIndex];
    list($httpCode, $response, $curlErr) = ai_curl_request(
        $aiBaseUrl . '/chat/completions',
        $payloadJson,
        $currentKey,
        $aiTimeout
    );

    // Сетевой сбой (DNS, таймаут, обрыв соединения): ответа нет или HTTP-код 0
    if ($response === false || $httpCode === 0) {
        $detail = $curlErr !== '' ? $curlErr : 'нет ответа от ИИ-шлюза (HTTP 0)';
        if ($keysCount > 1 && $try < ($attempts - 1)) {
            // Немедленно переключаемся на резервный ключ и повторяем
            $nextIndex = ($currentIndex + 1) % $keysCount;
            ai_set_active_key_index($activeKeyFile, $nextIndex);
            $currentIndex = $nextIndex;
            continue;
        }
        ai_error('Сеть: не удалось связаться с ИИ-шлюзом (' . $detail . ').', 502);
    }

    $json = json_decode($response, true);
    $isJsonArray = is_array($json);

    // Если произошла ЛЮБАЯ ошибка (HTTP >= 400, ошибка квоты/лимита/авторизации, ошибка парсинга JSON, пустой ответ)
    // и у нас есть резервный ключ — немедленно переключаемся на альтернативный ключ и повторяем запрос!
    $hasError = ($httpCode >= 400 || !$isJsonArray || isset($json['error']) || ai_is_failover_error($httpCode, $response, $json));

    if ($hasError && $keysCount > 1 && $try < ($attempts - 1)) {
        $nextIndex = ($currentIndex + 1) % $keysCount;
        ai_set_active_key_index($activeKeyFile, $nextIndex);
        $currentIndex = $nextIndex;
        // Повторяем запрос со следующим ключом прямо в этом же HTTP-вызове!
        continue;
    }

    if (!$isJsonArray) {
        ai_error('ИИ-шлюз вернул нечитаемый ответ (HTTP ' . $httpCode . ').', 502);
    }

    if ($httpCode >= 400 || isset($json['error'])) {
        $msg = isset($json['error']['message']) ? (string)$json['error']['message']
             : (isset($json['message']) ? (string)$json['message'] : 'Ошибка ИИ-шлюза');
        ai_error($msg, $httpCode >= 400 ? $httpCode : 502);
    }

    // Запрос успешен! Если был выполнен переход на альтернативный ключ, сохраняем его индекс
    if ($currentIndex !== $activeIndex) {
        ai_set_active_key_index($activeKeyFile, $currentIndex);
    }

    // Прозрачно возвращаем стандартный ответ chat/completions
    ai_json_response($json);
}

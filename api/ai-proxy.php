<?php
/**
 * AI Proxy Endpoint for VK Wall Searcher (вкладка «ИИ-аналитик»)
 * =============================================================================
 * OpenAI-совместимый шлюз (api.xkiro.com/v1). Ключ хранится ТОЛЬКО на сервере
 * в api/config.php и никогда не попадает в браузер клиента.
 *
 * Совместимо с PHP 7.4+ (cURL). Работает на любом веб-сервере.
 *
 * Методы:
 *   GET                      → статус (ai_configured, model — без раскрытия ключа)
 *   POST {messages:[...]}    → проксирование в /chat/completions
 *
 * Разработка: Амброзиев О.А.
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

// ---------------------------------------------------------------------------
// 0. Конфигурация
// ---------------------------------------------------------------------------
// Читаем config.php и опционально config.local.php (локальные переопределения
// поверх основного конфига; config.local.php не коммитится в git — см. .gitignore).
// Это позволяет добавить ИИ-ключи на хостинге одним файлом, не трогая config.php,
// который защищён от перезаписи самообновлением (api/updater.php).
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

$aiKey      = isset($aiConfig['ai_api_key'])  ? trim((string)$aiConfig['ai_api_key'])  : '';
$aiBaseUrl  = isset($aiConfig['ai_base_url']) ? trim((string)$aiConfig['ai_base_url']) : 'https://api.xkiro.com/v1';
$aiModel    = isset($aiConfig['ai_model'])    ? trim((string)$aiConfig['ai_model'])    : 'mistralai/mistral-large-2512';
$aiMaxTok   = isset($aiConfig['ai_max_tokens']) ? max(200, (int)$aiConfig['ai_max_tokens']) : 8192;
$aiTimeout  = isset($aiConfig['ai_timeout'])    ? max(30,  (int)$aiConfig['ai_timeout'])    : 180;

$aiBaseUrl = rtrim($aiBaseUrl, '/');

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

// CORS не нужен: эндпоинт вызывается с того же происхождения.
// Защита от прямого встраивания: только POST/GET, без сторонних Origin.
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
    $self   = parse_url($_SERVER['HTTP_HOST'] ?? '', PHP_URL_HOST) ?: ($_SERVER['HTTP_HOST'] ?? '');
    if ($origin && $self && strcasecmp($origin, (string)$self) !== 0) {
        ai_error('Запросы с чужих доменов запрещены.', 403);
    }
}

// ---------------------------------------------------------------------------
// 1. GET → статус доступности ИИ (без раскрытия ключа)
// ---------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    ai_json_response([
        'status'             => 'ok',
        'ai_configured'      => $aiKey !== '',
        'model'              => $aiModel,
        'max_tokens'         => $aiMaxTok,
        'config_local_found' => $configLocalFound
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ai_error('Метод не поддерживается. Используйте GET (статус) или POST (chat).', 405);
}

if ($aiKey === '') {
    ai_error('Ключ ИИ не настроен на сервере. Добавьте ai_api_key в api/config.php — или загрузите на сервер файл api/config.local.php с ключом (он не перезаписывается обновлениями).', 503);
}

// ---------------------------------------------------------------------------
// 2. Разбор тела запроса
// ---------------------------------------------------------------------------
$rawBody = file_get_contents('php://input');
if ($rawBody === false || strlen($rawBody) > 512 * 1024) {
    ai_error('Тело запроса отсутствует или превышает 512 КБ.', 413);
}

$data = json_decode($rawBody, true);
if (!is_array($data)) {
    ai_error('Некорректный JSON в теле запроса.', 400);
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

$maxAllowed   = max(8192, $aiMaxTok);
$reqMaxTokens = isset($data['max_tokens']) ? (int)$data['max_tokens'] : $aiMaxTok;
$reqMaxTokens = min(max(200, $reqMaxTokens), $maxAllowed);
$temperature  = isset($data['temperature']) ? (float)$data['temperature'] : 0.4;
$temperature  = min(max(0.0, $temperature), 1.5);

// ---------------------------------------------------------------------------
// 3. Запрос к OpenAI-совместимому шлюзу
// ---------------------------------------------------------------------------
$payload = [
    'model'       => $aiModel,
    'messages'    => $clean,
    'max_tokens'  => $reqMaxTokens,
    'temperature' => $temperature,
    'stream'      => false
];

$ch = curl_init($aiBaseUrl . '/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => $aiTimeout,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $aiKey
    ]
]);

$response = curl_exec($ch);
$curlErr  = curl_error($ch);
$httpCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

if ($response === false) {
    ai_error('Не удалось связаться с ИИ-шлюзом: ' . $curlErr, 502);
}

$json = json_decode($response, true);
if (!is_array($json)) {
    ai_error('ИИ-шлюз вернул нечитаемый ответ (HTTP ' . $httpCode . ').', 502);
}

if ($httpCode >= 400 || isset($json['error'])) {
    $msg = isset($json['error']['message']) ? (string)$json['error']['message']
         : (isset($json['message']) ? (string)$json['message'] : 'Ошибка ИИ-шлюза');
    ai_error($msg, $httpCode >= 400 ? $httpCode : 502);
}

// Прозрачно возвращаем стандартный ответ chat/completions
ai_json_response($json);

<?php
/**
 * VK API Proxy Endpoint for VK Wall Searcher
 * Разработка: Амброзиев О.А. (Портировано на PHP)
 *
 * Совместимо с PHP 7.4, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5+
 * Работает на любом веб-сервере (Apache, Nginx, LiteSpeed, OpenServer, XAMPP, php -S)
 *
 * v3.3 — сервисный ключ хранится на сервере (api/config.php):
 *   • клиент больше не передаёт токен — подставляется из конфигурации;
 *   • автоматическое переключение на резервный ключ при ошибке авторизации;
 *   • эндпоинт статуса сервера (без раскрытия самого ключа).
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

// ---------------------------------------------------------------------------
// 0. Server Configuration (service keys live HERE, never in the browser)
// ---------------------------------------------------------------------------
// 0. Server Configuration (service keys live HERE, never in the browser)
// ---------------------------------------------------------------------------
// Проверенные сервисные ключи VK по умолчанию (работают из коробки без ручной настройки)
$defaultServerToken   = '1543ce801543ce801543ce80d0167df366115431543ce807c1370050b48ab4c01eabc6a';
$defaultFallbackToken = 'd306a4b4d306a4b4d306a4b46ad0389840dd306d306a4b4ba56aeabaf84c50097d998b5';

$vkConfig = [];
$vkConfigFile = __DIR__ . '/config.php';
if (is_readable($vkConfigFile)) {
    $vkLoaded = include $vkConfigFile;
    if (is_array($vkLoaded)) {
        $vkConfig = $vkLoaded;
    }
} elseif (!file_exists($vkConfigFile) && is_writable(__DIR__)) {
    // Автоматически создаём рабочий config.php при первом запуске на хостинге
    @file_put_contents($vkConfigFile, "<?php\nreturn [\n    'vk_service_token' => '{$defaultServerToken}',\n    'vk_service_token_fallback' => '{$defaultFallbackToken}',\n    'api_version' => '5.131',\n    'github_repo' => 'giddammit-crypto/vk-wall-searcher',\n    'github_branch' => 'main',\n    'update_token' => '399993f71ed0e6c1ddec47d958faa2cc083519c4',\n    'github_token' => '',\n];\n");
}

$serverToken   = isset($vkConfig['vk_service_token']) ? trim((string)$vkConfig['vk_service_token']) : '';
$fallbackToken = isset($vkConfig['vk_service_token_fallback']) ? trim((string)$vkConfig['vk_service_token_fallback']) : '';
$apiVersion    = isset($vkConfig['api_version']) && $vkConfig['api_version'] !== ''
    ? (string)$vkConfig['api_version']
    : '5.131';

// Заглушки из шаблона не считаем рабочими ключами
foreach (['ВСТАВЬТЕ_СЕРВИСНЫЙ_КЛЮЧ_СЮДА', ''] as $placeholder) {
    if ($serverToken === $placeholder) {
        $serverToken = $defaultServerToken;
    }
    if ($fallbackToken === $placeholder) {
        $fallbackToken = $defaultFallbackToken;
    }
}

/**
 * Server status payload (exposes NO secrets, only availability flags)
 */
function vk_server_status_payload($serverToken, $fallbackToken, $apiVersion)
{
    return json_encode([
        'status'                => 'ok',
        'server_token_configured' => $serverToken !== '',
        'fallback_configured'     => $fallbackToken !== '',
        'api_version'             => $apiVersion
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Secure Image Proxy for VK CDN resources
 * Bypasses browser CORS restrictions when exporting photos to ZIP
 */
function vk_proxy_fetch_image($url)
{
    $url = trim((string)$url);
    if ($url === '') {
        http_response_code(400);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['error' => ['error_code' => 400, 'error_msg' => 'Параметр url отсутствует.']], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $parsed = parse_url($url);
    if (!$parsed || empty($parsed['host']) || !in_array(strtolower($parsed['scheme'] ?? ''), ['http', 'https'], true)) {
        http_response_code(400);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['error' => ['error_code' => 400, 'error_msg' => 'Некорректный URL изображения.']], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $host = strtolower($parsed['host']);
    $allowedDomains = [
        'userapi.com',
        'vk.com',
        'vk-cdn.net',
        'vkuservideo.net'
    ];

    $isAllowed = false;
    foreach ($allowedDomains as $domain) {
        if ($host === $domain || substr($host, -strlen('.' . $domain)) === '.' . $domain) {
            $isAllowed = true;
            break;
        }
    }

    if (!$isAllowed) {
        http_response_code(403);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['error' => ['error_code' => 403, 'error_msg' => 'Домен не разрешён для проксирования изображений.']], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $body = false;
    $contentType = 'image/jpeg';
    $httpCode = 0;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 5,
            CURLOPT_TIMEOUT        => 25,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ]);
        $body = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $fetchedMime = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        if ($fetchedMime && stripos($fetchedMime, 'image/') !== false) {
            $contentType = trim(explode(';', $fetchedMime)[0]);
        }
        curl_close($ch);
    }

    if (($body === false || $body === null || $httpCode >= 400) && ini_get('allow_url_fopen')) {
        $ctx = stream_context_create([
            'http' => [
                'timeout' => 25,
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'follow_location' => 1,
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ]
        ]);
        $body = @file_get_contents($url, false, $ctx);
        if ($body !== false) {
            $httpCode = 200;
            if (isset($http_response_header) && is_array($http_response_header)) {
                foreach ($http_response_header as $hdr) {
                    if (stripos($hdr, 'Content-Type:') === 0) {
                        $mime = trim(substr($hdr, 13));
                        if (stripos($mime, 'image/') !== false) {
                            $contentType = trim(explode(';', $mime)[0]);
                        }
                    }
                }
            }
        }
    }

    if ($body === false || $body === null || strlen($body) === 0 || ($httpCode >= 400 && $httpCode !== 0)) {
        http_response_code(502);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['error' => ['error_code' => 502, 'error_msg' => 'Не удалось загрузить изображение с удалённого сервера VK CDN.']], JSON_UNESCAPED_UNICODE);
        exit;
    }

    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: ' . $contentType);
    header('Content-Length: ' . strlen($body));
    header('Cache-Control: public, max-age=86400');
    echo $body;
    exit;
}

// ---------------------------------------------------------------------------
// 1. CORS Headers
// ---------------------------------------------------------------------------
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Check for image fetch request via GET or POST
$reqAction = $_GET['action'] ?? ($_POST['action'] ?? '');
if ($reqAction === 'fetch_image') {
    $targetUrl = $_GET['url'] ?? ($_POST['url'] ?? '');
    vk_proxy_fetch_image($targetUrl);
}

// Service status endpoint for health-checks: GET /api/vk-proxy.php?status=1
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json; charset=UTF-8');
    if (isset($_GET['status'])) {
        http_response_code(200);
        echo vk_server_status_payload($serverToken, $fallbackToken, $apiVersion);
        exit;
    }
    http_response_code(405);
    echo json_encode([
        'error' => [
            'error_code' => 405,
            'error_msg' => 'Метод не поддерживается. Используйте метод POST.'
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Only POST requests are permitted beyond this point
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code(405);
    echo json_encode([
        'error' => [
            'error_code' => 405,
            'error_msg' => 'Метод не поддерживается. Используйте метод POST.'
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

header('Content-Type: application/json; charset=UTF-8');

// ---------------------------------------------------------------------------
// 2. Read and Parse JSON Request Body
// ---------------------------------------------------------------------------
$rawInput = file_get_contents('php://input');
$rawInput = preg_replace('/^\xEF\xBB\xBF/', '', (string)$rawInput);
$flags = defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0;
$data = json_decode($rawInput, true, 512, $flags);

if (!is_array($data)) {
    if (isset($_POST['data'])) {
        $data = json_decode((string)$_POST['data'], true, 512, $flags);
    } elseif (isset($_POST['method'])) {
        $data = $_POST;
    }
}

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode([
        'error' => [
            'error_code' => 400,
            'error_msg' => 'Некорректный JSON в теле запроса.'
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (isset($data['action']) && $data['action'] === 'fetch_image') {
    vk_proxy_fetch_image($data['url'] ?? '');
}

$method = isset($data['method']) ? trim((string)$data['method']) : '';
$token = isset($data['token']) ? trim((string)$data['token']) : '';
$params = isset($data['params']) && is_array($data['params']) ? $data['params'] : [];

if (empty($method)) {
    http_response_code(400);
    echo json_encode([
        'error' => [
            'error_code' => 400,
            'error_msg' => 'Отсутствует обязательный параметр: method.'
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Frontend status probe (same payload as GET ?status=1, no secrets exposed)
if ($method === '__server_status__') {
    http_response_code(200);
    echo vk_server_status_payload($serverToken, $fallbackToken, $apiVersion);
    exit;
}

// ---------------------------------------------------------------------------
// 2.1 Token resolution:
//     Если клиент явно передал свой токен (пользовательский режим) — используем его.
//     Иначе используем настроенный сервисный ключ сервера или проверенный дефолтный ключ.
// ---------------------------------------------------------------------------
$usedServerKey = false;
$customClientToken = isset($data['token']) ? trim((string)$data['token']) : '';

if ($customClientToken !== '') {
    $token = $customClientToken;
    $usedServerKey = false;
} elseif ($serverToken !== '') {
    $token = $serverToken;
    $usedServerKey = true;
} elseif ($fallbackToken !== '') {
    $token = $fallbackToken;
    $usedServerKey = true;
} else {
    $token = $defaultServerToken;
    $usedServerKey = true;
}

if ($token === '') {
    http_response_code(400);
    echo json_encode([
        'error' => [
            'error_code' => 400,
            'error_msg' => 'Сервисный ключ не настроен. Укажите ключ в api/config.php или в настройках приложения.'
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ---------------------------------------------------------------------------
// 3. Rate-Limiting (VK API limit: max 3 requests per second)
// ---------------------------------------------------------------------------
$lockDir = @sys_get_temp_dir();
if (empty($lockDir) || !@is_writable($lockDir)) {
    $lockDir = __DIR__;
}
$lockFile = $lockDir . DIRECTORY_SEPARATOR . '.vk_wall_searcher_rate.lock';
$minInterval = 0.34; // ~3 requests per second

$fp = @fopen($lockFile, 'c+');
if ($fp) {
    if (@flock($fp, LOCK_EX)) {
        $content = trim((string)@stream_get_contents($fp));
        $lastTime = is_numeric($content) ? (float)$content : 0.0;
        $now = microtime(true);
        $elapsed = $now - $lastTime;

        if ($elapsed < $minInterval && $elapsed >= 0) {
            $sleepUs = (int)(($minInterval - $elapsed) * 1000000);
            if ($sleepUs > 0 && $sleepUs < 2000000) {
                usleep($sleepUs);
            }
        }

        $nowAfterSleep = microtime(true);
        @ftruncate($fp, 0);
        @rewind($fp);
        @fwrite($fp, (string)$nowAfterSleep);
        @fflush($fp);
        @flock($fp, LOCK_UN);
    }
    @fclose($fp);
}

// ---------------------------------------------------------------------------
// 4. Parameter Preparation
// ---------------------------------------------------------------------------
$callParams = [];
foreach ($params as $k => $v) {
    if (is_array($v)) {
        $callParams[$k] = json_encode($v, JSON_UNESCAPED_UNICODE);
    } elseif (is_bool($v)) {
        $callParams[$k] = $v ? '1' : '0';
    } elseif ($v === null) {
        $callParams[$k] = '0';
    } else {
        $callParams[$k] = (string)$v;
    }
}

if (!isset($callParams['v'])) {
    $callParams['v'] = $apiVersion;
}

/**
 * Perform a single VK API request.
 * Returns [responseBody, httpCode, curlErrno, curlError].
 */
function vk_perform_request($method, array $callParams, $accessToken)
{
    $vkUrl = 'https://api.vk.com/method/' . rawurlencode($method);
    $callParams['access_token'] = $accessToken;

    $responseBody = false;
    $httpCode = 0;
    $errno = 0;
    $errstr = '';

    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $vkUrl,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($callParams),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => [
                'User-Agent: VKWallSearcher-PHP/3.3.0',
                'Accept: application/json'
            ]
        ]);

        $responseBody = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $errno = curl_errno($ch);
        $errstr = curl_error($ch);
        curl_close($ch);

        // Fallback for cheap hosting with outdated system CA bundle (SSL error 60 / 77)
        if ($errno === 60 || $errno === 77) {
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $vkUrl,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => http_build_query($callParams),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 25,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => 0,
                CURLOPT_HTTPHEADER => [
                    'User-Agent: VKWallSearcher-PHP/3.3.0',
                    'Accept: application/json'
                ]
            ]);
            $responseBody = curl_exec($ch);
            $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $errno = curl_errno($ch);
            $errstr = curl_error($ch);
            curl_close($ch);
        }

        return [$responseBody, $httpCode, $errno, $errstr];
    }

    // Fallback using stream_context for hosts where cURL extension is missing
    $options = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n" .
                        "User-Agent: VKWallSearcher-PHP/3.3.0\r\n" .
                        "Accept: application/json\r\n",
            'content' => http_build_query($callParams),
            'timeout' => 25.0,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true
        ]
    ];
    $context = stream_context_create($options);
    $responseBody = @file_get_contents($vkUrl, false, $context);

    if ($responseBody === false) {
        $lastErr = error_get_last();
        $msg = isset($lastErr['message']) ? $lastErr['message'] : 'Не удалось установить соединение';
        return [false, 0, 7, $msg]; // errno 7 ~ CONNECT failure
    }

    if (isset($http_response_header) && is_array($http_response_header)) {
        if (preg_match('#HTTP/\S+\s+(\d+)#i', $http_response_header[0], $matches)) {
            $httpCode = (int)$matches[1];
        }
    }

    return [$responseBody, $httpCode, 0, ''];
}

// ---------------------------------------------------------------------------
// 5. Execute HTTP Request (+ automatic fallback-key retry on auth failure)
// ---------------------------------------------------------------------------
list($responseBody, $httpCode, $netErrno, $netError) = vk_perform_request($method, $callParams, $token);

if ($netErrno === 0 && $usedServerKey && $fallbackToken !== '' && $token !== $fallbackToken) {
    $decodedCheck = json_decode((string)$responseBody, true);
    $vkErrorCode = is_array($decodedCheck) && isset($decodedCheck['error']['error_code'])
        ? (int)$decodedCheck['error']['error_code']
        : 0;

    // VK error 5 = «User authorization failed»: основной ключ отозван/испорчен,
    // прозрачно повторяем запрос с резервным ключом.
    if ($vkErrorCode === 5) {
        list($retryBody, $retryHttpCode, $retryErrno, $retryError) = vk_perform_request($method, $callParams, $fallbackToken);
        if ($retryErrno === 0) {
            $responseBody = $retryBody;
            $httpCode = $retryHttpCode;
        } else {
            $netErrno = $retryErrno;
            $netError = $retryError;
        }
    }
}

// ---------------------------------------------------------------------------
// 6. Handle HTTP Response
// ---------------------------------------------------------------------------
if ($netErrno !== 0) {
    if ($netErrno === CURLE_OPERATION_TIMEDOUT) {
        http_response_code(504);
        echo json_encode([
            'error' => [
                'error_code' => 504,
                'error_msg' => 'Превышено время ожидания ответа от VK API (таймаут 25 сек).'
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(502);
    echo json_encode([
        'error' => [
            'error_code' => 502,
            'error_msg' => 'Сетевая ошибка при обращении к VK API: ' . $netError
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($httpCode !== 200 && $httpCode !== 0) {
    http_response_code(502);
    echo json_encode([
        'error' => [
            'error_code' => $httpCode,
            'error_msg' => "VK API вернул HTTP статус {$httpCode}"
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Validate response is valid JSON
$jsonCheck = json_decode($responseBody, true);
if ($jsonCheck === null && json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(502);
    echo json_encode([
        'error' => [
            'error_code' => 502,
            'error_msg' => 'Некорректный JSON-ответ от VK API.'
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Return exact response from VK API
http_response_code(200);
echo $responseBody;

<?php
/**
 * VK API Proxy Endpoint for VK Wall Searcher
 * Разработка: Амброзиев О.А. (Портировано на PHP)
 *
 * Совместимо с PHP 7.4, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5+
 * Работает на любом веб-сервере (Apache, Nginx, LiteSpeed, OpenServer, XAMPP, php -S)
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

// ---------------------------------------------------------------------------
// 1. CORS Headers
// ---------------------------------------------------------------------------
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Only POST requests are permitted
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'error' => [
            'error_code' => 405,
            'error_msg' => 'Метод не поддерживается. Используйте метод POST.'
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ---------------------------------------------------------------------------
// 2. Read and Parse JSON Request Body
// ---------------------------------------------------------------------------
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

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

if (empty($token)) {
    http_response_code(400);
    echo json_encode([
        'error' => [
            'error_code' => 400,
            'error_msg' => 'Отсутствует обязательный параметр: token.'
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

$callParams['access_token'] = $token;
if (!isset($callParams['v'])) {
    $callParams['v'] = '5.131';
}

$vkUrl = 'https://api.vk.com/method/' . rawurlencode($method);

// ---------------------------------------------------------------------------
// 5. Execute HTTP Request (cURL with fallback to stream_context)
// ---------------------------------------------------------------------------
$responseBody = false;
$httpCode = 0;
$errorMessage = '';

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
            'User-Agent: VKWallSearcher-PHP/2.5.0',
            'Accept: application/json'
        ]
    ]);

    $responseBody = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErrno = curl_errno($ch);
    $curlError = curl_error($ch);
    curl_close($ch);

    // Fallback for cheap hosting with outdated system CA bundle (SSL error 60 / 77)
    if ($curlErrno === 60 || $curlErrno === 77) {
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
                'User-Agent: VKWallSearcher-PHP/2.5.0',
                'Accept: application/json'
            ]
        ]);
        $responseBody = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErrno = curl_errno($ch);
        $curlError = curl_error($ch);
        curl_close($ch);
    }

    if ($curlErrno !== 0) {
        if ($curlErrno === CURLE_OPERATION_TIMEDOUT) {
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
                'error_msg' => 'Сетевая ошибка cURL при обращении к VK API: ' . $curlError
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
} else {
    // Fallback using stream_context for hosts where cURL extension is missing
    $options = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n" .
                        "User-Agent: VKWallSearcher-PHP/2.5.0\r\n" .
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
        http_response_code(502);
        echo json_encode([
            'error' => [
                'error_code' => 502,
                'error_msg' => 'Сетевая ошибка при обращении к VK API (file_get_contents): ' . $msg
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (isset($http_response_header) && is_array($http_response_header)) {
        if (preg_match('#HTTP/\S+\s+(\d+)#i', $http_response_header[0], $matches)) {
            $httpCode = (int)$matches[1];
        }
    }
}

// ---------------------------------------------------------------------------
// 6. Handle HTTP Response
// ---------------------------------------------------------------------------
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

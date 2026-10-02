<?php
/**
 * AURORA DESIGN — AI Proxy for xkiro.com
 * Handles CORS preflight and executes server-side cURL with key rotation.
 */

error_reporting(0);
ini_set('display_errors', '0');

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// PHP 7.4 compatibility polyfills (str_starts_with, str_ends_with, str_contains were introduced in PHP 8.0)
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return (string)$needle !== '' && strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}
if (!function_exists('str_ends_with')) {
    function str_ends_with($haystack, $needle) {
        return $needle === '' || $needle === substr($haystack, -strlen($needle));
    }
}
if (!function_exists('str_contains')) {
    function str_contains($haystack, $needle) {
        return $needle !== '' && mb_strpos($haystack, $needle) !== false;
    }
}

// 3 API Keys provided by user
$apiKeys = [
    'sk-xt-17b6c5800266d39cf7a21e9371895f5dafd3dc75db4fa502', // Primary
    'sk-xt-5ab3a53f5cc033e073a36cbcf5ecc5c43130ea1dfce7ddbf', // Fallback 1
    'sk-xt-aac34b4f7773baf2d8fee9d07f8d6050a17c404cda157a89'  // Fallback 2
];

// 100% FREE Tier models on xkiro (0$ / Free API tier - tested & verified)
$defaultModels = [
    'qwen/qwen3.8-max:free',
    'qwen/qwen3.7-max:free',
    'qwen/qwen3.7-plus:free',
    'qwen/qwen3.6-plus:free',
    'qwen/qwen3.7-flash:free',
    'qwen/qwen3.8-omni-flash:free',
    'qwen/qwen3.5-flash:free'
];

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    if (($_GET['action'] ?? '') === 'image_proxy' && !empty($_GET['url'])) {
        $url = filter_var($_GET['url'], FILTER_VALIDATE_URL);
        if ($url) {
            $maxRetries = 3;
            $currentUrl = $url;
            $data = false;
            $contentType = 'image/jpeg';
            
            for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                $ch = curl_init($currentUrl);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_TIMEOUT => 40,
                    CURLOPT_SSL_VERIFYPEER => false,
                    CURLOPT_SSL_VERIFYHOST => false,
                    CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 AuroraDesign/5.2.4'
                ]);
                $data = curl_exec($ch);
                $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/jpeg';
                $httpCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
                curl_close($ch);
                
                // If response is valid image (not JSON error like 429/500 and not HTML)
                if ($data !== false && $httpCode >= 200 && $httpCode < 300 && !str_starts_with(trim($data), '{') && !str_starts_with(trim($data), '<!doctype') && !str_starts_with(trim($data), '<html')) {
                    header('Content-Type: ' . $contentType);
                    header('Cache-Control: public, max-age=86400');
                    echo $data;
                    exit;
                }
                
                // If failed or rate limited, rotate seed and try free fallback model (flux-realism -> flux -> turbo)
                $newSeed = rand(100000, 9999999);
                $fallbackFreeModels = ['flux-realism', 'flux', 'turbo'];
                $nextModel = $fallbackFreeModels[$attempt % count($fallbackFreeModels)];
                $currentUrl = preg_replace('/model=[a-zA-Z0-9_-]+/', 'model=' . $nextModel, $url);
                $currentUrl = preg_replace('/seed=\d+/', 'seed=' . $newSeed, $currentUrl);
                if (!str_contains($currentUrl, 'seed=')) {
                    $currentUrl .= '&seed=' . $newSeed;
                }
                usleep(400000); // 400ms delay between retries
            }
        }
        http_response_code(502);
        echo json_encode(['error' => 'Failed to proxy free image after retries']);
        exit;
    }

    if (($_GET['action'] ?? '') === 'token_quota') {
        $quotaFile = dirname(__DIR__, 2) . '/cache/ai_poster_quota.json';
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $ip = trim(explode(',', $ip)[0]);
        $quotaData = ['used' => 0, 'limit' => 2000000, 'resetAt' => time() + 86400];
        if (is_file($quotaFile)) {
            $raw = @file_get_contents($quotaFile);
            $parsed = json_decode($raw, true);
            if (is_array($parsed) && isset($parsed[$ip])) {
                $userQ = $parsed[$ip];
                if (time() < ($userQ['resetAt'] ?? 0)) {
                    $quotaData['used'] = (int)($userQ['used'] ?? 0);
                    $quotaData['limit'] = (int)($userQ['limit'] ?? 2000000);
                    $quotaData['resetAt'] = (int)($userQ['resetAt'] ?? (time() + 86400));
                }
            }
        }
        header('Content-Type: application/json');
        echo json_encode($quotaData);
        exit;
    }

    echo json_encode([
        'status' => 'ok',
        'service' => 'Aurora AI Proxy (100% Free Tier)',
        'keys_count' => count($apiKeys),
        'free_models' => $defaultModels
    ]);
    exit;
}

// TASK 5.1: Серверный учет лимитов и защита от сброса через localStorage
$clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
$clientIp = trim(explode(',', $clientIp)[0]);
$cacheDir = dirname(__DIR__, 2) . '/cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}
$quotaFilePath = $cacheDir . '/ai_poster_quota.json';

// Проверка и блокировка лимита
$fp = @fopen($quotaFilePath, 'c+');
$userUsedTokens = 0;
$userLimit = 2000000;
$userResetAt = time() + 86400;

if ($fp && flock($fp, LOCK_EX)) {
    $fSize = filesize($quotaFilePath);
    $content = $fSize > 0 ? fread($fp, $fSize) : '';
    $allQuotas = json_decode($content, true) ?: [];

    if (isset($allQuotas[$clientIp])) {
        $u = $allQuotas[$clientIp];
        if (time() >= ($u['resetAt'] ?? 0)) {
            // Новый 24-часовой цикл
            $allQuotas[$clientIp] = [
                'used' => 0,
                'limit' => $userLimit,
                'resetAt' => time() + 86400
            ];
        } else {
            $userUsedTokens = (int)($u['used'] ?? 0);
            $userLimit = (int)($u['limit'] ?? $userLimit);
            $userResetAt = (int)($u['resetAt'] ?? $userResetAt);
        }
    } else {
        $allQuotas[$clientIp] = [
            'used' => 0,
            'limit' => $userLimit,
            'resetAt' => time() + 86400
        ];
    }

    if ($userUsedTokens >= $userLimit) {
        flock($fp, LOCK_UN);
        fclose($fp);
        http_response_code(429);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => [
                'message' => 'Превышен суточный лимит 2 000 000 токенов (Server Rate Limit). Сброс через ' . max(1, ceil(($userResetAt - time()) / 3600)) . ' ч.',
                'code' => 429,
                'resetAt' => $userResetAt * 1000
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    flock($fp, LOCK_UN);
    fclose($fp);
}

$rawInput = file_get_contents('php://input');
$requestData = json_decode($rawInput, true);

if (!is_array($requestData) || empty($requestData['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Invalid JSON or missing messages array']]);
    exit;
}

// Ensure requested model is strictly FREE
$requestedModel = !empty($requestData['model']) ? trim($requestData['model']) : 'qwen/qwen3.8-max:free';
if (!str_ends_with($requestedModel, ':free')) {
    $requestedModel .= ':free';
}

// Build free models list to try: requested model first, then fallbacks
$modelsToTry = [$requestedModel];
foreach ($defaultModels as $dm) {
    if (!in_array($dm, $modelsToTry, true)) {
        $modelsToTry[] = $dm;
    }
}

$lastError = 'Unknown error';
$lastHttpCode = 500;
$successfulResponse = null;

// Iterate through models and keys
foreach ($modelsToTry as $mIdx => $modelName) {
    $requestData['model'] = $modelName;
    $payloadJson = json_encode($requestData, JSON_UNESCAPED_UNICODE);

    foreach ($apiKeys as $kIdx => $key) {
        $ch = curl_init('https://api.xkiro.com/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payloadJson,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 35,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 AuroraDesign/5.1.0',
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Bearer ' . $key
            ]
        ]);

        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($response === false || $httpCode === 0) {
            $lastError = 'Connection failed: ' . ($curlErr ?: 'HTTP 0');
            $lastHttpCode = 502;
            continue; // try next key
        }

        $parsed = json_decode($response, true);
        if ($httpCode >= 200 && $httpCode < 300 && is_array($parsed) && !isset($parsed['error'])) {
            $successfulResponse = $parsed;
            break 2; // Success! Exit both loops
        }

        $errMsg = $parsed['error']['message'] ?? ($parsed['message'] ?? "HTTP $httpCode");
        $lastError = "Model $modelName (Key " . ($kIdx + 1) . "): $errMsg";
        $lastHttpCode = $httpCode >= 400 ? $httpCode : 500;

        // If error is 500 (like minimax internal error), don't waste other keys on the same dead model, switch model immediately
        if ($httpCode >= 500) {
            break; // next model
        }
    }
}

if ($successfulResponse !== null) {
    // TASK 5.1: Обновляем использованные токены в серверном кэше
    $tokensUsed = (int)($successfulResponse['usage']['total_tokens'] ?? 3000);
    $fp = @fopen($quotaFilePath, 'c+');
    if ($fp && flock($fp, LOCK_EX)) {
        $fSize = filesize($quotaFilePath);
        $content = $fSize > 0 ? fread($fp, $fSize) : '';
        $allQuotas = json_decode($content, true) ?: [];
        $cur = $allQuotas[$clientIp] ?? ['used' => 0, 'limit' => 2000000, 'resetAt' => time() + 86400];
        $cur['used'] = (int)($cur['used'] ?? 0) + $tokensUsed;
        $allQuotas[$clientIp] = $cur;
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($allQuotas, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        flock($fp, LOCK_UN);
        fclose($fp);
    }

    http_response_code(200);
    echo json_encode($successfulResponse, JSON_UNESCAPED_UNICODE);
} else {
    http_response_code($lastHttpCode);
    echo json_encode([
        'error' => [
            'message' => $lastError,
            'code' => $lastHttpCode
        ]
    ], JSON_UNESCAPED_UNICODE);
}

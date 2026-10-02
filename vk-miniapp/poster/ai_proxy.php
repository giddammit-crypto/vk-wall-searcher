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

// Load API keys securely from environment or server config
$apiKeys = [];
$envKeys = getenv('XKIRO_KEYS');
if (!empty($envKeys)) {
    $apiKeys = array_values(array_filter(array_map('trim', explode(',', $envKeys))));
}
if (empty($apiKeys)) {
    // 1. Try local private key file first (chmod 600, not committed)
    $localKeyFile = __DIR__ . '/.ai_keys.php';
    if (is_file($localKeyFile)) {
        $keysFromLocal = include $localKeyFile;
        if (is_array($keysFromLocal)) {
            $apiKeys = array_merge($apiKeys, $keysFromLocal);
        }
    }
    // 2. Try server config files
    $candidateConfigs = [
        dirname(__DIR__, 2) . '/api/config.local.php',
        dirname(__DIR__, 2) . '/api/config.php',
        dirname(__DIR__, 3) . '/api/config.local.php',
        dirname(__DIR__, 3) . '/api/config.php'
    ];
    foreach ($candidateConfigs as $cfgFile) {
        if (is_file($cfgFile)) {
            $cfg = include $cfgFile;
            if (is_array($cfg)) {
                if (!empty($cfg['ai_api_keys']) && is_array($cfg['ai_api_keys'])) {
                    $apiKeys = array_merge($apiKeys, $cfg['ai_api_keys']);
                }
                if (!empty($cfg['ai_api_key'])) {
                    $apiKeys[] = $cfg['ai_api_key'];
                }
                if (!empty($cfg['ai_api_key_fallback'])) {
                    $apiKeys[] = $cfg['ai_api_key_fallback'];
                }
                if (!empty($cfg['ai_api_key_fallback_2'])) {
                    $apiKeys[] = $cfg['ai_api_key_fallback_2'];
                }
                if (!empty($cfg['ai_api_key_fallback_3'])) {
                    $apiKeys[] = $cfg['ai_api_key_fallback_3'];
                }
            }
        }
    }
}
$apiKeys = array_values(array_unique(array_filter($apiKeys)));

// SSRF target validation
function is_safe_proxy_target($targetUrl) {
    if (empty($targetUrl) || !is_string($targetUrl)) return false;
    $parsed = parse_url($targetUrl);
    if (!$parsed || empty($parsed['scheme']) || empty($parsed['host'])) return false;
    
    // Only HTTPS allowed
    if (strtolower($parsed['scheme']) !== 'https') return false;
    
    $host = strtolower($parsed['host']);
    if ($host === 'localhost' || str_ends_with($host, '.localhost') || str_ends_with($host, '.local') || str_ends_with($host, '.internal')) {
        return false;
    }
    
    // Resolve DNS to verify IP
    $ips = @dns_get_record($host, DNS_A + DNS_AAAA);
    $resolvedIps = [];
    if (!empty($ips)) {
        foreach ($ips as $rec) {
            if (!empty($rec['ip'])) $resolvedIps[] = $rec['ip'];
            if (!empty($rec['ipv6'])) $resolvedIps[] = $rec['ipv6'];
        }
    }
    if (empty($resolvedIps)) {
        $ip = @gethostbyname($host);
        if ($ip && $ip !== $host) {
            $resolvedIps[] = $ip;
        }
    }
    
    if (empty($resolvedIps)) {
        return false;
    }
    
    foreach ($resolvedIps as $ip) {
        // Reject private, loopback, link-local, and reserved ranges
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return false;
        }
        if ($ip === '127.0.0.1' || $ip === '::1' || str_starts_with($ip, '169.254.') || str_starts_with($ip, '10.') || str_starts_with($ip, '192.168.')) {
            return false;
        }
    }
    return true;
}

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
        $rawUrl = (string)$_GET['url'];
        if (!is_safe_proxy_target($rawUrl)) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'URL blocked by security / SSRF policy']);
            exit;
        }
        $url = filter_var($rawUrl, FILTER_VALIDATE_URL);
        if ($url) {
            $maxRetries = 3;
            $currentUrl = $url;
            $data = false;
            $contentType = 'image/jpeg';
            
            for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                if (!is_safe_proxy_target($currentUrl)) break;
                
                $ch = curl_init($currentUrl);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_MAXREDIRS => 3,
                    CURLOPT_TIMEOUT => 30,
                    CURLOPT_CONNECTTIMEOUT => 10,
                    CURLOPT_SSL_VERIFYPEER => true,
                    CURLOPT_SSL_VERIFYHOST => 2,
                    CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 AuroraDesign/5.7.1',
                    CURLOPT_NOPROGRESS => false,
                    CURLOPT_PROGRESSFUNCTION => function($downloadSize, $downloaded, $uploadSize, $uploaded) {
                        if ($downloaded > 10485760) return 1; // max 10MB
                        return 0;
                    }
                ]);
                $data = curl_exec($ch);
                $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/jpeg';
                $httpCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
                curl_close($ch);
                
                // If response is valid image (must have image/* content type and not HTML or JSON)
                if ($data !== false && $httpCode >= 200 && $httpCode < 300 && str_starts_with(strtolower($contentType), 'image/') && !str_starts_with(trim($data), '{') && !str_starts_with(trim($data), '<!doctype') && !str_starts_with(trim($data), '<html')) {
                    header('Content-Type: ' . $contentType);
                    header('Cache-Control: public, max-age=86400');
                    header('X-Content-Type-Options: nosniff');
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
                usleep(300000); // 300ms delay between retries
            }
        }
        http_response_code(502);
        header('Content-Type: application/json');
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

    if (($_GET['action'] ?? '') === 'remove_bg') {
        // Health check for rembg endpoint
        $rembgHost = getenv('REMBG_API_URL') ?: 'http://127.0.0.1:8000';
        $ch = curl_init(rtrim($rembgHost, '/') . '/health');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 3,
            CURLOPT_CONNECTTIMEOUT => 2
        ]);
        $hRes = curl_exec($ch);
        $hCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        header('Content-Type: application/json');
        if ($hCode >= 200 && $hCode < 300) {
            http_response_code(200);
            echo $hRes ?: json_encode(['status' => 'ok', 'service' => 'rembg']);
        } else {
            // Standalone status if rembg microservice is not running
            http_response_code(200);
            echo json_encode([
                'status' => 'available',
                'service' => 'aurora-proxy-rembg',
                'upstream' => 'offline',
                'notice' => 'Configure REMBG_API_URL to proxy to external python rembg instance.'
            ]);
        }
        exit;
    }

    echo json_encode([
        'status' => 'ok',
        'service' => 'Aurora AI Proxy (100% Free Tier)',
        'free_models' => $defaultModels
    ]);
    exit;
}

// Handle remove_bg POST request
if (($_GET['action'] ?? '') === 'remove_bg' || (isset($_POST['action']) && $_POST['action'] === 'remove_bg')) {
    $rembgHost = getenv('REMBG_API_URL') ?: 'http://127.0.0.1:8000';
    $targetUrl = rtrim($rembgHost, '/') . '/remove-bg';

    $tempFilePath = null;
    $postFields = [
        'alpha_matting' => $_POST['alpha_matting'] ?? 'false',
        'foreground_threshold' => $_POST['foreground_threshold'] ?? '240',
        'background_threshold' => $_POST['background_threshold'] ?? '10',
        'erode_size' => $_POST['erode_size'] ?? '10'
    ];

    if (!empty($_FILES['file']['tmp_name']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
        $cfile = new CURLFile($_FILES['file']['tmp_name'], $_FILES['file']['type'] ?: 'image/png', $_FILES['file']['name'] ?: 'image.png');
        $postFields['file'] = $cfile;
    } else {
        // Try reading raw body or json base64 image
        $raw = file_get_contents('php://input');
        $imgData = null;
        if (!empty($raw)) {
            $parsed = json_decode($raw, true);
            if (!empty($parsed['image'])) {
                $base64 = $parsed['image'];
                if (preg_match('/^data:image\/(\w+);base64,/', $base64, $m)) {
                    $base64 = substr($base64, strpos($base64, ',') + 1);
                }
                $imgData = base64_decode($base64);
                if (!empty($parsed['alpha_matting'])) $postFields['alpha_matting'] = (string)$parsed['alpha_matting'];
                if (!empty($parsed['foreground_threshold'])) $postFields['foreground_threshold'] = (string)$parsed['foreground_threshold'];
                if (!empty($parsed['background_threshold'])) $postFields['background_threshold'] = (string)$parsed['background_threshold'];
                if (!empty($parsed['erode_size'])) $postFields['erode_size'] = (string)$parsed['erode_size'];
            } elseif (str_starts_with($raw, "\x89PNG") || str_starts_with($raw, "\xFF\xD8\xFF")) {
                $imgData = $raw;
            }
        }

        if ($imgData !== null && strlen($imgData) > 0) {
            $tempFilePath = tempnam(sys_get_temp_dir(), 'rembg_');
            file_put_contents($tempFilePath, $imgData);
            $postFields['file'] = new CURLFile($tempFilePath, 'image/png', 'image.png');
        }
    }

    if (empty($postFields['file'])) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => ['message' => 'No image file or base64 data provided']]);
        exit;
    }

    // Proxy request to rembg service
    $ch = curl_init($targetUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postFields,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 5
    ]);
    $result = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($tempFilePath && file_exists($tempFilePath)) {
        @unlink($tempFilePath);
    }

    if ($result !== false && $httpCode >= 200 && $httpCode < 300) {
        header('Content-Type: ' . ($contentType ?: 'image/png'));
        echo $result;
        exit;
    }

    http_response_code($httpCode >= 400 ? $httpCode : 503);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => [
            'message' => 'rembg service unavailable: ' . ($curlErr ?: "HTTP $httpCode"),
            'detail' => 'Ensure rembg service is running on ' . $rembgHost . ' or set REMBG_API_URL'
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Only POST requests are allowed for AI chat completions
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => ['message' => 'Method Not Allowed']]);
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

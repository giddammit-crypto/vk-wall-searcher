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

header('Content-Type: application/json; charset=UTF-8');

// 3 API Keys provided by user
$apiKeys = [
    'sk-xt-17b6c5800266d39cf7a21e9371895f5dafd3dc75db4fa502', // Primary
    'sk-xt-5ab3a53f5cc033e073a36cbcf5ecc5c43130ea1dfce7ddbf', // Fallback 1
    'sk-xt-aac34b4f7773baf2d8fee9d07f8d6050a17c404cda157a89'  // Fallback 2
];

// Fallback models on xkiro
$defaultModels = [
    'minimax/minimax-m3:free',
    'qwen/qwen3.6-35b-a3b:free',
    'qwen/qwen3.5-397b-a17b:free'
];

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    echo json_encode([
        'status' => 'ok',
        'service' => 'Aurora AI Proxy',
        'keys_count' => count($apiKeys),
        'models' => $defaultModels
    ]);
    exit;
}

$rawInput = file_get_contents('php://input');
$requestData = json_decode($rawInput, true);

if (!is_array($requestData) || empty($requestData['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Invalid JSON or missing messages array']]);
    exit;
}

$requestedModel = !empty($requestData['model']) ? trim($requestData['model']) : 'minimax/minimax-m3:free';

// Build models list to try: requested model first, then fallbacks
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

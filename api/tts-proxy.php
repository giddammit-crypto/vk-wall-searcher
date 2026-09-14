<?php
/**
 * ElevenLabs TTS Proxy Endpoint for VK Wall Searcher (Космо SMM-аналитик)
 * =============================================================================
 * Синтезирует динамическую речь робота Космо с кэшированием на диск.
 *
 * Совместимо с PHP 7.4+ (cURL).
 *
 * Методы:
 *   GET                    → статус (tts_configured)
 *   POST {text, cache_key} → генерация MP3 с pitch-shift (+24%) или отдача из кэша
 *
 * Разработка: Амброзиев О.А.
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

try {

// ---------------------------------------------------------------------------
// 1. Конфигурация
// ---------------------------------------------------------------------------
$ttsConfig = [];
foreach ([__DIR__ . '/config.php', __DIR__ . '/config.local.php'] as $cfgFile) {
    if (is_readable($cfgFile)) {
        $loaded = include $cfgFile;
        if (is_array($loaded)) {
            $ttsConfig = array_merge($ttsConfig, $loaded);
        }
    }
}

$apiKey  = isset($ttsConfig['elevenlabs_api_key'])  ? trim((string)$ttsConfig['elevenlabs_api_key'])  : '';
$voiceId = isset($ttsConfig['elevenlabs_voice_id']) ? trim((string)$ttsConfig['elevenlabs_voice_id']) : 'EXAVITQu4vr4xnSDxMaL';
$modelId = isset($ttsConfig['elevenlabs_model'])    ? trim((string)$ttsConfig['elevenlabs_model'])    : 'eleven_multilingual_v2';

function tts_json_response($payload, $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function tts_error($msg, $code = 400, $extra = [])
{
    tts_json_response(array_merge(['error' => ['error_code' => $code, 'error_msg' => $msg]], $extra), $code);
}

// ---------------------------------------------------------------------------
// 2. GET-запрос: статус сервиса
// ---------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    tts_json_response([
        'status'         => 'ok',
        'tts_configured' => !empty($apiKey),
        'voice_id'       => $voiceId,
        'model_id'       => $modelId,
    ]);
}

// ---------------------------------------------------------------------------
// 3. POST-запрос: синтез речи
// ---------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    tts_error('Метод не поддерживается. Используйте POST.', 405);
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    tts_error('Некорректный JSON в теле запроса.', 400);
}

$text = isset($data['text']) ? trim((string)$data['text']) : '';
$cacheKey = isset($data['cache_key']) ? trim((string)$data['cache_key']) : '';

if (empty($text)) {
    tts_error('Параметр "text" обязателен для озвучивания.', 400);
}

function tts_mb_strlen($s)
{
    if (function_exists('mb_strlen')) return mb_strlen($s, 'UTF-8');
    return function_exists('iconv_strlen') ? (int)iconv_strlen($s, 'UTF-8') : strlen($s);
}
function tts_mb_substr($s, $start, $len)
{
    if (function_exists('mb_substr')) return mb_substr($s, $start, $len, 'UTF-8');
    if (function_exists('iconv_substr')) {
        $r = iconv_substr($s, $start, $len, 'UTF-8');
        return $r === false ? '' : $r;
    }
    return substr($s, $start, $len);
}

// Очищаем текст от markdown-тегов и эмодзи перед отправкой в ElevenLabs
$speechText = preg_replace('/[#*_`~]/u', '', $text);
$speechText = preg_replace('/[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{1F1E0}-\x{1F1FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}\x{FE00}-\x{FE0F}\x{1F900}-\x{1F9FF}]/u', '', $speechText);
$speechText = trim(preg_replace('/\s+/u', ' ', $speechText));

if (empty($speechText)) {
    $speechText = 'Тройка лидеров определена! Поздравляем победителей!';
}

// Ограничение длины текста для разумной экономии квот (до 450 символов)
if (tts_mb_strlen($speechText) > 450) {
    $speechText = tts_mb_substr($speechText, 0, 445) . '...';
}

// ---------------------------------------------------------------------------
// 4. Проверка дискового кэша
// ---------------------------------------------------------------------------
$cacheDir = dirname(__DIR__) . '/cache/tts';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}

// Хэш для кэширования: учитывает ключ кэша или текст + голос
$seed = !empty($cacheKey) ? $cacheKey : $speechText;
$fileHash = md5($seed . '_' . $voiceId . '_pitch1.24');
$cacheFilePath = $cacheDir . '/' . $fileHash . '.mp3';
$publicUrl = 'cache/tts/' . $fileHash . '.mp3';

if (file_exists($cacheFilePath) && filesize($cacheFilePath) > 1024) {
    tts_json_response([
        'status'    => 'success',
        'success'   => true,
        'audio_url' => $publicUrl,
        'cached'    => true,
        'hash'      => $fileHash
    ]);
}

// Если кэша нет, проверяем наличие API ключа
if (empty($apiKey)) {
    tts_error('API-ключ ElevenLabs не настроен на сервере.', 503);
}

// ---------------------------------------------------------------------------
// 5. Запрос к ElevenLabs API
// ---------------------------------------------------------------------------
$apiUrl = "https://api.elevenlabs.io/v1/text-to-speech/{$voiceId}?output_format=mp3_44100_128";

$payload = json_encode([
    'text'           => $speechText,
    'model_id'       => $modelId,
    'voice_settings' => [
        'stability'         => 0.38,
        'similarity_boost'  => 0.85,
        'style'             => 0.45,
        'use_speaker_boost' => true
    ]
], JSON_UNESCAPED_UNICODE | (defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0));

if ($payload === false) {
    $safeText = iconv('UTF-8', 'UTF-8//IGNORE', $speechText);
    $payload = json_encode([
        'text'           => $safeText ?: 'Лидеры определены!',
        'model_id'       => $modelId,
        'voice_settings' => [
            'stability'         => 0.38,
            'similarity_boost'  => 0.85,
            'style'             => 0.45,
            'use_speaker_boost' => true
        ]
    ]);
}

$ch = curl_init($apiUrl);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 35,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'xi-api-key: ' . $apiKey,
        'Accept: audio/mpeg'
    ]
]);

$audioData = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    tts_error('Сбой сети при запросе к ElevenLabs: ' . $curlError, 502);
}

if ($httpCode !== 200) {
    $errJson = json_decode($audioData, true);
    $errDetail = isset($errJson['detail']['message']) ? $errJson['detail']['message'] : (is_string($audioData) ? substr($audioData, 0, 150) : "HTTP {$httpCode}");
    tts_error('Ошибка ElevenLabs API: ' . $errDetail, 502);
}

// Временный файл для обработки
$tmpRaw = tempnam(sys_get_temp_dir(), 'eleven_raw_') . '.mp3';
file_put_contents($tmpRaw, $audioData);

// ---------------------------------------------------------------------------
// 6. Pitch Shift (+24%) через ffmpeg для звонкого мультяшного тембра Космо
// ---------------------------------------------------------------------------
$ffmpegCmd = "ffmpeg -y -i " . escapeshellarg($tmpRaw) . " -filter:a \"asetrate=44100*1.24,atempo=1/1.24\" " . escapeshellarg($cacheFilePath) . " 2>&1";
$execOutput = [];
$execRet = 0;
@exec($ffmpegCmd, $execOutput, $execRet);

@unlink($tmpRaw);

if ($execRet !== 0 || !file_exists($cacheFilePath) || filesize($cacheFilePath) < 1024) {
    // Если ffmpeg недоступен или выдал ошибку, сохраняем исходный raw звук
    file_put_contents($cacheFilePath, $audioData);
}

    tts_json_response([
        'status'    => 'success',
        'success'   => true,
        'audio_url' => $publicUrl,
        'cached'    => false,
        'hash'      => $fileHash
    ]);
} catch (Throwable $e) {
    tts_error('Исключение на сервере: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine(), 500);
}

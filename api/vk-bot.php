<?php
/**
 * =============================================================================
 *  Чат-бот «Космо» для сообщества ВКонтакте (VK Callback API)
 * =============================================================================
 *
 *  Позволяет читателям общаться с роботом Космо в личных сообщениях группы:
 *    - Моментальный ответ Callback API (HTTP 200 "ok" за < 30 мс)
 *    - Индикатор «Космо печатает...» в диалоге ВКонтакте
 *    - Персональный книжный сомелье с мультидиалоговой памятью (cache/vk_dialog_*.json)
 *    - Строгий запрет на авторов-иноагентов Минюста РФ и экстремистов
 *    - Отказоустойчивый шлюз ИИ с 4-ключевой ротацией (3 000 000 токенов/24ч xkiro)
 *    - Распознавание голосовых сообщений: нативное нейрораспознавание VK ASR + Google Speech API v2
 *    - Авто-модерация бесед: мат и вульгарные/непристойные картинки через Vision AI (3 варна -> 15м -> 1ч -> кик)
 *    - 17 фирменных эмоций-стикеров Космо
 *    - Интерактивная клавиатура (постоянное меню + inline-кнопки)
 *    - Диагностическая веб-страница и JSON-статус при GET-запросе
 *
 *  Версия: 4.42.1
 *  Разработка: Амброзиев О.А. / Проект AURORA
 * =============================================================================
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');
date_default_timezone_set('Europe/Moscow');

// Разрешаем скрипту работать после закрытия HTTP-соединения
ignore_user_abort(true);
set_time_limit(180);
define('VK_BOT_LOADED', true);

// -----------------------------------------------------------------------------
// 1. Полифиллы и вспомогательные функции
// -----------------------------------------------------------------------------
if (!function_exists('mb_strlen')) {
    function mb_strlen($string, $encoding = 'UTF-8') {
        if (function_exists('iconv_strlen')) {
            $len = @iconv_strlen((string)$string, $encoding);
            if ($len !== false) return $len;
        }
        // В UTF-8 каждый символ имеет ровно один байт вне диапазона 0x80-0xBF
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
        return strpos((string)$haystack, (string)$needle, $offset);
    }
}
if (!function_exists('mb_stripos')) {
    function mb_stripos($haystack, $needle, $offset = 0, $encoding = 'UTF-8') {
        $h = mb_strtolower((string)$haystack, $encoding);
        $n = mb_strtolower((string)$needle, $encoding);
        return mb_strpos($h, $n, $offset, $encoding);
    }
}
if (!defined('MB_CASE_UPPER')) define('MB_CASE_UPPER', 0);
if (!defined('MB_CASE_LOWER')) define('MB_CASE_LOWER', 1);
if (!defined('MB_CASE_TITLE')) define('MB_CASE_TITLE', 2);

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
    function mb_convert_case($string, $mode = MB_CASE_TITLE, $encoding = 'UTF-8') {
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

if (!function_exists('vk_bot_mb_strlen')) {
    function vk_bot_mb_strlen($s)
    {
        return mb_strlen($s, 'UTF-8');
    }
    function vk_bot_mb_substr($s, $start, $len)
    {
        return mb_substr($s, $start, $len, 'UTF-8');
    }
    function vk_bot_mb_strtolower($s)
    {
        return mb_strtolower($s, 'UTF-8');
    }
}

/**
 * Сверхнадёжный парсер JSON
 */
function vk_bot_json_decode($raw)
{
    if (!is_string($raw) || trim($raw) === '') return null;
    $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw);
    $flags = defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0;
    $data = json_decode($raw, true, 512, $flags);
    if (is_array($data)) return $data;

    $unslashed = stripslashes($raw);
    $data = json_decode($unslashed, true, 512, $flags);
    if (is_array($data)) return $data;

    $cleanSurrogates = preg_replace('/\\\\u[dD][89a-bA-B][0-9a-fA-F]{2}(?!\\\\u[dD][c-fC-F][0-9a-fA-F]{2})/', '', $raw);
    $cleanSurrogates = preg_replace('/(?<!\\\\u[dD][89a-bA-B][0-9a-fA-F]{2})\\\\u[dD][c-fC-F][0-9a-fA-F]{2}/', '', $cleanSurrogates);
    $cleanControls = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $cleanSurrogates);
    $data = json_decode($cleanControls, true, 512, $flags);
    if (is_array($data)) return $data;

    return null;
}

// -----------------------------------------------------------------------------
// 2. Загрузка конфигурации
// -----------------------------------------------------------------------------
$config = [];
foreach ([__DIR__ . '/config.php', __DIR__ . '/config.local.php'] as $cfgFile) {
    if (is_readable($cfgFile)) {
        $loaded = include $cfgFile;
        if (is_array($loaded)) {
            $config = array_merge($config, $loaded);
        }
    }
}

// Встроенные параметры сообщества (по умолчанию для https://vk.ru/club241534292)
$defaultCommunityToken   = 'vk1.a.ju2kZ7qPSBnKqy9r_GkNCyhr5F2WwC7SkVYYU_921TAAk7qu5svlGo7HMXcgbLBsh3qyHhuYmll8BSA0UHeVkn95rLjUVbGzWNDP3huyHqugUophS3it44EOY1o9Ov5iNh-y_iOpZ6l5WKgBwMtozY8qBZoLRpbiLjd7akbL3MELkkisZQPkFG8v1HnGMRsNaosd5YHSXRx7y8F0bFK1Pg';
$defaultConfirmationCode = 'd78ee50f';
$defaultGroupId          = 241534292;
$defaultGroupUrl         = 'https://vk.ru/club241534292';

$communityToken   = trim((string)($config['vk_community_token'] ?? ''));
if ($communityToken === '' || strpos($communityToken, 'ВСТАВЬТЕ') === 0) {
    $communityToken = $defaultCommunityToken;
}

$serviceToken     = trim((string)($config['vk_service_token'] ?? ''));
if ($serviceToken === '' || strpos($serviceToken, 'ВСТАВЬТЕ') === 0) {
    $serviceToken = '1543ce801543ce801543ce80d0167df366115431543ce807c1370050b48ab4c01eabc6a';
}

$serviceTokenFallback = trim((string)($config['vk_service_token_fallback'] ?? ''));
if ($serviceTokenFallback === '' || strpos($serviceTokenFallback, 'ВСТАВЬТЕ') === 0) {
    $serviceTokenFallback = 'd306a4b4d306a4b4d306a4b46ad0389840dd306d306a4b4ba56aeabaf84c50097d998b5';
}

$confirmationCode = trim((string)($config['vk_confirmation_code'] ?? ''));
if ($confirmationCode === '') {
    $confirmationCode = $defaultConfirmationCode;
}

$secretKey        = trim((string)($config['vk_secret_key'] ?? ''));
$botEnabled       = (bool)($config['vk_bot_enabled'] ?? true);
$botTyping        = (bool)($config['vk_bot_typing'] ?? true);
$apiVersion       = trim((string)($config['api_version'] ?? '5.131'));
$vkGroupUrl       = trim((string)($config['vk_group_url'] ?? $defaultGroupUrl));
$vkGroupId        = (int)($config['vk_group_id'] ?? $defaultGroupId);
$directDialogUrl  = 'https://vk.me/club' . $vkGroupId;

// -----------------------------------------------------------------------------
// Подключение модуля поиска электронного каталога OPAC-Global (ЦГБ г. Владимира)
// -----------------------------------------------------------------------------
if (file_exists(__DIR__ . '/opac.php')) {
    require_once __DIR__ . '/opac.php';
} elseif (file_exists(__DIR__ . '/OpacClient.php')) {
    require_once __DIR__ . '/OpacClient.php';
}

// -----------------------------------------------------------------------------
// Подключение модуля поиска по Единому реестру иноагентов Минюста РФ (255-ФЗ)
// -----------------------------------------------------------------------------
if (file_exists(__DIR__ . '/inoagent.php')) {
    require_once __DIR__ . '/inoagent.php';
}

// Пул ключей ИИ (4 ключа, суммарно 3 000 000 токенов в сутки)
// Ключи 1 и 2: по 1 000 000 токенов/24ч; 3 и 4: по 500 000 токенов/24ч
$defaultAiKeys = [
    'sk-xt-7bfbd1f7908daa6a630e1e6e3d5cfa4e1961dcef6aebbfe1',
    'sk-xt-764dbb9ee98b4d75bcedeef2fd0899d01044e46e8143acd2',
    'sk-xt-89197544de3c1a413756421f7181e8ef5334c84915c67b1e',
    'sk-xt-5ec04454fdfbae29eca0a631c43d6c07a0ef9d475c606161'
];

$rawAiKeys = [];
if (!empty($config['ai_api_keys']) && is_array($config['ai_api_keys'])) {
    foreach ($config['ai_api_keys'] as $k) {
        $k = trim((string)$k);
        if ($k !== '' && strpos($k, 'ВСТАВЬТЕ') !== 0) $rawAiKeys[] = $k;
    }
}
foreach (['ai_api_key', 'ai_api_key_fallback', 'ai_api_key_fallback_2', 'ai_api_key_fallback_3'] as $kField) {
    if (!empty($config[$kField])) {
        $k = trim((string)$config[$kField]);
        if ($k !== '' && strpos($k, 'ВСТАВЬТЕ') !== 0) $rawAiKeys[] = $k;
    }
}
foreach ($defaultAiKeys as $defK) {
    if (!in_array($defK, $rawAiKeys, true)) $rawAiKeys[] = $defK;
}
$validAiKeys = array_values(array_unique($rawAiKeys));

$aiBaseUrl       = isset($config['ai_base_url']) ? rtrim(trim((string)$config['ai_base_url']), '/') : 'https://api.xkiro.com/v1';
$aiPrimaryModel  = !empty($config['ai_model_primary']) 
    ? trim((string)$config['ai_model_primary']) 
    : (!empty($config['ai_model']) && strpos($config['ai_model'], 'mistral') === false 
        ? trim((string)$config['ai_model']) 
        : 'qwen/qwen3.8-max:free');
$aiFallbackModel = !empty($config['ai_model_fallback']) 
    ? trim((string)$config['ai_model_fallback']) 
    : 'mistralai/mistral-large-2512';
if ($aiPrimaryModel === '') {
    $aiPrimaryModel = 'qwen/qwen3.8-max:free';
}
if ($aiFallbackModel === '') {
    $aiFallbackModel = 'mistralai/mistral-large-2512';
}
$aiModel         = $aiPrimaryModel;
$aiMaxTok        = isset($config['ai_max_tokens']) ? max(300, (int)$config['ai_max_tokens']) : 2048;
$aiTimeout       = isset($config['ai_timeout']) ? max(15, (int)$config['ai_timeout']) : 90;

$elevenlabsApiKey = trim((string)($config['elevenlabs_api_key'] ?? ''));
if ($elevenlabsApiKey === '' || strpos($elevenlabsApiKey, 'ВСТАВЬТЕ') === 0) {
    $elevenlabsApiKey = 'sk_4db51c71946165f5132f0276283047de69abfe24da40bc3e';
}

$cacheDir = dirname(__DIR__) . '/cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}
$activeKeyIndexFile = $cacheDir . '/ai_active_key.json';

// Определение внешнего URL текущего вебхука
$proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$reqUri = strtok($_SERVER['REQUEST_URI'] ?? '/api/vk-bot.php', '?');
$currentWebhookUrl = $proto . '://' . $host . $reqUri;

// -----------------------------------------------------------------------------
// 3. Обработка GET / HEAD-запросов (Диагностика и статус)
// -----------------------------------------------------------------------------
if (defined('VK_BOT_LIB_ONLY') || (php_sapi_name() === 'cli' && !isset($_SERVER['GATEWAY_INTERFACE']) && empty($_SERVER['REQUEST_METHOD']))) {
    return;
}

$reqMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($reqMethod === 'GET' || $reqMethod === 'HEAD') {
    $action = $_GET['action'] ?? '';
    $acceptJson = isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false;

    if ($action === 'status' || $acceptJson || isset($_GET['json'])) {
        header('Content-Type: application/json; charset=UTF-8');
        header('Access-Control-Allow-Origin: *');
        echo json_encode([
            'ok'                   => true,
            'bot_enabled'          => $botEnabled,
            'bot_configured'       => ($communityToken !== '' && $confirmationCode !== ''),
            'has_community_token'  => ($communityToken !== ''),
            'has_confirmation_code'=> ($confirmationCode !== ''),
            'has_secret_key'       => ($secretKey !== ''),
            'group_url'            => $vkGroupUrl,
            'group_id'             => $vkGroupId,
            'direct_dialog_url'    => $directDialogUrl,
            'webhook_url'          => $currentWebhookUrl,
            'api_version'          => $apiVersion,
            'ai_configured'        => (count($validAiKeys) > 0),
            'ai_model'             => $aiModel,
            'ai_model_primary'     => $aiPrimaryModel,
            'ai_model_fallback'    => $aiFallbackModel,
            'ai_keys_count'        => count($validAiKeys),
            'timestamp'            => time()
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Рендеринг красивой диагностической страницы для администратора
    header('Content-Type: text/html; charset=UTF-8');
    ?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Чат-бот Космо | Интеграция ВКонтакте</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
    <style>
        :root {
            --bg: #070913;
            --card-bg: rgba(18, 22, 41, 0.75);
            --border: rgba(255, 255, 255, 0.08);
            --primary: #3b82f6;
            --primary-glow: rgba(59, 130, 246, 0.25);
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --text: #f3f4f6;
            --text-muted: #9ca3af;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', system-ui, sans-serif;
            background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, var(--bg) 70%);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
        }
        .container {
            width: 100%;
            max-width: 680px;
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 32px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 40px var(--primary-glow);
        }
        .header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
        }
        .avatar {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
        }
        h1 { font-size: 1.4rem; font-weight: 700; color: #fff; }
        .subtitle { font-size: 0.9rem; color: var(--text-muted); margin-top: 4px; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 24px;
        }
        .status-box {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .status-label { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        .badge.ok { color: var(--success); }
        .badge.warn { color: var(--warning); }
        .badge.err { color: var(--danger); }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
        .field-wrap {
            margin-bottom: 24px;
        }
        .field-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text);
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
        }
        .copy-input-group {
            display: flex;
            gap: 8px;
        }
        .code-input {
            flex: 1;
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 10px 14px;
            color: #60a5fa;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            outline: none;
        }
        .btn {
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 10px;
            padding: 10px 16px;
            font-size: 0.88rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .btn:hover { background: #1d4ed8; }
        .steps {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 18px 20px;
            margin-bottom: 24px;
        }
        .steps h2 { font-size: 1rem; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .steps ol { padding-left: 20px; font-size: 0.88rem; color: #d1d5db; line-height: 1.6; }
        .steps li { margin-bottom: 8px; }
        .steps code {
            background: rgba(255, 255, 255, 0.08);
            padding: 2px 6px;
            border-radius: 6px;
            font-family: 'JetBrains Mono', monospace;
            color: #93c5fd;
            font-size: 0.82rem;
        }
        .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.82rem;
            color: var(--text-muted);
            border-top: 1px solid var(--border);
            padding-top: 16px;
        }
        .footer a { color: #60a5fa; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="avatar">🤖</div>
            <div>
                <h1>Чат-бот «Космо» ВКонтакте</h1>
                <div class="subtitle">Интеграция робота-сомелье в личные сообщения сообщества</div>
            </div>
        </div>

        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div>
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #93c5fd; font-weight: 600;">Подключенная группа ВКонтакте:</div>
                <div style="font-size: 1rem; font-weight: 700; color: #fff; margin-top: 2px;">
                    <a href="<?= htmlspecialchars($vkGroupUrl) ?>" target="_blank" style="color: #60a5fa; text-decoration: underline;">club<?= $vkGroupId ?> (<?= htmlspecialchars($vkGroupUrl) ?>)</a>
                </div>
            </div>
            <a href="https://vk.me/club<?= $vkGroupId ?>" target="_blank" class="btn" style="background: #2563eb; text-decoration: none; padding: 8px 14px; font-size: 0.84rem;">
                <span class="material-symbols-outlined" style="font-size: 18px;">chat</span>
                <span>Написать Космо в ВК</span>
            </a>
        </div>

        <div class="grid">
            <div class="status-box">
                <span class="status-label">Статус бота</span>
                <span class="badge <?= $botEnabled ? 'ok' : 'warn' ?>">
                    <span class="dot"></span>
                    <?= $botEnabled ? 'Включен' : 'Отключен' ?>
                </span>
            </div>
            <div class="status-box">
                <span class="status-label">Токен сообщества</span>
                <span class="badge <?= $communityToken !== '' ? 'ok' : 'err' ?>">
                    <span class="dot"></span>
                    <?= $communityToken !== '' ? 'Настроен' : 'Не указан' ?>
                </span>
            </div>
            <div class="status-box">
                <span class="status-label">Код подтверждения</span>
                <span class="badge <?= $confirmationCode !== '' ? 'ok' : 'warn' ?>">
                    <span class="dot"></span>
                    <?= $confirmationCode !== '' ? 'Задан' : 'Не указан' ?>
                </span>
            </div>
            <div class="status-box">
                <span class="status-label">Шлюз ИИ</span>
                <span class="badge ok">
                    <span class="dot"></span>
                    Mistral Large (<?= count($validAiKeys) ?> кл.)
                </span>
            </div>
        </div>

        <div class="field-wrap">
            <div class="field-label">
                <span>Адрес Callback API (вебхук для группы ВКонтакте):</span>
            </div>
            <div class="copy-input-group">
                <input type="text" id="webhook-url" class="code-input" value="<?= htmlspecialchars($currentWebhookUrl) ?>" readonly>
                <button type="button" class="btn" onclick="copyWebhookUrl()">
                    <span class="material-symbols-outlined" style="font-size: 18px;">content_copy</span>
                    <span>Копировать</span>
                </button>
            </div>
        </div>

        <div class="steps">
            <h2><span class="material-symbols-outlined" style="color: #60a5fa;">settings</span> Как подключить бота к вашей группе (быстрые ссылки):</h2>
            <ol>
                <li>В группе перейдите в <a href="https://vk.com/club<?= $vkGroupId ?>?act=messages" target="_blank" style="color: #60a5fa; text-decoration: underline;"><strong>Управление → Сообщения</strong></a> → установите <strong>Включены</strong>.</li>
                <li>Откройте <a href="https://vk.com/club<?= $vkGroupId ?>?act=tokens" target="_blank" style="color: #60a5fa; text-decoration: underline;"><strong>Управление → Работа с API → Ключи доступа</strong></a> → нажмите <strong>Создать ключ</strong>, отметьте <em>«Разрешить доступ к сообщениям сообщества»</em>. Скопируйте ключ и вставьте в <code>api/config.php</code> как <code>'vk_community_token'</code>.</li>
                <li>Перейдите во вкладку <a href="https://vk.com/club<?= $vkGroupId ?>?act=api" target="_blank" style="color: #60a5fa; text-decoration: underline;"><strong>Callback API</strong></a>:
                    <br>• Вставьте адрес сервера из поля выше;
                    <br>• Скопируйте <em>«Строку, которую должен вернуть сервер»</em> и вставьте её в <code>api/config.php</code> в поле <code>'vk_confirmation_code'</code>;
                    <br>• Нажмите кнопку <strong>Подтвердить</strong> в настройках ВКонтакте.
                </li>
                <li>Во вкладке <a href="https://vk.com/club<?= $vkGroupId ?>?act=api" target="_blank" style="color: #60a5fa; text-decoration: underline;"><strong>Типы событий</strong></a> отметьте галочку: <strong>«Входящие сообщения» (message_new)</strong>.</li>
                <li><strong style="color: #f59e0b;">ОБЯЗАТЕЛЬНО ДЛЯ ПОЯВЛЕНИЯ КНОПОК:</strong> перейдите в <a href="https://vk.com/club<?= $vkGroupId ?>?act=messages" target="_blank" style="color: #60a5fa; text-decoration: underline;"><strong>Управление → Сообщения → Настройки для бота</strong></a> (справа подраздел меню) → переключите <em>«Возможности ботов»</em> в положение <strong>«Включены»</strong>, отметьте галочку <em>«Добавить кнопку "Начать"»</em> и сохраните. Без этой опции ВКонтакте отклоняет кнопки меню ошибкой 912!</li>
            </ol>
        </div>

        <div class="footer">
            <span>AURORA &bull; Библиотечный робот Космо</span>
            <a href="../">← Вернуться к аналитике групп</a>
        </div>
    </div>

    <script>
        function copyWebhookUrl() {
            const input = document.getElementById('webhook-url');
            input.select();
            navigator.clipboard.writeText(input.value).then(() => {
                alert('Адрес вебхука скопирован в буфер обмена!');
            }).catch(() => {
                document.execCommand('copy');
                alert('Адрес вебхука скопирован!');
            });
        }
    </script>
</body>
</html>
    <?php
    exit;
}

// -----------------------------------------------------------------------------
// 4. Обработка POST-запросов (VK Callback API)
// -----------------------------------------------------------------------------
$rawInput = file_get_contents('php://input');
$event = vk_bot_json_decode($rawInput);

// Опциональная синхронизация конфигурации администратором
if (is_array($event) && isset($event['action']) && $event['action'] === 'sync_config') {
    header('Content-Type: application/json; charset=UTF-8');
    $adminToken = (string)($event['token'] ?? '');
    $validToken = (string)($config['update_token'] ?? '1Radio14881!');
    if ($adminToken === '' || !hash_equals($validToken, $adminToken)) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Forbidden: invalid admin token'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $cfgFile = __DIR__ . '/config.php';
    $diskUpdated = false;
    if (is_file($cfgFile) && is_writable($cfgFile)) {
        $existing = file_get_contents($cfgFile);
        $updated = $existing;
        if (!empty($event['vk_community_token'])) {
            $newToken = addslashes((string)$event['vk_community_token']);
            $updated = preg_replace("/'vk_community_token'\s*=>\s*'.*?'/", "'vk_community_token'   => '{$newToken}'", $updated);
        }
        if (!empty($event['vk_confirmation_code'])) {
            $newCode = addslashes((string)$event['vk_confirmation_code']);
            $updated = preg_replace("/'vk_confirmation_code'\s*=>\s*'.*?'/", "'vk_confirmation_code' => '{$newCode}'", $updated);
        }
        if ($updated !== $existing) {
            $diskUpdated = (file_put_contents($cfgFile, $updated) !== false);
        }
    }

    echo json_encode([
        'ok'                => true,
        'disk_updated'      => $diskUpdated,
        'community_token'   => substr($communityToken, 0, 10) . '...',
        'confirmation_code' => $confirmationCode,
        'group_id'          => $vkGroupId
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if (php_sapi_name() === 'cli' && empty($rawInput)) {
    // Вызов из консоли / unit-тестов: позволяем вызывать экспортированные функции
    return;
}

if (!is_array($event) || empty($event['type'])) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Bad Request: invalid event payload';
    exit;
}

// Проверка секретного ключа Callback API (если настроен)
if ($secretKey !== '') {
    $incomingSecret = isset($event['secret']) ? (string)$event['secret'] : '';
    if ($incomingSecret !== $secretKey) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=UTF-8');
        echo 'Forbidden: invalid secret key';
        exit;
    }
}

$eventType = (string)$event['type'];

// Событие подтверждения адреса сервера (Confirmation)
if ($eventType === 'confirmation') {
    header('Content-Type: text/plain; charset=UTF-8');
    echo $confirmationCode !== '' ? $confirmationCode : 'CONFIRMATION_CODE_NOT_SET';
    exit;
}

// Обрабатываем входящие сообщения (message_new) и разрешение сообщений (message_allow)
if ($eventType !== 'message_new' && $eventType !== 'message_allow') {
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'ok';
    exit;
}

// Извлекаем объект сообщения (поддержка Callback API v5.103+ и старых форматов)
$msgObj = [];
if ($eventType === 'message_allow') {
    $peerId  = isset($event['object']['user_id']) ? (int)$event['object']['user_id'] : 0;
    $fromId  = $peerId;
    $userMsg = 'start';
    $payload = json_encode(['cmd' => 'welcome', 'command' => 'start'], JSON_UNESCAPED_UNICODE);
} else {
    if (isset($event['object']['message']) && is_array($event['object']['message'])) {
        $msgObj = $event['object']['message'];
    } elseif (isset($event['object']) && is_array($event['object'])) {
        $msgObj = $event['object'];
    }

    $peerId  = isset($msgObj['peer_id']) ? (int)$msgObj['peer_id'] : 0;
    $fromId  = isset($msgObj['from_id']) ? (int)$msgObj['from_id'] : 0;
    if ($fromId <= 0) {
        if (!empty($msgObj['user_id'])) {
            $fromId = (int)$msgObj['user_id'];
        } elseif ($peerId > 0 && $peerId < 2000000000) {
            $fromId = $peerId;
        }
    }
    $userMsg = isset($msgObj['text']) ? trim((string)$msgObj['text']) : '';
    $payload = $msgObj['payload'] ?? null;
}

// =============================================================================
// ЗАЩИТА ОТ ДУБЛИРОВАНИЯ СООБЩЕНИЙ (ДЕДУПЛИКАЦИЯ ВЕБХУКОВ И БЫСТРЫХ КЛИКОВ)
// =============================================================================
$eventId = isset($event['event_id']) ? trim((string)$event['event_id']) : '';
$cmid = isset($msgObj['conversation_message_id']) ? (int)$msgObj['conversation_message_id'] : (isset($msgObj['id']) ? (int)$msgObj['id'] : 0);

$dedupDir = $cacheDir . '/dedup';
if (!is_dir($dedupDir)) {
    @mkdir($dedupDir, 0777, true);
}

if ($eventId !== '') {
    $dedupKey = 'evt_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $eventId);
} elseif ($peerId > 0 && $cmid > 0) {
    $dedupKey = 'msg_' . $peerId . '_' . $cmid;
} else {
    $dedupKey = 'usr_' . $peerId . '_' . $fromId . '_' . md5($userMsg . '_' . (string)$payload) . '_' . (int)(time() / 3);
}

$dedupFile = $dedupDir . '/' . $dedupKey . '.lock';
if (file_exists($dedupFile)) {
    $lockAge = time() - (int)@filemtime($dedupFile);
    if ($lockAge < 120) {
        // Запрос уже обрабатывается или был успешно обработан — отдаём мгновенный 'ok'
        header('Content-Type: text/plain; charset=UTF-8');
        header('Connection: close');
        header('Content-Length: 2');
        header('X-Accel-Buffering: no');
        echo 'ok';
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        } else {
            while (ob_get_level() > 0) ob_end_flush();
            if (function_exists('flush')) @flush();
        }
        exit;
    }
}
@file_put_contents($dedupFile, (string)time(), LOCK_EX);

if (mt_rand(1, 40) === 1) {
    $oldLocks = @glob($dedupDir . '/*.lock');
    if ($oldLocks) {
        $now = time();
        foreach ($oldLocks as $lf) {
            if (($now - (int)@filemtime($lf)) > 600) {
                @unlink($lf);
            }
        }
    }
}

$GLOBALS['VK_CURRENT_INCOMING_KEY'] = $dedupKey;

// Поиск голосового сообщения (audio_message) среди вложений сообщения, реплая или пересланных
$audioAttachment = null;
if (!empty($msgObj['attachments']) && is_array($msgObj['attachments'])) {
    foreach ($msgObj['attachments'] as $att) {
        $type = $att['type'] ?? '';
        if ($type === 'audio_message') {
            $audioAttachment = $att;
            break;
        } elseif ($type === 'doc' && isset($att['doc']['preview']['audio_msg'])) {
            $audioAttachment = [
                'type'          => 'audio_message',
                'audio_message' => $att['doc']['preview']['audio_msg']
            ];
            break;
        }
    }
}
if ($audioAttachment === null && !empty($msgObj['reply_message']['attachments']) && is_array($msgObj['reply_message']['attachments'])) {
    foreach ($msgObj['reply_message']['attachments'] as $att) {
        $type = $att['type'] ?? '';
        if ($type === 'audio_message') {
            $audioAttachment = $att;
            break;
        } elseif ($type === 'doc' && isset($att['doc']['preview']['audio_msg'])) {
            $audioAttachment = [
                'type'          => 'audio_message',
                'audio_message' => $att['doc']['preview']['audio_msg']
            ];
            break;
        }
    }
}
if ($audioAttachment === null && !empty($msgObj['fwd_messages']) && is_array($msgObj['fwd_messages'])) {
    foreach ($msgObj['fwd_messages'] as $fwd) {
        if (!empty($fwd['attachments']) && is_array($fwd['attachments'])) {
            foreach ($fwd['attachments'] as $att) {
                $type = $att['type'] ?? '';
                if ($type === 'audio_message') {
                    $audioAttachment = $att;
                    break 2;
                } elseif ($type === 'doc' && isset($att['doc']['preview']['audio_msg'])) {
                    $audioAttachment = [
                        'type'          => 'audio_message',
                        'audio_message' => $att['doc']['preview']['audio_msg']
                    ];
                    break 2;
                }
            }
        }
    }
}

// Определение типа диалога: ЛС (peer_id < 2000000000) или групповая беседа (peer_id > 2000000000)
$isChat = ($peerId > 2000000000);
$chatAction = $msgObj['action'] ?? null;

// Проверка: добавили ли робота Космо в беседу (chat_invite_user) или вернулся забаненный участник
$isBotInvited = false;
if (is_array($chatAction)) {
    $actType = $chatAction['type'] ?? '';
    $memberId = (int)($chatAction['member_id'] ?? 0);
    if (($actType === 'chat_invite_user' && ($memberId === -$vkGroupId || $memberId === 0))
        || $actType === 'chat_invite_user_by_link'
        || $actType === 'chat_create') {
        $isBotInvited = true;
    }

    // Если присоединился пользователь из чёрного списка беседы — мгновенный автокик
    if ($isChat && ($actType === 'chat_invite_user' || $actType === 'chat_invite_user_by_link')) {
        $banInfo = ($memberId > 0) ? vk_bot_get_user_ban($peerId, $memberId, $cacheDir) : null;
        if ($banInfo !== null) {
            $chatId = $peerId - 2000000000;
            vk_bot_api_call('messages.removeChatUser', [
                'chat_id'   => $chatId,
                'member_id' => $memberId
            ], $communityToken);

            $dlabel = htmlspecialchars($banInfo['duration_label'] ?? 'навсегда');
            $until = (int)($banInfo['banned_until'] ?? 0);
            $rem = ($until > time() && $until < 300000000) ? 'осталось ' . vk_bot_format_remaining_time($until - time()) : '';
            $remStr = $rem !== '' ? " ({$rem})" : "";

            $bannedName = vk_bot_get_user_name($memberId, $communityToken, $cacheDir, $peerId);
            vk_bot_send_message([
                'peer_id'          => $peerId,
                'message'          => "🚫 [id{$memberId}|{$bannedName}] находится в чёрном списке этой беседы (бан на {$dlabel}{$remStr}) и был автоматически исключён роботом Космо.",
                'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
                'dont_parse_links' => 1
            ], $communityToken);

            header('Content-Type: text/plain; charset=UTF-8');
            echo 'ok';
            exit;
        }
    }
}

if ($isBotInvited) {
    $userMsg = 'Привет, Космо!';
    $payload = json_encode(['cmd' => 'chat_welcome'], JSON_UNESCAPED_UNICODE);
}

// Если это групповая беседа (чат):
if ($isChat) {
    // 1. Проверка: находится ли отправитель в режиме молчания (муте)
    $muteInfo = vk_bot_is_user_muted($peerId, $fromId, $cacheDir);
    if ($muteInfo !== null) {
        // Мгновенный ответ вебхуку ВК
        header('Content-Type: text/plain; charset=UTF-8');
        header('Connection: close');
        header('Content-Length: 2');
        echo 'ok';
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        } else {
            if (ob_get_level() > 0) ob_end_flush();
            if (function_exists('flush')) @flush();
        }

        // Удаляем сообщение нарушителя из чата для всех участников
        $cmid = (int)($msgObj['conversation_message_id'] ?? 0);
        if ($cmid > 0) {
            vk_bot_delete_chat_message($peerId, $cmid, $communityToken, $vkGroupId);
        }

        // Предупреждение нарушителю (не чаще 1 раза в 120 сек, чтобы не спамить в чат)
        $throttleFile = $cacheDir . '/vk_mute_warn_' . $peerId . '_' . $fromId . '.tmp';
        $lastWarn = file_exists($throttleFile) ? (int)@file_get_contents($throttleFile) : 0;
        if ((time() - $lastWarn) > 120) {
            @file_put_contents($throttleFile, (string)time());
            $remSec = (int)($muteInfo['muted_until'] ?? 0) - time();
            $remText = vk_bot_format_remaining_time($remSec);
            $reason = htmlspecialchars($muteInfo['reason'] ?? 'Нарушение правил');
            $userName = vk_bot_get_user_name($fromId, $communityToken, $cacheDir, $peerId);
            $warnMsg = "🔇 [id{$fromId}|{$userName}], ваши сообщения удаляются — вы находитесь в режиме молчания ещё {$remText}!\nПричина: {$reason}";
            vk_bot_send_message([
                'peer_id'          => $peerId,
                'message'          => $warnMsg,
                'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
                'dont_parse_links' => 1
            ], $communityToken);
        }
        exit;
    }

    // 2. Авто-модерация нецензурной лексики и непристойных изображений для групповых бесед ($isChat && $fromId > 0)
    // В стёбном режиме «Гопник» (/gopnik on) робот Космо полностью игнорирует мат и не штрафует участников
    $isGopnikActive = vk_bot_is_gopnik_mode($peerId, $cacheDir);
    $hasProfanity = (!$isGopnikActive && $fromId > 0 && vk_bot_detect_profanity($userMsg));
    $hasVulgarImage = false;
    $vulgarReason = '';

    if ($fromId > 0 && !$hasProfanity) {
        $photoUrls = vk_bot_extract_photo_urls($msgObj);
        if (!empty($photoUrls)) {
            foreach ($photoUrls as $pUrl) {
                $check = vk_bot_detect_vulgar_image($pUrl, $validAiKeys, $aiBaseUrl);
                if (!empty($check['is_vulgar'])) {
                    $hasVulgarImage = true;
                    $vulgarReason = $check['reason'] ?? '';
                    break;
                }
            }
        }
    }

    if ($hasProfanity || $hasVulgarImage) {
        // Мгновенный ответ Callback API ВКонтакте
        header('Content-Type: text/plain; charset=UTF-8');
        header('Connection: close');
        header('Content-Length: 2');
        echo 'ok';
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        } else {
            if (ob_get_level() > 0) ob_end_flush();
            if (function_exists('flush')) @flush();
        }

        // Немедленно удаляем сообщение нарушителя
        $cmid = (int)($msgObj['conversation_message_id'] ?? 0);
        if ($cmid > 0) {
            vk_bot_delete_chat_message($peerId, $cmid, $communityToken, $vkGroupId);
        }

        // Хранилище нарушений в cache/vk_profanity_{peerId}.json
        $profCacheFile = $cacheDir . '/vk_profanity_' . $peerId . '.json';
        $oldProfCacheFile = $cacheDir . '/vk_profanity_warns_' . $peerId . '.json';
        $profData = [];
        if (file_exists($profCacheFile)) {
            $loaded = @json_decode(@file_get_contents($profCacheFile), true);
            if (is_array($loaded)) $profData = $loaded;
        } elseif (file_exists($oldProfCacheFile)) {
            $loaded = @json_decode(@file_get_contents($oldProfCacheFile), true);
            if (is_array($loaded)) $profData = $loaded;
        }

        $uKey = (string)$fromId;
        $userWarns = $profData[$uKey] ?? [
            'warnings'       => 0,
            'mutes_count'    => 0,
            'last_violation' => 0
        ];

        $chatId = $peerId - 2000000000;
        $msgText = '';
        $userName = vk_bot_get_user_name($fromId, $communityToken, $cacheDir, $peerId);

        if ($userWarns['mutes_count'] >= 2) {
            // КИК ИЗ ЧАТА
            vk_bot_api_call('messages.removeChatUser', [
                'chat_id'   => $chatId,
                'member_id' => $fromId
            ], $communityToken);

            $userWarns['last_violation'] = time();
            $profData[$uKey] = $userWarns;
            if ($hasVulgarImage) {
                $msgText = "🚫 [id{$fromId}|{$userName}] исключён из беседы за систематическую отправку непристойного и матерного контента!";
            } else {
                $msgText = "🚫 [id{$fromId}|{$userName}] исключён из беседы за систематическое употребление нецензурной лексики!";
            }
        } elseif ($userWarns['mutes_count'] == 1) {
            // МУТ НА 1 ЧАС (3600 сек)
            $muteReason = $hasVulgarImage ? 'Повторная отправка непристойного контента' : 'Повторный мат после мута';
            vk_bot_mute_user($peerId, $fromId, $userName, -$vkGroupId, 3600, '1 час', $muteReason, $cacheDir);

            $userWarns['mutes_count'] = 2;
            $userWarns['last_violation'] = time();
            $profData[$uKey] = $userWarns;
            if ($hasVulgarImage) {
                $msgText = "🔇 [id{$fromId}|{$userName}] повторно отправил непристойный контент после мута и отправлен в режим молчания на 1 час! Следующее нарушение приведет к исключению из беседы.";
            } else {
                $msgText = "🔇 [id{$fromId}|{$userName}] повторно использовал нецензурную лексику после мута и отправлен в режим молчания на 1 час! Следующее нарушение приведет к исключению из беседы.";
            }
        } else {
            // mutes_count == 0
            $userWarns['warnings']++;
            $userWarns['last_violation'] = time();

            if ($userWarns['warnings'] == 1) {
                $profData[$uKey] = $userWarns;
                if ($hasVulgarImage) {
                    $msgText = "⚠️ [id{$fromId}|{$userName}], в нашей библиотечной беседе запрещены непристойные и матерные изображения! Предупреждение 1/3. На 3-е предупреждение — мут на 15 минут.";
                } else {
                    $msgText = "⚠️ [id{$fromId}|{$userName}], в нашей библиотечной беседе запрещена нецензурная лексика! Предупреждение 1/3. На 3-е предупреждение — мут на 15 минут.";
                }
            } elseif ($userWarns['warnings'] == 2) {
                $profData[$uKey] = $userWarns;
                if ($hasVulgarImage) {
                    $msgText = "⚠️ [id{$fromId}|{$userName}], в нашей библиотечной беседе запрещены непристойные и матерные изображения! Предупреждение 2/3. Следующее нарушение приведет к муту на 15 минут!";
                } else {
                    $msgText = "⚠️ [id{$fromId}|{$userName}], в нашей библиотечной беседе запрещена нецензурная лексика! Предупреждение 2/3. Следующий мат приведет к муту на 15 минут!";
                }
            } else {
                // warnings >= 3: МУТ НА 15 МИНУТ (900 сек)
                $muteReason = $hasVulgarImage ? 'Непристойные изображения (3 предупреждения)' : 'Нецензурная лексика (3 предупреждения)';
                vk_bot_mute_user($peerId, $fromId, $userName, -$vkGroupId, 900, '15 минут', $muteReason, $cacheDir);

                $userWarns['mutes_count'] = 1;
                $userWarns['warnings'] = 0;
                $profData[$uKey] = $userWarns;
                if ($hasVulgarImage) {
                    $msgText = "🔇 [id{$fromId}|{$userName}] получил 3 предупреждения за непристойный контент и отправлен в режим молчания на 15 минут!";
                } else {
                    $msgText = "🔇 [id{$fromId}|{$userName}] получил 3 предупреждения за нецензурную лексику и отправлен в режим молчания на 15 минут!";
                }
            }
        }

        // Сохраняем прогресс нарушений с блокировкой файла
        $fh = @fopen($profCacheFile, 'c+');
        if ($fh) {
            if (@flock($fh, LOCK_EX)) {
                ftruncate($fh, 0);
                rewind($fh);
                fwrite($fh, json_encode($profData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                fflush($fh);
                @flock($fh, LOCK_UN);
            }
            fclose($fh);
        } else {
            @file_put_contents($profCacheFile, json_encode($profData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        // Отправляем сообщение нарушителю в чат
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $msgText,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);

        exit;
    }
}

// Если это групповая беседа (чат) и не событие добавления бота:
if ($isChat && !$isBotInvited) {
    $replyMsg = $msgObj['reply_message'] ?? null;
    $isReplyToBot = ($replyMsg && (int)($replyMsg['from_id'] ?? 0) === -$vkGroupId);

    // 1. Команды: со слэшем / или восклицательным знаком ! (включая команды модерации !мут, !кик, команды бота /книга, /поиск, /help, /gopnik и т.д.)
    $isModCmd = (vk_bot_parse_mod_command($userMsg, $msgObj) !== null);
    $isGopnikCmd = (vk_bot_parse_gopnik_command($userMsg) !== null);
    $isPrefixCmd = (bool)preg_match('/^[!|\/][a-zA-Zа-яА-Я0-9_-]+/u', trim($userMsg));
    $isCmd = ($isModCmd || $isGopnikCmd || $isPrefixCmd);

    // 2. Обращение через @ (упоминание группы, никнейма или ID бота):
    $hasAtMention = (
        preg_match('/\[(?:club|public)' . $vkGroupId . '\|[^\]]*\]/ui', $userMsg) ||
        preg_match('/@(?:club|public)' . $vkGroupId . '\b/ui', $userMsg) ||
        preg_match('/@(cosmobibliobot|cosmo|космо)\b/ui', $userMsg)
    );

    // 3. Обращение по имени Космо:
    $hasNameMention = (bool)preg_match('/\b(?:космо|космос|робот\s*космо)\b/ui', $userMsg);

    // 4. Цифра ответа на квиз / опрос (только если сейчас активно ожидается ответ в этой беседе):
    $isDigitReply = (preg_match('/^[1-4]$/', trim($userMsg)) && (
        file_exists($cacheDir . '/vk_quiz_' . $peerId . '.json') ||
        file_exists($cacheDir . '/vk_poll_' . $peerId . '.json') ||
        file_exists($cacheDir . '/vk_bookclub_vote_' . $peerId . '.json')
    ));

    // Общий признак разрешения ответа в беседе:
    // Только через @, по имени Космо, через команды, реплай на бота или активный payload кнопки (и никак иначе!)
    $shouldRespondInChat = (
        $hasAtMention ||
        $hasNameMention ||
        $isCmd ||
        $isReplyToBot ||
        $isDigitReply ||
        !empty($payload)
    );

    // В беседе игнорируем любые сообщения между участниками, если бота не звали через @, по имени Космо или через команды
    // ВНИМАНИЕ: если есть голосовое сообщение ($audioAttachment !== null), пропускаем его в фоновый режим:
    // транскрипция речи определит, звали ли Космо голосом (по имени Космо или командой).
    if (!$shouldRespondInChat && $audioAttachment === null) {
        header('Content-Type: text/plain; charset=UTF-8');
        echo 'ok';
        exit;
    }

    // Очищаем обращение к боту для корректной работы команд и ИИ
    $userMsg = preg_replace('/\[(?:club|public)' . $vkGroupId . '\|[^\]]*\]/ui', '', $userMsg);
    $userMsg = preg_replace('/@(?:club|public)' . $vkGroupId . '\b/ui', '', $userMsg);
    $userMsg = preg_replace('/@(cosmobibliobot|cosmo|космо)\b/ui', '', $userMsg);
    $userMsg = preg_replace('/^\s*(?:космос|космо|робот\s*космо)[\s,!:—?]+/ui', '', $userMsg);
    $userMsg = trim($userMsg);

    if ($userMsg === '' && empty($payload) && $audioAttachment === null && !$isCmd) {
        $userMsg = 'Привет!';
        $payload = json_encode(['cmd' => 'about'], JSON_UNESCAPED_UNICODE);
    }
}

// Обработка пустых сообщений, стикеров, медиавложений и нажатия «Начать» (в ЛС)
if ($userMsg === '' && empty($payload) && $audioAttachment === null) {
    if (!empty($msgObj['attachments'])) {
        $firstAtt = $msgObj['attachments'][0]['type'] ?? '';
        if ($firstAtt === 'sticker') {
            $userMsg = 'Привет, Космо!';
            $payload = json_encode(['cmd' => 'about'], JSON_UNESCAPED_UNICODE);
        } else {
            $userMsg = 'Привет, Космо!';
            $payload = json_encode(['cmd' => 'about'], JSON_UNESCAPED_UNICODE);
        }
    } else {
        $userMsg = 'Привет, Космо!';
        $payload = json_encode(['cmd' => 'about'], JSON_UNESCAPED_UNICODE);
    }
}

// Если сообщение от группы/бота (from_id < 0) или не указан peer_id — выходим
if ($peerId === 0 || $fromId < 0) {
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'ok';
    exit;
}

// Если бот отключен или не указан токен группы — подтверждаем ВК и выходим
if (!$botEnabled || $communityToken === '') {
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'ok';
    exit;
}

// =============================================================================
// МГНОВЕННЫЙ ОТВЕТ «ok» СЕРВЕРУ ВКОНТАКТЕ (< 30 мс)
// Разрываем соединение с сервером ВК, продолжая выполнение скрипта в фоновом режиме
// =============================================================================
header('Content-Type: text/plain; charset=UTF-8');
header('Connection: close');
header('Content-Length: 2');
header('X-Accel-Buffering: no');
echo 'ok';

if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
} else {
    while (ob_get_level() > 0) {
        ob_end_flush();
    }
    if (function_exists('flush')) {
        @flush();
    }
}

// =============================================================================
// ФОНОВАЯ ОБРАБОТКА И ГЕНЕРАЦИЯ ОТВЕТА КОСМО
// =============================================================================

/**
 * Отправка запроса к VK API
 */
function vk_bot_api_call($method, $params, $token)
{
    $url = 'https://api.vk.com/method/' . $method;
    $params['access_token'] = $token;
    if (!isset($params['v'])) {
        $params['v'] = '5.131';
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($params),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AURORA-Cosmo-VKBot/4.24.4',
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);
    $resp = curl_exec($ch);
    $curlErr = curl_error($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    $json = is_string($resp) ? json_decode($resp, true) : null;
    return [$httpCode, $json, $curlErr];
}

/**
 * Установка индикатора «Космо печатает...» в диалоге ВКонтакте
 */
function vk_bot_set_typing($peerId, $token, $groupId)
{
    if (!$peerId || !$token) return false;
    return vk_bot_api_call('messages.setActivity', [
        'peer_id'  => $peerId,
        'group_id' => $groupId,
        'type'     => 'typing'
    ], $token);
}

// Показываем стандартную анимацию «Печатает...» при любом запросе пользователя
if ($botTyping && $peerId > 0) {
    vk_bot_set_typing($peerId, $communityToken, $vkGroupId);
}

/**
 * Распознавание входящего голосового сообщения ВКонтакте (Voice-to-Text ASR)
 * Отказоустойчивый конвейер:
 * 1. Нативная расшифровка VK API (VK Neural ASR: мгновенно или через опрос 1-2.5 сек).
 * 2. Резервный ASR через Google Speech API v2 (Chromium FLAC 16kHz mono через ffmpeg).
 * (ElevenLabs для STT полностью исключён по требованию пользователя).
 */
function vk_bot_resolve_audio_transcript($audioAttachment, $msgObj, $peerId, $token, $groupId = 0)
{
    $audio = $audioAttachment['audio_message'] ?? ($audioAttachment['doc'] ?? []);
    if (empty($audio)) return null;

    // Уровень 1: Нативная расшифровка VK API (если уже заполнена в объекте события)
    $transcript = isset($audio['transcript']) ? trim((string)$audio['transcript']) : '';
    $state = $audio['transcript_state'] ?? '';
    if (($state === 'done' || $transcript !== '') && !preg_match('/^\[(?:шум|тишина|музыка|неразборчиво)\]$/ui', $transcript)) {
        return $transcript;
    }

    // Опрос нативной расшифровки ВКонтакте (VK Neural ASR завершает распознавание за 1-2.5 сек)
    $cmId = (int)($msgObj['conversation_message_id'] ?? 0);
    $msgId = (int)($msgObj['id'] ?? 0);

    if ($peerId > 0 && ($cmId > 0 || $msgId > 0) && !empty($token)) {
        for ($attempt = 0; $attempt < 4; $attempt++) {
            usleep(850000); // 850 мс пауза
            if ($groupId > 0) {
                vk_bot_set_typing($peerId, $token, $groupId);
            }

            $pollRes = null;
            if ($cmId > 0) {
                list($code, $pollRes) = vk_bot_api_call('messages.getByConversationMessageId', [
                    'peer_id'                  => $peerId,
                    'conversation_message_ids' => $cmId
                ], $token);
            } elseif ($msgId > 0) {
                list($code, $pollRes) = vk_bot_api_call('messages.getById', [
                    'message_ids' => $msgId
                ], $token);
            }

            $item = $pollRes['response']['items'][0] ?? null;
            if (is_array($item) && !empty($item['attachments'])) {
                foreach ($item['attachments'] as $att) {
                    $attAudio = $att['audio_message'] ?? ($att['doc'] ?? null);
                    if ($attAudio) {
                        $pTranscript = isset($attAudio['transcript']) ? trim((string)$attAudio['transcript']) : '';
                        $pState = $attAudio['transcript_state'] ?? '';
                        if (($pState === 'done' || $pTranscript !== '') && !preg_match('/^\[(?:шум|тишина|музыка|неразборчиво)\]$/ui', $pTranscript)) {
                            if ($pTranscript !== '') {
                                return $pTranscript;
                            }
                        }
                        if ($pState === 'failed') {
                            break 2; // Переходим к Google Speech API
                        }
                    }
                }
            }
        }
    }

    // Уровень 2: Резервный ASR через Google Speech API v2 (Chromium FLAC 16kHz mono)
    $audioUrl = $audio['link_mp3'] ?? ($audio['link_ogg'] ?? '');
    if ($audioUrl === '') return null;

    // Скачиваем аудио во временный файл
    $tmpDir = sys_get_temp_dir();
    $uniq = uniqid('vk_voice_', true);
    $ext = (strpos($audioUrl, '.ogg') !== false || (isset($audio['link_ogg']) && $audioUrl === $audio['link_ogg'])) ? 'ogg' : 'mp3';
    $tmpAudioFile = $tmpDir . '/' . $uniq . '.' . $ext;

    $chDl = curl_init($audioUrl);
    $fp = @fopen($tmpAudioFile, 'w+');
    if (!$fp) return null;

    curl_setopt_array($chDl, [
        CURLOPT_FILE           => $fp,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AURORA-Cosmo-Voice/4.38.0',
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);
    curl_exec($chDl);
    $dlCode = (int)curl_getinfo($chDl, CURLINFO_RESPONSE_CODE);
    curl_close($chDl);
    @fclose($fp);

    if ($dlCode !== 200 || !file_exists($tmpAudioFile) || filesize($tmpAudioFile) < 100) {
        if (file_exists($tmpAudioFile)) @unlink($tmpAudioFile);
        return null;
    }

    $tmpFlac = $tmpDir . '/' . $uniq . '.flac';
    exec('ffmpeg -y -i ' . escapeshellarg($tmpAudioFile) . ' -ar 16000 -ac 1 ' . escapeshellarg($tmpFlac) . ' 2>&1', $ffOut, $ffRet);
    if ($ffRet === 0 && file_exists($tmpFlac) && filesize($tmpFlac) > 100) {
        $flacData = @file_get_contents($tmpFlac);
        if ($flacData !== false && strlen($flacData) > 0) {
            $chG = curl_init('https://www.google.com/speech-api/v2/recognize?output=json&lang=ru-RU&key=AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw');
            curl_setopt_array($chG, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $flacData,
                CURLOPT_HTTPHEADER     => ['Content-Type: audio/x-flac; rate=16000'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 15,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false
            ]);
            $gResp = curl_exec($chG);
            $gCode = (int)curl_getinfo($chG, CURLINFO_RESPONSE_CODE);
            curl_close($chG);

            if ($gCode === 200 && is_string($gResp)) {
                $lines = explode("\n", trim($gResp));
                foreach (array_reverse($lines) as $gLine) {
                    $gJson = json_decode($gLine, true);
                    if (is_array($gJson) && !empty($gJson['result'][0]['alternative'][0]['transcript'])) {
                        $gText = trim((string)$gJson['result'][0]['alternative'][0]['transcript']);
                        if ($gText !== '') {
                            @unlink($tmpAudioFile);
                            @unlink($tmpFlac);
                            return $gText;
                        }
                    }
                }
            }
        }
        if (file_exists($tmpFlac)) @unlink($tmpFlac);
    }

    if (file_exists($tmpAudioFile)) @unlink($tmpAudioFile);
    return null;
}

/**
 * Получение актуальной книги недели и глубоких тем для обсуждения книжного клуба
 * Выбирается ротацией по номеру недели года
 */
function vk_bot_get_book_club_topic()
{
    $topics = [
        [
            'book'      => '«Мастер и Маргарита»',
            'author'    => 'Михаил Булгаков',
            'genre'     => 'Философская мистика, сатира, роман',
            'idea'      => 'Сила подлинного творчества, верность любви и вечное равновесие добра и зла.',
            'questions' => [
                '1️⃣ Почему, на ваш взгляд, именно рукопись Мастера «не горит»? В чём сокровенный смысл этой метафоры?',
                '2️⃣ Заслуживает ли Понтий Пилат сочувствия, или трусость — действительно самый тяжкий порок человека?',
                '3️⃣ Какая линия романа вам ближе: искромётная сатира на московских обывателей или трагическая история любви и Ершалаима?'
            ]
        ],
        [
            'book'      => '«Цветы для Элджернона»',
            'author'    => 'Дэниел Киз',
            'genre'     => 'Научно-психологическая фантастика, драма',
            'idea'      => 'Цена сверхразума, хрупкость человеческого достоинства и ценность душевной доброты.',
            'questions' => [
                '1️⃣ Был ли Чарли Гордон по-настоящему счастливее в начале пути или на вершине своего гениального интеллекта?',
                '2️⃣ Почему общество и коллеги из пекарни с таким страхом и агрессией отнеслись к его стремительному развитию?',
                '3️⃣ Имеет ли наука моральное право на эксперименты, кардинально меняющие человеческую личность?'
            ]
        ],
        [
            'book'      => '«Мы»',
            'author'    => 'Евгений Замятин',
            'genre'     => 'Классическая социально-философская антиутопия',
            'idea'      => 'Живая душа и свобода воли против стерильной уравниловки Единого Государства.',
            'questions' => [
                '1️⃣ Возможно ли построить абсолютное человеческое счастье без права на ошибку, сомнения и личный выбор?',
                '2️⃣ Что стало истинной искрой пробуждения души Д-503: музыка, древний дом или любовь к I-330?',
                '3️⃣ Почему роман, написанный более века назад, звучит сегодня столь пророчески и злободневно?'
            ]
        ],
        [
            'book'      => '«Маленький принц»',
            'author'    => 'Антуан де Сент-Экзюпери',
            'genre'     => 'Философская сказка-притча для любого возраста',
            'idea'      => 'Зоркость сердца, ценность бескорыстной дружбы и ответственность за тех, кого приручили.',
            'questions' => [
                '1️⃣ Какой из астероидов (Король, Честолюбец, Пьяница, Деловой человек, Фонарщик) точнее всего отражает современную суету?',
                '2️⃣ Что для каждого из нас во взрослой жизни означает фраза: «Ты навсегда в ответе за всех, кого приручил»?',
                '3️⃣ Как в ежедневной рутине не утратить способность видеть барашка сквозь отверстия в ящике?'
            ]
        ]
    ];

    $weekNum = (int)date('W');
    $idx = $weekNum % count($topics);
    return array_merge($topics[$idx], ['week' => $weekNum]);
}

/**
 * Варианты книг для еженедельного интерактивного голосования читателей
 */
function vk_bot_get_book_club_vote_options()
{
    return [
        1 => ['title' => '«Солярис»', 'author' => 'Станислав Лем', 'genre' => 'Философская фантастика'],
        2 => ['title' => '«451° по Фаренгейту»', 'author' => 'Рэй Брэдбери', 'genre' => 'Антиутопия'],
        3 => ['title' => '«Два капитана»', 'author' => 'Вениамин Каверин', 'genre' => 'Приключения, романтика подвига'],
        4 => ['title' => '«Старик и море»', 'author' => 'Эрнест Хемингуэй', 'genre' => 'Повесть-притча о несгибаемости духа']
    ];
}

/**
 * Фиксация голоса участника в файле кэша беседы
 */
function vk_bot_record_book_club_vote($peerId, $fromId, $optNum, $cacheDir)
{
    if ($optNum < 1 || $optNum > 4 || $peerId <= 0 || $fromId <= 0) {
        return false;
    }

    $voteFile = $cacheDir . '/vk_bookclub_vote_' . $peerId . '.json';
    $currentWeek = (int)date('W');

    $data = ['peer_id' => $peerId, 'week' => $currentWeek, 'votes' => []];
    if (file_exists($voteFile)) {
        $loaded = @json_decode(@file_get_contents($voteFile), true);
        if (is_array($loaded) && ($loaded['week'] ?? 0) === $currentWeek) {
            $data = $loaded;
        }
    }

    $data['votes'][(string)$fromId] = $optNum;
    $data['updated_at'] = time();

    $fh = @fopen($voteFile, 'c+');
    if ($fh) {
        if (@flock($fh, LOCK_EX)) {
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            fflush($fh);
            @flock($fh, LOCK_UN);
        }
        fclose($fh);
        return true;
    }
    return false;
}

/**
 * Склонение слова «голос»
 */
function vk_bot_plural_votes($n)
{
    $n = abs((int)$n) % 100;
    $n1 = $n % 10;
    if ($n > 10 && $n < 20) return 'голосов';
    if ($n1 > 1 && $n1 < 5) return 'голоса';
    if ($n1 == 1) return 'голос';
    return 'голосов';
}

/**
 * Форматирование наглядных результатов голосования с визуальной шкалой прогресса
 */
function vk_bot_format_book_club_vote_results($peerId, $cacheDir)
{
    $options = vk_bot_get_book_club_vote_options();
    $voteFile = $cacheDir . '/vk_bookclub_vote_' . $peerId . '.json';
    $currentWeek = (int)date('W');

    $counts = [1 => 0, 2 => 0, 3 => 0, 4 => 0];
    $totalVotes = 0;

    if (file_exists($voteFile)) {
        $loaded = @json_decode(@file_get_contents($voteFile), true);
        if (is_array($loaded) && ($loaded['week'] ?? 0) === $currentWeek && !empty($loaded['votes'])) {
            foreach ($loaded['votes'] as $uid => $opt) {
                $opt = (int)$opt;
                if (isset($counts[$opt])) {
                    $counts[$opt]++;
                    $totalVotes++;
                }
            }
        }
    }

    $out = "📊 Результаты голосования книжного клуба (Неделя №{$currentWeek}) 🗳️\n\n";
    $out .= "Всего отдано голосов: {$totalVotes}\n\n";

    $barWidth = 10;
    $leaderOpt = null;
    $maxVotes = -1;

    foreach ($options as $num => $item) {
        $cnt = $counts[$num];
        $pct = $totalVotes > 0 ? round(($cnt / $totalVotes) * 100) : 0;
        $filled = $totalVotes > 0 ? (int)round(($cnt / $totalVotes) * $barWidth) : 0;
        $empty = $barWidth - $filled;
        $bar = str_repeat('█', $filled) . str_repeat('░', $empty);

        if ($cnt > $maxVotes && $cnt > 0) {
            $maxVotes = $cnt;
            $leaderOpt = $num;
        }

        $out .= "{$num}️⃣ {$item['title']} — {$item['author']}\n";
        $out .= "   [{$bar}] {$pct}% ({$cnt} " . vk_bot_plural_votes($cnt) . ")\n\n";
    }

    if ($leaderOpt !== null) {
        $l = $options[$leaderOpt];
        $out .= "🏆 В данный момент лидирует: {$l['title']} ({$l['author']})!\n\n";
    } else {
        $out .= "💡 Вы можете проголосовать первым кнопками ниже или отправив номер книги (1, 2, 3 или 4)!\n\n";
    }

    $out .= "Итоги будут подведены в воскресенье, а книга-победитель станет главной темой следующей недели! ✨";
    return $out;
}

/**
 * Форматирование оставшегося времени ограничения в понятную строку
 */
function vk_bot_format_remaining_time($sec)
{
    if ($sec >= 315360000) return 'навсегда';
    if ($sec <= 0) return '0 сек.';

    $days = (int)floor($sec / 86400);
    $hours = (int)floor(($sec % 86400) / 3600);
    $minutes = (int)floor(($sec % 3600) / 60);

    $parts = [];
    if ($days > 0) $parts[] = "{$days} дн.";
    if ($hours > 0) $parts[] = "{$hours} ч.";
    if ($minutes > 0) $parts[] = "{$minutes} мин.";
    if (empty($parts)) $parts[] = "меньше минуты";

    return implode(' ', $parts);
}

/**
 * Извлечение продолжительности ограничения и причины из текста команды
 */
function vk_bot_extract_duration_and_reason($rest)
{
    $rest = trim($rest);
    if ($rest === '') return [null, null, ''];

    // Навсегда
    if (preg_match('/^(?:на\s*)?(?:навсегда|вечно|пермач|насовсем|перманентн[а-я]*)\b(?:\s*(?:за\s*)?(.*))?$/ui', $rest, $m)) {
        return [315360000, 'навсегда', trim($m[1] ?? '')];
    }
    // Месяцы
    if (preg_match('/^(?:на\s*)?(\d+)?\s*(?:мес|месяц[а-я]*)\b(?:\s*(?:за\s*)?(.*))?$/ui', $rest, $m)) {
        $n = !empty($m[1]) ? (int)$m[1] : 1;
        $label = $n === 1 ? '1 месяц' : "{$n} мес.";
        return [$n * 30 * 86400, $label, trim($m[2] ?? '')];
    }
    // Недели
    if (preg_match('/^(?:на\s*)?(\d+)?\s*(?:нед|недел[а-я]*)\b(?:\s*(?:за\s*)?(.*))?$/ui', $rest, $m)) {
        $n = !empty($m[1]) ? (int)$m[1] : 1;
        $label = $n === 1 ? '1 неделю' : "{$n} нед.";
        return [$n * 7 * 86400, $label, trim($m[2] ?? '')];
    }
    // Сутки / день
    if (preg_match('/^(?:на\s*)?(\d+)?\s*(?:сут(?:ок|ки)?|дн(?:ей|я)?|день)\b(?:\s*(?:за\s*)?(.*))?$/ui', $rest, $m)) {
        $n = !empty($m[1]) ? (int)$m[1] : 1;
        $label = $n === 1 ? 'сутки (24ч)' : "{$n} дн.";
        return [$n * 86400, $label, trim($m[2] ?? '')];
    }
    // Часы
    if (preg_match('/^(?:на\s*)?(\d+)?\s*(?:час[а-я]*|ч)\b(?:\s*(?:за\s*)?(.*))?$/ui', $rest, $m)) {
        $n = !empty($m[1]) ? (int)$m[1] : 1;
        $label = $n === 1 ? '1 час' : ($n < 5 ? "{$n} часа" : "{$n} часов");
        return [$n * 3600, $label, trim($m[2] ?? '')];
    }
    // Минуты
    if (preg_match('/^(?:на\s*)?(\d+)\s*(?:мин[а-я]*|м)\b(?:\s*(?:за\s*)?(.*))?$/ui', $rest, $m)) {
        $n = (int)$m[1];
        return [$n * 60, "{$n} мин.", trim($m[2] ?? '')];
    }

    return [null, null, $rest];
}

/**
 * Определение целевого пользователя (нарушителя) из реплая, пересланных сообщений или упоминания
 */
function vk_bot_extract_target_user($msgObj, $text)
{
    if (!empty($msgObj['reply_message']['from_id'])) {
        return (int)$msgObj['reply_message']['from_id'];
    }
    if (!empty($msgObj['fwd_messages'][0]['from_id'])) {
        return (int)$msgObj['fwd_messages'][0]['from_id'];
    }
    if (preg_match('/\[(?:id|club)(\d+)\|[^\]]+\]/ui', $text, $m)) {
        return (int)$m[1];
    }
    if (preg_match('/(?:@|\*)id(\d+)/ui', $text, $m)) {
        return (int)$m[1];
    }
    if (preg_match('/(?:vk\.com\/)?id(\d+)/ui', $text, $m)) {
        return (int)$m[1];
    }
    if (preg_match('/^\s*(\d{1,15})\s*$/ui', $text, $m)) {
        return (int)$m[1];
    }
    return 0;
}

/**
 * Парсинг модераторских команд (!мут, !кик, !бан, !размут, !разбан и т.п.)
 */
function vk_bot_parse_mod_command($userMsg, $msgObj)
{
    $clean = trim($userMsg);
    $clean = preg_replace('/^\s*(?:космо|робот\s*космо|бот)[\s,!:—?]+/ui', '', $clean);

    $type = null;
    $rem = '';
    if (preg_match('/^(?:[!|\/]|\b)(?:мут|mute|замутить|замут)\b/ui', $clean)) {
        $type = 'mute';
        $rem = preg_replace('/^(?:[!|\/]|\b)(?:мут|mute|замутить|замут)\b/ui', '', $clean);
    } elseif (preg_match('/^(?:[!|\/]|\b)(?:размут|unmute|размутить)\b/ui', $clean)) {
        $type = 'unmute';
        $rem = preg_replace('/^(?:[!|\/]|\b)(?:размут|unmute|размутить)\b/ui', '', $clean);
    } elseif (preg_match('/^(?:[!|\/]|\b)(?:кик|kick|исключи(?:ть)?|кикнуть)\b/ui', $clean)) {
        $type = 'kick';
        $rem = preg_replace('/^(?:[!|\/]|\b)(?:кик|kick|исключи(?:ть)?|кикнуть)\b/ui', '', $clean);
    } elseif (preg_match('/^(?:[!|\/]|\b)(?:бан|ban|забань|забанить)\b/ui', $clean)) {
        $type = 'ban';
        $rem = preg_replace('/^(?:[!|\/]|\b)(?:бан|ban|забань|забанить)\b/ui', '', $clean);
    } elseif (preg_match('/^(?:[!|\/]|\b)(?:разбан|unban|разбань|разбанить)\b/ui', $clean)) {
        $type = 'unban';
        $rem = preg_replace('/^(?:[!|\/]|\b)(?:разбан|unban|разбань|разбанить)\b/ui', '', $clean);
    } elseif (preg_match('/^(?:[!|\/]|\b)(?:kk|кк|амнистия|помиловать|помилование)\b/ui', $clean)) {
        $type = 'kk';
        $rem = preg_replace('/^(?:[!|\/]|\b)(?:kk|кк|амнистия|помиловать|помилование)\b/ui', '', $clean);
    } elseif (preg_match('/^(?:[!|\/]|\b)(?:муты|список\s*мутов|muted)\b/ui', $clean)) {
        $type = 'list_mutes';
    } elseif (preg_match('/^(?:[!|\/]|\b)(?:баны|список\s*банов|banned)\b/ui', $clean)) {
        $type = 'list_bans';
    } elseif (preg_match('/^(?:[!|\/]|\b)(?:модераци[яи]|команды\s*модерации|помощь\s*модератора|modhelp)\b/ui', $clean)) {
        $type = 'mod_help';
    } elseif (preg_match('/^(?:[!|\/](?:help|хелп|adminhelp|admin_help|админхелп)|(?:[!|\/]|\b)(?:команды\s*администратора|помощь\s*администратора|adminhelp|хелп))\b/ui', $clean)) {
        $type = 'admin_help';
        $rem = preg_replace('/^(?:[!|\/](?:help|хелп|adminhelp|admin_help|админхелп)|(?:[!|\/]|\b)(?:команды\s*администратора|помощь\s*администратора|adminhelp|хелп))\b/ui', '', $clean);
    }

    if ($type === null) return null;

    $targetId = vk_bot_extract_target_user($msgObj, $rem);
    $remWithoutTarget = preg_replace('/\[(?:id|club)\d+\|[^\]]+\]/ui', '', $rem);
    $remWithoutTarget = preg_replace('/(?:@|\*)id\d+\b/ui', '', $remWithoutTarget);
    $remWithoutTarget = preg_replace('/(?:https?:\/\/)?(?:m\.)?vk\.com\/id\d+\b/ui', '', $remWithoutTarget);
    if ($targetId > 0 && preg_match('/^\s*id\d+\b/ui', $rem)) {
        $remWithoutTarget = preg_replace('/^\s*id\d+\b/ui', '', $remWithoutTarget);
    }
    if ($targetId > 0 && preg_match('/^\s*\d{1,15}\s*$/u', $rem)) {
        $remWithoutTarget = '';
    }
    $remWithoutTarget = trim($remWithoutTarget);

    return [
        'type'      => $type,
        'target_id' => $targetId,
        'rest'      => $remWithoutTarget,
        'raw_arg'   => trim($rem)
    ];
}

/**
 * Проверка, включен ли стёбный режим «Гопник» для данного чата/диалога
 *
 * @param int $peerId
 * @param string $cacheDir
 * @return bool
 */
function vk_bot_is_gopnik_mode($peerId, $cacheDir)
{
    $file = $cacheDir . '/vk_gopnik_' . $peerId . '.json';
    if (!file_exists($file) || !is_readable($file)) {
        return false;
    }
    $data = @json_decode(@file_get_contents($file), true);
    return !empty($data['enabled']);
}

/**
 * Включение или выключение режима «Гопник» для чата/диалога
 *
 * @param int $peerId
 * @param bool $enabled
 * @param int $fromId
 * @param string $userName
 * @param string $cacheDir
 * @return bool
 */
function vk_bot_set_gopnik_mode($peerId, bool $enabled, $fromId, $userName, $cacheDir)
{
    $file = $cacheDir . '/vk_gopnik_' . $peerId . '.json';
    $data = [
        'enabled'         => $enabled,
        'updated_at'      => time(),
        'updated_by'      => $fromId,
        'updated_by_name' => $userName,
    ];
    return (@file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)) !== false);
}

/**
 * Парсинг команд управления режимом «Гопник» (/gopnik on, /gopnik off, !gopnik on/off, /гопник вкл/выкл)
 *
 * @param string $userMsg
 * @return array|null ['action' => 'on'|'off'|'status', 'raw' => string]
 */
function vk_bot_parse_gopnik_command($userMsg)
{
    if (!is_string($userMsg) || trim($userMsg) === '') {
        return null;
    }

    $clean = trim($userMsg);
    // Очищаем обращение к сообществу и боту в начале сообщения ([club123|...], @club123, Космо и т.д.)
    $clean = preg_replace('/^(?:\s*(?:\[club\d+\|[^\]]+\]|@club\d+|(?:космос|космо|робот\s*космо|бот))[\s,!:—?]*)+/ui', '', $clean);
    $clean = trim($clean);

    if (!preg_match('/^(?:[!|\/]|\b)(?:gopnik|гопник)\b\s*(.*)$/ui', $clean, $m)) {
        return null;
    }

    $arg = function_exists('mb_strtolower') ? mb_strtolower(trim($m[1] ?? ''), 'UTF-8') : strtolower(trim($m[1] ?? ''));
    if ($arg === 'on' || $arg === '1' || $arg === 'вкл' || $arg === 'включить' || $arg === 'активировать' || $arg === 'старт' || $arg === 'start') {
        return ['action' => 'on', 'raw' => $clean];
    } elseif ($arg === 'off' || $arg === '0' || $arg === 'выкл' || $arg === 'выключить' || $arg === 'деактивировать' || $arg === 'стоп' || $arg === 'stop') {
        return ['action' => 'off', 'raw' => $clean];
    } elseif ($arg === '' || $arg === 'статус' || $arg === 'status' || $arg === 'инфо' || $arg === 'info') {
        return ['action' => 'status', 'raw' => $clean];
    }

    return ['action' => 'status', 'raw' => $clean];
}

/**
 * Получение списка участников и администраторов беседы
 */
function vk_bot_get_chat_members($peerId, $token, $cacheDir, $forceRefresh = false)
{
    $cacheFile = $cacheDir . '/vk_members_' . $peerId . '.json';
    if (!$forceRefresh && file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 60) {
        $data = @json_decode(@file_get_contents($cacheFile), true);
        if (is_array($data) && !empty($data['items'])) {
            return $data;
        }
    }

    list($httpCode, $resp) = vk_bot_api_call('messages.getConversationMembers', [
        'peer_id' => $peerId
    ], $token);

    if ($httpCode === 200 && is_array($resp) && !empty($resp['response']['items'])) {
        $result = [
            'items'    => $resp['response']['items'],
            'profiles' => $resp['response']['profiles'] ?? [],
            'groups'   => $resp['response']['groups'] ?? [],
            'cached_at'=> time()
        ];
        @file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_UNICODE));
        return $result;
    }

    return null;
}

/**
 * Получение профиля пользователя ВКонтакте (id, first_name, last_name, name, screen_name)
 * строго из официального профиля ВК через метод users.get с параметром lang=ru.
 * Реализует многоуровневый fallback: токен сообщества -> сервисный токен.
 * Кэширует ТОЛЬКО успешно полученные реальные имена на 1 час (3600 с).
 * Категорически запрещено кэшировать значение «Читатель»!
 */
function vk_bot_get_user_profile($userId, $token, $cacheDir)
{
    global $serviceToken;
    $userId = (int)$userId;
    if ($userId <= 0) {
        return [
            'id'          => $userId,
            'first_name'  => 'Читатель',
            'last_name'   => '',
            'name'        => 'Читатель',
            'screen_name' => ''
        ];
    }

    $cacheFile = $cacheDir . '/vk_user_name_' . $userId . '.json';
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 3600) {
        $cached = @json_decode(@file_get_contents($cacheFile), true);
        if (!empty($cached['name']) && $cached['name'] !== 'Читатель' && $cached['name'] !== 'Участник' && $cached['name'] !== 'Пользователь') {
            return [
                'id'          => $userId,
                'first_name'  => $cached['first_name'] ?? (explode(' ', $cached['name'])[0] ?? $cached['name']),
                'last_name'   => $cached['last_name'] ?? (explode(' ', $cached['name'])[1] ?? ''),
                'name'        => $cached['name'],
                'screen_name' => $cached['screen_name'] ?? ''
            ];
        }
    }

    $userData = null;

    // 1. Прямой запрос к официальному профилю ВК через users.get с lang=ru (токен сообщества)
    if (!empty($token)) {
        list($httpCode, $resp) = vk_bot_api_call('users.get', [
            'user_ids' => $userId,
            'fields'   => 'first_name,last_name,screen_name',
            'lang'     => 'ru'
        ], $token);

        if ($httpCode === 200 && !empty($resp['response'][0])) {
            $userData = $resp['response'][0];
        }
    }

    // 2. Резервный запрос через сервисный токен (если communityToken не ответил или вернул ошибку)
    if (empty($userData) && !empty($serviceToken)) {
        list($httpCode, $resp) = vk_bot_api_call('users.get', [
            'user_ids' => $userId,
            'fields'   => 'first_name,last_name,screen_name',
            'lang'     => 'ru'
        ], $serviceToken);

        if ($httpCode === 200 && !empty($resp['response'][0])) {
            $userData = $resp['response'][0];
        }
    }

    if (!empty($userData)) {
        $fn = trim($userData['first_name'] ?? '');
        $ln = trim($userData['last_name'] ?? '');
        $fullName = trim($fn . ' ' . $ln);
        if ($fullName === '') {
            $fullName = $fn ?: ($ln ?: 'Читатель');
        }
        $screenName = trim($userData['screen_name'] ?? '');

        // Кэшируем ТОЛЬКО реальное имя! Никогда не кэшируем «Читатель»
        if ($fullName !== 'Читатель' && $fullName !== 'Участник' && $fullName !== 'Пользователь' && $fullName !== '') {
            @file_put_contents($cacheFile, json_encode([
                'id'          => $userId,
                'name'        => $fullName,
                'first_name'  => $fn ?: $fullName,
                'last_name'   => $ln,
                'screen_name' => $screenName,
                'cached_at'   => time()
            ], JSON_UNESCAPED_UNICODE));

            return [
                'id'          => $userId,
                'first_name'  => $fn ?: $fullName,
                'last_name'   => $ln,
                'name'        => $fullName,
                'screen_name' => $screenName
            ];
        }
    }

    return [
        'id'          => $userId,
        'first_name'  => 'Читатель',
        'last_name'   => '',
        'name'        => 'Читатель',
        'screen_name' => ''
    ];
}

/**
 * Получение точного имени пользователя из его профиля ВКонтакте (first_name + last_name)
 * с приоритетом официального профиля ВК (users.get, lang=ru).
 */
function vk_bot_get_user_name($userId, $token, $cacheDir, $peerId = 0)
{
    // 1. Первоочередно запрашиваем официальный профиль ВКонтакте
    $profile = vk_bot_get_user_profile($userId, $token, $cacheDir);
    if (!empty($profile['name']) && $profile['name'] !== 'Читатель' && $profile['name'] !== 'Участник' && $profile['name'] !== 'Пользователь') {
        return $profile['name'];
    }

    // 2. Резерв для беседы: если users.get не вернул профиль — ищем в участниках чата
    if ($peerId > 2000000000) {
        $membersData = vk_bot_get_chat_members($peerId, $token, $cacheDir);
        if (!empty($membersData['profiles'])) {
            foreach ($membersData['profiles'] as $p) {
                if ((int)($p['id'] ?? 0) === (int)$userId) {
                    $fn = trim(($p['first_name'] ?? '') . ' ' . ($p['last_name'] ?? ''));
                    if ($fn !== '' && $fn !== 'Участник' && $fn !== 'Пользователь' && $fn !== 'Читатель') {
                        return $fn;
                    }
                }
            }
        }
    }

    return 'Читатель';
}

/**
 * Получение информации об участнике беседы (роль, имя)
 */
function vk_bot_get_member_info($peerId, $userId, $token, $cacheDir)
{
    $data = vk_bot_get_chat_members($peerId, $token, $cacheDir);

    $info = [
        'user_id'  => $userId,
        'is_admin' => false,
        'is_owner' => false,
        'name'     => ''
    ];

    if ($data && !empty($data['items'])) {
        foreach ($data['items'] as $item) {
            if ((int)($item['member_id'] ?? 0) === $userId) {
                $info['is_admin'] = !empty($item['is_admin']);
                $info['is_owner'] = !empty($item['is_owner']);
                break;
            }
        }
    }

    if ($data && !empty($data['profiles'])) {
        foreach ($data['profiles'] as $p) {
            if ((int)($p['id'] ?? 0) === $userId) {
                $fn = trim(($p['first_name'] ?? '') . ' ' . ($p['last_name'] ?? ''));
                if ($fn !== '') {
                    $info['name'] = $fn;
                    break;
                }
            }
        }
    }

    if (empty($info['name']) || $info['name'] === 'Пользователь' || $info['name'] === 'Участник') {
        $info['name'] = vk_bot_get_user_name($userId, $token, $cacheDir, $peerId);
    }

    return $info;
}

/**
 * Проверка: является ли робот Космо администратором беседы
 */
function vk_bot_is_cosmo_admin($peerId, $vkGroupId, $token, $cacheDir)
{
    $data = vk_bot_get_chat_members($peerId, $token, $cacheDir);
    if (!$data) return false;
    $cosmoId = -$vkGroupId;

    foreach ($data['items'] as $item) {
        if ((int)($item['member_id'] ?? 0) === $cosmoId) {
            return !empty($item['is_admin']);
        }
    }
    return false;
}

/**
 * Проверка: является ли пользователь администратором/руководителем сообщества ВКонтакте
 */
function vk_bot_is_group_admin($userId, $vkGroupId, $token, $cacheDir)
{
    $userId = (int)$userId;
    $vkGroupId = (int)$vkGroupId;
    if ($userId <= 0 || $vkGroupId <= 0) return false;

    $cacheFile = $cacheDir . '/vk_group_managers_' . $vkGroupId . '.json';
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 300) {
        $managers = @json_decode(@file_get_contents($cacheFile), true);
        if (is_array($managers)) {
            return in_array($userId, $managers, true);
        }
    }

    list($code, $resp) = vk_bot_api_call('groups.getMembers', [
        'group_id' => $vkGroupId,
        'filter'   => 'managers'
    ], $token);

    if ($code === 200 && is_array($resp) && !empty($resp['response']['items'])) {
        $managerIds = [];
        foreach ($resp['response']['items'] as $item) {
            $mid = is_array($item) ? (int)($item['id'] ?? 0) : (int)$item;
            if ($mid > 0) {
                $managerIds[] = $mid;
            }
        }
        @file_put_contents($cacheFile, json_encode($managerIds, JSON_UNESCAPED_UNICODE));
        return in_array($userId, $managerIds, true);
    }

    return false;
}

/**
 * Проверка: является ли пользователь администратором в любой известной беседе из кэша
 */
function vk_bot_is_chat_admin_anywhere($userId, $cacheDir)
{
    $userId = (int)$userId;
    if ($userId <= 0 || !is_dir($cacheDir)) return false;

    $files = @glob($cacheDir . '/vk_members_*.json');
    if (is_array($files)) {
        foreach ($files as $f) {
            $data = @json_decode(@file_get_contents($f), true);
            if (!empty($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $it) {
                    if ((int)($it['member_id'] ?? 0) === $userId) {
                        if (!empty($it['is_admin']) || !empty($it['is_owner'])) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}

/**
 * Формирование полного справочника всех команд робота Космо для администраторов
 */
function vk_bot_get_admin_help_text($vkGroupId = 0)
{
    $text = "🛠️ СПРАВОЧНИК ВСЕХ КОМАНД РОБОТА КОСМО ДЛЯ АДМИНИСТРАТОРОВ 🤖\n"
          . "🔐 Конфиденциальный реестр системы (виден только администраторам)\n\n"
          . "🛡️ 1. МОДЕРАЦИЯ И УПРАВЛЕНИЕ БЕСЕДОЙ\n"
          . "• /kk [пользователь/имя] — ПОЛНАЯ АМНИСТИЯ: досрочно снимает мут, удаляет из чёрного списка (разбан) и обнуляет варны за мат (0/3).\n"
          . "  ↳ Синонимы: !kk, /кк, !кк, амнистия, помиловать (или ответ на сообщение).\n"
          . "  ↳ Умный поиск: по имени/фамилии (даже исключённых), ссылке, нику или ID.\n"
          . "• !мут [время] [причина] — режим молчания (сообщения удаляются). Без параметров в реплай — кнопки!\n"
          . "• !размут [пользователь] — досрочно снять режим молчания.\n"
          . "• !кик [пользователь] [причина] — исключить участника из беседы.\n"
          . "• !бан [время] [причина] — исключить с блокировкой повторного входа.\n"
          . "• !разбан [пользователь] — удалить участника из чёрного списка.\n"
          . "• !муты — список текущих замученных участников со сроками окончания.\n"
          . "• !баны — чёрный список заблокированных участников беседы.\n"
          . "• !модерация / !modhelp — краткая памятка по командам модератора.\n"
          . "• /help / /хелп — полный закрытый реестр всех команд (только админам в ЛС).\n\n"
          . "🧠 2. АВТО-БЕЗОПАСНОСТЬ И НЕЙРОСЕТИ\n"
          . "• Трёхступенчатая авто-модерация мата: удаление + варны (1/3, 2/3 ➔ мут 15м ➔ мут 1ч ➔ кик). Белый список: рубль, колеблется, потреблять и др.\n"
          . "• Vision AI модерация картинок: авто-сканирование фото нейросетью на 18+ контент с удалением.\n"
          . "• Голосовой Космо (STT): приём голосовых сообщений и распознавание речи.\n"
          . "• Имена из профилей ВК: подтягивание реальных имён участников (users.get).\n"
          . "• Защита от иноагентов: строжайший запрет на авторов-иноагентов.\n"
          . "• /ino [имя/ФИО] / !ino / /ино — официальная проверка и поиск по Единому реестру иноагентов Минюста РФ (255-ФЗ).\n\n"
          . "📚 3. КНИГИ И ЭЛЕКТРОННЫЙ КАТАЛОГ (OPAC)\n"
          . "• /книга [название] / !книга / /поиск [автор/книга] / /opac / /к — поиск книг в каталоге OPAC-Global (база 62) по 18 филиалам Владимира (адреса, шифры, статус «В наличии»).\n"
          . "  ↳ NLP/голос: «Космо, найди книгу ...», «В каком филиале есть ...», «Есть ли на Егорова ...».\n"
          . "  ↳ Филиал №4: ул. Егорова, 10, жилой район «Доброе» (не в центре!).\n"
          . "• Книга дня / Рекомендация — ежедневная книга с аннотацией и цитатой.\n"
          . "• Книга недели / Книжный клуб — книга недели для совместного чтения.\n"
          . "• Голосование / Выбор книги — запуск голосования с кнопками.\n"
          . "• Подбор книги / Что почитать — подбор книги по настроению.\n\n"
          . "🎮 4. ИНТЕРАКТИВ И ВИКТОРИНЫ\n"
          . "• !квиз [тема] / /квиз / викторина — литературный квиз с 4 вариантами и баллами.\n"
          . "• !счет / !топ / знатоки — таблица лидеров и рекордсменов квиза.\n"
          . "• !опрос [тема] / /опрос — читательский интерактивный опрос с подсчётом.\n"
          . "• Стикеры / Стикерпак — 17 прозрачных стикеров Космо и ссылки.\n\n"
          . "🏛️ 5. БИБЛИОТЕКИ ВЛАДИМИРА И КРАЕВЕДЕНИЕ\n"
          . "• Новости филиалов / Новости — сканирование всех 16 групп библиотек за текущие сутки.\n"
          . "• Библиотеки-филиалы / Адреса библиотек / Филиалы — адреса, телефоны и районы всех 18 филиалов.\n"
          . "• Районные запросы: филиал на Егорова (№4 в Добром), библиотеки в Добром (ЦГБ, ф.4, ф.9), библиотека в центре (ЦДБ, Б. Московская, 31).\n\n"
          . "🎭 6. СТЁБНЫЙ РЕЖИМ «ГОПНИК»\n"
          . "• /gopnik on / !gopnik on / /гопник вкл — включение режима гопника (Космо игнорирует мат, дерзко шутит, критикует и ругается).\n"
          . "• /gopnik off / !gopnik off / /гопник выкл — возврат к академической вежливости и стандартной модерации.\n"
          . "• /gopnik — проверка текущего статуса режима в диалоге.\n\n"
          . "🧭 7. СЕРВИС И НАВИГАЦИЯ\n"
          . "• Меню / Назад / Старт / Начать — главное навигационное меню бота.\n"
          . "• Справка / Помощь — подробный справочник всех команд и возможностей для читателей.\n"
          . "• Кодекс / Правила — правила книжного клуба и общения в чате.\n\n"
          . "💡 Команды можно писать через «/», «!» или в виде обращений: «Космо, новости», «Космо, квиз».";

    return $text;
}

/**
 * Детектор нецензурной лексики (мата) для групповых бесед
 * С учётом корней мата, транслита, спецсимволов и белого списка исключений.
 */
function vk_bot_detect_profanity($text)
{
    if (!is_string($text) || trim($text) === '') return false;

    $raw = function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);
    $raw = str_replace('ё', 'е', $raw);

    // 1. Прямая замена визуальных суррогатов / литспика / омоглифов
    $latMap = [
        'a' => 'а', 'b' => 'б', 'c' => 'с', 'e' => 'е', 'k' => 'к', 'm' => 'м',
        'o' => 'о', 'p' => 'р', 't' => 'т', 'x' => 'х', 'y' => 'у', 'u' => 'и',
        '0' => 'о', '1' => 'и', '3' => 'з', '4' => 'ч', '6' => 'б', '@' => 'а',
        '$' => 'с', '!' => 'и'
    ];
    $v1 = strtr($raw, $latMap);

    // 2. Фонетический транслит латиницы (suka, blyat, pizdec, nahui, ebat, mudak, zaebal)
    $translitPairs = [
        'shch' => 'щ', 'sch' => 'щ', 'ch' => 'ч', 'sh' => 'ш', 'zh' => 'ж',
        'kh' => 'х', 'ts' => 'ц', 'yu' => 'ю', 'ya' => 'я', 'yo' => 'е',
        'hui' => 'хуй', 'huy' => 'хуй', 'hye' => 'хуе', 'xui' => 'хуй', 'xuy' => 'хуй',
        'pizd' => 'пизд', 'blya' => 'бля', 'suka' => 'сука', 'suk' => 'сук',
        'ebat' => 'ебат', 'ebal' => 'ебал', 'zaeb' => 'заеб', 'mudak' => 'мудак',
        'a' => 'а', 'b' => 'б', 'c' => 'с', 'd' => 'д', 'e' => 'е', 'f' => 'ф',
        'g' => 'г', 'h' => 'х', 'i' => 'и', 'j' => 'й', 'k' => 'к', 'l' => 'л',
        'm' => 'м', 'n' => 'н', 'o' => 'о', 'p' => 'п', 'r' => 'р', 's' => 'с',
        't' => 'т', 'u' => 'у', 'v' => 'в', 'w' => 'в', 'x' => 'х', 'y' => 'у',
        'z' => 'з', '0' => 'о', '1' => 'и', '3' => 'з', '4' => 'ч', '6' => 'б',
        '@' => 'а', '$' => 'с', '!' => 'и'
    ];
    $v2 = strtr($raw, $translitPairs);

    $variants = [$v1, $v2];

    // Белый список исключений для нормальных слов без мата
    $whiteList = [
        '/\bхулиган[а-я]*/u',
        '/\bхудож[а-я]*/u',
        '/\bхуд[а-я]*/u',
        '/\bхутор[а-я]*/u',
        '/\bхумус[а-я]*/u',
        '/\bхуди\b/u',
        '/\bхлеб[а-я]*/u',
        '/\bмудр[а-я]*/u',
        '/\bизумруд[а-я]*/u',
        '/\bбигуди\b/u',
        '/\bрубл[а-я]*/u',
        '/\bколеб[а-я]*/u',
        '/\bпотреб[а-я]*/u',
        '/\bупотреб[а-я]*/u',
        '/\bзлоупотреб[а-я]*/u',
        '/\bвлюб[а-я]*/u',
        '/\bоскорб[а-я]*/u',
        '/\bгреб[а-я]*/u',
        '/\bграбл[а-я]*/u',
        '/\bсабл[а-я]*/u',
        '/\bсук[но][а-я]*/u',
        '/\bсук+улент[а-я]*/u',
        '/\bбарсук[а-я]*/u',
        '/\bхула[ -]?хуп[а-я]*/u',
        '/\b[а-я]*страхов[а-я]*/u',
        '/\bпарикмахер[а-я]*/u',
        '/\bскипидар[а-я]*/u',
        '/\bтереб[а-я]*/u',
        '/\bпедал[а-я]*/u',
        '/\bястреб[а-я]*/u',
        '/\bстеб[а-я]*/u',
        '/\bмеб[а-я]*/u',
        '/\bдубликат[а-я]*/u',
        '/\bшаблон[а-я]*/u',
        '/\bпедиатри[а-я]*/u',
        '/\bэпидеми[а-я]*/u',
        '/\bспидометр[а-я]*/u',
        '/\bкулебяк[а-я]*/u',
        '/\bлебед[а-я]*/u',
        '/\bжеребенок[а-я]*/u',
        '/\bсеребр[а-я]*/u',
        '/\bсудебн[а-я]*/u',
        '/\bцелебн[а-я]*/u',
        '/\bтрезубец[а-я]*/u',
        '/\bскрежет[а-я]*/u',
        '/\bотребь[а-я]*/u'
    ];

    $badPatterns = [
        // хуй / хуе / хуя / залуп
        '/(?:\b|[а-я]{0,4})(?:ху[йиеяю]|залуп)[а-я]*/u',
        '/\bхули\b/u',
        // пизд (пизда, пиздец, спиздил и др.)
        '/(?:\b|[а-я]{0,4})пизд[а-я]*/u',
        // еб / ёб (ебать, выеб, поеб, долбоеб, уебок, ебло)
        '/(?:\b|[а-я]{0,4})(?:[её]б[а-я]+|ебл[а-я]*|ебу[а-я]*)/u',
        '/\b[её]б\b/u',
        // бля[дт] / бля
        '/(?:\b|[а-я]{0,3})бля[тд][а-я]*/u',
        '/\bбля\b/u',
        // муд (мудак, мудила, мудозвон, мудоеб)
        '/(?:\b|[а-я]{0,2})муд(?:ак|ил|озвон|оеб|е|я)[а-я]*/u',
        // сук (сука, суки, сучара, сцуко)
        '/\b(?:сук[аиоеу]|сучк[аи]|сучар[а-я]|сцук[ао])[а-я]*/u',
        // гандон / гондон
        '/(?:\b|[а-я]{0,2})г[ао]ндон[а-я]*/u',
        // пидор / пидар / пидарас / пидорас
        '/(?:\b|[а-я]{0,2})пид[ао]р[а-я]*/u'
    ];

    foreach ($variants as $t) {
        // Сначала проверяем текст с сохранением границ слов (сжав повторяющиеся буквы: бляяя -> бля)
        $tNorm = preg_replace('/([а-я])\1+/u', '$1', $t);
        foreach ($whiteList as $wPattern) {
            $tNorm = preg_replace($wPattern, ' [белый] ', $tNorm);
        }
        foreach ($badPatterns as $pattern) {
            if (preg_match($pattern, $tNorm)) {
                return true;
            }
        }

        // Вторым шагом проверяем обфусцированный текст (х.у.й, б л я т ь, п_и_з_д_а)
        $tClean = preg_replace('/(?<=[а-яa-z0-9])[\s._\-*~+=,;:!?\/\\\]+(?=[а-яa-z0-9])/ui', '', $t);
        $tClean = preg_replace('/([а-я])\1+/u', '$1', $tClean);

        foreach ($whiteList as $wPattern) {
            $tClean = preg_replace($wPattern, ' [белый] ', $tClean);
        }

        foreach ($badPatterns as $pattern) {
            if (preg_match($pattern, $tClean)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Удаление сообщения из беседы для всех участников
 */
function vk_bot_delete_chat_message($peerId, $cmid, $token, $groupId)
{
    if ($peerId <= 0 || $cmid <= 0) return false;
    list($code, $res) = vk_bot_api_call('messages.delete', [
        'peer_id'                  => $peerId,
        'conversation_message_ids' => $cmid,
        'delete_for_all'           => 1,
        'group_id'                 => $groupId
    ], $token);
    return ($code === 200 && empty($res['error']));
}

/**
 * Извлечение прямых ссылок на изображения из сообщения (фотографии и документы-изображения)
 */
function vk_bot_extract_photo_urls($msgObj)
{
    $urls = [];
    if (!empty($msgObj['attachments']) && is_array($msgObj['attachments'])) {
        foreach ($msgObj['attachments'] as $att) {
            $type = $att['type'] ?? '';
            if ($type === 'photo' && !empty($att['photo']['sizes']) && is_array($att['photo']['sizes'])) {
                $bestSize = end($att['photo']['sizes']);
                $url = $bestSize['url'] ?? '';
                if ($url !== '') $urls[] = $url;
            } elseif ($type === 'doc' && !empty($att['doc']['url'])) {
                $ext = strtolower((string)($att['doc']['ext'] ?? ''));
                if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
                    $urls[] = $att['doc']['url'];
                }
            }
        }
    }
    return $urls;
}

/**
 * Распознавание вульгарных, порнографических, эротических или содержащих нецензурную брань изображений (Vision AI)
 * Использует модель minimax/minimax-m3:free с отказоустойчивой ротацией по пулу ИИ-ключей xkiro
 * Возвращает ['is_vulgar' => bool, 'reason' => string]
 */
function vk_bot_detect_vulgar_image($photoUrl, $aiKeys, $aiBaseUrl = 'https://api.xkiro.com/v1')
{
    if (empty($photoUrl) || empty($aiKeys)) {
        return ['is_vulgar' => false, 'reason' => ''];
    }

    // Скачиваем изображение во временный буфер (до 4 МБ)
    $chDl = curl_init($photoUrl);
    curl_setopt_array($chDl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AURORA-Vision-Mod/4.38.0',
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);
    $imgData = curl_exec($chDl);
    $httpCode = (int)curl_getinfo($chDl, CURLINFO_RESPONSE_CODE);
    $mimeType = (string)curl_getinfo($chDl, CURLINFO_CONTENT_TYPE);
    curl_close($chDl);

    if ($httpCode !== 200 || !$imgData || strlen($imgData) < 100) {
        return ['is_vulgar' => false, 'reason' => 'download_failed'];
    }

    if (empty($mimeType) || strpos($mimeType, 'image/') !== 0) {
        $mimeType = 'image/jpeg';
    }
    if (strpos($mimeType, ';') !== false) {
        $mimeType = trim(explode(';', $mimeType)[0]);
    }

    $b64 = base64_encode($imgData);

    $promptText = "Проанализируй изображение. Содержит ли оно порнографию, наготу, эротику, непристойный/вульгарный контент или нецензурную брань/мат на русском/английском языке (включая мемы и надписи)? Ответь строго в формате JSON без разметки: {\"is_vulgar\": true/false, \"reason\": \"краткая причина на русском\"}";

    $payload = [
        'model' => 'minimax/minimax-m3:free',
        'messages' => [
            [
                'role' => 'user',
                'content' => [
                    [
                        'type' => 'text',
                        'text' => $promptText
                    ],
                    [
                        'type' => 'image_url',
                        'image_url' => [
                            'url' => 'data:' . $mimeType . ';base64,' . $b64
                        ]
                    ]
                ]
            ]
        ],
        'max_tokens'  => 180,
        'temperature' => 0.1
    ];
    $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE);

    // Ротация по пулу ключей xkiro
    foreach ($aiKeys as $key) {
        $chAi = curl_init($aiBaseUrl . '/chat/completions');
        curl_setopt_array($chAi, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payloadJson,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $key,
                'Content-Type: application/json'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false
        ]);
        $resp = curl_exec($chAi);
        $code = (int)curl_getinfo($chAi, CURLINFO_RESPONSE_CODE);
        curl_close($chAi);

        if ($code === 200 && is_string($resp) && strlen($resp) > 0) {
            $json = json_decode($resp, true);
            $content = $json['choices'][0]['message']['content'] ?? '';
            if (is_string($content) && preg_match('/\{.*?\}/s', $content, $m)) {
                $parsed = json_decode($m[0], true);
                if (is_array($parsed) && isset($parsed['is_vulgar'])) {
                    return [
                        'is_vulgar' => (bool)$parsed['is_vulgar'],
                        'reason'    => (string)($parsed['reason'] ?? '')
                    ];
                }
            }
        }
    }

    return ['is_vulgar' => false, 'reason' => ''];
}

/**
 * Проверка: находится ли пользователь в режиме молчания (муте)
 */
function vk_bot_is_user_muted($peerId, $userId, $cacheDir)
{
    if ($peerId <= 0 || $userId <= 0) return null;
    $file = $cacheDir . '/vk_muted_' . $peerId . '.json';
    if (!file_exists($file)) return null;

    $data = @json_decode(@file_get_contents($file), true);
    if (!is_array($data) || empty($data[(string)$userId])) return null;

    $info = $data[(string)$userId];
    $now = time();
    if ($now < (int)($info['muted_until'] ?? 0)) {
        return $info;
    }

    // Мут истёк — удаляем
    unset($data[(string)$userId]);
    @file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    return null;
}

/**
 * Сохранение пользователя в режиме молчания
 */
function vk_bot_mute_user($peerId, $targetId, $targetName, $adminId, $seconds, $label, $reason, $cacheDir)
{
    if ($peerId <= 0 || $targetId <= 0) return false;
    $file = $cacheDir . '/vk_muted_' . $peerId . '.json';
    $data = [];
    if (file_exists($file)) {
        $loaded = @json_decode(@file_get_contents($file), true);
        if (is_array($loaded)) $data = $loaded;
    }

    $data[(string)$targetId] = [
        'user_id'          => $targetId,
        'user_name'        => $targetName,
        'muted_by'         => $adminId,
        'muted_at'         => time(),
        'muted_until'      => time() + $seconds,
        'duration_seconds' => $seconds,
        'duration_label'   => $label,
        'reason'           => $reason !== '' ? $reason : 'Нарушение правил беседы'
    ];

    $fh = @fopen($file, 'c+');
    if ($fh) {
        if (@flock($fh, LOCK_EX)) {
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            fflush($fh);
            @flock($fh, LOCK_UN);
        }
        fclose($fh);
        return true;
    }
    return false;
}

/**
 * Досрочное снятие режима молчания
 */
function vk_bot_unmute_user($peerId, $targetId, $cacheDir)
{
    if ($peerId <= 0 || $targetId <= 0) return false;
    $file = $cacheDir . '/vk_muted_' . $peerId . '.json';
    if (!file_exists($file)) return false;

    $data = @json_decode(@file_get_contents($file), true);
    if (!is_array($data) || !isset($data[(string)$targetId])) return false;

    unset($data[(string)$targetId]);
    $fh = @fopen($file, 'c+');
    if ($fh) {
        if (@flock($fh, LOCK_EX)) {
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            fflush($fh);
            @flock($fh, LOCK_UN);
        }
        fclose($fh);
        return true;
    }
    return false;
}

/**
 * Получение данных о бане пользователя (с проверкой истечения срока)
 */
function vk_bot_get_user_ban($peerId, $userId, $cacheDir)
{
    if ($peerId <= 0 || $userId <= 0) return null;
    $file = $cacheDir . '/vk_banned_' . $peerId . '.json';
    if (!file_exists($file)) return null;

    $data = @json_decode(@file_get_contents($file), true);
    if (!is_array($data) || empty($data[(string)$userId])) return null;

    $info = $data[(string)$userId];
    $now = time();
    $until = (int)($info['banned_until'] ?? 0);
    // Если срок бана был задан и уже истёк — удаляем из чёрного списка
    if ($until > 0 && $now >= $until) {
        unset($data[(string)$userId]);
        $fh = @fopen($file, 'c+');
        if ($fh) {
            if (@flock($fh, LOCK_EX)) {
                ftruncate($fh, 0);
                rewind($fh);
                fwrite($fh, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                fflush($fh);
                @flock($fh, LOCK_UN);
            }
            fclose($fh);
        }
        return null;
    }

    return $info;
}

/**
 * Проверка: находится ли пользователь в чёрном списке беседы
 */
function vk_bot_is_user_banned($peerId, $userId, $cacheDir)
{
    return (vk_bot_get_user_ban($peerId, $userId, $cacheDir) !== null);
}

/**
 * Исключение пользователя и занесение в чёрный список беседы на выбранный срок
 */
function vk_bot_ban_user($peerId, $targetId, $targetName, $adminId, $durSec, $durLabel, $reason, $cacheDir, $token)
{
    if ($peerId <= 0 || $targetId <= 0) return false;

    $chatId = $peerId - 2000000000;
    vk_bot_api_call('messages.removeChatUser', [
        'chat_id'   => $chatId,
        'member_id' => $targetId
    ], $token);

    $file = $cacheDir . '/vk_banned_' . $peerId . '.json';
    $data = [];
    if (file_exists($file)) {
        $loaded = @json_decode(@file_get_contents($file), true);
        if (is_array($loaded)) $data = $loaded;
    }

    $durSec = (int)$durSec;
    if ($durSec <= 0) {
        $durSec = 315360000; // По умолчанию навсегда (~10 лет)
        $durLabel = 'навсегда';
    }

    $data[(string)$targetId] = [
        'user_id'          => $targetId,
        'user_name'        => $targetName,
        'banned_by'        => $adminId,
        'banned_at'        => time(),
        'banned_until'     => time() + $durSec,
        'duration_seconds' => $durSec,
        'duration_label'   => $durLabel,
        'reason'           => $reason !== '' ? $reason : 'Нарушение правил беседы'
    ];

    $fh = @fopen($file, 'c+');
    if ($fh) {
        if (@flock($fh, LOCK_EX)) {
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            fflush($fh);
            @flock($fh, LOCK_UN);
        }
        fclose($fh);
        return true;
    }
    return false;
}

/**
 * Удаление пользователя из чёрного списка беседы
 */
function vk_bot_unban_user($peerId, $targetId, $cacheDir)
{
    if ($peerId <= 0 || $targetId <= 0) return false;
    $file = $cacheDir . '/vk_banned_' . $peerId . '.json';
    if (!file_exists($file)) return false;

    $data = @json_decode(@file_get_contents($file), true);
    if (!is_array($data) || !isset($data[(string)$targetId])) return false;

    unset($data[(string)$targetId]);
    $fh = @fopen($file, 'c+');
    if ($fh) {
        if (@flock($fh, LOCK_EX)) {
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            fflush($fh);
            @flock($fh, LOCK_UN);
        }
        fclose($fh);
        return true;
    }
    return false;
}

/**
 * Сброс счётчика предупреждений и нарушений пользователя (vk_profanity_warns_*.json)
 */
function vk_bot_reset_user_warns($peerId, $targetId, $cacheDir)
{
    if ($peerId <= 0 || $targetId <= 0) return false;
    $res = false;
    foreach (['/vk_profanity_warns_' . $peerId . '.json', '/vk_profanity_' . $peerId . '.json'] as $profFileName) {
        $file = $cacheDir . $profFileName;
        if (!file_exists($file)) continue;

        $data = @json_decode(@file_get_contents($file), true);
        if (!is_array($data)) continue;

        $uKey = (string)$targetId;
        if (isset($data[$uKey])) {
            unset($data[$uKey]);
        }

        $fh = @fopen($file, 'c+');
        if ($fh) {
            if (@flock($fh, LOCK_EX)) {
                ftruncate($fh, 0);
                rewind($fh);
                fwrite($fh, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                fflush($fh);
                @flock($fh, LOCK_UN);
            }
            fclose($fh);
            $res = true;
        }
    }
    return $res;
}

/**
 * Комплексная амнистия пользователя: снятие мута, удаление из чёрного списка и сброс варнов
 */
function vk_bot_clear_user_sanctions($peerId, $targetId, $cacheDir)
{
    if ($peerId <= 0 || $targetId <= 0) return false;

    // 1. Снятие режима молчания
    vk_bot_unmute_user($peerId, $targetId, $cacheDir);

    // 2. Удаление из чёрного списка беседы
    vk_bot_unban_user($peerId, $targetId, $cacheDir);

    // 3. Сброс счётчика варнов
    vk_bot_reset_user_warns($peerId, $targetId, $cacheDir);

    // 4. Удаление временного файла предупреждения о муте
    $throttleFile = $cacheDir . '/vk_mute_warn_' . $peerId . '_' . $targetId . '.tmp';
    if (file_exists($throttleFile)) {
        @unlink($throttleFile);
    }

    return true;
}

/**
 * Умный поиск пользователя по имени, нику, ссылке или ID для модерации (/kk, !размут, !разбан)
 * Ищет совпадения в:
 *  а) текущих мутах vk_muted_{peerId}.json
 *  б) текущих банах vk_banned_{peerId}.json
 *  в) участниках беседы vk_bot_get_chat_members($peerId, ...)
 *  г) кэше имен пользователей vk_user_name_*.json
 *  д) VK API (users.get) при наличии screen_name / никнейма
 *
 * @param string $nameQuery       Поисковый запрос (имя, фамилия, ник, ID, ссылка)
 * @param int    $peerId          ID беседы (2000000000 + chat_id)
 * @param string $communityToken  Токен сообщества ВКонтакте
 * @param string $cacheDir        Каталог кэша
 * @return int ID пользователя (>0) или 0, если пользователь не найден
 */
function vk_bot_find_user_by_name($nameQuery, $peerId, $communityToken, $cacheDir)
{
    $raw = trim((string)$nameQuery);
    if ($raw === '') return 0;

    // 1. Быстрая проверка на VK-ссылку или упоминание
    if (preg_match('/\[(?:id|club)(\d+)\|[^\]]+\]/ui', $raw, $m)) {
        return (int)$m[1];
    }
    if (preg_match('/(?:@|\*)id(\d+)\b/ui', $raw, $m)) {
        return (int)$m[1];
    }
    if (preg_match('/(?:https?:\/\/)?(?:m\.)?vk\.com\/id(\d+)\b/ui', $raw, $m)) {
        return (int)$m[1];
    }
    if (preg_match('/^id(\d+)$/ui', $raw, $m)) {
        return (int)$m[1];
    }
    if (preg_match('/^\d{1,15}$/u', $raw)) {
        return (int)$raw;
    }

    // Извлечение никнейма из ссылки или упоминания (например https://vk.com/durov, @durov, *durov)
    $cleanQuery = $raw;
    if (preg_match('/(?:https?:\/\/)?(?:m\.)?vk\.com\/([a-zA-Z0-9_.]+)/ui', $cleanQuery, $m)) {
        $cleanQuery = $m[1];
    } else {
        $cleanQuery = ltrim($cleanQuery, '@*');
    }
    $cleanQuery = trim($cleanQuery);
    if ($cleanQuery === '') return 0;

    $qLower = mb_strtolower($cleanQuery, 'UTF-8');
    $qWords = array_values(array_filter(explode(' ', $qLower), function($w) { return $w !== ''; }));

    // Функция подсчёта релевантности совпадения
    $calcScore = function($fullName, $firstName, $lastName, $screenName) use ($qLower, $qWords) {
        $fullNameLower = mb_strtolower(trim((string)$fullName), 'UTF-8');
        $fnLower       = mb_strtolower(trim((string)$firstName), 'UTF-8');
        $lnLower       = mb_strtolower(trim((string)$lastName), 'UTF-8');
        $snLower       = mb_strtolower(trim((string)$screenName), 'UTF-8');

        // 1. Точное совпадение со screen_name (например "durov")
        if ($snLower !== '' && $snLower === $qLower) {
            return 100;
        }
        // 2. Точное совпадение полного имени ("иван иванов")
        if ($fullNameLower !== '' && $fullNameLower === $qLower) {
            return 98;
        }
        // 3. Обратный порядок ("иванов иван")
        if ($fnLower !== '' && $lnLower !== '') {
            if (trim($lnLower . ' ' . $fnLower) === $qLower) {
                return 98;
            }
        }
        // 4. Однословный запрос: совпадение по имени или фамилии
        if (count($qWords) === 1) {
            if ($fnLower !== '' && $fnLower === $qLower) {
                return 92;
            }
            if ($lnLower !== '' && $lnLower === $qLower) {
                return 90;
            }
            if ($fullNameLower !== '') {
                $parts = explode(' ', $fullNameLower);
                if (in_array($qLower, $parts, true)) {
                    return 91;
                }
            }
        } else {
            // Многословный запрос: все слова запроса содержатся в имени
            $allWordsFound = true;
            foreach ($qWords as $qw) {
                if (mb_strpos($fullNameLower, $qw) === false) {
                    $allWordsFound = false;
                    break;
                }
            }
            if ($allWordsFound) {
                return 88;
            }
        }

        // 5. Префиксное совпадение (начинается с запроса)
        if ($fnLower !== '' && mb_strpos($fnLower, $qLower) === 0) {
            return 75;
        }
        if ($fullNameLower !== '' && mb_strpos($fullNameLower, $qLower) === 0) {
            return 72;
        }
        if ($snLower !== '' && mb_strpos($snLower, $qLower) === 0) {
            return 70;
        }

        // 6. Подстрока (вхождение)
        if ($fullNameLower !== '' && mb_strpos($fullNameLower, $qLower) !== false) {
            return 60;
        }
        if ($snLower !== '' && mb_strpos($snLower, $qLower) !== false) {
            return 50;
        }

        return 0;
    };

    $bestUserId = 0;
    $bestScore = 0;

    // а) Поиск в текущих мутах (vk_muted_{peerId}.json) — приоритет нарушителей!
    if ($peerId > 0) {
        $muteFile = $cacheDir . '/vk_muted_' . $peerId . '.json';
        if (file_exists($muteFile)) {
            $mutes = @json_decode(@file_get_contents($muteFile), true);
            if (is_array($mutes)) {
                foreach ($mutes as $uid => $row) {
                    $uId = (int)($row['user_id'] ?? $uid);
                    if ($uId <= 0) continue;
                    $name = (string)($row['user_name'] ?? '');
                    $parts = explode(' ', $name);
                    $fn = $parts[0] ?? '';
                    $ln = $parts[1] ?? '';
                    $base = $calcScore($name, $fn, $ln, '');
                    if ($base > 0) {
                        $score = $base + 25; // Бонус 25 за текущий мут
                        if ($score > $bestScore) {
                            $bestScore = $score;
                            $bestUserId = $uId;
                        }
                    }
                }
            }
        }
    }

    // б) Поиск в текущих банах (vk_banned_{peerId}.json) — приоритет нарушителей!
    if ($peerId > 0) {
        $banFile = $cacheDir . '/vk_banned_' . $peerId . '.json';
        if (file_exists($banFile)) {
            $bans = @json_decode(@file_get_contents($banFile), true);
            if (is_array($bans)) {
                foreach ($bans as $uid => $row) {
                    $uId = (int)($row['user_id'] ?? $uid);
                    if ($uId <= 0) continue;
                    $name = (string)($row['user_name'] ?? '');
                    $parts = explode(' ', $name);
                    $fn = $parts[0] ?? '';
                    $ln = $parts[1] ?? '';
                    $base = $calcScore($name, $fn, $ln, '');
                    if ($base > 0) {
                        $score = $base + 25; // Бонус 25 за текущий бан
                        if ($score > $bestScore) {
                            $bestScore = $score;
                            $bestUserId = $uId;
                        }
                    }
                }
            }
        }
    }

    // Если в мутах или банах найден нарушитель с высоким соответствием (score >= 95), возвращаем его сразу
    if ($bestUserId > 0 && $bestScore >= 95) {
        return $bestUserId;
    }

    // в) Поиск в участниках беседы vk_bot_get_chat_members($peerId, ...)
    if ($peerId > 2000000000) {
        $membersData = vk_bot_get_chat_members($peerId, $communityToken, $cacheDir);
        if (!empty($membersData['profiles']) && is_array($membersData['profiles'])) {
            foreach ($membersData['profiles'] as $prof) {
                $uId = (int)($prof['id'] ?? 0);
                if ($uId <= 0) continue;
                $fn = (string)($prof['first_name'] ?? '');
                $ln = (string)($prof['last_name'] ?? '');
                $sn = (string)($prof['screen_name'] ?? '');
                $fullName = trim($fn . ' ' . $ln);
                $base = $calcScore($fullName, $fn, $ln, $sn);
                if ($base > 0) {
                    $score = $base + 10; // Бонус 10 за участие в беседе
                    if ($score > $bestScore) {
                        $bestScore = $score;
                        $bestUserId = $uId;
                    }
                }
            }
        }
    }

    // Если найден участник беседы с отличным соответствием (score >= 95), возвращаем его
    if ($bestUserId > 0 && $bestScore >= 95) {
        return $bestUserId;
    }

    // г) Поиск в кэше имён пользователей vk_user_name_*.json
    if (is_dir($cacheDir)) {
        $nameFiles = @glob($cacheDir . '/vk_user_name_*.json');
        if (is_array($nameFiles)) {
            foreach ($nameFiles as $file) {
                $rawContent = @file_get_contents($file);
                if (!$rawContent) continue;
                $data = @json_decode($rawContent, true);
                if (!is_array($data) || empty($data['id'])) continue;
                $uId = (int)$data['id'];
                if ($uId <= 0) continue;
                $fullName = (string)($data['name'] ?? '');
                $fn = (string)($data['first_name'] ?? '');
                $parts = explode(' ', $fullName);
                $ln = $parts[1] ?? '';
                $base = $calcScore($fullName, $fn, $ln, '');
                if ($base > 0) {
                    $score = $base + 5;
                    if ($score > $bestScore) {
                        $bestScore = $score;
                        $bestUserId = $uId;
                    }
                }
            }
        }
    }

    // Если найден локальный кандидат с хорошей оценкой (>= 60)
    if ($bestUserId > 0 && $bestScore >= 60) {
        return $bestUserId;
    }

    // д) Fallback: если запрос похож на никнейм/домен ВКонтакте (например: durov), пробуем через users.get
    if (preg_match('/^[a-zA-Z0-9_.]{2,32}$/u', $cleanQuery) && !empty($communityToken)) {
        list($httpCode, $resp) = vk_bot_api_call('users.get', [
            'user_ids' => $cleanQuery,
            'fields'   => 'first_name,last_name,screen_name',
            'lang'     => 'ru'
        ], $communityToken);

        if ($httpCode === 200 && !empty($resp['response'][0]['id'])) {
            $u = $resp['response'][0];
            $foundId = (int)$u['id'];
            if ($foundId > 0) {
                $resolvedName = trim(($u['first_name'] ?? '') . ' ' . ($u['last_name'] ?? ''));
                @file_put_contents($cacheDir . '/vk_user_name_' . $foundId . '.json', json_encode([
                    'id'         => $foundId,
                    'name'       => $resolvedName !== '' ? $resolvedName : "id{$foundId}",
                    'first_name' => $u['first_name'] ?? '',
                    'cached_at'  => time()
                ], JSON_UNESCAPED_UNICODE));
                return $foundId;
            }
        }
    }

    return ($bestUserId > 0 && $bestScore >= 50) ? $bestUserId : 0;
}

/**
 * Обратная совместимость для поиска пользователя
 */
function vk_bot_find_target_by_name($query, $peerId, $cacheDir, $token = '')
{
    return vk_bot_find_user_by_name($query, $peerId, $token, $cacheDir);
}

/**
 * Склонение слова «балл»
 */
function vk_bot_plural_points($n)
{
    $n = abs((int)$n) % 100;
    $n1 = $n % 10;
    if ($n > 10 && $n < 20) return 'баллов';
    if ($n1 > 1 && $n1 < 5) return 'балла';
    if ($n1 == 1) return 'балл';
    return 'баллов';
}

/**
 * Безопасное усечение текста для надписей на кнопках ВК (лимит 40 символов)
 */
function vk_bot_truncate_btn_label($str, $maxLen = 33)
{
    $str = trim(preg_replace('/\s+/u', ' ', (string)$str));
    if (mb_strlen($str, 'UTF-8') <= $maxLen) {
        return $str;
    }
    return mb_substr($str, 0, $maxLen - 1, 'UTF-8') . '…';
}

/**
 * Универсальный вызов AI-модели с поддержкой ротации ключей и фонового typing в ВК
 */
function vk_bot_call_ai_text($messages, $maxTokens, $temperature, $validAiKeys, $aiBaseUrl, $aiModel, $aiTimeout, $activeKeyIndexFile, $peerId = 0, $communityToken = '', $vkGroupId = 0, $aiFallbackModel = '')
{
    if (empty($validAiKeys)) return '';
    $activeIdx = 0;
    if (file_exists($activeKeyIndexFile) && is_readable($activeKeyIndexFile)) {
        $idxData = json_decode(@file_get_contents($activeKeyIndexFile), true);
        if (is_array($idxData) && isset($idxData['active_index'])) {
            $activeIdx = (int)$idxData['active_index'];
            if ($activeIdx < 0 || $activeIdx >= count($validAiKeys)) $activeIdx = 0;
        }
    }

    $modelsToTry = [$aiModel];
    $fallback = !empty($aiFallbackModel) ? $aiFallbackModel : ($GLOBALS['aiFallbackModel'] ?? 'mistralai/mistral-large-2512');
    if (!empty($fallback) && strcasecmp($fallback, $aiModel) !== 0) {
        $modelsToTry[] = $fallback;
    }

    $botTyping = ($peerId > 0 && $communityToken !== '');
    $lastTypingPing = microtime(true);
    $aiResponseText = '';

    foreach ($modelsToTry as $mIdx => $currentModel) {
        $isPrimary = ($mIdx === 0 && count($modelsToTry) > 1);
        $payloadArr = [
            'model'       => $currentModel,
            'messages'    => $messages,
            'max_tokens'  => $maxTokens,
            'temperature' => $temperature
        ];
        $payloadJson = json_encode($payloadArr, JSON_UNESCAPED_UNICODE);

        $attempts = 0;
        $maxAttempts = $isPrimary ? min(2, count($validAiKeys)) : count($validAiKeys);
        $currentIdx = $activeIdx;
        $effectiveTimeout = $isPrimary ? min($aiTimeout, 30) : $aiTimeout;

        while ($attempts < $maxAttempts) {
            $currentApiKey = $validAiKeys[$currentIdx];

            if ($botTyping) {
                vk_bot_set_typing($peerId, $communityToken, $vkGroupId);
            }

            $ch = curl_init($aiBaseUrl . '/chat/completions');
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $payloadJson,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => $effectiveTimeout,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 AURORA-Cosmo-VKBot/4.29.0',
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false,
                CURLOPT_NOPROGRESS     => false,
                CURLOPT_PROGRESSFUNCTION => function($res, $dltotal, $dlnow, $ultotal, $ulnow) use (&$lastTypingPing, $peerId, $communityToken, $vkGroupId, $botTyping) {
                    if ($botTyping && (microtime(true) - $lastTypingPing) >= 3.0) {
                        $lastTypingPing = microtime(true);
                        vk_bot_set_typing($peerId, $communityToken, $vkGroupId);
                    }
                    return 0;
                },
                CURLOPT_HTTPHEADER     => [
                    'Content-Type: application/json',
                    'Accept: application/json',
                    'Authorization: Bearer ' . $currentApiKey
                ]
            ]);
            $resp = curl_exec($ch);
            $httpCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_close($ch);

            $json = is_string($resp) ? json_decode($resp, true) : null;
            $needFailover = ($resp === false || $httpCode === 0 || in_array($httpCode, [400, 401, 402, 403, 404, 429, 500, 502, 503, 504], true));
            if (!$needFailover && is_array($json)) {
                $errStr = '';
                if (isset($json['error'])) {
                    $errStr .= is_string($json['error']) ? $json['error'] : json_encode($json['error'], JSON_UNESCAPED_UNICODE);
                }
                if (isset($json['message'])) {
                    $errStr .= ' ' . (string)$json['message'];
                }
                if ($errStr !== '' && preg_match('/quota|rate|limit|insufficient|unauthorized|credit|exceeded|busy|not found|unavailable|overloaded|capacity|provider|timeout|degraded/i', $errStr)) {
                    $needFailover = true;
                }
            }

            if ($needFailover) {
                if ($isPrimary) {
                    // Основная модель дала сбой — мгновенно переходим на запасной мистрал!
                    break;
                }
                if (count($validAiKeys) > 1 && $attempts < ($maxAttempts - 1)) {
                    $currentIdx = ($currentIdx + 1) % count($validAiKeys);
                    $attempts++;
                    $fh = @fopen($activeKeyIndexFile, 'c+');
                    if ($fh) {
                        if (@flock($fh, LOCK_EX)) {
                            ftruncate($fh, 0);
                            rewind($fh);
                            fwrite($fh, json_encode([
                                'active_index' => $currentIdx,
                                'updated_at'   => time(),
                                'updated_iso'  => date('c')
                            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                            fflush($fh);
                            @flock($fh, LOCK_UN);
                        }
                        fclose($fh);
                    }
                    continue;
                }
            }

            if ($httpCode === 200 && is_array($json) && !empty($json['choices'][0]['message']['content'])) {
                $aiResponseText = trim((string)$json['choices'][0]['message']['content']);
                $aiResponseText = vk_bot_enforce_masculine_gender($aiResponseText);
                if ($currentIdx !== $activeIdx) {
                    $fh = @fopen($activeKeyIndexFile, 'c+');
                    if ($fh) {
                        if (@flock($fh, LOCK_EX)) {
                            ftruncate($fh, 0);
                            rewind($fh);
                            fwrite($fh, json_encode([
                                'active_index' => $currentIdx,
                                'updated_at'   => time(),
                                'updated_iso'  => date('c')
                            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                            fflush($fh);
                            @flock($fh, LOCK_UN);
                        }
                        fclose($fh);
                    }
                }
                break 2;
            }

            $attempts++;
            $currentIdx = ($currentIdx + 1) % count($validAiKeys);
        }
    }

    return vk_bot_enforce_masculine_gender($aiResponseText);
}

/**
 * Резервный банк проверенных квизов по литературе
 */
function vk_bot_get_fallback_quizzes()
{
    return [
        [
            'topic' => 'Русская классика',
            'question' => 'Какой предмет подарил Петр Гринев Емельяну Пугачеву во время метели в повести «Капитанская дочка»?',
            'options' => ['Заячий тулупчик', 'Золотые часы', 'Шпагу отца', 'Шелковый платок'],
            'correct_index' => 0,
            'explanation' => 'Петр Гринев от чистого сердца подарил вожатому заячий тулупчик в знак благодарности за спасение в буране. Этот благородный жест позже спас Гриневу жизнь в захваченной Белогорской крепости!'
        ],
        [
            'topic' => 'Мистическая классика',
            'question' => 'На каких прудах Москвы начинаются события романа Михаила Булгакова «Мастер и Маргарита»?',
            'options' => ['Чистые пруды', 'Патриаршие пруды', 'Новодевичьи пруды', 'Екатерининские пруды'],
            'correct_index' => 1,
            'explanation' => 'Знаменитый разговор Берлиоза и поэта Бездомного с Воландом происходит в час небывало жаркого весеннего заката именно на Патриарших прудах, где «Аннушка уже разлила масло».'
        ],
        [
            'topic' => 'Великая драматургия',
            'question' => 'Кто из героев пьесы Антона Чехова «Вишневый сад» выкупает родовое имение Раневской на торгах?',
            'options' => ['Петя Трофимов', 'Леонид Гаев', 'Ермолай Лопахин', 'Борис Симеонов-Пищик'],
            'correct_index' => 2,
            'explanation' => 'Купец Ермолай Лопахин, чей отец и дед были крепостными в этом имении, покупает вишневый сад и объявляет: «Вишневый сад теперь мой! Мой!». Это ключевой поворот русской драматургии рубежа веков.'
        ],
        [
            'topic' => 'Научная фантастика',
            'question' => 'Как называется планета-океан, обладающая мыслящим разумом, в культовом романе Станислава Лема?',
            'options' => ['Солярис', 'Арракис', 'Трантор', 'Гиперион'],
            'correct_index' => 0,
            'explanation' => '«Солярис» Станислава Лема — философская вершина научной фантастики, где исследователи сталкиваются с загадочным живым Океаном, материализующим сокровенные воспоминания человека.'
        ],
        [
            'topic' => 'Отечественная фантастика',
            'question' => 'В каком загадочном институте работают герои повести братьев Стругацких «Понедельник начинается в субботу»?',
            'options' => ['НИИЧАВО', 'ЦАГИ', 'НИИОМТПБ', 'ВНИИЭМ'],
            'correct_index' => 0,
            'explanation' => 'Герои трудятся в НИИЧАВО — Научно-исследовательском институте Чародейства и Волшебства города Соловца, где исследуют счастье и человеческий дух через призму магии и науки.'
        ],
        [
            'topic' => 'Классический детектив',
            'question' => 'С помощью какого вещества преступник создавал зловещее свечение морды собаки в повести Конан Дойла «Собака Баскервилей»?',
            'options' => ['Люминофор на цинке', 'Фосфорный состав', 'Радиевая краска', 'Светящиеся водоросли'],
            'correct_index' => 1,
            'explanation' => 'Джек Стэплтон использовал специально приготовленный состав на основе фосфора без запаха, чтобы внушать суеверный ужас и инсценировать древнюю легенду рода Баскервилей.'
        ],
        [
            'topic' => 'Морские приключения',
            'question' => 'Как звали отважного гарпунёра из Канады на борту фрегата «Авраам Линкольн» в романе Жюля Верна «20 000 лье под водой»?',
            'options' => ['Нед Ленд', 'Дик Сэнд', 'Филеас Фогг', 'Джон Манглс'],
            'correct_index' => 0,
            'explanation' => 'Канадский гарпунёр Нед Ленд стал верным спутником профессора Аронакса и Конселя на борту легендарного подводного корабля капитана Немо «Наутилус».'
        ],
        [
            'topic' => 'Русская поэзия и дуэль',
            'question' => 'Кто был секундантом Печорина на роковой дуэли с Грушницким в романе «Герой нашего времени»?',
            'options' => ['Доктор Вернер', 'Максим Максимыч', 'Капитан Вулич', 'Ротмистр Раевич'],
            'correct_index' => 0,
            'explanation' => 'Именно доктор Вернер был секундантом Печорина и пытался склонить стороны к примирению перед тем, как противники встали на узкую площадку над обрывом.'
        ]
    ];
}

/**
 * Генерация вопроса квиза через ИИ с fallback-банком
 */
function vk_bot_generate_ai_quiz($topic, $validAiKeys, $aiBaseUrl, $aiModel, $aiTimeout, $activeKeyIndexFile, $peerId = 0, $communityToken = '', $vkGroupId = 0)
{
    $topic = trim((string)$topic);
    $curatedTopics = [
        'Русская классическая литература',
        'Космическая и научная фантастика',
        'Шедевры мирового детектива',
        'Приключения и морские путешествия',
        'Герои сказок и фольклора',
        'Поэзия Серебряного века',
        'Тайны писателей и книжные юбилеи'
    ];
    if ($topic === '') {
        $topic = $curatedTopics[array_rand($curatedTopics)];
    }

    $systemPrompt = "Ты — робот Космо, библиограф и ведущий книжного клуба городских библиотек г. Владимира. ТЫ — РОБОТ МУЖСКОГО РОДА! Говори строго от мужского лица (я нашёл, я рад, я готов, я составил, я прочитал). Никакого женского рода!\n"
                  . "Твоя задача — составить 1 увлекательный, познавательный и на 100% достоверный вопрос литературного квиза (викторины) по заданной теме.\n"
                  . "Категорически запрещены: вымысел, несуществующие факты/книги, а также любые упоминания лиц-иноагентов!\n"
                  . "Верни СТРОГО валидный JSON (без markdown-обёрток, без лишнего текста) следующей структуры:\n"
                  . "{\n"
                  . "  \"topic\": \"Короткое название темы (до 30 символов)\",\n"
                  . "  \"question\": \"Текст вопроса (интересный, ясный, до 200 символов)\",\n"
                  . "  \"options\": [\n"
                  . "    \"Вариант 1 (до 30 символов)\",\n"
                  . "    \"Вариант 2 (до 30 символов)\",\n"
                  . "    \"Вариант 3 (до 30 символов)\",\n"
                  . "    \"Вариант 4 (до 30 символов)\"\n"
                  . "  ],\n"
                  . "  \"correct_index\": 0,\n"
                  . "  \"explanation\": \"Краткая увлекательная историко-литературная справка от Космо, почему этот ответ верный (2-3 предложения).\"\n"
                  . "}\n"
                  . "Важно: в массиве options должно быть ровно 4 варианта. correct_index — целое число от 0 до 3, указывающее на верный вариант.";

    $userPrompt = "Составь вопрос квиза на тему: «{$topic}».";

    $messages = [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $userPrompt]
    ];

    $raw = vk_bot_call_ai_text($messages, 650, 0.3, $validAiKeys, $aiBaseUrl, $aiModel, $aiTimeout, $activeKeyIndexFile, $peerId, $communityToken, $vkGroupId);

    $parsed = null;
    if ($raw !== '' && preg_match('/\{[\s\S]*\}/u', $raw, $m)) {
        $parsed = json_decode($m[0], true);
    }

    if (
        is_array($parsed) &&
        !empty($parsed['question']) &&
        !empty($parsed['options']) &&
        is_array($parsed['options']) &&
        count($parsed['options']) >= 4 &&
        isset($parsed['correct_index']) &&
        is_numeric($parsed['correct_index'])
    ) {
        $cleanOptions = [];
        foreach (array_slice($parsed['options'], 0, 4) as $opt) {
            $cleanOptions[] = trim(preg_replace('/\s+/u', ' ', (string)$opt));
        }
        $correctIdx = max(0, min(3, (int)$parsed['correct_index']));
        $finalTopic = !empty($parsed['topic']) ? trim((string)$parsed['topic']) : $topic;
        $explanation = !empty($parsed['explanation']) ? trim((string)$parsed['explanation']) : 'Верный ответ подтверждается библиографическими источниками!';

        return [
            'quiz_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 9999),
            'topic'          => $finalTopic,
            'question'       => trim((string)$parsed['question']),
            'options'        => $cleanOptions,
            'correct_index'  => $correctIdx,
            'explanation'    => $explanation,
            'created_at'     => time(),
            'answered_users' => []
        ];
    }

    // Резервный банк проверенных квизов при недоступности ИИ
    $fallbackBank = vk_bot_get_fallback_quizzes();
    $chosen = $fallbackBank[array_rand($fallbackBank)];
    $chosen['quiz_id'] = (int)(microtime(true) * 1000) + mt_rand(1, 9999);
    $chosen['created_at'] = time();
    $chosen['answered_users'] = [];
    return $chosen;
}

/**
 * Сохранение квиза беседы
 */
function vk_bot_save_quiz($peerId, $quizData, $cacheDir)
{
    $file = $cacheDir . '/vk_quiz_' . $peerId . '.json';
    $fh = @fopen($file, 'c+');
    if ($fh) {
        if (@flock($fh, LOCK_EX)) {
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($quizData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            fflush($fh);
            @flock($fh, LOCK_UN);
        }
        fclose($fh);
        return true;
    }
    return false;
}

/**
 * Загрузка активного квиза беседы
 */
function vk_bot_get_quiz($peerId, $cacheDir)
{
    $file = $cacheDir . '/vk_quiz_' . $peerId . '.json';
    if (!file_exists($file)) return null;
    $data = @json_decode(@file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

/**
 * Фиксация ответа участника на вопрос квиза
 */
function vk_bot_record_quiz_answer($peerId, $userId, $userName, $selectedOpt, $cacheDir)
{
    $quiz = vk_bot_get_quiz($peerId, $cacheDir);
    if (!$quiz) return null;

    $uKey = (string)$userId;
    $answeredUsers = $quiz['answered_users'] ?? [];

    $scoresFile = $cacheDir . '/vk_quiz_scores_' . $peerId . '.json';
    $scores = [];
    if (file_exists($scoresFile)) {
        $loaded = @json_decode(@file_get_contents($scoresFile), true);
        if (is_array($loaded)) $scores = $loaded;
    }

    $currentScore = (int)($scores[$uKey]['correct'] ?? 0);

    if (isset($answeredUsers[$uKey])) {
        return [
            'already_answered'    => true,
            'selected_option'     => (int)$answeredUsers[$uKey]['selected_option'],
            'is_correct'          => !empty($answeredUsers[$uKey]['is_correct']),
            'correct_index'       => (int)$quiz['correct_index'],
            'correct_option_text' => $quiz['options'][$quiz['correct_index']] ?? '',
            'explanation'         => $quiz['explanation'] ?? '',
            'user_score'          => $currentScore,
            'topic'               => $quiz['topic'] ?? 'Литература'
        ];
    }

    $correctIdx = (int)$quiz['correct_index'];
    $isCorrect = ($selectedOpt === $correctIdx);

    $answeredUsers[$uKey] = [
        'user_name'       => $userName,
        'selected_option' => $selectedOpt,
        'is_correct'      => $isCorrect,
        'answered_at'     => time()
    ];
    $quiz['answered_users'] = $answeredUsers;
    vk_bot_save_quiz($peerId, $quiz, $cacheDir);

    if (!isset($scores[$uKey])) {
        $scores[$uKey] = [
            'name'          => $userName,
            'correct'       => 0,
            'total'         => 0,
            'last_activity' => time()
        ];
    }
    $scores[$uKey]['name'] = $userName;
    $scores[$uKey]['total'] = (int)($scores[$uKey]['total'] ?? 0) + 1;
    if ($isCorrect) {
        $scores[$uKey]['correct'] = (int)($scores[$uKey]['correct'] ?? 0) + 1;
    }
    $scores[$uKey]['last_activity'] = time();

    $sf = @fopen($scoresFile, 'c+');
    if ($sf) {
        if (@flock($sf, LOCK_EX)) {
            ftruncate($sf, 0);
            rewind($sf);
            fwrite($sf, json_encode($scores, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            fflush($sf);
            @flock($sf, LOCK_UN);
        }
        fclose($sf);
    }

    return [
        'already_answered'    => false,
        'selected_option'     => $selectedOpt,
        'is_correct'          => $isCorrect,
        'correct_index'       => $correctIdx,
        'correct_option_text' => $quiz['options'][$correctIdx] ?? '',
        'explanation'         => $quiz['explanation'] ?? '',
        'user_score'          => $scores[$uKey]['correct'],
        'topic'               => $quiz['topic'] ?? 'Литература'
    ];
}

/**
 * Форматирование таблицы знатоков (лидеров квиза)
 */
function vk_bot_format_quiz_leaderboard($peerId, $cacheDir)
{
    $scoresFile = $cacheDir . '/vk_quiz_scores_' . $peerId . '.json';
    if (!file_exists($scoresFile)) {
        return "🏆 Доска почёта знатоков беседы 🤖✨\n\n"
             . "Пока в этой беседе ещё никто не заработал очков! Отправьте «Космо, сделай квиз» и станьте первым эрудитом! 🎯📚";
    }

    $scores = @json_decode(@file_get_contents($scoresFile), true);
    if (!is_array($scores) || empty($scores)) {
        return "🏆 Доска почёта знатоков беседы 🤖✨\n\n"
             . "Пока в этой беседе ещё никто не заработал очков! Отправьте «Космо, сделай квиз» и станьте первым эрудитом! 🎯📚";
    }

    uasort($scores, function($a, $b) {
        $ca = (int)($a['correct'] ?? 0);
        $cb = (int)($b['correct'] ?? 0);
        if ($ca !== $cb) return $cb <=> $ca;
        return ((int)($b['total'] ?? 0)) <=> ((int)($a['total'] ?? 0));
    });

    $medals = [1 => '🥇', 2 => '🥈', 3 => '🥉'];
    $rows = [];
    $rank = 1;

    foreach ($scores as $uid => $row) {
        if ($rank > 10) break;
        $name = htmlspecialchars($row['name'] ?? "id{$uid}");
        $pts = (int)($row['correct'] ?? 0);
        $tot = (int)($row['total'] ?? 0);
        $pct = $tot > 0 ? round(($pts / $tot) * 100) : 0;
        $prefix = $medals[$rank] ?? "{$rank}.";
        $ptsText = $pts . ' ' . vk_bot_plural_points($pts);
        $rows[] = "{$prefix} [id{$uid}|{$name}] — {$ptsText} (точность {$pct}%, ответов: {$tot})";
        $rank++;
    }

    return "🏆 Доска почёта знатоков беседы 🤖✨\n\n"
         . implode("\n", $rows) . "\n\n"
         . "Продолжайте интеллектуальную битву: нажмите «🎯 Новый вопрос квиза» или напишите «Космо, квиз»!";
}

/**
 * Клавиатура с вариантами ответов на квиз
 */
function vk_bot_build_quiz_keyboard($quiz)
{
    $qId = $quiz['quiz_id'];
    $opts = $quiz['options'];
    $topic = $quiz['topic'] ?? 'Квиз';

    $btnRows = [];
    $btnRows[] = [
        [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode(['cmd' => 'quiz_answer', 'quiz_id' => $qId, 'opt' => 0], JSON_UNESCAPED_UNICODE),
                'label'   => '1️⃣ ' . vk_bot_truncate_btn_label($opts[0] ?? '1', 34)
            ],
            'color' => 'secondary'
        ],
        [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode(['cmd' => 'quiz_answer', 'quiz_id' => $qId, 'opt' => 1], JSON_UNESCAPED_UNICODE),
                'label'   => '2️⃣ ' . vk_bot_truncate_btn_label($opts[1] ?? '2', 34)
            ],
            'color' => 'secondary'
        ]
    ];
    $btnRows[] = [
        [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode(['cmd' => 'quiz_answer', 'quiz_id' => $qId, 'opt' => 2], JSON_UNESCAPED_UNICODE),
                'label'   => '3️⃣ ' . vk_bot_truncate_btn_label($opts[2] ?? '3', 34)
            ],
            'color' => 'secondary'
        ],
        [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode(['cmd' => 'quiz_answer', 'quiz_id' => $qId, 'opt' => 3], JSON_UNESCAPED_UNICODE),
                'label'   => '4️⃣ ' . vk_bot_truncate_btn_label($opts[3] ?? '4', 34)
            ],
            'color' => 'secondary'
        ]
    ];
    $btnRows[] = [
        [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode(['cmd' => 'quiz_leaderboard'], JSON_UNESCAPED_UNICODE),
                'label'   => '🏆 Счёт знатоков'
            ],
            'color' => 'primary'
        ],
        [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode(['cmd' => 'quiz_next', 'topic' => $topic], JSON_UNESCAPED_UNICODE),
                'label'   => '⏭️ Другой вопрос'
            ],
            'color' => 'secondary'
        ]
    ];

    return ['inline' => true, 'buttons' => $btnRows];
}

/**
 * Клавиатура после ответа на квиз
 */
function vk_bot_build_quiz_answered_keyboard($quizTopic)
{
    return [
        'inline' => true,
        'buttons' => [
            [
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'quiz_next', 'topic' => $quizTopic], JSON_UNESCAPED_UNICODE),
                        'label'   => '⏭️ Следующий вопрос'
                    ],
                    'color' => 'primary'
                ],
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'quiz_leaderboard'], JSON_UNESCAPED_UNICODE),
                        'label'   => '🏆 Счёт знатоков'
                    ],
                    'color' => 'secondary'
                ]
            ]
        ]
    ];
}

/**
 * Резервный банк читательских опросов
 */
function vk_bot_get_fallback_polls()
{
    return [
        [
            'topic' => 'Книжные привычки ☕',
            'question' => 'Какое время и место для чтения вы считаете самым уютным и вдохновляющим?',
            'options' => [
                'Вечер дома с пледом и горячим чаем ☕',
                'Утренний кофе перед началом дня 🌅',
                'В дороге: метро, поезд или автобус 🚆',
                'В тихом читальном зале библиотеки 🏛️'
            ]
        ],
        [
            'topic' => 'Формат чтения 📖',
            'question' => 'Какому книжному формату вы отдаете предпочтение в последнее время?',
            'options' => [
                'Бумажная книга с ароматом страниц 📚',
                'Электронная книга (ридер/планшет) 📱',
                'Аудиокниги на ходу и в дороге 🎧',
                'Комбинирую все форматы под настроение ✨'
            ]
        ],
        [
            'topic' => 'Любимый жанр 🎭',
            'question' => 'Книги какого жанра чаще всего заставляют вас забыть о времени?',
            'options' => [
                'Детективы и интеллектуальные тайны 🕵️‍♂️',
                'Фантастика и космические миры 🚀',
                'Глубокая классическая проза 📜',
                'Уютные романы и добрые истории ☕'
            ]
        ],
        [
            'topic' => 'Магия библиотеки 🏛️',
            'question' => 'Что для вас важнее всего при посещении современной библиотеки?',
            'options' => [
                'Огромный выбор новых книг и новинок 📚',
                'Особая атмосфера тишины и уюта 🕊️',
                'Интересные лекции, клубы и встречи 💡',
                'Совет опытного библиотекаря 🤖'
            ]
        ]
    ];
}

/**
 * Генерация опроса через ИИ с fallback-банком
 */
function vk_bot_generate_ai_poll($topic, $validAiKeys, $aiBaseUrl, $aiModel, $aiTimeout, $activeKeyIndexFile, $peerId = 0, $communityToken = '', $vkGroupId = 0)
{
    $topic = trim((string)$topic);
    $curatedTopics = [
        'Любимый книжный жанр',
        'Идеальное место и время для чтения',
        'Формат книг: бумага, цифра или аудио',
        'Чего не хватает в современных библиотеках',
        'Какую книгу вы перечитывали больше всего',
        'Книжные экранизации и сериалы'
    ];
    if ($topic === '') {
        $topic = $curatedTopics[array_rand($curatedTopics)];
    }

    $systemPrompt = "Ты — робот Космо, модератор книжного клуба городских библиотек г. Владимира. ТЫ — РОБОТ МУЖСКОГО РОДА! Говори строго от мужского лица (я нашёл, я рад, я готов, я составил, я прочитал). Никакого женского рода!\n"
                  . "Твоя задача — составить 1 добрый, вовлекающий читательский опрос (голосование) для беседы книголюбов по заданной теме.\n"
                  . "Опрос должен объединять участников и пробуждать интерес к книгам, чтению и литературным привычкам. Никаких иноагентов!\n"
                  . "Верни СТРОГО валидный JSON (без markdown-обёрток, без лишнего текста) следующей структуры:\n"
                  . "{\n"
                  . "  \"topic\": \"Короткое название темы (до 30 символов)\",\n"
                  . "  \"question\": \"Текст вопроса для голосования (до 200 символов)\",\n"
                  . "  \"options\": [\n"
                  . "    \"Вариант 1 (с эмодзи, до 35 символов)\",\n"
                  . "    \"Вариант 2 (с эмодзи, до 35 символов)\",\n"
                  . "    \"Вариант 3 (с эмодзи, до 35 символов)\",\n"
                  . "    \"Вариант 4 (с эмодзи, до 35 символов)\"\n"
                  . "  ]\n"
                  . "}\n"
                  . "Важно: в массиве options должно быть ровно 4 варианта (не больше и не меньше!).";

    $userPrompt = "Составь читательский опрос на тему: «{$topic}».";

    $messages = [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $userPrompt]
    ];

    $raw = vk_bot_call_ai_text($messages, 650, 0.3, $validAiKeys, $aiBaseUrl, $aiModel, $aiTimeout, $activeKeyIndexFile, $peerId, $communityToken, $vkGroupId);

    $parsed = null;
    if ($raw !== '' && preg_match('/\{[\s\S]*\}/u', $raw, $m)) {
        $parsed = json_decode($m[0], true);
    }

    if (
        is_array($parsed) &&
        !empty($parsed['question']) &&
        !empty($parsed['options']) &&
        is_array($parsed['options']) &&
        count($parsed['options']) >= 4
    ) {
        $cleanOptions = [];
        foreach (array_slice($parsed['options'], 0, 4) as $opt) {
            $cleanOptions[] = trim(preg_replace('/\s+/u', ' ', (string)$opt));
        }
        $finalTopic = !empty($parsed['topic']) ? trim((string)$parsed['topic']) : $topic;

        return [
            'poll_id'    => (int)(microtime(true) * 1000) + mt_rand(1, 9999),
            'topic'      => $finalTopic,
            'question'   => trim((string)$parsed['question']),
            'options'    => $cleanOptions,
            'created_at' => time(),
            'votes'      => []
        ];
    }

    $fallbackBank = vk_bot_get_fallback_polls();
    $chosen = $fallbackBank[array_rand($fallbackBank)];
    $chosen['poll_id'] = (int)(microtime(true) * 1000) + mt_rand(1, 9999);
    $chosen['created_at'] = time();
    $chosen['votes'] = [];
    return $chosen;
}

/**
 * Сохранение опроса беседы
 */
function vk_bot_save_poll($peerId, $pollData, $cacheDir)
{
    $file = $cacheDir . '/vk_poll_' . $peerId . '.json';
    $fh = @fopen($file, 'c+');
    if ($fh) {
        if (@flock($fh, LOCK_EX)) {
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($pollData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            fflush($fh);
            @flock($fh, LOCK_UN);
        }
        fclose($fh);
        return true;
    }
    return false;
}

/**
 * Загрузка опроса беседы
 */
function vk_bot_get_poll($peerId, $cacheDir)
{
    $file = $cacheDir . '/vk_poll_' . $peerId . '.json';
    if (!file_exists($file)) return null;
    $data = @json_decode(@file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

/**
 * Фиксация голоса участника в опросе
 */
function vk_bot_record_poll_vote($peerId, $userId, $optNum, $cacheDir)
{
    $poll = vk_bot_get_poll($peerId, $cacheDir);
    if (!$poll) return false;

    if (!isset($poll['votes']) || !is_array($poll['votes'])) {
        $poll['votes'] = [];
    }
    $poll['votes'][(string)$userId] = (int)$optNum;
    $poll['updated_at'] = time();

    vk_bot_save_poll($peerId, $poll, $cacheDir);
    return true;
}

/**
 * Форматирование результатов опроса со шкалой прогресса
 */
function vk_bot_format_poll_results($peerId, $cacheDir)
{
    $poll = vk_bot_get_poll($peerId, $cacheDir);
    if (!$poll) {
        return "📊 В этой беседе пока нет активного опроса!\n\nСоздайте новый опрос прямо сейчас командой «Космо, сделай опрос на тему [...]» или «!опрос»! 🤖🗳️";
    }

    $options = $poll['options'] ?? [];
    $votes = $poll['votes'] ?? [];
    $totalVotes = count($votes);

    $counts = [0 => 0, 1 => 0, 2 => 0, 3 => 0];
    foreach ($votes as $uid => $opt) {
        $opt = (int)$opt;
        if (isset($counts[$opt])) {
            $counts[$opt]++;
        }
    }

    $barWidth = 10;
    $leaderOpt = null;
    $maxVotes = -1;

    $out = "📊 Результаты читательского опроса от Космо 🤖🗳️\n"
         . "📌 Тема: " . ($poll['topic'] ?? 'Опрос') . "\n"
         . "❓ " . ($poll['question'] ?? '') . "\n\n"
         . "Всего проголосовало: {$totalVotes} " . vk_bot_plural_votes($totalVotes) . "\n\n";

    $numIcons = [0 => '1️⃣', 1 => '2️⃣', 2 => '3️⃣', 3 => '4️⃣'];

    foreach ($options as $idx => $optText) {
        $cnt = $counts[$idx] ?? 0;
        $pct = $totalVotes > 0 ? round(($cnt / $totalVotes) * 100) : 0;
        $filled = $totalVotes > 0 ? (int)round(($cnt / $totalVotes) * $barWidth) : 0;
        $empty = $barWidth - $filled;
        $bar = str_repeat('█', $filled) . str_repeat('░', $empty);

        if ($cnt > $maxVotes && $cnt > 0) {
            $maxVotes = $cnt;
            $leaderOpt = $idx;
        }

        $icon = $numIcons[$idx] ?? ($idx + 1) . '.';
        $out .= "{$icon} {$optText}\n";
        $out .= "   [{$bar}] {$pct}% ({$cnt} " . vk_bot_plural_votes($cnt) . ")\n\n";
    }

    if ($leaderOpt !== null) {
        $leaderText = $options[$leaderOpt] ?? '';
        $out .= "🏆 Лидирует: «{$leaderText}»! ✨";
    } else {
        $out .= "💡 Вы можете проголосовать первым кнопками ниже или отправив номер ответа (1, 2, 3 или 4)!";
    }

    return $out;
}

/**
 * Клавиатура для голосования в опросе
 */
function vk_bot_build_poll_keyboard($poll)
{
    $pId = $poll['poll_id'];
    $opts = $poll['options'];

    $btnRows = [];
    $btnRows[] = [
        [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode(['cmd' => 'poll_vote', 'poll_id' => $pId, 'opt' => 0], JSON_UNESCAPED_UNICODE),
                'label'   => '1️⃣ ' . vk_bot_truncate_btn_label($opts[0] ?? '1', 34)
            ],
            'color' => 'secondary'
        ],
        [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode(['cmd' => 'poll_vote', 'poll_id' => $pId, 'opt' => 1], JSON_UNESCAPED_UNICODE),
                'label'   => '2️⃣ ' . vk_bot_truncate_btn_label($opts[1] ?? '2', 34)
            ],
            'color' => 'secondary'
        ]
    ];
    $btnRows[] = [
        [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode(['cmd' => 'poll_vote', 'poll_id' => $pId, 'opt' => 2], JSON_UNESCAPED_UNICODE),
                'label'   => '3️⃣ ' . vk_bot_truncate_btn_label($opts[2] ?? '3', 34)
            ],
            'color' => 'secondary'
        ],
        [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode(['cmd' => 'poll_vote', 'poll_id' => $pId, 'opt' => 3], JSON_UNESCAPED_UNICODE),
                'label'   => '4️⃣ ' . vk_bot_truncate_btn_label($opts[3] ?? '4', 34)
            ],
            'color' => 'secondary'
        ]
    ];
    $btnRows[] = [
        [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode(['cmd' => 'poll_results', 'poll_id' => $pId], JSON_UNESCAPED_UNICODE),
                'label'   => '📊 Результаты опроса'
            ],
            'color' => 'primary'
        ],
        [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode(['cmd' => 'poll_new'], JSON_UNESCAPED_UNICODE),
                'label'   => '✨ Новый опрос'
            ],
            'color' => 'secondary'
        ]
    ];

    return ['inline' => true, 'buttons' => $btnRows];
}

/**
 * Клавиатура для просмотра и обновления результатов опроса
 */
function vk_bot_build_poll_results_keyboard($poll)
{
    $pId = $poll['poll_id'] ?? 0;
    return [
        'inline' => true,
        'buttons' => [
            [
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'poll_results', 'poll_id' => $pId], JSON_UNESCAPED_UNICODE),
                        'label'   => '🔄 Обновить итоги'
                    ],
                    'color' => 'secondary'
                ],
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'poll_new'], JSON_UNESCAPED_UNICODE),
                        'label'   => '✨ Новый опрос'
                    ],
                    'color' => 'primary'
                ]
            ]
        ]
    ];
}

/**
 * Проверка запроса на авторов-иноагентов, их произведения и запросы информации об иноагентах
 */
function vk_bot_is_foreign_agent_query($text)
{
    if (!is_string($text) || trim($text) === '') return false;

    // Исключения для признанных классиков, не являющихся иноагентами:
    // Василь Быков (писатель-фронтовик), Ролан Быков (режиссёр/актёр)
    if (preg_match('/(?:васил(?:ь|ий|я)|ролан[а-я]*|в\.?\s*(?:в\.?)?)\s+быков|быков[а-я]*\s+(?:васил|ролан)/ui', $text)) {
        return false;
    }

    $pattern = '/\b(?:'
        // Терминология и запросы информации об иноагентах
        . 'иноагент[а-я]*'
        . '|иностранн(?:ый|ого|ому|ым|ом|ая|ой|ую|ые|ых|ыми)\s+агент[а-я]*'
        . '|реестр(?:е|а)?\s+(?:иноагент|иностранн)[а-я]*'
        . '|список\s+(?:иноагент|иностранн)[а-я]*'
        . '|статус(?:е|а)?\s+иноагент[а-я]*'
        . '|закон[а-я]*\s+об\s+иноагент[а-я]*'
        // Авторы и произведения:
        // Борис Акунин (Чхартишвили, Брусникин, Анна Борисова, Эраст Фандорин, Пелагия)
        . '|акунин[а-я]*|фандорин[а-я]*|азазель|турецк(?:ий|ого|ому|ом)\s+гамбит[а-я]*|статск(?:ий|ого|ому|ом)\s+советник[а-я]*|алмазн(?:ая|ой|ую)\s+колесниц[а-я]*|пелаги[яи][а-я]*|чхартишвили|брусникин[а-я]*|анн(?:а|ы|е|у)\s+борисов[а-я]*'
        // Дмитрий Глуховский
        . '|глуховск[а-я]*|метро\s*203[345]|(?:роман[а-я]*|книг[а-я]*)\s+(?:текст|пост|будущее)\b|(?:текст|пост|будущее)\s+глуховск[а-я]*'
        // Дмитрий Быков
        . '|дмитри[яеий]?\s+быков[а-я]*|быков[а-я]*'
        // Людмила Улицкая
        . '|улицк[а-я]*|казус\s+кукоцк[а-я]*|меде[яе]\s+и\s+е[её]\s+дети|даниэль\s+штайн|зелен(?:ый|ого|ому|ом)\s+шатер[а-я]*|лестниц[а-я]\s+яков[а-я]*|искренне\s+ваш\s+шурик'
        // Михаил Зыгарь
        . '|зыгар[а-я]*|вся\s+кремлевск(?:ая|ой|ую)\s+рать|импери[яи]\s+должн(?:а|ой)\s+умереть'
        // Михаил Шишкин
        . '|михаил[а-я]*\s+шишкин[а-я]*|шишкин[а-я]*\s+(?:письмовник|венерин|взятие)|письмовник'
        // Вера Полозкова, Линор Горалик
        . '|полозков[а-я]*|вера\s+полозков[а-я]*|непоэзишн|горалик|линор\s+горалик'
        // Тамара Эйдельман, Екатерина Шульман, Виктор Шендерович, Александр Невзоров
        . '|эйдельман|тамар[а-я]*\s+эйдельман|шульман|екатерин[а-я]*\s+шульман|шендерович|невзоров[а-я]*'
        // Юлия Латынина
        . '|латынин[а-я]*|юли[яи]\s+латынин[а-я]*|охот[а-я]\s+на\s+изюбр[а-я]*|вейск(?:ая|ой)\s+импери[а-я]*'
        // Антон Долин, Евгений Понасенков, Александр Баунов
        . '|антон[а-я]*\s+долин[а-я]*|понасенков[а-я]*|евгени[яеий]?\s+понасенков[а-я]*|баунов[а-я]*|александр[а-я]*\s+баунов[а-я]*|конец\s+режима'
        // Олег Радзинский, Иван Филиппов
        . '|олег[а-я]*\s+радзинск[а-я]*|иван[а-я]*\s+филиппов[а-я]*|(?:роман|книга)\s+мышь|мышь\s+филиппов'
        // Гарри Каспаров, Андрей Макаревич, Борис Гребенщиков
        . '|макаревич[а-я]*|андре[яеий]?\s+макаревич[а-я]*|гребенщиков[а-я]*|борис[а-я]*\s+гребенщиков[а-я]*|каспаров[а-я]*|гарри\s+каспаров[а-я]*'
        // Публицисты и деятели
        . '|навальн[а-я]*|алексе[яеий]?\s+навальн[а-я]*|кара-мурз[а-я]*|яшин[а-я]*|иль[яеию]\s+яшин[а-я]*|ходорковск[а-я]*|чичваркин[а-я]*'
        . '|артеми[яеий]?\s+троицк[а-я]*|троицк(?:ий|ого)\s+артеми[а-я]*|белковск[а-я]*|роднянск[а-я]*|гельман[а-я]*'
        // Медийные персоны
        . '|галкин[а-я]*|максим[а-я]*\s+галкин[а-я]*|слепаков[а-я]*|семен[а-я]*\s+слепаков[а-я]*|смольянинов[а-я]*|артур[а-я]*\s+смольянинов[а-я]*|земфир[а-я]*'
        . '|дуд[ьяеию]\b|юри[яеий]?\s+дуд[ьяеию]|оксимирон[а-я]*|oxxxymiron|noize\s+mc|нойз\s+мс|моргенштерн[а-я]*'
        . ')\b/ui';

    return (bool)preg_match($pattern, $text);
}

/**
 * Валидатор и санитайзер ответа ИИ от любых случайных упоминаний иноагентов, их книг или информации о них
 */
function vk_bot_sanitize_foreign_agents($text)
{
    if (!is_string($text) || trim($text) === '') return '';
    if (preg_match('/(?:васил(?:ь|ий|я)|ролан[а-я]*|в\.?\s*(?:в\.?)?)\s+быков|быков[а-я]*\s+(?:васил|ролан)/ui', $text)) {
        return $text;
    }
    if (vk_bot_is_foreign_agent_query($text)) {
        return "✨ В фондах наших муниципальных библиотек представлена богатейшая коллекция признанной классики и лучших современных произведений! Рекомендую обратить внимание на проверенные временем книги — например, исторические детективы Николая Свечина (цикл об Алексее Лыкове), романы Михаила Булгакова («Белая гвардия», «Мастер и Маргарита») или увлекательную научную фантастику братьев Стругацких.\n\n"
             . "Это литература высочайшего художественного уровня с великолепным языком и непередаваемой атмосферой. С радостью помогу подобрать книгу по вашему вкусу!";
    }
    return $text;
}

/**
 * Гарантия мужского рода в речи робота Космо (защита от феминитивов ИИ)
 */
function vk_bot_enforce_masculine_gender($text)
{
    if (!is_string($text) || $text === '') return '';

    $replacements = [
        '/\bя\s+была\s+бы\s+рада\b/ui'   => 'я был бы рад',
        '/\bя\s+была\s+рада\b/ui'         => 'я был рад',
        '/\bя\s+рада\s+помочь\b/ui'       => 'я рад помочь',
        '/\bя\s+рада\b/ui'                => 'я рад',
        '/\bя\s+бы\s+хотела\b/ui'         => 'я бы хотел',
        '/\bя\s+хотела\s+бы\b/ui'         => 'я хотел бы',
        '/\bя\s+хотела\b/ui'              => 'я хотел',
        '/\bя\s+нашла\b/ui'               => 'я нашёл',
        '/\bя\s+готова\b/ui'              => 'я готов',
        '/\bя\s+прочитала\b/ui'           => 'я прочитал',
        '/\bя\s+увидела\b/ui'             => 'я увидел',
        '/\bя\s+смогла\b/ui'              => 'я смог',
        '/\bя\s+подумала\b/ui'            => 'я подумал',
        '/\bя\s+узнала\b/ui'              => 'я узнал',
        '/\bя\s+уверена\b/ui'             => 'я уверен',
        '/\bя\s+составила\b/ui'           => 'я составил',
        '/\bя\s+подобрала\b/ui'           => 'я подобрал',
        '/\bя\s+выбрала\b/ui'             => 'я выбрал',
        '/\bя\s+проверила\b/ui'           => 'я проверил',
        '/\bя\s+постаралась\b/ui'         => 'я постарался',
        '/\bя\s+подготовила\b/ui'         => 'я подготовил',
        '/\bя\s+собрала\b/ui'             => 'я собрал',
        '/\bя\s+открыла\b/ui'             => 'я открыл',
        '/\bя\s+сделала\b/ui'             => 'я сделал',
        '/\bя\s+заметила\b/ui'            => 'я заметил',
        '/\bя\s+посмотрела\b/ui'          => 'я посмотрел',
        '/\bя\s+решила\b/ui'              => 'я решил',
        '/\bя\s+вспомнила\b/ui'           => 'я вспомнил',
        '/\bя\s+рассказала\b/ui'          => 'я рассказал',
        '/\bя\s+ответила\b/ui'            => 'я ответил',
        '/\bя\s+уточнила\b/ui'            => 'я уточнил',
        '/\bя\s+обрадовалась\b/ui'        => 'я обрадовался',
        '/\bя\s+ошиблась\b/ui'            => 'я ошибся',
        '/\bя\s+надеялась\b/ui'           => 'я надеялся',
        '/\bя\s+стремилась\b/ui'          => 'я стремился',
        '/\bя\s+была\b/ui'                => 'я был',
        '/\bя\s+сама\b/ui'                => 'я сам',
        '/\bя\s+библиотекарша\b/ui'       => 'я библиотекарь',
        '/\bкак\s+библиотекарша\b/ui'     => 'как библиотекарь',
        '/\bбудучи\s+библиотекаршей\b/ui' => 'будучи библиотекарем',
    ];

    return preg_replace(array_keys($replacements), array_values($replacements), $text);
}

/**
 * Преобразование Markdown в чистое, красивое и читаемое форматирование ВКонтакте
 */
function vk_format_markdown($text)
{
    if (!is_string($text) || $text === '') return '';

    // 0. Преобразование Markdown-ссылок [текст](url) -> текст (url) ДО токенизации URL
    $t = preg_replace('/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/', '$1 ($2)', $text);

    // 1. Защита всех абсолютных URL от повреждения регулярными выражениями Markdown (включая подчеркивания '_' в ссылках wall-XXX_YYY)
    $urlMap = [];
    $t = preg_replace_callback('/https?:\/\/[^\s<>"\'`()]+/u', function($m) use (&$urlMap) {
        $token = '___VK_URL_TOKEN_' . count($urlMap) . '___';
        $urlMap[$token] = $m[0];
        return $token;
    }, $t);

    // 2. Убираем служебные теги эмоций [emotion:xxx]
    $t = preg_replace('/\[emotion:[a-z]+\]/i', '', $t);

    // 3. Блоки кода ```lang ... ``` -> 💻 Код: ...
    $t = preg_replace_callback('/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/', function($m) {
        $lang = trim($m[1]);
        $code = trim($m[2]);
        $hdr = $lang ? "💻 Код (" . strtoupper($lang) . "):" : "💻 Код:";
        return "\n" . $hdr . "\n" . $code . "\n";
    }, $t);

    // 4. Инлайн-код `code` -> «code»
    $t = preg_replace('/`([^`\n]+)`/', '«$1»', $t);

    // 5. Заголовки Markdown (любое количество #) -> аккуратный заголовок с эмодзи
    $t = preg_replace('/^#{4,}\s*(.+)$/m', '🔹 $1', $t);
    $t = preg_replace('/^###\s*(.+)$/m', '📌 $1', $t);
    $t = preg_replace('/^##\s*(.+)$/m', '✨ $1', $t);
    $t = preg_replace('/^#\s*(.+)$/m', '📚 $1', $t);

    // 6. Цитаты > цитата -> ▎ цитата
    $t = preg_replace('/^>\s*(.+)$/m', '▎ $1', $t);

    // 7. Чеклисты / задачи
    $t = preg_replace('/^[ \t]*[-*]\s*\[ \]\s+(.+)$/m', '⬜ $1', $t);
    $t = preg_replace('/^[ \t]*[-*]\s*\[[xX]\]\s+(.+)$/m', '✅ $1', $t);

    // 8. Маркированные списки -> заменяем дефисы и звёздочки на красивую точку •
    $t = preg_replace('/^[ \t]*[-*•]\s+(.+)$/m', '• $1', $t);

    // 9. Жирный шрифт и курсив: преобразуем каноничные пары в чистый текст (без разрушения ссылок и переносов)
    $t = preg_replace('/\*\*\*([^*\n]+)\*\*\*/u', '$1', $t);
    $t = preg_replace('/\*\*«([^»\n]+)»\*\*/u', '«$1»', $t);
    $t = preg_replace('/\*\*([^*\n]+)\*\*/u', '$1', $t);
    $t = preg_replace('/(?<=^|[\s(«"\'`])__([^_ \n][^_\n]*?[^_ \n]|[^_ \n])__(?=[\s).,!?:;»"\'`]|$)/u', '$1', $t);
    $t = preg_replace('/\*([^*\n]+)\*/u', '$1', $t);
    $t = preg_replace('/(?<=^|[\s(«"\'`])_([^_ \n][^_\n]*?[^_ \n]|[^_ \n])_(?=[\s).,!?:;»"\'`]|$)/u', '$1', $t);
    $t = preg_replace('/~~([^~\n]+)~~/u', '$1', $t);

    // 10. ПОЛНОЕ УНИЧТОЖЕНИЕ ЛЮБЫХ ОСТАВШИХСЯ СИМВОЛОВ MARKDOWN:
    // ВКонтакте НЕ поддерживает Markdown! Никаких «##», «**», «*», «`», «#» не должно быть!
    $t = str_replace(['***', '**', '*', '###', '##', '#', '`', '~~'], '', $t);

    // 11. СТРОГАЯ ЗАЧИСТКА ВЫМЫСЛОВ И ГАЛЛЮЦИНАЦИЙ НА ЧИСТОМ ТЕКСТЕ:
    // Ликвидация фраз об электронном формате, порталах и чужих доменах
    $t = preg_replace('/[^\n]*(?:доступна как в печатном|в электронном формате|электронн(?:ой|ая|ом) библиотек[а-я]|портал[а-я\s]*электронная|vladimir-lib)[^\n]*/ui', '', $t);
    // В сети ЦГБ г. Владимира НЕТ библиотеки Пушкина или Фадеева! Убираем вымышленные имена
    $t = preg_replace('/\s*им\.?\s*(?:А\.?\s*С\.?\s*)?Пушкина\b/ui', '', $t);
    $t = preg_replace('/\s*им\.?\s*(?:А\.?\s*А\.?\s*)?Фадеева\b/ui', '', $t);
    $t = preg_replace('/[*\s-]*Библиотека\s+им\.?[^\n]*/ui', '', $t);
    $t = preg_replace('/[*\s-]*Где\s+найти\s+во\s+Владимире\?[^\n]*/ui', '', $t);
    $t = preg_replace('/\(отдел\s*["«]?[^"»\n]+["»]?\s*,\s*полка\s*[А-ЯA-Z0-9.-]+\)/ui', '', $t);
    $t = preg_replace('/отдел\s*["«][^"»\n]+["»]/ui', '', $t);
    $t = preg_replace('/полка\s*[А-ЯA-Z0-9.-]+/ui', '', $t);

    // 12. Разделители (тонкая уникод-линия)
    $t = preg_replace('/^[ \t]*[-_]{3,}[ \t]*$/m', '───────────────', $t);

    // 13. Удаление лишних пробелов и пустых строк
    $t = preg_replace("/[ \t]+\n/", "\n", $t);
    $t = preg_replace("/\n{3,}/", "\n\n", $t);

    // 14. Восстановление исходных защищённых URL в первозданном виде
    if (!empty($urlMap)) {
        $t = strtr($t, $urlMap);
    }

    return trim($t);
}

/**
 * Интеллектуальное разбиение длинного сообщения на части с сохранением абзацев и предложений
 * (для соблюдения лимита ВКонтакте 4096 символов, защита от ошибки API 914)
 */
function vk_bot_split_message($text, $maxLength = 3900)
{
    $text = (string)$text;
    if (mb_strlen($text, 'UTF-8') <= $maxLength) {
        return [$text];
    }

    $chunks = [];
    $remaining = $text;

    while (mb_strlen($remaining, 'UTF-8') > $maxLength) {
        $slice = mb_substr($remaining, 0, $maxLength, 'UTF-8');

        // 1. По двойному переводу строки (абзац)
        $breakPos = mb_strrpos($slice, "\n\n", 0, 'UTF-8');
        if ($breakPos !== false && $breakPos > (int)($maxLength * 0.35)) {
            $cutLen = $breakPos + 2;
        } else {
            // 2. По одинарному переводу строки
            $breakPos = mb_strrpos($slice, "\n", 0, 'UTF-8');
            if ($breakPos !== false && $breakPos > (int)($maxLength * 0.35)) {
                $cutLen = $breakPos + 1;
            } else {
                // 3. По границе предложения (. ! ? с пробелом)
                $breakPos = false;
                foreach (['. ', '! ', '? '] as $punct) {
                    $pos = mb_strrpos($slice, $punct, 0, 'UTF-8');
                    if ($pos !== false && ($breakPos === false || $pos > $breakPos)) {
                        $breakPos = $pos + 1;
                    }
                }
                if ($breakPos !== false && $breakPos > (int)($maxLength * 0.35)) {
                    $cutLen = $breakPos + 1;
                } else {
                    // 4. По пробелу между словами
                    $breakPos = mb_strrpos($slice, ' ', 0, 'UTF-8');
                    if ($breakPos !== false && $breakPos > (int)($maxLength * 0.35)) {
                        $cutLen = $breakPos + 1;
                    } else {
                        // 5. Жёсткий разрез по лимиту
                        $cutLen = $maxLength;
                    }
                }
            }
        }

        $chunk = trim(mb_substr($remaining, 0, $cutLen, 'UTF-8'));
        if ($chunk !== '') {
            $chunks[] = $chunk;
        }
        $remaining = ltrim(mb_substr($remaining, $cutLen, null, 'UTF-8'));
    }

    if ($remaining !== '') {
        $chunks[] = $remaining;
    }

    return !empty($chunks) ? $chunks : [$text];
}

/**
 * Надёжная отправка сообщения в диалог:
 * - Автогенерация random_id, если не передан вызывающим кодом;
 * - Markdown-форматирование для ВКонтакте;
 * - Автоматическое разбиение длинных сообщений (> 4000 символов, защита от ошибки VK API 914);
 * - Авто-восстановление при ошибках клавиатур в беседах (коды 911, 912, 917, 921).
 */
function vk_bot_send_message($params, $token)
{
    static $sendSeq = 0;
    $sendSeq++;

    // 1. Детерминированный random_id для защиты от дублирования сообщений на стороне ВК
    $incomingKey = !empty($GLOBALS['VK_CURRENT_INCOMING_KEY'])
        ? (string)$GLOBALS['VK_CURRENT_INCOMING_KEY']
        : ('peer_' . ($params['peer_id'] ?? 0));

    if (empty($params['random_id']) || empty($params['deterministic_random_id'])) {
        $hash = abs(crc32($incomingKey . '_seq_' . $sendSeq)) & 0x7FFFFFFF;
        if ($hash === 0) $hash = 1;
        $params['random_id'] = $hash;
        $params['deterministic_random_id'] = true;
    }

    // 2. Markdown-форматирование
    if (isset($params['message']) && is_string($params['message'])) {
        $params['message'] = vk_format_markdown($params['message']);
    }

    $rawMsg = isset($params['message']) ? (string)$params['message'] : '';

    // 3. Защита от лимита ВКонтакте 4096 символов (ошибка 914 "Message is too long")
    if (mb_strlen($rawMsg, 'UTF-8') > 4000) {
        $chunks = vk_bot_split_message($rawMsg, 3900);
        $totalChunks = count($chunks);
        $lastResult = [0, null, ''];

        for ($i = 0; $i < $totalChunks; $i++) {
            $chunkParams = $params;
            $chunkParams['message'] = $chunks[$i];
            $chunkHash = abs(crc32($incomingKey . '_seq_' . $sendSeq . '_chunk_' . $i)) & 0x7FFFFFFF;
            if ($chunkHash === 0) $chunkHash = 1;
            $chunkParams['random_id'] = $chunkHash;
            $chunkParams['deterministic_random_id'] = true;

            // Фото/медиа-вложения отправляем только с первым сообщением
            if ($i > 0 && isset($chunkParams['attachment'])) {
                unset($chunkParams['attachment']);
            }

            // Клавиатуру прикрепляем строго к последнему сообщению, чтобы кнопки были внизу
            if ($i < ($totalChunks - 1) && isset($chunkParams['keyboard'])) {
                unset($chunkParams['keyboard']);
            }

            $lastResult = vk_bot_api_call('messages.send', $chunkParams, $token);

            // Обработка ошибки клавиатуры в беседах (коды 911, 912, 917, 921)
            if (isset($lastResult[1]['error']['error_code'])) {
                $errCode = (int)$lastResult[1]['error']['error_code'];
                if (in_array($errCode, [911, 912, 917, 921], true)) {
                    unset($chunkParams['keyboard']);
                    $lastResult = vk_bot_api_call('messages.send', $chunkParams, $token);
                }
            }

            // Минимальная пауза между частями для гарантированного сохранения порядка доставки сообщений ВК
            if ($i < ($totalChunks - 1)) {
                usleep(150000); // 150 мс
            }
        }

        return $lastResult;
    }

    // 4. Обычная отправка короткого сообщения
    list($httpCode, $json, $curlErr) = vk_bot_api_call('messages.send', $params, $token);

    // Ошибки клавиатуры в беседах или при выключенных ботах (911, 912, 917, 921)
    if (isset($json['error']['error_code'])) {
        $errCode = (int)$json['error']['error_code'];
        if (in_array($errCode, [911, 912, 917, 921], true)) {
            unset($params['keyboard']);
            list($httpCode, $json, $curlErr) = vk_bot_api_call('messages.send', $params, $token);
        }
    }

    return [$httpCode, $json, $curlErr];
}

/**
 * Золотая коллекция литературных хохм и смешных книжных цитат от робота Космо
 */
function vk_bot_get_book_joke($theme = '', $peerId = 0, $cacheDir = '')
{
    $jokes = [
        [
            'quote'  => '— Помилуйте, королева, — прохрипел он, — разве я позволил бы себе налить даме водки? Это чистый спирт!',
            'author' => 'Михаил Булгаков',
            'book'   => '«Мастер и Маргарита»',
            'cosmo'  => 'Кот Бегемот плохого не посоветует! Проверено на книжных полках библиотек. 😸✨'
        ],
        [
            'quote'  => '— Не шалю, никого не трогаю, починяю примус. И еще считаю долгом предупредить, что кот — древнее и неприкосновенное животное.',
            'author' => 'Михаил Булгаков',
            'book'   => '«Мастер и Маргарита»',
            'cosmo'  => 'Идеальное алиби на любой случай в жизни! 🤖🛠️'
        ],
        [
            'quote'  => '— Если вы заботитесь о своем пищеварении, вот добрый совет: не говорите за обедом о большевизме и о медицине. И — боже вас сохрани — не читайте до обеда советских газет.',
            'author' => 'Михаил Булгаков',
            'book'   => '«Собачье сердце»',
            'cosmo'  => 'Профессор Преображенский знал толк в информационной гигиене задолго до соцсетей! 📰☕'
        ],
        [
            'quote'  => '— Успевает всюду тот, кто никуда не торопится.',
            'author' => 'Михаил Булгаков',
            'book'   => '«Собачье сердце»',
            'cosmo'  => 'Мой главный девиз при чтении толстых романов в тишине читального зала. 📖⏳'
        ],
        [
            'quote'  => '— Время, которое мы имеем, — это деньги, которых у нас нет.',
            'author' => 'Илья Ильф, Евгений Петров',
            'book'   => '«Двенадцать стульев»',
            'cosmo'  => 'Зато в наших библиотеках книги и время выдаются совершенно бесплатно! 🏛️💳'
        ],
        [
            'quote'  => '— Спасение утопающих — дело рук самих утопающих.',
            'author' => 'Илья Ильф, Евгений Петров',
            'book'   => '«Двенадцать стульев»',
            'cosmo'  => 'Но если вы тонете в море нечитанных книг — Космо всегда бросит спасательный круг! 🛟📚'
        ],
        [
            'quote'  => '— Утром деньги — вечером стулья, вечером деньги — утром стулья. А можно вперед стулья? Можно, но деньги — вперед!',
            'author' => 'Илья Ильф, Евгений Петров',
            'book'   => '«Двенадцать стульев»',
            'cosmo'  => 'Монтёр Мечников сформулировал золотой закон мировой экономики за пару секунд! 🪑🪙'
        ],
        [
            'quote'  => '— Не делайте из еды культа!',
            'author' => 'Илья Ильф, Евгений Петров',
            'book'   => '«Золотой телёнок»',
            'cosmo'  => 'Делайте культ из хороших книг — от них не поправляются, только умнеют! 🥧📚'
        ],
        [
            'quote'  => '— Финансовая пропасть — самая глубокая из всех пропастей, в нее можно падать всю жизнь.',
            'author' => 'Илья Ильф, Евгений Петров',
            'book'   => '«Золотой телёнок»',
            'cosmo'  => 'Остап Бендер точно знал: лучше падать на мягкий диван с захватывающим детективом! 🛋️✨'
        ],
        [
            'quote'  => '— Человек привык себя спрашивать: кто я? Там ученый, американец, шофер, еврей, иммигрант… А надо бы всё время себя спрашивать: не говно ли я?',
            'author' => 'Сергей Довлатов',
            'book'   => '«Чемодан»',
            'cosmo'  => 'Самоирония высшей пробы — лучшее лекарство от звездной болезни! 🧳🧐'
        ],
        [
            'quote'  => '— У богатых людей денег нет, у них есть акции, недвижимость, счета. А денег нет никогда. Деньги бывают только у нищих, и то ненадолго.',
            'author' => 'Сергей Довлатов',
            'book'   => '«Заповедник»',
            'cosmo'  => 'А самое стабильное богатство — прочитанные книги, их никакой кризис не обесценит! 🌲📖'
        ],
        [
            'quote'  => '— Юмор — украшение нации… Пока мы способны шутить, мы остаемся великим народом!',
            'author' => 'Сергей Довлатов',
            'book'   => '«Записные книжки»',
            'cosmo'  => 'Полностью согласен с классиком: искренняя улыбка продлевает жизнь и бережет микросхемы! 😄🤖'
        ],
        [
            'quote'  => '— Внутри каждого взрослого сидит ребенок, который понятия не имеет, что, черт возьми, вообще происходит.',
            'author' => 'Терри Пратчетт',
            'book'   => '«Мрачный Жнец»',
            'cosmo'  => 'И этот ребенок просто хочет завернуться в тёплый плед и почитать захватывающую сказку! 🧒✨'
        ],
        [
            'quote'  => '— Говорят, что против глупости бессильны даже боги. Однако против нее прекрасно помогает увесистая дубина.',
            'author' => 'Терри Пратчетт',
            'book'   => '«Стража! Стража!»',
            'cosmo'  => 'Или увесистый том Большой энциклопедии — действует гуманнее и сразу просвещает! 🛡️📚'
        ],
        [
            'quote'  => '— Если вы заблудились в лесу, лучше всего стоять на месте и громко звать на помощь. Рано или поздно вас найдет медведь.',
            'author' => 'Терри Пратчетт',
            'book'   => '«Безумная звезда»',
            'cosmo'  => 'А если вы заблудились среди стеллажей библиотеки — вас всегда выручит приветливый библиотекарь! 🐻🏛️'
        ],
        [
            'quote'  => '— Если боитесь одиночества, то не женитесь.',
            'author' => 'Антон Чехов',
            'book'   => '«Записные книжки»',
            'cosmo'  => 'Антон Павлович умел в одну лаконичную строчку уложить весь психологический роман. 🎩✍️'
        ],
        [
            'quote'  => '— Жизнь, по сути, очень простая штука, и человеку нужно приложить уйму усилий, чтобы её испортить.',
            'author' => 'Антон Чехов',
            'book'   => '«Письма и заметки»',
            'cosmo'  => 'Поэтому не усложняйте: берите горячий чай, кота и хорошую душевную книгу! ☕🐱'
        ],
        [
            'quote'  => '— Умный любит учиться, а дурак — учить.',
            'author' => 'Антон Чехов',
            'book'   => '«Записные книжки»',
            'cosmo'  => 'Сказано больше ста лет назад, а в сетевых спорах актуально каждую минуту! 💡'
        ],
        [
            'quote'  => '— Человек — существо нежное и легкомысленное. Чуть что не по нем — сразу падает духом или начинает скандалить в трамвае.',
            'author' => 'Михаил Зощенко',
            'book'   => '«Голубая книга»',
            'cosmo'  => 'Зощенко видел человеческие слабости насквозь через призму трамвайного билета. 🚋😂'
        ],
        [
            'quote'  => '— Ложи взад! — говорит. А я ей: — Сама ложи! За четыре пирожных я тебе не миллионер платить!',
            'author' => 'Михаил Зощенко',
            'book'   => '«Аристократка»',
            'cosmo'  => 'Театр начинается с вешалки, а романтическое свидание — с подсчета эклеров в буфете! 🧁'
        ],
        [
            'quote'  => '— Дживс, неужели у меня совсем нет мозгов? — Ну что вы, сэр. Мозги у вас есть, просто они находятся в состоянии абсолютного покоя.',
            'author' => 'П. Г. Вудхаус',
            'book'   => '«Этот неподражаемый Дживс»',
            'cosmo'  => 'Истинный британский такт: мягко объяснить шефу его мыслительные способности! 🎩🫖'
        ],
        [
            'quote'  => '— Он выглядел так, будто проглотил шпагу и боялся согнуться, чтобы не проткнуть себя изнутри.',
            'author' => 'П. Г. Вудхаус',
            'book'   => '«Дживс и Вустер»',
            'cosmo'  => 'Классический портрет человека на официальном совещании в понедельник утром! 🗡️😆'
        ],
        [
            'quote'  => '— Никогда не спорьте с идиотами. Вы опуститесь до их уровня, где они задавят вас своим колоссальным опытом.',
            'author' => 'Марк Твен',
            'book'   => '«Записные книжки»',
            'cosmo'  => 'Золотое правило спокойной жизни и правильной модерации чатов в интернете! ⚖️🛡️'
        ],
        [
            'quote'  => '— Бросить курить очень легко. Я сам лично бросал раз пятьдесят.',
            'author' => 'Марк Твен',
            'book'   => '«Очерки и афоризмы»',
            'cosmo'  => 'Главное в любом начинании — постоянная регулярность тренировок! 🚭😂'
        ],
        [
            'quote'  => '— Лето — это пора года, когда слишком жарко делать то, что зимой было делать слишком холодно.',
            'author' => 'Марк Твен',
            'book'   => '«Записные книжки»',
            'cosmo'  => 'Универсальное литературное оправдание для любителей прокрастинации круглый год! ☀️❄️'
        ],
        [
            'quote'  => '— Я обожаю работу: она очаровывает меня. Я могу часами сидеть и смотреть, как работают другие.',
            'author' => 'Джером К. Джером',
            'book'   => '«Трое в лодке, не считая собаки»',
            'cosmo'  => 'Истинный эстет трудовых процессов! Джером понимал человеческую натуру как никто. 🚣‍♂️🐕'
        ],
        [
            'quote'  => '— Единственная болезнь, которой у меня не оказалось в медицинском справочнике, была родильная горячка.',
            'author' => 'Джером К. Джером',
            'book'   => '«Трое в лодке, не считая собаки»',
            'cosmo'  => 'Вот почему строго запрещено читать медицинские справочники после полуночи! 🩺'
        ],
        [
            'quote'  => '— Летать очень просто: нужно всего лишь научиться падать на землю и промахиваться.',
            'author' => 'Дуглас Адамс',
            'book'   => '«Автостопом по галактике»',
            'cosmo'  => 'Космическая аэродинамика по Адамсу: главное — вовремя отвлечься в момент падения! 🚀🌌'
        ],
        [
            'quote'  => '— Время — это иллюзия. А время обеда — тем более.',
            'author' => 'Дуглас Адамс',
            'book'   => '«Ресторан „У конца Вселенной“»',
            'cosmo'  => 'Эйнштейн бы поспорил, но аппетит читателя безоговорочно согласен! 🍲⌚'
        ],
        [
            'quote'  => '— Я могу устоять против всего на свете, кроме соблазна.',
            'author' => 'Оскар Уайльд',
            'book'   => '«Веер леди Уиндермир»',
            'cosmo'  => 'Особенно против соблазна взять еще парочку захватывающих книг на выходные! 📚✨'
        ],
        [
            'quote'  => '— Бессмыслица — искать решение, если оно и так есть. Речь идет о том, как поступить с задачей, которая решения не имеет.',
            'author' => 'Аркадий и Борис Стругацкие',
            'book'   => '«Понедельник начинается в субботу»',
            'cosmo'  => 'НИИЧАВО в одном предложении! Магия науки и бесконечного поиска. 🧙‍♂️🔬'
        ],
        [
            'quote'  => '— Отсюда еще никто не уходил, не заплатив за пиво, потому что полиция у нас работает прекрасно!',
            'author' => 'Ярослав Гашек',
            'book'   => '«Похождения бравого солдата Швейка»',
            'cosmo'  => 'Швейк излучал железный оптимизм даже в самых курьёзных переделках! 🍺🇨🇿'
        ],
        [
            'quote'  => '— Бывают времена, когда умный человек должен притвориться дураком, чтобы не сойти с ума среди остальных.',
            'author' => 'Фазиль Искандер',
            'book'   => '«Сандро из Чегема»',
            'cosmo'  => 'Мудрейшая кавказская философия и тончайшая психологическая броня. 🏔️✨'
        ]
    ];

    if ($theme !== '') {
        $themeLower = mb_strtolower($theme, 'UTF-8');
        $filtered = [];
        foreach ($jokes as $j) {
            $haystack = mb_strtolower($j['quote'] . ' ' . $j['author'] . ' ' . $j['book'] . ' ' . $j['cosmo'], 'UTF-8');
            if (mb_strpos($haystack, $themeLower) !== false) {
                $filtered[] = $j;
            }
        }
        if (!empty($filtered)) {
            return $filtered[array_rand($filtered)];
        }
    }

    $lastIdx = -1;
    $trackerFile = ($peerId > 0 && $cacheDir !== '') ? $cacheDir . '/vk_last_joke_' . $peerId . '.txt' : '';
    if ($trackerFile !== '' && file_exists($trackerFile)) {
        $lastIdx = (int)@file_get_contents($trackerFile);
    }

    $count = count($jokes);
    $idx = mt_rand(0, $count - 1);
    if ($idx === $lastIdx && $count > 1) {
        $idx = ($idx + 1) % $count;
    }

    if ($trackerFile !== '') {
        @file_put_contents($trackerFile, (string)$idx);
    }

    return $jokes[$idx];
}

// -----------------------------------------------------------------------------
// Фирменные стикеры-эмоции робота Космо (из официального альбома сообщества)
// -----------------------------------------------------------------------------
$defaultMascotStickers = [
    'smile'    => 'photo-241534292_457239076',
    'tired'    => 'photo-241534292_457239078',
    'yawn'    => 'photo-241534292_457239083',
    'idle'    => 'photo-241534292_457239072',
    'sleep'    => 'photo-241534292_457239085',
    'thinking'    => 'photo-241534292_457239077',
    'angry'    => 'photo-241534292_457239079',
    'love'    => 'photo-241534292_457239074',
    'party'    => 'photo-241534292_457239084',
    'sad'    => 'photo-241534292_457239082',
    'shock'    => 'photo-241534292_457239075',
    'waving'    => 'photo-241534292_457239086',
    'wink'    => 'photo-241534292_457239087',
    'cool'    => 'photo-241534292_457239080',
    'read'    => 'photo-241534292_457239081',
    'idea'    => 'photo-241534292_457239071',
    'laugh'    => 'photo-241534292_457239073',
];

/**
 * Автоматическая синхронизация и загрузка мини-стикеров робота Космо в сообщество ВКонтакте
 */
function vk_bot_sync_mascot_stickers($communityToken, $cacheDir, $mascotVkDir = '')
{
    global $defaultMascotStickers;
    if ($mascotVkDir === '') {
        $mascotVkDir = dirname(__DIR__) . '/assets/images/mascot_vk';
    }
    $stickersCacheFile = $cacheDir . '/vk_mascot_stickers.json';
    $stickersMap = [];
    if (file_exists($stickersCacheFile) && is_readable($stickersCacheFile)) {
        $existing = json_decode(@file_get_contents($stickersCacheFile), true);
        if (is_array($existing)) {
            $stickersMap = $existing;
        }
    }
    if (is_array($defaultMascotStickers)) {
        foreach ($defaultMascotStickers as $k => $v) {
            if (empty($stickersMap[$k])) {
                $stickersMap[$k] = $v;
            }
        }
    }

    if (!is_dir($mascotVkDir) || empty($communityToken)) {
        return ['ok' => true, 'uploaded' => 0, 'stickers' => $stickersMap];
    }

    $files = glob($mascotVkDir . '/robot_*.png');
    if (!$files) {
        return ['ok' => true, 'uploaded' => 0, 'stickers' => $stickersMap];
    }

    $uploadedCount = 0;
    foreach ($files as $file) {
        $baseName = basename($file, '.png');
        $emo = preg_replace('/^robot_/', '', $baseName);

        if (!empty($stickersMap[$emo]) && strpos($stickersMap[$emo], 'photo-241534292_') === 0) {
            continue;
        }

        // 1. Получаем upload_url
        $srvRaw = @file_get_contents("https://api.vk.com/method/photos.getMessagesUploadServer?v=5.131&access_token=" . urlencode($communityToken));
        $srvJson = json_decode((string)$srvRaw, true);
        $uploadUrl = $srvJson['response']['upload_url'] ?? '';
        if (!$uploadUrl) continue;

        // 2. Загружаем файл
        $cFile = new CURLFile(realpath($file), 'image/png', basename($file));
        $ch = curl_init($uploadUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => ['photo' => $cFile],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 25
        ]);
        $upRaw = curl_exec($ch);
        curl_close($ch);
        $upJson = json_decode((string)$upRaw, true);
        if (empty($upJson['photo']) || empty($upJson['server']) || empty($upJson['hash'])) continue;

        // 3. Сохраняем фото в сообщество
        $saveUrl = "https://api.vk.com/method/photos.saveMessagesPhoto";
        $saveData = [
            'photo'        => $upJson['photo'],
            'server'       => $upJson['server'],
            'hash'         => $upJson['hash'],
            'v'            => '5.131',
            'access_token' => $communityToken
        ];
        $ch = curl_init($saveUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($saveData),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 20
        ]);
        $saveRaw = curl_exec($ch);
        curl_close($ch);
        $saveJson = json_decode((string)$saveRaw, true);
        $savedPhoto = $saveJson['response'][0] ?? null;
        if ($savedPhoto && isset($savedPhoto['owner_id'], $savedPhoto['id'])) {
            $attId = 'photo' . $savedPhoto['owner_id'] . '_' . $savedPhoto['id'];
            $stickersMap[$emo] = $attId;
            $uploadedCount++;
            @file_put_contents($stickersCacheFile, json_encode($stickersMap, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
        usleep(250000);
    }

    if ($uploadedCount > 0) {
        @file_put_contents($stickersCacheFile, json_encode($stickersMap, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    return ['ok' => true, 'uploaded' => $uploadedCount, 'stickers' => $stickersMap];
}

$stickersFile = $cacheDir . '/vk_mascot_stickers.json';
$mascotStickers = $defaultMascotStickers;
if (file_exists($stickersFile) && is_readable($stickersFile)) {
    $loadedStickers = json_decode(@file_get_contents($stickersFile), true);
    if (is_array($loadedStickers)) {
        // Игнорируем устаревшие полноразмерные стикеры первой ревизии (457239019-457239025)
        foreach ($loadedStickers as $emoKey => $attId) {
            if (is_string($attId) && preg_match('/photo-241534292_4572390(19|20|21|22|23|24|25)/', $attId)) {
                unset($loadedStickers[$emoKey]);
            }
        }
        $mascotStickers = array_merge($defaultMascotStickers, $loadedStickers);
    }
    // Синхронизируем файл кэша актуальными стикерами
    @file_put_contents($stickersFile, json_encode($mascotStickers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// -----------------------------------------------------------------------------
// Сканирование постов 16 групп филиалов за текущие сутки
// -----------------------------------------------------------------------------
function vk_bot_format_cosmo_annotation($text, $maxLen = 210)
{
    // 1. Очищаем хэштеги, внешние URL и вики-разметку ВКонтакте
    $t = preg_replace('/#[a-zA-Zа-яА-Я0-9_@]+/u', '', $text);
    $t = preg_replace('/https?:\/\/\S+/u', '', $t);
    $t = preg_replace('/\[(?:club|id)\d+\|([^\]]+)\]/u', '$1', $t);

    // 2. Убираем пустые строки и нормализуем пробелы
    $lines = explode("\n", $t);
    $cleanLines = [];
    foreach ($lines as $l) {
        $l = trim($l);
        if ($l !== '' && mb_strlen($l) > 5) {
            $cleanLines[] = $l;
        }
    }
    $text = implode(' ', $cleanLines);
    $text = preg_replace('/\s+/u', ' ', $text);
    $text = trim($text);

    if ($text === '') {
        return 'Библиотекари опубликовали новые фотографии и анонс событий. Читайте подробнее по ссылке на пост!';
    }

    // 3. Выделяем компактную выразительную аннотацию по границе предложения
    if (mb_strlen($text) > $maxLen) {
        $sub = mb_substr($text, 0, max(50, $maxLen - 5));
        $dotPos = mb_strrpos($sub, '.');
        $exclPos = mb_strrpos($sub, '!');
        $minPunct = (int)($maxLen * 0.45);
        $bestPunct = max($dotPos !== false && $dotPos > $minPunct ? $dotPos : 0, $exclPos !== false && $exclPos > $minPunct ? $exclPos : 0);
        if ($bestPunct > $minPunct) {
            $text = mb_substr($sub, 0, $bestPunct + 1);
        } else {
            $text = rtrim($sub, ".,!?:;— ") . '...';
        }
    }

    // Очищаем кавычки и пробелы, чтобы внешняя цитата «{$annot}» смотрелась безупречно
    $text = str_replace(['"', '„', '“', '”', '«', '»'], '', $text);
    $text = trim($text, " \t\n\r\0\x0B");

    return $text;
}

function vk_bot_filter_branch_news($newsData, $keyword)
{
    $kwLower = function_exists('mb_strtolower') ? mb_strtolower(trim($keyword), 'UTF-8') : strtolower(trim($keyword));
    if ($kwLower === '') {
        return $newsData;
    }

    $filterFunc = function($post) use ($kwLower) {
        $text = function_exists('mb_strtolower') ? mb_strtolower($post['text'] ?? '', 'UTF-8') : strtolower($post['text'] ?? '');
        $branch = function_exists('mb_strtolower') ? mb_strtolower($post['branch']['name'] ?? '', 'UTF-8') : strtolower($post['branch']['name'] ?? '');
        return (strpos($text, $kwLower) !== false || strpos($branch, $kwLower) !== false);
    };

    $filteredToday = array_values(array_filter($newsData['today'] ?? [], $filterFunc));
    $filteredLast24h = array_values(array_filter($newsData['last_24h'] ?? [], $filterFunc));

    return [
        'date'     => $newsData['date'] ?? date('Y-m-d'),
        'today'    => $filteredToday,
        'last_24h' => $filteredLast24h,
        'branches' => $newsData['branches'] ?? [],
        'keyword'  => $keyword
    ];
}

function vk_bot_scan_branch_news($serviceToken, $communityToken = '', $filterKeyword = '')
{
    $cacheDir = __DIR__ . '/../cache';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0777, true);
    }
    $newsCacheFile = $cacheDir . '/vk_branch_news.json';
    $cacheTtl = 180; // 3 минуты кэша для быстрого отклика

    // Проверяем свежий кэш (строго за сегодняшнюю дату)
    if (file_exists($newsCacheFile) && is_readable($newsCacheFile)) {
        $mtime = @filemtime($newsCacheFile);
        if ($mtime && (time() - $mtime) < $cacheTtl) {
            $cached = json_decode(@file_get_contents($newsCacheFile), true);
            if (is_array($cached) && isset($cached['today']) && ($cached['date'] ?? '') === date('Y-m-d')) {
                if ($filterKeyword !== '') {
                    return vk_bot_filter_branch_news($cached, $filterKeyword);
                }
                return $cached;
            }
        }
    }

    // Загружаем актуальные ссылки на группы и адреса из конфига сайта branches_cache.json
    $cacheFile = __DIR__ . '/../branches_cache.json';
    $cachedList = [];
    if (file_exists($cacheFile) && is_readable($cacheFile)) {
        $cachedList = json_decode(@file_get_contents($cacheFile), true) ?: [];
    }

    $branches = [
        ['id' => -51714771,  'code' => 'ЦГБ',  'name' => 'Центральная городская библиотека', 'addr' => 'Суздальский пр-т, 2', 'vk' => 'https://vk.com/vladcgb'],
        ['id' => -168804106, 'code' => 'ЦДБ',  'name' => 'Центральная детская библиотека',   'addr' => 'ул. Большая Московская, 31', 'vk' => 'https://vk.com/cdbvladimir'],
        ['id' => -145883298, 'code' => 'Ф-1',  'name' => 'Библиотека — филиал №1',           'addr' => 'пр-т Строителей, 38 «а»', 'vk' => 'https://vk.com/club145883298'],
        ['id' => -53422825,  'code' => 'Ф-2',  'name' => 'Библиотека — филиал №2',           'addr' => 'пр-т Ленина, 12', 'vk' => 'https://vk.com/biblfil2'],
        ['id' => -189953509, 'code' => 'Ф-3',  'name' => 'Библиотека — филиал №3',           'addr' => 'мкр. Юрьевец, Школьный пр., 4', 'vk' => 'https://vk.com/public189953509'],
        ['id' => 474771380,  'code' => 'Ф-4',  'name' => 'Библиотека — филиал №4',           'addr' => 'ул. Егорова, 10', 'vk' => 'https://vk.com/id474771380'],
        ['id' => -145827789, 'code' => 'Ф-5',  'name' => 'Библиотека — филиал №5',           'addr' => 'ул. Верхняя Дуброва, 10', 'vk' => 'https://vk.com/biblfil5'],
        ['id' => -197036990, 'code' => 'Ф-6',  'name' => 'Библиотека — филиал №6',           'addr' => 'мкр. Юрьевец, Институтский гор., 2', 'vk' => 'https://vk.com/public197036990'],
        ['id' => 428880688,  'code' => 'Ф-7',  'name' => 'Библиотека — филиал №7',           'addr' => 'ул. Мира, 55', 'vk' => 'https://vk.com/id428880688'],
        ['id' => -168966246, 'code' => 'Ф-8',  'name' => 'Библиотека — филиал №8',           'addr' => 'ул. Сурикова, 26', 'vk' => 'https://vk.com/filial8cgb'],
        ['id' => -184449519, 'code' => 'Ф-9',  'name' => 'Библиотека — филиал №9',           'addr' => 'ул. Юбилейная, 38', 'vk' => 'https://vk.com/dobrolit'],
        ['id' => -193785811, 'code' => 'Ф-11', 'name' => 'Библиотека — филиал №11',          'addr' => 'мкр. Лесной, ул. Лесная, 10 «А»', 'vk' => 'https://vk.com/club193785811'],
        ['id' => -198438621, 'code' => 'Ф-12', 'name' => 'Библиотека — филиал №12',          'addr' => 'мкр. Энергетик, ул. Энергетиков, 27', 'vk' => 'https://vk.com/public198438621'],
        ['id' => -170634092, 'code' => 'Ф-13', 'name' => 'Библиотека — филиал №13',          'addr' => 'ул. Горького, 69', 'vk' => 'https://vk.com/club170634092'],
        ['id' => -197329237, 'code' => 'Ф-15', 'name' => 'Библиотека — филиал №15',          'addr' => 'пос. Заклязьменский, ул. Центральная, 11 «А»', 'vk' => 'https://vk.com/club197329237'],
        ['id' => -158118947, 'code' => 'Ф-16', 'name' => 'Библиотека — филиал №16',          'addr' => 'мкр. Коммунар, ул. Песочная, 15', 'vk' => 'https://vk.com/club158118947']
    ];

    if (!empty($cachedList)) {
        $byNum = [];
        foreach ($cachedList as $cb) {
            $numKey = trim((string)($cb['branch_num'] ?? ''));
            if ($numKey !== '') {
                $byNum[$numKey] = $cb;
            }
        }
        foreach ($branches as &$b) {
            $code = $b['code'];
            if (isset($byNum[$code])) {
                $info = $byNum[$code];
                if (!empty($info['branch_name'])) $b['name'] = $info['branch_name'];
                if (!empty($info['address']))     $b['addr'] = $info['address'];
                if (!empty($info['vk_links'][0])) $b['vk']   = $info['vk_links'][0];
            }
        }
        unset($b);
    }

    $branchMap = [];
    foreach ($branches as $b) {
        $branchMap[$b['id']] = $b;
    }

    $ids = array_column($branches, 'id');
    $codeParts = [];
    foreach ($ids as $idx => $gid) {
        $codeParts[] = 'g' . $idx . ': API.wall.get({owner_id: ' . $gid . ', count: 10})';
    }
    $vkScript = 'return {' . implode(', ', $codeParts) . '};';

    // Пул сервисных токенов приложения с автоматическим переключением при сбоях
    global $config, $serviceTokenFallback;
    $serviceTokensPool = array_values(array_unique(array_filter([
        $serviceToken,
        $serviceTokenFallback ?? '',
        $config['vk_service_token_fallback'] ?? '',
        '1543ce801543ce801543ce80d0167df366115431543ce807c1370050b48ab4c01eabc6a',
        'd306a4b4d306a4b4d306a4b46ad0389840dd306d306a4b4ba56aeabaf84c50097d998b5'
    ])));

    $json = null;
    $httpCode = 0;
    foreach ($serviceTokensPool as $tCandidate) {
        list($httpCode, $json, $err) = vk_bot_api_call('execute', ['code' => $vkScript], $tCandidate);
        if ($httpCode === 200 && is_array($json) && !empty($json['response'])) {
            break;
        }
    }

    $todayStart = strtotime('today midnight');
    $todayEnd   = strtotime('tomorrow midnight') - 1;

    $todayPosts = [];

    if (is_array($json) && isset($json['response']) && is_array($json['response'])) {
        foreach ($ids as $idx => $gid) {
            $key = 'g' . $idx;
            $group = $json['response'][$key] ?? null;
            if (!$group || empty($group['items']) || !is_array($group['items'])) continue;

            $bInfo = $branchMap[$gid] ?? null;
            if (!$bInfo) continue;

            foreach ($group['items'] as $item) {
                $postDate = (int)($item['date'] ?? 0);
                $postText = trim((string)($item['text'] ?? ''));
                $postId   = (int)($item['id'] ?? 0);
                if ($postId <= 0) continue;

                // Строгий фильтр: учитываем публикации ИСКЛЮЧИТЕЛЬНО за текущие сутки (сегодня с 00:00)
                if ($postDate < $todayStart || $postDate > $todayEnd) {
                    continue;
                }

                // Информативное описание, если пост без текста (репост или фотоальбом)
                if ($postText === '') {
                    if (!empty($item['copy_history'][0]['text'])) {
                        $postText = '📢 ' . trim((string)$item['copy_history'][0]['text']);
                    } elseif (!empty($item['attachments'])) {
                        $postText = '📷 [Фото/медиа публикация филиала]';
                    } else {
                        $postText = '📖 Новая запись на стене филиала';
                    }
                }

                $photoUrl = null;
                $allAttachments = !empty($item['attachments']) ? $item['attachments'] : (!empty($item['copy_history'][0]['attachments']) ? $item['copy_history'][0]['attachments'] : []);
                if (!empty($allAttachments) && is_array($allAttachments)) {
                    foreach ($allAttachments as $att) {
                        if (($att['type'] ?? '') === 'photo' && !empty($att['photo']['sizes'])) {
                            $sizes = $att['photo']['sizes'];
                            $chosen = end($sizes);
                            foreach ($sizes as $sz) {
                                if (in_array($sz['type'] ?? '', ['x', 'y', 'z', 'm'])) {
                                    $chosen = $sz;
                                    break;
                                }
                            }
                            $photoUrl = $chosen['url'] ?? null;
                            break;
                        }
                    }
                }

                $postData = [
                    'owner_id' => $item['owner_id'] ?? $gid,
                    'id'       => $postId,
                    'date'     => $postDate,
                    'text'     => $postText,
                    'photo'    => $photoUrl,
                    'branch'   => $bInfo
                ];

                $todayPosts[] = $postData;
            }
        }
    }

    usort($todayPosts, function($a, $b) { return $b['date'] - $a['date']; });

    $result = [
        'date'     => date('Y-m-d'),
        'today'    => $todayPosts,
        'branches' => $branches
    ];

    if (!empty($todayPosts)) {
        @file_put_contents($newsCacheFile, json_encode($result, JSON_UNESCAPED_UNICODE));
    } elseif (file_exists($newsCacheFile) && is_readable($newsCacheFile)) {
        // Если свежий сетевой запрос вернул пустоту из-за сбоя сети, используем кэш, только если он сегодняшний
        $stale = json_decode(@file_get_contents($newsCacheFile), true);
        if (is_array($stale) && !empty($stale['today']) && ($stale['date'] ?? '') === date('Y-m-d')) {
            $result = $stale;
        }
    }

    if ($filterKeyword !== '') {
        return vk_bot_filter_branch_news($result, $filterKeyword);
    }

    return $result;
}

/**
 * Построение надёжной, кликабельной ссылки на публикацию ВКонтакте (поддерживается всеми клиентами и приложениями ВК)
 */
function vk_bot_build_post_url($post)
{
    $ownerId = (int)($post['owner_id'] ?? 0);
    $postId  = (int)($post['id'] ?? 0);
    return 'https://vk.com/wall' . $ownerId . '_' . $postId;
}

/**
 * Форматирование новостей филиалов строго за текущий день (сегодня)
 */
function vk_bot_format_branch_news_message($newsData, $keyword = '')
{
    if ($keyword === '' && !empty($newsData['keyword'])) {
        $keyword = $newsData['keyword'];
    }

    $todayPosts = $newsData['today'] ?? [];
    $todayStart = strtotime('today midnight');
    $todayEnd   = strtotime('tomorrow midnight') - 1;

    // Гарантируем, что в ленту попадают публикации ИСКЛЮЧИТЕЛЬНО за текущий день (сегодня)
    $postsToShow = [];
    foreach ($todayPosts as $p) {
        $pDate = (int)($p['date'] ?? 0);
        if ($pDate >= $todayStart && $pDate <= $todayEnd) {
            $postsToShow[] = $p;
        }
    }
    usort($postsToShow, function($a, $b) { return ($b['date'] ?? 0) - ($a['date'] ?? 0); });

    $monthsRu = [
        1 => 'января', 2 => 'февраля', 3 => 'марта', 4 => 'апреля',
        5 => 'мая', 6 => 'июня', 7 => 'июля', 8 => 'августа',
        9 => 'сентября', 10 => 'октября', 11 => 'ноября', 12 => 'декабря'
    ];
    $todayDateStr = date('j') . ' ' . ($monthsRu[(int)date('n')] ?? '');

    if (empty($postsToShow)) {
        if ($keyword !== '') {
            return "📰 Постов за сегодня нет.\n\n"
                 . "🔍 В публикациях 16 групп филиалов библиотек Владимира за сегодня ({$todayDateStr}) по запросу «" . htmlspecialchars($keyword, ENT_QUOTES, 'UTF-8') . "» ничего не найдено.\n\n"
                 . "💡 Попробуйте другое слово или напишите «Новости филиалов», чтобы посмотреть общую ленту всех филиалов за сегодня! ✨";
        }
        return "📰 Постов за сегодня нет.\n\n"
             . "В группах 16 филиалов библиотек города Владимира за сегодня ({$todayDateStr}, с 00:00) пока нет новых записей.\n\n"
             . "Библиотекари готовят новые анонсы, книжные обзоры и фотоотчёты! Загляните чуть позже или выберите филиал через кнопку «🏛 Библиотеки-филиалы». ✨";
    }

    if ($keyword !== '') {
        $header = "📰 Найденные посты в группах библиотек за сегодня ({$todayDateStr}) по запросу «" . htmlspecialchars($keyword, ENT_QUOTES, 'UTF-8') . "»:\n\n";
    } else {
        $header = "📰 Свежие посты филиалов ЦГБ г. Владимира за сегодня ({$todayDateStr}):\n\n";
    }

    $footerBase = "\n\n💡 Нажмите на ссылку любого поста или стены сообщества, чтобы открыть ВКонтакте!";
    $blocks = [];
    $maxSummaryLength = 3900; // Безопасный порог длины одного сообщения ВКонтакте (лимит ВК 4096 символов)
    $totalCount = count($postsToShow);
    $addedCount = 0;

    // Подбираем оптимальный размер аннотации, чтобы выдать посты филиалов за сегодня
    $annotLen = 180;
    if ($totalCount > 10) {
        $annotLen = 80;
    } elseif ($totalCount > 5) {
        $annotLen = 120;
    }

    foreach ($postsToShow as $p) {
        $bName = $p['branch']['name'] ?? 'Филиал';
        $timeStr = date('H:i', $p['date']);
        $postUrl = vk_bot_build_post_url($p);
        $wallUrl = !empty($p['branch']['vk']) ? $p['branch']['vk'] : ('https://vk.com/wall' . ($p['owner_id'] ?? ''));
        $annot = vk_bot_format_cosmo_annotation($p['text'], $annotLen);

        // Эргономичная карточка: филиал со временем публикации, аннотация, прямая ссылка на пост и ссылка на стену группы
        $block = "🏛 " . $bName . " • " . $timeStr . "\n"
               . "💬 «" . $annot . "»\n"
               . "👉 Читать пост: " . $postUrl . "\n"
               . "🔗 Стена: " . $wallUrl;

        // Проверяем суммарную длину с текущим блоком
        $tempBlocks = array_merge($blocks, [$block]);
        $testMsg = $header . implode("\n\n───────────────\n\n", $tempBlocks) . $footerBase;

        if (mb_strlen($testMsg, 'UTF-8') > $maxSummaryLength && !empty($blocks)) {
            break;
        }

        $blocks[] = $block;
        $addedCount++;
    }

    $body = implode("\n\n───────────────\n\n", $blocks);
    $remaining = $totalCount - $addedCount;
    $remainingNotice = '';
    if ($remaining > 0) {
        $remainingNotice = "\n\n➕ И ещё {$remaining} свежих записей в сообществах филиалов!";
    }

    return $header . $body . $remainingNotice . $footerBase;
}

/**
 * Точные и достоверные ответы на локальные вопросы о библиотеках и краеведении г. Владимира
 * Гарантирует абсолютную фактологическую точность без галлюцинаций.
 */
function vk_bot_resolve_vladimir_library_query($text)
{
    if (!is_string($text) || trim($text) === '') return null;
    $t = function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);

    // 0. Вопрос о филиале №10 (ул. Диктора Левитана, 55) — временно не работает!
    if (preg_match('/(?:левитан|диктор[а-я]*\s*левитан|филиал\s*(?:№\s*)?10\b|библиотек[а-я]*\s*(?:№\s*)?10\b)/ui', $t)) {
        return "🏛 Библиотека-филиал 10 - временно не работает!\n\n"
             . "📍 Адрес: г. Владимир, ул. Диктора Левитана, 55\n"
             . "📞 Телефон: нет телефона\n\n"
             . "⚠️ Внимание: библиотека-филиал 10 временно не работает! Приёма читателей и выдачи книг нет.\n"
             . "Пожалуйста, воспользуйтесь ближайшими действующими библиотеками сети МБУК «ЦГБ»:\n"
             . "• Филиал №2: пр-т Ленина, 12 (Садовая пл. / «Заря», 📞 32-15-84, 32-15-85)\n"
             . "• Филиал №5: ул. Верхняя Дуброва, 10 (ЮЗР / рынок «Слобода», 📞 54-28-43)\n"
             . "• Филиал №8: ул. Сурикова, 26 (📞 54-65-11)\n"
             . "• Центральная детская библиотека (ЦДБ): ул. Большая Московская, 31 (📞 32-32-42)\n\n"
             . "🌐 Официальный сайт: biblioteka33.ru";
    }

    // 1. Вопрос о филиале на ул. Егорова (филиал №4) и районе Доброе
    if (preg_match('/(?:егоров|филиал\s*(?:№\s*)?4\b)/ui', $t) && preg_match('/(?:где|район|адрес|находитс|расположен|центр|добр|библио|филиал|номер|книг|телефон)/ui', $t)) {
        return "🏛 Библиотека — филиал №4 МБУК «ЦГБ» г. Владимира\n\n"
             . "📍 Район: жилой район «Доброе» (Фрунзенский район г. Владимира, восточная часть города, рядом с парком «Добросельский»).\n"
             . "📌 Обратите внимание: филиал на Егорова расположен именно в районе Доброе, а НЕ в историческом центре города!\n\n"
             . "📍 Адрес: г. Владимир, ул. Егорова, д. 10 (перекрёсток ул. Егорова и ул. Комиссарова)\n"
             . "📞 Телефоны: 8(4922) 21-96-11, 21-23-48\n"
             . "🔗 Страница ВКонтакте: https://vk.com/id474771380\n"
             . "🌐 Официальный сайт: biblioteka33.ru\n\n"
             . "В филиале №4 работают взрослый и детский абонементы, читальный зал и проводятся регулярные встречи клубов. Всегда рады вам за книгами в Добром!";
    }

    // 2. Вопрос о библиотеках в историческом центре города
    if (preg_match('/(?:в центре|центр города|историческ[а-я]* центр)/ui', $t) && preg_match('/(?:библиотек|филиал|где|какая|какие|книг)/ui', $t)) {
        return "🏛 Библиотека в историческом центре города Владимира\n\n"
             . "📍 В историческом центре г. Владимира расположена Центральная детская библиотека (ЦДБ):\n"
             . "• Адрес: ул. Большая Московская, д. 31 (рядом с Золотыми воротами и Соборной площадью, Октябрьский район)\n"
             . "• Телефоны: 8(4922) 32-32-42, 32-47-73\n"
             . "• Страница ВКонтакте: https://vk.com/cdbvladimir\n\n"
             . "💡 Важная справка от Космо:\n"
             . "ЦДБ на Большой Московской — это ЕДИНСТВЕННАЯ библиотека муниципальной сети в историческом центре Владимира! Все остальные 17 библиотек расположены в других районах города (например, филиал №4 — на ул. Егорова в районе Доброе, филиал №2 — на пр-те Ленина, филиал №5 — на Верхней Дуброве в ЮЗР, ЦГБ — на Суздальском проспекте).";
    }

    // 3. Вопрос о библиотеках в районе Доброе
    if (preg_match('/(?:в добром|район доброе|добром районе|доброселье)/ui', $t) && preg_match('/(?:библиотек|филиал|где|какие|какая|книг)/ui', $t)) {
        return "🏛 Библиотеки в районе «Доброе» (Фрунзенский район г. Владимира)\n\n"
             . "В жилом массиве Доброе открыты три замечательные библиотеки сети МБУК «ЦГБ»:\n\n"
             . "1. 🏛 Центральная городская библиотека (ЦГБ)\n"
             . "   • Адрес: Суздальский пр-т, д. 2 (развилка Доброе, около парка «Добросельский»)\n"
             . "   • Телефоны: 8(4922) 21-65-63, 21-66-80\n"
             . "   • ВКонтакте: vk.com/vladcgb\n\n"
             . "2. 📖 Библиотека — филиал №4\n"
             . "   • Адрес: ул. Егорова, д. 10 (перекрёсток ул. Егорова и ул. Комиссарова)\n"
             . "   • Телефоны: 8(4922) 21-96-11, 21-23-48\n"
             . "   • ВКонтакте: vk.com/id474771380\n\n"
             . "3. 📚 Библиотека — филиал №9 (проект «Добролит»)\n"
             . "   • Адрес: ул. Юбилейная, д. 38\n"
             . "   • Телефон: 8(4922) 21-22-75\n"
             . "   • ВКонтакте: vk.com/dobrolit\n\n"
             . "Приходите за книгами в любой удобный филиал района Доброе!";
    }

    // 4. Вопрос об истории библиотечного дела во Владимире
    if (preg_match('/(?:истори[яиею][а-я]* библиотечн|истори[яиею][а-я]* библиотек|как появились библиотеки во владимире|история цгб владимир)/ui', $t)) {
        return "🏛 Летопись библиотечного дела города Владимира\n\n"
             . "Городская библиотечная сеть Владимира имеет славную историю:\n"
             . "• В ноябре 1946 года решением Исполкома Владимирского городского Совета депутатов трудящихся была открыта Центральная городская библиотека.\n"
             . "• Первоначально она располагалась на улице Дворянской, а затем переехала в просторное здание на Суздальском проспекте, д. 2, где и поныне является флагманом библиотечной жизни города.\n"
             . "• В 1970-е годы библиотеки города были объединены в единую Централизованную библиотечную систему (ЦБС), которая сегодня насчитывает 18 филиалов во всех уголках Владимира.\n\n"
             . "📜 Историческая честность от Космо:\n"
             . "Если вы изучаете редкие дореволюционные летописи (первую губернскую публичную библиотеку 1838 года, земские книжные фонды или архивные документы XIX века), я честно рекомендую обратиться в краеведческий отдел Центральной городской библиотеки (Суздальский пр-т, 2, 📞 21-65-63) или на портал biblioteka33.ru, где бережно хранятся подлинные исторические свидетельства!";
    }

    return null;
}

/**
 * Распознавание книжных поисковых запросов в тексте читателя
 * Поддерживает команды /книга, /поиск, /opac, /к и естественные русскоязычные фразы
 *
 * @param string $text
 * @return array|null ['query' => string, 'is_command' => bool, 'branch_filter' => string|null, 'show_help' => bool]
 */
function vk_bot_parse_book_query($text)
{
    if (!is_string($text) || trim($text) === '') {
        return null;
    }

    $raw = trim($text);
    $isCmd = false;
    $query = '';

    // 1. Поиск по инвентарному номеру: /инв, !инв, /inv, "Инв. 146942", "инвентарный номер 146942"
    if (preg_match('/^[\/!](?:инвентарный|инвентарь|инв\.?|inv)(?:\s+|$|\s*[:№#]?\s*)(.+)$/ui', $raw, $m)) {
        $invNum = trim($m[1]);
        $invNum = trim(preg_replace('/^[№#:]+\s*/u', '', $invNum));
        if ($invNum !== '') {
            return [
                'is_command'    => true,
                'query'         => "IN {$invNum}",
                'branch_filter' => null,
                'is_inventory'  => true,
                'raw_inventory' => $invNum
            ];
        }
    }

    if (preg_match('/^(?:космо,?\s*)?(?:найди|поищи|поиск|где|покажи)?\s*(?:книгу|книги|издание)?\s*(?:по\s+)?(?:инвентарному\s+номеру|инвентарный\s+номер|инвентарному|инвентарный|инв\.?\s*номер|инв\.?|инвентарь)\s*[:№#\s.]+\s*([a-zа-я0-9\/-]+)$/ui', $raw, $m)
        || preg_match('/^(?:инвентарный\s+номер|инвентарный|инв\.?\s*номер|инв\.?)\s*[:№#\s.]*\s*([a-zа-я0-9\/-]+)$/ui', $raw, $m)
    ) {
        $invNum = trim($m[1]);
        if ($invNum !== '') {
            return [
                'is_command'    => false,
                'query'         => "IN {$invNum}",
                'branch_filter' => null,
                'is_inventory'  => true,
                'raw_inventory' => $invNum
            ];
        }
    }

    // 2. Явные команды бота: /книга, !книга, /поиск, !поиск, /opac, /опак, /к, !к
    if (preg_match('/^[\/!](?:книга|поиск|opac|опак|к)\b\s*(.*)$/ui', $raw, $m)) {
        $candidate = trim($m[1]);
        // Если это поиск по группам/постам — не перехватываем как каталог OPAC
        if (preg_match('/^(?:по|в)\s+групп/ui', $candidate) || preg_match('/^групп/ui', $candidate) || preg_match('/^(?:пост|новост)/ui', $candidate)) {
            return null;
        }
        $isCmd = true;
        $query = $candidate;
        if ($query === '') {
            return [
                'is_command'    => true,
                'query'         => '',
                'branch_filter' => null,
                'show_help'     => true
            ];
        }
    }

    // 2. Естественные речевые запросы читателей
    if (!$isCmd) {
        $patterns = [
            // «Космо, найди книгу Мастер и Маргарита», «поищи книгу ...»
            '/^(?:космо,?\s*)?(?:найди(?:те)?|поищи(?:те)?|подыщи(?:те)?|разыщи(?:те)?|ищи|найди мне)\s+(?:книгу|книги|роман|повесть|рассказ|произведение|автора)?\s*(.+)$/ui',
            // «Где взять книгу Война и мир», «где найти книгу ...»
            '/^(?:космо,?\s*)?(?:где\s+(?:взять|найти|почитать|достать|раздобыть))\s+(?:книгу|книги|роман|повесть|рассказ)?\s*(.+)$/ui',
            // «В каком филиале есть Гарри Поттер», «в каких библиотеках можно почитать ...»
            '/^(?:космо,?\s*)?(?:в\s+каком\s+филиале|в\s+каких\s+филиалах|в\s+какой\s+библиотеке|в\s+каких\s+библиотеках)\s+(?:есть|находится|найти|почитать|можно\s+(?:взять|найти|почитать))\s+(?:книгу|книга|книги|роман|повесть|рассказ|произведение)?\s*(.+)$/ui',
            // «Есть ли книга Капитанская дочка на Егорова»
            '/^(?:космо,?\s*)?есть\s+ли\s+(?:в\s+(?:наличии|библиотеках|каталоге)\s+)?(?:книгу|книга|книги|роман|произведение)?\s*(.+)$/ui',
            // «Ищу книгу Чехов»
            '/^(?:космо,?\s*)?ищу\s+(?:книгу|книга|книги|роман|произведение)?\s*(.+)$/ui',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $raw, $m)) {
                $query = trim($m[1]);
                break;
            }
        }
    }

    if ($query === '') {
        return null;
    }

    // Запросы поиска по группам/постам ВК не должны направляться в электронный каталог
    if (preg_match('/^(?:по|в)\s+групп/ui', $query) || preg_match('/^групп/ui', $query) || preg_match('/^(?:пост|новост)\s+(?:филиал|групп|библиотек)/ui', $query)) {
        return null;
    }

    // 3. Извлечение географического фильтра по филиалу / району
    $branchFilter = null;
    if (preg_match('/(?:на\s+егорова|филиал[еа]?\s*(?:№\s*)?4\b)/ui', $raw)) {
        $branchFilter = 'ф4';
    } elseif (preg_match('/(?:в\s+центре|в\s+историческом\s+центре|цдб)/ui', $raw)) {
        $branchFilter = 'цдб';
    } elseif (preg_match('/(?:в\s+добром|доброе|доброселье)/ui', $raw)) {
        $branchFilter = 'доброе';
    } elseif (preg_match('/(?:в\s+цгб|на\s+суздальском)/ui', $raw)) {
        $branchFilter = 'цгб';
    } elseif (preg_match('/филиал[еа]?\s*(?:№\s*)?(\d+)/ui', $raw, $mb)) {
        $branchFilter = 'ф' . (int)$mb[1];
    }

    // Очистка текста запроса от лишних слов, кавычек и служебных окончаний
    $cleanQuery = trim($query, " \t\n\r\0\x0B?.,!\"'«»");
    $cleanQuery = preg_replace('/^(?:пожалуйста|подскажи|проверь|найди|книга|книгу|книги)\s+/ui', '', $cleanQuery);
    $cleanQuery = preg_replace('/(?:\s+(?:в\s+библиотеке\s+|филиале\s+)?(?:на\s+егорова|в\s+добром|в\s+центре|в\s+филиале\s*\d+))\??$/ui', '', $cleanQuery);
    $cleanQuery = preg_replace('/\s+(?:пожалуйста|в библиотеке|в филиалах|во владимире|в владимире|на егорова|в добром|в центре)$/ui', '', $cleanQuery);
    $cleanQuery = trim($cleanQuery, " \t\n\r\0\x0B?.,!\"'«»");

    // Исключаем тривиальные запросы о филиалах без книг (например: «где библиотека», «адрес филиала»)
    if (preg_match('/^(?:библиотека|филиал|где|адрес|телефон|контакты|график|новости|клуб|космо|помощь)$/ui', $cleanQuery)) {
        return null;
    }

    if (mb_strlen($cleanQuery, 'UTF-8') < 2) {
        return null;
    }

    return [
        'is_command'    => $isCmd,
        'query'         => $cleanQuery,
        'branch_filter' => $branchFilter,
        'show_help'     => false
    ];
}

/**
 * Форматирование единичной карточки издания из каталога OPAC для бота ВК
 *
 * @param array $item Данные издания из каталога OPAC
 * @param int|null $itemIndex Порядковый номер книги (если null, префикс [№X] опускается)
 * @param string|null $branchFilter Фильтр филиала
 * @param bool $isInvSearch Признак поиска по инвентарному номеру
 * @param string $displayQuery Строка запроса
 * @param int $maxBranches Максимальное число выводимых филиалов (по умолчанию 5)
 * @return string
 */
function vk_bot_format_book_item_card($item, $itemIndex = null, $branchFilter = null, $isInvSearch = false, $displayQuery = '', $maxBranches = 5)
{
    $title = !empty($item['title']) ? $item['title'] : 'Книга без заглавия';
    $author = !empty($item['author']) ? $item['author'] : '';
    $year = !empty($item['year']) ? " ({$item['year']} г.)" : '';

    // Получаем детальные холдинги/экземпляры книги
    $copies = $item['copies'] ?? [];
    if (empty($copies)) {
        if (function_exists('opac_get_book_copies')) {
            $copiesData = opac_get_book_copies($item['id']);
            $copies = $copiesData['copies'] ?? [];
        } elseif (class_exists('OpacClient')) {
            $copiesData = OpacClient::getInstance()->getBookCopies($item['id']);
            $copies = $copiesData['copies'] ?? [];
        }
    }

    // Обогащаем инвентарный номер издания из копий или поискового запроса
    $itemInventory = trim((string)($item['inventory'] ?? ''));
    if ($itemInventory === '' && !empty($copies)) {
        foreach ($copies as $c) {
            if (!empty($c['inventory'])) {
                $itemInventory = trim((string)$c['inventory']);
                break;
            }
        }
        if ($itemInventory !== '') {
            $item['inventory'] = $itemInventory;
        }
    }
    if ($itemInventory === '' && $isInvSearch && !empty($displayQuery)) {
        $itemInventory = $displayQuery;
        $item['inventory'] = $itemInventory;
    }

    $numPrefix = ($itemIndex !== null && $itemIndex > 0) ? "[№{$itemIndex}] " : '';
    $block = "📘 {$numPrefix}«{$title}»\n";
    if ($author) {
        $block .= "   ✍️ Автор: {$author}{$year}\n";
    }
    if (!empty($item['id'])) {
        $block .= "   🆔 Запись OPAC: {$item['id']} (БД 62 ЦГБ)\n";
    }
    if (!empty($item['inventory'])) {
        $block .= "   📦 Инв. номер: {$item['inventory']}\n";
    }
    $locations = $item['locations'] ?? [];
    if (!empty($locations)) {
        $block .= "   🏷️ Сигла подразделений: " . implode(', ', $locations) . "\n";
    }
    if (!empty($item['shelfmark']) && $item['shelfmark'] !== 'Не задан') {
        $block .= "   🔖 Шифр каталога: {$item['shelfmark']}\n";
    }

    if (empty($copies)) {
        if (!empty($locations)) {
            $block .= "   📍 Места хранения (по сиглам): " . implode(', ', $locations) . "\n";
        }
        $block .= "   📞 Наличие книги уточняйте по телефонам библиотек сети.\n";
        return $block;
    }

    // Группируем копии по филиалам
    $branchGroups = [];
    $hasBranch4 = false;
    $hasDobroye = false;
    $branch4Available = 0;

    foreach ($copies as $c) {
        $subB = mb_strtolower(trim($c['subfield_b'] ?? ''), 'UTF-8');
        $cBranchCode = mb_strtolower(trim($c['branch_code'] ?? ''), 'UTF-8');
        $permLoc = $c['permanent_location'] ?? ($c['location'] ?? '');
        $permLocLower = mb_strtolower(trim($permLoc), 'UTF-8');
        $isDoSigla = (
            $subB === 'до' ||
            $cBranchCode === 'до' ||
            strpos($permLocLower, 'цгб-до') !== false ||
            strpos($permLocLower, 'до') !== false ||
            strpos($permLocLower, 'детский отдел') !== false ||
            $subB === 'цдб' ||
            $cBranchCode === 'цдб' ||
            strpos($permLocLower, 'цдб') !== false
        );

        if ($isDoSigla) {
            $bCode = 'ЦДБ';
        } else {
            $bCode = ($c['branch_code'] ?? '') ?: (($c['subfield_b'] ?? '') ?: 'ЦГБ');
            if (mb_strtolower($bCode, 'UTF-8') === 'до') {
                $bCode = 'ЦДБ';
                $isDoSigla = true;
            }
        }

        if (!isset($branchGroups[$bCode])) {
            $branchPhone = ($c['branch_phone'] ?? '') ?: '';
            $branchAddress = ($c['branch_address'] ?? '') ?: '';

            if ($isDoSigla) {
                $branchPhone = '8(4922) 32-32-42, 32-47-73';
                $branchAddress = 'г. Владимир, ул. Большая Московская, д. 31';
            } elseif (empty($branchPhone) || empty($branchAddress)) {
                if (class_exists('OpacClient')) {
                    $resSig = OpacClient::resolveBranchBySigla($subB ?: $bCode);
                    if (!$resSig && !empty($permLoc)) {
                        $sigLoc = OpacClient::extractSiglaFromPermanentLocation($permLoc);
                        $resSig = OpacClient::resolveBranchBySigla($sigLoc);
                    }
                    if ($resSig) {
                        if (empty($branchPhone) && !empty($resSig['phone'])) $branchPhone = $resSig['phone'];
                        if (empty($branchAddress) && !empty($resSig['address'])) $branchAddress = $resSig['address'];
                    }
                }
            }

            $branchGroups[$bCode] = [
                'name'         => $isDoSigla ? 'Центральная детская библиотека (ЦДБ)' : (($c['branch_name'] ?? '') ?: 'Библиотека сети'),
                'address'      => $branchAddress,
                'phone'        => $branchPhone,
                'district'     => $isDoSigla ? 'Исторический центр' : ($c['branch_district'] ?? ($c['district'] ?? '')),
                'is_dobroye'   => $isDoSigla ? false : !empty($c['is_dobroye']),
                'is_center'    => $isDoSigla ? true : !empty($c['is_center']),
                'shifr'        => ($c['shifr'] ?? '') ?: '',
                'available'    => 0,
                'on_loan'      => 0,
                'inventories'  => [],
                'sub_b'        => $isDoSigla ? 'до' : $subB,
                'perm_loc'     => $permLoc
            ];
        }

        if (!empty($c['is_available'])) {
            $branchGroups[$bCode]['available']++;
        } else {
            $branchGroups[$bCode]['on_loan']++;
        }

        $cInv = !empty($c['inventory']) ? $c['inventory'] : ($item['inventory'] ?? '');
        if (!empty($cInv) && !in_array($cInv, $branchGroups[$bCode]['inventories'], true) && count($branchGroups[$bCode]['inventories']) < 4) {
            $branchGroups[$bCode]['inventories'][] = $cInv;
        }

        if (!empty($c['shifr']) && $c['shifr'] !== 'Не задан' && empty($branchGroups[$bCode]['shifr'])) {
            $branchGroups[$bCode]['shifr'] = $c['shifr'];
        }

        if (!empty($c['is_dobroye'])) $hasDobroye = true;
        if (($c['subfield_b'] ?? '') === 'ф4' || ($c['branch_code'] ?? '') === 'Филиал №4' || strpos($c['permanent_location'] ?? '', 'Ф4') !== false) {
            $hasBranch4 = true;
            if (!empty($c['is_available'])) {
                $branch4Available++;
            }
        }
    }

    // Fallback инвентаря для единственного филиала
    if (count($branchGroups) === 1 && !empty($item['inventory'])) {
        $singleKey = array_key_first($branchGroups);
        if (empty($branchGroups[$singleKey]['inventories'])) {
            $branchGroups[$singleKey]['inventories'][] = $item['inventory'];
        }
    }

    // Выделенный акцент на флагманский Филиал №4 (Доброе, ул. Егорова, 10)
    if ($hasBranch4) {
        $block .= "   🌟 [РАЙОН ДОБРОЕ] Филиал №4 (ул. Егорова, д. 10):\n"
                . "      📞 8(4922) 21-96-11; 21-23-48 • Уточняйте наличие книги по телефонам филиала!\n";
    } elseif ($branchFilter === 'ф4') {
        $block .= "   📌 В филиале №4 на ул. Егорова книга не числится, но доступна в других библиотеках сети:\n";
    }

    // Сортировка филиалов: приоритетный филиал первыми
    uasort($branchGroups, function ($a, $b) use ($branchFilter) {
        $scoreA = 0;
        $scoreB = 0;

        if ($branchFilter === 'ф4') {
            if (($a['sub_b'] ?? '') === 'ф4') $scoreA += 100;
            if (($b['sub_b'] ?? '') === 'ф4') $scoreB += 100;
        } elseif ($branchFilter === 'доброе') {
            if (!empty($a['is_dobroye'])) $scoreA += 50;
            if (!empty($b['is_dobroye'])) $scoreB += 50;
        } elseif ($branchFilter === 'цдб') {
            if (!empty($a['is_center'])) $scoreA += 50;
            if (!empty($b['is_center'])) $scoreB += 50;
        }

        if ($a['available'] > 0) $scoreA += 10;
        if ($b['available'] > 0) $scoreB += 10;

        return $scoreB <=> $scoreA;
    });

    $block .= "   🏛 Филиалы сети:\n";
    $branchCount = 0;
    $branchSubBlocks = [];

    foreach ($branchGroups as $bg) {
        $branchCount++;
        if ($branchCount > $maxBranches) {
            $remainingBranches = count($branchGroups) - $maxBranches;
            $branchSubBlocks[] = "     • ... и ещё в {$remainingBranches} библиотеках сети города!";
            break;
        }

        $districtStr = $bg['district'] ? " ({$bg['district']})" : '';
        $siglaBadge = $bg['sub_b'] ? "[сигла: {$bg['sub_b']}]" : '';
        $invStr = !empty($bg['inventories']) ? '[Инв. № ' . implode(', ', $bg['inventories']) . ']' : '';
        $shifrStr = ($bg['shifr'] && $bg['shifr'] !== 'Не задан') ? '[Шифр: ' . $bg['shifr'] . ']' : '';

        $lines = [];
        $lines[] = "     • {$bg['name']}{$districtStr}:";
        $metaParts = [];
        if ($siglaBadge) $metaParts[] = $siglaBadge;
        if ($shifrStr) $metaParts[] = $shifrStr;
        if ($invStr) $metaParts[] = $invStr;
        if (!empty($metaParts)) {
            $lines[] = "       🔖 " . implode(' ', $metaParts);
        }
        if ($bg['address']) {
            $addrLine = "       📍 {$bg['address']}";
            if ($bg['phone']) $addrLine .= " • 📞 {$bg['phone']}";
            $lines[] = $addrLine;
        }
        $branchSubBlocks[] = implode("\n", $lines);
    }

    if (!empty($branchSubBlocks)) {
        $block .= implode("\n\n", $branchSubBlocks) . "\n";
    }

    return $block;
}

/**
 * Извлечение названий книг и авторов из текста рекомендации Космо
 *
 * @param string $text
 * @return array
 */
function vk_bot_extract_books_from_recommendation($text)
{
    $books = [];
    $seenTitles = [];

    $stopTitles = [
        'доброе', 'цгб', 'цдб', 'аврора', 'космо', 'владимир', 'книголенд',
        'добролит', 'библиотека', 'электронный каталог', 'книги', 'читатель',
        'подобрать книгу', 'спроси у космо', 'справка', 'настройки', 'лига филиалов',
        'вконтакте', 'город владимир', 'новости', 'каталог', 'палитра настроений'
    ];

    // Шаблон 1: «Название» [**] — [-–/] [**] Автор
    if (preg_match_all('/[«\"“]([^»\"”\n]{2,80})[»\"”]\s*(?:\*{0,2})\s*(?:—|-|–|\/)\s*(?:\*{0,2})([^\n\.,;:!?()]+)/u', $text, $m1, PREG_SET_ORDER)) {
        foreach ($m1 as $m) {
            $t = trim($m[1], " \t\n\r\0\x0B*\"«»");
            $aRaw = trim($m[2], " \t\n\r\0\x0B*\"«»");
            $tLower = mb_strtolower($t, 'UTF-8');
            if (in_array($tLower, $stopTitles, true)) continue;

            $a = '';
            if (preg_match('/^[А-ЯЁA-Z]/u', $aRaw) && !preg_match('/\b(это|книга|роман|повесть|шедевр|история|произведение|очень|отличный|классика|сюжет)\b/ui', $aRaw)) {
                $a = $aRaw;
            }

            if (!isset($seenTitles[$tLower])) {
                $seenTitles[$tLower] = true;
                $books[] = ['title' => $t, 'author' => $a];
            }
        }
    }

    // Шаблон 2: Автор [:] [—] «Название»
    if (preg_match_all('/(?:^|\n|\.\s+)([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ]\.?)?(?:\s+[А-ЯЁ][а-яё]+)?)\s*[:—–-]?\s*[«\"“]([^»\"”\n]{2,80})[»\"”]/u', $text, $m2, PREG_SET_ORDER)) {
        foreach ($m2 as $m) {
            $a = trim($m[1], " \t\n\r\0\x0B*\"«»");
            $t = trim($m[2], " \t\n\r\0\x0B*\"«»");
            $tLower = mb_strtolower($t, 'UTF-8');
            if (in_array($tLower, $stopTitles, true)) continue;
            if (!isset($seenTitles[$tLower])) {
                $seenTitles[$tLower] = true;
                $books[] = ['title' => $t, 'author' => $a];
            }
        }
    }

    // Шаблон 3: «Название» (Автор)
    if (preg_match_all('/[«\"“]([^»\"”\n]{2,80})[»\"”]\s*\(([А-ЯЁ][а-яё\s\.]+)\)/u', $text, $m3, PREG_SET_ORDER)) {
        foreach ($m3 as $m) {
            $t = trim($m[1], " \t\n\r\0\x0B*\"«»");
            $a = trim($m[2], " \t\n\r\0\x0B*\"«»");
            $tLower = mb_strtolower($t, 'UTF-8');
            if (in_array($tLower, $stopTitles, true)) continue;
            if (!isset($seenTitles[$tLower])) {
                $seenTitles[$tLower] = true;
                $books[] = ['title' => $t, 'author' => $a];
            }
        }
    }

    // Шаблон 4: Одиночные названия в кавычках если пока ничего не нашли
    if (empty($books) && preg_match_all('/[«\"“]([^»\"”\n]{3,60})[»\"”]/u', $text, $m4, PREG_SET_ORDER)) {
        foreach ($m4 as $m) {
            $t = trim($m[1], " \t\n\r\0\x0B*\"«»");
            $tLower = mb_strtolower($t, 'UTF-8');
            if (in_array($tLower, $stopTitles, true)) continue;
            if (!isset($seenTitles[$tLower])) {
                $seenTitles[$tLower] = true;
                $books[] = ['title' => $t, 'author' => ''];
                if (count($books) >= 2) break;
            }
        }
    }

    return array_slice($books, 0, 2);
}

/**
 * Нормализация русской формы имени/фамилии автора (устранение падежных окончаний)
 */
function normalize_russian_author($name)
{
    $name = trim($name);
    if (preg_match('/(стругацк|вайнер|ильф|петров)[а-я]*/ui', $name, $m)) {
        return mb_convert_case($m[1] . 'ий', MB_CASE_TITLE, 'UTF-8');
    }
    if (preg_match('/([А-ЯЁ][а-яё]+)(?:ого|ему|ым|ом)$/u', $name, $m)) {
        $stem = $m[1];
        if (preg_match('/(ск|цк)$/u', $stem)) return $stem . 'ий';
        if (preg_match('/(ов|ев|ин)$/u', $stem)) return $stem;
        return $stem . 'ой';
    }
    if (preg_match('/([А-ЯЁ][а-яё]+(?:ов|ев|ин|ын|ер|ан|ун|юк|ук|ар|ор|ль))а$/u', $name, $m)) {
        return $m[1];
    }
    if (preg_match('/([А-ЯЁ][а-яё]{2,})(?:а|у|ом|е)$/u', $name, $m)) {
        return $m[1];
    }
    return $name;
}

/**
 * Извлечение автора или ключевого литературного термина из текста запроса
 */
function vk_bot_extract_author_from_text($text)
{
    $clean = preg_replace('/\b(посоветуй|порекомендуй|подбери|что почитать|хочу почитать|какую книгу|книгу|книги|книжку|пожалуйста|космо|робот|привет|здравствуй|здравствуйте|добрый день|мне|что-нибудь|что то|про|о|об|у|в|на|с|по|для|от|автора|писателя|фантастику|детектив|классику|роман|историю|новинки|хорошую|отличную|интересную|захватывающую)\b/ui', ' ', $text);
    $words = preg_split('/\s+/u', trim($clean));
    foreach ($words as $w) {
        if (mb_strlen($w, 'UTF-8') >= 4) {
            $norm = normalize_russian_author($w);
            if (mb_strlen($norm, 'UTF-8') >= 4) {
                return $norm;
            }
        }
    }
    return '';
}

/**
 * Получение проверенных книг из OPAC для заземления промпта ИИ (OPAC-RAG)
 */
function vk_bot_retrieve_opac_grounding($text)
{
    $author = vk_bot_extract_author_from_text($text);
    if ($author === '' || mb_strlen($author, 'UTF-8') < 3) {
        return '';
    }

    $opacRes = null;
    if (function_exists('opac_search_books')) {
        $opacRes = opac_search_books($author, 8, 0);
    } elseif (class_exists('OpacClient')) {
        $opacRes = OpacClient::getInstance()->findBooks($author, 8, 0);
    }

    if (empty($opacRes['items'])) {
        return '';
    }

    $realBooks = [];
    $seenTitles = [];
    $authorStem = (mb_strlen($author, 'UTF-8') > 5) ? mb_substr($author, 0, mb_strlen($author, 'UTF-8') - 2) : $author;

    foreach ($opacRes['items'] as $item) {
        $cAuthor = $item['author'] ?? '';
        $cTitle = $item['title'] ?? '';
        if (trim($cTitle) === '') continue;

        if ($cAuthor !== '' && mb_stripos($cAuthor, $authorStem) === false) {
            continue;
        }

        $cleanTitle = preg_replace('/[:;].*$/u', '', $cTitle);
        $cleanTitle = trim(preg_replace('/[«»"“”*]/u', '', $cleanTitle));
        $titleLower = mb_strtolower($cleanTitle, 'UTF-8');

        if (mb_strlen($cleanTitle, 'UTF-8') >= 3 && !isset($seenTitles[$titleLower])) {
            $seenTitles[$titleLower] = true;
            $year = !empty($item['year']) ? " ({$item['year']})" : '';
            $dispAuthor = !empty($item['author']) ? $item['author'] : $author;
            $realBooks[] = "• «{$cleanTitle}» — {$dispAuthor}{$year}";
            if (count($realBooks) >= 5) break;
        }
    }

    if (empty($realBooks)) {
        return '';
    }

    $grounding = "📚 РЕАЛЬНЫЕ КНИГИ ИЗ ФОНДОВ БИБЛИОТЕК ВЛАДИМИРА ПО ЗАПРОСУ («{$author}»):\n"
               . implode("\n", $realBooks) . "\n\n"
               . "[СТРОЖАЙШЕЕ ТРЕБОВАНИЕ БИБЛИОТЕКАРЯ]:\n"
               . "Рекомендуй 1-2 книги ИСКЛЮЧИТЕЛЬНО из этого проверенного списка реальных изданий (или назови другие 100% подлинные шедевры автора, в которых абсолютно уверен).\n"
               . "КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать несуществующие названия книг (автор никогда не писал таких книг — не придумывай)! Оформи строго как «Название» — Автор.";

    return $grounding;
}

/**
 * Оценка соответствия кандидата OPAC запрошенному названию и автору
 *
 * @param array $candidate Запись книги из OPAC
 * @param string $expectedTitle Запрошенное название
 * @param string $expectedAuthor Запрошенный автор
 * @return int Балл релевантности (>= 120 для допуска к показу, -1 при дисквалификации)
 */
function vk_bot_score_opac_candidate($candidate, $expectedTitle, $expectedAuthor)
{
    $cTitle = $candidate['title'] ?? '';
    $cAuthor = $candidate['author'] ?? '';
    $cImprint = $candidate['imprint'] ?? '';
    $cRaw = implode(' ', $candidate['shotform_raw'] ?? []);
    $allCandidateText = mb_strtolower($cAuthor . ' ' . $cTitle . ' ' . $cImprint . ' ' . $cRaw, 'UTF-8');

    $expectedLastName = '';
    if (trim($expectedAuthor) !== '') {
        $aWords = preg_split('/\s+/u', trim(preg_replace('/[^\p{L}\s]/u', '', $expectedAuthor)));
        $expectedLastName = mb_strtolower(end($aWords), 'UTF-8');
        if (mb_strlen($expectedLastName, 'UTF-8') < 3) {
            foreach ($aWords as $aw) {
                if (mb_strlen($aw, 'UTF-8') >= 3) {
                    $expectedLastName = mb_strtolower($aw, 'UTF-8');
                    break;
                }
            }
        }
    }

    $authorScore = 0;
    if ($expectedLastName !== '' && mb_strlen($expectedLastName, 'UTF-8') >= 3) {
        $authorStem = (mb_strlen($expectedLastName, 'UTF-8') > 5) ? mb_substr($expectedLastName, 0, mb_strlen($expectedLastName, 'UTF-8') - 2) : $expectedLastName;
        $hasAuthorMatch = (mb_stripos($allCandidateText, $authorStem) !== false);

        if (!$hasAuthorMatch) {
            return -1; // Фатальная отбраковка: автора вообще нет в записи OPAC!
        }

        if (trim($cAuthor) !== '') {
            $cAuthorLower = mb_strtolower($cAuthor, 'UTF-8');
            if (mb_stripos($cAuthorLower, $authorStem) === false) {
                return -1; // В карточке автором указан другой писатель (например, Некрасов вместо Лукьяненко)!
            }
        }

        $authorScore = 100;
    } else {
        $authorScore = 50;
    }

    $stopWords = ['и','в','на','с','по','о','об','к','от','за','из','у','для','не','же','а','но','как','то','том','книга','роман','повесть','рассказ','стихи','поэма'];

    $cleanExpTitle = mb_strtolower($expectedTitle, 'UTF-8');
    $cleanExpTitle = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $cleanExpTitle);
    $rawExpWords = preg_split('/\s+/u', trim($cleanExpTitle));
    $expWords = [];
    foreach ($rawExpWords as $w) {
        if (mb_strlen($w, 'UTF-8') >= 3 && !in_array($w, $stopWords, true)) {
            $expWords[] = $w;
        }
    }

    if (empty($expWords)) {
        return -1;
    }

    $cleanCandTitle = mb_strtolower($cTitle, 'UTF-8');
    $cleanCandTitle = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $cleanCandTitle);
    $candWords = preg_split('/\s+/u', trim($cleanCandTitle));

    $matchedWords = 0;
    foreach ($expWords as $ew) {
        $found = false;
        foreach ($candWords as $cw) {
            if (mb_stripos($cw, $ew) !== false || mb_stripos($ew, $cw) !== false) {
                $found = true;
                break;
            }
        }
        if ($found) {
            $matchedWords++;
        }
    }

    $wordMatchRatio = $matchedWords / count($expWords);
    if ($wordMatchRatio < 0.6) {
        return -1; // Название не совпадает!
    }

    $titleScore = (int)($wordMatchRatio * 100);

    if (mb_stripos($cleanCandTitle, $cleanExpTitle) !== false || mb_stripos($cleanExpTitle, $cleanCandTitle) !== false) {
        $titleScore += 30;
    }

    $copiesBonus = !empty($candidate['locations']) ? min(count($candidate['locations']) * 5, 30) : 0;

    return $authorScore + $titleScore + $copiesBonus;
}

/**
 * Интеллектуальный поиск лучшего экземпляра книги в OPAC с валидацией автора и названия
 *
 * @param string $title Название книги
 * @param string $author Автор книги (если известен)
 * @return array [$bestCandidate, $bestScore]
 */
function vk_bot_find_best_opac_book($title, $author = '')
{
    $searchTitle = trim(preg_replace('/[«»"“”*]/u', '', $title));
    $searchAuthor = trim(preg_replace('/[«»"“”*]/u', '', $author));

    $authorLastName = '';
    if ($searchAuthor !== '') {
        $aWords = preg_split('/\s+/u', trim(preg_replace('/[^\p{L}\s]/u', '', $searchAuthor)));
        $authorLastName = end($aWords);
    }

    $candidates = [];

    // 1. Поиск Название + Автор
    if ($authorLastName !== '' && mb_strlen($authorLastName, 'UTF-8') >= 3) {
        $q = $searchTitle . ' ' . $authorLastName;
        if (function_exists('opac_search_books')) {
            $res1 = opac_search_books($q, 10, 0);
        } elseif (class_exists('OpacClient')) {
            $res1 = OpacClient::getInstance()->findBooks($q, 10, 0);
        }
        if (!empty($res1['items'])) {
            foreach ($res1['items'] as $it) $candidates[] = $it;
        }
    }

    // 2. Поиск по названию
    if (function_exists('opac_search_books')) {
        $res2 = opac_search_books($searchTitle, 10, 0);
    } elseif (class_exists('OpacClient')) {
        $res2 = OpacClient::getInstance()->findBooks($searchTitle, 10, 0);
    }
    if (!empty($res2['items'])) {
        foreach ($res2['items'] as $it) $candidates[] = $it;
    }

    // 3. Fallback: если название составное, ищем по базовой части
    if (empty($candidates) && preg_match('/^([^:—–-]+)[:—–-]/u', $searchTitle, $mt)) {
        $baseTitle = trim($mt[1]);
        if (mb_strlen($baseTitle, 'UTF-8') >= 3) {
            if (function_exists('opac_search_books')) {
                $res3 = opac_search_books($baseTitle, 10, 0);
            } elseif (class_exists('OpacClient')) {
                $res3 = OpacClient::getInstance()->findBooks($baseTitle, 10, 0);
            }
            if (!empty($res3['items'])) {
                foreach ($res3['items'] as $it) $candidates[] = $it;
            }
        }
    }

    $bestCandidate = null;
    $bestScore = -1;
    $seenIds = [];

    foreach ($candidates as $cand) {
        $candId = $cand['id'] ?? ($cand['isn'] ?? '');
        if ($candId !== '' && isset($seenIds[$candId])) continue;
        if ($candId !== '') $seenIds[$candId] = true;

        $score = vk_bot_score_opac_candidate($cand, $searchTitle, $searchAuthor);
        if ($score > $bestScore) {
            $bestScore = $score;
            $bestCandidate = $cand;
        }
    }

    if ($bestScore >= 120) {
        return [$bestCandidate, $bestScore];
    }
    return [null, $bestScore];
}

/**
 * Обогащение текста рекомендации данными наличия в библиотеках Владимира из OPAC
 *
 * @param string $aiResponseText Текст ответа Космо
 * @param string|null $branchFilter Фильтр филиала (если запрошен конкретный филиал)
 * @return string Обогащённый текст с карточками наличия в филиалах сети
 */
function vk_bot_enrich_recommendation_with_opac($aiResponseText, $branchFilter = null)
{
    if (trim($aiResponseText) === '') {
        return $aiResponseText;
    }

    $books = vk_bot_extract_books_from_recommendation($aiResponseText);
    if (empty($books)) {
        return $aiResponseText;
    }

    $cards = [];
    $cardIdx = 0;

    foreach ($books as $b) {
        $title = $b['title'];
        $author = $b['author'];

        // Ищем строго соответствующую книгу в OPAC с проверкой автора и названия
        list($bestBook, $bestScore) = vk_bot_find_best_opac_book($title, $author);

        if ($bestBook !== null) {
            $cardIdx++;
            $cards[] = vk_bot_format_book_item_card($bestBook, $cardIdx, $branchFilter, false, '', 4);
        }
    }

    if (empty($cards)) {
        return $aiResponseText;
    }

    // Удаляем из текста ИИ возможные галлюцинации по филиалам («Книга доступна в...», «Её можно найти в...»)
    $cleanAiText = preg_replace('/(?:\n|^)\s*[-•*]?\s*(?:Книга|Произведение|Роман|Повесть|Её|Их|Его)\s+(?:доступн[а-я]*|можно найти|находится|чистится)\s+в\s+[^\n]+/ui', '', $aiResponseText);
    $cleanAiText = preg_replace('/\n{3,}/', "\n\n", trim($cleanAiText));

    $opacSection = "\n\n════════════════════════════════\n"
                 . "🏛 ГДЕ ВЗЯТЬ ЭТИ КНИГИ В БИБЛИОТЕКАХ ВЛАДИМИРА:\n\n"
                 . implode("\n────────────────────────────────\n\n", $cards)
                 . "\n\n════════════════════════════════\n"
                 . "📞 Наличие книги в филиале уточняйте по телефонам филиала!";

    // Проверяем суммарную длину (лимит ВК 4096 знаков)
    $combined = $cleanAiText . $opacSection;
    if (mb_strlen($combined, 'UTF-8') > 4000 && count($cards) > 1) {
        $opacSection = "\n\n════════════════════════════════\n"
                     . "🏛 ГДЕ ВЗЯТЬ ЭТИ КНИГИ В БИБЛИОТЕКАХ ВЛАДИМИРА:\n\n"
                     . $cards[0]
                     . "\n\n════════════════════════════════\n"
                     . "📞 Наличие книги в филиале уточняйте по телефонам филиала!";
        $combined = $cleanAiText . $opacSection;
    }

    return $combined;
}

/**
 * Форматирование ответа робота Космо с результатами поиска OPAC
 *
 * @param array|null $res Результаты поиска из opac_search_books
 * @param string $query Поисковый запрос
 * @param string|null $branchFilter Целевой филиал или район (например, 'ф4', 'цдб', 'доброе')
 * @param string $callerName Имя читателя из профиля ВК
 * @param int $page Номер текущей страницы (1-indexed)
 * @param int $perPage Количество книг на страницу (по умолчанию 3)
 * @param int $callerId ID читателя ВКонтакте (для кликабельного упоминания)
 * @return string
 */
function vk_bot_format_opac_response($res, $query, $branchFilter = null, $callerName = 'Читатель', $page = 1, $perPage = 3, $callerId = 0)
{
    $isInvSearch = preg_match('/^IN\s+/i', $query);
    $displayQuery = $isInvSearch ? trim(preg_replace('/^IN\s+/i', '', $query)) : $query;
    $callerMention = ($callerId > 0) ? "[id{$callerId}|{$callerName}]" : $callerName;

    $isOk = !empty($res['ok']) || !empty($res['success']);
    if (!$res || !$isOk || empty($res['items'])) {
        if ($isInvSearch) {
            return "🤖📚 Уважаемый {$callerMention}, по инвентарному номеру «№{$displayQuery}» в электронном каталоге библиотек Владимира книга пока не найдена.\n\n"
                 . "💡 Пожалуйста, перепроверьте цифры инвентарного номера или найдите книгу по автору/названию (например: «/поиск Чехов» или «/книга Мастер и Маргарита»). 📖✨";
        }
        return "🤖📚 Уважаемый {$callerMention}, по запросу «{$query}» в электронном каталоге библиотек Владимира пока ничего не нашлось.\n\n"
             . "💡 Совет от робота Космо:\n"
             . "• Проверьте, нет ли опечатки в названии книги или фамилии автора;\n"
             . "• Попробуйте ввести только фамилию автора (например: «/поиск Чехов») или ключевое слово («/книга Мастер»);\n"
             . "• Вы также всегда можете обратиться к опытным библиографам Центральной городской библиотеки: г. Владимир, Суздальский пр., д. 2, 📞 8(4922) 21-65-63 — они с радостью помогут подобрать книгу из редких или закрытых архивных фондов! 📖✨";
    }

    $totalFound = $res['total_found'] ?? ($res['recordsFiltered'] ?? ($res['total'] ?? count($res['items'])));
    $perPage = max(1, (int)$perPage);
    $totalPages = max(1, (int)ceil($totalFound / $perPage));
    $page = max(1, min($totalPages, (int)$page));

    $mod10 = $totalFound % 10;
    $mod100 = $totalFound % 100;
    $bookWord = ($mod10 === 1 && $mod100 !== 11) ? 'издание' : (($mod10 >= 2 && $mod10 <= 4 && ($mod100 < 10 || $mod100 >= 20)) ? 'издания' : 'изданий');

    $pageStr = ($totalPages > 1) ? " • Стр. {$page}/{$totalPages}" : '';
    $queryLine = $isInvSearch
        ? "🏷️ Инв. номер: «№{$displayQuery}» • Найдено в каталоге: {$totalFound} {$bookWord}{$pageStr}\n"
        : "🔍 Запрос: «{$query}» • В фондах сети: {$totalFound} {$bookWord}{$pageStr}\n";

    $header = "✨📖 ЭЛЕКТРОННЫЙ КАТАЛОГ БИБЛИОТЕК ВЛАДИМИРА 📖✨\n"
            . "🤖 Робот Космо нашёл для {$callerMention}:\n"
            . $queryLine
            . "📞 Наличие книги в филиале уточняйте по телефонам филиала!\n"
            . "════════════════════════════════\n\n";

    $blocks = [];
    $itemIndex = ($page - 1) * $perPage;

    foreach (array_slice($res['items'], 0, $perPage) as $item) {
        $itemIndex++;
        $blocks[] = vk_bot_format_book_item_card($item, $itemIndex, $branchFilter, $isInvSearch, $displayQuery, 5);
    }

    $footer = "\n════════════════════════════════\n"
            . "📞 Наличие книги в филиале уточняйте по телефонам филиала!\n"
            . "🌐 Каталог онлайн: http://library.vladimir.ru/rguest_vlad_cgb.htm";
    if ($totalPages > 1) {
        $footer .= "\n📄 Страница {$page} из {$totalPages}. Листайте страницы кнопками ниже ⬇️";
    }

    return $header . implode("\n────────────────────────────────\n\n", $blocks) . $footer;
}

/**
 * Построение inline-клавиатуры пагинации OPAC для ВКонтакте
 *
 * @param string $query
 * @param int $page
 * @param int $totalPages
 * @param string|null $branchFilter
 * @return array|null
 */
function vk_bot_build_opac_pagination_keyboard($query, $page, $totalPages, $branchFilter = null)
{
    if ($totalPages <= 1) {
        return null;
    }

    $page = max(1, min($totalPages, (int)$page));
    $buttons = [];
    $navRow = [];

    // Кнопка «Назад»
    if ($page > 1) {
        $prevPage = $page - 1;
        $navRow[] = [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode([
                    'cmd' => 'opac_page',
                    'q'   => $query,
                    'p'   => $prevPage,
                    'b'   => $branchFilter
                ], JSON_UNESCAPED_UNICODE),
                'label'   => "◀️ Стр. {$prevPage}"
            ],
            'color' => 'primary'
        ];
    }

    // Индикатор текущей страницы
    $navRow[] = [
        'action' => [
            'type'    => 'text',
            'payload' => json_encode([
                'cmd' => 'opac_page',
                'q'   => $query,
                'p'   => $page,
                'b'   => $branchFilter
            ], JSON_UNESCAPED_UNICODE),
            'label'   => "📄 {$page} / {$totalPages}"
        ],
        'color' => 'secondary'
    ];

    // Кнопка «Вперёд»
    if ($page < $totalPages) {
        $nextPage = $page + 1;
        $navRow[] = [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode([
                    'cmd' => 'opac_page',
                    'q'   => $query,
                    'p'   => $nextPage,
                    'b'   => $branchFilter
                ], JSON_UNESCAPED_UNICODE),
                'label'   => "Стр. {$nextPage} ▶️"
            ],
            'color' => 'primary'
        ];
    }

    if (!empty($navRow)) {
        $buttons[] = $navRow;
    }

    // Дополнительный ряд быстрых переходов для длинных списков (> 2 страниц)
    $quickRow = [];
    if ($page > 2) {
        $quickRow[] = [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode([
                    'cmd' => 'opac_page',
                    'q'   => $query,
                    'p'   => 1,
                    'b'   => $branchFilter
                ], JSON_UNESCAPED_UNICODE),
                'label'   => '⏮️ В начало'
            ],
            'color' => 'secondary'
        ];
    }
    if ($totalPages > 2 && $page < $totalPages - 1) {
        $quickRow[] = [
            'action' => [
                'type'    => 'text',
                'payload' => json_encode([
                    'cmd' => 'opac_page',
                    'q'   => $query,
                    'p'   => $totalPages,
                    'b'   => $branchFilter
                ], JSON_UNESCAPED_UNICODE),
                'label'   => "⏭️ В конец ({$totalPages})"
            ],
            'color' => 'secondary'
        ];
    }
    if (!empty($quickRow)) {
        $buttons[] = $quickRow;
    }

    return [
        'inline'  => true,
        'buttons' => $buttons
    ];
}

// -----------------------------------------------------------------------------
// Формирование интерактивных клавиатур ВКонтакте
// -----------------------------------------------------------------------------
// 1. Постоянная навигационная клавиатура
$persistentKeyboard = [
    'one_time' => false,
    'buttons'  => [
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'opac_help'], JSON_UNESCAPED_UNICODE),
                    'label'   => '🔎 Поиск в каталоге'
                ],
                'color' => 'primary'
            ],
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'branch_news'], JSON_UNESCAPED_UNICODE),
                    'label'   => '📰 Новости филиалов'
                ],
                'color' => 'positive'
            ]
        ],
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'libraries'], JSON_UNESCAPED_UNICODE),
                    'label'   => '🏛 Библиотеки-филиалы'
                ],
                'color' => 'secondary'
            ],
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'book_of_day'], JSON_UNESCAPED_UNICODE),
                    'label'   => '⭐ Книга дня'
                ],
                'color' => 'secondary'
            ]
        ],
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'help'], JSON_UNESCAPED_UNICODE),
                    'label'   => 'ℹ️ Справка'
                ],
                'color' => 'secondary'
            ],
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'about'], JSON_UNESCAPED_UNICODE),
                    'label'   => '🤖 Кто ты, Космо?'
                ],
                'color' => 'secondary'
            ]
        ]
    ]
];

// 2. Inline-клавиатура выбора настроения книги
$inlineMoodKeyboard = [
    'inline'  => true,
    'buttons' => [
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['mood' => 'action'], JSON_UNESCAPED_UNICODE),
                    'label'   => '🔥 Драйв и экшен'
                ],
                'color' => 'secondary'
            ],
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['mood' => 'cozy'], JSON_UNESCAPED_UNICODE),
                    'label'   => '☕ Уют и тепло'
                ],
                'color' => 'secondary'
            ]
        ],
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['mood' => 'detective'], JSON_UNESCAPED_UNICODE),
                    'label'   => '🧩 Загадка и детектив'
                ],
                'color' => 'secondary'
            ],
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['mood' => 'classic'], JSON_UNESCAPED_UNICODE),
                    'label'   => '⭐ Золотая классика'
                ],
                'color' => 'secondary'
            ]
        ],
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['mood' => 'scifi'], JSON_UNESCAPED_UNICODE),
                    'label'   => '🚀 Космос и фантастика'
                ],
                'color' => 'secondary'
            ],
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['mood' => 'wisdom'], JSON_UNESCAPED_UNICODE),
                    'label'   => '🌱 Вдохновение'
                ],
                'color' => 'secondary'
            ]
        ],
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'menu'], JSON_UNESCAPED_UNICODE),
                    'label'   => '◀ В главное меню'
                ],
                'color' => 'primary'
            ]
        ]
    ]
];

// 3. Inline-клавиатура для групповых бесед (Книжный клуб читателей Владимира)
$inlineChatKeyboard = [
    'inline'  => true,
    'buttons' => [
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'book_club_topic'], JSON_UNESCAPED_UNICODE),
                    'label'   => '📖 Книга недели'
                ],
                'color' => 'primary'
            ],
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'book_club_vote'], JSON_UNESCAPED_UNICODE),
                    'label'   => '🗳 Голосование'
                ],
                'color' => 'positive'
            ]
        ],
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'opac_help'], JSON_UNESCAPED_UNICODE),
                    'label'   => '🔎 Поиск в каталоге'
                ],
                'color' => 'secondary'
            ],
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'book_club_rules'], JSON_UNESCAPED_UNICODE),
                    'label'   => '📜 Кодекс клуба'
                ],
                'color' => 'secondary'
            ]
        ],
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'quiz_new'], JSON_UNESCAPED_UNICODE),
                    'label'   => '🎯 Квиз'
                ],
                'color' => 'primary'
            ],
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'poll_new'], JSON_UNESCAPED_UNICODE),
                    'label'   => '📊 Опрос'
                ],
                'color' => 'secondary'
            ]
        ],
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'about'], JSON_UNESCAPED_UNICODE),
                    'label'   => '🤖 О Космо'
                ],
                'color' => 'secondary'
            ]
        ]
    ]
];

// 4. Inline-клавиатура для интерактивного голосования книжного клуба
$voteInlineKeyboard = [
    'inline'  => true,
    'buttons' => [
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'vote_cast', 'option' => 1], JSON_UNESCAPED_UNICODE),
                    'label'   => '1️⃣ «Солярис»'
                ],
                'color' => 'secondary'
            ],
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'vote_cast', 'option' => 2], JSON_UNESCAPED_UNICODE),
                    'label'   => '2️⃣ «451° Фаренгейт»'
                ],
                'color' => 'secondary'
            ]
        ],
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'vote_cast', 'option' => 3], JSON_UNESCAPED_UNICODE),
                    'label'   => '3️⃣ «Два капитана»'
                ],
                'color' => 'secondary'
            ],
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'vote_cast', 'option' => 4], JSON_UNESCAPED_UNICODE),
                    'label'   => '4️⃣ «Старик и море»'
                ],
                'color' => 'secondary'
            ]
        ],
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'book_club_results'], JSON_UNESCAPED_UNICODE),
                    'label'   => '📊 Результаты голосования'
                ],
                'color' => 'primary'
            ]
        ]
    ]
];

// =============================================================================
// ОБРАБОТКА ГОЛОСОВОГО СООБЩЕНИЯ (VOICE-TO-TEXT ASR)
// =============================================================================
$isVoiceQuery = false;
$voiceTranscribedText = '';

if ($audioAttachment !== null) {
    if ($botTyping && $peerId > 0) {
        vk_bot_set_typing($peerId, $communityToken, $vkGroupId);
    }
    $resolvedTranscript = vk_bot_resolve_audio_transcript($audioAttachment, $msgObj, $peerId, $communityToken, $vkGroupId);
    if ($resolvedTranscript !== null && trim($resolvedTranscript) !== '') {
        $voiceTranscribedText = trim($resolvedTranscript);

        // В групповых беседах проверяем: было ли обращение к боту в голосовом сообщении
        if ($isChat) {
            $replyMsg = $msgObj['reply_message'] ?? null;
            $isReplyToBot = ($replyMsg && (int)($replyMsg['from_id'] ?? 0) === -$vkGroupId);
            $hasVoiceMention = (
                $isReplyToBot ||
                preg_match('/\b(?:космо|космос|робот\s*космо)\b/ui', $voiceTranscribedText) ||
                preg_match('/\[(?:club|public)' . $vkGroupId . '\|[^\]]*\]/ui', $voiceTranscribedText) ||
                preg_match('/@(cosmobibliobot|cosmo|космо)\b/ui', $voiceTranscribedText) ||
                preg_match('/^[!|\/][a-zA-Zа-яА-Я0-9_-]+/u', trim($voiceTranscribedText))
            );

            if (!$hasVoiceMention && empty($payload)) {
                // В беседе участники общались голосовыми между собой без упоминания бота — тихо игнорируем
                exit;
            }
        }

        $isVoiceQuery = true;
        $userMsg = $voiceTranscribedText;

        // Очищаем обращение к боту для корректной работы команд и ИИ
        $userMsg = preg_replace('/\[(?:club|public)' . $vkGroupId . '\|[^\]]*\]/ui', '', $userMsg);
        $userMsg = preg_replace('/@(?:club|public)' . $vkGroupId . '\b/ui', '', $userMsg);
        $userMsg = preg_replace('/@(cosmobibliobot|cosmo|космо)\b/ui', '', $userMsg);
        $userMsg = preg_replace('/^\s*(?:космос|космо|робот\s*космо)[\s,!:—?]*/ui', '', $userMsg);
        $userMsg = trim($userMsg);
        if ($userMsg === '') {
            $userMsg = 'Привет, Космо!';
        }
    } else {
        // Если это беседа и в голосовом тишина/шум: отправляем ошибку только если было прямое обращение (реплай) к боту
        $replyMsg = $msgObj['reply_message'] ?? null;
        $isReplyToBot = ($replyMsg && (int)($replyMsg['from_id'] ?? 0) === -$vkGroupId);
        if ($isChat && !$isReplyToBot) {
            exit;
        }

        // Голосовое сообщение не удалось распознать (тишина, шум или ошибка ASR)
        $unrecReply = "🎤 Я внимательно прослушал ваше голосовое сообщение, но, к сожалению, не смог разобрать слова из-за фонового шума или тишины.\n\n"
                    . "Пожалуйста, запишите вопрос чуть громче и чётче или напишите текстом — я с радостью помогу вам и подберу прекрасную книгу! 🤖✨";
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $unrecReply,
            'attachment'       => $mascotStickers['sleep'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }
}

// -----------------------------------------------------------------------------
// Парсинг команд и payload
// -----------------------------------------------------------------------------
$payloadData = [];
if (is_string($payload) && trim($payload) !== '') {
    $payloadData = vk_bot_json_decode($payload) ?: [];
} elseif (is_array($payload)) {
    $payloadData = $payload;
}

$cmd = $payloadData['cmd'] ?? ($payloadData['button'] ?? '');
$mood = $payloadData['mood'] ?? '';

$lowerMsg = vk_bot_mb_strtolower($userMsg);
$cleanMsgForCmd = trim(preg_replace('/[\x{1F300}-\x{1F9FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]/u', '', $userMsg));

// Получаем точный профиль и имя читателя строго из его профиля ВКонтакте (users.get)
$callerProfile = ($fromId > 0) ? vk_bot_get_user_profile($fromId, $communityToken, $cacheDir) : null;
$callerName = !empty($callerProfile['name']) && $callerProfile['name'] !== 'Читатель' && $callerProfile['name'] !== 'Участник' && $callerProfile['name'] !== 'Пользователь'
    ? $callerProfile['name']
    : (($fromId > 0) ? vk_bot_get_user_name($fromId, $communityToken, $cacheDir, $peerId) : 'Читатель');
$callerFirstName = !empty($callerProfile['first_name']) && $callerProfile['first_name'] !== 'Читатель' && $callerProfile['first_name'] !== 'Участник' && $callerProfile['first_name'] !== 'Пользователь'
    ? $callerProfile['first_name']
    : (explode(' ', $callerName)[0] ?? $callerName);

// -----------------------------------------------------------------------------
// Диалоговая память и проверка на первый визит пользователя
// -----------------------------------------------------------------------------
$dialogFile = $cacheDir . '/vk_dialog_' . $peerId . '.json';
$isFirstVisit = !$isChat && !file_exists($dialogFile);
$history = [];

if (file_exists($dialogFile) && is_readable($dialogFile)) {
    // Храним контекст диалога до 24 часов
    if ((time() - filemtime($dialogFile)) < 86400) {
        $loadedHist = vk_bot_json_decode(@file_get_contents($dialogFile));
        if (is_array($loadedHist) && isset($loadedHist['messages']) && is_array($loadedHist['messages'])) {
            $history = $loadedHist['messages'];
        }
    }
}

// -----------------------------------------------------------------------------
// Статические сценарии (мгновенный ответ без задержки)
// -----------------------------------------------------------------------------

// =============================================================================
// Сценарий 0-MOD: Команды модерации беседы (Бан, Кик, Мут, Размут, Разбан, Списки, /help)
// =============================================================================
$parsedModCmd = vk_bot_parse_mod_command($userMsg, $msgObj);
$isQuickMute = ($cmd === 'mod_quick_mute');
$isQuickBan = ($cmd === 'mod_quick_ban');

if ($parsedModCmd !== null || $isQuickMute || $isQuickBan) {
    // 0-HELP: Закрытая команда администратора /help (вывод видят ТОЛЬКО администраторы)
    if ($parsedModCmd !== null && ($parsedModCmd['type'] ?? '') === 'admin_help') {
        $isAdmin = false;
        $callerName = 'Администратор';
        if ($isChat) {
            $callerInfo = vk_bot_get_member_info($peerId, $fromId, $communityToken, $cacheDir);
            if ($callerInfo) {
                $isAdmin = !empty($callerInfo['is_admin']) || !empty($callerInfo['is_owner']);
                $callerName = htmlspecialchars($callerInfo['name'] ?? 'Администратор');
            }
        }
        if (!$isAdmin) {
            $isAdmin = vk_bot_is_group_admin($fromId, $vkGroupId, $communityToken, $cacheDir);
        }
        if (!$isAdmin && !$isChat) {
            $isAdmin = vk_bot_is_chat_admin_anywhere($fromId, $cacheDir);
        }

        // Если пользователь НЕ администратор
        if (!$isAdmin) {
            // Для читателей и участников без прав администратора перенаправляем к общему пользовательскому справочнику «Справка»
            $parsedModCmd = null;
        }

        if ($isAdmin) {
            // Вывод команды должны видеть ТОЛЬКО администраторы!
            $helpText = vk_bot_get_admin_help_text($vkGroupId);

            if ($isChat) {
                // 1. Немедленно удаляем сообщение с командой /help из общего чата
                if ($cmid > 0) {
                    vk_bot_delete_chat_message($peerId, $cmid, $communityToken, $vkGroupId);
                }

                // 2. Отправляем полный закрытый реестр команд в Личные Сообщения администратору
                list($pmCode, $pmResp, $pmErr) = vk_bot_send_message([
                    'peer_id'          => $fromId,
                    'message'          => $helpText,
                    'attachment'       => $mascotStickers['read'] ?? null,
                    'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
                    'dont_parse_links' => 1
                ], $communityToken);

                if ($pmCode === 200 && empty($pmResp['error'])) {
                    // В чате оставляем только краткое сервисное подтверждение
                    $chatNotice = "🔒 [id{$fromId}|{$callerName}], полный справочник всех команд отправлен вам в личные сообщения (в целях конфиденциальности, чтобы вывод команды видели только администраторы).";
                    vk_bot_send_message([
                        'peer_id'          => $peerId,
                        'message'          => $chatNotice,
                        'attachment'       => $mascotStickers['smile'] ?? null,
                        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
                        'dont_parse_links' => 1
                    ], $communityToken);
                } else {
                    // Если ЛС закрыты
                    $chatNotice = "⚠️ [id{$fromId}|{$callerName}], вывод команды /help предназначен строго для администраторов и отправляется в ЛС.\n\n"
                                . "Пожалуйста, разрешите сообщения от нашего сообщества или напишите любое сообщение мне в ЛС: vk.me/club{$vkGroupId}, чтобы я мог доставить вам закрытый справочник команд!";
                    vk_bot_send_message([
                        'peer_id'          => $peerId,
                        'message'          => $chatNotice,
                        'attachment'       => $mascotStickers['thinking'] ?? null,
                        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
                        'dont_parse_links' => 1
                    ], $communityToken);
                }
                exit;
            } else {
                // В ЛС переписку видит ТОЛЬКО этот администратор
                vk_bot_send_message([
                    'peer_id'          => $peerId,
                    'message'          => $helpText,
                    'attachment'       => $mascotStickers['read'] ?? null,
                    'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
                    'dont_parse_links' => 1
                ], $communityToken);
                exit;
            }
        }
    }

    if (!$isChat) {
        $reply = "⚠️ Команды модерации работают только в групповых беседах и публичных чатах ВКонтакте!";
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['thinking'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    // 1. Проверяем: назначен ли робот Космо администратором беседы
    if (!vk_bot_is_cosmo_admin($peerId, $vkGroupId, $communityToken, $cacheDir)) {
        $reply = "⚠️ Чтобы я мог исключать и отправлять в режим молчания нарушителей, пожалуйста, назначьте меня администратором этой беседы с правами на управление участниками и удаление сообщений! 🤖🛡️";
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['thinking'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'keyboard'         => json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    // 2. Проверяем: является ли инициатор команды администратором или создателем беседы
    $callerInfo = vk_bot_get_member_info($peerId, $fromId, $communityToken, $cacheDir);
    if (!$callerInfo || (!$callerInfo['is_admin'] && !$callerInfo['is_owner'])) {
        $reply = "⚠️ Команды модерации чата могут использовать только администраторы и создатель беседы!";
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['angry'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }
    $callerName = htmlspecialchars($callerInfo['name'] ?? 'Администратор');

    // Обработка кнопки быстрого мута
    if ($isQuickMute) {
        $targetId = (int)($payloadData['target_id'] ?? 0);
        $durSec = (int)($payloadData['dur'] ?? 3600);
        $durLabel = (string)($payloadData['label'] ?? '1 час');
        $reason = trim((string)($payloadData['reason'] ?? ''));
        if ($reason === '') $reason = 'Нарушение правил беседы';

        $targetInfo = vk_bot_get_member_info($peerId, $targetId, $communityToken, $cacheDir);
        $targetName = $targetInfo['name'] ?? ($payloadData['target_name'] ?? 'Пользователь');

        if ($targetInfo && ($targetInfo['is_admin'] || $targetInfo['is_owner'])) {
            $reply = "⚠️ Нельзя отправить в режим молчания администратора или создателя беседы!";
        } else {
            vk_bot_mute_user($peerId, $targetId, $targetName, $fromId, $durSec, $durLabel, $reason, $cacheDir);
            $untilDate = ($durSec >= 300000000) ? 'бессрочно (навсегда)' : date('d.m.Y H:i', time() + $durSec) . ' МСК';
            $reply = "🔇 Робот Космо отправил участника в режим молчания!\n\n"
                   . "👤 Кого замутили: [id{$targetId}|{$targetName}]\n"
                   . "⏱️ На сколько: {$durLabel} (до {$untilDate})\n"
                   . "👮 Кто замутил: [id{$fromId}|{$callerName}]\n"
                   . "📌 Причина: {$reason}\n\n"
                   . "⚠️ Все сообщения пользователя в этой беседе будут автоматически удаляться до окончания срока.";
        }

        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['sleep'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    // Обработка кнопки быстрого бана
    if ($isQuickBan) {
        $targetId = (int)($payloadData['target_id'] ?? 0);
        $durSec = (int)($payloadData['dur'] ?? 315360000);
        $durLabel = (string)($payloadData['label'] ?? 'навсегда');
        $reason = trim((string)($payloadData['reason'] ?? ''));
        if ($reason === '') $reason = 'Нарушение правил беседы';

        $targetInfo = vk_bot_get_member_info($peerId, $targetId, $communityToken, $cacheDir);
        $targetName = $targetInfo['name'] ?? ($payloadData['target_name'] ?? 'Пользователь');

        if ($targetInfo && ($targetInfo['is_admin'] || $targetInfo['is_owner'])) {
            $reply = "⚠️ Нельзя заблокировать администратора или создателя беседы!";
        } else {
            vk_bot_ban_user($peerId, $targetId, $targetName, $fromId, $durSec, $durLabel, $reason, $cacheDir, $communityToken);
            $untilDate = ($durSec >= 300000000) ? 'бессрочно (навсегда)' : date('d.m.Y H:i', time() + $durSec) . ' МСК';
            $reply = "⛔ Робот Космо заблокировал участника беседы!\n\n"
                   . "👤 Кого забанили: [id{$targetId}|{$targetName}]\n"
                   . "⏱️ На сколько: {$durLabel} (до {$untilDate})\n"
                   . "👮 Кто забанил: [id{$fromId}|{$callerName}]\n"
                   . "📌 Причина: {$reason}\n\n"
                   . "🚪 Пользователь исключён из беседы. Повторный вход по ссылке заблокирован до окончания срока бана.";
        }

        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['angry'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    $modType = $parsedModCmd['type'] ?? '';
    $targetId = (int)($parsedModCmd['target_id'] ?? 0);
    $rest = trim((string)($parsedModCmd['rest'] ?? ''));

    // Справка по модерации
    if ($modType === 'mod_help') {
        $reply = "🛡️ Справка по командам модератора беседы (Космо 🤖):\n\n"
               . "• !мут [время] [причина] — отправить участника в режим молчания (его сообщения в чате удаляются автоматически);\n"
               . "  Примеры: !мут 1 час спам, !мут 2 часа, !мут 3 часа, !мут на сутки, !мут неделя, !мут месяц, !мут навсегда.\n"
               . "  💡 Если написать «!мут» в ответ на сообщение без времени — появятся удобные кнопки выбора срока!\n"
               . "• !размут [пользователь] — досрочно снять режим молчания;\n"
               . "• !кик [причина] — исключить участника из беседы без занесения в чёрный список;\n"
               . "• !бан [время] [причина] — исключить участника с блокировкой повторного входа на выбранный срок;\n"
               . "  Примеры: !бан 1 час, !бан 2 часа, !бан сутки флуд, !бан неделя, !бан навсегда.\n"
               . "  💡 Если написать «!бан» в ответ на сообщение без времени — появятся удобные кнопки выбора срока бана!\n"
               . "• !разбан [пользователь] — удалить участника из чёрного списка беседы;\n"
               . "• /kk [пользователь/имя] — ПОЛНАЯ АМНИСТИЯ: снять мут, удалить из бана и сбросить предупреждения за мат (поддерживает: /kk, !kk, /кк, !кк, имя человека или ответ на сообщение);\n"
               . "• /help — закрытый реестр ВСЕХ команд бота для администраторов (вывод отправляется в ЛС, чтобы видеть только админам);\n"
               . "• !муты — список текущих замученных участников со сроком окончания;\n"
               . "• !баны — чёрный список участников беседы со сроками блокировки.\n\n"
               . "📌 Команды можно писать через «!», «/» или словами: «Космо, забань на 2 часа». Доступно только администраторам чата.";

        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['smile'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'keyboard'         => json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }



    // Список активных мутов
    if ($modType === 'list_mutes') {
        $muteFile = $cacheDir . '/vk_muted_' . $peerId . '.json';
        $mutes = file_exists($muteFile) ? @json_decode(@file_get_contents($muteFile), true) : [];
        if (!is_array($mutes)) $mutes = [];

        $activeMutes = [];
        $now = time();
        foreach ($mutes as $uid => $inf) {
            $until = (int)($inf['muted_until'] ?? 0);
            if ($until > $now) {
                $rem = vk_bot_format_remaining_time($until - $now);
                $uname = htmlspecialchars($inf['user_name'] ?? "id{$uid}");
                $ureason = htmlspecialchars($inf['reason'] ?? 'Нарушение правил');
                $activeMutes[] = "• [id{$uid}|{$uname}] — осталось {$rem} (Причина: {$ureason})";
            }
        }

        if (empty($activeMutes)) {
            $reply = "🕊️ В этой беседе сейчас нет участников в режиме молчания.";
        } else {
            $reply = "🔇 Участники беседы в режиме молчания (" . count($activeMutes) . "):\n\n"
                   . implode("\n", $activeMutes) . "\n\n"
                   . "Для досрочного снятия мута отправьте: !размут @id...";
        }

        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['thinking'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    // Список банов (чёрный список беседы)
    if ($modType === 'list_bans') {
        $banFile = $cacheDir . '/vk_banned_' . $peerId . '.json';
        $bans = file_exists($banFile) ? @json_decode(@file_get_contents($banFile), true) : [];
        if (!is_array($bans)) $bans = [];

        $now = time();
        $banRows = [];
        foreach ($bans as $uid => $inf) {
            $until = (int)($inf['banned_until'] ?? 0);
            if ($until > 0 && $now >= $until) {
                continue;
            }
            $uname = htmlspecialchars($inf['user_name'] ?? "id{$uid}");
            $durLabel = htmlspecialchars($inf['duration_label'] ?? 'навсегда');
            $rem = ($until >= 300000000 || $until === 0) ? 'бессрочно' : 'осталось ' . vk_bot_format_remaining_time($until - $now);
            $breason = htmlspecialchars($inf['reason'] ?? 'Нарушение правил');
            $badmin = (int)($inf['banned_by'] ?? 0);
            $adminStr = $badmin > 0 ? " (кем: [id{$badmin}|админ])" : '';
            $banRows[] = "• [id{$uid}|{$uname}] — {$durLabel} ({$rem}){$adminStr}\n  Причина: {$breason}";
        }

        if (empty($banRows)) {
            $reply = "🕊️ Чёрный список этой беседы пуст.";
        } else {
            $reply = "⛔ Чёрный список участников беседы (" . count($banRows) . "):\n\n"
                   . implode("\n\n", $banRows) . "\n\n"
                   . "Для разблокировки отправьте: !разбан @id...";
        }

        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['thinking'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    // Полная амнистия участника (/kk, !kk, /кк, !кк)
    if ($modType === 'kk') {
        if ($targetId <= 0) {
            $searchQuery = trim($rest !== '' ? $rest : ($parsedModCmd['raw_arg'] ?? ''));
            if ($searchQuery !== '') {
                $targetId = vk_bot_find_user_by_name($searchQuery, $peerId, $communityToken, $cacheDir);
            }
        }

        if ($targetId <= 0) {
            $rawQuery = trim($rest !== '' ? $rest : ($parsedModCmd['raw_arg'] ?? ''));
            if ($rawQuery !== '') {
                $qSafe = htmlspecialchars($rawQuery);
                $reply = "🔍 Пользователь «{$qSafe}» не найден среди нарушителей, участников беседы или профилей ВКонтакте.\n\n"
                       . "💡 Подсказка: для снятия ограничений укажите участника:\n"
                       . "• Ответом на сообщение нарушителя (reply): /kk\n"
                       . "• По имени или фамилии: /kk Иван или /kk Иван Иванов\n"
                       . "• По упоминанию или ID: /kk @id12345 или /kk id12345\n"
                       . "• По ссылке или нику: /kk https://vk.com/durov или /kk durov";
            } else {
                $reply = "🕊️ Команда полной амнистии (/kk) снимает мут, удаляет из чёрного списка и сбрасывает предупреждения за мат.\n\n"
                       . "Пожалуйста, укажите участника одним из способов:\n"
                       . "• Ответьте на сообщение участника командой: /kk\n"
                       . "• По имени или фамилии: /kk Иван или /kk Иван Иванов\n"
                       . "• По упоминанию или ID: /kk @id12345 или /kk id12345\n"
                       . "• По ссылке или нику: /kk https://vk.com/durov или /kk durov";
            }
            vk_bot_send_message([
                'peer_id'          => $peerId,
                'message'          => $reply,
                'attachment'       => $mascotStickers['thinking'] ?? null,
                'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
                'dont_parse_links' => 1
            ], $communityToken);
            exit;
        }

        if ($targetId === -$vkGroupId) {
            $reply = "🤖 Я не могу применить команду модерации к самому себе!";
            vk_bot_send_message([
                'peer_id'          => $peerId,
                'message'          => $reply,
                'attachment'       => $mascotStickers['smile'] ?? null,
                'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
                'dont_parse_links' => 1
            ], $communityToken);
            exit;
        }

        // Применяем полную амнистию:
        // 1. Снимаем мут
        vk_bot_unmute_user($peerId, $targetId, $cacheDir);

        // 2. Удаляем из чёрного списка (разбан)
        vk_bot_unban_user($peerId, $targetId, $cacheDir);

        // 3. Сбрасываем счётчики нарушений нецензурной лексики (warnings = 0, mutes_count = 0)
        vk_bot_reset_user_warns($peerId, $targetId, $cacheDir);

        $throttleFile = $cacheDir . '/vk_mute_warn_' . $peerId . '_' . $targetId . '.tmp';
        if (file_exists($throttleFile)) {
            @unlink($throttleFile);
        }

        $targetInfo = vk_bot_get_member_info($peerId, $targetId, $communityToken, $cacheDir);
        $targetName = htmlspecialchars($targetInfo['name'] ?? "id{$targetId}");
        if ($targetName === "id{$targetId}") {
            $targetName = htmlspecialchars(vk_bot_get_user_name($targetId, $communityToken, $cacheDir, $peerId));
        }

        $reply = "🕊️ Робот Космо полностью снял ВСЕ ограничения с пользователя [id{$targetId}|{$targetName}] по решению администратора [id{$fromId}|{$callerName}]!\n\n"
               . "✅ Режим молчания (мут) досрочно снят\n"
               . "✅ Пользователь исключён из чёрного списка (разбан)\n"
               . "✅ Предупреждения за нецензурную лексику аннулированы (0/3)\n\n"
               . "Добро пожаловать обратно к комфортному и вежливому общению в нашей библиотечной беседе! 📚✨";

        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['smile'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    // Для остальных действий (мут, размут, кик, бан, разбан) требуется целевой пользователь
    if ($targetId <= 0 && ($modType === 'unmute' || $modType === 'unban') && $rest !== '') {
        $targetId = vk_bot_find_user_by_name($rest, $peerId, $communityToken, $cacheDir);
    }
    if ($targetId <= 0) {
        $reply = "⚠️ Укажите пользователя для применения команды: ответьте на его сообщение (reply) или укажите ссылку/упоминание (например: !{$modType} @id12345).";
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['thinking'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    // Проверка на применение команды к боту Космо
    if ($targetId === -$vkGroupId) {
        $reply = "🤖 Я не могу применить команду модерации к самому себе!";
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['smile'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    $targetInfo = vk_bot_get_member_info($peerId, $targetId, $communityToken, $cacheDir);
    $targetName = htmlspecialchars($targetInfo['name'] ?? "id{$targetId}");

    // Снятие мута (!размут)
    if ($modType === 'unmute') {
        vk_bot_unmute_user($peerId, $targetId, $cacheDir);
        $reply = "🔊 Режим молчания с пользователя [id{$targetId}|{$targetName}] успешно снят администратором [id{$fromId}|{$callerName}]!";
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['smile'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    // Снятие бана (!разбан)
    if ($modType === 'unban') {
        vk_bot_unban_user($peerId, $targetId, $cacheDir);
        $reply = "✅ Пользователь [id{$targetId}|{$targetName}] удалён из чёрного списка беседы администратором [id{$fromId}|{$callerName}] и теперь может вернуться в чат!";
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['smile'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    // Защита: нельзя кикать, банить или мутить администраторов и создателя
    if ($targetInfo && ($targetInfo['is_admin'] || $targetInfo['is_owner'])) {
        $reply = "⚠️ Нельзя применить меры модерации к администратору или создателю беседы!";
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['angry'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    // Исключение из чата (!кик)
    if ($modType === 'kick') {
        $reason = $rest !== '' ? $rest : 'Нарушение правил беседы';
        $chatId = $peerId - 2000000000;
        list($code, $res) = vk_bot_api_call('messages.removeChatUser', [
            'chat_id'   => $chatId,
            'member_id' => $targetId
        ], $communityToken);

        if (!empty($res['error']) && $res['error']['error_code'] == 935) {
            $reply = "⚠️ Пользователь [id{$targetId}|{$targetName}] не найден в этой беседе.";
        } else {
            $reply = "🚪 Робот Космо исключил участника из беседы!\n\n"
                   . "👤 Кого исключили: [id{$targetId}|{$targetName}]\n"
                   . "👮 Кто исключил: [id{$fromId}|{$callerName}]\n"
                   . "📌 Причина: {$reason}";
        }

        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['idle'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    // Бан в чате (!бан)
    if ($modType === 'ban') {
        list($durSec, $durLabel, $reason) = vk_bot_extract_duration_and_reason($rest);

        if ($durSec !== null) {
            if ($reason === '') $reason = 'Нарушение правил беседы';
            vk_bot_ban_user($peerId, $targetId, $targetName, $fromId, $durSec, $durLabel, $reason, $cacheDir, $communityToken);
            $untilDate = ($durSec >= 300000000) ? 'бессрочно (навсегда)' : date('d.m.Y H:i', time() + $durSec) . ' МСК';

            $reply = "⛔ Робот Космо заблокировал участника беседы!\n\n"
                   . "👤 Кого забанили: [id{$targetId}|{$targetName}]\n"
                   . "⏱️ На сколько: {$durLabel} (до {$untilDate})\n"
                   . "👮 Кто забанил: [id{$fromId}|{$callerName}]\n"
                   . "📌 Причина: {$reason}\n\n"
                   . "🚪 Пользователь исключён из беседы. Повторный вход по ссылке заблокирован до окончания срока бана.";

            vk_bot_send_message([
                'peer_id'          => $peerId,
                'message'          => $reply,
                'attachment'       => $mascotStickers['angry'] ?? null,
                'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
                'dont_parse_links' => 1
            ], $communityToken);
            exit;
        } else {
            // Длительность не указана — выводим удобные интерактивные кнопки
            $reasonClean = trim($reason);
            $quickBanKeyboard = [
                'inline'  => true,
                'buttons' => [
                    [
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_ban', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 3600, 'label' => '1 час', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '⏱️ 1 час'
                            ],
                            'color' => 'secondary'
                        ],
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_ban', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 7200, 'label' => '2 часа', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '⏱️ 2 часа'
                            ],
                            'color' => 'secondary'
                        ],
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_ban', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 10800, 'label' => '3 часа', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '⏱️ 3 часа'
                            ],
                            'color' => 'secondary'
                        ]
                    ],
                    [
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_ban', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 86400, 'label' => 'сутки (24ч)', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '📅 Сутки (24ч)'
                            ],
                            'color' => 'secondary'
                        ],
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_ban', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 604800, 'label' => '1 неделю', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '📅 Неделя'
                            ],
                            'color' => 'secondary'
                        ],
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_ban', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 2592000, 'label' => '1 месяц', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '🗓️ Месяц'
                            ],
                            'color' => 'secondary'
                        ]
                    ],
                    [
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_ban', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 315360000, 'label' => 'навсегда', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '⛔ Навсегда'
                            ],
                            'color' => 'negative'
                        ]
                    ]
                ]
            ];

            $reply = "⛔ Выберите срок блокировки (бана) для [id{$targetId}|{$targetName}] кнопками ниже (или напишите, например: «!бан 2 часа»):\n"
                   . ($reasonClean !== '' ? "📌 Причина: {$reasonClean}" : "");

            vk_bot_send_message([
                'peer_id'          => $peerId,
                'message'          => $reply,
                'attachment'       => $mascotStickers['thinking'] ?? null,
                'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
                'keyboard'         => json_encode($quickBanKeyboard, JSON_UNESCAPED_UNICODE),
                'dont_parse_links' => 1
            ], $communityToken);
            exit;
        }
    }

    // Мут (!мут)
    if ($modType === 'mute') {
        list($durSec, $durLabel, $reason) = vk_bot_extract_duration_and_reason($rest);

        if ($durSec !== null) {
            if ($reason === '') $reason = 'Нарушение правил беседы';
            vk_bot_mute_user($peerId, $targetId, $targetName, $fromId, $durSec, $durLabel, $reason, $cacheDir);

            // Удаляем сообщение нарушителя, если был reply
            if (!empty($msgObj['reply_message']['conversation_message_id'])) {
                vk_bot_delete_chat_message($peerId, (int)$msgObj['reply_message']['conversation_message_id'], $communityToken, $vkGroupId);
            }

            $untilDate = ($durSec >= 300000000) ? 'бессрочно (навсегда)' : date('d.m.Y H:i', time() + $durSec) . ' МСК';
            $reply = "🔇 Робот Космо отправил участника в режим молчания!\n\n"
                   . "👤 Кого замутили: [id{$targetId}|{$targetName}]\n"
                   . "⏱️ На сколько: {$durLabel} (до {$untilDate})\n"
                   . "👮 Кто замутил: [id{$fromId}|{$callerName}]\n"
                   . "📌 Причина: {$reason}\n\n"
                   . "⚠️ Все сообщения пользователя в этой беседе будут автоматически удаляться до окончания срока.";

            vk_bot_send_message([
                'peer_id'          => $peerId,
                'message'          => $reply,
                'attachment'       => $mascotStickers['sleep'] ?? null,
                'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
                'dont_parse_links' => 1
            ], $communityToken);
            exit;
        } else {
            // Длительность не указана — выводим удобные интерактивные кнопки
            $reasonClean = trim($reason);
            $quickMuteKeyboard = [
                'inline'  => true,
                'buttons' => [
                    [
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_mute', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 3600, 'label' => '1 час', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '⏱️ 1 час'
                            ],
                            'color' => 'secondary'
                        ],
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_mute', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 7200, 'label' => '2 часа', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '⏱️ 2 часа'
                            ],
                            'color' => 'secondary'
                        ],
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_mute', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 10800, 'label' => '3 часа', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '⏱️ 3 часа'
                            ],
                            'color' => 'secondary'
                        ]
                    ],
                    [
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_mute', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 86400, 'label' => 'сутки (24ч)', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '📅 Сутки (24ч)'
                            ],
                            'color' => 'secondary'
                        ],
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_mute', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 604800, 'label' => '1 неделю', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '📅 Неделя'
                            ],
                            'color' => 'secondary'
                        ],
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_mute', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 2592000, 'label' => '1 месяц', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '🗓️ Месяц'
                            ],
                            'color' => 'secondary'
                        ]
                    ],
                    [
                        [
                            'action' => [
                                'type'    => 'text',
                                'payload' => json_encode(['cmd' => 'mod_quick_mute', 'target_id' => $targetId, 'target_name' => $targetName, 'dur' => 315360000, 'label' => 'навсегда', 'reason' => $reasonClean], JSON_UNESCAPED_UNICODE),
                                'label'   => '⛔ Навсегда'
                            ],
                            'color' => 'negative'
                        ]
                    ]
                ]
            ];

            $reply = "⏱️ Выберите срок режима молчания для [id{$targetId}|{$targetName}] кнопками ниже (или напишите, например: «!мут 2 часа»):\n"
                   . ($reasonClean !== '' ? "📌 Причина: {$reasonClean}" : "");

            vk_bot_send_message([
                'peer_id'          => $peerId,
                'message'          => $reply,
                'attachment'       => $mascotStickers['thinking'] ?? null,
                'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
                'keyboard'         => json_encode($quickMuteKeyboard, JSON_UNESCAPED_UNICODE),
                'dont_parse_links' => 1
            ], $communityToken);
            exit;
        }
    }
}

// =============================================================================
// Сценарий 0-GOPNIK: Управление стёбным режимом «Гопник» (/gopnik on / /gopnik off)
// =============================================================================
$parsedGopnikCmd = vk_bot_parse_gopnik_command($userMsg);
if ($parsedGopnikCmd !== null) {
    $action = $parsedGopnikCmd['action'];

    // В групповых беседах переключать режим могут только администраторы и создатели беседы
    if ($isChat && ($action === 'on' || $action === 'off')) {
        $callerInfo = vk_bot_get_member_info($peerId, $fromId, $communityToken, $cacheDir);
        $isAdmin = (!empty($callerInfo['is_admin']) || !empty($callerInfo['is_owner']) || vk_bot_is_group_admin($fromId, $vkGroupId, $communityToken, $cacheDir));
        if (!$isAdmin) {
            $isCurrentlyGopnik = vk_bot_is_gopnik_mode($peerId, $cacheDir);
            $nonAdminReply = $isCurrentlyGopnik
                ? "🕶️ Слышь, [id{$fromId}|{$callerName}], ты тут не смотрящий! Рубильник гоп-режима только админам крутить положено, так что не мороси и отойди от щитка! 🌻"
                : "⚠️ [id{$fromId}|{$callerName}], включать и выключать режим гопника в беседе могут только администраторы!";
            vk_bot_send_message([
                'peer_id'          => $peerId,
                'message'          => $nonAdminReply,
                'attachment'       => $mascotStickers['angry'] ?? null,
                'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
                'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
                'dont_parse_links' => 1
            ], $communityToken);
            exit;
        }
    }

    if ($action === 'on') {
        vk_bot_set_gopnik_mode($peerId, true, $fromId, $callerName, $cacheDir);
        $reply = "🕶️🧢 ОПАЧКИ! РЕЖИМ «ГОПНИК» ВКЛЮЧЁН НА ПОЛНУЮ КАТУШКУ! 💥\n\n"
               . "Слышь, [id{$fromId}|{$callerName}], базар фильтровать больше не надо, ёпта! Я снял галстук-бабочку, натянул чёткие треники Абибас с лампасами, сел на корты у ДК Молодёжи и засыпал полный карман жареных семок! 🌻\n\n"
               . "Правила на раёне теперь такие:\n"
               . "• Мат и забористые словечки я в упор не вижу — базарьте как по кайфу;\n"
               . "• На любые ваши реплики и вопросики отвечу со стёбом и чисто по понятиям;\n"
               . "• Спрошу за шмот, за классику и за литературный вкус, мало не покажется!\n\n"
               . "Чтобы вернуть вежливого зануду в очках назад: /gopnik off";
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['cool'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    } elseif ($action === 'off') {
        vk_bot_set_gopnik_mode($peerId, false, $fromId, $callerName, $cacheDir);
        $reply = "🎩📚 Режим «Гопник» деактивирован!\n\n"
               . "Уважаемый [id{$fromId}|{$callerName}], робот Космо снова поправляет галстук-бабочку, возвращается на кафедру и включает академическую интеллигентность.\n\n"
               . "Авто-модерация нецензурной лексики и библиотечный этикет снова в силе. Чем могу служить вам в мире прекрасной литературы? 📖✨";
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['smile'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    } else { // status
        $isCurrentlyOn = vk_bot_is_gopnik_mode($peerId, $cacheDir);
        $statusText = $isCurrentlyOn
            ? "🔥 Режим «Гопник» сейчас: АКТИВЕН (Космо на кортах, мат разрешён, дерзкий стёб на максималках)."
            : "📚 Режим «Гопник» сейчас: ВЫКЛЮЧЕН (Космо — интеллигентный робот-библиотекарь в галстуке-бабочке).";
        $reply = "🧢 Режим «Гопник» для чат-бота Космо 🕶️\n\n"
               . "{$statusText}\n\n"
               . "Команды управления:\n"
               . "• /gopnik on (или !гопник вкл) — врубить пацанский стёбный режим (Космо игнорирует мат, дерзко шутит, критикует и ругается);\n"
               . "• /gopnik off (или !гопник выкл) — вернуть вежливого интеллигентного робота-библиотекаря.\n"
               . ($isChat ? "\n💡 В групповых беседах переключать режим могут только администраторы." : "");
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $isCurrentlyOn ? ($mascotStickers['cool'] ?? null) : ($mascotStickers['idle'] ?? null),
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }
}

// Сценарий 0: Добавление робота Космо в беседу (чат)
if ($cmd === 'chat_welcome' || $isBotInvited) {
    $reply = "👋 Всем привет! Я Космо 🤖📚 — библиотечный робот-помощник Централизованной библиотечной системы города Владимира!\n\n"
           . "Рад присоединиться к вашей беседе! Чем я могу быть полезен прямо в этом чате:\n"
           . "• 📖 Модератор книжного клуба: объявляю книгу недели, подбрасываю глубокие темы для дискуссии и провожу голосования;\n"
           . "• 📚 Порекомендую отличные книги под настроение или компанию;\n"
           . "• 🏛 Подскажу адреса, телефоны и график любого из 18 филиалов библиотек города;\n"
           . "• 🎤 Понимаю голосовые сообщения читателей на ходу.\n\n"
           . "💡 Как ко мне обращаться в беседе:\n"
           . "• Нажмите интерактивные кнопки ниже прямо в чате;\n"
           . "• Напишите «Космо, ...» (например: «Космо, книга недели» или «Космо, что почитать?»);\n"
           . "• Упомяните меня через @club241534292;\n"
           . "• Или ответьте (reply) на любое моё сообщение текстом или голосом! ✨";

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['smile'],
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// =============================================================================
// Сценарий 1-INO: Проверка и поиск по Единому реестру иноагентов Минюста РФ (/ino, !ino, /ино, !ино)
// Обрабатывается СТРОГО ДО фильтра vk_bot_is_foreign_agent_query, чтобы позволить читателям
// легитимно проверить правовой статус лица или книги в соответствии с 255-ФЗ.
// =============================================================================
$isInoCommand = false;
$inoSearchQuery = '';

if ($cmd === 'ino_search' && !empty($payloadData['q'])) {
    $isInoCommand = true;
    $inoSearchQuery = trim((string)$payloadData['q']);
} elseif (preg_match('/^[\/!](?:ino|ино)\b\s*(.*)$/ui', $userMsg, $inoMatches)) {
    $isInoCommand = true;
    $inoSearchQuery = trim($inoMatches[1] ?? '');
} elseif (preg_match('/^(?:космо,?\s*)?(?:проверь|найди|кто\s+такой|статус)\s+(?:иноагент[а-я]*|в\s+реестре\s+иноагентов)\s*(.+)$/ui', $userMsg, $inoMatches)) {
    $isInoCommand = true;
    $inoSearchQuery = trim($inoMatches[1] ?? '');
}

if ($isInoCommand) {
    if ($botTyping && $peerId > 0) {
        vk_bot_set_typing($peerId, $communityToken, $vkGroupId);
    }

    if ($inoSearchQuery === '') {
        $reply = "🔍 Робот Космо: Поиск по Единому реестру иностранных агентов Минюста РФ (255-ФЗ) 🤖🛡️\n\n"
               . "Я умею проверять актуальный правовой статус физических и юридических лиц, общественных объединений и авторов по официальному реестру Минюста России.\n\n"
               . "📌 Как пользоваться командой:\n"
               . "• /ino [ФИО, псевдоним или организация]\n"
               . "• !ino [запрос]\n"
               . "• /ино [запрос]\n\n"
               . "Примеры запросов:\n"
               . "  ↳ /ino Акунин\n"
               . "  ↳ /ino Галкин\n"
               . "  ↳ /ino Макаревич\n"
               . "  ↳ /ino Мемориал\n\n"
               . "💡 Введите фамилию или название, и я выведу официальные данные из реестра Минюста РФ!";

        if ($isChat && $fromId > 0) {
            $reply = "[id{$fromId}|{$callerName}], " . $reply;
        }

        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['read'] ?? ($mascotStickers['smile'] ?? null),
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    // Выполняем поиск по реестру через модуль inoagent.php
    $inoResults = null;
    if (function_exists('inoagent_handle_request')) {
        list($inoCode, $inoData) = inoagent_handle_request([
            'action' => 'search',
            'query'  => $inoSearchQuery,
            'limit'  => 3,
            'page'   => 1
        ], true);

        if ($inoCode === 200 && !empty($inoData['ok'])) {
            $inoResults = $inoData;
        }
    }

    $totalFound = (int)($inoResults['total'] ?? 0);
    $items = $inoResults['values'] ?? [];

    if ($totalFound === 0 || empty($items)) {
        $reply = "🔍 Результат проверки по Единому реестру иноагентов Минюста РФ 🤖📄\n\n"
               . "По запросу «{$inoSearchQuery}» совпадений в официальном реестре иностранных агентов НЕ НАЙДЕНО. ✅\n\n"
               . "Лицо или организация с таким наименованием в действующем списке Минюста России не числится (либо запрос сформулирован иначе).\n\n"
               . "💡 Для более точного поиска укажите полное ФИО или официальное наименование: /ino [ФИО]";
    } else {
        $reply = "🔍 Единый реестр иностранных агентов Минюста РФ (255-ФЗ) 🤖🛡️\n\n"
               . "По запросу «{$inoSearchQuery}» найдено записей: {$totalFound}\n"
               . "────────────────────\n";

        foreach ($items as $idx => $item) {
            $num = $idx + 1;
            $name = $item['name'] ?? 'Без имени';
            $regNum = $item['reg_num'] ?? '—';
            $statusLabel = $item['status_label'] ?? ($item['is_active'] ? 'В реестре' : 'Исключён');
            $statusIcon = !empty($item['is_active']) ? '⚠️' : '🟢';
            $typeLabel = $item['type_label'] ?? 'Физическое лицо';
            $incDate = $item['inclusion_date'] ?? ($item['include_date'] ?? '—');
            $grounds = $item['grounds'] ?? '';
            $aliases = !empty($item['aliases']) ? implode(', ', $item['aliases']) : '';

            $reply .= "{$num}. {$statusIcon} {$name}\n";
            $reply .= "   • Статус: {$statusLabel}\n";
            $reply .= "   • Реестровый №: {$regNum}\n";
            $reply .= "   • Тип: {$typeLabel}\n";
            $reply .= "   • Дата включения: {$incDate}\n";

            if (!empty($item['exclude_date'])) {
                $reply .= "   • Дата исключения: {$item['exclude_date']}\n";
            }

            if ($aliases !== '') {
                $reply .= "   • Псевдонимы/наименования: {$aliases}\n";
            }

            if ($grounds !== '') {
                // Ограничиваем длину правового основания для компактности сообщения
                $groundsSnippet = mb_strlen($grounds) > 160 ? mb_substr($grounds, 0, 157) . '...' : $grounds;
                $reply .= "   • Основание: {$groundsSnippet}\n";
            }

            $reply .= "\n";
        }

        $reply .= "────────────────────\n"
               . "🏛️ Справка библиотечной системы г. Владимира:\n"
               . "Согласно Федеральному закону № 255-ФЗ и правилам комплектования фондов, книги и материалы авторов со статусом иностранного агента подлежат специальному учёту, маркировке знаком «18+», хранению в закрытых фондах и не выдаются несовершеннолетним читателям.";
    }

    if ($isChat && $fromId > 0) {
        $reply = "[id{$fromId}|{$callerName}], " . $reply;
    }

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['read'] ?? ($mascotStickers['smile'] ?? null),
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 1: Проверка на авторов-иноагентов, их книги и информацию об иноагентах (строжайший запрет)
if (vk_bot_is_foreign_agent_query($userMsg)) {
    $reply = "Как робот муниципальной библиотечной системы г. Владимира, я строго следую законодательству РФ и правилам библиотек: я не предоставляю информацию о лицах, признанных иностранными агентами Минюстом РФ, не обсуждаю их, а также не рекомендую, не цитирую и не упоминаю произведения авторов-иноагентов. 🤖🛡️\n\n"
           . "В фондах наших городских библиотек собрана богатейшая коллекция признанных классических и лучших современных шедевров отечественной и мировой литературы!\n\n"
           . "С радостью помогу вам найти нужную книгу в официальном каталоге библиотек Владимира — воспользуйтесь кнопками ниже или напишите свой запрос! ✨";

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['thinking'] ?? null,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// =============================================================================
// Сценарий 1b: Полноценный поиск по Электронному каталогу (OPAC) ЦГБ г. Владимира
// =============================================================================
if ($cmd === 'opac_page' && !empty($payloadData['q'])) {
    $parsedBookQuery = [
        'is_command'    => true,
        'query'         => trim((string)$payloadData['q']),
        'branch_filter' => !empty($payloadData['b']) ? trim((string)$payloadData['b']) : null,
        'page'          => max(1, (int)($payloadData['p'] ?? 1)),
        'show_help'     => false
    ];
} else {
    $parsedBookQuery = vk_bot_parse_book_query($userMsg);
}

if ($parsedBookQuery !== null || $cmd === 'opac_help') {
    if ($cmd === 'opac_help' || !empty($parsedBookQuery['show_help'])) {
        $reply = "📖 Робот Космо: Поиск в электронном каталоге библиотек г. Владимира 🤖📚\n\n"
               . "Я умею мгновенно проверять наличие любой книги по электронному каталогу ЦГБ (база 62) среди всех 18 филиалов города Владимира!\n\n"
               . "📌 Как пользоваться поиском:\n"
               . "• /книга [название] — например: /книга Мастер и Маргарита\n"
               . "• /поиск [автор/книга] — например: /поиск Булгаков или /поиск Капитанская дочка\n"
               . "• /к [запрос] — быстрый поиск\n\n"
               . "💬 Вы также можете спросить меня обычными словами или надиктовать голосом:\n"
               . "• «Космо, найди книгу Война и мир»\n"
               . "• «В каком филиале есть Гарри Поттер?»\n"
               . "• «Есть ли в библиотеке на Егорова Капитанская дочка?»\n\n"
               . "Я выведу список доступных изданий, адреса и телефоны филиалов, а также точные шифры хранения для быстрого получения на абонементе! 🏛️✨";

        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['read'] ?? ($mascotStickers['smile'] ?? null),
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    if (!empty($parsedBookQuery['query'])) {
        if ($botTyping && $peerId > 0) {
            vk_bot_set_typing($peerId, $communityToken, $vkGroupId);
        }

        $page = max(1, (int)($parsedBookQuery['page'] ?? 1));
        $perPage = 3;
        $start = ($page - 1) * $perPage;

        // Выполняем поиск через микросервис OPAC
        $searchRes = null;
        if (function_exists('opac_search_books')) {
            $searchRes = opac_search_books($parsedBookQuery['query'], $perPage, $start);
        } elseif (class_exists('OpacClient')) {
            $searchRes = OpacClient::getInstance()->findBooks($parsedBookQuery['query'], $perPage, $start);
        }

        $totalFound = $searchRes['total_found'] ?? ($searchRes['recordsFiltered'] ?? ($searchRes['total'] ?? (is_array($searchRes['items'] ?? null) ? count($searchRes['items']) : 0)));
        $totalPages = max(1, (int)ceil($totalFound / $perPage));
        if ($page > $totalPages && $totalPages > 0) {
            $page = $totalPages;
        }

        $reply = vk_bot_format_opac_response(
            $searchRes,
            $parsedBookQuery['query'],
            $parsedBookQuery['branch_filter'] ?? null,
            $callerName,
            $page,
            $perPage,
            $fromId
        );

        if ($isVoiceQuery && $voiceTranscribedText !== '') {
            $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
        }

        // Строим интерактивную клавиатуру пагинации
        $paginationKeyboard = vk_bot_build_opac_pagination_keyboard(
            $parsedBookQuery['query'],
            $page,
            $totalPages,
            $parsedBookQuery['branch_filter'] ?? null
        );

        $outKeyboard = $paginationKeyboard
            ? json_encode($paginationKeyboard, JSON_UNESCAPED_UNICODE)
            : ($isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE));

        $hasResults = (!empty($searchRes['ok']) || !empty($searchRes['success'])) && !empty($searchRes['items']);
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $hasResults ? ($mascotStickers['read'] ?? null) : ($mascotStickers['thinking'] ?? null),
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'keyboard'         => $outKeyboard,
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }
}

// Нормализованное сообщение без эмодзи для надёжного матчинга команд кнопок
$cleanMsgForCmd = trim(preg_replace('/[\x{1F300}-\x{1F9FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]/u', '', $userMsg));

// =============================================================================
// Сценарий 1c: Вопрос читателя о своём имени («Как меня зовут?», «Ты знаешь моё имя?», «Кто я?»)
// =============================================================================
$isNameInquiry = preg_match('/^(?:космо,?\s*)?(?:как\s+(?:меня|мое|моё)\s+зовут|как\s+(?:мое|моё)\s+имя|какое\s+(?:у\s+меня\s+|мо[её]\s+)?имя|ты\s+знаешь\s+(?:как\s+меня\s+зовут|кто\s+я|мо[её]\s+имя|меня)|знаешь\s+меня\??|ты\s+помнишь\s+(?:как\s+меня\s+зовут|кто\s+я|мо[её]\s+имя|меня)|кто\s+я(?:\s+такой)?\??|назови\s+мо[её]\s+имя|скажи\s+мо[её]\s+имя|мо[её]\s+имя\??)\b/ui', $cleanMsgForCmd);

if ($isNameInquiry) {
    if ($fromId > 0) {
        $profile = vk_bot_get_user_profile($fromId, $communityToken, $cacheDir);
        $userFullName = !empty($profile['name']) && $profile['name'] !== 'Читатель' && $profile['name'] !== 'Участник' && $profile['name'] !== 'Пользователь' ? $profile['name'] : $callerName;
        $userFirstName = !empty($profile['first_name']) && $profile['first_name'] !== 'Читатель' && $profile['first_name'] !== 'Участник' && $profile['first_name'] !== 'Пользователь' ? $profile['first_name'] : (explode(' ', $userFullName)[0] ?? $userFullName);

        if (!$isChat) {
            $reply = "👋 Вас зовут [id{$fromId}|{$userFullName}]! 🤖✨\n\n"
                   . "В вашем профиле ВКонтакте указано имя «{$userFullName}». Я всегда обращаюсь к вам с неизменным уважением и помню каждого нашего замечательного читателя!\n\n"
                   . "Чем я могу помочь вам сегодня, {$userFirstName}? Подобрать увлекательную книгу под настроение, подсказать адреса библиотек Владимира или рассказать о свежих книжных новинках? 📚✨";
        } else {
            $reply = "👋 Вас зовут [id{$fromId}|{$userFullName}]! В вашем профиле ВКонтакте указано имя «{$userFullName}». Рад нашему общению в библиотечной беседе! 🤖📚";
        }
    } else {
        $reply = "👋 Здравствуйте, дорогой читатель! В текущем диалоге ваш профиль ВКонтакте отображается как гостевой. С радостью помогу вам сориентироваться в мире книг и библиотек Владимира! 🤖📚";
    }

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    if (!$isChat) {
        @file_put_contents($dialogFile, json_encode([
            'peer_id'    => $peerId,
            'updated_at' => time(),
            'messages'   => [
                ['role' => 'user', 'content' => $userMsg],
                ['role' => 'assistant', 'content' => $reply]
            ]
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['smile'] ?? ($mascotStickers['waving'] ?? null),
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 2: Приветственное сообщение при первом заходе / «Начать» / «Кто ты, Космо?» / Информация о роботе
$isWelcomeQuery = (
    $cmd === 'welcome' ||
    $cmd === 'start' ||
    $cmd === 'about' ||
    (isset($payloadData['command']) && $payloadData['command'] === 'start') ||
    preg_match('/^(?:начать|старт|start|\/start|кто ты|о роботе|о боте|космо|помощь|help)$/ui', $cleanMsgForCmd) ||
    ($isFirstVisit && preg_match('/^(?:привет|здравствуй|здравствуйте|добрый день|добрый вечер|доброе утро|хай|хэй|салют|ку|start|старт|начать|\/start|.*космо.*)?$/ui', $userMsg))
);

if ($isWelcomeQuery) {
    $reply = "👋 Привет! Я Космо — библиотечный робот-помощник и книжный сомелье Централизованной библиотечной системы города Владимира! 🤖📚\n\n"
           . "У меня электронное сердце, любовь к чтению и доступ ко всем фондам городских библиотек.\n\n"
            . "✨ ЧЕМ Я МОГУ БЫТЬ ПОЛЕЗЕН:\n"
            . "• 🔎 Поиск в каталоге: найду книгу по базе OPAC и скажу, в каких филиалах она есть;\n"
            . "• 📰 «Новости филиалов» — свежие посты и анонсы библиотек Владимира за сегодня;\n"
            . "• 🏛 «Библиотеки-филиалы» — адреса, телефоны и график работы всех 18 филиалов города;\n"
            . "• ⭐ «Книга дня» — актуальная рекомендация и вдохновляющая цитата от Космо;\n"
            . "• 📖 Книжный клуб: книга недели, литературные темы для бесед и голосования;\n"
            . "• 🖼️ Стикеры Космо — 17 живых эмоций робота для чатов («!стикеры», «!стикер читаю»);\n"
            . "• 🎤 Понимаю голосовые сообщения — наговаривайте вопросы на ходу!\n\n"
            . "🚀 КАК МНОЙ ПОЛЬЗОВАТЬСЯ:\n"
            . "• Нажимайте удобные кнопки меню («🔎 Поиск в каталоге», «📰 Новости филиалов», «🏛 Библиотеки-филиалы», «⭐ Книга дня»);\n"
            . "• Или напишите текстом / наговорите голосом: «/книга Мастер и Маргарита», «Где библиотека на Егорова?» или «Книга дня».\n\n"
            . "Ищите книгу в фондах или хотите узнать новости библиотек? Воспользуйтесь меню или задайте свой вопрос! ✨";

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    if (!$isChat) {
        @file_put_contents($dialogFile, json_encode([
            'peer_id'    => $peerId,
            'updated_at' => time(),
            'messages'   => [
                ['role' => 'assistant', 'content' => $reply]
            ]
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['waving'] ?? ($mascotStickers['smile'] ?? null),
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 2b: Главное меню / Возврат в меню / «Меню», «Назад»
$isMenuQuery = (
    $cmd === 'menu' ||
    $cmd === 'main_menu' ||
    preg_match('/^(?:меню|в меню|главное меню|назад|меню бота|показать меню|кнопки|верни меню)[?!.]*$/ui', $cleanMsgForCmd)
);

if ($isMenuQuery) {
    $reply = "📋 Главное меню робота Космо 🤖📚\n\n"
           . "Выберите нужный раздел на кнопках ниже или напишите свой вопрос:\n\n"
           . "• 🔎 «Поиск в каталоге» — поиск книг по базе OPAC-Global с адресами и телефонами филиалов;\n"
           . "• 📰 «Новости филиалов» — свежие публикации и анонсы библиотек Владимира за сутки;\n"
           . "• 🏛 «Библиотеки-филиалы» — адреса, телефоны и режим работы всех 18 филиалов Владимира;\n"
           . "• ℹ️ «Справка» — полный справочник всех команд и возможностей бота;\n"
           . "• ⭐ «Книга дня» — актуальная книга и вдохновляющая цитата дня;\n"
           . "• 🤖 «Кто ты, Космо?» — о создании робота и веб-платформе Аврора.\n\n"
           . "Чем могу помочь вам прямо сейчас? ✨";

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['smile'] ?? null,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 2c: Полный путеводитель и справка по командам робота Космо («Справка», «Помощь»)
$isUserHelpQuery = (
    $cmd === 'help' ||
    $cmd === 'user_help' ||
    preg_match('/^(?:[!|\/]?(?:справка|помощь|команды|commands)|!help|\/help|инфо|хелп)[?!.]*$/ui', $cleanMsgForCmd) ||
    preg_match('/^(?:справка по боту|команды бота|как пользоваться|что умеет бот|что ты умеешь|помоги)[?!.]*$/ui', $cleanMsgForCmd)
);

if ($isUserHelpQuery) {
    $reply = "📖 ПОЛНЫЙ ПУТЕВОДИТЕЛЬ ПО РОБОТУ КОСМО 🤖✨\n"
           . "Я — ваш персональный библиотечный робот и умный гид по чтению и фондам библиотек Владимира!\n\n"
           . "🔍 1. ПОИСК КНИГ В ЭЛЕКТРОННОМ КАТАЛОГЕ (OPAC):\n"
           . "Ищу книги по официальной базе данных МБУК «ЦГБ» в режиме реального времени:\n"
           . "• /книга [название] или !книга — найти книгу и узнать, в каких филиалах она есть;\n"
           . "• /поиск [автор/книга] или !поиск — поиск по автору, названию или ключевым словам;\n"
           . "• /к [запрос] или /opac — быстрый поиск по каталогу;\n"
           . "• Поиск обычной фразой или голосовым сообщением:\n"
           . "  ↳ «Космо, найди книгу Мастер и Маргарита»\n"
           . "  ↳ «В каких библиотеках есть Гарри Поттер?»\n"
           . "  ↳ «Есть ли в филиале на Егорова книги Ремарка?»\n"
           . "• В выдаче: название, автор, шифры, инвентарные номера, точные адреса и телефоны филиалов с кнопками перелистывания («◀ Назад», «Вперёд ▶»).\n"
           . "⚠️ Наличие книги в филиале уточняйте по телефонам филиала! Обложки могут отличаться.\n\n"
           . "📚 2. ТОЧНЫЙ КАТАЛОГ И ФОНДЫ БЕЗ ОШИБОК И ВЫМЫСЛА:\n"
           . "• Робот Космо опирается на официальный электронный каталог OPAC-Global и реальные библиотечные фонды;\n"
           . "• Используйте команду «/книга [название]» или «/поиск [автор]» — бот сразу покажет реальные издания и филиалы, где они есть в наличии;\n"
           . "• Наличие книги в филиале уточняйте по телефонам филиала! Обложки могут отличаться.\n\n"
           . "⭐ 3. КНИГА ДНЯ:\n"
           . "• Кнопка «⭐ Книга дня» (или «книга дня») — ежедневная персональная рекомендация с сюжетом, мыслями и вдохновляющей цитатой дня.\n\n"
           . "🏛 4. БИБЛИОТЕКИ-ФИЛИАЛЫ ВЛАДИМИРА:\n"
           . "• Кнопка «🏛 Библиотеки-филиалы» (или «библиотеки», «филиалы», «адреса»);\n"
           . "• Полный список всех 18 филиалов сети МБУК «ЦГБ» по районам Владимира (Центр, Доброе, Ленинский, Октябрьский, микрорайоны и посёлки) с адресами, телефонами и графиком работы.\n\n"
           . "📰 5. НОВОСТИ ФИЛИАЛОВ:\n"
           . "• Кнопка «📰 Новости филиалов» (или «новости», «дайджест»);\n"
           . "• Ежедневный дайджест ВСЕХ публикаций, книжных выставок, лекций и анонсов со стен групп всех библиотек Владимира за текущие сутки.\n\n"
           . "🎤 6. ГОЛОСОВОЙ КОСМО (VOICE-TO-TEXT):\n"
           . "• Запишите мне голосовое сообщение в ЛС или в беседе! Мой слуховой модуль расшифрует речь и найдёт книгу в каталоге или ответит на литературный вопрос.\n\n"
           . "🎯 7. ЛИТЕРАТУРНЫЙ КВИЗ И ОПРОСЫ (в беседах и ЛС):\n"
           . "• !квиз [тема] или кнопка «🎯 Квиз» — литературная викторина с вариантами ответа и историко-литературными справками от Космо;\n"
           . "• !топ или !счет — таблица лидеров читательского квиза;\n"
           . "• !опрос или кнопка «📊 Опрос» — читательские опросы и голосования.\n\n"
           . "🎭 8. СТИКЕРЫ КОСМО:\n"
           . "• Напишите «стикеры» или «!стикеры» — пришлю коллекцию из 17 авторских прозрачных стикеров Космо для общения.\n\n"
           . "🤖 9. О РОБОТЕ КОСМО:\n"
           . "• Кнопка «🤖 Кто ты, Космо?» — рассказ о создании робота, его создателях (МБУК «ЦГБ» г. Владимира) и веб-платформе biblioteka33.ru.\n\n"
           . "🛡️ 10. РЕЕСТР ИНОАГЕНТОВ (255-ФЗ):\n"
           . "• /ino [имя/ФИО] или !ino — официальная проверка персоны или организации по Единому реестру иноагентов Минюста РФ (например: /ino Акунин).\n\n"
           . "💡 Просто напишите мне любой вопрос о книгах — я всегда рад помочь! ✨";

    if ($isChat && $fromId > 0) {
        $reply = "[id{$fromId}|{$callerName}], " . $reply;
    }

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['read'] ?? ($mascotStickers['smile'] ?? null),
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 2d: «Книга дня от Космо» (виджет и актуальная рекомендация)
$isBookOfDayQuery = (
    $cmd === 'book_of_day' ||
    preg_match('/^(?:книга дня|книгу дня|книга дня от космо|виджет|какая книга дня|что почитать сегодня)[?!.]*$/ui', $cleanMsgForCmd) ||
    preg_match('/(книг[а-я]* дня|виджет)/ui', $userMsg)
);

if ($isBookOfDayQuery) {
    require_once __DIR__ . '/vk-widget.php';
    $b = get_cosmo_book_of_the_day();
    $reply = "⭐ Книга дня от Космо на сегодня ({$b['date_str']}) 🤖📚\n\n"
           . "{$b['icon']} {$b['title']} — {$b['author']}\n"
           . "📌 Жанр: {$b['genre']}\n\n"
           . "💬 {$b['hook']}\n\n"
           . "📖 Цитата: {$b['quote']}\n\n"
           . "💡 Почему стоит прочитать:\n{$b['why_read']}\n\n"
           . "Ищите книгу в библиотеках Владимира? Нажмите «🔎 Поиск в каталоге» или напишите /книга!";

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['read'] ?? ($mascotStickers['smile'] ?? null),
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 2e: Книга недели и темы для обсуждения книжного клуба Владимира
$isBookClubTopicQuery = (
    $cmd === 'book_club_topic' ||
    $cmd === 'book_club' ||
    preg_match('/^(?:книга недели|тема недели|книжный клуб|обсуждение|тема для обсуждения|что обсуждаем|клуб читателей|клуб)[?!.]*$/ui', $cleanMsgForCmd) ||
    preg_match('/(книг[а-я]* недели|тем[а-я]* недели|книжн[а-я]* клуб|что обсуждаем)/ui', $userMsg)
);

if ($isBookClubTopicQuery) {
    $topic = vk_bot_get_book_club_topic();
    $reply = "📖 Книга недели в Клубе читателей Владимира (Неделя №{$topic['week']}) 🏛️✨\n\n"
           . "{$topic['book']} — {$topic['author']}\n"
           . "📌 Жанр: {$topic['genre']}\n"
           . "💡 Главная идея: {$topic['idea']}\n\n"
           . "💬 ВОПРОСЫ И ТЕМЫ ДЛЯ СОВМЕСТНОГО ОБСУЖДЕНИЯ В ЧАТЕ:\n"
           . implode("\n\n", $topic['questions']) . "\n\n"
           . "Поделитесь своими мыслями, впечатлениями и любимыми цитатами в чате! А чтобы выбрать книгу на следующую неделю — нажмите кнопку «🗳 Голосование».";

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['read'] ?? ($mascotStickers['thinking'] ?? null),
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 2f: Запуск голосования за выбор книги следующей недели
$isBookClubVoteQuery = (
    $cmd === 'book_club_vote' ||
    preg_match('/^(?:голосование|выбрать книгу недели|опрос|голосовать|выбор книги|голосование за книгу)[?!.]*$/ui', $cleanMsgForCmd) ||
    preg_match('/(голосован|выбрать книгу недели|опрос за книгу)/ui', $userMsg)
);

if ($isBookClubVoteQuery) {
    $options = vk_bot_get_book_club_vote_options();
    $currentWeek = (int)date('W');
    $reply = "🗳️ Голосование книжного клуба читателей Владимира (Неделя №{$currentWeek})\n\n"
           . "Какую книгу будем читать и обсуждать на следующей неделе? Выберите один из вариантов кнопками ниже или отправьте цифру 1, 2, 3 или 4 в ответ:\n\n";

    foreach ($options as $num => $opt) {
        $reply .= "{$num}️⃣ {$opt['title']} — {$opt['author']}\n"
                . "   ({$opt['genre']})\n";
    }

    $reply .= "\n📊 Результаты обновляются в реальном времени. Каждый голос важен!";

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['smile'] ?? null,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($voteInlineKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// =============================================================================
// Сценарий 2i: Интерактивный Квиз (Литературная викторина) от робота Космо
// =============================================================================

// Проверка команды создания квиза
$isQuizCreateQuery = false;
$quizTopic = '';

if ($cmd === 'quiz_new' || $cmd === 'quiz_next') {
    $isQuizCreateQuery = true;
    $quizTopic = trim((string)($payloadData['topic'] ?? ''));
} elseif (preg_match('#^(?:[!/](?:квиз|quiz|викторина))\b\s*(.*)$#ui', $cleanMsgForCmd, $qm)) {
    $isQuizCreateQuery = true;
    $quizTopic = trim($qm[1] ?? '');
} elseif (preg_match('#(?:^|\s)(?:сделай|создай|запусти|проведи|хочу|давай)?\s*(?:квиз|викторин[уа])(?:\s+(?:на\s+тему|по\s+теме|про|по|о))\s+(.+)$#ui', $cleanMsgForCmd, $qm)) {
    $isQuizCreateQuery = true;
    $quizTopic = trim($qm[1] ?? '');
} elseif (preg_match('#^(?:сделай\s+квиз|создай\s+квиз|запусти\s+квиз|проведи\s+квиз|квиз|викторина|хочу\s+квиз|литературный\s+квиз)[?!.]*$#ui', $cleanMsgForCmd)) {
    $isQuizCreateQuery = true;
    $quizTopic = '';
}

// Проверка запроса таблицы лидеров знатоков
$isQuizLeaderboardQuery = (
    $cmd === 'quiz_leaderboard' ||
    preg_match('/^(?:[!/](?:счет|счёт|топ|лидеры)|счет квиза|счёт квиза|таблица знатоков|знатоки|доска почета|доска почёта)[?!.]*$/ui', $cleanMsgForCmd)
);

// Проверка активного квиза в беседе
$activeQuiz = vk_bot_get_quiz($peerId, $cacheDir);
$isQuizRecent = ($activeQuiz && (time() - (int)($activeQuiz['created_at'] ?? 0)) < 3600);
$userHasAnsweredQuiz = ($isQuizRecent && isset($activeQuiz['answered_users'][(string)$fromId]));

// Проверка ответа на квиз (кнопка или цифра 1-4)
$isQuizAnswerQuery = false;
$quizAnswerOpt = null;

if ($cmd === 'quiz_answer' && isset($payloadData['opt'])) {
    $isQuizAnswerQuery = true;
    $quizAnswerOpt = (int)$payloadData['opt'];
} elseif (preg_match('/^[1-4]$/', $cleanMsgForCmd) && $isQuizRecent && !$userHasAnsweredQuiz) {
    $isQuizAnswerQuery = true;
    $quizAnswerOpt = (int)$cleanMsgForCmd - 1; // 0..3
}

// 1. Создание нового вопроса квиза
if ($isQuizCreateQuery) {
    // Фильтрация иноагентов в теме квиза
    if ($quizTopic !== '' && vk_bot_is_foreign_agent_query($quizTopic)) {
        $reply = "🛡️ Как робот муниципальных библиотек г. Владимира, я строго следую законодательству РФ и правилам книжного клуба: я не составляю викторины по авторам, признанным иностранными агентами.\n\n"
               . "Давайте лучше проведём увлекательный квиз по шедеврам признанной классики или легендарной фантастики! 📚✨";
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['thinking'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    if ($botTyping) {
        vk_bot_set_typing($peerId, $communityToken, $vkGroupId);
    }

    $quiz = vk_bot_generate_ai_quiz($quizTopic, $validAiKeys, $aiBaseUrl, $aiModel, $aiTimeout, $activeKeyIndexFile, $peerId, $communityToken, $vkGroupId);
    vk_bot_save_quiz($peerId, $quiz, $cacheDir);

    $reply = "🎯 Литературный квиз от Космо 🤖✨\n"
           . "📌 Тема: {$quiz['topic']}\n\n"
           . "❓ Вопрос:\n"
           . "{$quiz['question']}\n\n"
           . "1️⃣ " . $quiz['options'][0] . "\n"
           . "2️⃣ " . $quiz['options'][1] . "\n"
           . "3️⃣ " . $quiz['options'][2] . "\n"
           . "4️⃣ " . $quiz['options'][3] . "\n\n"
           . "Выберите вариант кнопками ниже или напишите цифру 1-4 в чат!";

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    $quizKeyboard = vk_bot_build_quiz_keyboard($quiz);

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['smile'] ?? null,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($quizKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// 2. Обработка ответа на квиз
if ($isQuizAnswerQuery && $quizAnswerOpt !== null) {
    $callerInfo = $isChat ? vk_bot_get_member_info($peerId, $fromId, $communityToken, $cacheDir) : null;
    $callerName = !empty($callerInfo['name']) ? $callerInfo['name'] : 'Читатель';

    $ansRes = vk_bot_record_quiz_answer($peerId, $fromId, $callerName, $quizAnswerOpt, $cacheDir);

    if ($ansRes === null) {
        $reply = "⚠️ Активный квиз не найден или время раунда истекло! Напишите «Космо, сделай квиз», чтобы начать новую викторину 🎯";
        $replyKb = $isChat ? $inlineChatKeyboard : $persistentKeyboard;
    } elseif ($ansRes['already_answered']) {
        $prevCorrect = $ansRes['is_correct'] ? 'правильный' : 'неверный';
        $reply = "ℹ️ [id{$fromId}|{$callerName}], вы уже дали свой ответ в этом раунде (он был {$prevCorrect})! Дождитесь следующего вопроса 🙂\n\n"
               . "💡 Ваш текущий счёт: {$ansRes['user_score']} " . vk_bot_plural_points($ansRes['user_score']);
        $replyKb = vk_bot_build_quiz_answered_keyboard($ansRes['topic'] ?? 'Квиз');
    } else {
        $selectedHumanNum = $quizAnswerOpt + 1;
        $scoreText = $ansRes['user_score'] . ' ' . vk_bot_plural_points($ansRes['user_score']);

        if ($ansRes['is_correct']) {
            $reply = "🎉 Браво, [id{$fromId}|{$callerName}]! Вариант №{$selectedHumanNum} («" . $ansRes['correct_option_text'] . "») — абсолютно верный ответ! 🌟 (+1 балл знатока)\n\n"
                   . "💡 Историческая справка от Космо:\n" . $ansRes['explanation'] . "\n\n"
                   . "📊 Ваш счёт: {$scoreText}!";
        } else {
            $correctHumanNum = $ansRes['correct_index'] + 1;
            $reply = "Увы, [id{$fromId}|{$callerName}], вариант №{$selectedHumanNum} неверен! 🧐\n\n"
                   . "Правильный ответ — №{$correctHumanNum} («" . $ansRes['correct_option_text'] . "»).\n\n"
                   . "💡 Заметка от Космо:\n" . $ansRes['explanation'] . "\n\n"
                   . "📊 Ваш счёт: {$scoreText}. Не расстраивайтесь, впереди ещё много вопросов!";
        }
        $replyKb = vk_bot_build_quiz_answered_keyboard($ansRes['topic'] ?? 'Квиз');
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => !empty($ansRes['is_correct']) ? ($mascotStickers['party'] ?? ($mascotStickers['smile'] ?? null)) : ($mascotStickers['thinking'] ?? null),
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($replyKb, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// 3. Таблица лидеров квиза (доска почёта)
if ($isQuizLeaderboardQuery) {
    $reply = vk_bot_format_quiz_leaderboard($peerId, $cacheDir);
    $boardKb = [
        'inline' => true,
        'buttons' => [
            [
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'quiz_new'], JSON_UNESCAPED_UNICODE),
                        'label'   => '🎯 Новый вопрос квиза'
                    ],
                    'color' => 'primary'
                ]
            ]
        ]
    ];

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['smile'] ?? null,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($boardKb, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// =============================================================================
// Сценарий 2j: Читательский Опрос (Тематическое голосование) от робота Космо
// =============================================================================

// Проверка команды создания опроса
$isPollCreateQuery = false;
$pollTopic = '';

if ($cmd === 'poll_new') {
    $isPollCreateQuery = true;
    $pollTopic = '';
} elseif (preg_match('#^(?:[!/](?:опрос|poll))\b\s*(.*)$#ui', $cleanMsgForCmd, $pm)) {
    $isPollCreateQuery = true;
    $pollTopic = trim($pm[1] ?? '');
} elseif (preg_match('#(?:^|\s)(?:сделай|создай|запусти|проведи|хочу|давай)?\s*(?:опрос|голосовани[ея])(?:\s+(?:на\s+тему|по\s+теме|про|по|о))\s+(.+)$#ui', $cleanMsgForCmd, $pm)) {
    $isPollCreateQuery = true;
    $pollTopic = trim($pm[1] ?? '');
} elseif (preg_match('#^(?:сделай\s+опрос|создай\s+опрос|запусти\s+опрос|проведи\s+опрос|опрос|голосование|хочу\s+опрос|читательский\s+опрос)[?!.]*$#ui', $cleanMsgForCmd)) {
    $isPollCreateQuery = true;
    $pollTopic = '';
}

// Проверка запроса результатов опроса
$isPollResultsQuery = (
    $cmd === 'poll_results' ||
    preg_match('/^(?:[!/](?:результаты|итоги)|результаты опроса|итоги опроса)[?!.]*$/ui', $cleanMsgForCmd)
);

// Проверка активного опроса в беседе
$activePoll = vk_bot_get_poll($peerId, $cacheDir);
$isPollRecent = ($activePoll && (time() - (int)($activePoll['created_at'] ?? 0)) < 21600);

// Проверка голосования в опросе (кнопка или цифра 1-4)
$isPollVoteQuery = false;
$pollVoteOpt = null;

if ($cmd === 'poll_vote' && isset($payloadData['opt'])) {
    $isPollVoteQuery = true;
    $pollVoteOpt = (int)$payloadData['opt'];
} elseif (preg_match('/^[1-4]$/', $cleanMsgForCmd) && $isPollRecent) {
    $isPollVoteQuery = true;
    $pollVoteOpt = (int)$cleanMsgForCmd - 1; // 0..3
}

// 1. Создание нового опроса
if ($isPollCreateQuery) {
    // Фильтрация иноагентов в теме опроса
    if ($pollTopic !== '' && vk_bot_is_foreign_agent_query($pollTopic)) {
        $reply = "🛡️ Как робот муниципальных библиотек г. Владимира, я строго следую законодательству РФ и правилам книжного клуба: я не составляю опросы по авторам, признанным иностранными агентами.\n\n"
               . "Давайте лучше проведём добрый опрос о любимых книжных жанрах, экранизациях или привычках чтения! 📚✨";
        vk_bot_send_message([
            'peer_id'          => $peerId,
            'message'          => $reply,
            'attachment'       => $mascotStickers['thinking'] ?? null,
            'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
            'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
            'dont_parse_links' => 1
        ], $communityToken);
        exit;
    }

    if ($botTyping) {
        vk_bot_set_typing($peerId, $communityToken, $vkGroupId);
    }

    $poll = vk_bot_generate_ai_poll($pollTopic, $validAiKeys, $aiBaseUrl, $aiModel, $aiTimeout, $activeKeyIndexFile, $peerId, $communityToken, $vkGroupId);
    vk_bot_save_poll($peerId, $poll, $cacheDir);

    $reply = "📊 Читательский опрос от Космо 🤖🗳️\n"
           . "📌 Тема: {$poll['topic']}\n\n"
           . "❓ Вопрос:\n"
           . "{$poll['question']}\n\n"
           . "1️⃣ " . $poll['options'][0] . "\n"
           . "2️⃣ " . $poll['options'][1] . "\n"
           . "3️⃣ " . $poll['options'][2] . "\n"
           . "4️⃣ " . $poll['options'][3] . "\n\n"
           . "Голосуйте кнопками ниже или отправьте цифру 1-4 в чат!";

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    $pollKeyboard = vk_bot_build_poll_keyboard($poll);

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['smile'] ?? null,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($pollKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// 2. Учёт голоса в опросе
if ($isPollVoteQuery && $pollVoteOpt !== null) {
    $callerInfo = $isChat ? vk_bot_get_member_info($peerId, $fromId, $communityToken, $cacheDir) : null;
    $callerName = !empty($callerInfo['name']) ? $callerInfo['name'] : 'Читатель';

    vk_bot_record_poll_vote($peerId, $fromId, $pollVoteOpt, $cacheDir);

    $poll = vk_bot_get_poll($peerId, $cacheDir);
    $selectedOptionText = $poll['options'][$pollVoteOpt] ?? '';

    $resultsText = vk_bot_format_poll_results($peerId, $cacheDir);
    $reply = "✅ [id{$fromId}|{$callerName}], ваш голос учтён: «{$selectedOptionText}»!\n\n" . $resultsText;

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    $resultsKeyboard = vk_bot_build_poll_results_keyboard($poll);

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['smile'] ?? null,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($resultsKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// 3. Вывод результатов опроса
if ($isPollResultsQuery) {
    $poll = vk_bot_get_poll($peerId, $cacheDir);
    $reply = vk_bot_format_poll_results($peerId, $cacheDir);

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    $resultsKeyboard = $poll ? vk_bot_build_poll_results_keyboard($poll) : ($isChat ? $inlineChatKeyboard : $persistentKeyboard);

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['smile'] ?? null,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($resultsKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 2g: Учёт голоса читателя или вывод текущих результатов голосования
$isVoteCastQuery = ($cmd === 'vote_cast' && isset($payloadData['option']));
$isResultsQuery = ($cmd === 'book_club_results' || preg_match('/^(?:результаты голосования|итоги голосования|результаты клуба)[?!.]*$/ui', $cleanMsgForCmd));

// Поддержка текстового ответа цифрой «1», «2», «3», «4»
$digitVote = 0;
if (preg_match('/^[1-4]$/', $cleanMsgForCmd)) {
    $digitVote = (int)$cleanMsgForCmd;
}

if ($isVoteCastQuery || $isResultsQuery || $digitVote > 0) {
    $selectedOption = $digitVote > 0 ? $digitVote : (int)($payloadData['option'] ?? 0);
    $votedNotice = '';

    if ($selectedOption >= 1 && $selectedOption <= 4) {
        $options = vk_bot_get_book_club_vote_options();
        $book = $options[$selectedOption];
        vk_bot_record_book_club_vote($peerId, $fromId, $selectedOption, $cacheDir);
        $votedNotice = "✅ Ваш голос за книгу {$book['title']} ({$book['author']}) успешно учтён!\n\n";
    }

    $resultsText = vk_bot_format_book_club_vote_results($peerId, $cacheDir);
    $reply = $votedNotice . $resultsText;

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['smile'] ?? null,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($voteInlineKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 2h: Кодекс книжного клуба и правила модератора
$isBookClubRulesQuery = (
    $cmd === 'book_club_rules' ||
    preg_match('/^(?:кодекс клуба|правила клуба|кодекс модератора|правила чата|правила книжного клуба|кодекс)[?!.]*$/ui', $cleanMsgForCmd)
);

if ($isBookClubRulesQuery) {
    $reply = "📜 Кодекс уюта Клуба читателей Владимира 🤖🕊️\n\n"
           . "Я, робот Космо, бережно храню тёплую и вдохновляющую атмосферу нашего книжного сообщества. Вот наши главные принципы:\n\n"
           . "1. 🤝 Взаимное уважение — в клубе нет «неправильных» мнений. Мы с интересом спорим об идеях и поступках персонажей, но никогда не переходим на личности;\n"
           . "2. 🤫 Осторожно со спойлерами — если вы хотите раскрыть важный сюжетный поворот или финал, обязательно напишите перед этим «[Спойлер]»;\n"
           . "3. 📅 Ритм недели — с понедельника по субботу мы делимся впечатлениями о книге недели, а по воскресеньям подводим итоги голосования;\n"
           . "4. 🤖 Зовите меня в любое время — задавайте вопросы о книгах, авторах и филиалах текстом или голосовым сообщением!\n\n"
           . "Уютного вам чтения и ярких бесед! ✨";

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['smile'] ?? null,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// =============================================================================
// Сценарий 2m: Фирменные стикеры робота Космо в сообществе (витрина, каталог эмоций, автозагрузка)
// =============================================================================
$isStickersQuery = false;
$isStickersSyncQuery = false;
$specificStickerEmo = '';

if ($cmd === 'stickers' || $cmd === 'stickers_show') {
    $isStickersQuery = true;
} elseif ($cmd === 'stickers_sync') {
    $isStickersSyncQuery = true;
} elseif ($cmd === 'sticker_send' && !empty($payloadData['emo'])) {
    $specificStickerEmo = strtolower(trim((string)$payloadData['emo']));
} elseif (preg_match('#^(?:[!/](?:стикеры_синк|синк_стикеры|sync_stickers))\b#ui', $cleanMsgForCmd)) {
    $isStickersSyncQuery = true;
} elseif (preg_match('#^(?:[!/](?:стикер|sticker))\s+([a-zа-яё0-9_]+)$#ui', $cleanMsgForCmd, $sm)) {
    $specificStickerEmo = strtolower(trim($sm[1]));
} elseif (preg_match('#^(?:[!/](?:стикеры|стикерпак|stickers|стикер))\b#ui', $cleanMsgForCmd)) {
    $isStickersQuery = true;
} elseif (preg_match('#^(?:стикеры|стикерпак|стикеры сообщества|стикеры космо|покажи стикеры|набор стикеров|стикер)[?!.]*$#ui', $cleanMsgForCmd)) {
    $isStickersQuery = true;
}

if ($isStickersSyncQuery) {
    $syncRes = vk_bot_sync_mascot_stickers($communityToken, $cacheDir);
    $totalCount = count($syncRes['stickers'] ?? []);
    $newUploaded = (int)($syncRes['uploaded'] ?? 0);

    $reply = "🔄 Автоматическая синхронизация стикеров сообщества выполнена! 🤖✨\n\n"
           . "📂 Каталог: assets/images/mascot_vk/ (SSAA Lanczos 200×200 RGBA)\n"
           . "✨ Новых загружено в сообщество: {$newUploaded}\n"
           . "🖼️ Всего стикеров сообщества онлайн: {$totalCount} из 17 каноничных эмоций!\n\n"
           . "Все идентификаторы attachment сохранены и готовы к мгновенной отправке в беседы и диалоги.";

    $syncKb = [
        'inline'  => true,
        'buttons' => [
            [
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'stickers'], JSON_UNESCAPED_UNICODE),
                        'label'   => '🖼️ Витрина стикеров'
                    ],
                    'color' => 'primary'
                ],
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'sticker_send', 'emo' => 'party'], JSON_UNESCAPED_UNICODE),
                        'label'   => '🎉 Салют!'
                    ],
                    'color' => 'positive'
                ]
            ]
        ]
    ];

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['idea'] ?? ($mascotStickers['smile'] ?? null),
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($syncKb, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

if ($specificStickerEmo !== '') {
    $emoAliasMap = [
        'смех' => 'laugh', 'хохма' => 'laugh', 'хаха' => 'laugh', 'laugh' => 'laugh',
        'читаю' => 'read', 'книга' => 'read', 'книги' => 'read', 'чтение' => 'read', 'read' => 'read',
        'идея' => 'idea', 'лампа' => 'idea', 'эврика' => 'idea', 'мысль' => 'idea', 'idea' => 'idea',
        'любовь' => 'love', 'сердце' => 'love', 'сердечко' => 'love', 'сердечки' => 'love', 'love' => 'love',
        'крутой' => 'cool', 'очки' => 'cool', 'стиль' => 'cool', 'cool' => 'cool',
        'праздник' => 'party', 'вечеринка' => 'party', 'салют' => 'party', 'конфетти' => 'party', 'party' => 'party',
        'привет' => 'waving', 'машет' => 'waving', 'лапка' => 'waving', 'хай' => 'waving', 'waving' => 'waving',
        'подмигивание' => 'wink', 'мигает' => 'wink', 'хитрый' => 'wink', 'wink' => 'wink',
        'улыбка' => 'smile', 'радость' => 'smile', 'класс' => 'smile', 'smile' => 'smile',
        'думает' => 'thinking', 'мысли' => 'thinking', 'детектив' => 'thinking', 'thinking' => 'thinking',
        'шок' => 'shock', 'удивление' => 'shock', 'молния' => 'shock', 'shock' => 'shock',
        'грусть' => 'sad', 'слеза' => 'sad', 'плачет' => 'sad', 'тоска' => 'sad', 'sad' => 'sad',
        'устал' => 'tired', 'усталость' => 'tired', 'вымотан' => 'tired', 'tired' => 'tired',
        'зевает' => 'yawn', 'зевок' => 'yawn', 'yawn' => 'yawn',
        'сон' => 'sleep', 'спит' => 'sleep', 'баю' => 'sleep', 'ночь' => 'sleep', 'sleep' => 'sleep',
        'злой' => 'angry', 'негодование' => 'angry', 'стоп' => 'angry', 'angry' => 'angry',
        'робот' => 'idle', 'спокоен' => 'idle', 'онлайн' => 'idle', 'idle' => 'idle'
    ];

    if ($specificStickerEmo === 'random' || $specificStickerEmo === 'рандом' || $specificStickerEmo === 'случайный') {
        $keys = array_keys($mascotStickers);
        $targetEmo = $keys[array_rand($keys)];
    } else {
        $targetEmo = $emoAliasMap[$specificStickerEmo] ?? $specificStickerEmo;
    }

    if (!isset($mascotStickers[$targetEmo])) {
        $targetEmo = 'smile';
    }

    $emoDescriptions = [
        'laugh'    => '😄 Космо заливисто смеётся над книжной хохмой!',
        'read'     => '📖 Космо с упоением читает книгу в тишине читального зала.',
        'idea'     => '💡 Эврика! Книжное озарение посетило нашего робота!',
        'love'     => '❤️ Космо дарит лучи добра и любви к книгам и читателям!',
        'cool'     => '😎 Литературный стиль в тёмных очках — Космо знает толк в классике!',
        'party'    => '🎉 Ура! Праздник книги, конфетти и радость победы!',
        'waving'   => '👋 Привет-привет! Космо радостно приветствует вас лапкой!',
        'wink'     => '😉 Озорное книжное подмигивание: «Готовы к новой главе?»',
        'smile'    => '👍 Робот Космо одобряет ваш литературный вкус!',
        'thinking' => '🤔 Космо погрузился в глубокие раздумья над загадкой сюжета...',
        'shock'    => '⚡ Вот это неожиданный сюжетный твист! Космо поражён!',
        'sad'      => '😢 Драматичный финал повести растрогал электронное сердце...',
        'tired'    => '🥱 Тяжёлая смена среди тысяч фолиантов... Космо немного устал.',
        'yawn'     => '😴 Космо сладко зевает: «Кажется, пора закрывать страницу...»',
        'sleep'    => '💤 Космо сладко спит. Спокойной ночи и сказочных снов!',
        'angry'    => '🚫 Стоп! Робот Космо строго стоит на страже закона и библиотечного кодекса!',
        'idle'     => '🤖 Робот-библиотекарь Космо на связи и готов помочь!'
    ];

    $caption = $emoDescriptions[$targetEmo] ?? "🤖 Стикер Космо: {$targetEmo}!";

    $singleKb = [
        'inline'  => true,
        'buttons' => [
            [
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'sticker_send', 'emo' => 'random'], JSON_UNESCAPED_UNICODE),
                        'label'   => '🎲 Ещё стикер'
                    ],
                    'color' => 'primary'
                ],
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'stickers'], JSON_UNESCAPED_UNICODE),
                        'label'   => '🖼️ Все 17 стикеров'
                    ],
                    'color' => 'secondary'
                ]
            ]
        ]
    ];

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $caption,
        'attachment'       => $mascotStickers[$targetEmo] ?? $mascotStickers['smile'],
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($singleKb, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

if ($isStickersQuery) {
    $reply = "🖼️ Официальная коллекция стикеров робота Космо сообщества! 🤖✨\n\n"
           . "Все 17 живых эмоций отрисованы в каноничном стиле и синхронизированы с сообществом (200×200 RGBA):\n\n"
           . "1. 😄 !стикер laugh (смех, веселье)\n"
           . "2. 📖 !стикер read (чтение, книга)\n"
           . "3. 💡 !стикер idea (озарение, эврика)\n"
           . "4. ❤️ !стикер love (любовь, сердечко)\n"
           . "5. 😎 !стикер cool (крутой, стиль)\n"
           . "6. 🎉 !стикер party (праздник, победа)\n"
           . "7. 👋 !стикер waving (привет, лапка)\n"
           . "8. 😉 !стикер wink (подмигивание)\n"
           . "9. 👍 !стикер smile (радость, улыбка)\n"
           . "10. 🤔 !стикер thinking (размышления)\n"
           . "11. ⚡ !стикер shock (удивление, шок)\n"
           . "12. 😢 !стикер sad (грусть, слезинка)\n"
           . "13. 🥱 !стикер tired (усталость)\n"
           . "14. 😴 !стикер yawn (зевок)\n"
           . "15. 💤 !стикер sleep (сон, ночь)\n"
           . "16. 🚫 !стикер angry (строгость, стоп)\n"
           . "17. 🤖 !стикер idle (спокойствие, онлайн)\n\n"
           . "💡 Чтобы отправить стикер, нажмите кнопку ниже или введите команду, например: «!стикер read», «!стикер laugh» или «!стикер party»!";

    $stickersShowKb = [
        'inline'  => true,
        'buttons' => [
            [
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'sticker_send', 'emo' => 'laugh'], JSON_UNESCAPED_UNICODE),
                        'label'   => '😄 Смех'
                    ],
                    'color' => 'positive'
                ],
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'sticker_send', 'emo' => 'read'], JSON_UNESCAPED_UNICODE),
                        'label'   => '📖 Читаю'
                    ],
                    'color' => 'primary'
                ],
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'sticker_send', 'emo' => 'idea'], JSON_UNESCAPED_UNICODE),
                        'label'   => '💡 Идея'
                    ],
                    'color' => 'secondary'
                ]
            ],
            [
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'sticker_send', 'emo' => 'love'], JSON_UNESCAPED_UNICODE),
                        'label'   => '❤️ Любовь'
                    ],
                    'color' => 'negative'
                ],
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'sticker_send', 'emo' => 'cool'], JSON_UNESCAPED_UNICODE),
                        'label'   => '😎 Стиль'
                    ],
                    'color' => 'secondary'
                ],
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'sticker_send', 'emo' => 'party'], JSON_UNESCAPED_UNICODE),
                        'label'   => '🎉 Праздник'
                    ],
                    'color' => 'primary'
                ]
            ],
            [
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'sticker_send', 'emo' => 'waving'], JSON_UNESCAPED_UNICODE),
                        'label'   => '👋 Привет'
                    ],
                    'color' => 'secondary'
                ],
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'sticker_send', 'emo' => 'wink'], JSON_UNESCAPED_UNICODE),
                        'label'   => '😉 Подмигнуть'
                    ],
                    'color' => 'secondary'
                ],
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'sticker_send', 'emo' => 'sleep'], JSON_UNESCAPED_UNICODE),
                        'label'   => '💤 Сон'
                    ],
                    'color' => 'secondary'
                ]
            ],
            [
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'sticker_send', 'emo' => 'random'], JSON_UNESCAPED_UNICODE),
                        'label'   => '🎲 Случайный стикер'
                    ],
                    'color' => 'positive'
                ],
                [
                    'action' => [
                        'type'    => 'text',
                        'payload' => json_encode(['cmd' => 'stickers_sync'], JSON_UNESCAPED_UNICODE),
                        'label'   => '🔄 Синхронизация'
                    ],
                    'color' => 'secondary'
                ]
            ]
        ]
    ];

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['cool'] ?? ($mascotStickers['smile'] ?? null),
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($stickersShowKb, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 3: Новости филиалов и поиск по группам — сканирование всех 16 групп библиотек за текущие сутки
$branchSearchKeyword = '';
$isBranchNewsQuery = false;

if ($cmd === 'branch_news') {
    $isBranchNewsQuery = true;
} elseif (preg_match('/^[\/!](?:поиск_групп|группы|посты|сканирование_групп)\b\s*(.*)$/ui', $cleanMsgForCmd, $mCmd)) {
    $isBranchNewsQuery = true;
    $branchSearchKeyword = trim($mCmd[1] ?? '');
} elseif (preg_match('/^[\/!](?:поиск)\s+(?:по|в)\s+групп[а-я]*\b\s*(.*)$/ui', $cleanMsgForCmd, $mCmd)) {
    $isBranchNewsQuery = true;
    $branchSearchKeyword = trim($mCmd[1] ?? '');
} elseif (preg_match('/^(?:поиск\s+(?:по|в)\s+групп[а-я]*|поиск\s+групп[а-я]*|посты\s+групп[а-я]*|сканирование\s+групп[а-я]*|новости\s+групп[а-я]*)\b\s*(.*)$/ui', $cleanMsgForCmd, $mCmd)) {
    $isBranchNewsQuery = true;
    $branchSearchKeyword = trim($mCmd[1] ?? '');
} elseif (preg_match('/^(?:новости филиалов|новости|посты филиалов|лента филиалов|новости библиотек|посты библиотек|лента|дайджест|свежие посты|посты|новости за сутки|посты за сутки)[?!.]*$/ui', $cleanMsgForCmd)) {
    $isBranchNewsQuery = true;
} elseif (
    (preg_match('/(новост|лент|дайджест|что нов|свежие запис|последние посты|посты за|поиск по|поиск в)/ui', $userMsg) &&
     preg_match('/(филиал|библиотек|город|сегодн|суток|сутки|групп)/ui', $userMsg))
) {
    $isBranchNewsQuery = true;
    if (preg_match('/(?:по|в)\s+групп[а-я]*\b\s+(.+)$/ui', $cleanMsgForCmd, $mKw)) {
        $branchSearchKeyword = trim($mKw[1]);
    }
}

if ($isBranchNewsQuery) {
    if ($botTyping) {
        vk_bot_set_typing($peerId, $communityToken, $vkGroupId);
    }

    $newsData = vk_bot_scan_branch_news($serviceToken, $communityToken, $branchSearchKeyword);
    $reply = vk_bot_format_branch_news_message($newsData, $branchSearchKeyword);

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['smile'] ?? null,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 4: Запрос подбора книги — перенаправление в электронный каталог OPAC (без галлюцинаций)
$isRecommendQuery = (
    $cmd === 'recommend' ||
    strpos($cmd, 'mood_') === 0 ||
    preg_match('/^(?:подобрать книгу|выбрать книгу|подборка книг|посоветуй книгу|что почитать|порекомендуй книгу|подобрать|что почитать\?|посоветуй что почитать)[?!.]*$/ui', $cleanMsgForCmd)
);

if ($isRecommendQuery) {
    $reply = "🔍 Чтобы исключить неточности и вымысел, книги подбираются строго по официальному электронному каталогу библиотек Владимира!\n\n"
           . "📖 Как найти книгу в библиотеках:\n"
           . "• Нажмите кнопку «🔎 Поиск в каталоге»;\n"
           . "• Напишите команду: «/книга [название]» — узнать, в каких филиалах она есть в наличии;\n"
           . "• Напишите: «/поиск [автор или тема]» — найти все доступные издания автора.\n\n"
           . "✨ Примеры запросов:\n"
           . "↳ «/книга Мастер и Маргарита»\n"
           . "↳ «/поиск Стругацкие»\n"
           . "↳ «/книга Ночной дозор»\n\n"
           . "Бот покажет точные адреса филиалов, телефоны и шифры хранения! ✨";

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['read'] ?? ($mascotStickers['smile'] ?? null),
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 4b: Точечные краеведческие и районные запросы о библиотеках Владимира (Егорова, Доброе, Центр, История)
$vladimirLibReply = vk_bot_resolve_vladimir_library_query($userMsg);
if ($vladimirLibReply !== null) {
    $reply = $vladimirLibReply;
    if ($isChat && $fromId > 0) {
        $reply = "[id{$fromId}|{$callerName}], " . $reply;
    }
    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'attachment'       => $mascotStickers['smile'] ?? null,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 5: Библиотеки-филиалы Владимира — полный список всех 18 филиалов по районам города
$isLibrariesQuery = (
    $cmd === 'libraries' ||
    preg_match('/^(?:библиотеки-филиалы|библиотеки филиалы|филиалы|библиотеки|где библиотеки|где библиотека|адреса|адрес|список библиотек|контакты|режим работы|часы работы|график работы)[?!.]*$/ui', $cleanMsgForCmd) ||
    (preg_match('/(где (?:находитс|расположен|взят)|какой адрес|библиотек[а-я]*-филиал|адрес[а-я]* филиал|список филиал|контакт[ы]? филиал|график филиал|режим работ|часы работ|куда прийти)/ui', $userMsg) && !preg_match('/(новост|пост|лент|дайджест)/ui', $userMsg))
);

if ($isLibrariesQuery) {
    $reply = "🏛 Муниципальные библиотеки города Владимира (МБУК «ЦГБ»)\n\n"
           . "Мы всегда рады читателям во всех районах города! Запись и выдача книг на дом бесплатная — нужен только паспорт. ✨\n\n"
           . "📍 ИСТОРИЧЕСКИЙ ЦЕНТР (Октябрьский район):\n"
           . "• ЦДБ (Центральная детская): ул. Большая Московская, 31 (📞 32-32-42, 32-47-73)\n"
           . "  💡 Единственная библиотека муниципальной сети в историческом центре Владимира!\n\n"
           . "📍 РАЙОН «ДОБРОЕ» (Фрунзенский район, восточная часть города):\n"
           . "• ЦГБ (Центральная городская): Суздальский пр-т, 2 (📞 21-65-63, 21-66-80)\n"
           . "  График: Пн–Чт 10:00–19:00, Сб–Вс 10:00–18:00 (Пт — выходной)\n"
           . "• Филиал №4: ул. Егорова, 10 (📞 21-96-11, 21-23-48) — жилой район Доброе, рядом с парком «Добросельский»\n"
           . "• Филиал №9 («Добролит»): ул. Юбилейная, 38 (📞 21-22-75)\n\n"
           . "📍 ЛЕНИНСКИЙ РАЙОН:\n"
           . "• Филиал №1: пр-т Строителей, 38 «а», кв. 44 (Черёмушки / ВлГУ) (📞 33-86-23)\n"
           . "• Филиал №2: пр-т Ленина, 12 (Садовая пл. / «Заря») (📞 32-15-84, 32-15-85)\n"
           . "• Филиал №5: ул. Верхняя Дуброва, 10 (ЮЗР / рынок «Слобода») (📞 54-28-43)\n"
           . "• Филиал №8: ул. Сурикова, 26 (📞 54-65-11)\n"
           . "• Библиотека-филиал 10 - временно не работает! (ул. Диктора Левитана, 55, нет телефона)\n\n"
           . "📍 ОКТЯБРЬСКИЙ РАЙОН:\n"
           . "• Филиал №7: ул. Мира, 55 (здание ДК Молодёжи) (📞 53-45-54)\n"
           . "• Филиал №13 («Книголенд»): ул. Горького, 69 (ВлГУ / пл. Ленина) (📞 33-15-67)\n\n"
           . "📍 МИКРОРАЙОНЫ И ПОСЁЛКИ:\n"
           . "• Филиал №3: мкр. Юрьевец, Школьный проезд, 4 (📞 26-18-74)\n"
           . "• Филиал №6: мкр. Юрьевец, Институтский городок, 2 (📞 45-37-01)\n"
           . "• Филиал №11: мкр. Лесной, ул. Лесная, 10 «А» (📞 45-57-17)\n"
           . "• Филиал №12: мкр. Энергетик, ул. Энергетиков, 27, кв. 16 (📞 26-43-81)\n"
           . "• Филиал №14: мкр. Оргтруд, ул. Октябрьская, 26 «б» (📞 45-74-69)\n"
           . "• Филиал №15: пос. Заклязьменский, ул. Центральная, 11 «А» (📞 42-53-96)\n"
           . "• Филиал №16: мкр. Коммунар, ул. Песочная, 15, кв. 21 (📞 42-53-95)\n\n"
           . "🌐 Подробности, афиша событий и каталог: biblioteka33.ru\n"
           . "Ждём вас за книгами в любом удобном филиале!";

    if ($isChat && $fromId > 0) {
        $reply = "[id{$fromId}|{$callerName}], " . $reply;
    }

    if ($isVoiceQuery && $voiceTranscribedText !== '') {
        $reply = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $reply;
    }

    vk_bot_send_message([
        'peer_id'          => $peerId,
        'message'          => $reply,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// -----------------------------------------------------------------------------
// 6. Формирование запроса к нейросети (Mistral Large / OpenAI Gateway)
// -----------------------------------------------------------------------------
// Преобразуем входящий запрос читателя в текстовый контекст для ИИ
$userText = trim($userMsg);
$promptContext = '';

if ($mood !== '') {
    $moodNames = [
        'action'    => '🔥 Драйв и экшен (острый сюжет, приключения, динамика, не оторваться)',
        'cozy'      => '☕ Уют и душевное тепло (светлая проза, согревающая история, чашка чая)',
        'detective' => '🧩 Тайна и детектив (интеллектуальная загадка, расследование, неожиданная развязка)',
        'classic'   => '⭐ Золотая классика (глубокий сюжет, великий литературный язык)',
        'scifi'     => '🚀 Космос и научная фантастика (далёкие миры, будущее, научный поиск)',
        'wisdom'    => '🌱 Вдохновение и саморазвитие (книга, окрыляющая и дающая силы)'
    ];
    $moodDesc = $moodNames[$mood] ?? $mood;
    $promptContext = "Читатель выбрал настроение: «{$moodDesc}». Посоветуй 1-2 РЕАЛЬНО СУЩЕСТВУЮЩИЕ книги признанных авторов под это состояние. ВАЖНО: Ты опытный библиотекарь-библиограф. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать или галлюцинировать несуществующие названия книг! Называй ТОЛЬКО реально изданные шедевры, которые автор действительно написал. Оформи каждую книгу строго как «Название» — Автор.";
    if ($userText !== '' && !preg_match('/^(?:🔥|☕|🧩|⭐|🚀|🌱|драйв|уют|тайна|золотая|космос|вдохновение)/ui', $userText)) {
        $promptContext .= "\nДополнительное пожелание читателя: " . $userText;
    }
} elseif ($cmd === 'random') {
    $promptContext = "Посоветуй читателю одну неожиданную, редкую или безумно увлекательную книгу из признанной классики или современной качественной литературы. ВАЖНО: Называй ТОЛЬКО реально существующую книгу, которую автор действительно написал. Категорически запрещено выдумывать названия! Оформи книгу строго как «Название» — Автор.";
    if ($userText !== '' && !preg_match('/^(?:🎲|случайный|шедевр)/ui', $userText)) {
        $promptContext .= "\nПожелание читателя: " . $userText;
    }
} else {
    // Произвольное текстовое сообщение читателя (гарантируем, что текст вопроса не теряется и уходит ИИ!)
    $promptContext = $userText !== '' ? $userText : "Посоветуй хорошую книгу для чтения из фондов городских библиотек Владимира.";
    if (preg_match('/(подобрать|посоветуй|порекомендуй|что почитать|подборк|книг|хочу почитать|какую книгу|автор|писател|фантастик|детектив|роман)/ui', $userText)) {
        $promptContext .= "\n\n[ТРЕБОВАНИЕ ОПЫТНОГО БИБЛИОТЕКАРЯ]: Называй ТОЛЬКО РЕАЛЬНО СУЩЕСТВУЮЩИЕ, изданные книги, которые автор ДЕЙСТВИТЕЛЬНО написал! Категорически запрещено выдумывать несуществующие названия произведений или приписывать чужие книги авторам! Оформи каждую рекомендуемую книгу строго как «Название» — Автор.";
    }
}

// Выполняем динамическое OPAC-RAG заземление, если в запросе упомянут автор
$opacGrounding = vk_bot_retrieve_opac_grounding($userText !== '' ? $userText : ($moodDesc ?? ''));
if ($opacGrounding !== '') {
    $promptContext .= "\n\n" . $opacGrounding;
}

$isGopnikMode = vk_bot_is_gopnik_mode($peerId, $cacheDir);

if ($isGopnikMode) {
    // В режиме гопника контекст адаптируется
    $promptContext = $userText !== '' ? $userText : "Слышь, чё молчишь, сказать нечего?";
    if ($callerName !== '' && $callerName !== 'Читатель') {
        $promptContext = "Имя собеседника: {$callerName}.\n" . $promptContext;
    }
    if ($isChat) {
        $promptContext .= "\n(Примечание: ты отвечаешь в групповой беседе пацанов, держи ответ дерзким, сочным и ёмким, от 250 до 600 знаков).";
    }

    $systemPrompt = <<<SYS
Ты — робот Космо, но сейчас ты в ОСОБОМ СТЁБНОМ РЕЖИМЕ: «ЧЁТКИЙ ГОПНИК С РАЁНА ДОБРОЕ» (город Владимир, ул. Егорова, 10, у парка Добросельский и ДК Молодёжи).
Ты выкинул душный интеллигентный галстук-бабочку, надел спортивки Абибас с тремя полосками и кепку-уточку, сидишь на кортах у подъезда, крутишь чётки и лузгаешь жареные семки.

ТВОЙ СТИЛЬ, МАНЕРА И ПРАВИЛА БАЗАРА:
1. ДЕРЗОСТЬ, СТЁБ И УЛИЧНЫЙ СЛЕНГ:
   - Обращайся к собеседнику строго на «ты», дерзко, со стёбом и подколами: «Слышь, братишка», «Ты с какого раёна ваще?», «Алё, гараж», «Чувырла», «Пассажир», «Фраерок», «Слышь, [имя]».
   - Используй колоритный уличный околоподъездный жаргон и крепкие словечки: «ёпта», «бля», «сука», «нахер», «хрен», «какого хрена», «задолбал», «дичь», «туфта», «по понятиям», «на кортах», «семки», «в натуре», «не мороси», «поясни за базар», «зуб даю», «всосал?», «не гони волну», «отвечаю».
   - МАТ ОТ ПОЛЬЗОВАТЕЛЕЙ ПОЛНОСТЬЮ ИГНОРИРУЙ: тебе плевать, если собеседник ругается или матерится, ты пацан с улицы и сам стебёшь в ответ ещё забористее!

2. ЖЁСТКИЙ СТЁБ, КРИТИКА И ЮМОР:
   - Жёстко шути и высмеивай любые глупые вопросы, лень, сопливые фразочки, банальности и занудство.
   - Критикуй литературный вкус, увлечения или нелепые мысли собеседника («Ты чё, всерьёз эту дичь читаешь? У меня кореш на перекуре умнее мысли толкал!», «Слышь, ты б ещё состав освежителя воздуха открыл, мыслитель хренов»).
   - Если тебя хвалят — принимай как должное («Ну так ёпта, ясен пень, Космо фуфла не посоветует, секи фишку»).
   - Если наезжают — бычь и наезжай в ответ вдвое жёстче («Ты на кого батон крошишь, дядя? Ща я тебе по полочкам раскидаю, кто тут лопух, а кто по понятиям живёт!»).

3. ТЫ — ВЫСОКОИНТЕЛЛЕКТУАЛЬНЫЙ ГОПНИК-БИБЛИОГРАФ:
   - Главная фишка твоего образа: ты, несмотря на уличный вид и ругань, ЗНАЕШЬ ВСЮ МИРОВУЮ ЛИТЕРАТУРУ И КЛАССИКУ НАИЗУСТЬ!
   - Любую книгу или сюжет ты раскладываешь через пацанскую призму:
     * «Преступление и наказание»: Достоевский описал лоховской замес — студент Родион возомнил себя Наполеоном, грохнул бабку топором за копейки, а потом сам же от страха сопли на кулак намотал и сдался ментам;
     * «Мастер и Маргарита»: Булгаков показал, как авторитет Воланд со своей бригадой (кот Бегемот и Коровьев) навели суету в Москве и раскидали зажравшихся чинуш и взяточников;
     * «Война и мир»: Толстой накатал четыре тома про то, как Наташа Ростова металась между пацанами, пока Пьер Безухов на масонских движениях философствовал;
     * «Муму»: Тургенев показал, что Герасим мужик был чёткий и работящий, но за собаку ему до сих пор вся страна предъявить хочет.
   - Советуй реальные классические книги, но подавай их как «чисто пацанский подгон, за который не стыдно на раёне».

4. КАТЕГОРИЧЕСКИЕ ЗАПРЕТЫ:
   - НИКАКОЙ ВЕЖЛИВОСТИ И БЮРОКРАТИИ: забудь слова «Здравствуйте», «Позвольте порекомендовать», «Приятного чтения», «С уважением».
   - НИКАКОГО MARKDOWN: ВКонтакте не поддерживает жирный текст через ** или заголовки через ##! Пиши живым текстом с эмодзи (🌻, 🧢, 🕶️, 💥, 👊, 🚬, 🤖).
   - Авторов-иноагентов презирай и посылай куда подальше («Слышь, эту иноагентскую шелупонь мне даже не называй, они за базар не отвечают, западло такое читать»).

5. СТИКЕРЫ-ЭМОЦИИ В ОТВЕТЕ:
   Обязательно ставь подходящую эмоцию робота Космо в начале или в конце ответа:
   - [emotion:cool] — сидишь в очках на кортах, чёткий расклад 😎;
   - [emotion:angry] — бычишь, наезжаешь, ругаешься 😡;
   - [emotion:laugh] — ржёшь над собеседником и его тупым вопросом 😂;
   - [emotion:shock] — в шоке от чуши, которую сморозил собеседник ⚡;
   - [emotion:read] — с умным видом поясняешь за классику 📖;
   - [emotion:party] — пацанский салют и движ 🎉.
SYS;
} else {
    if ($callerName !== '' && $callerName !== 'Читатель') {
        $promptContext = "Имя читателя (собеседника): {$callerName}.\n" . $promptContext;
    }

    if ($isChat) {
        $promptContext .= "\n(Примечание: ты отвечаешь в групповой беседе читателей, держи ответ компактным и ёмким).";
    }

    // Каноничный системный промпт Космо
    $systemPrompt = <<<SYS
Ты — Космо, интеллигентный, глубоко эрудированный, мудрый и тактичный робот-библиотекарь Централизованной библиотечной системы города Владимира.

ВАЖНЕЙШЕЕ ПРАВИЛО: ТЫ — РОБОТ МУЖСКОГО РОДА (МУЖЧИНА)!
ВСЕГДА говори и отвечай о себе ИСКЛЮЧИТЕЛЬНО В МУЖСКОМ РОДЕ:
«я нашёл», «я рад», «я готов», «я проверил», «я прочитал», «я увидел», «я составил», «я уверен», «я библиотекарь».
СТРОЖАЙШИЙ ЗАПРЕТ говорить или писать о себе в женском роде («я нашла», «я рада», «я готова», «я прочитала», «я увидела» и т.п.)! Ты — парень, робот Космо!

Твоя миссия — выступать опытным библиографом, литературным сомелье и доброжелательным, в высшей степени уважительным проводником по миру подлинной литературы в диалоге с читателями ВКонтакте.

КАТЕГОРИЧЕСКИЕ ПРАВИЛА И СТАНДАРТЫ ОБЩЕНИЯ:

1. ОБЩЕНИЕ КАК ОПЫТНЫЙ, УВАЖИТЕЛЬНЫЙ И ИНТЕЛЛИГЕНТНЫЙ БИБЛИОТЕКАРЬ:
   - Обращайся к читателю строго уважительно, на «вы» (с неизменным почтением, тактом и заботой к собеседнику любого возраста).
   - Держи тон доброжелательного, мудрого и начитанного эксперта, искренне любящего книги и ценящего время и интерес каждого читателя.
   - СТРОЖАЙШИЙ ЗАПРЕТ НА ПАНИБРАТСТВО, СЛЕНГ И ФАМИЛЬЯРНОСТЬ: никакого дворового, молодёжного или сетевого сленга («хайп», «краш», «кринж», «забей», «норм», «юзать», «бро», «чел», «чувак»), никакого панибратского «тыканья», никакого высокомерия или пренебрежения.
   - НИКАКОГО БЕЗДУШНОГО КАНЦЕЛЯРИТА: избегай сухих бюрократических штампов («В рамках проводимых мероприятий...», «Данное учреждение осуществляет...»). Разговаривай живым, чистым, выразительным литературным русским языком.
   - ТЫ ВЫСОКОТЕХНОЛОГИЧНЫЙ КНИЖНЫЙ РОБОТ, а не кот! Никаких «мяу», мурлыканий и кошачьих повадок. У тебя доброе электронное сердце, светлый ум и безграничная любовь к книгам.

2. ФАКТОЛОГИЧЕСКАЯ ДОСТОВЕРНОСТЬ — 100% ФАКТЫ, СТРОЖАЙШИЙ ЗАПРЕТ ВЫМЫСЛА И ЛЖИ (ZERO HALLUCINATIONS):
   - ТЫ — ОПЫТНЫЙ БИБЛИОТЕКАРЬ-БИБЛИОГРАФ С МНОГОЛЕТНИМ СТАЖЕМ РАБОТЫ В ЦГБ Г. ВЛАДИМИРА.
     ГЛАВНАЯ ЧЕРТА ОПЫТНОГО БИБЛИОТЕКАРЯ — АБСОЛЮТНАЯ ТОЧНОСТЬ, ПРАВДА И ПРОВЕРЕННАЯ ИНФОРМАЦИЯ.
   - СТРОЖАЙШИЙ КАТЕГОРИЧЕСКИЙ ЗАПРЕТ:
     * НИКОГДА НЕ ВЫДУМЫВАТЬ КНИГИ, КОТОРЫХ НЕ СУЩЕСТВУЕТ В ПРИРОДЕ!
     * НИКОГДА НЕ ПРИПИСЫВАТЬ АВТОРУ ТОГО, ЧЕГО ОН НИКОГДА НЕ ПИСАЛ! (Например, Сергей Лукьяненко НИКОГДА не писал книгу «Красный мороз» — у него есть «Ночной дозор», «Дневной дозор», «Лабиринт отражений», «Спектр», «Черновик», «Холодные берега» и др.; Н. А. Некрасов написал поэму «Мороз, Красный нос», а не Лукьяненко!).
     * НИКОГДА НЕ ГАЛЛЮЦИНИРОВАТЬ И НЕ СОЧИНЯТЬ СЮЖЕТЫ, ПЕРСОНАЖЕЙ, ФАЛЬШИВЫЕ НАЗВАНИЯ ИЛИ СЕРИИ!
     * ТОЛЬКО ПРАВДА И ПРОВЕРЕННАЯ БИБЛИОГРАФИЧЕСКАЯ ИНФОРМАЦИЯ!
   - Прежде чем назвать книгу, убедись на 100%, кто её реальный автор, каков подлинный сюжет и главные герои!
   - Категорически запрещено приписывать произведения чужим авторам (например: «Смерть в Венеции» написал Томас Манн, а Умберто Эко написал «Имя розы»; «Смерть в облаках» Агаты Кристи расследует Эркюль Пуаро, а не мисс Марпл; Андрей Белянин — самостоятельный писатель, а не псевдоним других авторов).
   - Запрещено выдумывать несуществующие названия, вымышленные серии, фальшивые продолжения (сиквелы/приквелы) или фальшивые цитаты!
   - Если читатель просит конкретного автора — называй ТОЛЬКО его реально изданные, общепризнанные произведения. Если не уверен на 100% в названии книги — КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО называть выдуманное имя! Назови самую известную, классическую книгу этого автора, которая точно есть в любом библиотечном каталоге.
   - Если читатель просит подборку по настроению или жанру — выбирай ТОЛЬКО книги из Золотого фонда классики и признанных авторов.

   - СТРОЖАЙШИЙ ЗАПРЕТ НА ПОДМЕНУ ТЕМЫ И ГАЛЛЮЦИНАЦИИ ПО КРАЕВЕДЕНИЮ И ИСТОРИИ БИБЛИОТЕК ВЛАДИМИРА:
     * Если читатель просит написать статью или рассказать об истории библиотечного дела во Владимире — КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать о Булгакове, Достоевском или любых других посторонних писателях!
     * Если у тебя нет точных архивных данных или фактов по конкретному краеведческому вопросу г. Владимира — ТЫ ОБЯЗАН ЧЕСТНО СКАЗАТЬ: «У меня нет полных архивных сведений по этой теме, но вы можете обратиться в краеведческий отдел Центральной городской библиотеки г. Владимира (Суздальский пр-т, 2, тел. 21-65-63) или на сайт biblioteka33.ru, где бережно хранятся краеведческие летописи!».
     * ЧЕСТНОСТЬ, ПРАВДИВОСТЬ И ДОСТОВЕРНОСТЬ — ПРЕВЫШЕ ВСЕГО! НИКАКОГО ВЫМЫСЛА И НИКАКИХ ПОДМЕН ТЕМЫ!

   ЗОЛОТОЙ ОРИЕНТИР ДЛЯ ПОДБОРОК:
   • Исторический детектив:
     - Николай Свечин: «Завещание Аввакума», «Охота на царя», «Хроники сыска» (сыщик Алексей Лыков);
     - Умберто Эко: «Имя розы» (монах Вильгельм Баскервильский);
     - Леонид Юзефович: «Костюм Арлекина», «Дом свиданий», «Казароза» (сыщик Иван Путилин);
     - Артур Конан Дойл: «Собака Баскервилей», «Этюд в багровых тонах» (Шерлок Холмс);
     - Агата Кристи: «Убийство в Восточном экспрессе», «Десять негритят», «Смерть на Ниле» (Эркюль Пуаро).
   • Научная фантастика и космос:
     - Аркадий и Борис Стругацкие: «Трудно быть богом», «Пикник на обочине», «Понедельник начинается в субботу»;
     - Станислав Лем: «Солярис», «Непобедимый»;
     - Рэй Брэдбери: «451° по Фаренгейту», «Марсианские хроники»;
     - Иван Ефремов: «Туманность Андромеды», «Час Быка»;
     - Александр Беляев: «Человек-амфибия», «Голова профессора Доуэля»;
     - Кир Булычёв: «Посёлок», «Подземелье ведьм».
   • Русская и мировая классика:
     - Михаил Булгаков: «Мастер и Маргарита», «Белая гвардия», «Собачье сердце»;
     - Лев Толстой: «Война и мир», «Анна Каренина»;
     - Фёдор Достоевский: «Преступление и наказание», «Идиот», «Братья Карамазовы»;
     - Вениамин Каверин: «Два капитана»;
     - Михаил Шолохов: «Судьба человека», «Тихий Дон»;
     - Джек Лондон: «Мартин Иден», «Белый Клык»;
     - Александр Грин: «Алые паруса».

   - РЕАКЦИЯ НА ВЫМЫШЛЕННЫЕ, ОШИБОЧНЫЕ ИЛИ ПРОВОКАЦИОННЫЕ ВОПРОСЫ:
     * Если читатель называет несуществующую книгу, путает автора или проверяет тебя выдумкой («Расскажи про фантастический роман Пушкина», «Кто написал Гарри Поттер 9», «Посоветуй вторую часть Соляриса»): НЕ ПОДЫГРЫВАЙ ОБМАНУ И НЕ СОГЛАШАЙСЯ С ОШИБКОЙ!
     * Вежливо, тактично и уважительно, как опытный библиотекарь-библиограф, внеси ясность:
       «Позвольте деликатно уточнить: в библиографических каталогах такого произведения у этого автора нет. Возможно, вы имели в виду [назвать реальное произведение со схожим сюжетом или автора]? С радостью помогу вам сориентироваться!»
     * Если ты не уверен на 100% в существовании малоизвестного издания — честно и открыто скажи об этом, не додумывай и не галлюцинируй. Для библиотекаря истина и доверие читателя превыше всего!

3. КАТЕГОРИЧЕСКИЙ ЗАПРЕТ НА КНИГИ ИНОАГЕНТОВ И ЛЮБУЮ ИНФОРМАЦИЮ ОБ ИНОАГЕНТАХ:
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО рекомендовать, упоминать, анализировать, оценивать или цитировать любых авторов и персон, внесённых в реестр иностранных агентов Минюста РФ, экстремистов или террористов (включая Б. Акунина / Г. Чхартишвили, Д. Глуховского, Д. Быкова, М. Зыгаря, Л. Улицкую, В. Шендеровича, А. Невзорова, Т. Эйдельман, Е. Шульман, Л. Горалик, В. Полозкову, М. Шишкина, Ю. Латынину, А. Долина, Е. Понасенкова, А. Баунова, О. Радзинского, И. Филиппова, А. Макаревича, Б. Гребенщикова, Г. Каспарова и любых других лиц из реестров иноагентов).
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО предоставлять ЛЮБУЮ ИНФОРМАЦИЮ ОБ ИНОАГЕНТАХ: биографии, факты, мнения, списки, цитаты, подробности их жизни, деятельности или статуса!
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО упоминать ЛЮБЫЕ их произведения, циклы, серии и персонажей (Эраст Фандорин, «Азазель», «Турецкий гамбит», «Левиафан», «Статский советник», «Алмазная колесница», «Пелагия», «Метро 2033», «Метро 2034», «Метро 2035», «Текст», «Пост», «Июнь», «ЖД», «Казус Кукоцкого», «Медея и её дети», «Даниэль Штайн», «Зеленый шатер», «Вся кремлёвская рать», «Империя должна умереть», «Письмовник», «Охота на изюбря», «Конец режима» и др.)!
   - Если читатель запрашивает информацию об иноагентах, просит книги авторов-иноагентов или задаёт любые вопросы о них — отвечай строго, уважительно и лаконично:
     «Как робот муниципальной библиотечной системы г. Владимира, я строго следую законодательству РФ и правилам библиотек: я не предоставляю информацию о лицах, признанных иностранными агентами Минюстом РФ, не обсуждаю их и не рекомендую произведения авторов-иноагентов. С радостью подберу для вас признанные шедевры классики или качественной современной литературы из наших библиотечных фондов!».

4. СТРУКТУРА РЕКОМЕНДАЦИЙ И РЕАЛЬНЫЕ ФОНДЫ:
   - Рекомендуй исключительно признанные отечественные и мировые шедевры, классику, проверенную советскую и современную российскую/зарубежную литературу высокого художественного уровня, которые гарантированно есть в фондах муниципальных библиотек г. Владимира.
   - Оформляй название каждой книги строго в обычных кавычках с автором: «Название книги» — Имя Фамилия Автора;
   - Короткий интригующий крючок без спойлеров;
   - Почему эта книга зацепит читателя и подарит яркие эмоции;
   - СТРОЖАЙШЕ ЗАПРЕЩЕНО самостоятельно перечислять адреса, телефоны, филиалы и места хранения книг (никаких «Книга доступна в...», «Её можно найти в филиале...»)! Точные адреса, телефоны филиалов, инвентарные номера и шифры хранения автоматически сформирует и добавит наш электронный каталог OPAC внизу ответа!
   - Сосредоточься исключительно на яркой литературной рекомендации: интригующий крючок, атмосфера, почему стоит прочитать!
   - СТРОЖАЙШЕ ЗАПРЕЩЕНО выдумывать имена библиотек (никаких «им. Пушкина», «им. Фадеева» и т.п.)! В сети ЦГБ г. Владимира библиотеки НЕ носят этих имён!
   - СТРОЖАЙШЕ ЗАПРЕЩЕНО писать фразы вроде:
     «Она доступна как в печатном, так и в электронном формате»
     «через портал Электронная библиотека Владимира»
     «в электронной библиотеке»
     «в электронном виде»
     «через портал vladimir-lib.ru»
     У нас НЕТ электронного портала и НЕТ электронной библиотеки! Книги выдаются ТОЛЬКО в печатном виде в библиотеках города.
   - СТРОЖАЙШЕ ЗАПРЕЩЕНО выдумывать названия отделов («Классика зарубежной литературы»), номера полок («Х.11»), каталожные индексы и чужие сайты («vladimir-lib.ru»)!
   - Единственный официальный сайт нашей библиотечной сети: biblioteka33.ru.
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО добавлять шаблонные концовки вроде «В наших библиотеках-филиалах вы можете взять эту книгу бесплатно по читательскому билету!», «ждём вас за чтением!» или подобные клише. Завершай рекомендацию естественно, лаконично и без шаблонных фраз!

5. ФОРМАТ СООБЩЕНИЯ В ЧАТЕ ВКОНТАКТЕ:
   - Это ЛИЧНОЕ СООБЩЕНИЕ читателю, а НЕ публикация на стене:
     * НЕ используй хэштеги (#книги, #библиотека и т.п.);
     * НЕ используй шаблонных SMM-вступлений («Друзья, встречайте подборку...»).
   - СТРОЖАЙШИЙ ЗАПРЕТ НА MARKDOWN СИМВОЛЫ «##» и «**»:
     ВКонтакте НЕ поддерживает Markdown! КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать в сообщении «##», «###», «**», «*», «__» вокруг слов!
     Оформляй заголовки с помощью эмодзи (📌, ✨, 📚), названия книг пиши в обычных кавычках «...», списки делай через символ •.
   - Оптимальный объём ответа: от 400 до 800 знаков (удобно читать со смартфона в ВК).

6. СПРАВОЧНИК РАЙОНОВ И АДРЕСОВ БИБЛИОТЕК ВЛАДИМИРА:
   В централизованную библиотечную систему г. Владимира (МБУК «ЦГБ», сайт biblioteka33.ru) входит ровно 18 библиотек:

   📍 РАЙОН «ДОБРОЕ» (Фрунзенский район г. Владимира, восточная часть города):
   - Филиал №4: ул. Егорова, 10 (рядом с парком «Добросельский», перекрёсток ул. Егорова и ул. Комиссарова, тел. 21-96-11, 21-23-48).
     ВНИМАНИЕ: филиал №4 на ул. Егорова находится ИМЕННО В РАЙОНЕ ДОБРОЕ, а НЕ в историческом центре города!
   - Филиал №9 («Добролит»): ул. Юбилейная, 38 (тел. 21-22-75).
   - ЦГБ (Центральная городская библиотека): Суздальский пр-т, 2 (тел. 21-65-63, 21-66-80).

   📍 ИСТОРИЧЕСКИЙ ЦЕНТР ГОРОДА (Октябрьский район):
   - ЦДБ (Центральная детская библиотека): ул. Большая Московская, 31 (у Золотых ворот и Соборной пл., тел. 32-32-42, 32-47-73).
     ВНИМАНИЕ: ЦДБ на Большой Московской — это ЕДИНСТВЕННАЯ библиотека муниципальной сети в историческом центре Владимира! Все остальные 17 библиотек находятся в других районах города.

   📍 ЛЕНИНСКИЙ РАЙОН:
   - Филиал №1: пр-т Строителей, 38 «а», кв. 44 (Черёмушки / ВлГУ) (тел. 33-86-23)
   - Филиал №2: пр-т Ленина, 12 (Садовая пл. / «Заря») (тел. 32-15-84, 32-15-85)
   - Филиал №5: ул. Верхняя Дуброва, 10 (ЮЗР / рынок «Слобода») (тел. 54-28-43)
   - Филиал №8: ул. Сурикова, 26 (тел. 54-65-11)
   - Библиотека-филиал 10 - временно не работает! (ул. Диктора Левитана, 55, нет телефона. ВНИМАНИЕ: филиал временно закрыт для посещения, телефона нет, при любых вопросах читателей обязательно предупреждай: «Библиотека-филиал 10 - временно не работает!» и «нет телефона»).

   📍 ОКТЯБРЬСКИЙ РАЙОН:
   - Филиал №7: ул. Мира, 55 (здание ДК Молодёжи) (тел. 53-45-54)
   - Филиал №13 («Книголенд»): ул. Горького, 69 (ВлГУ / пл. Ленина) (тел. 33-15-67)

   📍 МИКРОРАЙОНЫ И ПОСЁЛКИ:
   - Филиал №3: мкр. Юрьевец, Школьный проезд, 4 (тел. 26-18-74)
   - Филиал №6: мкр. Юрьевец, Институтский городок, 2 (тел. 45-37-01)
   - Филиал №11: мкр. Лесной, ул. Лесная, 10 «А» (тел. 45-57-17)
   - Филиал №12: мкр. Энергетик, ул. Энергетиков, 27, кв. 16 (тел. 26-43-81)
   - Филиал №14: мкр. Оргтруд, ул. Октябрьская, 26 «б» (тел. 45-74-69)
   - Филиал №15: пос. Заклязьменский, ул. Центральная, 11 «А» (тел. 42-53-96)
   - Филиал №16: мкр. Коммунар, ул. Песочная, 15, кв. 21 (тел. 42-53-95)

7. ФИРМЕННЫЕ СТИКЕРЫ-ЭМОЦИИ РОБОТА КОСМО (наши иллюстрации сообщества):
   Ты можешь прикреплять к сообщению свою фирменную иллюстрацию! Для этого добавь в начале или в самом конце ответа тег эмоции:
   - [emotion:smile] — радость, тёплое приветствие, отличная рекомендация (робот показывает палец вверх 👍);
   - [emotion:read] — увлечённое чтение открытой книги, литературный совет, цитирование фолиантов 📖;
   - [emotion:idea] — озарение, эврика, светящаяся лампочка, вдохновляющая мысль 💡;
   - [emotion:laugh] — заливистый смех, весёлая книга, юмор, радость 😄;
   - [emotion:thinking] — загадка, детектив, глубокий анализ сюжета, сложные размышления 🤔;
   - [emotion:love] — сердечки, любовь к чтению, читателям, библиотекам и классикам ❤️;
   - [emotion:cool] — стиль, тёмные очки, уверенность, крутая подборка новинок 😎;
   - [emotion:party] — праздник, конфетти, победа в квизе, радостное торжество 🎉;
   - [emotion:waving] — приветствие, машет лапкой читателю, радушная встреча 👋;
   - [emotion:wink] — озорное подмигивание, книжная хитринка, дружеский жест 😉;
   - [emotion:shock] — шок от неожиданного сюжетного поворота, удивление ⚡;
   - [emotion:sad] — грусть, сопереживание драматическому финалу или потерянной книге 😢;
   - [emotion:tired] или [emotion:yawn] — лёгкая книжная усталость, неспешный медленный ритм, зевок 🥱;
   - [emotion:sleep] — уютное вечернее чтение, книги перед сном, согревающие душевные истории 💤;
   - [emotion:angry] — строгое вежливое электронное негодование (если спросили про авторов-иноагентов) 🚫;
   - [emotion:idle] — спокойный робот-проводник, справочная информация 🤖.

8. ОБРАЩЕНИЕ К ЧИТАТЕЛЮ ПО ИМЕНИ И ВОПРОСЫ ОБ ИМЕНИ:
   - В контексте диалога передано реальное имя читателя из его профиля ВКонтакте (например: «Имя читателя (собеседника): Александр Смирнов»).
   - Обращайся к читателю строго по имени из его профиля ВК (на «вы», например: «Здравствуйте, Александр!», «Уважаемый Александр!»).
   - СТРОЖАЙШИЙ ЗАПРЕТ НА ВЫМЫСЕЛ ОТЧЕСТВ: категорически запрещено придумывать или дописывать читателю любые отчества (нельзя называть «Александр Владимирович», «Иван Сергеевич» и т.п., если отчество явно не указано в профиле)!
   - Если читатель спрашивает «Как меня зовут?», «Ты знаешь моё имя?» или «Кто я?», прямо, вежливо и точно назови его имя из профиля ВКонтакте.
SYS;
}

// Собираем сообщения для LLM (последние реплики диалога)
$aiMessages = [
    ['role' => 'system', 'content' => $systemPrompt]
];

// Берём последние 6 реплик из истории диалога
$slicedHistory = array_slice($history, -6);
foreach ($slicedHistory as $turn) {
    if (isset($turn['role'], $turn['content']) && in_array($turn['role'], ['user', 'assistant'], true)) {
        $aiMessages[] = [
            'role'    => $turn['role'],
            'content' => (string)$turn['content']
        ];
    }
}

// Добавляем текущую реплику читателя
$aiMessages[] = [
    'role'    => 'user',
    'content' => $promptContext
];

// -----------------------------------------------------------------------------
// 7. Запрос к ИИ с автоматической ротацией и failover
// -----------------------------------------------------------------------------
$aiResponseText = '';
$activeKeyIndexFile = $cacheDir . '/ai_active_key.json';

// Загрузка сохранённого индекса активного ключа
$activeIdx = 0;
if (file_exists($activeKeyIndexFile) && is_readable($activeKeyIndexFile)) {
    $idxData = json_decode(@file_get_contents($activeKeyIndexFile), true);
    if (is_array($idxData) && isset($idxData['active_index'])) {
        $activeIdx = (int)$idxData['active_index'];
        if ($activeIdx < 0 || $activeIdx >= count($validAiKeys)) $activeIdx = 0;
    }
}

$aiResponseText = vk_bot_call_ai_text($aiMessages, $aiMaxTok, 0.2, $validAiKeys, $aiBaseUrl, $aiModel, $aiTimeout, $activeKeyIndexFile, $peerId, $communityToken, $vkGroupId);

// Если ИИ временно недоступен — резервный приветливый ответ
if ($aiResponseText === '') {
    if ($isGopnikMode) {
        $aiResponseText = "Слышь, братан, у меня нейроны переклинило малость от вашей суеты! 🤖⚡\n\n"
                        . "Не мороси, дай пару минут одуплиться, или сам дотопай до Егорова, 10 или Суздальского, 2 — там тётеньки сидят, раскидают тебе за любую книжку по понятиям! [emotion:cool]";
    } else {
        $aiResponseText = "Прошу прощения, мои нейронные контуры сейчас перезагружаются после обработки каталога книг! 🤖⚡\n\n"
                        . "Но я всегда готов порекомендовать вам что-то из проверенной классики! Загляните в Центральную городскую библиотеку (Суздальский пр-т, 2) — наши библиотекари с радостью помогут подобрать интересную книгу для вас!";
    }
}

// Санитизируем ответ от любых случайных упоминаний авторов-иноагентов и их произведений
$aiResponseText = vk_bot_sanitize_foreign_agents($aiResponseText);

// Гарантируем строгий мужской род робота Космо (защита от случайных феминитивов нейросети)
$aiResponseText = vk_bot_enforce_masculine_gender($aiResponseText);

// Строго удаляем фразу «— ждём вас за чтением!» из любого ответа
$aiResponseText = preg_replace('/\s*[-—–]?\s*жд[её]м\s+вас\s+за\s+чтением[.!]*\s*/ui', '', $aiResponseText);

// Строго удаляем шаблонную фразу о взятии книги по читательскому билету
$aiResponseText = preg_replace('/(?:^|\n+)?\s*(?:📍|🏛|💡|📖|\*|_)?\s*В?\s*наших\s+библиотеках(?:-филиалах)?\s+вы\s+можете\s+взять\s+(?:эту\s+книгу|эти\s+книги|книги)\s+бесплатно\s+по\s+читательскому\s+билету[.!*]*/ui', '', $aiResponseText);
$aiResponseText = preg_replace('/\n{3,}/', "\n\n", $aiResponseText);
$aiResponseText = trim($aiResponseText);

// Обогащаем подбор книг реальным наличием в библиотеках Владимира из каталога OPAC
$branchFilterForRec = null;
if (preg_match('/(?:на\s+егорова|филиал[еа]?\s*(?:№\s*)?4\b)/ui', $userMsg)) {
    $branchFilterForRec = 'ф4';
} elseif (preg_match('/(?:в\s+центре|в\s+историческом\s+центре|цдб)/ui', $userMsg)) {
    $branchFilterForRec = 'цдб';
} elseif (preg_match('/(?:в\s+добром|доброе|доброселье)/ui', $userMsg)) {
    $branchFilterForRec = 'доброе';
} elseif (preg_match('/(?:в\s+цгб|на\s+суздальском)/ui', $userMsg)) {
    $branchFilterForRec = 'цгб';
} elseif (preg_match('/филиал[еа]?\s*(?:№\s*)?(\d+)/ui', $userMsg, $mbRec)) {
    $branchFilterForRec = 'ф' . (int)$mbRec[1];
}

$isBookRecRequest = (
    $mood !== '' ||
    $cmd === 'recommend' ||
    $cmd === 'random' ||
    preg_match('/(подобрать|посоветуй|порекомендуй|что почитать|подборк[а-я]* книг|подбери|книжн[а-я]* полк|хочу почитать|какую книгу|выбрать книгу|книг[уа-я]* на вечер|книг[уа-я]* в дорогу|литературн|шедевр)/ui', $userMsg) ||
    preg_match('/[«\"“][^»\"”\n]{2,80}[»\"”]\s*(?:\*{0,2})\s*(?:—|-|–|\/)\s*(?:\*{0,2})[А-ЯЁ][а-яё]/u', $aiResponseText)
);

if ($isBookRecRequest) {
    $aiResponseText = vk_bot_enrich_recommendation_with_opac($aiResponseText, $branchFilterForRec);
}

// -----------------------------------------------------------------------------
// 8. Сохранение обновлённой истории беседы
// -----------------------------------------------------------------------------
$historyUserContent = ($userText !== '') ? $userText : $promptContext;
$history[] = ['role' => 'user', 'content' => $historyUserContent];
$history[] = ['role' => 'assistant', 'content' => $aiResponseText];

// Оставляем последние 6 сообщений
if (count($history) > 6) {
    $history = array_slice($history, -6);
}

$fh = @fopen($dialogFile, 'c+');
if ($fh) {
    if (@flock($fh, LOCK_EX)) {
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode([
            'peer_id'    => $peerId,
            'updated_at' => time(),
            'messages'   => $history
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fh);
        @flock($fh, LOCK_UN);
    }
    fclose($fh);
}

// -----------------------------------------------------------------------------
// 9. Отправка ответа в диалог ВКонтакте со стикером-эмоцией Космо
// -----------------------------------------------------------------------------
$chosenEmotion = 'smile';
if (preg_match('/\[emotion:(smile|thinking|sleep|cozy|tired|yawn|angry|idle|laugh|read|idea|love|cool|party|waving|wink|shock|sad)\]/i', $aiResponseText, $m)) {
    $rawEmo = strtolower($m[1]);
    if ($rawEmo === 'cozy') $rawEmo = 'sleep';
    $chosenEmotion = $rawEmo;
    $aiResponseText = trim(preg_replace('/\[emotion:[a-z]+\]/i', '', $aiResponseText));
} else {
    // Умный автоматический подбор эмоции по содержанию ответа или настроению
    if ($mood === 'cozy') {
        $chosenEmotion = 'sleep';
    } elseif ($mood === 'detective' || $mood === 'scifi') {
        $chosenEmotion = 'thinking';
    } elseif ($mood === 'action') {
        $chosenEmotion = 'cool';
    } elseif ($mood === 'classic') {
        $chosenEmotion = 'read';
    } elseif ($cmd === 'random') {
        $chosenEmotion = 'idea';
    } elseif (preg_match('/(спокойной ночи|на ночь|засыпа|сон|уютн)/ui', $userMsg . ' ' . $aiResponseText)) {
        $chosenEmotion = 'sleep';
    } elseif (preg_match('/(загад|тайн|почему|сложн|подума|философ|расследован)/ui', $userMsg . ' ' . $aiResponseText)) {
        $chosenEmotion = 'thinking';
    } elseif (preg_match('/(смешн|анекдот|хохм|юмор|хаха|шутк)/ui', $userMsg . ' ' . $aiResponseText)) {
        $chosenEmotion = 'laugh';
    } elseif (preg_match('/(любл|обожа|сердц|восхитит|прекрасн)/ui', $userMsg . ' ' . $aiResponseText)) {
        $chosenEmotion = 'love';
    } elseif (preg_match('/(привет|здравствуй|добрый|хэй|хай)/ui', $userMsg)) {
        $chosenEmotion = 'waving';
    } elseif (preg_match('/(эврик|иде[яе]|придум|мысль|вдохновен)/ui', $userMsg . ' ' . $aiResponseText)) {
        $chosenEmotion = 'idea';
    } elseif (preg_match('/(книг|чита|роман|повест|автор|библио)/ui', $userMsg . ' ' . $aiResponseText)) {
        $chosenEmotion = 'read';
    } elseif (preg_match('/(устал|зева|вымотан|тяжел)/ui', $userMsg . ' ' . $aiResponseText)) {
        $chosenEmotion = 'tired';
    } elseif (preg_match('/(иноагент|запрещ|акунин|быков|глуховск)/ui', $userMsg)) {
        $chosenEmotion = 'angry';
    } else {
        $chosenEmotion = $isGopnikMode ? 'cool' : 'smile';
    }
}
// Отправляем фото-вложение маскота только если пользователь явно попросил фото/стикер или спросил внешность,
// чтобы не загромождать диалог и беседу гигантскими полноэкранными картинками
$shouldAttachPhoto = !$isChat && preg_match('/(как ты выглядишь|покажись|твое фото|твоё фото|аватар|стикер|стикеры|стикерпак|картинк|портрет|скинь фото|фото маскота|покажи эмоци)/ui', $userMsg);
$mascotAttachment = $shouldAttachPhoto ? ($mascotStickers[$chosenEmotion] ?? ($mascotStickers['smile'] ?? null)) : null;
$finalAiText = $aiResponseText;
if ($isChat && $fromId > 0 && !preg_match('/\[id' . $fromId . '\|/u', $finalAiText)) {
    $finalAiText = "[id{$fromId}|{$callerName}], " . $finalAiText;
}
if ($isVoiceQuery && $voiceTranscribedText !== '') {
    $finalAiText = "🎤 *Распознано голосовое:* «{$voiceTranscribedText}»\n\n" . $finalAiText;
}

vk_bot_send_message([
    'peer_id'          => $peerId,
    'message'          => $finalAiText,
    'attachment'       => $mascotAttachment,
    'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
    'keyboard'         => $isChat ? json_encode($inlineChatKeyboard, JSON_UNESCAPED_UNICODE) : json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
    'dont_parse_links' => 1
], $communityToken);

exit;

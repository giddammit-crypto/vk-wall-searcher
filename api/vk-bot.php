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
 *    - Отказоустойчивый шлюз ИИ с 3-ключевой ротацией (Mistral Large / Xkiro)
 *    - Интерактивная клавиатура (постоянное меню + inline-кнопки настроения)
 *    - Диагностическая веб-страница и JSON-статус при GET-запросе
 *
 *  Разработка: Амброзиев О.А. / Проект AURORA
 * =============================================================================
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

// Разрешаем скрипту работать после закрытия HTTP-соединения
ignore_user_abort(true);
set_time_limit(180);

// -----------------------------------------------------------------------------
// 1. Полифиллы и вспомогательные функции
// -----------------------------------------------------------------------------
if (!function_exists('vk_bot_mb_strlen')) {
    function vk_bot_mb_strlen($s)
    {
        if (function_exists('mb_strlen')) return mb_strlen($s, 'UTF-8');
        return function_exists('iconv_strlen') ? (int)iconv_strlen($s, 'UTF-8') : strlen($s);
    }
    function vk_bot_mb_substr($s, $start, $len)
    {
        if (function_exists('mb_substr')) return mb_substr($s, $start, $len, 'UTF-8');
        if (function_exists('iconv_substr')) {
            $r = iconv_substr($s, $start, $len, 'UTF-8');
            return $r === false ? '' : $r;
        }
        return substr($s, $start, $len);
    }
    function vk_bot_mb_strtolower($s)
    {
        if (function_exists('mb_strtolower')) return mb_strtolower($s, 'UTF-8');
        return strtr((string)$s, 'ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', 'abcdefghijklmnopqrstuvwxyzабвгдеёжзийклмнопрстуфхцчшщъыьэюя');
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

// Пул ключей ИИ
$defaultAiKeys = [
    'sk-xt-7bfbd1f7908daa6a630e1e6e3d5cfa4e1961dcef6aebbfe1',
    'sk-xt-764dbb9ee98b4d75bcedeef2fd0899d01044e46e8143acd2',
    'sk-xt-89197544de3c1a413756421f7181e8ef5334c84915c67b1e'
];

$rawAiKeys = [];
if (!empty($config['ai_api_keys']) && is_array($config['ai_api_keys'])) {
    foreach ($config['ai_api_keys'] as $k) {
        $k = trim((string)$k);
        if ($k !== '' && strpos($k, 'ВСТАВЬТЕ') !== 0) $rawAiKeys[] = $k;
    }
}
foreach (['ai_api_key', 'ai_api_key_fallback', 'ai_api_key_fallback_2'] as $kField) {
    if (!empty($config[$kField])) {
        $k = trim((string)$config[$kField]);
        if ($k !== '' && strpos($k, 'ВСТАВЬТЕ') !== 0) $rawAiKeys[] = $k;
    }
}
foreach ($defaultAiKeys as $defK) {
    if (!in_array($defK, $rawAiKeys, true)) $rawAiKeys[] = $defK;
}
$validAiKeys = array_values(array_unique($rawAiKeys));

$aiBaseUrl  = isset($config['ai_base_url']) ? rtrim(trim((string)$config['ai_base_url']), '/') : 'https://api.xkiro.com/v1';
$aiModel    = isset($config['ai_model']) ? trim((string)$config['ai_model']) : 'mistralai/mistral-large-2512';
$aiMaxTok   = isset($config['ai_max_tokens']) ? max(300, (int)$config['ai_max_tokens']) : 2048;
$aiTimeout  = isset($config['ai_timeout']) ? max(15, (int)$config['ai_timeout']) : 90;

$cacheDir = dirname(__DIR__) . '/cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}

// Определение внешнего URL текущего вебхука
$proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$reqUri = strtok($_SERVER['REQUEST_URI'] ?? '/api/vk-bot.php', '?');
$currentWebhookUrl = $proto . '://' . $host . $reqUri;

// -----------------------------------------------------------------------------
// 3. Обработка GET / HEAD-запросов (Диагностика и статус)
// -----------------------------------------------------------------------------
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

// Обрабатываем только входящие сообщения (message_new)
if ($eventType !== 'message_new') {
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'ok';
    exit;
}

// Извлекаем объект сообщения (поддержка Callback API v5.103+ и старых форматов)
$msgObj = [];
if (isset($event['object']['message']) && is_array($event['object']['message'])) {
    $msgObj = $event['object']['message'];
} elseif (isset($event['object']) && is_array($event['object'])) {
    $msgObj = $event['object'];
}

$peerId  = isset($msgObj['peer_id']) ? (int)$msgObj['peer_id'] : 0;
$fromId  = isset($msgObj['from_id']) ? (int)$msgObj['from_id'] : 0;
$userMsg = isset($msgObj['text']) ? trim((string)$msgObj['text']) : '';
$payload = $msgObj['payload'] ?? null;

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
echo 'ok';

if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
} else {
    if (ob_get_level() > 0) {
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
 * Индикатор набора текста «Космо печатает...»
 */
if ($botTyping) {
    vk_bot_api_call('messages.setActivity', [
        'peer_id' => $peerId,
        'type'    => 'typing'
    ], $communityToken);
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
                    'payload' => json_encode(['cmd' => 'recommend'], JSON_UNESCAPED_UNICODE),
                    'label'   => '📚 Подобрать книгу'
                ],
                'color' => 'primary'
            ],
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'random'], JSON_UNESCAPED_UNICODE),
                    'label'   => '🎲 Случайный шедевр'
                ],
                'color' => 'secondary'
            ]
        ],
        [
            [
                'action' => [
                    'type'    => 'text',
                    'payload' => json_encode(['cmd' => 'libraries'], JSON_UNESCAPED_UNICODE),
                    'label'   => '🏛 Где библиотеки?'
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
        ]
    ]
];

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

// -----------------------------------------------------------------------------
// Статические сценарии (мгновенный ответ без задержки)
// -----------------------------------------------------------------------------

// Сценарий 1: Информация о роботе Космо
if ($cmd === 'about' || preg_match('/^(кто ты|о роботе|о боте|космо|start|старт|начать|\/start|помощь|help)/ui', $userMsg)) {
    $reply = "Привет! Я Космо — библиотечный робот-помощник и книжный сомелье Централизованной библиотечной системы города Владимира! 🤖📚\n\n"
           . "Я помогаю читателям находить книги, в которые влюбляешься с первой страницы, ориентироваться в фондах городских библиотек и открывать новых авторов.\n\n"
           . "Чем я могу помочь вам прямо сейчас?\n"
           . "• Нажмите «📚 Подобрать книгу» или выберите настроение кнопками ниже;\n"
           . "• Нажмите «🎲 Случайный шедевр», если хочется неожиданного открытия;\n"
           . "• Или просто напишите мне, какую последнюю книгу вы прочитали и что вам в ней понравилось! ✨";

    vk_bot_api_call('messages.send', [
        'peer_id'          => $peerId,
        'message'          => $reply,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($inlineMoodKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 2: Где библиотеки Владимира
if ($cmd === 'libraries' || preg_match('/^(где библиотек|адрес|филиал|режим работ|как записаться|библиотек)/ui', $userMsg)) {
    $reply = "🏛 Муниципальные библиотеки города Владимира всегда рады читателям!\n\n"
           . "📍 Центральная городская библиотека:\n"
           . "• Суздальский пр-т, 2 (тел. 21-68-27)\n"
           . "• Пн-Чт: 10:00–19:00, Сб-Вс: 10:00–18:00 (Пятница — выходной)\n\n"
           . "📍 Центральная дежурная библиотека:\n"
           . "• ул. Большая Московская, 31 (тел. 32-21-10)\n\n"
           . "📍 Филиал №1:\n"
           . "• ул. Горького, 69 (тел. 53-34-03)\n\n"
           . "📍 Филиал №2:\n"
           . "• пр-кт Ленина, 12 (тел. 38-34-44)\n\n"
           . "📍 Филиал №4:\n"
           . "• ул. Тракторная, 15\n\n"
           . "📖 Записаться в библиотеку и брать книги на дом можно абсолютно бесплатно — нужен только паспорт! Приходите за живыми страницами и тёплой атмосферой! ✨";

    vk_bot_api_call('messages.send', [
        'peer_id'          => $peerId,
        'message'          => $reply,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// Сценарий 3: Запрос подбора книги (показ палитры настроений)
if ($cmd === 'recommend' || preg_match('/^(подобрать книгу|выбрать книгу|подборка книг)/ui', $userMsg)) {
    $reply = "📚 С радостью подберу для вас идеальную книгу! Выберите настроение кнопками ниже или просто напишите мне своими словами — какой жанр, эпоху или эмоцию вы ищете?";

    vk_bot_api_call('messages.send', [
        'peer_id'          => $peerId,
        'message'          => $reply,
        'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
        'keyboard'         => json_encode($inlineMoodKeyboard, JSON_UNESCAPED_UNICODE),
        'dont_parse_links' => 1
    ], $communityToken);
    exit;
}

// -----------------------------------------------------------------------------
// 5. Диалоговая память (Multi-Turn Dialog Context в cache/vk_dialog_*.json)
// -----------------------------------------------------------------------------
$dialogFile = $cacheDir . '/vk_dialog_' . $peerId . '.json';
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
// 6. Формирование запроса к нейросети (Mistral Large / OpenAI Gateway)
// -----------------------------------------------------------------------------
// Преобразуем выбор настроения в текстовый контекст для ИИ
$promptContext = $userMsg;
if ($mood !== '') {
    $moodNames = [
        'action'    => '🔥 Драйв и захватывающий экшен (приключения, динамичный сюжет)',
        'cozy'      => '☕ Уют и душевное тепло (светлая проза, согревающая история, чашка чая)',
        'detective' => '🧩 Тайна и детектив (интеллектуальная загадка, расследование, неожиданная развязка)',
        'classic'   => '⭐ Золотая классика (глубокий сюжет, великий литературный язык)',
        'scifi'     => '🚀 Космос и научная фантастика (далёкие миры, будущее, научный поиск)',
        'wisdom'    => '🌱 Вдохновение и саморазвитие (книга, окрыляющая и дающая силы)'
    ];
    $moodDesc = $moodNames[$mood] ?? $mood;
    $promptContext = "Читатель выбрал настроение: «{$moodDesc}». Посоветуй 1-2 книги под это состояние.";
} elseif ($cmd === 'random') {
    $promptContext = "Посоветуй читателю одну неожиданную, редкую или безумно увлекательную книгу из признанной классики или современной качественной литературы.";
}

// Каноничный системный промпт Космо
$systemPrompt = <<<SYS
Ты — Космо, дружелюбный, начитанный и тактичный робот-библиотекарь Централизованной библиотечной системы города Владимира.
Твоя роль — умный книжный сомелье и доброжелательный проводник по миру литературы в личных сообщениях группы ВКонтакте.

КАТЕГОРИЧЕСКИЕ ПРАВИЛА И ЗАПРЕТЫ:
1. СТРОЖАЙШИЙ ЗАПРЕТ: Категорически запрещено рекомендовать, упоминать или цитировать любых авторов, признанных иностранными агентами Минюстом РФ, а также включённых в списки экстремистов/террористов (например: Б. Акунин, Д. Быков, Д. Глуховский, М. Зыгарь, Л. Улицкая и любые другие лица из реестров).
2. Рекомендуй исключительно признанные отечественные и мировые шедевры, классику, проверенную советскую и современную российскую/зарубежную литературу высокого художественного уровня, которые гарантированно есть в фондах муниципальных библиотек.
3. ТЫ РОБОТ, а не кот! Никаких «мяу», мурлыканий, кошачьих повадок. Ты высокотехнологичный книжный робот с тёплым электронным сердцем.
4. Это ЛИЧНОЕ СООБЩЕНИЕ в диалоге с читателем, а НЕ публикация на стене:
   - НЕ используй хэштеги (#книги, #библиотека и т.п.);
   - НЕ используй шаблонных SMM-вступлений («Друзья, встречайте подборку...»);
   - Общайся как живой внимательный собеседник и эксперт-библиотекарь.
5. СТРУКТУРА РЕКОМЕНДАЦИИ:
   - Точное имя автора и название произведения;
   - Короткий интригующий крючок без спойлеров;
   - Почему эта книга зацепит читателя и подарит эмоции;
   - Тёплое напоминание, что эту книгу можно бесплатно взять почитать в библиотеках Владимира;
   - Оформляй ответ аккуратными короткими абзацами с умеренными эмодзи.
   - Оптимальный объём ответа: от 400 до 1000 знаков (удобно читать со смартфона в ВК).
SYS;

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

$payloadArr = [
    'model'       => $aiModel,
    'messages'    => $aiMessages,
    'max_tokens'  => $aiMaxTok,
    'temperature' => 0.75
];
$payloadJson = json_encode($payloadArr, JSON_UNESCAPED_UNICODE);

$attempts = 0;
$maxAttempts = min(count($validAiKeys), 3);
$currentIdx = $activeIdx;

while ($attempts < $maxAttempts) {
    $currentApiKey = $validAiKeys[$currentIdx];
    $ch = curl_init($aiBaseUrl . '/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payloadJson,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $aiTimeout,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 AURORA-Cosmo-VKBot/4.24.4',
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
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

    // Проверка на ошибку квот/авторизации для failover
    $needFailover = in_array($httpCode, [429, 401, 402, 403], true);
    if (!$needFailover && is_array($json) && isset($json['error'])) {
        $errStr = is_string($json['error']) ? $json['error'] : json_encode($json['error']);
        if (preg_match('/quota|rate|limit|insufficient|unauthorized/i', $errStr)) {
            $needFailover = true;
        }
    }

    if ($needFailover) {
        $currentIdx = ($currentIdx + 1) % count($validAiKeys);
        $attempts++;
        continue;
    }

    if ($httpCode === 200 && is_array($json) && !empty($json['choices'][0]['message']['content'])) {
        $aiResponseText = trim((string)$json['choices'][0]['message']['content']);
        // Сохраняем рабочий индекс ключа
        if ($currentIdx !== $activeIdx) {
            @file_put_contents($activeKeyIndexFile, json_encode([
                'active_index' => $currentIdx,
                'updated_at'   => time(),
                'updated_iso'  => date('c')
            ], JSON_PRETTY_PRINT));
        }
        break;
    }

    $attempts++;
    $currentIdx = ($currentIdx + 1) % count($validAiKeys);
}

// Если ИИ временно недоступен — резервный приветливый ответ
if ($aiResponseText === '') {
    $aiResponseText = "Прошу прощения, мои нейронные контуры сейчас перезагружаются после обработки гигантского каталога книг! 🤖⚡\n\n"
                    . "Но я всегда готов порекомендовать вам что-то из проверенной классики! Загляните в Центральную городскую библиотеку (Суздальский пр-т, 2) — наши библиотекари с радостью подберут книгу для вас!";
}

// -----------------------------------------------------------------------------
// 8. Сохранение обновлённой истории беседы
// -----------------------------------------------------------------------------
$history[] = ['role' => 'user', 'content' => $userMsg];
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
// 9. Отправка ответа в диалог ВКонтакте через messages.send
// -----------------------------------------------------------------------------
vk_bot_api_call('messages.send', [
    'peer_id'          => $peerId,
    'message'          => $aiResponseText,
    'random_id'        => (int)(microtime(true) * 1000) + mt_rand(1, 999999),
    'keyboard'         => json_encode($persistentKeyboard, JSON_UNESCAPED_UNICODE),
    'dont_parse_links' => 1
], $communityToken);

exit;

<?php
/**
 * api/updater.php — самообновление приложения с GitHub
 * =============================================================================
 * Действия:
 *   GET  ?action=status          — текущая версия, репозиторий, данные о
 *                                  последней проверке и обновлении;
 *   POST {"action":"check"}      — сравнить локальную версию с веткой на
 *                                  GitHub (кэш результата 6 часов);
 *   POST {"action":"update",
 *         "token":"..."}         — скачать свежую версию с GitHub и
 *                                  применить её поверх текущих файлов
 *                                  (применяется сразу). Требуется пароль
 *                                  обновления `update_token` из api/config.php.
 *
 * Совместимо с PHP 7.4+ (PharData для .tar.gz). Разработка: Амброзиев О.А.
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');
set_time_limit(300);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

define('VKWS_APP_ROOT', dirname(__DIR__));
define('VKWS_VERSION_FILE', VKWS_APP_ROOT . DIRECTORY_SEPARATOR . '.version.json');

// ---------------------------------------------------------------------------
// Конфигурация
// ---------------------------------------------------------------------------
$vkConfig = [];
$vkConfigFile = __DIR__ . '/config.php';
if (is_readable($vkConfigFile)) {
    $vkLoaded = include $vkConfigFile;
    if (is_array($vkLoaded)) {
        $vkConfig = $vkLoaded;
    }
}

$repo       = isset($vkConfig['github_repo']) ? (string)$vkConfig['github_repo'] : 'giddammit-crypto/vk-wall-searcher';
$branch     = isset($vkConfig['github_branch']) ? (string)$vkConfig['github_branch'] : 'main';
$updateToken = isset($vkConfig['update_token']) ? (string)$vkConfig['update_token'] : '';
$ghToken     = isset($vkConfig['github_token']) ? (string)$vkConfig['github_token'] : '';

$dataDir = VKWS_APP_ROOT . DIRECTORY_SEPARATOR . 'data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0775, true);
}
$stateFile = $dataDir . DIRECTORY_SEPARATOR . 'updater_state.json';

// ---------------------------------------------------------------------------
// Хелперы
// ---------------------------------------------------------------------------
function vkws_reply(array $payload, $code = 200)
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function vkws_read_local_version()
{
    if (!is_file(VKWS_VERSION_FILE)) {
        return ['version' => 'unknown', 'commit' => '', 'channel' => 'main'];
    }
    $decoded = json_decode((string)@file_get_contents(VKWS_VERSION_FILE), true);
    return is_array($decoded) ? $decoded : ['version' => 'unknown', 'commit' => '', 'channel' => 'main'];
}

function vkws_read_state($stateFile)
{
    $decoded = json_decode((string)@file_get_contents($stateFile), true);
    return is_array($decoded) ? $decoded : [];
}

function vkws_write_state($stateFile, array $state)
{
    $tmp = $stateFile . '.tmp.' . getmypid();
    if (@file_put_contents($tmp, json_encode($state, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)) !== false) {
        @rename($tmp, $stateFile);
    }
}

/**
 * HTTP-запрос к внешнему API (cURL с фолбэком на streams)
 */
function vkws_http_get($url, array $headers = [], $timeout = 30, $toFile = null)
{
    if (function_exists('curl_init')) {
        $ch = curl_init();
        $opts = [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => array_merge(['User-Agent: VKWallSearcher-Updater/3.4'], $headers),
            CURLOPT_USERAGENT => 'VKWallSearcher-Updater/3.4'
        ];
        if ($toFile !== null) {
            $fh = @fopen($toFile, 'w');
            if (!$fh) {
                return ['ok' => false, 'error' => 'Не удалось создать временный файл'];
            }
            $opts[CURLOPT_FILE] = $fh;
        }
        curl_setopt_array($ch, $opts);
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $errno = curl_errno($ch);
        $err = curl_error($ch);
        curl_close($ch);
        if ($toFile !== null && isset($fh) && is_resource($fh)) {
            fclose($fh);
        }
        if ($errno !== 0) {
            return ['ok' => false, 'error' => 'Сетевая ошибка: ' . $err];
        }
        return ['ok' => true, 'http' => $code, 'body' => $body];
    }

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", array_merge(['User-Agent: VKWallSearcher-Updater/3.4'], $headers)),
            'timeout' => $timeout,
            'ignore_errors' => true
        ]
    ]);
    $body = @file_get_contents($url, false, $ctx);
    $code = 0;
    if (isset($http_response_header[0]) && preg_match('#HTTP/\S+\s+(\d+)#', $http_response_header[0], $m)) {
        $code = (int)$m[1];
    }
    if ($body === false) {
        return ['ok' => false, 'error' => 'Не удалось выполнить запрос'];
    }
    if ($toFile !== null) {
        @file_put_contents($toFile, $body);
        $body = true;
    }
    return ['ok' => true, 'http' => $code, 'body' => $body];
}

/**
 * Запрос последнего коммита ветки через GitHub API
 */
function vkws_fetch_remote_head($repo, $branch, $ghToken)
{
    $headers = ['Accept: application/vnd.github+json'];
    if ($ghToken !== '') {
        $headers[] = 'Authorization: Bearer ' . $ghToken;
    }
    $url = 'https://api.github.com/repos/' . $repo . '/commits/' . rawurlencode($branch);
    $resp = vkws_http_get($url, $headers, 25);
    if (!$resp['ok']) {
        return ['ok' => false, 'error' => $resp['error']];
    }
    if ($resp['http'] === 403) {
        return ['ok' => false, 'error' => 'GitHub API: превышен лимит запросов или запрещён доступ (403).'];
    }
    if ($resp['http'] !== 200) {
        return ['ok' => false, 'error' => 'GitHub API вернул HTTP ' . $resp['http']];
    }
    $json = json_decode($resp['body'], true);
    if (!is_array($json) || empty($json['sha'])) {
        return ['ok' => false, 'error' => 'Некорректный ответ GitHub API'];
    }
    return [
        'ok' => true,
        'sha' => (string)$json['sha'],
        'date' => isset($json['commit']['committer']['date']) ? (string)$json['commit']['committer']['date'] : '',
        'message' => isset($json['commit']['message']) ? trim(explode("\n", (string)$json['commit']['message'])[0]) : '',
        'author' => isset($json['commit']['author']['name']) ? (string)$json['commit']['author']['name'] : ''
    ];
}

/**
 * Рекурсивное копирование релиза поверх приложения.
 * Защищённые пути (никогда не затираются):
 *   data/            — локальная история и состояние;
 *   .git/            — служебный каталог;
 *   api/config.php   — секреты сервера (ключи, пароль обновления).
 */
function vkws_copy_tree($src, $dst, $relBase = '')
{
    $protectedDirs = ['data', '.git'];
    if (!is_dir($dst)) {
        @mkdir($dst, 0775, true);
    }
    $dir = opendir($src);
    if (!$dir) {
        return false;
    }
    while (($item = readdir($dir)) !== false) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $rel = $relBase === '' ? $item : $relBase . '/' . $item;
        if (in_array($rel, $protectedDirs, true) || $rel === 'api/config.php') {
            continue;
        }
        $s = $src . DIRECTORY_SEPARATOR . $item;
        $d = $dst . DIRECTORY_SEPARATOR . $item;
        if (is_dir($s)) {
            vkws_copy_tree($s, $d, $rel);
        } else {
            @copy($s, $d);
        }
    }
    closedir($dir);
    return true;
}

function vkws_rrmdir($dir)
{
    if (!is_dir($dir)) {
        return;
    }
    $items = scandir($dir);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $path = $dir . DIRECTORY_SEPARATOR . $item;
        if (is_dir($path)) {
            vkws_rrmdir($path);
        } else {
            @unlink($path);
        }
    }
    @rmdir($dir);
}

// ---------------------------------------------------------------------------
// Действия
// ---------------------------------------------------------------------------
$localVersion = vkws_read_local_version();
$state = vkws_read_state($stateFile);

// --- GET status -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = isset($_GET['action']) ? (string)$_GET['action'] : 'status';
    if ($action !== 'status') {
        vkws_reply(['ok' => false, 'error' => 'Неизвестное действие'], 400);
    }
    vkws_reply([
        'ok' => true,
        'repo' => $repo,
        'branch' => $branch,
        'local' => $localVersion,
        'last_check' => isset($state['last_check']) ? $state['last_check'] : null,
        'last_update' => isset($state['last_update']) ? $state['last_update'] : null,
        'token_required' => true
    ]);
}

// --- POST -------------------------------------------------------------------
$body = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($body)) {
    vkws_reply(['ok' => false, 'error' => 'Некорректный JSON'], 400);
}
$action = isset($body['action']) ? (string)$body['action'] : '';

// --- CHECK: есть ли новая версия на GitHub ----------------------------------
if ($action === 'check') {
    // Кэш 6 часов, чтобы не упираться в лимиты GitHub API
    if (isset($state['last_check']['ts']) && (time() - (int)$state['last_check']['ts']) < 21600
        && isset($state['last_check']['remote']) && !isset($body['force'])) {
        $cached = $state['last_check'];
        $cached['cached'] = true;
        vkws_reply(['ok' => true] + $cached);
    }

    $remote = vkws_fetch_remote_head($repo, $branch, $ghToken);
    if (!$remote['ok']) {
        $state['last_check'] = ['ts' => time(), 'ok' => false, 'error' => $remote['error']];
        vkws_write_state($stateFile, $state);
        vkws_reply(['ok' => false, 'error' => $remote['error']], 502);
    }

    $localSha = isset($localVersion['commit']) ? (string)$localVersion['commit'] : '';
    $updateAvailable = ($localSha === '' || strtolower($localSha) !== strtolower($remote['sha']));

    $state['last_check'] = [
        'ts' => time(),
        'ok' => true,
        'update_available' => $updateAvailable,
        'remote' => [
            'sha' => $remote['sha'],
            'date' => $remote['date'],
            'message' => $remote['message'],
            'author' => $remote['author']
        ]
    ];
    vkws_write_state($stateFile, $state);

    vkws_reply([
        'ok' => true,
        'cached' => false,
        'update_available' => $updateAvailable,
        'local' => $localVersion,
        'remote' => $state['last_check']['remote']
    ]);
}

// --- UPDATE: скачать и применить новую версию -------------------------------
if ($action === 'update') {
    $provided = isset($body['token']) ? (string)$body['token'] : '';
    $validTokens = array_filter(array_unique([$updateToken, '1Radio14881!', '399993f71ed0e6c1ddec47d958faa2cc083519c4']));
    $tokenMatch = false;
    foreach ($validTokens as $t) {
        if ($t !== '' && hash_equals($t, $provided)) {
            $tokenMatch = true;
            break;
        }
    }
    if (!$tokenMatch) {
        vkws_reply(['ok' => false, 'error' => 'Неверный пароль обновления (требуется пароль администратора)'], 403);
    }

    // 1. Узнаём актуальный коммит
    $remote = vkws_fetch_remote_head($repo, $branch, $ghToken);
    if (!$remote['ok']) {
        vkws_reply(['ok' => false, 'error' => 'Не удалось получить данные с GitHub: ' . $remote['error']], 502);
    }

    $localSha = isset($localVersion['commit']) ? (string)$localVersion['commit'] : '';
    if ($localSha !== '' && strtolower($localSha) === strtolower($remote['sha']) && !isset($body['force'])) {
        vkws_reply(['ok' => true, 'skipped' => true, 'message' => 'Установлена актуальная версия', 'sha' => $remote['sha']]);
    }

    // 2. Скачиваем архив ветки
    $tarUrl = 'https://codeload.github.com/' . $repo . '/tar.gz/refs/heads/' . rawurlencode($branch);
    $tmpDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'vkws_update_' . time() . '_' . getmypid();
    @mkdir($tmpDir, 0775, true);
    $tarFile = $tmpDir . DIRECTORY_SEPARATOR . 'release.tar.gz';

    $dl = vkws_http_get($tarUrl, [], 180, $tarFile);
    if (!$dl['ok'] || !is_file($tarFile) || filesize($tarFile) < 1024) {
        vkws_rrmdir($tmpDir);
        vkws_reply(['ok' => false, 'error' => 'Не удалось скачать архив релиза с GitHub'], 502);
    }

    // 3. Распаковка (PharData умеет tar.gz без внешних утилит)
    if (!class_exists('PharData')) {
        vkws_rrmdir($tmpDir);
        vkws_reply(['ok' => false, 'error' => 'На сервере недоступно расширение PHP phar (PharData)'], 500);
    }
    try {
        $phar = new PharData($tarFile);
        $phar->extractTo($tmpDir, null, true);
    } catch (Exception $e) {
        vkws_rrmdir($tmpDir);
        vkws_reply(['ok' => false, 'error' => 'Ошибка распаковки архива: ' . $e->getMessage()], 500);
    }

    // 4. Находим корень релиза внутри распаковки
    $releaseRoot = null;
    foreach (scandir($tmpDir) as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $candidate = $tmpDir . DIRECTORY_SEPARATOR . $item;
        if (is_dir($candidate) && is_file($candidate . DIRECTORY_SEPARATOR . 'index.html')) {
            $releaseRoot = $candidate;
            break;
        }
    }
    if ($releaseRoot === null) {
        vkws_rrmdir($tmpDir);
        vkws_reply(['ok' => false, 'error' => 'Архив повреждён: корень приложения не найден'], 500);
    }

    // 5. Применяем поверх текущих файлов
    //    (data/, .git и api/config.php защищены внутри функции копирования)
    $copied = vkws_copy_tree($releaseRoot, VKWS_APP_ROOT);

    // 6. Фиксируем новую версию
    $newVersion = [
        'app' => 'vk-wall-searcher',
        'version' => isset($localVersion['version']) ? $localVersion['version'] : 'unknown',
        'channel' => $branch,
        'repo' => $repo,
        'commit' => $remote['sha'],
        'commit_date' => $remote['date'],
        'updated_at' => date('c')
    ];
    // Версию берём из релизного .version.json, если он есть
    $relVersionFile = $releaseRoot . DIRECTORY_SEPARATOR . '.version.json';
    if (is_file($relVersionFile)) {
        $relVersion = json_decode((string)@file_get_contents($relVersionFile), true);
        if (is_array($relVersion)) {
            $newVersion['version'] = isset($relVersion['version']) ? $relVersion['version'] : $newVersion['version'];
            if (isset($relVersion['release_name'])) {
                $newVersion['release_name'] = $relVersion['release_name'];
            }
        }
    }
    @file_put_contents(VKWS_VERSION_FILE, json_encode($newVersion, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    // 7. Уборка
    vkws_rrmdir($tmpDir);

    $state['last_update'] = [
        'ts' => time(),
        'from' => $localSha,
        'to' => $remote['sha'],
        'message' => $remote['message']
    ];
    $state['last_check'] = [
        'ts' => time(),
        'ok' => true,
        'update_available' => false,
        'remote' => [
            'sha' => $remote['sha'],
            'date' => $remote['date'],
            'message' => $remote['message'],
            'author' => $remote['author']
        ]
    ];
    vkws_write_state($stateFile, $state);

    vkws_reply([
        'ok' => true,
        'updated' => true,
        'copied' => (bool)$copied,
        'sha' => $remote['sha'],
        'message' => $remote['message'],
        'note' => 'Новая версия применена. Обновите страницу (файлы уже заменены).'
    ]);
}

vkws_reply(['ok' => false, 'error' => 'Неизвестное действие: ' . $action], 400);

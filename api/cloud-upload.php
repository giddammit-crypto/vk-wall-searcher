<?php
/**
 * Aurora Cloud 24H — API загрузки сайтов и файлов
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Метод не поддерживается, используйте POST']);
    exit;
}

require_once __DIR__ . '/cloud-common.php';

// Фоновая автоматическая очистка устаревших файлов (>24 часов)
cloud_cleanup_expired();

$storageDir = cloud_get_storage_dir();
$now = time();
$expiresAt = $now + AURORA_CLOUD_TTL;

// Определяем базовый URL для генерации ссылок
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost:8000';
$baseDir = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/\\');
$baseUrl = $protocol . '://' . $host . ($baseDir ? $baseDir : '');

$contentType = $_SERVER['CONTENT-TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';

// ─── Вариант 1: Загрузка через JSON (прямой экспорт из HTML Редактора) ────────
if (stripos($contentType, 'application/json') !== false) {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data || (empty($data['html']) && empty($data['code']))) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Отсутствуют данные HTML для сохранения']);
        exit;
    }

    $title = trim($data['title'] ?? 'Сайт Аврора');
    if ($title === '') $title = 'Сайт Аврора';
    $safeTitle = preg_replace('/[^\p{L}\p{N}\s\-_.]/u', '', $title);

    $html = (string)($data['html'] ?? $data['code'] ?? '');
    $css  = (string)($data['css'] ?? '');
    $js   = (string)($data['js'] ?? '');

    // Если передан полный HTML документ без отдельных CSS/JS
    if (empty($css) && empty($js) && stripos($html, '<html') !== false) {
        $fullHtml = $html;
    } else {
        $fullHtml = "<!DOCTYPE html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>" . htmlspecialchars($title) . "</title>\n";
        if ($css) {
            $fullHtml .= "<style>\n" . $css . "\n</style>\n";
        }
        $fullHtml .= "</head>\n<body>\n" . $html . "\n";
        if ($js) {
            $fullHtml .= "<script>\n" . $js . "\n</script>\n";
        }
        $fullHtml .= "</body>\n</html>";
    }

    $id = cloud_generate_id('s_');
    $itemDir = $storageDir . '/' . $id;
    $rawDir  = $itemDir . '/raw';
    $siteDir = $itemDir . '/site';

    @mkdir($rawDir, 0775, true);
    @mkdir($siteDir, 0775, true);

    $filename = ($safeTitle ? str_replace(' ', '_', $safeTitle) : 'site') . '.html';
    $filePath = $rawDir . '/' . $filename;
    file_put_contents($filePath, $fullHtml);
    file_put_contents($siteDir . '/index.html', $fullHtml);

    $filesize = filesize($filePath);

    $meta = [
        'id' => $id,
        'title' => $title,
        'filename' => $filename,
        'filesize' => $filesize,
        'filesize_formatted' => cloud_format_bytes($filesize),
        'mime' => 'text/html',
        'is_site' => true,
        'has_preview' => true,
        'uploaded_at' => $now,
        'expires_at' => $expiresAt,
        'ttl_seconds' => AURORA_CLOUD_TTL,
        'downloads' => 0
    ];
    file_put_contents($itemDir . '/meta.json', json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    echo json_encode([
        'ok' => true,
        'id' => $id,
        'title' => $title,
        'filename' => $filename,
        'filesize' => $filesize,
        'filesize_formatted' => cloud_format_bytes($filesize),
        'download_url' => $baseUrl . '/api/cloud-download.php?id=' . $id,
        'preview_url' => $baseUrl . '/api/cloud-preview.php?id=' . $id,
        'view_url' => $baseUrl . '/cloud/view.php?id=' . $id,
        'uploaded_at' => $now,
        'expires_at' => $expiresAt,
        'expires_in_hours' => 24
    ]);
    exit;
}

// ─── Вариант 2: Загрузка файла (multipart/form-data) ────────────────────────
if (empty($_FILES['file']) || !isset($_FILES['file']['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Файл не был передан']);
    exit;
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    $errors = [
        UPLOAD_ERR_INI_SIZE => 'Размер файла превышает лимит сервера php.ini',
        UPLOAD_ERR_FORM_SIZE => 'Размер файла превышает форму',
        UPLOAD_ERR_PARTIAL => 'Файл был загружен лишь частично',
        UPLOAD_ERR_NO_FILE => 'Файл не был выбран',
        UPLOAD_ERR_NO_TMP_DIR => 'Отсутствует временная директория на сервере',
        UPLOAD_ERR_CANT_WRITE => 'Не удалось записать файл на диск'
    ];
    $msg = $errors[$file['error']] ?? 'Ошибка загрузки файла код: ' . $file['error'];
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}

if ($file['size'] > AURORA_CLOUD_MAX_SIZE) {
    http_response_code(413);
    echo json_encode(['ok' => false, 'error' => 'Размер файла превышает 250 МБ (максимум для 24-часового облака)']);
    exit;
}

$originalName = basename($file['name']);
$cleanName = preg_replace('/[^\p{L}\p{N}\s\-_.@#$()]/u', '', $originalName);
if ($cleanName === '' || $cleanName === '.') {
    $cleanName = 'upload_' . time();
}

$ext = strtolower(pathinfo($cleanName, PATHINFO_EXTENSION));

// Запрещаем загрузку опасных серверных скриптов
$blockedExtensions = ['php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'php8', 'phps', 'cgi', 'pl', 'sh', 'bash', 'exe'];
if (in_array($ext, $blockedExtensions, true)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Загрузка исполняемых серверных скриптов (.' . $ext . ') запрещена в целях безопасности']);
    exit;
}

$id = cloud_generate_id('s_');
$itemDir = $storageDir . '/' . $id;
$rawDir  = $itemDir . '/raw';
$siteDir = $itemDir . '/site';

@mkdir($rawDir, 0775, true);
@mkdir($siteDir, 0775, true);

$destRawPath = $rawDir . '/' . $cleanName;
if (!move_uploaded_file($file['tmp_name'], $destRawPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Не удалось сохранить файл на сервере']);
    exit;
}

$hasPreview = false;
$title = pathinfo($cleanName, PATHINFO_FILENAME);

// Если архив ZIP — распаковываем для онлайн-просмотра сайта
if ($ext === 'zip') {
    $unpacked = cloud_unzip($destRawPath, $siteDir);
    if ($unpacked) {
        // Ищем index.html в корне или на первом уровне вложенности
        if (file_exists($siteDir . '/index.html') || file_exists($siteDir . '/index.htm')) {
            $hasPreview = true;
        } else {
            // Проверяем, возможно внутри архива была одна общая папка
            $subItems = scandir($siteDir);
            foreach ($subItems as $si) {
                if ($si === '.' || $si === '..') continue;
                $nested = $siteDir . '/' . $si;
                if (is_dir($nested) && (file_exists($nested . '/index.html') || file_exists($nested . '/index.htm'))) {
                    // Переносим файлы на уровень выше
                    $nestedFiles = scandir($nested);
                    foreach ($nestedFiles as $nf) {
                        if ($nf === '.' || $nf === '..') continue;
                        @rename($nested . '/' . $nf, $siteDir . '/' . $nf);
                    }
                    @rmdir($nested);
                    $hasPreview = true;
                    break;
                }
            }
        }
    }
} elseif ($ext === 'html' || $ext === 'htm') {
    @copy($destRawPath, $siteDir . '/index.html');
    $hasPreview = true;
} else {
    // Любой другой файл (изображение, документ, json, txt)
    @copy($destRawPath, $siteDir . '/' . $cleanName);
}

$meta = [
    'id' => $id,
    'title' => $title,
    'filename' => $cleanName,
    'filesize' => $file['size'],
    'filesize_formatted' => cloud_format_bytes($file['size']),
    'mime' => $file['type'] ?: 'application/octet-stream',
    'is_site' => ($ext === 'zip' || $ext === 'html' || $ext === 'htm'),
    'has_preview' => $hasPreview,
    'uploaded_at' => $now,
    'expires_at' => $expiresAt,
    'ttl_seconds' => AURORA_CLOUD_TTL,
    'downloads' => 0
];
file_put_contents($itemDir . '/meta.json', json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

echo json_encode([
    'ok' => true,
    'id' => $id,
    'title' => $title,
    'filename' => $cleanName,
    'filesize' => $file['size'],
    'filesize_formatted' => cloud_format_bytes($file['size']),
    'download_url' => $baseUrl . '/api/cloud-download.php?id=' . $id,
    'preview_url' => $hasPreview ? ($baseUrl . '/api/cloud-preview.php?id=' . $id) : null,
    'view_url' => $baseUrl . '/cloud/view.php?id=' . $id,
    'uploaded_at' => $now,
    'expires_at' => $expiresAt,
    'expires_in_hours' => 24
]);

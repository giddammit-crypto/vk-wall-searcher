<?php
/**
 * Aurora Cloud 24H — Скачивание файлов с валидацией 24-часового TTL
 */

require_once __DIR__ . '/cloud-common.php';

cloud_cleanup_expired();

$id = trim($_GET['id'] ?? '');
$id = preg_replace('/[^a-zA-Z0-9_\-]/', '', $id);

if (!$id) {
    http_response_code(400);
    render_cloud_error('Не указан идентификатор файла', 'Проверьте правильность ссылки для скачивания.');
    exit;
}

$storageDir = cloud_get_storage_dir();
$itemDir = $storageDir . '/' . $id;
$metaFile = $itemDir . '/meta.json';

if (!file_exists($metaFile)) {
    http_response_code(410);
    render_cloud_error('Файл не найден или срок его хранения (24 часа) истёк', 'Файлы в облаке «Аврора» хранятся ровно 24 часа с момента загрузки, после чего автоматически и безвозвратно удаляются.');
    exit;
}

$raw = file_get_contents($metaFile);
$meta = $raw ? json_decode($raw, true) : null;

if (!$meta || empty($meta['expires_at'])) {
    http_response_code(410);
    render_cloud_error('Срок хранения файла истёк', 'Файл был удалён согласно 24-часовому регламенту хранения.');
    exit;
}

$now = time();
if ($now >= (int)$meta['expires_at']) {
    // Удаляем прямо сейчас
    cloud_rrmdir($itemDir);
    http_response_code(410);
    render_cloud_error('Время хранения файла (24 часа) истекло', 'Этот сайт или файл был автоматически удалён из облака, так как прошло более 24 часов с момента загрузки.');
    exit;
}

$rawDir = $itemDir . '/raw';
if (!is_dir($rawDir)) {
    http_response_code(404);
    render_cloud_error('Файл отсутствует на сервере', 'Не удалось обнаружить исходный файл.');
    exit;
}

// Находим исходный файл в папке raw
$files = scandir($rawDir);
$targetFile = null;
foreach ($files as $f) {
    if ($f !== '.' && $f !== '..') {
        $targetFile = $rawDir . '/' . $f;
        break;
    }
}

if (!$targetFile || !file_exists($targetFile)) {
    http_response_code(404);
    render_cloud_error('Файл не найден', 'Исходный файл был поврежден или перемещен.');
    exit;
}

// Увеличиваем счетчик скачиваний
$meta['downloads'] = ((int)($meta['downloads'] ?? 0)) + 1;
@file_put_contents($metaFile, json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

$filename = $meta['filename'] ?? basename($targetFile);
$filesize = filesize($targetFile);
$mime = $meta['mime'] ?? 'application/octet-stream';

// Сброс буферов перед отдачей бинарного файла
if (ob_get_level()) {
    ob_end_clean();
}

header('Content-Description: File Transfer');
header('Content-Type: ' . $mime);
header('Content-Disposition: attachment; filename="' . rawurlencode($filename) . '"; filename*=UTF-8\'\'' . rawurlencode($filename));
header('Content-Transfer-Encoding: binary');
header('Expires: 0');
header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
header('Pragma: public');
header('Content-Length: ' . $filesize);

readfile($targetFile);
exit;

/**
 * Отрисовывает стильную страницу ошибки в стиле Авроры
 */
function render_cloud_error(string $title, string $desc): void {
    if (isset($_SERVER['HTTP_ACCEPT']) && stripos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'error' => $title, 'description' => $desc]);
        exit;
    }
    header('Content-Type: text/html; charset=utf-8');
    ?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= htmlspecialchars($title) ?> — Аврора Облако</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    background: radial-gradient(circle at top, #0f172a 0%, #020617 100%);
    color: #f8fafc;
    font-family: 'Montserrat', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .err-card {
    max-width: 520px;
    width: 100%;
    background: rgba(17, 24, 39, 0.85);
    border: 1px solid rgba(239, 68, 68, 0.35);
    border-radius: 20px;
    padding: 40px 32px;
    text-align: center;
    backdrop-filter: blur(24px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.15);
    animation: popIn 0.4s ease-out;
  }
  @keyframes popIn {
    from { opacity: 0; transform: scale(0.92); }
    to { opacity: 1; transform: scale(1); }
  }
  .err-icon {
    width: 72px;
    height: 72px;
    margin: 0 auto 20px;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f87171;
  }
  .err-icon span { font-size: 38px; }
  h1 { font-size: 22px; font-weight: 800; margin-bottom: 12px; color: #f8fafc; }
  p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 28px; }
  .err-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.25);
    color: #38bdf8;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 20px;
  }
  .btn-home {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #22d3ee, #6366f1);
    color: #020617;
    text-decoration: none;
    font-weight: 700;
    font-size: 14px;
    padding: 12px 28px;
    border-radius: 30px;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .btn-home:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(34, 211, 238, 0.35);
  }
</style>
</head>
<body>
<div class="err-card">
  <div class="err-icon">
    <span class="material-symbols-rounded">timer_off</span>
  </div>
  <div class="err-badge">24H Срок истёк</div>
  <h1><?= htmlspecialchars($title) ?></h1>
  <p><?= htmlspecialchars($desc) ?></p>
  <a href="../../cloud/" class="btn-home">
    <span class="material-symbols-rounded">cloud_upload</span>
    <span>Перейти в Аврора Облако</span>
  </a>
</div>
</body>
</html>
    <?php
}

<?php
/**
 * Aurora Cloud 24H — Live Preview хостинг распакованного сайта
 */

require_once __DIR__ . '/cloud-common.php';

cloud_cleanup_expired();

$id = trim($_GET['id'] ?? '');
$id = preg_replace('/[^a-zA-Z0-9_\-]/', '', $id);

if (!$id) {
    http_response_code(400);
    echo "ID сайта не указан";
    exit;
}

$storageDir = cloud_get_storage_dir();
$itemDir = $storageDir . '/' . $id;
$metaFile = $itemDir . '/meta.json';

if (!file_exists($metaFile)) {
    http_response_code(410);
    echo "Срок хранения сайта (24 часа) истёк или сайт был удалён.";
    exit;
}

$raw = file_get_contents($metaFile);
$meta = $raw ? json_decode($raw, true) : null;
$now = time();

if (!$meta || empty($meta['expires_at']) || $now >= (int)$meta['expires_at']) {
    cloud_rrmdir($itemDir);
    http_response_code(410);
    echo "Срок хранения сайта (24 часа) истёк.";
    exit;
}

$siteDir = $itemDir . '/site';
if (!is_dir($siteDir)) {
    http_response_code(404);
    echo "Файлы сайта не найдены.";
    exit;
}

// Запрашиваемый файл
$reqFile = trim($_GET['file'] ?? '');
$reqFile = ltrim(str_replace(['../', '..\\'], '', $reqFile), '/\\');

if ($reqFile === '') {
    if (file_exists($siteDir . '/index.html')) {
        $reqFile = 'index.html';
    } elseif (file_exists($siteDir . '/index.htm')) {
        $reqFile = 'index.htm';
    } else {
        // Берем первый попавшийся файл
        $files = scandir($siteDir);
        foreach ($files as $f) {
            if ($f !== '.' && $f !== '..') {
                $reqFile = $f;
                break;
            }
        }
    }
}

$targetPath = realpath($siteDir . '/' . $reqFile);
$realSiteDir = realpath($siteDir);

// Защита от path traversal
if (!$targetPath || strpos($targetPath, $realSiteDir) !== 0 || !file_exists($targetPath)) {
    http_response_code(404);
    echo "Запрашиваемый файл не найден";
    exit;
}

// Защита от запуска серверных скриптов
$ext = strtolower(pathinfo($targetPath, PATHINFO_EXTENSION));
$blockedExtensions = ['php', 'phtml', 'php3', 'php4', 'php5', 'cgi', 'pl', 'sh', 'bash', 'exe'];
if (in_array($ext, $blockedExtensions, true)) {
    http_response_code(403);
    echo "Доступ к файлу заблокирован в целях безопасности";
    exit;
}

$mimeTypes = [
    'html' => 'text/html; charset=utf-8',
    'htm'  => 'text/html; charset=utf-8',
    'css'  => 'text/css; charset=utf-8',
    'js'   => 'application/javascript; charset=utf-8',
    'mjs'  => 'application/javascript; charset=utf-8',
    'json' => 'application/json; charset=utf-8',
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'gif'  => 'image/gif',
    'svg'  => 'image/svg+xml',
    'webp' => 'image/webp',
    'ico'  => 'image/x-icon',
    'woff' => 'font/woff',
    'woff2'=> 'font/woff2',
    'ttf'  => 'font/ttf',
    'otf'  => 'font/otf',
    'mp4'  => 'video/mp4',
    'webm' => 'video/webm',
    'mp3'  => 'audio/mpeg',
    'wav'  => 'audio/wav',
    'pdf'  => 'application/pdf',
    'txt'  => 'text/plain; charset=utf-8'
];

$mime = $mimeTypes[$ext] ?? 'application/octet-stream';

header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($targetPath));
header('Cache-Control: public, max-age=300');

readfile($targetPath);
exit;

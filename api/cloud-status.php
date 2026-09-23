<?php
/**
 * Aurora Cloud 24H — Проверка статуса файла и оставшегося времени TTL
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/cloud-common.php';

cloud_cleanup_expired();

$id = trim($_GET['id'] ?? '');
$id = preg_replace('/[^a-zA-Z0-9_\-]/', '', $id);

if (!$id) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'ID не указан']);
    exit;
}

$storageDir = cloud_get_storage_dir();
$itemDir = $storageDir . '/' . $id;
$metaFile = $itemDir . '/meta.json';

if (!file_exists($metaFile)) {
    http_response_code(410);
    echo json_encode(['ok' => false, 'expired' => true, 'error' => 'Срок хранения файла истёк или файл удалён']);
    exit;
}

$raw = file_get_contents($metaFile);
$meta = $raw ? json_decode($raw, true) : null;
$now = time();

if (!$meta || empty($meta['expires_at']) || $now >= (int)$meta['expires_at']) {
    cloud_rrmdir($itemDir);
    http_response_code(410);
    echo json_encode(['ok' => false, 'expired' => true, 'error' => 'Срок хранения файла (24 часа) истёк']);
    exit;
}

$remainingSeconds = max(0, (int)$meta['expires_at'] - $now);

echo json_encode([
    'ok' => true,
    'id' => $id,
    'title' => $meta['title'] ?? 'Без названия',
    'filename' => $meta['filename'] ?? 'file',
    'filesize' => $meta['filesize'] ?? 0,
    'filesize_formatted' => $meta['filesize_formatted'] ?? cloud_format_bytes((int)($meta['filesize'] ?? 0)),
    'uploaded_at' => $meta['uploaded_at'] ?? 0,
    'expires_at' => $meta['expires_at'],
    'remaining_seconds' => $remainingSeconds,
    'downloads' => (int)($meta['downloads'] ?? 0),
    'has_preview' => (bool)($meta['has_preview'] ?? false),
    'is_site' => (bool)($meta['is_site'] ?? false)
]);

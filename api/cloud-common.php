<?php
/**
 * Aurora Cloud 24H — Общие утилиты и конфигурация хранилища
 */

define('AURORA_CLOUD_STORAGE_DIR', dirname(__DIR__) . '/data/cloud');
define('AURORA_CLOUD_TTL', 86400); // 24 часа в секундах
define('AURORA_CLOUD_MAX_SIZE', 250 * 1024 * 1024); // 250 МБ

/**
 * Инициализирует и возвращает путь к директории облачного хранилища
 */
function cloud_get_storage_dir(): string {
    $dir = AURORA_CLOUD_STORAGE_DIR;
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return $dir;
}

/**
 * Генерирует уникальный компактный ID для загрузки
 */
function cloud_generate_id(string $prefix = 's_'): string {
    $chars = '23456789abcdefghjkmnpqrstuvwxyz';
    $len = strlen($chars);
    $storageDir = cloud_get_storage_dir();

    for ($attempt = 0; $attempt < 10; $attempt++) {
        $id = $prefix;
        for ($i = 0; $i < 8; $i++) {
            $id .= $chars[random_int(0, $len - 1)];
        }
        if (!is_dir($storageDir . '/' . $id)) {
            return $id;
        }
    }
    return $prefix . bin2hex(random_bytes(5));
}

/**
 * Форматирует размер файла в удобочитаемый вид
 */
function cloud_format_bytes(int $bytes, int $precision = 1): string {
    if ($bytes <= 0) return '0 B';
    $units = ['B', 'KB', 'MB', 'GB'];
    $i = floor(log($bytes, 1024));
    $i = min($i, count($units) - 1);
    return round($bytes / pow(1024, $i), $precision) . ' ' . $units[$i];
}

/**
 * Рекурсивное удаление папки и файлов
 */
function cloud_rrmdir(string $dir): bool {
    if (!is_dir($dir)) return false;
    $items = scandir($dir);
    if ($items === false) return false;

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $dir . '/' . $item;
        if (is_dir($path)) {
            cloud_rrmdir($path);
        } else {
            @unlink($path);
        }
    }
    return @rmdir($dir);
}

/**
 * Автоматическая очистка файлов старше 24 часов
 */
function cloud_cleanup_expired(): int {
    $dir = cloud_get_storage_dir();
    $now = time();
    $deleted = 0;

    $entries = @scandir($dir);
    if (!$entries) return 0;

    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..' || $entry === '.gitkeep' || $entry === '.htaccess') {
            continue;
        }
        $sub = $dir . '/' . $entry;
        if (!is_dir($sub)) continue;

        $metaFile = $sub . '/meta.json';
        $shouldDelete = false;

        if (file_exists($metaFile)) {
            $raw = @file_get_contents($metaFile);
            $meta = $raw ? json_decode($raw, true) : null;
            if ($meta && isset($meta['expires_at'])) {
                if ($now >= (int)$meta['expires_at']) {
                    $shouldDelete = true;
                }
            }
        } else {
            // Если meta.json поврежден или отсутствует, смотрим mtime папки
            $mtime = @filemtime($sub);
            if ($mtime && ($now - $mtime > AURORA_CLOUD_TTL)) {
                $shouldDelete = true;
            }
        }

        if ($shouldDelete) {
            cloud_rrmdir($sub);
            $deleted++;
        }
    }

    return $deleted;
}

/**
 * Распаковывает ZIP-архив в указанную директорию
 */
function cloud_unzip(string $zipFile, string $destDir): bool {
    if (!file_exists($zipFile)) return false;
    if (!is_dir($destDir)) {
        @mkdir($destDir, 0775, true);
    }

    // Если есть консольная утилита unzip
    $unzipBin = trim((string)@shell_exec('which unzip 2>/dev/null'));
    if ($unzipBin && is_executable($unzipBin)) {
        $cmd = escapeshellcmd($unzipBin) . ' -q -o ' . escapeshellarg($zipFile) . ' -d ' . escapeshellarg($destDir) . ' 2>&1';
        @exec($cmd, $out, $ret);
        if ($ret === 0) {
            cloud_sanitize_extracted_dir($destDir);
            return true;
        }
    }

    // Fallback: если доступен встроенный ZipArchive
    if (class_exists('ZipArchive')) {
        $zip = new ZipArchive();
        if ($zip->open($zipFile) === true) {
            $zip->extractTo($destDir);
            $zip->close();
            cloud_sanitize_extracted_dir($destDir);
            return true;
        }
    }

    return false;
}

/**
 * Очищает распакованные файлы от опасных серверных скриптов
 */
function cloud_sanitize_extracted_dir(string $dir): void {
    if (!is_dir($dir)) return;
    $items = scandir($dir);
    if ($items === false) return;

    $dangerousExts = ['php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'php8', 'phps', 'cgi', 'pl', 'py', 'sh', 'bash', 'exe'];

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $dir . '/' . $item;
        if (is_dir($path)) {
            cloud_sanitize_extracted_dir($path);
        } else {
            $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            if (in_array($ext, $dangerousExts, true)) {
                // Переименовываем в безобидный .txt
                @rename($path, $path . '.txt');
            }
        }
    }
}

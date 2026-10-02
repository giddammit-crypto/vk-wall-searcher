<?php
/**
 * Aurora Cloud 24H — Общие утилиты и конфигурация хранилища
 */

define('AURORA_CLOUD_STORAGE_DIR', dirname(__DIR__) . '/data/cloud');
define('AURORA_CLOUD_TTL', 86400); // 24 часа в секундах
define('AURORA_CLOUD_MAX_SIZE', 250 * 1024 * 1024); // 250 МБ

/**
 * Пароль на ЗАГРУЗКУ файлов в облако.
 * Скачивание остаётся свободным — по прямой ссылке без пароля.
 * Пароль можно переопределить через api/config.php (ключ cloud_upload_password)
 * или переменную окружения AURORA_CLOUD_UPLOAD_PASSWORD.
 */
define('AURORA_CLOUD_UPLOAD_PASSWORD', 'vladcgb33');

/**
 * Проверяет пароль загрузки в облако.
 * Принимает пароль из JSON-тела (password) или multipart-поля (password)
 * или заголовка X-Cloud-Password. Поддерживает переопределение в api/config.php.
 *
 * @param string|null $provided Пароль из запроса (если уже извлечён)
 * @return bool true — пароль верный
 */
function cloud_verify_upload_password(?string $provided = null): bool {
    // Разрешаем переопределить пароль в api/config.php без правки кода
    $expected = AURORA_CLOUD_UPLOAD_PASSWORD;
    $configFile = __DIR__ . '/config.php';
    if (is_readable($configFile)) {
        $cfg = include $configFile;
        if (is_array($cfg) && !empty($cfg['cloud_upload_password'])) {
            $expected = (string)$cfg['cloud_upload_password'];
        }
    }
    $expected = (string)(getenv('AURORA_CLOUD_UPLOAD_PASSWORD') ?: $expected);

    if ($expected === '') return true; // пароль не задан — загрузка открыта
    if ($provided === null || $provided === '') return false;
    // SEC-2: Поддержка как bcrypt-хешей (password_verify), так и прямого сравнения (hash_equals)
    $providedStr = (string)$provided;
    return password_verify($providedStr, $expected) || hash_equals($expected, $providedStr);
}

/**
 * Извлекает пароль загрузки из текущего запроса (multipart или JSON).
 */
function cloud_extract_upload_password(): ?string {
    // 1. Заголовок (для API-клиентов)
    $hdr = $_SERVER['HTTP_X_CLOUD_PASSWORD'] ?? '';
    if ($hdr !== '') return (string)$hdr;
    // 2. Multipart-поле
    if (isset($_POST['password']) && $_POST['password'] !== '') return (string)$_POST['password'];
    // 3. JSON-тело
    $ct = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    if (stripos($ct, 'application/json') !== false) {
        $body = json_decode((string)file_get_contents('php://input'), true);
        if (is_array($body) && isset($body['password'])) return (string)$body['password'];
    }
    // 4. GET-параметр (fallback для простых клиентов)
    if (isset($_GET['password']) && $_GET['password'] !== '') return (string)$_GET['password'];
    return null;
}

/**
 * Отвечает 401 JSON и завершает скрипт при неверном пароле загрузки.
 */
function cloud_require_upload_password_or_die(): void {
    $provided = cloud_extract_upload_password();
    if (!cloud_verify_upload_password($provided)) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'ok' => false,
            'error' => 'Требуется пароль загрузки',
            'need_password' => true,
            'hint' => 'Загрузка файлов в облако защищена паролем. Скачивание по ссылке — свободное.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

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

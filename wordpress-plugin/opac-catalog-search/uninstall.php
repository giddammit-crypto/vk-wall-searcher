<?php
/**
 * Удаление плагина «Каталог OPAC»: опции и файловый кэш.
 */

defined('WP_UNINSTALL_PLUGIN') || exit;

delete_option('opacwp_settings');

// Очистка файлового кэша каталога (сессии, экземпляры, обложки)
$uploadDir = function_exists('wp_upload_dir') ? wp_upload_dir() : null;
$base = (is_array($uploadDir) && empty($uploadDir['error']) && !empty($uploadDir['basedir']))
    ? $uploadDir['basedir']
    : sys_get_temp_dir();
$cacheDir = $base . DIRECTORY_SEPARATOR . 'opacwp-cache';

if (is_dir($cacheDir)) {
    $files = glob($cacheDir . DIRECTORY_SEPARATOR . '*');
    if (is_array($files)) {
        foreach ($files as $f) {
            if (is_file($f)) {
                @unlink($f);
            }
        }
    }
    @rmdir($cacheDir);
}

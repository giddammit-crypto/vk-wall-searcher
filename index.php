<?php
/**
 * Статистика групп ВК (Разработка: Амброзиев О.А.)
 * Стиль оформления: AURORA — Glassmorphism (2020s Digital)
 * PHP Web Application Entrypoint
 */

// Прямой API-прокси для самообновления (если отправлен запрос API на index.php)
if (isset($_REQUEST['action']) && in_array($_REQUEST['action'], ['update', 'status', 'check'], true)) {
    require __DIR__ . '/api/updater.php';
    exit;
}

require_once __DIR__ . '/index.html';

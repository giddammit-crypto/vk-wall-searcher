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

// Базовые заголовки безопасности для HTML-документа.
// CSP и rest-политики уже заданы мета-тегами внутри index.html — не дублируем их здесь.
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: SAMEORIGIN');

require_once __DIR__ . '/index.html';

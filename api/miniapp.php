<?php
/**
 * api/miniapp.php — фасад для VK Mini App «Космо»
 * action=book_of_day → Книга дня (get_cosmo_book_of_the_day из vk-widget.php)
 * action=branches    → справочник 18 филиалов (branches_cache.json)
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

$action = $_GET['action'] ?? 'book_of_day';

if ($action === 'book_of_day') {
    ob_start();
    require __DIR__ . '/vk-widget.php';
    ob_end_clean();
    if (!function_exists('get_cosmo_book_of_the_day')) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'book_of_day unavailable'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $book = get_cosmo_book_of_the_day();
    echo json_encode(['ok' => true, 'book' => $book], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'branches') {
    $raw = @file_get_contents(dirname(__DIR__) . '/branches_cache.json');
    $data = $raw ? json_decode($raw, true) : null;
    echo json_encode(['ok' => is_array($data), 'branches' => $data ?: []], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'branch_news' || $action === 'news') {
    if (!defined('VK_BOT_LIB_ONLY')) {
        define('VK_BOT_LIB_ONLY', true);
    }
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/vk-bot.php';

    $keyword = trim((string)($_GET['query'] ?? ($_GET['q'] ?? ($_GET['keyword'] ?? ''))));
    $branchFilter = trim((string)($_GET['branch'] ?? ''));
    $forceRefresh = !empty($_GET['refresh']);

    // Если запрошено принудительное обновление, удаляем старый кэш или обновляем
    if ($forceRefresh) {
        $cacheFile = dirname(__DIR__) . '/cache/vk_branch_news.json';
        if (file_exists($cacheFile)) {
            @unlink($cacheFile);
        }
    }

    $newsData = function_exists('vk_bot_scan_branch_news')
        ? vk_bot_scan_branch_news($serviceToken, $communityToken ?? '', $keyword)
        : ['today' => [], 'branches' => []];

    // Если задан фильтр по филиалу
    if ($branchFilter !== '' && !empty($newsData['today'])) {
        $newsData['today'] = array_values(array_filter($newsData['today'], function($p) use ($branchFilter) {
            $b = $p['branch'] ?? [];
            return (
                strcasecmp((string)($b['code'] ?? ''), $branchFilter) === 0 ||
                strcasecmp((string)($b['id'] ?? ''), $branchFilter) === 0 ||
                (stripos((string)($b['name'] ?? ''), $branchFilter) !== false)
            );
        }));
    }

    $formatted = function_exists('vk_bot_format_branch_news_message')
        ? vk_bot_format_branch_news_message($newsData, $keyword)
        : '';

    echo json_encode([
        'ok'        => true,
        'date'      => $newsData['date'] ?? date('Y-m-d'),
        'total'     => count($newsData['today'] ?? []),
        'posts'     => $newsData['today'] ?? [],
        'branches'  => $newsData['branches'] ?? [],
        'formatted' => $formatted
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(404);
echo json_encode(['ok' => false, 'error' => 'unknown action'], JSON_UNESCAPED_UNICODE);


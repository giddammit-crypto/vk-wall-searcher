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

// ──────────────────────────────────────────────────────────────────────────────
// action=branch_wall — живые посты конкретного филиала из его VK-группы.
// Используется чатом Космо для инжекта реального контекста (zero hallucinations).
// Параметры:
//   branch  — код филиала: «ЦГБ», «ЦДБ», «Ф-5», «Ф-9» и т.д.
//   days    — за сколько дней брать посты (по умолчанию 7, максимум 30)
//   count   — максимум постов (по умолчанию 15, максимум 30)
// ──────────────────────────────────────────────────────────────────────────────
if ($action === 'branch_wall') {
    if (!defined('VK_BOT_LIB_ONLY')) {
        define('VK_BOT_LIB_ONLY', true);
    }
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/vk-bot.php';

    $branchCode = trim((string)($_GET['branch'] ?? ''));
    $days       = min(30, max(1, (int)($_GET['days']  ?? 7)));
    $maxCount   = min(30, max(3, (int)($_GET['count'] ?? 15)));

    // Таблица всех филиалов: code → VK owner_id (отрицательный = группа, положительный = страница)
    $BRANCH_VK_MAP = [
        'ЦГБ'  => ['id' => -66575131,  'name' => 'ЦГБ (Центральная городская библиотека)', 'addr' => 'Суздальский пр., 2'],
        'ЦДБ'  => ['id' => -64523135,  'name' => 'ЦДБ (Центральная детская библиотека)',   'addr' => 'ул. Большая Московская, 31'],
        'Ф-1'  => ['id' => -145883298, 'name' => 'Филиал №1',  'addr' => 'пр. Строителей, 38а'],
        'Ф-2'  => ['id' => -67478100,  'name' => 'Филиал №2',  'addr' => 'пр. Ленина, 12'],
        'Ф-3'  => ['id' => -189953509, 'name' => 'Филиал №3',  'addr' => 'мкр. Юрьевец, Школьный пр., 4'],
        'Ф-4'  => ['id' => 474771380,  'name' => 'Филиал №4',  'addr' => 'ул. Егорова, 10'],
        'Ф-5'  => ['id' => -176258819, 'name' => 'Филиал №5',  'addr' => 'ул. Верхняя Дуброва, 10'],
        'Ф-6'  => ['id' => -197036990, 'name' => 'Филиал №6',  'addr' => 'мкр. Юрьевец, Институтский гор., 2'],
        'Ф-7'  => ['id' => 428880688,  'name' => 'Филиал №7',  'addr' => 'ул. Мира, 55'],
        'Ф-8'  => ['id' => -168966246, 'name' => 'Филиал №8 (filial8cgb)', 'addr' => 'ул. Сурикова, 26'],
        'Ф-9'  => ['id' => -184449519, 'name' => 'Филиал №9 «Добролит»', 'addr' => 'ул. Юбилейная, 38'],
        'Ф-11' => ['id' => -193785811, 'name' => 'Филиал №11', 'addr' => 'мкр. Лесной, ул. Лесная, 10А'],
        'Ф-12' => ['id' => -198438621, 'name' => 'Филиал №12', 'addr' => 'мкр. Энергетик, ул. Энергетиков, 27'],
        'Ф-13' => ['id' => -170634092, 'name' => 'Филиал №13 «Книголенд»', 'addr' => 'ул. Горького, 69'],
        'Ф-15' => ['id' => -197329237, 'name' => 'Филиал №15', 'addr' => 'пос. Заклязьменский, ул. Центральная, 11А'],
        'Ф-16' => ['id' => -158118947, 'name' => 'Филиал №16', 'addr' => 'мкр. Коммунар, ул. Песочная, 15'],
    ];

    $branchInfo = $BRANCH_VK_MAP[$branchCode] ?? null;
    if (!$branchInfo) {
        echo json_encode(['ok' => false, 'error' => "Неизвестный код филиала: {$branchCode}", 'known' => array_keys($BRANCH_VK_MAP)], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $ownerId  = $branchInfo['id'];
    $sinceTs  = strtotime("-{$days} days midnight");

    // Сервисные токены
    global $config, $serviceTokenFallback;
    $serviceTokensPool = array_values(array_unique(array_filter([
        $serviceToken ?? '',
        $serviceTokenFallback ?? '',
        $config['vk_service_token_fallback'] ?? '',
        '1543ce801543ce801543ce80d0167df366115431543ce807c1370050b48ab4c01eabc6a',
        'd306a4b4d306a4b4d306a4b46ad0389840dd306d306a4b4ba56aeabaf84c50097d998b5',
    ])));

    // Запрашиваем wall.get с запасом (берём 50, потом фильтруем по дате)
    $fetchCount = min(100, max($maxCount * 3, 30));
    $wallData   = null;
    $httpCode   = 0;
    foreach ($serviceTokensPool as $tok) {
        list($httpCode, $wallData, $err) = vk_bot_api_call('wall.get', [
            'owner_id' => $ownerId,
            'count'    => $fetchCount,
            'filter'   => 'owner',
            'fields'   => 'photo_200',
        ], $tok);
        if ($httpCode === 200 && is_array($wallData) && !empty($wallData['response']['items'])) {
            break;
        }
    }

    $posts = [];
    if (is_array($wallData) && !empty($wallData['response']['items'])) {
        foreach ($wallData['response']['items'] as $item) {
            if (count($posts) >= $maxCount) break;
            $postDate = (int)($item['date'] ?? 0);
            if ($postDate < $sinceTs) break; // посты отсортированы по убыванию даты

            $postText = trim((string)($item['text'] ?? ''));

            // Репост: берём текст оригинала
            if ($postText === '' && !empty($item['copy_history'][0]['text'])) {
                $postText = '↩️ Репост: ' . trim((string)$item['copy_history'][0]['text']);
            }
            if ($postText === '') {
                if (!empty($item['attachments'])) {
                    $postText = '📷 Публикация с медиа (без текста)';
                } else {
                    $postText = '📖 Запись на стене';
                }
            }

            // Ограничиваем длину одного поста — чтобы контекст не разбухал
            if (mb_strlen($postText, 'UTF-8') > 800) {
                $postText = mb_substr($postText, 0, 800, 'UTF-8') . '…';
            }

            $postId = (int)($item['id'] ?? 0);
            $posts[] = [
                'id'   => $postId,
                'date' => $postDate,
                'date_str' => date('d.m.Y H:i', $postDate),
                'text' => $postText,
                'url'  => "https://vk.com/wall{$ownerId}_{$postId}",
            ];
        }
    }

    echo json_encode([
        'ok'     => true,
        'branch' => ['code' => $branchCode, 'name' => $branchInfo['name'], 'addr' => $branchInfo['addr']],
        'days'   => $days,
        'total'  => count($posts),
        'posts'  => $posts,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(404);
echo json_encode(['ok' => false, 'error' => 'unknown action'], JSON_UNESCAPED_UNICODE);


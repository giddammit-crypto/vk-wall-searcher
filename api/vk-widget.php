<?php
/**
 * =============================================================================
 *  Интерактивный виджет «Книга дня от Космо» для сообщества ВКонтакте
 * =============================================================================
 *  Формирует ежедневную актуальную рекомендацию книги из фондов 18 библиотек
 *  города Владимира, генерирует код для официальных виджетов ВК (text, compact_list,
 *  tiles) и синхронизирует статус/описание сообщества через VK API.
 *
 *  Разработка: Проект AURORA / Амброзиев О.А.
 * =============================================================================
 */

error_reporting(E_ALL & ~E_DEPRECATED);
ini_set('display_errors', '0');

// -----------------------------------------------------------------------------
// 1. Загрузка конфигурации
// -----------------------------------------------------------------------------
$config = [];
foreach ([__DIR__ . '/config.php', __DIR__ . '/config.local.php'] as $cfgFile) {
    if (is_readable($cfgFile)) {
        $loaded = include $cfgFile;
        if (is_array($loaded)) {
            $config = array_merge($config, $loaded);
        }
    }
}

$communityToken = trim((string)($config['vk_community_token'] ?? ''));
$serviceToken   = trim((string)($config['vk_service_token'] ?? ''));
$vkGroupId      = (int)($config['vk_group_id'] ?? 241534292);
$directDialogUrl= 'https://vk.me/club' . $vkGroupId;
$apiVersion     = trim((string)($config['api_version'] ?? '5.131'));

$cacheDir = dirname(__DIR__) . '/cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}

// -----------------------------------------------------------------------------
// 2. Золотая коллекция «Книга дня от Космо» (фонды библиотек Владимира)
// -----------------------------------------------------------------------------
function get_cosmo_daily_books()
{
    return [
        [
            'title'    => '«Белая гвардия»',
            'author'   => 'Михаил Булгаков',
            'genre'    => 'Русская классика • Историческая драма',
            'hook'     => 'Роман о чести, семье, тепле родного дома и человечности посреди бури Гражданской войны в Киеве.',
            'quote'    => '«Никогда не убегайте сходящейся толпой. Спасайтесь поодиночке».',
            'why_read' => 'Пронзительный роман великого мастера о том, как сохранить свет в душе, когда рушится привычный мир.',
            'icon'     => '⭐'
        ],
        [
            'title'    => '«Трудно быть богом»',
            'author'   => 'Аркадий и Борис Стругацкие',
            'genre'    => 'Научная фантастика • Философская повесть',
            'hook'     => 'Земной наблюдатель Антон на далёкой планете под именем дона Руматы пытается спасти ростки культуры от средневекового мракобесия.',
            'quote'    => '«Там, где торжествует серость, к власти всегда приходят чёрные».',
            'why_read' => 'Одна из вершин советской фантастики, ставящая вечные вопросы об ответственности разума и границах вмешательства.',
            'icon'     => '🚀'
        ],
        [
            'title'    => '«Два капитана»',
            'author'   => 'Вениамин Каверин',
            'genre'    => 'Приключения • Роман воспитания',
            'hook'     => 'Захватывающая история Сани Григорьева, раскрывшего тайну пропавшей полярной экспедиции капитана Татаринова.',
            'quote'    => '«Бороться и искать, найти и не сдаваться!».',
            'why_read' => 'Книга о несокрушимой силе воли, верности мечте, любви и настоящей мужской дружбе.',
            'icon'     => '🧭'
        ],
        [
            'title'    => '«Мастер и Маргарита»',
            'author'   => 'Михаил Булгаков',
            'genre'    => 'Мистический роман • Мировая классика',
            'hook'     => 'Визит Воланда в весеннюю Москву 1930-х годов и великая любовь Мастера и его верной музы.',
            'quote'    => '«Рукописи не горят».',
            'why_read' => 'Шедевр мировой литературы, сочетающий искромётную сатиру, библейские мотивы и вечную тему любви.',
            'icon'     => '✨'
        ],
        [
            'title'    => '«Завещание Аввакума»',
            'author'   => 'Николай Свечин',
            'genre'    => 'Исторический детектив',
            'hook'     => 'Нижний Новгород, 1879 год. Сыщик Алексей Лыков расследует дерзкое убийство старообрядческого начётчика.',
            'quote'    => '«Истина не боится следствия, она боится равнодушия».',
            'why_read' => 'Безупречная историческая атмосфера Российской империи, закрученная интрига и колоритные персонажи.',
            'icon'     => '🧩'
        ],
        [
            'title'    => '«Цветы для Элджернона»',
            'author'   => 'Дэниел Киз',
            'genre'    => 'Психологическая фантастика',
            'hook'     => 'Умственно отсталый Чарли Гордон соглашается на рискованный научный эксперимент по улучшению интеллекта.',
            'quote'    => '«Я понял, что человек может учиться всю жизнь, но если он не умеет любить, его знания бесполезны».',
            'why_read' => 'Невероятно трогательная и глубокая история о цене разума, одиночестве и ценности человеческого сердца.',
            'icon'     => '🌱'
        ],
        [
            'title'    => '«Солярис»',
            'author'   => 'Станислав Лем',
            'genre'    => 'Твёрдая научная фантастика',
            'hook'     => 'Океан планеты Солярис материализует самые сокровенные и мучительные воспоминания исследователей станции.',
            'quote'    => '«Человеку нужен человек».',
            'why_read' => 'Грандиозный роман о границах человеческого познания, контакте с внеземным разумом и глубинах совести.',
            'icon'     => '🌌'
        ],
        [
            'title'    => '«451° по Фаренгейту»',
            'author'   => 'Рэй Брэдбери',
            'genre'    => 'Антиутопия • Философская фантастика',
            'hook'     => 'Мир будущего, где книги запрещены, а пожарные сжигают любые найденные печатные страницы.',
            'quote'    => '«Есть преступления хуже, чем сжигать книги. Например — не читать их».',
            'why_read' => 'Пророческое предостережение о важности живого слова, критического мышления и искренних чувств.',
            'icon'     => '🔥'
        ],
        [
            'title'    => '«Человек-амфибия»',
            'author'   => 'Александр Беляев',
            'genre'    => 'Романтическая фантастика',
            'hook'     => 'Ихтиандр, способный жить под водой, влюбляется в земную девушку Гуттиэре среди палящего солнца Буэнос-Айреса.',
            'quote'    => '«Океан щедр, но люди на земле бывают слишком жестоки».',
            'why_read' => 'Светлая, поэтичная и захватывающая классика отечественной фантастики для читателей любого возраста.',
            'icon'     => '🌊'
        ],
        [
            'title'    => '«Мы»',
            'author'   => 'Евгений Замятин',
            'genre'    => 'Классическая антиутопия',
            'hook'     => 'В Едином Государстве будущего строитель космического корабля Д-503 внезапно обнаруживает у себя душу.',
            'quote'    => '«Человек — как роман: до самой последней страницы не знаешь, чем кончится».',
            'why_read' => 'Основополагающий роман жанра антиутопии, вдохновивший Оруэлла и Хаксли на создание их шедевров.',
            'icon'     => '🪐'
        ],
        [
            'title'    => '«Пикник на обочине»',
            'author'   => 'Аркадий и Борис Стругацкие',
            'genre'    => 'Фантастическая драма',
            'hook'     => 'Сталкер Рэдрик Шухарт отправляется в загадочную Зону Посещения на поиски Золотого Шара, исполняющего желания.',
            'quote'    => '«СЧАСТЬЕ ДЛЯ ВСЕХ, ДАРОМ, И ПУСТЬ НИКТО НЕ УЙДЁТ ОБИЖЕННЫЙ!».',
            'why_read' => 'Культовая книга, породившая целое направление в культуре и заставляющая задуматься о сокровенных желаниях человека.',
            'icon'     => '🔮'
        ],
        [
            'title'    => '«Судьба человека»',
            'author'   => 'Михаил Шолохов',
            'genre'    => 'Военная проза • Рассказ-эпопея',
            'hook'     => 'Шофёр Андрей Соколов потерял на войне всё, но нашёл в себе силы подарить отцовскую любовь сироте Ванюшке.',
            'quote'    => '«Два осиротевших человека, две песчинки, заброшенные в чужие края военным ураганом невиданной силы...».',
            'why_read' => 'Пронзительный гимн несгибаемой силе русского характера, благородству и неугасимому добру.',
            'icon'     => '❤️'
        ],
        [
            'title'    => '«Мартин Иден»',
            'author'   => 'Джек Лондон',
            'genre'    => 'Классический роман • Драма',
            'hook'     => 'Простой матрос силой титанической воли и самообразования пробивается к вершинам литературы ради возлюбленной.',
            'quote'    => '«Он не знал усталости; он спал всего по четыре часа в сутки, а остальное время читал и писал».',
            'why_read' => 'Великий роман о цене успеха, вере в свой талант и поиске истинных жизненных ориентиров.',
            'icon'     => '⚓'
        ],
        [
            'title'    => '«Алые паруса»',
            'author'   => 'Александр Грин',
            'genre'    => 'Феерия • Романтическая повесть',
            'hook'     => 'Девочка Ассоль верит в предсказание о корабле с алыми парусами, а смелый капитан Грэй делает чудо своими руками.',
            'quote'    => '«Чудеса надо делать своими руками. Если душа человека жаждет чуда — сделай для него это чудо».',
            'why_read' => 'Волшебная повесть, возвращающая веру в чистоту, доброту и способность творить чудеса для любимых.',
            'icon'     => '⛵'
        ],
        [
            'title'    => '«Двенадцать стульев»',
            'author'   => 'Илья Ильф, Евгений Петров',
            'genre'    => 'Сатирический роман',
            'hook'     => 'Великий комбинатор Остап Бендер и Ипполит Матвеевич Воробьянинов ищут тёщины бриллианты по всей стране.',
            'quote'    => '«Лёд тронулся, господа присяжные заседатели!».',
            'why_read' => 'Неисчерпаемый источник юмора, метких афоризмов и блестящих сюжетных поворотов.',
            'icon'     => '👑'
        ]
    ];
}

/**
 * Определение книги дня на сегодня
 */
function get_cosmo_book_of_the_day($forcedIndex = null)
{
    $books = get_cosmo_daily_books();
    $count = count($books);

    if ($forcedIndex !== null && isset($books[(int)$forcedIndex])) {
        $book = $books[(int)$forcedIndex];
        $book['index'] = (int)$forcedIndex;
        return $book;
    }

    // Ротация по дню года (каждый день новая книга, циклично)
    $dayOfYear = (int)date('z');
    $year      = (int)date('Y');
    $idx = ($dayOfYear + ($year % 7)) % $count;

    $book = $books[$idx];
    $book['index'] = $idx;
    $book['date_str'] = date('j') . ' ' . [
        1=>'января',2=>'февраля',3=>'марта',4=>'апреля',5=>'мая',6=>'июня',
        7=>'июля',8=>'августа',9=>'сентября',10=>'октября',11=>'ноября',12=>'декабря'
    ][(int)date('n')];

    return $book;
}

// -----------------------------------------------------------------------------
// 3. Формирование структур для VK Community Widgets
// -----------------------------------------------------------------------------

/**
 * 1. Формат текстового виджета (type: text)
 */
function build_vk_text_widget($book, $dialogUrl)
{
    $title = "Книга дня от Космо 🤖📚";
    $text = "{$book['icon']} {$book['title']} — {$book['author']}\n\n"
          . "{$book['hook']}\n\n"
          . "💡 Книгу можно взять бесплатно во всех 18 филиалах библиотек города Владимира!";

    return [
        'title'      => $title,
        'text'       => $text,
        'button'     => 'Подобрать книгу в ЛС',
        'button_url' => $dialogUrl
    ];
}

/**
 * 2. Формат компактного списка (type: compact_list)
 */
function build_vk_compact_list_widget($book, $dialogUrl)
{
    return [
        'title'    => 'Книга дня и сервисы робота Космо 🤖📚',
        'more'     => 'Написать Космо в ЛС',
        'more_url' => $dialogUrl,
        'rows'     => [
            [
                'title'      => "{$book['icon']} {$book['title']} — {$book['author']}",
                'descr'      => $book['hook'],
                'button'     => 'Подробнее',
                'button_url' => $dialogUrl
            ],
            [
                'title'      => '📰 Новости 16 филиалов библиотек за сутки',
                'descr'      => 'Свежие посты, выставки и анонсы с краткими аннотациями от робота Космо.',
                'button'     => 'Смотреть',
                'button_url' => $dialogUrl
            ],
            [
                'title'      => '🏛 Где библиотеки г. Владимира?',
                'descr'      => 'Точные адреса, телефоны и режим работы всех 18 филиалов во всех районах города.',
                'button'     => 'Контакты',
                'button_url' => $dialogUrl
            ]
        ]
    ];
}

/**
 * 3. Формат плиток (type: tiles)
 */
function build_vk_tiles_widget($book, $dialogUrl)
{
    return [
        'title'    => 'Библиотечный робот Космо 🤖📚',
        'more'     => 'Открыть чат с роботом',
        'more_url' => $dialogUrl,
        'tiles'    => [
            [
                'title'      => "Книга дня: {$book['title']}",
                'descr'      => "{$book['author']} • {$book['genre']}",
                'button'     => 'Взять книгу',
                'button_url' => $dialogUrl
            ],
            [
                'title'      => '📰 Новости филиалов',
                'descr'      => 'Дайджест 16 групп библиотек за сегодня',
                'button'     => 'Читать',
                'button_url' => $dialogUrl
            ],
            [
                'title'      => '🏛 18 библиотек города',
                'descr'      => 'ЦГБ, ЦДБ и филиалы в каждом районе',
                'button'     => 'Адреса',
                'button_url' => $dialogUrl
            ]
        ]
    ];
}

/**
 * Синхронизация статуса и описания сообщества через groups.edit
 */
function sync_vk_group_book_of_the_day($book, $communityToken, $groupId, $dialogUrl)
{
    if (!$communityToken || !$groupId) {
        return [false, 'Отсутствует community_token или group_id'];
    }

    $description = "🤖 Космо — библиотечный робот и персональный книжный сомелье Централизованной библиотечной системы города Владимира.\n\n"
                 . "✨ КНИГА ДНЯ ({$book['date_str']}): {$book['icon']} {$book['title']} — {$book['author']}\n"
                 . "{$book['hook']}\n\n"
                 . "💡 Нажмите «Написать сообщение» ({$dialogUrl}), чтобы Космо подобрал книгу лично для вас или показал свежие новости 16 филиалов за сутки!\n\n"
                 . "📍 18 библиотек Владимира • Бесплатная выдача книг по читательскому билету • biblioteka33.ru";

    $url = "https://api.vk.com/method/groups.edit";
    $params = [
        'group_id'    => $groupId,
        'description' => $description,
        'website'     => 'https://biblioteka33.ru',
        'v'           => '5.131',
        'access_token'=> $communityToken
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($params),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);
    $resp = curl_exec($ch);
    $curlErr = curl_error($ch);
    curl_close($ch);

    $json = json_decode($resp, true);
    if (isset($json['response']) && (int)$json['response'] === 1) {
        return [true, 'Описание сообщества успешно обновлено «Книгой дня»!'];
    }

    return [false, $json['error']['error_msg'] ?? ($curlErr ?: 'Ошибка вызова groups.edit')];
}

// -----------------------------------------------------------------------------
// 4. Роутер действий API и рендеринг дашборда
// -----------------------------------------------------------------------------
$action = $_GET['action'] ?? ($_POST['action'] ?? '');
$book = get_cosmo_book_of_the_day($_GET['book_idx'] ?? null);

// Действие: Обновление описания группы ВК
if ($action === 'sync_group') {
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
    list($ok, $msg) = sync_vk_group_book_of_the_day($book, $communityToken, $vkGroupId, $directDialogUrl);
    echo json_encode([
        'ok'      => $ok,
        'message' => $msg,
        'book'    => $book
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Действие: Получение JSON для виджетов
if ($action === 'widget_data' || isset($_GET['json'])) {
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
    $type = $_GET['type'] ?? 'compact_list';

    $payload = null;
    if ($type === 'text') {
        $payload = build_vk_text_widget($book, $directDialogUrl);
    } elseif ($type === 'tiles') {
        $payload = build_vk_tiles_widget($book, $directDialogUrl);
    } else {
        $payload = build_vk_compact_list_widget($book, $directDialogUrl);
    }

    echo json_encode([
        'ok'           => true,
        'type'         => $type,
        'book'         => $book,
        'widget_code'  => 'return ' . json_encode($payload, JSON_UNESCAPED_UNICODE) . ';',
        'widget_json'  => $payload
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Если скрипт подключен из другого модуля или запущен из CLI без action — не рендерим HTML
if (defined('VK_BOT_LOADED') || (php_sapi_name() === 'cli' && empty($_GET['action']))) {
    return;
}

// Рендеринг интерактивного веб-дашборда управления виджетом
header('Content-Type: text/html; charset=UTF-8');
$textWidget = build_vk_text_widget($book, $directDialogUrl);
$compactListWidget = build_vk_compact_list_widget($book, $directDialogUrl);
$tilesWidget = build_vk_tiles_widget($book, $directDialogUrl);

$textCode = 'return ' . json_encode($textWidget, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . ';';
$compactListCode = 'return ' . json_encode($compactListWidget, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . ';';
$tilesCode = 'return ' . json_encode($tilesWidget, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . ';';
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Виджет «Книга дня от Космо» | Сообщество ВКонтакте</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
    <style>
        :root {
            --bg: #070913;
            --card-bg: rgba(18, 22, 41, 0.85);
            --border: rgba(255, 255, 255, 0.08);
            --primary: #3b82f6;
            --primary-glow: rgba(59, 130, 246, 0.3);
            --success: #10b981;
            --success-glow: rgba(16, 185, 129, 0.25);
            --text: #f3f4f6;
            --text-muted: #9ca3af;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', system-ui, sans-serif;
            background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, var(--bg) 75%);
            color: var(--text);
            min-height: 100vh;
            padding: 32px 16px;
            display: flex;
            justify-content: center;
        }
        .container {
            width: 100%;
            max-width: 860px;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 24px;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 24px 28px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .avatar {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
        }
        h1 { font-size: 22px; font-weight: 700; }
        .subtitle { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
        
        .card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 28px;
            margin-bottom: 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }
        .card-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 17px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #93c5fd;
        }
        
        /* Book of the day banner */
        .book-banner {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15));
            border: 1px solid rgba(147, 197, 253, 0.25);
            border-radius: 16px;
            padding: 24px;
            display: flex;
            gap: 20px;
            align-items: flex-start;
        }
        .book-icon {
            font-size: 44px;
            line-height: 1;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 14px;
        }
        .book-info h2 {
            font-size: 20px;
            color: #fff;
            margin-bottom: 4px;
        }
        .book-author {
            font-size: 15px;
            color: #60a5fa;
            font-weight: 500;
            margin-bottom: 8px;
        }
        .book-genre {
            display: inline-block;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 3px 8px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 6px;
            color: #cbd5e1;
            margin-bottom: 12px;
        }
        .book-hook {
            font-size: 14px;
            line-height: 1.5;
            color: #e2e8f0;
            margin-bottom: 12px;
        }
        .book-quote {
            font-style: italic;
            font-size: 13px;
            color: #94a3b8;
            border-left: 3px solid var(--primary);
            padding-left: 10px;
        }

        /* Buttons */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
        }
        .btn-primary {
            background: #2563eb;
            color: white;
            box-shadow: 0 4px 14px var(--primary-glow);
        }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-success {
            background: #059669;
            color: white;
            box-shadow: 0 4px 14px var(--success-glow);
        }
        .btn-success:hover { background: #047857; }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            color: var(--text);
        }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.14); }

        /* Code box */
        .code-box {
            position: relative;
            background: #0b0f19;
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 16px;
            margin-top: 12px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            line-height: 1.6;
            color: #a5b4fc;
            overflow-x: auto;
            max-height: 240px;
        }
        .copy-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 6px 12px;
            font-size: 11px;
            background: rgba(255, 255, 255, 0.12);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        }
        .copy-btn:hover { background: rgba(255, 255, 255, 0.2); }

        /* Steps list */
        .steps {
            list-style: none;
            counter-reset: step;
        }
        .steps li {
            position: relative;
            padding-left: 36px;
            margin-bottom: 14px;
            font-size: 14px;
            line-height: 1.5;
            color: #cbd5e1;
        }
        .steps li::before {
            counter-increment: step;
            content: counter(step);
            position: absolute;
            left: 0;
            top: 0;
            width: 24px;
            height: 24px;
            background: #3b82f6;
            color: white;
            font-size: 12px;
            font-weight: 700;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            padding: 4px 10px;
            border-radius: 20px;
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Шапка -->
        <div class="header">
            <div class="brand">
                <div class="avatar">🤖</div>
                <div>
                    <h1>Виджет «Книга дня от Космо»</h1>
                    <div class="subtitle">Интеграция с официальным сообществом ВКонтакте (club<?= $vkGroupId ?>)</div>
                </div>
            </div>
            <div>
                <a href="<?= htmlspecialchars($directDialogUrl) ?>" target="_blank" class="btn btn-secondary">
                    <span class="material-symbols-outlined">chat</span> Чат с Космо
                </a>
            </div>
        </div>

        <!-- Карточка Книги дня на сегодня -->
        <div class="card">
            <div class="card-title">
                <span class="material-symbols-outlined">auto_awesome</span>
                Актуальная книга дня на сегодня (<?= $book['date_str'] ?>)
                <span class="status-badge" style="margin-left: auto;">
                    <span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span> Активно
                </span>
            </div>

            <div class="book-banner">
                <div class="book-icon"><?= $book['icon'] ?></div>
                <div class="book-info">
                    <h2><?= htmlspecialchars($book['title']) ?></h2>
                    <div class="book-author"><?= htmlspecialchars($book['author']) ?></div>
                    <div class="book-genre"><?= htmlspecialchars($book['genre']) ?></div>
                    <div class="book-hook"><?= htmlspecialchars($book['hook']) ?></div>
                    <div class="book-quote"><?= htmlspecialchars($book['quote']) ?></div>
                </div>
            </div>

            <div style="margin-top: 18px; display: flex; gap: 12px; align-items: center;">
                <button id="sync-group-btn" class="btn btn-success" onclick="syncGroupInfo()">
                    <span class="material-symbols-outlined">sync</span> Обновить описание сообщества ВКонтакте
                </button>
                <span id="sync-status-msg" style="font-size: 13px; color: #34d399;"></span>
            </div>
        </div>

        <!-- Пошаговая инструкция по включению виджета в шапке сообщества -->
        <div class="card">
            <div class="card-title">
                <span class="material-symbols-outlined">integration_instructions</span>
                Как установить интерактивный виджет в шапке сообщества ВК (1 минута)
            </div>

            <ol class="steps">
                <li>
                    Перейдите в настройки сообщества <b><a href="https://vk.com/club<?= $vkGroupId ?>?act=apps" target="_blank" style="color: #60a5fa; text-decoration: underline;">«Управление ➔ Приложения»</a></b>.
                </li>
                <li>
                    Найдите в каталоге официальное приложение <b>«Виджет в сообществе»</b> (или <b>«Конструктор виджетов»</b>) и нажмите <b>«Добавить»</b>.
                </li>
                <li>
                    В настройках добавленного приложения выберите тип виджета: <b>«Компактный список»</b> (или <b>«Текст»</b>).
                </li>
                <li>
                    Скопируйте сгенерированный ниже код и вставьте его в поле кода виджета (или укажите URL вебхука: <code>https://biblioteka33.ru/stat/api/vk-widget.php?action=widget_data</code>).
                </li>
                <li>
                    Нажмите <b>«Сохранить и опубликовать»</b> — готово! Виджет «Книга дня от Космо» мгновенно появится в шапке сообщества!
                </li>
            </ol>
        </div>

        <!-- Код для компактного списка (Рекомендуемый формат) -->
        <div class="card">
            <div class="card-title">
                <span class="material-symbols-outlined">view_list</span>
                Код виджета: «Компактный список» (Рекомендуется)
            </div>
            <p style="font-size: 13px; color: var(--text-muted);">
                Отображает карточку книги дня, кнопку новостей филиалов и адреса всех 18 библиотек.
            </p>
            <div class="code-box">
                <button class="copy-btn" onclick="copyToClipboard('compact-list-code')">Копировать</button>
                <pre id="compact-list-code"><?= htmlspecialchars($compactListCode) ?></pre>
            </div>
        </div>

        <!-- Код для текстового виджета -->
        <div class="card">
            <div class="card-title">
                <span class="material-symbols-outlined">description</span>
                Код виджета: «Текстовый»
            </div>
            <div class="code-box">
                <button class="copy-btn" onclick="copyToClipboard('text-widget-code')">Копировать</button>
                <pre id="text-widget-code"><?= htmlspecialchars($textCode) ?></pre>
            </div>
        </div>
    </div>

    <script>
        function copyToClipboard(elementId) {
            const text = document.getElementById(elementId).innerText;
            navigator.clipboard.writeText(text).then(() => {
                alert('Код виджета успешно скопирован в буфер обмена!');
            }).catch(err => {
                console.error('Ошибка копирования:', err);
            });
        }

        function syncGroupInfo() {
            const btn = document.getElementById('sync-group-btn');
            const status = document.getElementById('sync-status-msg');
            btn.disabled = true;
            status.innerText = 'Синхронизация...';

            fetch('api/vk-widget.php?action=sync_group')
                .then(r => r.json())
                .then(data => {
                    btn.disabled = false;
                    if (data.ok) {
                        status.innerText = '✅ ' + data.message;
                    } else {
                        status.innerText = '❌ Ошибка: ' + data.message;
                        status.style.color = '#ef4444';
                    }
                })
                .catch(err => {
                    btn.disabled = false;
                    status.innerText = '❌ Ошибка сети: ' + err.message;
                    status.style.color = '#ef4444';
                });
        }
    </script>
</body>
</html>

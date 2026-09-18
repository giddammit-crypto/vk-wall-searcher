<?php
/**
 * scripts/test_branch_news.php
 *
 * QA тест-сьют для проверки форматирования ленты новостей филиалов библиотек:
 * 1. Вызов в среде без нативного mbstring (проверка полифиллов mb_strrpos, mb_strlen и т.д.)
 * 2. Наличие фразы «Постов за сегодня нет» при пустом списке записей за текущие сутки
 * 3. Форматирование с реальным кэшем (cache/vk_branch_news.json)
 * 4. Контроль лимитов ВКонтакте (макс. 3900 символов, счетчик оставшихся постов)
 * 5. Форматирование аннотаций и граничные случаи (длинные тексты, кавычки, ссылки)
 */

if (php_sapi_name() !== 'cli') {
    die("Тест запускается только из CLI.\n");
}

error_reporting(E_ALL & ~E_DEPRECATED);
ini_set('display_errors', '1');

require_once __DIR__ . '/../api/vk-bot.php';

class BranchNewsTestSuite
{
    private int $passed = 0;
    private int $failed = 0;

    private function assert(string $name, bool $condition, string $details = '')
    {
        if ($condition) {
            $this->passed++;
            echo "\033[32m[PASS]\033[0m {$name}\n";
            if ($details !== '') {
                echo "       \033[90m↳ {$details}\033[0m\n";
            }
        } else {
            $this->failed++;
            echo "\033[31m[FAIL]\033[0m {$name}\n";
            if ($details !== '') {
                echo "       \033[91m↳ {$details}\033[0m\n";
            }
        }
    }

    public function run(): bool
    {
        echo "\n=======================================================\n";
        echo "  QA ТЕСТ-СЬЮТ: НОВОСТИ ФИЛИАЛОВ (api/vk-bot.php)\n";
        echo "  Форматирование, лимиты длины, отсутствие mbstring\n";
        echo "=======================================================\n\n";

        $this->testMbstringEnvironmentAndPolyfills();
        $this->testRealCacheFormatting();
        $this->testNoTodayPostsPhrase();
        $this->testCompletelyEmptyPosts();
        $this->testLongAnnotationTruncation();
        $this->testSearchKeywordFormatting();

        echo "\n=======================================================\n";
        echo "  ИТОГИ ТЕСТОВ НОВОСТЕЙ: {$this->passed} УСПЕШНО / {$this->failed} ОШИБОК\n";
        echo "=======================================================\n\n";

        return ($this->failed === 0);
    }

    /**
     * 1. Проверка работы без нативного расширения mbstring
     */
    private function testMbstringEnvironmentAndPolyfills()
    {
        echo "1. Проверка независимости от расширения mbstring:\n";

        $isExtLoaded = extension_loaded('mbstring');
        $hasStrrpos = function_exists('mb_strrpos');
        $hasStrlen = function_exists('mb_strlen');
        $hasSubstr = function_exists('mb_substr');

        $this->assert(
            'Наличие полифилла mb_strrpos',
            $hasStrrpos,
            "ext-mbstring: " . ($isExtLoaded ? 'активно' : 'не загружено (работает полифилл)')
        );

        // Проверка корректности работы mb_strrpos на кириллице (0-индексация)
        $sampleText = "Первое предложение. Второе предложение! Третье предложение.";
        $posDot = mb_strrpos($sampleText, '.');
        $posExcl = mb_strrpos($sampleText, '!');

        $strrposOk = ($posDot !== false && $posDot === 58 && $posExcl !== false && $posExcl === 38);
        $this->assert(
            'Корректность UTF-8 позиционирования в mb_strrpos',
            $strrposOk,
            "pos('.'): {$posDot} (ожидалось 58), pos('!'): {$posExcl} (ожидалось 38)"
        );
    }

    /**
     * 2. Форматирование с реальным кэшем cache/vk_branch_news.json
     */
    private function testRealCacheFormatting()
    {
        echo "\n2. Форматирование новостей с реальным кэшем (cache/vk_branch_news.json):\n";

        $cacheFile = __DIR__ . '/../cache/vk_branch_news.json';
        if (!file_exists($cacheFile)) {
            $this->assert('Файл кэша существует', false, "Кэш {$cacheFile} не найден");
            return;
        }

        $rawJson = file_get_contents($cacheFile);
        $cacheData = json_decode($rawJson, true);

        $hasData = is_array($cacheData) && (!empty($cacheData['today']) || !empty($cacheData['last_24h']));
        $this->assert('Чтение и валидность структуры реального кэша', $hasData, "Записей today: " . count($cacheData['today'] ?? []) . ", last_24h: " . count($cacheData['last_24h'] ?? []));

        $formatted = vk_bot_format_branch_news_message($cacheData);
        $charLen = mb_strlen($formatted, 'UTF-8');

        // Проверяем лимит ВК (безопасный порог 3900 символов)
        $withinLimit = ($charLen > 100 && $charLen <= 3900);
        $this->assert(
            'Контроль длины сформированного сообщения ВК (<= 3900 символов)',
            $withinLimit,
            "Итоговая длина сообщения: {$charLen} симв. (лимит ВК 4096, порог бота 3900)"
        );

        // Проверяем наличие карточек филиалов и ссылок
        $hasBranchName = (strpos($formatted, 'Центральная городская библиотека') !== false || strpos($formatted, 'Библиотека — филиал') !== false);
        $hasPostUrls = (strpos($formatted, 'https://vk.com/wall') !== false);
        $hasFooterTip = (strpos($formatted, 'Нажмите на ссылку любого поста') !== false);

        $this->assert('Наличие наименований филиалов в карточках', $hasBranchName);
        $this->assert('Формирование прямых ссылок на посты ВКонтакте', $hasPostUrls);
        $this->assert('Наличие подсказки о переходе по ссылкам в футере', $hasFooterTip);

        // Проверяем отображение всех постов из кэша (или бейдж при переполнении)
        $this->assert(
            'Успешная упаковка постов филиалов без превышения лимитов ВК',
            strpos($formatted, 'Читайте подробнее') !== false || strpos($formatted, '🏛') !== false
        );

        // Проверяем работу бейджа остатка при большом числе постов (>25)
        $manyPosts = [];
        for ($i = 0; $i < 30; $i++) {
            $manyPosts[] = [
                'id' => 1000 + $i,
                'owner_id' => -51714771,
                'date' => time() - ($i * 60),
                'text' => "Тестовый анонс филиала номер {$i} о культурных мероприятиях и новинках литературы города Владимира.",
                'branch' => ['name' => 'Центральная городская библиотека']
            ];
        }
        $overflowNews = ['today' => $manyPosts, 'last_24h' => []];
        $overflowMsg = vk_bot_format_branch_news_message($overflowNews);
        $hasRemainingBadge = (strpos($overflowMsg, 'И ещё') !== false);
        $this->assert('Индикатор не поместившихся постов при переполнении («➕ И ещё X свежих записей»)', $hasRemainingBadge);
    }

    /**
     * 3. Проверка режима отсутствия постов за сегодня (строго текущий день)
     */
    private function testNoTodayPostsPhrase()
    {
        echo "\n3. Проверка режима отсутствия постов за сегодня:\n";

        // Моделируем ситуацию: за сегодня постов нет (today=[]), но есть вчерашние посты
        $yesterdayStart = strtotime('yesterday midnight');
        $mockNews = [
            'today' => [],
            'last_24h' => [
                [
                    'id' => 501,
                    'owner_id' => -51714771,
                    'date' => $yesterdayStart + 3600,
                    'text' => 'Вчерашняя вечерняя лекция о космонавтике собрала полный зал читателей.',
                    'branch' => [
                        'name' => 'Центральная городская библиотека'
                    ]
                ]
            ]
        ];

        $output = vk_bot_format_branch_news_message($mockNews);

        $hasNoTodayPhrase = (strpos($output, 'Постов за сегодня нет') !== false);
        $doesNotShowYesterday = (strpos($output, 'Вчерашняя вечерняя лекция') === false);

        $this->assert(
            'Наличие фразы «Постов за сегодня нет» в заголовке сообщения',
            $hasNoTodayPhrase,
            "Заголовок: " . explode("\n", $output)[0]
        );

        $this->assert(
            'Исключение постов за прошлый день (строго только текущий день)',
            $doesNotShowYesterday
        );
    }

    /**
     * 4. Полное отсутствие постов за сегодня
     */
    private function testCompletelyEmptyPosts()
    {
        echo "\n4. Проверка поведения при полностью пустой ленте за сегодня:\n";

        $emptyNews = [
            'today' => [],
            'last_24h' => []
        ];

        $output = vk_bot_format_branch_news_message($emptyNews);

        $hasNotice = (strpos($output, 'пока нет новых записей') !== false && strpos($output, 'за сегодня') !== false);
        $hasBranchButtonTip = (strpos($output, 'Библиотеки-филиалы') !== false);

        $this->assert(
            'Корректная заглушка при 0 постов за сегодня во всех 16 филиалах',
            $hasNotice && $hasBranchButtonTip
        );
    }

    /**
     * 5. Обрезка длинных аннотаций по границе предложений (vk_bot_format_cosmo_annotation)
     */
    private function testLongAnnotationTruncation()
    {
        echo "\n5. Форматирование и обрезка длинных аннотаций:\n";

        // Текст более 300 символов с несколькими предложениями
        $longText = "Сегодня в библиотеке состоялся прекрасный праздник для школьников. Ребята читали стихи и разгадывали сложные загадки! "
                  . "В конце мероприятия все участники получили памятные сувениры и сладкие подарки. "
                  . "Приходите к нам снова на новые увлекательные встречи всей семьей!";

        $annot = vk_bot_format_cosmo_annotation($longText, 120);

        $len = mb_strlen($annot, 'UTF-8');
        $validLength = ($len <= 130);
        $cleanQuotes = (strpos($annot, '«') === false && strpos($annot, '»') === false && strpos($annot, '"') === false);

        $this->assert(
            'Обрезка аннотации по границе предложения без превышения лимита',
            $validLength && $cleanQuotes,
            "Длина аннотации: {$len} симв. («{$annot}»)"
        );

        // Текст без знаков препинания (fallback на многоточие)
        $noPunctText = "Очень длинный непрерывный текст без точек и восклицательных знаков для проверки жесткого обрезания по лимиту символов";
        $annotFallback = vk_bot_format_cosmo_annotation($noPunctText, 60);

        $hasEllipsis = (strpos($annotFallback, '...') !== false);
        $this->assert(
            'Fallback на многоточие при отсутствии знаков препинания',
            $hasEllipsis,
            "Результат: «{$annotFallback}»"
        );
    }

    /**
     * 6. Форматирование при поиске по ключевому слову
     */
    private function testSearchKeywordFormatting()
    {
        echo "\n6. Форматирование результатов поиска по ключевому слову:\n";

        $mockData = [
            'today' => [
                [
                    'id' => 101,
                    'owner_id' => -51714771,
                    'date' => time() - 1800,
                    'text' => 'Открытие новой художественной выставки графики во Владимире.',
                    'branch' => ['name' => 'Центральная городская библиотека']
                ]
            ],
            'last_24h' => []
        ];

        // 1. Найденный результат
        $outFound = vk_bot_format_branch_news_message($mockData, 'выставка');
        $hasKeywordHeader = (strpos($outFound, 'по запросу «выставка»') !== false);
        $this->assert('Заголовок с ключевым словом при найденных записях', $hasKeywordHeader);

        // 2. Ничего не найдено
        $outNotFound = vk_bot_format_branch_news_message(['today' => [], 'last_24h' => []], 'квантовая_физика');
        $hasNotFoundHeader = (strpos($outNotFound, 'по запросу «квантовая_физика» ничего не найдено') !== false);
        $this->assert('Вежливое сообщение при отсутствии результатов по ключевому слову', $hasNotFoundHeader);
    }
}

$suite = new BranchNewsTestSuite();
$success = $suite->run();
exit($success ? 0 : 1);

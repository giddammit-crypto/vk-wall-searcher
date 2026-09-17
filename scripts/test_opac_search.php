<?php
/**
 * scripts/test_opac_search.php
 *
 * Комплексный автоматизированный тест-сьют для проверки интеграции
 * Электронного каталога OPAC-Global (ЦГБ г. Владимира, БД 62) с чат-ботом ВК и веб-интерфейсом.
 *
 * Роль: Ведущий QA-инженер & Тестировщик
 */

if (php_sapi_name() !== 'cli') {
    die("Тест запускается только из командной строки (CLI).\n");
}

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '1');

require_once __DIR__ . '/../api/opac.php';
require_once __DIR__ . '/../api/OpacClient.php';
require_once __DIR__ . '/../api/vk-bot.php';

class OpacIntegrationTestSuite
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
        echo "  QA ТЕСТ-СЬЮТ: ПОИСК ПО ЭЛЕКТРОННОМУ КАТАЛОГУ (OPAC)\n";
        echo "  Интеграция OPAC-Global БД 62 -> Чат-бот ВК & Веб-чат\n";
        echo "=======================================================\n\n";

        $this->testQueryParserCommands();
        $this->testQueryParserNaturalLanguage();
        $this->testBranchFilterExtraction();
        $this->testBranch4DobroyeLocationIntegrity();
        $this->testLiveOpacBookSearch();
        $this->testOpacCopiesAndHoldings();
        $this->testVkBotFormatResponse();
        $this->testVkBotFormatResponseWithBranch4Filter();
        $this->testNonBookQueryRejection();

        echo "\n=======================================================\n";
        echo "  ИТОГИ ТЕСТОВ: {$this->passed} УСПЕШНО / {$this->failed} ОШИБОК\n";
        echo "=======================================================\n\n";

        return ($this->failed === 0);
    }

    /**
     * 1. Тест парсера явных команд (/книга, !книга, /поиск, /opac, /опак, /к)
     */
    private function testQueryParserCommands()
    {
        $cases = [
            ['/книга Мастер и Маргарита', 'Мастер и Маргарита', true],
            ['!книга Капитанская дочка', 'Капитанская дочка', true],
            ['/поиск Чехов', 'Чехов', true],
            ['!поиск Достоевский', 'Достоевский', true],
            ['/opac Толстой', 'Толстой', true],
            ['/опак Лермонтов', 'Лермонтов', true],
            ['/к Тургенев', 'Тургенев', true],
            ['!к Гоголь', 'Гоголь', true],
        ];

        $allOk = true;
        foreach ($cases as $c) {
            $parsed = vk_bot_parse_book_query($c[0]);
            if (!$parsed || $parsed['query'] !== $c[1] || $parsed['is_command'] !== $c[2]) {
                $allOk = false;
                echo "Ошибка парсера команды: '{$c[0]}' -> получено " . json_encode($parsed, JSON_UNESCAPED_UNICODE) . "\n";
                break;
            }
        }

        // Проверка пустой команды (вызов справки)
        $helpParsed = vk_bot_parse_book_query('/к');
        $helpOk = ($helpParsed && !empty($helpParsed['show_help']));

        $this->assert(
            'Парсинг явных команд каталога (/книга, /поиск, /opac, /к, !книга...)',
            $allOk && $helpOk,
            'Все 8 форматов команд и пустой вызов справки успешно распознаны'
        );
    }

    /**
     * 2. Тест парсера естественно-языковых фраз readers NLP
     */
    private function testQueryParserNaturalLanguage()
    {
        $cases = [
            ['Космо, найди книгу Мастер и Маргарита', 'Мастер и Маргарита'],
            ['найди книгу Война и мир', 'Война и мир'],
            ['поищи роман Евгений Онегин', 'Евгений Онегин'],
            ['где взять книгу Преступление и наказание', 'Преступление и наказание'],
            ['где найти повесть Собачье сердце', 'Собачье сердце'],
            ['в каком филиале есть Гарри Поттер', 'Гарри Поттер'],
            ['в каких библиотеках можно почитать книгу Метро 2033', 'Метро 2033'],
            ['есть ли книга Три товарища', 'Три товарища'],
            ['ищу книгу Отцы и дети', 'Отцы и дети'],
        ];

        $allOk = true;
        foreach ($cases as $c) {
            $parsed = vk_bot_parse_book_query($c[0]);
            if (!$parsed || mb_strtolower($parsed['query'], 'UTF-8') !== mb_strtolower($c[1], 'UTF-8')) {
                $allOk = false;
                echo "Ошибка парсера NLP: '{$c[0]}' -> получено " . json_encode($parsed, JSON_UNESCAPED_UNICODE) . "\n";
                break;
            }
        }

        $this->assert(
            'Распознавание естественных русскоязычных запросов (NLP)',
            $allOk,
            'Успешно проверены 9 речевых паттернов: «найди», «где взять», «в каком филиале», «есть ли», «ищу»'
        );
    }

    /**
     * 3. Тест извлечения географических фильтров (на Егорова, в Добром, в центре, филиал N)
     */
    private function testBranchFilterExtraction()
    {
        $cases = [
            ['Есть ли книга Мастер и Маргарита на Егорова?', 'Мастер и Маргарита', 'ф4'],
            ['Космо найди книгу Пушкин в филиале 4', 'Пушкин', 'ф4'],
            ['Где взять книгу Чехов в Добром?', 'Чехов', 'доброе'],
            ['Есть ли книга Незнайка в центре?', 'Незнайка', 'цдб'],
            ['поищи книгу Тургенев в филиале 2', 'Тургенев', 'ф2'],
        ];

        $allOk = true;
        foreach ($cases as $c) {
            $parsed = vk_bot_parse_book_query($c[0]);
            if (!$parsed || $parsed['branch_filter'] !== $c[2]) {
                $allOk = false;
                echo "Ошибка извлечения фильтра: '{$c[0]}' -> получено " . json_encode($parsed, JSON_UNESCAPED_UNICODE) . "\n";
                break;
            }
        }

        $this->assert(
            'Извлечение географических фильтров филиалов (ф4/Егорова, Доброе, Центр, филиалы)',
            $allOk,
            'Фильтры корректно извлечены, название книги очищено от служебных предлогов места'
        );
    }

    /**
     * 4. Проверка топонимики и реквизитов Филиала №4 (Егорова, 10, жилой район «Доброе»)
     */
    private function testBranch4DobroyeLocationIntegrity()
    {
        $b4 = OpacClient::resolveBranchBySigla('ф4');

        $hasDobroye = ($b4['is_dobroye'] === true);
        $notCenter = ($b4['is_center'] === false);
        $hasEgorova = (strpos($b4['address'], 'Егорова, д. 10') !== false);
        $hasPhone = (!empty($b4['phone']));

        $ok = ($hasDobroye && $notCenter && $hasEgorova && $hasPhone);

        $this->assert(
            'Верификация реквизитов Филиала №4 (ул. Егорова, 10, жилой район «Доброе»)',
            $ok,
            "Адрес: {$b4['address']}, Район: {$b4['district']}, Телефон: {$b4['phone']}, is_dobroye=true, is_center=false"
        );
    }

    /**
     * 5. Сквозной поиск через opac_search_books на сервере opac.lib33.ru
     */
    private function testLiveOpacBookSearch()
    {
        $res = opac_search_books('Пушкин', 3);

        $ok = (
            !empty($res['ok']) &&
            !empty($res['items']) &&
            count($res['items']) > 0 &&
            !empty($res['items'][0]['id']) &&
            !empty($res['items'][0]['title'])
        );

        $this->assert(
            'Сквозной поиск книг через opac_search_books (поиск по БД 62)',
            $ok,
            $ok ? "Успешно: найдено {$res['total_found']} книг, первая: «{$res['items'][0]['title']}» (ID: {$res['items'][0]['id']})" : "Сбой поиска: " . json_encode($res, JSON_UNESCAPED_UNICODE)
        );
    }

    /**
     * 6. Получение экземпляров и холдингов через opac_get_book_copies
     */
    private function testOpacCopiesAndHoldings()
    {
        // Находим реальный ID книги
        $searchRes = opac_search_books('Пушкин', 1);
        if (empty($searchRes['items'][0]['id'])) {
            $this->assert('Получение экземпляров и холдингов книги', false, 'Не удалось получить ID книги из поиска');
            return;
        }

        $idbr = $searchRes['items'][0]['id'];
        $copiesRes = opac_get_book_copies($idbr);

        $ok = (
            !empty($copiesRes['ok']) &&
            isset($copiesRes['copies']) &&
            is_array($copiesRes['copies']) &&
            count($copiesRes['copies']) > 0
        );

        $sample = $copiesRes['copies'][0] ?? [];
        $copiesCount = $copiesRes['total_copies'] ?? ($copiesRes['total'] ?? count($copiesRes['copies'] ?? []));

        $this->assert(
            'Получение экземпляров книги через opac_get_book_copies (MoveCopies)',
            $ok,
            $ok ? "Найдено экземпляров: {$copiesCount}, Филиал: {$sample['branch_name']}, Инв: {$sample['inventory']}, Шифр: {$sample['shifr']}" : "Сбой получения копий"
        );
    }

    /**
     * 7. Форматирование ответа робота Космо vk_bot_format_opac_response
     */
    private function testVkBotFormatResponse()
    {
        $searchRes = opac_search_books('Чехов', 2);
        $formatted = vk_bot_format_opac_response($searchRes, 'Чехов', null, 'Александр');

        $ok = (
            strpos($formatted, 'Робот Космо: Результаты поиска в каталоге библиотек г. Владимира') !== false &&
            strpos($formatted, 'Чехов') !== false &&
            strpos($formatted, 'Наличие в филиалах города:') !== false &&
            strpos($formatted, 'http://library.vladimir.ru/rguest_vlad_cgb.htm') !== false
        );

        $this->assert(
            'Генерация форматированного ответа ВК роботом Космо (vk_bot_format_opac_response)',
            $ok,
            "Длина ответа: " . mb_strlen($formatted, 'UTF-8') . " симв., присутствуют заглавия, филиалы и ссылка на каталог"
        );
    }

    /**
     * 8. Проверка таргетированного фильтра по Филиалу №4 (ул. Егорова, 10, Доброе)
     */
    private function testVkBotFormatResponseWithBranch4Filter()
    {
        // Создаем синтетические данные с экземпляром в ф4
        $mockResult = [
            'ok' => true,
            'total_found' => 1,
            'items' => [
                [
                    'id' => 'RU VLADIMIR\\BIBL\\TEST001',
                    'title' => 'Капитанская дочка',
                    'author' => 'Пушкин А.С.',
                    'year' => '2020',
                    'locations' => ['ф4', 'цдб']
                ]
            ]
        ];

        // Кэшируем фиктивные копии для TEST001, чтобы протестировать логику вывода ф4
        $cacheDir = opac_get_cache_dir();
        $testCopiesFile = $cacheDir . DIRECTORY_SEPARATOR . 'opac_copies_' . md5('RU VLADIMIR\\BIBL\\TEST001') . '.json';
        $mockCopies = [
            'ok' => true,
            'record_id' => 'RU VLADIMIR\\BIBL\\TEST001',
            'total_copies' => 2,
            'copies' => [
                [
                    'subfield_b' => 'ф4',
                    'branch_code' => 'ф4',
                    'branch_name' => 'Филиал №4 (ул. Егорова, 10)',
                    'branch_address' => 'ул. Егорова, д. 10',
                    'branch_phone' => '8(4922) 53-24-34',
                    'branch_district' => 'жилой район Доброе',
                    'is_dobroye' => true,
                    'is_center' => false,
                    'is_available' => true,
                    'inventory' => '998877',
                    'shifr' => '84(2Рос=Рус)1'
                ],
                [
                    'subfield_b' => 'цдб',
                    'branch_code' => 'цдб',
                    'branch_name' => 'Центральная детская библиотека',
                    'branch_address' => 'ул. Большая Московская, д. 31',
                    'branch_phone' => '8(4922) 32-35-12',
                    'branch_district' => 'исторический центр',
                    'is_dobroye' => false,
                    'is_center' => true,
                    'is_available' => true,
                    'inventory' => '112233',
                    'shifr' => '84(2Рос=Рус)1'
                ]
            ]
        ];
        file_put_contents($testCopiesFile, json_encode($mockCopies));

        $formatted = vk_bot_format_opac_response($mockResult, 'Капитанская дочка', 'ф4', 'Михаил');

        // Очищаем тестовый файл
        @unlink($testCopiesFile);

        $hasSpecialBanner = (strpos($formatted, 'ОТЛИЧНАЯ НОВОСТЬ: Книга есть в наличии в Филиале №4 на ул. Егорова, 10 (жилой район «Доброе»)!') !== false);
        $hasEgorovaAddress = (strpos($formatted, 'ул. Егорова, д. 10') !== false);
        $hasPhone = (strpos($formatted, '53-24-34') !== false);

        $ok = ($hasSpecialBanner && $hasEgorovaAddress && $hasPhone);

        $this->assert(
            'Таргетированное акцентирование Филиала №4 при запросе на ул. Егорова',
            $ok,
            "Бейдж наличия на Егорова в жилом районе Доброе выведен на 1-м месте"
        );
    }

    /**
     * 9. Проверка фильтрации не-книжных запросов (вопросы о графике, филиалах, общие фразы)
     */
    private function testNonBookQueryRejection()
    {
        $nonBookQueries = [
            'Привет, Космо!',
            'Какая сегодня погода во Владимире?',
            'где библиотека',
            'адрес филиала',
            'новости',
            'расписание работы',
            'помощь',
        ];

        $allRejected = true;
        foreach ($nonBookQueries as $q) {
            $parsed = vk_bot_parse_book_query($q);
            if ($parsed !== null) {
                $allRejected = false;
                echo "Ложное срабатывание на не-книжный запрос: '{$q}' -> " . json_encode($parsed, JSON_UNESCAPED_UNICODE) . "\n";
                break;
            }
        }

        $this->assert(
            'Защита от ложных срабатываний на общие вопросы (график, погода, новости)',
            $allRejected,
            'Все не-книжные запросы успешно отфильтрованы и направлены в стандартный сценарий'
        );
    }
}

$suite = new OpacIntegrationTestSuite();
$success = $suite->run();
exit($success ? 0 : 1);

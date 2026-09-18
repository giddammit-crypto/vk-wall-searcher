<?php
/**
 * scripts/test_inoagent_api.php
 *
 * Комплексный QA тест-сьют для проверки серверного шлюза api/inoagent.php
 * и локального снимка кэша cache/inoagent_snapshot.json.
 *
 * Тестируемые сценарии:
 * 1. Синтаксис и окружение (CLI, полифиллы, доступ к кэшу)
 * 2. action=stats: структура и математическая целостность (total = active + excluded = fiz + ur + other)
 * 3. action=search: базовая пагинация, лимиты, значения по умолчанию
 * 4. action=search: поиск по ФИО, псевдонимам и ИНН
 * 5. action=search: фильтры по типу (fiz, ur, other)
 * 6. action=search: фильтры по статусу (active, excluded)
 * 7. action=search: двухуровневый кэш (создание cache/inoagent_search_{md5}.json, source="cache")
 * 8. action=check: экспресс-проверка персоны (активный агент, псевдоним, отсутствующий автор)
 * 9. Отказоустойчивость: мягкий fallback на cache/inoagent_snapshot.json при недоступности сети
 * 10. Обработка ошибок: неизвестное действие (HTTP 400, ok=false)
 * 11. Сетевой транспорт: проверка HTTP-эндпоинта через локальный веб-сервер
 */

if (php_sapi_name() !== 'cli') {
    die("Тест запускается только из командной строки (CLI).\n");
}

error_reporting(E_ALL & ~E_DEPRECATED);
ini_set('display_errors', '1');

require_once __DIR__ . '/../api/inoagent.php';

class InoagentApiTestSuite
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
        echo "  QA ТЕСТ-СЬЮТ: СЕРВЕРНЫЙ ШЛЮЗ РЕЕСТРА ИНОАГЕНТОВ (api/inoagent.php)\n";
        echo "  Минюст РФ, поиск, фильтры, кэш, экспресс-проверка, fallback\n";
        echo "=======================================================\n\n";

        $this->testSnapshotFileExistsAndValid();
        $this->testActionStats();
        $this->testActionSearchPagination();
        $this->testActionSearchKeywords();
        $this->testActionSearchTypeFilters();
        $this->testActionSearchStatusFilters();
        $this->testActionSearchCaching();
        $this->testActionCheck();
        $this->testFaultToleranceFallback();
        $this->testErrorHandling();
        $this->testHttpServerEndpoint();

        echo "\n=======================================================\n";
        echo "  ИТОГИ ТЕСТОВ ШЛЮЗА: {$this->passed} УСПЕШНО / {$this->failed} ОШИБОК\n";
        echo "=======================================================\n\n";

        return ($this->failed === 0);
    }

    private function testSnapshotFileExistsAndValid()
    {
        echo "\033[1;34m[1/11] Проверка локального снимка реестра (cache/inoagent_snapshot.json)\033[0m\n";

        $snapshotPath = INOAGENT_SNAPSHOT_FILE;
        $this->assert('Файл снимка существует', file_exists($snapshotPath), $snapshotPath);

        $content = @file_get_contents($snapshotPath);
        $this->assert('Файл снимка читаем и не пуст', !empty($content), 'Размер: ' . strlen((string)$content) . ' байт');

        $json = json_decode($content, true);
        $this->assert('Снимок содержит валидный JSON', is_array($json));
        $this->assert('Снимок содержит поле total > 1000', isset($json['total']) && $json['total'] > 1000, 'Всего: ' . ($json['total'] ?? 0));
        $this->assert('Снимок содержит массив values', isset($json['values']) && is_array($json['values']) && count($json['values']) > 1000);
        $this->assert('Снимок содержит метку last_modified', !empty($json['last_modified']), 'Дата: ' . ($json['last_modified'] ?? ''));
        echo "\n";
    }

    private function testActionStats()
    {
        echo "\033[1;34m[2/11] Проверка действия action=stats\033[0m\n";

        list($code, $res) = inoagent_handle_request(['action' => 'stats'], true);
        $this->assert('HTTP статус ответа 200', $code === 200);
        $this->assert('Ответ содержит ok === true', !empty($res['ok']));
        $this->assert('Присутствуют все ключи статистики', isset($res['total'], $res['active'], $res['excluded'], $res['fiz'], $res['ur'], $res['other'], $res['last_modified']));

        $total = $res['total'];
        $active = $res['active'];
        $excluded = $res['excluded'];
        $fiz = $res['fiz'];
        $ur = $res['ur'];
        $other = $res['other'];

        $this->assert('Математический баланс статусов: active + excluded === total', ($active + $excluded) === $total, "{$active} + {$excluded} = {$total}");
        $this->assert('Математический баланс типов: fiz + ur + other === total', ($fiz + $ur + $other) === $total, "{$fiz} + {$ur} + {$other} = {$total}");
        $this->assert('Количество физических лиц больше 500', $fiz > 500, "Физлиц: {$fiz}");
        $this->assert('Количество юрлиц больше 100', $ur > 100, "Юрлиц: {$ur}");
        $this->assert('Количество исключённых больше 50', $excluded > 50, "Исключённых: {$excluded}");
        echo "\n";
    }

    private function testActionSearchPagination()
    {
        echo "\033[1;34m[3/11] Проверка действия action=search: пагинация и лимиты\033[0m\n";

        // По умолчанию: page=1, limit=12
        list($c1, $r1) = inoagent_handle_request(['action' => 'search'], true);
        $this->assert('По умолчанию возвращается 12 записей', count($r1['values']) === 12, 'Получено: ' . count($r1['values']));
        $this->assert('page === 1', $r1['page'] === 1);
        $this->assert('pages рассчитан корректно', $r1['pages'] === (int)ceil($r1['total'] / 12), 'Страниц: ' . $r1['pages']);

        // Лимит 5, страница 1 и 2
        list($c2, $p1) = inoagent_handle_request(['action' => 'search', 'limit' => 5, 'page' => 1, 'nocache' => 1], true);
        list($c3, $p2) = inoagent_handle_request(['action' => 'search', 'limit' => 5, 'page' => 2, 'nocache' => 1], true);
        $this->assert('Страница 1 вернула 5 записей', count($p1['values']) === 5);
        $this->assert('Страница 2 вернула 5 записей', count($p2['values']) === 5);
        $this->assert('Записи страниц 1 и 2 не пересекаются', $p1['values'][0]['id'] !== $p2['values'][0]['id'], "P1[0]: {$p1['values'][0]['id']}, P2[0]: {$p2['values'][0]['id']}");

        // Ограничение максимального лимита (clamp к 50)
        list($c4, $rClamped) = inoagent_handle_request(['action' => 'search', 'limit' => 200, 'nocache' => 1], true);
        $this->assert('Лимит свыше 50 ограничивается 50 записями', count($rClamped['values']) === 50);

        // Структура нормализованной записи
        $sample = $r1['values'][0];
        $this->assert('Запись содержит поле id', !empty($sample['id']));
        $this->assert('Запись содержит поле name', !empty($sample['name']));
        $this->assert('Запись содержит поле reg_num', isset($sample['reg_num']));
        $this->assert('Запись содержит поле type (fiz|ur|other)', in_array($sample['type'], ['fiz', 'ur', 'other'], true));
        $this->assert('Запись содержит поле status (active|excluded)', in_array($sample['status'], ['active', 'excluded'], true));
        $this->assert('Запись сохраняет оригинальное поле field_2_s', isset($sample['field_2_s']));
        echo "\n";
    }

    private function testActionSearchKeywords()
    {
        echo "\033[1;34m[4/11] Проверка поиска по ключевым словам (ФИО, псевдоним, ИНН)\033[0m\n";

        // Поиск по ФИО
        list($c1, $r1) = inoagent_handle_request(['action' => 'search', 'query' => 'Галкин', 'nocache' => 1], true);
        $this->assert('Поиск «Галкин» находит результаты', $r1['total'] >= 1);
        $galkinFound = false;
        foreach ($r1['values'] as $v) {
            if (mb_stripos($v['name'], 'Галкин') !== false) {
                $galkinFound = true;
                break;
            }
        }
        $this->assert('В результатах содержится персона «Галкин»', $galkinFound);

        // Поиск по псевдониму в кавычках (Борис Акунин -> Григорий Чхартишвили)
        list($c2, $r2) = inoagent_handle_request(['action' => 'search', 'query' => 'Акунин', 'nocache' => 1], true);
        $this->assert('Поиск по псевдониму «Акунин» находит запись', $r2['total'] >= 1);
        $akuninFound = false;
        foreach ($r2['values'] as $v) {
            if (mb_stripos($v['name'], 'Чхартишвили') !== false || mb_stripos($v['name'], 'Акунин') !== false || in_array('Борис Акунин', $v['aliases'], true)) {
                $akuninFound = true;
                break;
            }
        }
        $this->assert('Запись Чхартишвили сопоставлена по псевдониму', $akuninFound);

        // Поиск по ИНН
        list($c3, $r3) = inoagent_handle_request(['action' => 'search', 'query' => '7729441207', 'nocache' => 1], true);
        $this->assert('Поиск по ИНН 7729441207 находит организацию', $r3['total'] >= 1 && ($r3['values'][0]['inn'] ?? '') === '7729441207');
        echo "\n";
    }

    private function testActionSearchTypeFilters()
    {
        echo "\033[1;34m[5/11] Проверка фильтрации по типу субъекта (fiz | ur | other)\033[0m\n";

        // Только физлица
        list($c1, $rFiz) = inoagent_handle_request(['action' => 'search', 'type' => 'fiz', 'limit' => 20, 'nocache' => 1], true);
        $allFiz = true;
        foreach ($rFiz['values'] as $v) {
            if ($v['type'] !== 'fiz') { $allFiz = false; break; }
        }
        $this->assert('Фильтр type=fiz возвращает только физических лиц', $allFiz && count($rFiz['values']) > 0, 'Проверено записей: ' . count($rFiz['values']));

        // Только юрлица
        list($c2, $rUr) = inoagent_handle_request(['action' => 'search', 'type' => 'ur', 'limit' => 20, 'nocache' => 1], true);
        $allUr = true;
        foreach ($rUr['values'] as $v) {
            if ($v['type'] !== 'ur') { $allUr = false; break; }
        }
        $this->assert('Фильтр type=ur возвращает только юридических лиц', $allUr && count($rUr['values']) > 0, 'Проверено записей: ' . count($rUr['values']));

        // Иные объединения
        list($c3, $rOther) = inoagent_handle_request(['action' => 'search', 'type' => 'other', 'limit' => 20, 'nocache' => 1], true);
        $allOther = true;
        foreach ($rOther['values'] as $v) {
            if ($v['type'] !== 'other') { $allOther = false; break; }
        }
        $this->assert('Фильтр type=other возвращает только иные объединения', $allOther && count($rOther['values']) > 0, 'Проверено записей: ' . count($rOther['values']));
        echo "\n";
    }

    private function testActionSearchStatusFilters()
    {
        echo "\033[1;34m[6/11] Проверка фильтрации по статусу (active | excluded)\033[0m\n";

        // Только действующие
        list($c1, $rActive) = inoagent_handle_request(['action' => 'search', 'status' => 'active', 'limit' => 20, 'nocache' => 1], true);
        $allActive = true;
        foreach ($rActive['values'] as $v) {
            if ($v['status'] !== 'active' || !$v['is_active'] || !empty($v['exclude_date'])) {
                $allActive = false;
                break;
            }
        }
        $this->assert('Фильтр status=active возвращает только активных иноагентов', $allActive && count($rActive['values']) > 0);

        // Только исключённые
        list($c2, $rExcluded) = inoagent_handle_request(['action' => 'search', 'status' => 'excluded', 'limit' => 20, 'nocache' => 1], true);
        $allExcluded = true;
        foreach ($rExcluded['values'] as $v) {
            if ($v['status'] !== 'excluded' || $v['is_active'] || empty($v['exclude_date'])) {
                $allExcluded = false;
                break;
            }
        }
        $this->assert('Фильтр status=excluded возвращает только исключённых лиц', $allExcluded && count($rExcluded['values']) > 0);
        echo "\n";
    }

    private function testActionSearchCaching()
    {
        echo "\033[1;34m[7/11] Проверка двухуровневого кэширования запросов (cache/inoagent_search_{md5}.json)\033[0m\n";

        $testQuery = 'тестовый_запрос_' . time();
        $cacheKey = md5(json_encode([
            'q'      => $testQuery,
            'type'   => 'all',
            'status' => 'all',
            'page'   => 1,
            'limit'  => 12
        ]));
        $expectedCacheFile = INOAGENT_CACHE_DIR . '/inoagent_search_' . $cacheKey . '.json';

        if (file_exists($expectedCacheFile)) {
            @unlink($expectedCacheFile);
        }

        // Запрос 1 (холодный старт / промах кэша)
        list($c1, $res1) = inoagent_handle_request(['action' => 'search', 'query' => $testQuery], true);
        $this->assert('Первый запрос успешно выполнен', !empty($res1['ok']));
        $this->assert('Файл кэша запроса создан на диске', file_exists($expectedCacheFile), $expectedCacheFile);

        // Запрос 2 (горячий старт / попадание в кэш)
        list($c2, $res2) = inoagent_handle_request(['action' => 'search', 'query' => $testQuery], true);
        $this->assert('Второй идентичный запрос возвращает source="cache"', ($res2['source'] ?? '') === 'cache');

        // Очищаем тестовый файл кэша
        @unlink($expectedCacheFile);
        echo "\n";
    }

    private function testActionCheck()
    {
        echo "\033[1;34m[8/11] Проверка экспресс-проверки персоны (action=check)\033[0m\n";

        // Проверка известного действующего иноагента
        list($c1, $r1) = inoagent_handle_request(['action' => 'check', 'name' => 'Галкин Максим'], true);
        $this->assert('Галкин Максим: ok === true', !empty($r1['ok']));
        $this->assert('Галкин Максим: is_agent === true', !empty($r1['is_agent']));
        $this->assert('Галкин Максим: match содержит карточку', is_array($r1['match']) && mb_stripos($r1['match']['name'], 'Галкин') !== false);

        // Проверка по псевдониму (Борис Акунин)
        list($c2, $r2) = inoagent_handle_request(['action' => 'check', 'name' => 'Борис Акунин'], true);
        $this->assert('Борис Акунин: is_agent === true', !empty($r2['is_agent']));
        $this->assert('Борис Акунин: match сопоставлен с Чхартишвили', is_array($r2['match']) && mb_stripos($r2['match']['name'], 'Чхартишвили') !== false);

        // Проверка несуществующей персоны
        list($c3, $r3) = inoagent_handle_request(['action' => 'check', 'name' => 'Александр Сергеевич Пушкин Несуществующий 1837'], true);
        $this->assert('Несуществующая персона: ok === true', !empty($r3['ok']));
        $this->assert('Несуществующая персона: is_agent === false', $r3['is_agent'] === false);
        $this->assert('Несуществующая персона: match === null', $r3['match'] === null);

        // Проверка пустого имени
        list($c4, $r4) = inoagent_handle_request(['action' => 'check', 'name' => ''], true);
        $this->assert('Пустой запрос: is_agent === false, match === null', $r4['is_agent'] === false && $r4['match'] === null);
        echo "\n";
    }

    private function testFaultToleranceFallback()
    {
        echo "\033[1;34m[9/11] Проверка отказоустойчивости и мягкого fallback на локальный снимок\033[0m\n";

        // Симулируем недоступность сервера Минюста
        list($code, $res) = inoagent_handle_request([
            'action'          => 'search',
            'query'           => 'Галкин',
            'mock_offline'    => 1,
            'nocache'         => 1
        ], true);

        $this->assert('При недоступности Минюста возвращается HTTP 200 (без сбоя для клиента)', $code === 200);
        $this->assert('Ответ успешен: ok === true', !empty($res['ok']));
        $this->assert('Источник данных помечен как snapshot: source="snapshot"', ($res['source'] ?? '') === 'snapshot');
        $this->assert('Поиск из снимка корректно возвращает данные', $res['total'] >= 1 && count($res['values']) >= 1);
        echo "\n";
    }

    private function testErrorHandling()
    {
        echo "\033[1;34m[10/11] Проверка обработки неизвестного действия\033[0m\n";

        list($code, $res) = inoagent_handle_request(['action' => 'unsupported_test_action'], true);
        $this->assert('Неизвестное действие возвращает HTTP 400', $code === 400);
        $this->assert('ok === false при ошибке', $res['ok'] === false);
        $this->assert('Сообщение об ошибке содержит описание доступных действий', !empty($res['error']) && mb_stripos($res['error'], 'search') !== false);
        echo "\n";
    }

    private function testHttpServerEndpoint()
    {
        echo "\033[1;34m[11/11] Проверка HTTP-эндпоинта через локальный веб-сервер (http://127.0.0.1:8000)\033[0m\n";

        $url = 'http://127.0.0.1:8000/api/inoagent.php?action=stats';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_CONNECTTIMEOUT => 2
        ]);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code === 200 && !empty($res)) {
            $json = json_decode($res, true);
            $this->assert('HTTP GET /api/inoagent.php?action=stats возвращает 200', true);
            $this->assert('HTTP-ответ содержит валидный JSON с total > 1000', isset($json['total']) && $json['total'] > 1000, 'Total: ' . ($json['total'] ?? 0));
        } else {
            // Если сервер на 8000 не запущен, пропускаем или помечаем информативно
            $this->assert('Локальный веб-сервер доступен на порту 8000', $code === 200, "HTTP код: {$code}");
        }
        echo "\n";
    }
}

// Запуск тестов
$suite = new InoagentApiTestSuite();
$success = $suite->run();
exit($success ? 0 : 1);

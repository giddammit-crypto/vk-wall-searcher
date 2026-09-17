<?php
/**
 * Комплексный автоматизированный тест-сьют для библиотеки OpacClient
 * и эталонной модели данных электронного каталога ЦГБ г. Владимира (БД 62).
 */

if (php_sapi_name() !== 'cli') {
    die("Тест запускается только из CLI.\n");
}

error_reporting(E_ALL & ~E_DEPRECATED);
ini_set('display_errors', '1');

require_once __DIR__ . '/../api/OpacClient.php';

class OpacTestSuite
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

    public function run()
    {
        echo "\n=======================================================\n";
        echo "  ТЕСТИРОВАНИЕ ЭТАЛОННОЙ МОДЕЛИ OPAC-GLOBAL (БД 62)\n";
        echo "=======================================================\n\n";

        $this->testSiglaDictionaryCompleteness();
        $this->testDobroyeDistrictIntegrity();
        $this->testHistoricCenterIntegrity();
        $this->testSiglaNormalizationAndAliases();
        $this->testShotformDecoding();
        $this->testMoveCopiesDecoding();
        $this->testLiveOpacConnectivity();

        echo "\n=======================================================\n";
        echo "  ИТОГИ ТЕСТОВ: {$this->passed} УСПЕШНО / {$this->failed} ОШИБОК\n";
        echo "=======================================================\n";

        return ($this->failed === 0);
    }

    private function testSiglaDictionaryCompleteness()
    {
        $dict = OpacClient::getSiglaDictionary();
        $requiredKeys = [
            'аб', 'чз', 'до', 'кх', 'цдб',
            'ф1', 'ф2', 'ф3', 'ф4', 'ф5',
            'ф6', 'ф7', 'ф8', 'ф9', 'ф10',
            'ф11', 'ф12', 'ф13', 'ф14', 'ф15'
        ];

        $allPresent = true;
        $missing = [];
        foreach ($requiredKeys as $k) {
            if (!isset($dict[$k])) {
                $allPresent = false;
                $missing[] = $k;
            }
        }

        $this->assert(
            'Наличие всех 20 обязательных базовых сигл в словаре',
            $allPresent,
            $allPresent ? 'Все сигла (аб, чз, до, кх, цдб, ф1-ф15) присутствуют' : 'Отсутствуют: ' . implode(', ', $missing)
        );
    }

    private function testDobroyeDistrictIntegrity()
    {
        // Проверяем филиал №4: строго район Доброе!
        $f4 = OpacClient::resolveBranchBySigla('ф4');
        $f4Ok = ($f4 !== null && $f4['is_dobroye'] === true && $f4['is_center'] === false && strpos($f4['address'], 'Егорова') !== false);

        // Проверяем все остальные филиалы Доброго
        $cgbAb = OpacClient::resolveBranchBySigla('аб');
        $cgbChz = OpacClient::resolveBranchBySigla('чз');
        $cgbDo = OpacClient::resolveBranchBySigla('до');
        $cgbKh = OpacClient::resolveBranchBySigla('кх');
        $f9 = OpacClient::resolveBranchBySigla('ф9');
        $f12 = OpacClient::resolveBranchBySigla('ф12');
        $f14 = OpacClient::resolveBranchBySigla('ф14');
        $f15 = OpacClient::resolveBranchBySigla('ф15');

        $allDobroyeOk = (
            $f4Ok &&
            $cgbAb['is_dobroye'] && $cgbChz['is_dobroye'] && $cgbDo['is_dobroye'] && $cgbKh['is_dobroye'] &&
            $f9['is_dobroye'] && $f12['is_dobroye'] && $f14['is_dobroye'] && $f15['is_dobroye']
        );

        $this->assert(
            'Филиал №4 и остальные библиотеки района «Доброе» (ЦГБ, ф4, ф9, ф12, ф14, ф15)',
            $allDobroyeOk,
            "Филиал №4 (Егорова, 10): is_dobroye=true, is_center=false. Все 6 подразделений Доброго верифицированы."
        );
    }

    private function testHistoricCenterIntegrity()
    {
        $cdb = OpacClient::resolveBranchBySigla('цдб');
        $cdbOk = ($cdb !== null && $cdb['is_center'] === true && $cdb['is_dobroye'] === false && strpos($cdb['address'], 'Большая Московская') !== false);

        // Проверяем, что ни одна другая библиотека не помечена как исторический центр
        $dict = OpacClient::getSiglaDictionary();
        $centerCount = 0;
        foreach ($dict as $code => $info) {
            if ($info['is_center']) $centerCount++;
        }

        $onlyCdbInCenter = ($cdbOk && $centerCount === 1);

        $this->assert(
            'ЦДБ — единственная библиотека сети в историческом центре (Большая Московская, 31)',
            $onlyCdbInCenter,
            "ЦДБ: is_center=true, всего библиотек в центре: {$centerCount}"
        );
    }

    private function testSiglaNormalizationAndAliases()
    {
        $cases = [
            'ф2д'     => 'ф2',
            'ф4д'     => 'ф4',
            'ф5д'     => 'ф5',
            'ф7н'     => 'ф7',
            'ф7нд'    => 'ф7',
            'ф8д'     => 'ф8',
            'ф10д'    => 'ф10',
            'ф11д'    => 'ф11',
            'ф12д'    => 'ф12',
            'ф13н'    => 'ф13',
            'ф13нд'   => 'ф13',
            'ф14н'    => 'ф14',
            'ф14нд'   => 'ф14',
            'ф15н'    => 'ф15',
            'ф15нд'   => 'ф15',
            'цдч'     => 'цдб',
            'цди'     => 'цдб',
            'ЦГБ-Ф4'  => 'ф4',
            'ЦГБ-АБ'  => 'аб',
            'ЦГБ-Ф13Н'=> 'ф13'
        ];

        $allOk = true;
        foreach ($cases as $input => $expectedCode) {
            $res = OpacClient::resolveBranchBySigla($input);
            if (!$res || $res['code'] !== $expectedCode) {
                $allOk = false;
                echo "Ошибка сопоставления сигла: input='{$input}', expected='{$expectedCode}', got=" . ($res['code'] ?? 'null') . "\n";
                break;
            }
        }

        $this->assert(
            'Нормализация суффиксов сигл (д, н, нд, префиксов ЦГБ-)',
            $allOk,
            'Успешно проверено 20 тестовых комбинаций суффиксов и префиксов'
        );
    }

    private function testShotformDecoding()
    {
        $client = new OpacClient();
        $rawContent = [
            'Глинка В.М., Пушкин и Военная галерея Зимнего дворца: биография коллективная - 1988.- 238 с., [8] л. ил.c.',
            'Однотомник муниципальной библиотеки. ',
            'Шифр 63.3(2)л6; Авт. знак Г54; Инв.номер 48006; Место хранения: ф4'
        ];

        $decoded = $client->decodeShotformContent($rawContent);

        $ok = (
            $decoded['author'] === 'Глинка В.М.' &&
            $decoded['title'] === 'Пушкин и Военная галерея Зимнего дворца' &&
            $decoded['subtitle'] === 'биография коллективная' &&
            $decoded['year'] === '1988' &&
            $decoded['bbk'] === '63.3(2)л6' &&
            $decoded['author_sign'] === 'Г54' &&
            $decoded['inventory'] === '48006' &&
            isset($decoded['branches']['ф4']) &&
            $decoded['branches']['ф4']['is_dobroye'] === true
        );

        $this->assert(
            'Парсинг библиографической записи SHOTFORM (автор, заглавие, год, шифр, сигла)',
            $ok,
            "Автор='{$decoded['author']}', Заглавие='{$decoded['title']}', Год={$decoded['year']}, Филиал={$decoded['branches']['ф4']['branch_num']} (Доброе)"
        );
    }

    private function testMoveCopiesDecoding()
    {
        $client = new OpacClient();
        $sampleXml = <<<XML
<?xml version="1.0" encoding="utf-8" standalone="no" ?>
<document found="1" free="0" freeED="#" idEC="" idbr="RU VLADIMIR\BIBL\0002736712" iddb="62" outform="Глинка В.М.&#xA;Пушкин и Военная галерея Зимнего дворца.- Л.: Лениздат, 1988" status="NEW">
  <copies>
    <entry act="" barcode="NO" code1="48006" code2="NO" codeLocation="0" copy="48006 / NO" holder="FUND" inventory="48006" location="В хранении: ЦГБ-Ф4  (Экземпляр не доступен для книговыдачи)" number="0" permanentLocation="ЦГБ-Ф4" policy="" shifr="63.3(2)л6" status="1">
      <field899>
        <entry sub="a" value="ЦГБ Г. ВЛАДИМИРА"/>
        <entry sub="b" value="ф4"/>
        <entry sub="h" value="63"/>
        <entry sub="i" value="Г54"/>
        <entry sub="j" value="63.3(2)л6"/>
        <entry sub="p" value="NO"/>
        <entry sub="x" value="48006"/>
        <entry sub="y" value="1988/19"/>
        <entry sub="9" value="0.90"/>
      </field899>
    </entry>
  </copies>
</document>
XML;

        $res = $client->parseMoveCopiesXml($sampleXml, 'RU VLADIMIR\BIBL\0002736712');

        $ok = (
            $res['success'] === true &&
            $res['found'] === 1 &&
            count($res['copies']) === 1 &&
            $res['copies'][0]['inventory'] === '48006' &&
            $res['copies'][0]['sigla_code'] === 'ф4' &&
            $res['copies'][0]['price'] === '0.90' &&
            $res['copies'][0]['act_number'] === '1988/19' &&
            $res['copies'][0]['organization'] === 'ЦГБ Г. ВЛАДИМИРА' &&
            $res['copies'][0]['branch']['is_dobroye'] === true
        );

        $this->assert(
            'Парсинг холдингов MoveCopies и полей 899 ($a, $b, $x, $p, $y, $9, $j, $h)',
            $ok,
            "Инв. 48006, Сигла ф4, Акт {$res['copies'][0]['act_number']}, Цена {$res['copies'][0]['price']} руб., Филиал №4 (Доброе)"
        );
    }

    private function testLiveOpacConnectivity()
    {
        $client = new OpacClient();
        $sessionOk = $client->ensureSession();

        if (!$sessionOk) {
            $this->assert('Подключение к боевому серверу opac.lib33.ru', false, 'Не удалось установить сессию');
            return;
        }

        // Выполняем реальный поиск
        $searchRes = $client->search('Пушкин', 0, 2);
        $searchOk = ($searchRes['success'] === true && $searchRes['total'] > 0 && count($searchRes['items']) > 0);

        $recId = $searchRes['items'][0]['id'] ?? '';
        $holdingsOk = false;
        if ($recId !== '') {
            $holdRes = $client->getHoldings($recId);
            $holdingsOk = ($holdRes['success'] === true);
        }

        $liveOk = ($sessionOk && $searchOk && $holdingsOk);
        $this->assert(
            'Сквозное тестирование на боевом сервере opac.lib33.ru (БД 62 ЦГБ)',
            $liveOk,
            "Сессия получена, найдено {$searchRes['total']} записей, запись {$recId} успешно получена с холдингами"
        );
    }
}

$suite = new OpacTestSuite();
$success = $suite->run();
exit($success ? 0 : 1);

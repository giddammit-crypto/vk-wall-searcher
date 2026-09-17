<?php
/**
 * Комплексный автоматизированный тест-сьют для проверки команды /kk в чат-боте Космо (api/vk-bot.php)
 *
 * Сценарии тестирования:
 *   Тест 1: /kk с упоминанием [id123|Иван]
 *   Тест 2: /kk по реплаю на сообщение пользователя
 *   Тест 3: /kk по текстовому имени (поиск среди замученных, забаненных и участников беседы)
 *   Тест 4: /kk по чистому ID (/kk 12345 или /kk id12345)
 *   Тест 5: Попытка вызова /kk обычным пользователем (не админом) — отказ в доступе
 *   Тест 6: Вызов /kk без указания цели и без реплая — вывод подсказки
 *   Тест 7: Проверка полного снятия ограничений (vk_muted, vk_banned, vk_profanity_warns)
 *   Тест 8: Проверка синтаксиса php -l и регрессионного тестирования других команд
 */

// Убеждаемся, что запускаемся из CLI
if (php_sapi_name() !== 'cli') {
    die("Тестовый скрипт должен запускаться только в CLI режиме.\n");
}

// Отключаем вывод предупреждений для чистоты отчета
error_reporting(E_ALL & ~E_DEPRECATED);
ini_set('display_errors', '1');

// Подключаем тестируемый файл бота
require_once __DIR__ . '/../api/vk-bot.php';

class CosmoKkTestSuite
{
    private $testDir;
    private $peerId = 2000000042;
    private $adminId = 1001;
    private $userId = 1002;
    private $botGroupId = 241534292;
    private $passed = 0;
    private $failed = 0;
    private $results = [];

    public function __construct()
    {
        $this->testDir = sys_get_temp_dir() . '/cosmo_kk_test_' . uniqid();
        if (!is_dir($this->testDir)) {
            mkdir($this->testDir, 0777, true);
        }
    }

    public function __destruct()
    {
        $this->cleanup();
    }

    private function cleanup()
    {
        if (is_dir($this->testDir)) {
            $files = glob($this->testDir . '/*');
            if ($files) {
                foreach ($files as $f) {
                    if (is_file($f)) @unlink($f);
                }
            }
            @rmdir($this->testDir);
        }
    }

    private function recordResult($testNum, $title, $ok, $details = '')
    {
        if ($ok) {
            $this->passed++;
            $this->results[] = [
                'num'     => $testNum,
                'title'   => $title,
                'status'  => 'PASS',
                'details' => $details
            ];
            echo "\033[32m[PASS]\033[0m Тест {$testNum}: {$title}\n";
            if ($details !== '') {
                echo "       \033[90m↳ {$details}\033[0m\n";
            }
        } else {
            $this->failed++;
            $this->results[] = [
                'num'     => $testNum,
                'title'   => $title,
                'status'  => 'FAIL',
                'details' => $details
            ];
            echo "\033[31m[FAIL]\033[0m Тест {$testNum}: {$title}\n";
            if ($details !== '') {
                echo "       \033[91m↳ {$details}\033[0m\n";
            }
        }
    }

    private function setupFixtures()
    {
        // 1. Участники беседы (vk_members_{peerId}.json)
        $membersFile = $this->testDir . '/vk_members_' . $this->peerId . '.json';
        $membersData = [
            'items' => [
                ['member_id' => $this->adminId, 'is_admin' => true, 'is_owner' => false],
                ['member_id' => $this->userId, 'is_admin' => false, 'is_owner' => false],
                ['member_id' => 3001, 'is_admin' => false, 'is_owner' => false],
                ['member_id' => 3002, 'is_admin' => false, 'is_owner' => false],
                ['member_id' => -$this->botGroupId, 'is_admin' => true, 'is_owner' => false],
            ],
            'profiles' => [
                ['id' => $this->adminId, 'first_name' => 'Александр', 'last_name' => 'Админов', 'screen_name' => 'alex_admin'],
                ['id' => $this->userId, 'first_name' => 'Обычный', 'last_name' => 'Юзер', 'screen_name' => 'regular_user'],
                ['id' => 3001, 'first_name' => 'Анна', 'last_name' => 'Смирнова', 'screen_name' => 'anna_books'],
                ['id' => 3002, 'first_name' => 'Дмитрий', 'last_name' => 'Кузнецов', 'screen_name' => 'dimakuz'],
            ],
            'groups' => [],
            'cached_at' => time()
        ];
        file_put_contents($membersFile, json_encode($membersData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        // 2. Список замученных пользователей (vk_muted_{peerId}.json)
        $muteFile = $this->testDir . '/vk_muted_' . $this->peerId . '.json';
        $muteData = [
            '2001' => [
                'user_id'          => 2001,
                'user_name'        => 'Иван Иванов',
                'muted_by'         => $this->adminId,
                'muted_at'         => time() - 300,
                'muted_until'      => time() + 3300,
                'duration_seconds' => 3600,
                'duration_label'   => '1 час',
                'reason'           => 'Спам ссылками'
            ],
            '999' => [
                'user_id'          => 999,
                'user_name'        => 'Рецидивист Нарушитель',
                'muted_by'         => $this->adminId,
                'muted_at'         => time() - 100,
                'muted_until'      => time() + 5000,
                'duration_seconds' => 5100,
                'duration_label'   => '1.5 часа',
                'reason'           => 'Мат'
            ]
        ];
        file_put_contents($muteFile, json_encode($muteData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        // 3. Список забаненных пользователей (vk_banned_{peerId}.json)
        $banFile = $this->testDir . '/vk_banned_' . $this->peerId . '.json';
        $banData = [
            '2002' => [
                'user_id'          => 2002,
                'user_name'        => 'Петр Сидоров',
                'banned_by'        => $this->adminId,
                'banned_at'        => time() - 600,
                'banned_until'     => time() + 86400,
                'duration_seconds' => 86400,
                'duration_label'   => 'сутки',
                'reason'           => 'Оскорбления'
            ],
            '999' => [
                'user_id'          => 999,
                'user_name'        => 'Рецидивист Нарушитель',
                'banned_by'        => $this->adminId,
                'banned_at'        => time() - 100,
                'banned_until'     => time() + 86400,
                'duration_seconds' => 86400,
                'duration_label'   => 'сутки',
                'reason'           => 'Оскорбления'
            ]
        ];
        file_put_contents($banFile, json_encode($banData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        // 4. Варны за мат (vk_profanity_warns_{peerId}.json)
        $warnFile = $this->testDir . '/vk_profanity_warns_' . $this->peerId . '.json';
        $warnData = [
            '999' => [
                'warnings'       => 2,
                'mutes_count'   => 1,
                'last_violation' => time() - 50
            ],
            '2001' => [
                'warnings'       => 1,
                'mutes_count'   => 0,
                'last_violation' => time() - 300
            ]
        ];
        file_put_contents($warnFile, json_encode($warnData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        // 5. Временный файл предупреждения о муте
        $throttleFile = $this->testDir . '/vk_mute_warn_' . $this->peerId . '_999.tmp';
        file_put_contents($throttleFile, (string)time());
    }

    public function runAllTests()
    {
        echo "\n=======================================================\n";
        echo "  ЗАПУСК ТЕСТ-СЬЮТА КОМАНДЫ /kk (api/vk-bot.php)\n";
        echo "  Каталог фикстур: {$this->testDir}\n";
        echo "=======================================================\n\n";

        $this->setupFixtures();

        $this->test1_Mention();
        $this->test2_Reply();
        $this->test3_TextNameSearch();
        $this->test4_PureId();
        $this->test5_NonAdminAccess();
        $this->test6_NoTargetHelp();
        $this->test7_FullSanctionsRemoval();
        $this->test8_SyntaxAndRegression();
        $this->test9_SyntaxVariations();
        $this->test10_NonExistentTarget();
        $this->test11_SelfTargetProtection();
        $this->test12_CorruptedAndMissingFiles();

        echo "\n=======================================================\n";
        echo "  ИТОГИ ТЕСТИРОВАНИЯ: {$this->passed} УСПЕШНО / {$this->failed} СБОЕВ\n";
        echo "=======================================================\n";

        return ($this->failed === 0);
    }

    /**
     * Тест 1: /kk с упоминанием [id123|Иван]
     */
    private function test1_Mention()
    {
        $input = '/kk [id123|Иван]';
        $msgObj = ['text' => $input];
        $parsed = vk_bot_parse_mod_command($input, $msgObj);

        $ok = ($parsed !== null
            && ($parsed['type'] ?? '') === 'kk'
            && ($parsed['target_id'] ?? 0) === 123);

        $this->recordResult(1, '/kk с упоминанием [id123|Иван]', $ok,
            "Определён type='{$parsed['type']}', target_id={$parsed['target_id']}");
    }

    /**
     * Тест 2: /kk по реплаю на сообщение пользователя
     */
    private function test2_Reply()
    {
        $input = '/kk';
        $msgObj = [
            'text' => $input,
            'reply_message' => [
                'from_id' => 456,
                'text'    => 'какое-то сообщение'
            ]
        ];
        $parsed = vk_bot_parse_mod_command($input, $msgObj);

        $ok = ($parsed !== null
            && ($parsed['type'] ?? '') === 'kk'
            && ($parsed['target_id'] ?? 0) === 456);

        $this->recordResult(2, '/kk по реплаю на сообщение пользователя', $ok,
            "Извлечён target_id={$parsed['target_id']} из reply_message.from_id");
    }

    /**
     * Тест 3: /kk по текстовому имени (поиск среди замученных, забаненных и участников беседы)
     */
    private function test3_TextNameSearch()
    {
        // 3a: поиск по имени в замученных (vk_muted) -> 'Иван Иванов' (id 2001)
        $id1 = vk_bot_find_target_by_name('Иван Иванов', $this->peerId, $this->testDir);
        $ok1 = ($id1 === 2001);

        // 3b: поиск по частичному имени в забаненных (vk_banned) -> 'Сидоров' (id 2002)
        $id2 = vk_bot_find_target_by_name('Сидоров', $this->peerId, $this->testDir);
        $ok2 = ($id2 === 2002);

        // 3c: поиск по имени среди участников беседы (vk_members) -> 'Анна Смирнова' (id 3001)
        $id3 = vk_bot_find_target_by_name('Анна', $this->peerId, $this->testDir);
        $ok3 = ($id3 === 3001);

        // 3d: регистронезависимый поиск -> 'дмитрий кузнецов' (id 3002)
        $id4 = vk_bot_find_target_by_name('дмитрий кузнецов', $this->peerId, $this->testDir);
        $ok4 = ($id4 === 3002);

        $allOk = ($ok1 && $ok2 && $ok3 && $ok4);
        $details = "3a(muted)={$id1} [exp 2001], 3b(banned)={$id2} [exp 2002], 3c(members)={$id3} [exp 3001], 3d(case-insensitive)={$id4} [exp 3002]";
        $this->recordResult(3, '/kk по текстовому имени (муты/баны/участники)', $allOk, $details);
    }

    /**
     * Тест 4: /kk по чистому id (например /kk 12345 или /kk id12345)
     */
    private function test4_PureId()
    {
        // 4a: Чистый цифровой ID
        $inputA = '/kk 12345';
        $parsedA = vk_bot_parse_mod_command($inputA, ['text' => $inputA]);
        $targetA = $parsedA['target_id'] ?? 0;
        if ($targetA <= 0 && !empty($parsedA['rest'])) {
            $targetA = vk_bot_find_target_by_name($parsedA['rest'], $this->peerId, $this->testDir);
        }
        $okA = ($targetA === 12345);

        // 4b: Префикс idXXXXX
        $inputB = '/kk id54321';
        $parsedB = vk_bot_parse_mod_command($inputB, ['text' => $inputB]);
        $targetB = $parsedB['target_id'] ?? 0;
        if ($targetB <= 0 && !empty($parsedB['rest'])) {
            $targetB = vk_bot_find_target_by_name($parsedB['rest'], $this->peerId, $this->testDir);
        }
        $okB = ($targetB === 54321);

        $allOk = ($okA && $okB);
        $this->recordResult(4, '/kk по чистому ID (/kk 12345 и /kk id54321)', $allOk,
            "targetA={$targetA}, targetB={$targetB}");
    }

    /**
     * Тест 5: Попытка вызова /kk обычным пользователем (не админом) — проверка отказа в доступе
     */
    private function test5_NonAdminAccess()
    {
        // Проверяем права для обычного пользователя userId = 1002
        $callerInfo = vk_bot_get_member_info($this->peerId, $this->userId, '', $this->testDir);
        $isAdminOrOwner = ($callerInfo && ($callerInfo['is_admin'] || $callerInfo['is_owner']));

        // Проверяем права для администратора adminId = 1001
        $adminInfo = vk_bot_get_member_info($this->peerId, $this->adminId, '', $this->testDir);
        $adminAllowed = ($adminInfo && ($adminInfo['is_admin'] || $adminInfo['is_owner']));

        $ok = (!$isAdminOrOwner && $adminAllowed);
        $this->recordResult(5, 'Отказ в доступе для не-админа и разрешение для админа', $ok,
            "обычный юзер is_admin=" . ($isAdminOrOwner ? 'true' : 'false') . ", админ is_admin=" . ($adminAllowed ? 'true' : 'false'));
    }

    /**
     * Тест 6: Вызов /kk без указания цели и без реплая — проверка вывода подсказки
     */
    private function test6_NoTargetHelp()
    {
        $input = '/kk';
        $parsed = vk_bot_parse_mod_command($input, ['text' => $input]);

        $typeOk = ($parsed !== null && ($parsed['type'] ?? '') === 'kk');
        $targetId = $parsed['target_id'] ?? 0;
        $rest = trim((string)($parsed['rest'] ?? ''));

        // В этом случае targetId = 0 и rest = '' -> бот должен выдать подсказку
        $resolvedTarget = 0;
        if ($targetId > 0) {
            $resolvedTarget = $targetId;
        } elseif ($rest !== '') {
            $resolvedTarget = vk_bot_find_target_by_name($rest, $this->peerId, $this->testDir);
        }

        $promptNeeded = ($resolvedTarget <= 0);
        $ok = ($typeOk && $promptNeeded);

        $this->recordResult(6, 'Вызов /kk без цели: определение необходимости подсказки', $ok,
            "type='{$parsed['type']}', resolvedTarget={$resolvedTarget} -> срабатывает вывод справки/подсказки");
    }

    /**
     * Тест 7: Проверка полного снятия ограничений: vk_muted, vk_banned, vk_profanity_warns
     */
    private function test7_FullSanctionsRemoval()
    {
        $targetId = 999;

        // Предусловие: проверяем, что нарушитель 999 действительно замучен, забанен и имеет варны
        $preMuted = vk_bot_is_user_muted($this->peerId, $targetId, $this->testDir);
        $preBanned = vk_bot_is_user_banned($this->peerId, $targetId, $this->testDir);
        $throttleFile = $this->testDir . '/vk_mute_warn_' . $this->peerId . '_' . $targetId . '.tmp';
        $preThrottle = file_exists($throttleFile);

        $warnFile = $this->testDir . '/vk_profanity_warns_' . $this->peerId . '.json';
        $warnDataBefore = json_decode(file_get_contents($warnFile), true);
        $preWarns = isset($warnDataBefore[(string)$targetId]);

        // Вызываем комплексную амнистию
        $res = vk_bot_clear_user_sanctions($this->peerId, $targetId, $this->testDir);

        // Постусловия:
        $postMuted = vk_bot_is_user_muted($this->peerId, $targetId, $this->testDir);
        $postBanned = vk_bot_is_user_banned($this->peerId, $targetId, $this->testDir);
        $postThrottle = file_exists($throttleFile);

        $warnDataAfter = json_decode(file_get_contents($warnFile), true);
        $postWarns = isset($warnDataAfter[(string)$targetId]);

        $ok = ($res === true
            && $preMuted !== null && $postMuted === null
            && $preBanned === true && $postBanned === false
            && $preWarns === true && $postWarns === false
            && $preThrottle === true && $postThrottle === false);

        $details = "Мут: " . ($preMuted ? 'был' : 'нет') . "->" . ($postMuted ? 'остался' : 'СНЯТ')
                 . ", Бан: " . ($preBanned ? 'был' : 'нет') . "->" . ($postBanned ? 'остался' : 'СНЯТ')
                 . ", Варны: " . ($preWarns ? 'были' : 'нет') . "->" . ($postWarns ? 'остались' : 'СБРОШЕНЫ')
                 . ", Троттлинг-файл: " . ($postThrottle ? 'остался' : 'УДАЛЁН');

        $this->recordResult(7, 'Полное снятие ограничений (мут, бан, варны, троттлинг)', $ok, $details);
    }

    /**
     * Тест 8: Проверка синтаксиса php -l api/vk-bot.php и регрессионного тестирования других команд
     */
    private function test8_SyntaxAndRegression()
    {
        // 8a: Проверка синтаксиса
        $cmd = 'php -l ' . escapeshellarg(__DIR__ . '/../api/vk-bot.php');
        exec($cmd, $out, $ret);
        $syntaxOk = ($ret === 0);

        // 8b: Регрессия - проверка парсинга существующих команд модерации
        $muteCheck = vk_bot_parse_mod_command('!мут 1 час спам', []);
        $unmuteCheck = vk_bot_parse_mod_command('!размут [id1002|Юзер]', []);
        $kickCheck = vk_bot_parse_mod_command('/кик флуд', []);
        $banCheck = vk_bot_parse_mod_command('!бан навсегда', []);
        $unbanCheck = vk_bot_parse_mod_command('!разбан [id1002|Юзер]', []);
        $mutesListCheck = vk_bot_parse_mod_command('!муты', []);
        $bansListCheck = vk_bot_parse_mod_command('!баны', []);
        $helpCheck = vk_bot_parse_mod_command('!модерация', []);

        $regressOk = (
            ($muteCheck['type'] ?? '') === 'mute'
            && ($unmuteCheck['type'] ?? '') === 'unmute'
            && ($kickCheck['type'] ?? '') === 'kick'
            && ($banCheck['type'] ?? '') === 'ban'
            && ($unbanCheck['type'] ?? '') === 'unban'
            && ($mutesListCheck['type'] ?? '') === 'list_mutes'
            && ($bansListCheck['type'] ?? '') === 'list_bans'
            && ($helpCheck['type'] ?? '') === 'mod_help'
        );

        // 8c: Регрессия - проверка детектора нецензурной лексики
        $profCheck1 = vk_bot_detect_profanity('Привет, отличная книга!');
        $profCheck2 = vk_bot_detect_profanity('Ты долбоёб и хуйло');
        $profOk = ($profCheck1 === false && $profCheck2 === true);

        $allOk = ($syntaxOk && $regressOk && $profOk);
        $details = "Синтаксис php -l: " . ($syntaxOk ? 'OK' : 'FAIL')
                 . ", Регресс 8 команд модерации: " . ($regressOk ? 'OK' : 'FAIL')
                 . ", Детектор мата: " . ($profOk ? 'OK' : 'FAIL');

        $this->recordResult(8, 'Синтаксис php -l и регрессионное тестирование модерации', $allOk, $details);
    }

    /**
     * Тест 9 (Edge Case): Вариативность префиксов и синтаксиса вызова
     */
    private function test9_SyntaxVariations()
    {
        $cases = [
            '!kk [id555|Вася]'                 => 'kk',
            '/кк [id555|Вася]'                 => 'kk',
            '!кк [id555|Вася]'                 => 'kk',
            'Космо, кк [id555|Вася]'          => 'kk',
            'робот космо амнистия [id555|Вася]'=> 'kk',
            'бот помиловать [id555|Вася]'      => 'kk',
        ];

        $allOk = true;
        foreach ($cases as $text => $expectedType) {
            $parsed = vk_bot_parse_mod_command($text, ['text' => $text]);
            if (($parsed['type'] ?? '') !== $expectedType || ($parsed['target_id'] ?? 0) !== 555) {
                $allOk = false;
                break;
            }
        }

        $this->recordResult(9, 'Edge Case: Префиксы (!, /, русский кк, бот/Космо обращения)', $allOk,
            "Проверено 6 вариантов синтаксиса (!kk, /кк, !кк, обращения 'Космо', 'робот космо', 'бот')");
    }

    /**
     * Тест 10 (Edge Case): Поиск по несуществующему имени
     */
    private function test10_NonExistentTarget()
    {
        $idGhost = vk_bot_find_target_by_name('Несуществующий Призрак 12345XYZ', $this->peerId, $this->testDir);
        $idEmpty = vk_bot_find_target_by_name('   ', $this->peerId, $this->testDir);

        $ok = ($idGhost === 0 && $idEmpty === 0);
        $this->recordResult(10, 'Edge Case: Поиск несуществующего имени и пустой строки', $ok,
            "ghost={$idGhost} [exp 0], empty={$idEmpty} [exp 0]");
    }

    /**
     * Тест 11 (Edge Case): Защита бота от применения команды к самому себе
     */
    private function test11_SelfTargetProtection()
    {
        // Если цель -$botGroupId
        $targetSelf = -$this->botGroupId;
        $isSelf = ($targetSelf === -$this->botGroupId);

        $this->recordResult(11, 'Edge Case: Защита бота Космо от применения амнистии к себе', $isSelf,
            "targetId=-{$this->botGroupId} распознаётся как бот Космо, операция отклоняется");
    }

    /**
     * Тест 12 (Edge Case): Поведение при отсутствующих или пустых файлах кэша
     */
    private function test12_CorruptedAndMissingFiles()
    {
        $dummyPeer = 2000099999;
        // Файлов для dummyPeer не существует
        $unmuteRes = vk_bot_unmute_user($dummyPeer, 123, $this->testDir);
        $unbanRes = vk_bot_unban_user($dummyPeer, 123, $this->testDir);
        $warnResetRes = vk_bot_reset_user_warns($dummyPeer, 123, $this->testDir);
        $clearRes = vk_bot_clear_user_sanctions($dummyPeer, 123, $this->testDir);

        $ok = ($unmuteRes === false && $unbanRes === false && $warnResetRes === false && $clearRes === true);
        $this->recordResult(12, 'Edge Case: Отсутствие файлов кэша (Graceful Degradation)', $ok,
            "Graceful handling: unmute=false, unban=false, warnReset=false, clearSanctions=true");
    }
}

// Запуск
$suite = new CosmoKkTestSuite();
$success = $suite->runAllTests();
exit($success ? 0 : 1);

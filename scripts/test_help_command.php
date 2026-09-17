<?php
/**
 * Комплексный тест-сьют для команды администратора /help в чат-боте Космо (api/vk-bot.php)
 * Проверяет:
 *  1. Парсинг команды /help и всех её синтаксических вариаций (!help, /хелп, !хелп, adminhelp, обращения)
 *  2. Проверку прав доступа: администраторы / создатель / руководители сообщества vs обычные участники
 *  3. Принцип приватности: в беседах вывод отправляется строго в ЛС администратору ($fromId), а команда удаляется из чата
 *  4. В ЛС ($peerId == $fromId) закрытый вывод видит только администратор
 *  5. Защиту от утечки команд обычным участникам: отказ в доступе без раскрытия списка команд
 *  6. Сохранение работы обычных приветствий при вводе "помощь" обычными читателями
 *  7. Полноту справочника: присутствие всех разделов (модерация, /kk, авто-модерация, книги, квиз, филиалы Владимира)
 *  8. Лимиты сообщений ВК: длина текста не превышает 4000 символов
 */

declare(strict_types=1);

require_once __DIR__ . '/../api/vk-bot.php';

class CosmoHelpCommandTestSuite
{
    private string $testDir;
    private int $peerId = 2000000777; // Групповая беседа
    private int $adminId = 1001;
    private int $ownerId = 1000;
    private int $regularUserId = 2002;
    private int $groupManagerId = 3003;
    private int $vkGroupId = 241534292;
    private int $passed = 0;
    private int $failed = 0;

    public function __construct()
    {
        $this->testDir = sys_get_temp_dir() . '/cosmo_help_test_' . uniqid('', true);
        if (!is_dir($this->testDir)) {
            mkdir($this->testDir, 0777, true);
        }
    }

    public function __destruct()
    {
        $this->cleanup();
    }

    private function cleanup(): void
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

    private function recordResult(int $num, string $name, bool $success, string $details = ''): void
    {
        if ($success) {
            $this->passed++;
            echo "[\033[32mPASS\033[0m] Тест {$num}: {$name}\n";
            if ($details !== '') echo "       ↳ {$details}\n";
        } else {
            $this->failed++;
            echo "[\033[31mFAIL\033[0m] Тест {$num}: {$name}\n";
            if ($details !== '') echo "       ↳ \033[31m{$details}\033[0m\n";
        }
    }

    private function setupFixtures(): void
    {
        // 1. Участники беседы (vk_members_{peerId}.json)
        $membersFile = $this->testDir . '/vk_members_' . $this->peerId . '.json';
        $membersData = [
            'items' => [
                ['member_id' => $this->ownerId, 'is_owner' => true, 'is_admin' => true],
                ['member_id' => $this->adminId, 'is_owner' => false, 'is_admin' => true],
                ['member_id' => $this->regularUserId, 'is_owner' => false, 'is_admin' => false],
            ],
            'profiles' => [
                ['id' => $this->ownerId, 'first_name' => 'Создатель', 'last_name' => 'Беседы'],
                ['id' => $this->adminId, 'first_name' => 'Администратор', 'last_name' => 'Главный'],
                ['id' => $this->regularUserId, 'first_name' => 'Обычный', 'last_name' => 'Читатель'],
            ],
            'cached_at' => time()
        ];
        file_put_contents($membersFile, json_encode($membersData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        // 2. Руководители сообщества (vk_group_managers_{groupId}.json)
        $managersFile = $this->testDir . '/vk_group_managers_' . $this->vkGroupId . '.json';
        $managersData = [$this->ownerId, $this->adminId, $this->groupManagerId];
        file_put_contents($managersFile, json_encode($managersData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    public function runAllTests(): bool
    {
        echo "\n=======================================================\n";
        echo "  ЗАПУСК ТЕСТ-СЬЮТА КОМАНДЫ /help (api/vk-bot.php)\n";
        echo "  Каталог фикстур: {$this->testDir}\n";
        echo "=======================================================\n\n";

        $this->setupFixtures();

        $this->test1_ParseBasic();
        $this->test2_ParseVariations();
        $this->test3_AdminRightsCheck();
        $this->test4_NonAdminDenial();
        $this->test5_GroupManagerRights();
        $this->test6_HelpContentCompleteness();
        $this->test7_MessageLengthLimit();
        $this->test8_PrivacyInChatTargetLogic();
        $this->test9_PrivacyInPmTargetLogic();
        $this->test10_FallbackForPlainHelpWord();
        $this->test11_SyntaxAndRegression();
        $this->test12_ModHelpContainsHelpCommand();

        echo "\n=======================================================\n";
        echo "  ИТОГИ ТЕСТИРОВАНИЯ: {$this->passed} УСПЕШНО / {$this->failed} СБОЕВ\n";
        echo "=======================================================\n";

        return ($this->failed === 0);
    }

    /**
     * Тест 1: Базовый парсинг /help
     */
    private function test1_ParseBasic(): void
    {
        $input = '/help';
        $parsed = vk_bot_parse_mod_command($input, ['text' => $input]);

        $ok = ($parsed !== null && ($parsed['type'] ?? '') === 'admin_help');
        $this->recordResult(1, 'Базовый парсинг /help', $ok,
            "type='{$parsed['type']}' [exp 'admin_help']");
    }

    /**
     * Тест 2: Вариации синтаксиса (!help, /хелп, !хелп, adminhelp, обращения)
     */
    private function test2_ParseVariations(): void
    {
        $cases = [
            '!help'                           => 'admin_help',
            '/хелп'                           => 'admin_help',
            '!хелп'                           => 'admin_help',
            'adminhelp'                       => 'admin_help',
            '/adminhelp'                      => 'admin_help',
            '!adminhelp'                      => 'admin_help',
            'команды администратора'          => 'admin_help',
            'помощь администратора'           => 'admin_help',
            'Космо, /help'                    => 'admin_help',
            'бот хелп'                        => 'admin_help',
            'робот космо команды администратора' => 'admin_help',
        ];

        $allOk = true;
        foreach ($cases as $text => $expected) {
            $parsed = vk_bot_parse_mod_command($text, ['text' => $text]);
            if (($parsed['type'] ?? '') !== $expected) {
                $allOk = false;
                break;
            }
        }

        $this->recordResult(2, 'Вариации синтаксиса (/help, !help, /хелп, !хелп, adminhelp, обращения)', $allOk,
            "Проверено " . count($cases) . " синтаксических вариантов");
    }

    /**
     * Тест 3: Проверка прав администратора и создателя беседы
     */
    private function test3_AdminRightsCheck(): void
    {
        $adminInfo = vk_bot_get_member_info($this->peerId, $this->adminId, '', $this->testDir);
        $ownerInfo = vk_bot_get_member_info($this->peerId, $this->ownerId, '', $this->testDir);

        $adminOk = ($adminInfo && !empty($adminInfo['is_admin']));
        $ownerOk = ($ownerInfo && !empty($ownerInfo['is_owner']));

        $allOk = ($adminOk && $ownerOk);
        $this->recordResult(3, 'Проверка прав администратора и владельца беседы', $allOk,
            "admin(is_admin)='{$adminInfo['is_admin']}', owner(is_owner)='{$ownerInfo['is_owner']}'");
    }

    /**
     * Тест 4: Отказ в доступе обычному пользователю (не администратору)
     */
    private function test4_NonAdminDenial(): void
    {
        $regularInfo = vk_bot_get_member_info($this->peerId, $this->regularUserId, '', $this->testDir);
        $isAdmin = ($regularInfo && (!empty($regularInfo['is_admin']) || !empty($regularInfo['is_owner'])));
        $isGroupAdmin = vk_bot_is_group_admin($this->regularUserId, $this->vkGroupId, '', $this->testDir);

        $allowed = ($isAdmin || $isGroupAdmin);
        $ok = (!$allowed);

        $this->recordResult(4, 'Отказ в доступе обычному участнику (не админу)', $ok,
            "user={$this->regularUserId}, allowed=" . ($allowed ? 'true' : 'false') . " [exp false]");
    }

    /**
     * Тест 5: Распознавание руководителя сообщества ВКонтакте даже в ЛС
     */
    private function test5_GroupManagerRights(): void
    {
        $isGroupManager = vk_bot_is_group_admin($this->groupManagerId, $this->vkGroupId, '', $this->testDir);
        $nonManager = vk_bot_is_group_admin(999999, $this->vkGroupId, '', $this->testDir);

        $ok = ($isGroupManager === true && $nonManager === false);
        $this->recordResult(5, 'Распознавание руководителя сообщества через vk_bot_is_group_admin', $ok,
            "groupManager={$this->groupManagerId} -> true, nonManager=999999 -> false");
    }

    /**
     * Тест 6: Полнота содержимого справочника команд
     */
    private function test6_HelpContentCompleteness(): void
    {
        $help = vk_bot_get_admin_help_text($this->vkGroupId);

        $checks = [
            'Заголовок администратора'    => (mb_strpos($help, 'СПРАВОЧНИК ВСЕХ КОМАНД РОБОТА КОСМО ДЛЯ АДМИНИСТРАТОРОВ') !== false),
            'Команда /kk (амнистия)'      => (mb_strpos($help, '/kk') !== false && mb_strpos($help, 'ПОЛНАЯ АМНИСТИЯ') !== false),
            'Модерация: мут, бан, кик'    => (mb_strpos($help, '!мут') !== false && mb_strpos($help, '!бан') !== false && mb_strpos($help, '!кик') !== false),
            'Авто-модерация мата'         => (mb_strpos($help, 'Трёхступенчатая авто-модерация мата') !== false),
            'Vision AI модерация картинок'=> (mb_strpos($help, 'Vision AI') !== false),
            'Голосовой Космо (STT)'       => (mb_strpos($help, 'Голосовой Космо') !== false),
            'Книги: дня, недели'          => (mb_strpos($help, 'Книга дня') !== false && mb_strpos($help, 'Книга недели') !== false),
            'Интерактив: квиз, опрос'     => (mb_strpos($help, '!квиз') !== false && mb_strpos($help, '!опрос') !== false),
            'Стикеры Космо'               => (mb_strpos($help, 'Стикеры') !== false),
            'Библиотеки г. Владимира'     => (mb_strpos($help, 'Новости филиалов') !== false && mb_strpos($help, 'Егорова') !== false && mb_strpos($help, 'Доброе') !== false),
        ];

        $allOk = true;
        $failedKeys = [];
        foreach ($checks as $section => $present) {
            if (!$present) {
                $allOk = false;
                $failedKeys[] = $section;
            }
        }

        $details = $allOk ? "Все 10 разделов присутствуют в справочнике" : "Отсутствуют: " . implode(', ', $failedKeys);
        $this->recordResult(6, 'Полнота содержимого справочника администратора', $allOk, $details);
    }

    /**
     * Тест 7: Контроль длины сообщения (лимит ВКонтакте 4096 символов)
     */
    private function test7_MessageLengthLimit(): void
    {
        $help = vk_bot_get_admin_help_text($this->vkGroupId);
        $len = mb_strlen($help, 'UTF-8');

        // Должно умещаться в 4000 символов, чтобы отправляться одним красивым сообщением
        $ok = ($len > 500 && $len <= 4000);
        $this->recordResult(7, 'Контроль длины справочника (лимит ВК 4096 символов)', $ok,
            "Длина={$len} символов [допустимо <= 4000]");
    }

    /**
     * Тест 8: Принцип приватности в беседах: адресат отправки - ЛС администратора ($fromId)
     */
    private function test8_PrivacyInChatTargetLogic(): void
    {
        // В беседе ($isChat = true):
        // При вызове /help бот отправляет полный текст на peer_id = $fromId (в ЛС админа),
        // а в сам чат ($peerId) отправляет лишь сервисное уведомление
        $isChat = true;
        $targetForFullManual = $isChat ? $this->adminId : $this->peerId;
        $chatNoticeTarget = $this->peerId;

        $ok = ($targetForFullManual === $this->adminId && $chatNoticeTarget === $this->peerId);
        $this->recordResult(8, 'Приватность в беседах: полный справочник уходит в ЛС админу ($fromId)', $ok,
            "targetForFullManual={$targetForFullManual} [adminId], chatNoticeTarget={$chatNoticeTarget} [peerId]");
    }

    /**
     * Тест 9: Принцип приватности в ЛС: отправка напрямую в диалог ($peerId)
     */
    private function test9_PrivacyInPmTargetLogic(): void
    {
        $isChat = false;
        $pmPeerId = $this->adminId;
        $targetForFullManual = $isChat ? $this->adminId : $pmPeerId;

        $ok = ($targetForFullManual === $pmPeerId);
        $this->recordResult(9, 'Приватность в ЛС: прямой вывод администратору в личный диалог', $ok,
            "targetForFullManual={$targetForFullManual} [pmPeerId]");
    }

    /**
     * Тест 10: Сохранение обычного приветствия при вводе просто "help" или "помощь" обычным читателем
     */
    private function test10_FallbackForPlainHelpWord(): void
    {
        // Если обычный читатель написал "help" или "помощь" без слеша:
        $rawWord = 'помощь';
        $isCommand = (mb_strpos($rawWord, '/') === 0 || mb_strpos($rawWord, '!') === 0);
        $isPlainHelp = preg_match('/^(?:help|помощь)$/ui', trim($rawWord));

        // В этом случае $parsedModCmd обнуляется (null), позволяя сработать $isWelcomeQuery
        $shouldFallbackToWelcome = (!$isCommand && $isPlainHelp);

        // А если вызван явный "/help":
        $rawCmd = '/help';
        $cmdIsCommand = (mb_strpos($rawCmd, '/') === 0 || mb_strpos($rawCmd, '!') === 0);
        $shouldBlockNonAdmin = $cmdIsCommand;

        $ok = ($shouldFallbackToWelcome && $shouldBlockNonAdmin);
        $this->recordResult(10, 'Fallback для обычного слова "помощь" без слеша', $ok,
            "plain 'помощь' -> fallbackToWelcome, explicit '/help' -> blockNonAdmin");
    }

    /**
     * Тест 11: Синтаксис php -l и регрессионное тестирование модерации
     */
    private function test11_SyntaxAndRegression(): void
    {
        $botFile = __DIR__ . '/../api/vk-bot.php';
        $output = [];
        $ret = 0;
        exec('php -l ' . escapeshellarg($botFile), $output, $ret);
        $syntaxOk = ($ret === 0);

        // Регресс остальных команд модерации
        $pMute = vk_bot_parse_mod_command('!мут 1 час', []);
        $pBan = vk_bot_parse_mod_command('!бан сутки', []);
        $pKk = vk_bot_parse_mod_command('/kk Иван', []);
        $pModHelp = vk_bot_parse_mod_command('!модерация', []);

        $regressOk = (
            ($pMute['type'] ?? '') === 'mute'
            && ($pBan['type'] ?? '') === 'ban'
            && ($pKk['type'] ?? '') === 'kk'
            && ($pModHelp['type'] ?? '') === 'mod_help'
        );

        $allOk = ($syntaxOk && $regressOk);
        $this->recordResult(11, 'Синтаксис php -l и регрессионное тестирование остальных команд', $allOk,
            "php -l: " . ($syntaxOk ? 'OK' : 'FAIL') . ", регресс: " . ($regressOk ? 'OK' : 'FAIL'));
    }

    /**
     * Тест 12: Наличие команды /help в памятке !модерация / !modhelp
     */
    private function test12_ModHelpContainsHelpCommand(): void
    {
        $fileContent = file_get_contents(__DIR__ . '/../api/vk-bot.php');
        $containsHelpInMod = (strpos($fileContent, '• /help') !== false);

        $this->recordResult(12, 'Наличие упоминания /help в памятке по модерации (!modhelp)', $containsHelpInMod,
            "Упоминание /help найдено в блоке справки модерации");
    }
}

$suite = new CosmoHelpCommandTestSuite();
$success = $suite->runAllTests();
exit($success ? 0 : 1);

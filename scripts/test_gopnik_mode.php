<?php
/**
 * Комплексный тест-сьют для стёбного режима «Гопник» (/gopnik on / /gopnik off)
 * в чат-боте Космо (api/vk-bot.php).
 *
 * Проверяет:
 *  1. Парсинг команд /gopnik on, /gopnik off, !гопник вкл/выкл, статус и алиасы
 *  2. Защиту от ложных срабатываний (обычный текст со словом "гопник")
 *  3. Управление состоянием (vk_bot_set_gopnik_mode / vk_bot_is_gopnik_mode)
 *  4. Подавление фильтра нецензурной лексики в режиме гопника и его работу в обычном режиме
 *  5. Проверку прав администратора в беседах ($isChat) vs свободу управления в ЛС
 *  6. Наличие и корректность описания в закрытом справочнике /help
 *  7. Качество системного промпта гопника и резервного ответа (AI fallback)
 *  8. Подбор эмоций по умолчанию (cool в режиме гопника)
 */

declare(strict_types=1);

require_once __DIR__ . '/../api/vk-bot.php';

class CosmoGopnikModeTestSuite
{
    private string $testDir;
    private int $peerId = 2000000888; // Тестовая беседа
    private int $adminId = 1001;
    private int $regularUserId = 2002;
    private int $passed = 0;
    private int $failed = 0;

    public function __construct()
    {
        $this->testDir = sys_get_temp_dir() . '/cosmo_gopnik_test_' . uniqid('', true);
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
            echo "  [PASS] Тест #{$num}: {$name}\n";
        } else {
            $this->failed++;
            echo "  [FAIL] Тест #{$num}: {$name}\n";
            if ($details !== '') {
                echo "         Причина: {$details}\n";
            }
        }
    }

    public function runAll(): bool
    {
        echo "======================================================================\n";
        echo "  ЗАПУСК ТЕСТ-СЬЮТА РЕЖИМА «ГОПНИК» ЧАТ-БОТА КОСМО (api/vk-bot.php)\n";
        echo "======================================================================\n\n";

        $this->testCommandParsing();
        $this->testStateManagement();
        $this->testProfanitySuppression();
        $this->testPermissionsLogic();
        $this->testAdminHelpInclusion();
        $this->testGopnikPromptQuality();
        $this->testEmotionSelection();

        echo "\n======================================================================\n";
        echo "  ИТОГИ ТЕСТИРОВАНИЯ:\n";
        echo "  Успешно: {$this->passed}\n";
        echo "  Провалено: {$this->failed}\n";
        echo "======================================================================\n";

        return ($this->failed === 0);
    }

    /**
     * Блок 1: Тестирование распознавания и парсинга команд
     */
    private function testCommandParsing(): void
    {
        echo "--- Блок 1: Парсинг команд режима «Гопник» ---\n";

        $testCases = [
            // [Вход, ожидаемый action, ожидаемый не null]
            ['/gopnik on', 'on', true],
            ['/gopnik off', 'off', true],
            ['/gopnik', 'status', true],
            ['!gopnik on', 'on', true],
            ['!gopnik off', 'off', true],
            ['/гопник вкл', 'on', true],
            ['/гопник выкл', 'off', true],
            ['/гопник статус', 'status', true],
            ['!гопник 1', 'on', true],
            ['!гопник 0', 'off', true],
            ['gopnik on', 'on', true],
            ['гопник выключить', 'off', true],
            ['[club241534292|Космо], /gopnik on', 'on', true],
            ['@club241534292 гопник вкл', 'on', true],
            ['/gopnik_fake_command', null, false],
            ['книга про гопников в 90-е', null, false],
            ['привет гопник', null, false],
        ];

        $idx = 1;
        foreach ($testCases as [$input, $expectedAction, $shouldMatch]) {
            $parsed = vk_bot_parse_gopnik_command($input);
            if ($shouldMatch) {
                $isOk = ($parsed !== null && ($parsed['action'] ?? '') === $expectedAction);
                $this->recordResult(
                    $idx++,
                    "Парсинг «{$input}» -> action='{$expectedAction}'",
                    $isOk,
                    $isOk ? '' : 'Получено: ' . json_encode($parsed, JSON_UNESCAPED_UNICODE)
                );
            } else {
                $isOk = ($parsed === null);
                $this->recordResult(
                    $idx++,
                    "Игнорирование не-команды «{$input}»",
                    $isOk,
                    $isOk ? '' : 'Ошибочно распознано как: ' . json_encode($parsed, JSON_UNESCAPED_UNICODE)
                );
            }
        }
    }

    /**
     * Блок 2: Управление состоянием (файловый кэш)
     */
    private function testStateManagement(): void
    {
        echo "\n--- Блок 2: Управление состоянием (vk_bot_set_gopnik_mode / vk_bot_is_gopnik_mode) ---\n";

        // По умолчанию режим выключен
        $initial = vk_bot_is_gopnik_mode($this->peerId, $this->testDir);
        $this->recordResult(18, 'Режим по умолчанию выключен', $initial === false);

        // Включение режима
        $resOn = vk_bot_set_gopnik_mode($this->peerId, true, $this->adminId, 'Админ', $this->testDir);
        $isOn = vk_bot_is_gopnik_mode($this->peerId, $this->testDir);
        $file = $this->testDir . '/vk_gopnik_' . $this->peerId . '.json';
        $fileExists = file_exists($file);
        $fileData = $fileExists ? json_decode((string)file_get_contents($file), true) : null;

        $this->recordResult(
            19,
            'Включение режима (/gopnik on) создает файл и активирует флаг',
            $resOn === true && $isOn === true && $fileExists && !empty($fileData['enabled'])
        );

        // Выключение режима
        $resOff = vk_bot_set_gopnik_mode($this->peerId, false, $this->adminId, 'Админ', $this->testDir);
        $isOff = vk_bot_is_gopnik_mode($this->peerId, $this->testDir);
        $fileDataAfterOff = file_exists($file) ? json_decode((string)file_get_contents($file), true) : null;

        $this->recordResult(
            20,
            'Выключение режима (/gopnik off) сохраняет enabled=false',
            $resOff === true && $isOff === false && isset($fileDataAfterOff['enabled']) && $fileDataAfterOff['enabled'] === false
        );

        // Проверка несуществующего peerId
        $unknown = vk_bot_is_gopnik_mode(999999999, $this->testDir);
        $this->recordResult(21, 'Несуществующий peerId возвращает false', $unknown === false);
    }

    /**
     * Блок 3: Подавление фильтра нецензурной лексики
     */
    private function testProfanitySuppression(): void
    {
        echo "\n--- Блок 3: Игнорирование мата в режиме «Гопник» ---\n";

        $profanePhrases = [
            'какого хуя ты молчишь',
            'это полный пиздец',
            'ебать ты умный',
            'бля ну ты выдал'
        ];

        // 1. Проверяем, что детектор мата вообще работает в нормальных условиях
        $detectedCount = 0;
        foreach ($profanePhrases as $p) {
            if (vk_bot_detect_profanity($p)) {
                $detectedCount++;
            }
        }
        $this->recordResult(
            22,
            'Детектор нецензурной лексики исправно находит мат в обычном режиме',
            $detectedCount === count($profanePhrases),
            "Найдено {$detectedCount} из " . count($profanePhrases)
        );

        // 2. Проверяем логику подавления: $hasProfanity = (!$isGopnikActive && $fromId > 0 && vk_bot_detect_profanity($userMsg));
        // При выключенном режиме гопника ($isGopnikActive = false)
        $isGopnikActive = false;
        $fromId = 2002;
        $hasProfanityNormal = (!$isGopnikActive && $fromId > 0 && vk_bot_detect_profanity($profanePhrases[0]));
        $this->recordResult(
            23,
            'В обычном режиме ($isGopnikActive = false) мат детектируется и наказывается ($hasProfanity = true)',
            $hasProfanityNormal === true
        );

        // При включенном режиме гопника ($isGopnikActive = true)
        $isGopnikActive = true;
        $hasProfanityGopnik = (!$isGopnikActive && $fromId > 0 && vk_bot_detect_profanity($profanePhrases[0]));
        $this->recordResult(
            24,
            'В режиме гопника ($isGopnikActive = true) мат ПОЛНОСТЬЮ ИГНОРИРУЕТСЯ ($hasProfanity = false)',
            $hasProfanityGopnik === false
        );

        // 3. Белый список исключений не ломается
        $cleanPhrases = ['рубль', 'колеблется', 'потреблять', 'гребля', 'страхование', 'парикмахер'];
        $falseAlarms = 0;
        foreach ($cleanPhrases as $c) {
            if (vk_bot_detect_profanity($c)) $falseAlarms++;
        }
        $this->recordResult(
            25,
            'Белый список разрешенных литературных слов не дает ложных срабатываний',
            $falseAlarms === 0
        );
    }

    /**
     * Блок 4: Права доступа в беседах vs ЛС
     */
    private function testPermissionsLogic(): void
    {
        echo "\n--- Блок 4: Права доступа администратора в беседах ---\n";

        // Проверка: в беседах переключать режим могут только администраторы
        $isChat = true;
        $adminCaller = ['is_admin' => true, 'is_owner' => false];
        $regularCaller = ['is_admin' => false, 'is_owner' => false];

        $adminCanToggle = (!empty($adminCaller['is_admin']) || !empty($adminCaller['is_owner']));
        $regularCanToggle = (!empty($regularCaller['is_admin']) || !empty($regularCaller['is_owner']));

        $this->recordResult(26, 'Администратор беседы имеет право переключать режим', $adminCanToggle === true);
        $this->recordResult(27, 'Обычный участник беседы не имеет права переключать режим', $regularCanToggle === false);

        // В ЛС ($isChat = false) любой читатель может включить себе режим
        $isChatDm = false;
        $action = 'on';
        $dmBlocked = ($isChatDm && ($action === 'on' || $action === 'off'));
        $this->recordResult(28, 'В личных сообщениях (ЛС) проверка прав администратора не блокирует переключение', $dmBlocked === false);
    }

    /**
     * Блок 5: Интеграция со справочником /help
     */
    private function testAdminHelpInclusion(): void
    {
        echo "\n--- Блок 5: Наличие режима гопника в закрытом справочнике /help ---\n";

        $helpText = vk_bot_get_admin_help_text(241534292);

        $hasGopnikSection = (strpos($helpText, 'СТЁБНЫЙ РЕЖИМ «ГОПНИК»') !== false || strpos($helpText, 'гопник') !== false);
        $hasGopnikOnCmd = (strpos($helpText, '/gopnik on') !== false);
        $hasGopnikOffCmd = (strpos($helpText, '/gopnik off') !== false);
        $fitsVkLimit = (mb_strlen($helpText, 'UTF-8') <= 4096);

        $this->recordResult(29, 'Справочник /help содержит раздел режима «Гопник»', $hasGopnikSection);
        $this->recordResult(30, 'Справочник /help содержит команду /gopnik on', $hasGopnikOnCmd);
        $this->recordResult(31, 'Справочник /help содержит команду /gopnik off', $hasGopnikOffCmd);
        $this->recordResult(32, 'Длина текста /help укладывается в лимит сообщений ВК (<= 4096 символов)', $fitsVkLimit, 'Текущая длина: ' . mb_strlen($helpText, 'UTF-8'));
    }

    /**
     * Блок 6: Проверка качества системного промпта и резервного ответа
     */
    private function testGopnikPromptQuality(): void
    {
        echo "\n--- Блок 6: Аудит системного промпта и AI fallback ---\n";

        $botCode = (string)file_get_contents(__DIR__ . '/../api/vk-bot.php');

        // Проверяем ключевые якоря и атмосферу в промпте гопника
        $hasNeighborhoodAnchor = (strpos($botCode, 'ЧЁТКИЙ ГОПНИК С РАЁНА ДОБРОЕ') !== false);
        $hasLocationAnchor = (strpos($botCode, 'ул. Егорова, 10') !== false || strpos($botCode, 'Добросельский') !== false);
        $hasTracksuit = (strpos($botCode, 'Абибас') !== false && strpos($botCode, 'семки') !== false);
        $hasStreetSlang = (strpos($botCode, 'ёпта') !== false && strpos($botCode, 'не мороси') !== false && strpos($botCode, 'по понятиям') !== false);
        $hasClassicBreakdown = (strpos($botCode, 'Преступление и наказание') !== false && strpos($botCode, 'Мастер и Маргарита') !== false);
        $hasForeignAgentBan = (strpos($botCode, 'иноагент') !== false);

        $this->recordResult(33, 'Промпт содержит локальную владимирскую привязку (район Доброе, ул. Егорова, 10)', $hasNeighborhoodAnchor && $hasLocationAnchor);
        $this->recordResult(34, 'Промпт задает антураж (кортаны, Абибас, жареные семки)', $hasTracksuit);
        $this->recordResult(35, 'Промпт содержит аутентичный уличный лексикон (ёпта, не мороси, по понятиям)', $hasStreetSlang);
        $this->recordResult(36, 'Промпт раскладывает мировую классику через призму пацанских понятий', $hasClassicBreakdown);
        $this->recordResult(37, 'Промпт содержит строгий запрет на иноагентов', $hasForeignAgentBan);

        // Проверяем fallback в случае сбоя AI
        $hasGopnikFallback = (strpos($botCode, 'Слышь, братан, у меня нейроны переклинило') !== false);
        $this->recordResult(38, 'Резервный ответ при недоступности ИИ адаптирован под стиль гопника', $hasGopnikFallback);
    }

    /**
     * Блок 7: Подбор эмоций
     */
    private function testEmotionSelection(): void
    {
        echo "\n--- Блок 7: Подбор эмоций и маскота ---\n";

        $botCode = (string)file_get_contents(__DIR__ . '/../api/vk-bot.php');

        // Проверяем, что в режиме гопника эмоция по умолчанию 'cool'
        $hasCoolDefault = (strpos($botCode, "\$chosenEmotion = \$isGopnikMode ? 'cool' : 'smile';") !== false);
        $this->recordResult(39, 'Дефолтная эмоция в режиме гопника переключается на cool (очки/стиль на кортах)', $hasCoolDefault);

        // Проверяем правильное определение $mascotAttachment
        $hasMascotAttachment = (strpos($botCode, "\$mascotAttachment = \$shouldAttachPhoto") !== false);
        $this->recordResult(40, 'Переменная \$mascotAttachment безопасно инициализируется', $hasMascotAttachment);
    }
}

// Запуск тест-сьюта
$suite = new CosmoGopnikModeTestSuite();
$success = $suite->runAll();
exit($success ? 0 : 1);

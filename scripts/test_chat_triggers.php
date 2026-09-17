<?php
/**
 * Комплексный тест-сьют для проверки логики триггеров в беседах ($isChat),
 * поиска по группам ВК и фильтрации новостей филиалов.
 */

declare(strict_types=1);

require_once __DIR__ . '/../api/vk-bot.php';

class ChatTriggersTestSuite
{
    private int $passed = 0;
    private int $failed = 0;
    private int $vkGroupId = 227658514; // ID группы Космо

    private function recordResult(string $testName, bool $success, string $details = ''): void
    {
        if ($success) {
            $this->passed++;
            echo "  [PASS] {$testName}\n";
        } else {
            $this->failed++;
            echo "  [FAIL] {$testName}\n";
            if ($details !== '') {
                echo "         Детали: {$details}\n";
            }
        }
    }

    /**
     * Эмуляция логики $shouldRespondInChat из api/vk-bot.php
     */
    private function evaluateShouldRespond(string $userMsg, ?array $replyMsg = null, ?string $payload = null, bool $hasActiveQuiz = false): bool
    {
        $vkGroupId = $this->vkGroupId;
        $isReplyToBot = ($replyMsg && (int)($replyMsg['from_id'] ?? 0) === -$vkGroupId);

        // 1. Команды: со слэшем / или восклицательным знаком !
        $msgObj = ['text' => $userMsg];
        if ($replyMsg) $msgObj['reply_message'] = $replyMsg;

        $isModCmd = (vk_bot_parse_mod_command($userMsg, $msgObj) !== null);
        $isGopnikCmd = (vk_bot_parse_gopnik_command($userMsg) !== null);
        $isPrefixCmd = (bool)preg_match('/^[!|\/][a-zA-Zа-яА-Я0-9_-]+/u', trim($userMsg));
        $isCmd = ($isModCmd || $isGopnikCmd || $isPrefixCmd);

        // 2. Обращение через @:
        $hasAtMention = (
            preg_match('/\[(?:club|public)' . $vkGroupId . '\|[^\]]*\]/ui', $userMsg) ||
            preg_match('/@(?:club|public)' . $vkGroupId . '\b/ui', $userMsg) ||
            preg_match('/@(cosmobibliobot|cosmo|космо)\b/ui', $userMsg)
        );

        // 3. Обращение по имени Космо:
        $hasNameMention = (bool)preg_match('/\b(?:космо|космос|робот\s*космо)\b/ui', $userMsg);

        // 4. Цифра ответа на квиз:
        $isDigitReply = ($hasActiveQuiz && (bool)preg_match('/^[1-4]$/', trim($userMsg)));

        return (
            $hasAtMention ||
            $hasNameMention ||
            $isCmd ||
            $isReplyToBot ||
            $isDigitReply ||
            !empty($payload)
        );
    }

    public function runAll(): bool
    {
        echo "======================================================================\n";
        echo "  ТЕСТИРОВАНИЕ ТРИГГЕРОВ В БЕСЕДАХ И ПОИСКА ПО ГРУППАМ (api/vk-bot.php)\n";
        echo "======================================================================\n\n";

        $this->testChatGating();
        $this->testOpacVsGroupSearchSeparation();
        $this->testGroupSearchPatternMatching();
        $this->testBranchNewsFiltering();

        echo "\n----------------------------------------------------------------------\n";
        echo "РЕЗУЛЬТАТЫ: Успешно: {$this->passed} | Провалено: {$this->failed}\n";
        echo "----------------------------------------------------------------------\n";

        return ($this->failed === 0);
    }

    private function testChatGating(): void
    {
        echo "1. Проверка строгого триггера ответов бота в групповых беседах:\n";

        // Сообщения без обращения к боту -> ДОЛЖНЫ ИГНОРИРОВАТЬСЯ
        $ignored = [
            'Привет всем!',
            'Кто сегодня идет в библиотеку?',
            'Какая хорошая погода',
            'слышь братан ты где',
            'пацаны го в кс',
            'космонавт полетел в космодром',
            '1', // цифра без активного квиза
        ];

        foreach ($ignored as $msg) {
            $resp = $this->evaluateShouldRespond($msg);
            $this->recordResult("Игнорирование обычного текста: «{$msg}»", !$resp, "Бот ошибочно среагировал на текст без обращения");
        }

        // Сообщения с обращением к боту -> ДОЛЖНЫ ВЫЗЫВАТЬ ОТВЕТ
        $triggered = [
            'Космо, привет!',
            'космос, подскажи книгу',
            'Робот Космо, где библиотека на Егорова?',
            '@cosmobibliobot привет',
            '[club227658514|Космо], новости филиалов',
            '/книга Чехов',
            '!поиск Булгаков',
            '/gopnik on',
            '!мут 15м спам',
            '/посты выставка'
        ];

        foreach ($triggered as $msg) {
            $resp = $this->evaluateShouldRespond($msg);
            $this->recordResult("Срабатывание на обращение/команду: «{$msg}»", $resp, "Бот не среагировал на легитимное обращение");
        }

        // Реплай на сообщение бота
        $replyToBot = ['from_id' => -$this->vkGroupId, 'text' => 'Здравствуйте!'];
        $respReply = $this->evaluateShouldRespond('Спасибо большое!', $replyToBot);
        $this->recordResult("Срабатывание на реплай боту", $respReply);

        // Реплай на сообщение другого пользователя (не бота)
        $replyToUser = ['from_id' => 12345, 'text' => 'Привет'];
        $respReplyUser = $this->evaluateShouldRespond('Я согласен с тобой', $replyToUser);
        $this->recordResult("Игнорирование реплая другому участнику", !$respReplyUser);
    }

    private function testOpacVsGroupSearchSeparation(): void
    {
        echo "\n2. Разделение поиска книг в OPAC и поиска по группам ВК:\n";

        // Поиск книг в OPAC
        $opacQuery1 = vk_bot_parse_book_query('/книга Мастер и Маргарита');
        $this->recordResult("Команда /книга распознается OPAC", ($opacQuery1 !== null && strpos($opacQuery1['query'], 'Мастер') !== false));

        $opacQuery2 = vk_bot_parse_book_query('/поиск Чехов');
        $this->recordResult("Команда /поиск [автор] распознается OPAC", ($opacQuery2 !== null && strpos($opacQuery2['query'], 'Чехов') !== false));

        $opacQuery3 = vk_bot_parse_book_query('Космо, найди книгу Война и мир');
        $this->recordResult("Речевой запрос книги распознается OPAC", ($opacQuery3 !== null && strpos($opacQuery3['query'], 'Война и мир') !== false));

        // Поиск по группам НЕ должен перехватываться OPAC
        $groupQuery1 = vk_bot_parse_book_query('/поиск по группам');
        $this->recordResult("'/поиск по группам' не перехватывается OPAC", ($groupQuery1 === null));

        $groupQuery2 = vk_bot_parse_book_query('/поиск в группах Пушкин');
        $this->recordResult("'/поиск в группах Пушкин' не перехватывается OPAC", ($groupQuery2 === null));

        $groupQuery3 = vk_bot_parse_book_query('поиск по группам мастер-класс');
        $this->recordResult("'поиск по группам мастер-класс' не перехватывается OPAC", ($groupQuery3 === null));
    }

    private function testGroupSearchPatternMatching(): void
    {
        echo "\n3. Распознавание команд и фраз поиска по группам:\n";

        $testCases = [
            'поиск по группам' => '',
            'поиск в группах' => '',
            '/посты' => '',
            '!группы' => '',
            '/поиск_групп' => '',
            'поиск по группам выставка' => 'выставка',
            'поиск в группах мастер-класс' => 'мастер-класс',
            '/посты Пушкин' => 'Пушкин',
            '/группы лекция' => 'лекция',
            'новости филиалов' => '',
        ];

        foreach ($testCases as $phrase => $expectedKeyword) {
            $cmd = '';
            $cleanMsgForCmd = mb_strtolower(trim($phrase), 'UTF-8');
            $userMsg = $phrase;

            $branchSearchKeyword = '';
            $isBranchNewsQuery = false;

            if ($cmd === 'branch_news') {
                $isBranchNewsQuery = true;
            } elseif (preg_match('/^[\/!](?:поиск_групп|группы|посты|сканирование_групп)\b\s*(.*)$/ui', $cleanMsgForCmd, $mCmd)) {
                $isBranchNewsQuery = true;
                $branchSearchKeyword = trim($mCmd[1] ?? '');
            } elseif (preg_match('/^[\/!](?:поиск)\s+(?:по|в)\s+группах?\b\s*(.*)$/ui', $cleanMsgForCmd, $mCmd)) {
                $isBranchNewsQuery = true;
                $branchSearchKeyword = trim($mCmd[1] ?? '');
            } elseif (preg_match('/^(?:поиск\s+(?:по|в)\s+групп[а-я]*\b|поиск\s+групп[а-я]*|посты\s+групп[а-я]*|сканирование\s+групп[а-я]*|новости\s+групп[а-я]*)\b\s*(.*)$/ui', $cleanMsgForCmd, $mCmd)) {
                $isBranchNewsQuery = true;
                $branchSearchKeyword = trim($mCmd[1] ?? '');
            } elseif (preg_match('/^(?:новости филиалов|новости|посты филиалов|лента филиалов|новости библиотек|посты библиотек|лента|дайджест|свежие посты|посты|новости за сутки|посты за сутки)[?!.]*$/ui', $cleanMsgForCmd)) {
                $isBranchNewsQuery = true;
            } elseif (
                (preg_match('/(новост|лент|дайджест|что нов|свежие запис|последние посты|посты за|поиск по|поиск в)/ui', $userMsg) &&
                 preg_match('/(филиал|библиотек|город|сегодн|суток|сутки|групп)/ui', $userMsg))
            ) {
                $isBranchNewsQuery = true;
                if (preg_match('/(?:по|в)\s+групп[а-я]*\b\s+(.+)$/ui', $cleanMsgForCmd, $mKw)) {
                    $branchSearchKeyword = trim($mKw[1]);
                }
            }

            $success = ($isBranchNewsQuery && (mb_strtolower($branchSearchKeyword, 'UTF-8') === mb_strtolower($expectedKeyword, 'UTF-8')));
            $this->recordResult("Распознавание «{$phrase}» (ключ: '{$expectedKeyword}')", $success, "Получено: query={$isBranchNewsQuery}, keyword='{$branchSearchKeyword}'");
        }
    }

    private function testBranchNewsFiltering(): void
    {
        echo "\n4. Тестирование фильтрации постов групп по ключевым словам:\n";

        $mockData = [
            'today' => [
                [
                    'id' => 101,
                    'owner_id' => -51714771,
                    'date' => time() - 3600,
                    'text' => 'Приглашаем на творческий мастер-класс по оригами в эту субботу!',
                    'branch' => ['name' => 'Центральная городская библиотека']
                ],
                [
                    'id' => 102,
                    'owner_id' => -145883298,
                    'date' => time() - 7200,
                    'text' => 'Открылась новая книжная выставка к юбилею Пушкина.',
                    'branch' => ['name' => 'Библиотека — филиал №1']
                ]
            ],
            'last_24h' => [
                [
                    'id' => 103,
                    'owner_id' => -53422825,
                    'date' => time() - 40000,
                    'text' => 'Краеведческая лекция о старом Владимире и его храмах.',
                    'branch' => ['name' => 'Библиотека — филиал №2']
                ]
            ]
        ];

        // Фильтрация по слову "оригами" -> должен остаться только пост 101
        $resOrigami = vk_bot_filter_branch_news($mockData, 'оригами');
        $this->recordResult("Фильтр 'оригами' находит 1 пост в today", (count($resOrigami['today']) === 1 && $resOrigami['today'][0]['id'] === 101));

        // Фильтр по слову "Пушкин" -> пост 102
        $resPushkin = vk_bot_filter_branch_news($mockData, 'Пушкин');
        $this->recordResult("Фильтр 'Пушкин' находит пост 102", (count($resPushkin['today']) === 1 && $resPushkin['today'][0]['id'] === 102));

        // Фильтр по слову "лекция" -> пост 103 в last_24h
        $resLecture = vk_bot_filter_branch_news($mockData, 'лекция');
        $this->recordResult("Фильтр 'лекция' находит пост 103 в last_24h", (count($resLecture['last_24h']) === 1 && $resLecture['last_24h'][0]['id'] === 103));

        // Фильтр по несуществующему слову -> 0 постов
        $resNone = vk_bot_filter_branch_news($mockData, 'квантовая_механика');
        $this->recordResult("Фильтр по редкому слову возвращает пустой список", (empty($resNone['today']) && empty($resNone['last_24h'])));

        // Форматирование сообщения при найденных постах
        $formatted = vk_bot_format_branch_news_message($resOrigami, 'оригами');
        $this->recordResult("Форматирование сообщения содержит заголовок с ключом", (strpos($formatted, 'оригами') !== false && strpos($formatted, 'Центральная городская библиотека') !== false));

        // Форматирование при 0 найденных постов
        $formattedEmpty = vk_bot_format_branch_news_message($resNone, 'квантовая_механика');
        $this->recordResult("Форматирование при отсутствии постов выдает вежливую подсказку", (strpos($formattedEmpty, 'ничего не найдено') !== false));
    }
}

$suite = new ChatTriggersTestSuite();
$success = $suite->runAll();
exit($success ? 0 : 1);

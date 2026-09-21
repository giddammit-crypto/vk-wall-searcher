<?php
/**
 * =============================================================================
 *  api/nfc-renew.php — Продление книг по NFC (VK Mini App «АВРОРА • Космо»)
 * =============================================================================
 *  POST JSON:
 *  {
 *    "secret":  "<nfc_renew_secret из config.php>",
 *    "reader":  { "source": "nfc"|"manual", "uid": "04:A2:...", "payload": "...", "number": "1234" },
 *    "book":    { "source": "nfc"|"manual", "uid": "...", "payload": "...", "inventory": "0012345" },
 *    "person":  { "name": "Иванов Иван Иванович", "email": "...", "consent_152fz": true, "consent_at": "ISO-8601" },
 *    "opac_book": { "title": "...", "author": "...", "year": "...", "shelfmark": "...", "inventory": "..." },
 *    "branch":  "Ф-5",
 *    "vk_user": { "id": 123, "first_name": "...", "last_name": "..." },
 *    "device":  { "platform": "android"|"ios"|"desktop" }
 *  }
 *
 *  Конвейер обработки:
 *  1. CORS-гейт: только домены ВК (*.vk.com / *.vk.ru / *.pages-vk-apps.com) и тот же хост
 *  2. Секрет-гейт (заглушка от случайного спама; реальная защита — подписанные запросы ВК)
 *  3. Троттлинг по IP (файловое окно 1 час, см. cache/nfc_rl_*.json)
 *  4. Валидация и санитизация полей
 *  5. Журналирование в data/nfc_renewals.jsonl (атомарно, через flock)
 *  6. HTML-письмо на адреса из config.php (тестовый адрес по умолчанию: olegcgb@yandex.ru)
 *
 *  Ответ: { ok, journal_id, email_sent, warning? }
 *  Совместимо с PHP 7.4 — 8.5.
 * =============================================================================
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

// Полифилл mb_substr для сред без ext-mbstring (конвенция api/opac.php)
if (!function_exists('mb_substr')) {
    function mb_substr($str, $start, $length = null, $encoding = null) {
        return substr($str, $start, $length === null ? PHP_INT_MAX : $length);
    }
}

header('Content-Type: application/json; charset=utf-8');

// ─── 1. CORS: только домены ВК и тот же хост ────────────────────────────────
$origin = isset($_SERVER['HTTP_ORIGIN']) ? (string)$_SERVER['HTTP_ORIGIN'] : '';

function nfc_host_allowed($host) {
    $host = strtolower((string)$host);
    foreach (['.vk.com', '.vk.ru', '.pages-vk-apps.com'] as $suffix) {
        if (substr($host, -strlen($suffix)) === $suffix) return true;
    }
    return in_array($host, ['vk.com', 'vk.ru', 'www.vk.com', 'www.vk.ru'], true);
}

if ($origin !== '') {
    $parts  = parse_url($origin);
    $ohost  = $parts['host'] ?? '';
    $scheme = $parts['scheme'] ?? '';
    $selfHost = strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]);
    if ($scheme === 'https' && (nfc_host_allowed($ohost) || $ohost === $selfHost)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

function nfc_out($code, $data) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    nfc_out(405, ['ok' => false, 'error' => 'METHOD_NOT_ALLOWED']);
}

$raw   = file_get_contents('php://input');
$input = json_decode($raw !== false && $raw !== '' ? $raw : '[]', true);
if (!is_array($input)) nfc_out(400, ['ok' => false, 'error' => 'INVALID_JSON']);

// ─── Конфигурация (config.php в .gitignore; здесь — безопасные дефолты) ─────
$config = [];
$configFile = __DIR__ . '/config.php';
if (is_file($configFile)) {
    $loaded = require $configFile;
    if (is_array($loaded)) $config = $loaded;
}
$secret     = (string)($config['nfc_renew_secret'] ?? 'aurora-nfc-test');
$emails     = $config['nfc_renew_emails'] ?? ['olegcgb@yandex.ru'];
if (!is_array($emails)) $emails = [$emails];
$fromMail   = (string)($config['nfc_mail_from'] ?? 'noreply@biblioteka33.ru');
$fromName   = (string)($config['nfc_mail_from_name'] ?? 'АВРОРА • Космо (NFC-продление)');
$maxPerHour = (int)($config['nfc_renew_rate_per_hour'] ?? 20);

// ─── 2. Секрет-гейт ─────────────────────────────────────────────────────────
if ((string)($input['secret'] ?? '') !== $secret) {
    nfc_out(403, ['ok' => false, 'error' => 'BAD_SECRET']);
}

// ─── 3. Троттлинг по IP (скользящее окно 1 час) ────────────────────────────
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'cli');
$rlDir = dirname(__DIR__) . '/cache';
if (!is_dir($rlDir)) @mkdir($rlDir, 0775, true);
$rlFile = $rlDir . '/nfc_rl_' . md5($ip) . '.json';
$wins = [];
if (is_file($rlFile)) {
    $dec = json_decode((string)@file_get_contents($rlFile), true);
    if (is_array($dec)) $wins = $dec;
}
$now = time();
$wins = array_values(array_filter($wins, function ($t) use ($now) {
    return is_int($t) && $t > $now - 3600;
}));
if (count($wins) >= $maxPerHour) {
    nfc_out(429, ['ok' => false, 'error' => 'RATE_LIMITED', 'retry_after' => 3600]);
}
$wins[] = $now;
@file_put_contents($rlFile, json_encode($wins), LOCK_EX);

// ─── 4. Валидация и санитизация ─────────────────────────────────────────────
function nfc_clean($v, $maxLen = 300) {
    $v = is_scalar($v) ? (string)$v : '';
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);
    return mb_substr(trim($v), 0, $maxLen, 'UTF-8');
}

$reader   = is_array($input['reader'] ?? null) ? $input['reader'] : [];
$book     = is_array($input['book'] ?? null) ? $input['book'] : [];
$person   = is_array($input['person'] ?? null) ? $input['person'] : [];
$opacBook = is_array($input['opac_book'] ?? null) ? $input['opac_book'] : [];
$vkUser  = is_array($input['vk_user'] ?? null) ? $input['vk_user'] : [];
$device  = is_array($input['device'] ?? null) ? $input['device'] : [];

$readerSource  = nfc_clean($reader['source'] ?? 'manual', 10);
$readerUid     = nfc_clean($reader['uid'] ?? '');
$readerPayload = nfc_clean($reader['payload'] ?? '');
$readerNumber  = nfc_clean($reader['number'] ?? '');

$bookSource    = nfc_clean($book['source'] ?? 'manual', 10);
$bookUid       = nfc_clean($book['uid'] ?? '');
$bookPayload   = nfc_clean($book['payload'] ?? '');
$bookInventory = nfc_clean($book['inventory'] ?? '');

if ($readerUid === '' && $readerNumber === '') {
    nfc_out(400, ['ok' => false, 'error' => 'READER_REQUIRED']);
}
if ($bookUid === '' && $bookInventory === '' && $bookPayload === '') {
    nfc_out(400, ['ok' => false, 'error' => 'BOOK_REQUIRED']);
}

// ─── Данные читателя и согласие на обработку ПДн (152-ФЗ) ───────────────────
// Без явного согласия операцию не принимаем: это фиксируется в журнале как
// основание обработки (п. 1 ч. 1 ст. 6 ФЗ-152).
$personName  = nfc_clean($person['name'] ?? '', 120);
$personEmail = nfc_clean($person['email'] ?? '', 120);
$consentGiven = !empty($person['consent_152fz']);
$consentAt = nfc_clean($person['consent_at'] ?? '', 40);
if ($consentAt === '' && $consentGiven) $consentAt = date('c');

$personNameWords = preg_split('/\s+/', $personName);
$personNameOk = count(array_filter($personNameWords, function ($w) { return mb_strlen($w, 'UTF-8') >= 2; })) >= 2;

if (!$consentGiven) {
    nfc_out(400, ['ok' => false, 'error' => 'CONSENT_REQUIRED']);
}
if (!$personNameOk) {
    nfc_out(400, ['ok' => false, 'error' => 'PERSON_NAME_REQUIRED']);
}
if ($personEmail === '' || !filter_var($personEmail, FILTER_VALIDATE_EMAIL)) {
    nfc_out(400, ['ok' => false, 'error' => 'PERSON_EMAIL_REQUIRED']);
}

// ─── Данные книги из OPAC и филиал выдачи (заполняются мини-аппом) ──────────
$opacTitle     = nfc_clean($opacBook['title'] ?? '', 300);
$opacAuthor    = nfc_clean($opacBook['author'] ?? '', 160);
$opacYear      = nfc_clean($opacBook['year'] ?? '', 20);
$opacShelfmark = nfc_clean($opacBook['shelfmark'] ?? ($opacBook['shifr'] ?? ''), 80);
$opacInventory = nfc_clean($opacBook['inventory'] ?? '', 60);
$branchCode    = nfc_clean($input['branch'] ?? '', 40);

$record = [
    'id'       => date('Ymd-His') . '-' . bin2hex(random_bytes(3)),
    'ts'       => $now,
    'ts_human' => date('d.m.Y H:i:s'),
    'ip'       => $ip,
    'reader'   => ['source' => $readerSource, 'uid' => $readerUid, 'payload' => $readerPayload, 'number' => $readerNumber],
    'book'     => ['source' => $bookSource, 'uid' => $bookUid, 'payload' => $bookPayload, 'inventory' => $bookInventory],
    'opac_book' => [
        'title'     => $opacTitle,
        'author'    => $opacAuthor,
        'year'      => $opacYear,
        'shelfmark' => $opacShelfmark,
        'inventory' => $opacInventory,
    ],
    'branch'   => $branchCode,
    'person'   => [
        'name'         => $personName,
        'email'        => $personEmail,
        'consent_152fz' => true,
        'consent_at'   => $consentAt,
    ],
    'vk_user'  => [
        'id'         => (int)($vkUser['id'] ?? 0),
        'first_name' => nfc_clean($vkUser['first_name'] ?? '', 80),
        'last_name'  => nfc_clean($vkUser['last_name'] ?? '', 80),
    ],
    'device'   => [
        'platform' => nfc_clean($device['platform'] ?? '', 40),
        'ua'       => nfc_clean($_SERVER['HTTP_USER_AGENT'] ?? '', 300),
    ],
];

// ─── 5. Журнал операций (JSON Lines, атомарная дозапись) ────────────────────
$dataDir = dirname(__DIR__) . '/data';
if (!is_dir($dataDir)) @mkdir($dataDir, 0775, true);
$journalFile = $dataDir . '/nfc_renewals.jsonl';
$fh = @fopen($journalFile, 'a');
if ($fh) {
    flock($fh, LOCK_EX);
    fwrite($fh, json_encode($record, JSON_UNESCAPED_UNICODE) . "\n");
    flock($fh, LOCK_UN);
    fclose($fh);
}

// ─── 6. Письмо-уведомление ──────────────────────────────────────────────────
function nfc_e($s) {
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

$rows = '';
$nfcRow = function ($label, $val) use (&$rows) {
    $val = (string)$val;
    if ($val === '') return;
    $rows .= '<tr>'
        . '<td style="padding:6px 12px;color:#64748b;border:1px solid #e2e8f0;white-space:nowrap;">' . nfc_e($label) . '</td>'
        . '<td style="padding:6px 12px;border:1px solid #e2e8f0;font-family:monospace;word-break:break-all;">' . nfc_e($val) . '</td>'
        . '</tr>';
};

$nfcRow('Идентификатор операции', $record['id']);
$nfcRow('Дата и время', $record['ts_human']);
$vkName = trim(($record['vk_user']['first_name'] ?? '') . ' ' . ($record['vk_user']['last_name'] ?? ''));
$nfcRow('Пользователь ВК', $vkName !== ''
    ? $vkName . ($record['vk_user']['id'] ? ' (id' . $record['vk_user']['id'] . ')' : '')
    : ($record['vk_user']['id'] ? 'id' . $record['vk_user']['id'] : ''));
$nfcRow('Билет: способ получения', $readerSource === 'nfc' ? 'NFC-скан' : 'ручной ввод');
$nfcRow('Билет: UID метки', $readerUid);
$nfcRow('Билет: данные метки', $readerPayload);
$nfcRow('Билет: номер (введён)', $readerNumber);
$nfcRow('Книга: способ получения', $bookSource === 'nfc' ? 'NFC-скан' : 'ручной ввод');
$nfcRow('Книга: UID метки', $bookUid);
$nfcRow('Книга: данные метки', $bookPayload);
$nfcRow('Книга: инв. номер (введён)', $bookInventory);
$nfcRow('Книга: название (OPAC)', $opacTitle);
$nfcRow('Книга: автор (OPAC)', $opacAuthor);
$nfcRow('Книга: год (OPAC)', $opacYear);
$nfcRow('Книга: шифр (OPAC)', $opacShelfmark);
$nfcRow('Филиал выдачи', $branchCode);
$nfcRow('Читатель: ФИО', $personName);
$nfcRow('Читатель: e-mail', $personEmail);
$nfcRow('Согласие 152-ФЗ', 'Дано ' . $consentAt);
$nfcRow('Устройство', $record['device']['platform']);

$subject = '=?UTF-8?B?' . base64_encode('NFC-продление: ' . $record['id']) . '?=';

$html = '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"></head><body>'
    . '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;color:#0f172a;">'
    . '<h2 style="color:#0ea5e9;margin:0 0 4px;">АВРОРА • Продление книги по NFC</h2>'
    . '<p style="color:#64748b;margin:0 0 16px;">Тестовое уведомление. Операция также записана в журнал <code>data/nfc_renewals.jsonl</code>.</p>'
    . '<table style="border-collapse:collapse;width:100%;font-size:14px;">' . $rows . '</table>'
    . '<p style="color:#94a3b8;font-size:12px;margin-top:16px;">Генератор: api/nfc-renew.php &bull; Библиотечная система г. Владимира &bull; biblioteka33.ru</p>'
    . '</div></body></html>';

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'From: =?UTF-8?B?' . base64_encode($fromName) . '?= <' . $fromMail . '>',
    'Reply-To: ' . $fromMail,
    'X-Mailer: AURORA-NFC/1.0',
];
$headerStr = implode("\r\n", $headers);

$emailed = 0;
foreach ($emails as $to) {
    $to = trim((string)$to);
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) continue;
    if (@mail($to, $subject, $html, $headerStr)) $emailed++;
}

nfc_out(200, [
    'ok'         => true,
    'journal_id' => $record['id'],
    'email_sent' => $emailed > 0,
    'warning'    => $emailed === 0
        ? 'Письмо не отправлено (функция mail() недоступна или заблокирована на хостинге) — операция сохранена в журнал.'
        : null,
]);
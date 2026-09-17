<?php
/**
 * OPAC-Global Client & Data Decoder for Vladimir CGB (Database 62)
 *
 * Provides complete integration with opac.lib33.ru:
 *  - Automatic session acquisition and caching (via /cgiopac/opacg/opac.exe)
 *  - Search & bibliographic retrieval (via opacfindd.FindView)
 *  - Holdings, inventory and copy tracking (via opacholdd.MoveCopies)
 *  - Pure PHP XML decoder (zero external extension dependencies: runs without php-xml/SimpleXML)
 *  - Full normalization and branch matching for all Vladimir library siglas
 *
 * Standard adherence: RUSMARC / UNIMARC / OPAC-Global XML schema
 */

if (!function_exists('mb_strtolower')) {
    function mb_strtolower($string, $encoding = 'UTF-8') {
        return strtr((string)$string, [
            'А'=>'а','Б'=>'б','В'=>'в','Г'=>'г','Д'=>'д','Е'=>'е','Ё'=>'ё','Ж'=>'ж','З'=>'з',
            'И'=>'и','Й'=>'й','К'=>'к','Л'=>'л','М'=>'м','Н'=>'н','О'=>'о','П'=>'п','Р'=>'р',
            'С'=>'с','Т'=>'т','У'=>'у','Ф'=>'ф','Х'=>'х','Ц'=>'ц','Ч'=>'ч','Ш'=>'ш','Щ'=>'щ',
            'Ъ'=>'ъ','Ы'=>'ы','Ь'=>'ь','Э'=>'э','Ю'=>'ю','Я'=>'я',
            'A'=>'a','B'=>'b','C'=>'c','D'=>'d','E'=>'e','F'=>'f','G'=>'g','H'=>'h','I'=>'i',
            'J'=>'j','K'=>'k','L'=>'l','M'=>'m','N'=>'n','O'=>'o','P'=>'p','Q'=>'q','R'=>'r',
            'S'=>'s','T'=>'t','U'=>'u','V'=>'v','W'=>'w','X'=>'x','Y'=>'y','Z'=>'z'
        ]);
    }
}
if (!function_exists('mb_strpos')) {
    function mb_strpos($haystack, $needle, $offset = 0, $encoding = 'UTF-8') {
        if (function_exists('iconv_strpos')) {
            $pos = @iconv_strpos((string)$haystack, (string)$needle, $offset, $encoding);
            if ($pos !== false) return $pos;
        }
        return strpos((string)$haystack, (string)$needle, $offset);
    }
}
if (!function_exists('mb_stripos')) {
    function mb_stripos($haystack, $needle, $offset = 0, $encoding = 'UTF-8') {
        $h = mb_strtolower((string)$haystack, $encoding);
        $n = mb_strtolower((string)$needle, $encoding);
        return mb_strpos($h, $n, $offset, $encoding);
    }
}

class OpacClient
{
    private string $host = 'https://opac.lib33.ru';
    private string $loginUrl = 'https://opac.lib33.ru/cgiopac/opacg/opac.exe';
    private string $directUrl = 'https://opac.lib33.ru/cgiopac/opacg/direct.exe';
    private int $dbId = 62;
    private string $user = 'SHARE';
    private string $pass = 'TLBYSQ028';
    private string $cacheDir;

    private ?string $session = null;
    private ?string $cookie = null;

    /**
     * Эталонный словарь библиотечных сигл филиалов г. Владимира
     */
    private static array $siglaDictionary = [
        'аб' => [
            'code'           => 'аб',
            'branch_num'     => 'ЦГБ',
            'branch_name'    => 'Центральная городская библиотека, Абонемент',
            'department'     => 'Абонемент',
            'address'        => 'г. Владимир, Суздальский пр., д. 2',
            'district'       => 'Доброе',
            'is_dobroye'     => true,
            'is_center'      => false,
            'phone'          => '8(4922) 21-65-63, 21-66-80',
            'perm_prefix'    => 'ЦГБ-АБ'
        ],
        'чз' => [
            'code'           => 'чз',
            'branch_num'     => 'ЦГБ',
            'branch_name'    => 'Центральная городская библиотека, Читальный зал',
            'department'     => 'Читальный зал',
            'address'        => 'г. Владимир, Суздальский пр., д. 2',
            'district'       => 'Доброе',
            'is_dobroye'     => true,
            'is_center'      => false,
            'phone'          => '8(4922) 21-65-63, 21-66-80',
            'perm_prefix'    => 'ЦГБ-ЧЗ'
        ],
        'до' => [
            'code'           => 'до',
            'branch_num'     => 'ЦДБ',
            'branch_name'    => 'Центральная детская библиотека',
            'department'     => 'Центральная детская библиотека',
            'address'        => 'г. Владимир, ул. Большая Московская, д. 31',
            'district'       => 'Исторический центр',
            'is_dobroye'     => false,
            'is_center'      => true,
            'phone'          => '8(4922) 32-32-42, 32-47-73',
            'perm_prefix'    => 'ЦГБ-ДО'
        ],
        'кх' => [
            'code'           => 'кх',
            'branch_num'     => 'ЦГБ',
            'branch_name'    => 'Центральная городская библиотека, Книгохранилище',
            'department'     => 'Книгохранилище',
            'address'        => 'г. Владимир, Суздальский пр., д. 2',
            'district'       => 'Доброе',
            'is_dobroye'     => true,
            'is_center'      => false,
            'phone'          => '8(4922) 21-65-63, 21-66-80',
            'perm_prefix'    => 'ЦГБ-КХ'
        ],
        'ибо' => [
            'code'           => 'ибо',
            'branch_num'     => 'ЦГБ',
            'branch_name'    => 'Центральная городская библиотека, ИБО',
            'department'     => 'Информационно-библиографический отдел',
            'address'        => 'г. Владимир, Суздальский пр., д. 2',
            'district'       => 'Доброе',
            'is_dobroye'     => true,
            'is_center'      => false,
            'phone'          => '8(4922) 21-65-63, 21-66-80',
            'perm_prefix'    => 'ЦГБ-ИБО'
        ],
        'ооо' => [
            'code'           => 'ооо',
            'branch_num'     => 'ЦГБ',
            'branch_name'    => 'Центральная городская библиотека, Отдел обслуживания',
            'department'     => 'Отдел обслуживания',
            'address'        => 'г. Владимир, Суздальский пр., д. 2',
            'district'       => 'Доброе',
            'is_dobroye'     => true,
            'is_center'      => false,
            'phone'          => '8(4922) 21-65-63, 21-66-80',
            'perm_prefix'    => 'ЦГБ-ООО'
        ],
        'цдб' => [
            'code'           => 'цдб',
            'aliases'        => ['до', 'цди', 'цки'],
            'branch_num'     => 'ЦДБ',
            'branch_name'    => 'Центральная детская библиотека',
            'department'     => 'Центральная детская библиотека',
            'address'        => 'г. Владимир, ул. Большая Московская, д. 31',
            'district'       => 'Исторический центр',
            'is_dobroye'     => false,
            'is_center'      => true,
            'phone'          => '8(4922) 32-32-42, 32-47-73',
            'perm_prefix'    => 'ЦГБ-ЦД'
        ],
        'цдч' => [
            'code'           => 'цдч',
            'aliases'        => [],
            'branch_num'     => 'ЦГБ',
            'branch_name'    => 'Центральная городская библиотека, Отдел детского чтения',
            'department'     => 'Отдел детского чтения',
            'address'        => 'г. Владимир, Суздальский пр., д. 2',
            'district'       => 'Доброе',
            'is_dobroye'     => true,
            'is_center'      => false,
            'phone'          => '8(4922) 21-65-63, 21-66-80',
            'perm_prefix'    => 'ЦГБ-ЦДЧ'
        ],
        'ф1' => [
            'code'           => 'ф1',
            'aliases'        => ['ф1д'],
            'branch_num'     => 'Филиал №1',
            'branch_name'    => 'Библиотека — филиал №1',
            'department'     => 'Взрослый и детский абонементы',
            'address'        => 'г. Владимир, проспект Строителей, д. 38 а, кв. 44',
            'district'       => 'Черёмушки / ВлГУ',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => '8(4922) 33-86-23',
            'perm_prefix'    => 'ЦГБ-Ф1'
        ],
        'ф2' => [
            'code'           => 'ф2',
            'aliases'        => ['ф2д'],
            'branch_num'     => 'Филиал №2',
            'branch_name'    => 'Библиотека — филиал №2',
            'department'     => 'Взрослый и детский абонементы',
            'address'        => 'г. Владимир, пр. Ленина, д. 12',
            'district'       => 'Садовая площадь / «Заря»',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => '8(4922) 32-15-84, 32-15-85',
            'perm_prefix'    => 'ЦГБ-Ф2'
        ],
        'ф3' => [
            'code'           => 'ф3',
            'aliases'        => ['ф3сд'],
            'branch_num'     => 'Филиал №3',
            'branch_name'    => 'Библиотека — филиал №3',
            'department'     => 'Основной абонемент',
            'address'        => 'г. Владимир, мкр. Юрьевец, ул. Школьный проезд, д. 4',
            'district'       => 'мкр. Юрьевец',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => '8(4922) 26-18-74',
            'perm_prefix'    => 'ЦГБ-Ф3'
        ],
        'ф4' => [
            'code'           => 'ф4',
            'aliases'        => ['ф4д'],
            'branch_num'     => 'Филиал №4',
            'branch_name'    => 'Библиотека — филиал №4',
            'department'     => 'Взрослый и детский абонементы',
            'address'        => 'г. Владимир, ул. Егорова, д. 10',
            'district'       => 'Доброе',
            'is_dobroye'     => true,
            'is_center'      => false,
            'phone'          => '8(4922) 21-96-11, 21-23-48',
            'perm_prefix'    => 'ЦГБ-Ф4',
            'note'           => 'КРИТИЧЕСКИ ВАЖНО: расположен именно в жилом районе «Доброе»!'
        ],
        'ф5' => [
            'code'           => 'ф5',
            'aliases'        => ['ф5д'],
            'branch_num'     => 'Филиал №5',
            'branch_name'    => 'Библиотека — филиал №5',
            'department'     => 'Взрослый и детский абонементы',
            'address'        => 'г. Владимир, ул. Верхняя Дуброва, д. 10',
            'district'       => 'ЮЗР / Верхняя Дуброва',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => '8(4922) 54-28-43',
            'perm_prefix'    => 'ЦГБ-Ф5'
        ],
        'ф6' => [
            'code'           => 'ф6',
            'branch_num'     => 'Филиал №6',
            'branch_name'    => 'Библиотека — филиал №6',
            'department'     => 'Основной абонемент',
            'address'        => 'г. Владимир, мкр. Юрьевец, Институтский гор., д. 2',
            'district'       => 'мкр. Юрьевец',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => '8(4922) 45-37-01',
            'perm_prefix'    => 'ЦГБ-Ф6'
        ],
        'ф7' => [
            'code'           => 'ф7',
            'aliases'        => ['ф7н', 'ф7нд'],
            'branch_num'     => 'Филиал №7',
            'branch_name'    => 'Библиотека — филиал №7',
            'department'     => 'Основной абонемент',
            'address'        => 'г. Владимир, ул. Мира, д. 55 (здание ДК Молодежи)',
            'district'       => 'ДК Молодёжи / Северная',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => '8(4922) 53-45-54',
            'perm_prefix'    => 'ЦГБ-Ф7'
        ],
        'ф8' => [
            'code'           => 'ф8',
            'aliases'        => ['ф8д'],
            'branch_num'     => 'Филиал №8',
            'branch_name'    => 'Библиотека — филиал №8',
            'department'     => 'Взрослый и детский абонементы',
            'address'        => 'г. Владимир, ул. Сурикова, д. 26',
            'district'       => 'ул. Сурикова / Чайковского',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => '8(4922) 54-65-11',
            'perm_prefix'    => 'ЦГБ-Ф8'
        ],
        'ф9' => [
            'code'           => 'ф9',
            'aliases'        => ['добролит'],
            'branch_num'     => 'Филиал №9',
            'branch_name'    => 'Библиотека — филиал №9',
            'department'     => 'Литературно-краеведческий проект «Добролит»',
            'address'        => 'г. Владимир, ул. Юбилейная, д. 38',
            'district'       => 'Доброе',
            'is_dobroye'     => true,
            'is_center'      => false,
            'phone'          => '8(4922) 21-22-75',
            'perm_prefix'    => 'ЦГБ-Ф9'
        ],
        'ф10' => [
            'code'           => 'ф10',
            'aliases'        => ['ф10д'],
            'branch_num'     => 'Филиал №10',
            'branch_name'    => 'Библиотека-филиал 10 - временно не работает!',
            'department'     => 'Основной абонемент',
            'address'        => 'г. Владимир, ул. Диктора Левитана, 55',
            'district'       => 'Диктора Левитана',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => 'нет телефона',
            'note'           => 'Библиотека-филиал 10 - временно не работает!',
            'perm_prefix'    => 'ЦГБ-Ф10'
        ],
        'ф11' => [
            'code'           => 'ф11',
            'aliases'        => ['ф11д'],
            'branch_num'     => 'Филиал №11',
            'branch_name'    => 'Библиотека — филиал №11',
            'department'     => 'Основной абонемент',
            'address'        => 'г. Владимир, мкр. Лесной, ул. Лесная, 10 А',
            'district'       => 'мкр. Лесной',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => '8(4922) 45-57-17',
            'perm_prefix'    => 'ЦГБ-Ф11'
        ],
        'ф12' => [
            'code'           => 'ф12',
            'aliases'        => ['ф12д'],
            'branch_num'     => 'Филиал №12',
            'branch_name'    => 'Библиотека — филиал №12',
            'department'     => 'Взрослый и детский абонементы',
            'address'        => 'г. Владимир, мкр. Энергетик, ул. Энергетиков, д. 27, кв. 16',
            'district'       => 'мкр. Энергетик',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => '8(4922) 26-43-81',
            'perm_prefix'    => 'ЦГБ-Ф12'
        ],
        'ф13' => [
            'code'           => 'ф13',
            'aliases'        => ['ф13н', 'ф13нд', 'книголенд'],
            'branch_num'     => 'Филиал №13',
            'branch_name'    => 'Библиотека — филиал №13',
            'department'     => 'Библиотечный проект «Книголенд»',
            'address'        => 'г. Владимир, ул. Горького, д. 69',
            'district'       => 'ВлГУ / пл. Ленина',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => '8(4922) 33-15-67',
            'perm_prefix'    => 'ЦГБ-Ф13'
        ],
        'ф14' => [
            'code'           => 'ф14',
            'aliases'        => ['ф14н', 'ф14нд'],
            'branch_num'     => 'Филиал №14',
            'branch_name'    => 'Библиотека — филиал №14',
            'department'     => 'Основной абонемент',
            'address'        => 'г. Владимир, мкр. Оргтруд, ул. Октябрьская, д. 26 «б»',
            'district'       => 'мкр. Оргтруд',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => '8(4922) 45-74-69',
            'perm_prefix'    => 'ЦГБ-Ф14'
        ],
        'ф15' => [
            'code'           => 'ф15',
            'aliases'        => ['ф15н', 'ф15нд'],
            'branch_num'     => 'Филиал №15',
            'branch_name'    => 'Библиотека — филиал №15',
            'department'     => 'Основной абонемент',
            'address'        => 'г. Владимир, пос. Заклязьменский, ул. Центральная, д. 11 А',
            'district'       => 'пос. Заклязьменский',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => '8(4922) 42-53-96',
            'perm_prefix'    => 'ЦГБ-Ф15'
        ],
        'ф16' => [
            'code'           => 'ф16',
            'aliases'        => ['ф16н', 'ф16нд'],
            'branch_num'     => 'Филиал №16',
            'branch_name'    => 'Библиотека — филиал №16',
            'department'     => 'Основной абонемент',
            'address'        => 'г. Владимир, мкр. Коммунар, ул. Песочная, д. 15, кв. 21',
            'district'       => 'мкр. Коммунар',
            'is_dobroye'     => false,
            'is_center'      => false,
            'phone'          => '8(4922) 42-53-95',
            'perm_prefix'    => 'ЦГБ-Ф16'
        ]
    ];

    private static ?self $instance = null;

    public static function getInstance(?string $cacheDir = null): self
    {
        if (self::$instance === null) {
            self::$instance = new self($cacheDir);
        }
        return self::$instance;
    }

    public function __construct(?string $cacheDir = null)
    {
        $this->cacheDir = $cacheDir ?? (sys_get_temp_dir() . '/opac_cache');
        if (!is_dir($this->cacheDir)) {
            @mkdir($this->cacheDir, 0777, true);
        }
    }

    /**
     * Поиск книг (каскадный через opac_cascade_search или собственный search)
     */
    public function findBooks(string $query, int $length = 5, int $start = 0): array
    {
        if (function_exists('opac_cascade_search')) {
            return opac_cascade_search($query, $length, $start);
        }
        return $this->search($query, $start, $length);
    }

    /**
     * Получение информации об экземплярах книги
     */
    public function getBookCopies(string $recordId): array
    {
        if (function_exists('opac_get_copies_raw')) {
            return opac_get_copies_raw($recordId);
        }
        return $this->getHoldings($recordId);
    }

    /**
     * Выполнение cURL с защитой от перегрузки OPAC-сервера (Gatekeeper Mutex)
     */
    private function executeGuardedCurl($ch): string
    {
        $gateFile = $this->cacheDir . '/opac_network_gate.lock';
        $gateFp = @fopen($gateFile, 'c+');
        $rateLimitMs = 350;

        if ($gateFp) {
            @flock($gateFp, LOCK_EX);
            $lastTime = (float)@stream_get_contents($gateFp);
            $now = microtime(true);
            $gapMs = ($now - $lastTime) * 1000.0;
            if ($lastTime > 0 && $gapMs < $rateLimitMs) {
                $sleep = (int)(($rateLimitMs - $gapMs) * 1000);
                if ($sleep > 0) usleep($sleep);
            }
        }

        $resp = (string)curl_exec($ch);

        if ($gateFp) {
            @ftruncate($gateFp, 0);
            @rewind($gateFp);
            @fwrite($gateFp, (string)microtime(true));
            @fflush($gateFp);
            @flock($gateFp, LOCK_UN);
            @fclose($gateFp);
        }

        return $resp;
    }

    /**
     * Получение или продление сессии OPAC-Global
     */
    public function ensureSession(bool $forceRefresh = false): bool
    {
        $sessionFile = $this->cacheDir . '/opac_session_62.json';
        if (!$forceRefresh && file_exists($sessionFile)) {
            $data = json_decode(file_get_contents($sessionFile), true);
            if (!empty($data['session']) && !empty($data['cookie']) && (time() - ($data['time'] ?? 0)) < 1200) {
                $this->session = $data['session'];
                $this->cookie = $data['cookie'];
                return true;
            }
        }

        $postFields = http_build_query([
            'arg0' => $this->user,
            'arg1' => $this->pass,
            'TypeAccess' => 'PayAccess'
        ]);

        $ch = curl_init($this->loginUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $postFields,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER         => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; VladimirCgbOpacClient/1.0)'
        ]);

        $resp = $this->executeGuardedCurl($ch);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $headers = substr($resp, 0, $headerSize);
        $body = substr($resp, $headerSize);
        curl_close($ch);

        $cookie = null;
        if (preg_match('/Set-Cookie:\s*(OGSSOSession=[a-f0-9]+)/i', $headers, $mCookie)) {
            $cookie = $mCookie[1];
        }

        $session = null;
        if (preg_match('/var\s+numsean\s*=\s*"([0-9]+)"/i', $body, $mSession)) {
            $session = $mSession[1];
        }

        if ($session && $cookie) {
            $this->session = $session;
            $this->cookie = $cookie;
            @file_put_contents($sessionFile, json_encode([
                'session' => $session,
                'cookie'  => $cookie,
                'time'    => time()
            ]));
            return true;
        }

        return false;
    }

    /**
     * Поиск книг по заглавию или произвольному запросу через FindView
     */
    public function search(string $query, int $start = 0, int $length = 10, string $prefix = 'TI'): array
    {
        if (!$this->ensureSession()) {
            return ['success' => false, 'error' => 'Не удалось подключиться к OPAC-Global'];
        }

        $formattedQuery = preg_match('/^[A-Za-z0-9]{2,5}\s+/u', $query)
            ? $query
            : "{$prefix} {$query}";

        $params = [
            '_service'               => 'opacfindd.FindView',
            '_version'               => '2.7.0',
            'userId'                 => $this->user,
            'session'                => $this->session,
            'iddb'                   => (string)$this->dbId,
            'length'                 => (string)$length,
            'start'                  => (string)$start,
            'query/body'             => $formattedQuery,
            'query/mode'             => 'wordset',
            'outformList[0]/outform' => 'SHOTFORM',
            'outformList[1]/outform' => 'LINEORD'
        ];

        $xml = $this->callDirect($params);
        return $this->parseFindViewShotform($xml);
    }

    /**
     * Получение полных данных экземпляров книги через MoveCopies
     */
    public function getHoldings(string $recordId): array
    {
        if (!$this->ensureSession()) {
            return ['success' => false, 'error' => 'Сессия OPAC недоступна'];
        }

        $params = [
            '_service' => 'opacholdd.MoveCopies',
            '_version' => '1.0.0',
            'idbr'     => $recordId,
            'id'       => $this->user,
            'userId'   => $this->user,
            'session'  => $this->session,
            'iddb'     => (string)$this->dbId
        ];

        $xml = $this->callDirect($params);
        return $this->parseMoveCopiesXml($xml, $recordId);
    }

    /**
     * Извлечение полной записи в формате UNIMARC
     */
    public function getMarcRecord(string $recordId): array
    {
        if (!$this->ensureSession()) {
            return ['success' => false, 'error' => 'Сессия OPAC недоступна'];
        }

        $params = [
            '_service'               => 'opacfindd.FindView',
            '_version'               => '2.3.0',
            'userId'                 => $this->user,
            'session'                => $this->session,
            'iddb'                   => (string)$this->dbId,
            'iddbIds[0]/iddb'        => (string)$this->dbId,
            'iddbIds[0]/id'          => $recordId,
            'outformList[0]/outform' => 'UNIMARC'
        ];

        $xml = $this->callDirect($params);
        return $this->parseUnimarcXml($xml);
    }

    /**
     * Вызов direct.exe с обработкой устаревшей сессии
     */
    private function callDirect(array $params): string
    {
        $ch = curl_init($this->directUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($params),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_COOKIE         => $this->cookie,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; VladimirCgbOpacClient/1.0)'
        ]);

        $output = $this->executeGuardedCurl($ch);
        curl_close($ch);

        // Если сессия устарела — обновляем один раз и повторяем
        if (strpos($output, '<error') !== false && (strpos($output, 'Сессия') !== false || strpos($output, 'session') !== false)) {
            $this->ensureSession(true);
            $params['session'] = $this->session;
            $ch = curl_init($this->directUrl);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => http_build_query($params),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_COOKIE         => $this->cookie,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => 0,
                CURLOPT_TIMEOUT        => 15
            ]);
            $output = $this->executeGuardedCurl($ch);
            curl_close($ch);
        }

        return $output;
    }

    /**
     * Парсинг ответа FindView (SHOTFORM) без внешних XML-расширений
     */
    public function parseFindViewShotform(string $xml): array
    {
        if (empty($xml)) {
            return ['success' => false, 'total' => 0, 'items' => [], 'error' => 'Empty XML'];
        }

        // Общее число найденных записей из <document ... size="N">
        $total = 0;
        if (preg_match('/<document[^>]+size="([0-9]+)"/i', $xml, $mSize)) {
            $total = (int)$mSize[1];
        }

        $items = [];
        // Извлекаем все записи каталога внутри <result>
        if (preg_match('/<result[^>]*>(.*?)<\/result>/is', $xml, $mResult)) {
            $resultBody = $mResult[1];
            $entryChunks = preg_split('/(?=<entry\b[^>]*\bid=")/i', $resultBody);

            foreach ($entryChunks as $chunk) {
                if (!preg_match('/^<entry\b([^>]*)>/i', $chunk, $mEntryAttrs)) {
                    continue;
                }
                $entryAttrsStr = $mEntryAttrs[1];
                $recId = self::extractXmlAttr($entryAttrsStr, 'id');
                if ($recId === '') continue;
                $iddb = self::extractXmlAttr($entryAttrsStr, 'iddb') ?: '62';

                // Извлекаем текстовые блоки <content><entry>...</entry></content>
                $contentEntries = [];
                if (preg_match('/<SHOTFORM[^>]*>.*?<content[^>]*>(.*?)<\/content>/is', $chunk, $mContent)) {
                    preg_match_all('/<entry[^>]*>(.*?)<\/entry>/is', $mContent[1], $mContentItems);
                    foreach ($mContentItems[1] as $ci) {
                        $cleaned = strip_tags(html_entity_decode($ci, ENT_QUOTES | ENT_XML1, 'UTF-8'));
                        $contentEntries[] = trim($cleaned);
                    }
                }

                $parsed = $this->decodeShotformContent($contentEntries);
                $parsed['id'] = $recId;
                $parsed['iddb'] = $iddb;
                $items[] = $parsed;
            }
        }

        return [
            'success' => true,
            'total'   => $total,
            'count'   => count($items),
            'items'   => $items
        ];
    }

    /**
     * Декодирование текстовых блоков SHOTFORM
     */
    public function decodeShotformContent(array $entries): array
    {
        $result = [
            'author'       => '',
            'title'        => '',
            'subtitle'     => '',
            'year'         => '',
            'pagination'   => '',
            'doc_type'     => '',
            'bbk'          => '',
            'author_sign'  => '',
            'inventory'    => '',
            'siglas_raw'   => '',
            'branches'     => []
        ];

        // 1. Библиографическая строка (Entry 0)
        if (!empty($entries[0])) {
            $line = $entries[0];

            // Автор (до запятой)
            if (preg_match('/^([^,]+),\s*(.+)$/u', $line, $mAuth)) {
                $result['author'] = trim($mAuth[1]);
                $rest = $mAuth[2];
            } else {
                $rest = $line;
            }

            // Год издания: - YYYY.-
            if (preg_match('/^(.*?)\s*-\s*(\d{4})\.\s*-\s*(.+)$/u', $rest, $mYear)) {
                $titlePart = trim($mYear[1]);
                $result['year'] = $mYear[2];
                $result['pagination'] = trim($mYear[3]);
            } else {
                $titlePart = $rest;
            }

            // Заглавие и подзаголовок (разделены двоеточием)
            if (strpos($titlePart, ':') !== false) {
                $parts = explode(':', $titlePart, 2);
                $result['title'] = trim($parts[0]);
                $result['subtitle'] = trim($parts[1]);
            } else {
                $result['title'] = trim($titlePart);
            }
        }

        // 2. Тип документа (Entry 1)
        if (!empty($entries[1])) {
            $result['doc_type'] = trim($entries[1]);
        }

        // 3. Шифр хранения и местонахождение (Entry 2)
        if (!empty($entries[2])) {
            $metaLine = $entries[2];
            if (preg_match('/Шифр\s*([^;]+)/ui', $metaLine, $mShifr)) {
                $result['bbk'] = trim($mShifr[1]);
            }
            if (preg_match('/Авт\.\s*знак\s*([^;]+)/ui', $metaLine, $mSign)) {
                $result['author_sign'] = trim($mSign[1]);
            }
            if (preg_match('/Инв\.\s*номер\s*([^;]+)/ui', $metaLine, $mInv)) {
                $result['inventory'] = trim($mInv[1]);
            }
            if (preg_match('/Место\s*хранения:\s*([^;]+)/ui', $metaLine, $mSig)) {
                $result['siglas_raw'] = trim($mSig[1]);
                $rawList = preg_split('/[,\s]+/u', $result['siglas_raw'], -1, PREG_SPLIT_NO_EMPTY);
                foreach ($rawList as $sig) {
                    $branchInfo = self::resolveBranchBySigla($sig);
                    if ($branchInfo) {
                        $result['branches'][$branchInfo['code']] = $branchInfo;
                    }
                }
            }
        }

        return $result;
    }

    /**
     * Декодирование XML ответа MoveCopies без зависимостей от simplexml
     */
    public function parseMoveCopiesXml(string $xml, string $recordId): array
    {
        if (empty($xml)) {
            return [
                'success'   => false,
                'record_id' => $recordId,
                'found'     => 0,
                'free'      => 0,
                'copies'    => [],
                'error'     => 'Empty XML'
            ];
        }

        $found = 0;
        if (preg_match('/<document\b[^>]*\bfound="([0-9]+)"/i', $xml, $mFound)) {
            $found = (int)$mFound[1];
        }

        $free = 0;
        if (preg_match('/<document\b[^>]*\bfree="([0-9]+)"/i', $xml, $mFree)) {
            $free = (int)$mFree[1];
        }

        $outform = '';
        if (preg_match('/<document\b[^>]*\boutform="([^"]*)"/i', $xml, $mOutform)) {
            $outform = html_entity_decode($mOutform[1], ENT_QUOTES | ENT_XML1, 'UTF-8');
        }

        $copies = [];
        if (preg_match('/<copies[^>]*>(.*?)<\/copies>/is', $xml, $mCopies)) {
            $copiesBlock = $mCopies[1];
            preg_match_all('/<entry\b([^>]*)>(.*?)<\/entry>/is', $copiesBlock, $mEntries, PREG_SET_ORDER);

            foreach ($mEntries as $e) {
                $attrsStr = $e[1];
                $inner = $e[2];

                $inv = self::extractXmlAttr($attrsStr, 'inventory');
                $barcode = self::extractXmlAttr($attrsStr, 'barcode');
                $shifr = self::extractXmlAttr($attrsStr, 'shifr');
                $status = self::extractXmlAttr($attrsStr, 'status');
                $permLoc = self::extractXmlAttr($attrsStr, 'permanentLocation');
                $locText = self::extractXmlAttr($attrsStr, 'location');

                // Чтение блока field899
                $f899 = [];
                if (preg_match('/<field899[^>]*>(.*?)<\/field899>/is', $inner, $m899)) {
                    preg_match_all('/<entry\b([^>]*)\/?>/is', $m899[1], $m899Entries);
                    foreach ($m899Entries[1] as $subStr) {
                        $sub = self::extractXmlAttr($subStr, 'sub');
                        $val = self::extractXmlAttr($subStr, 'value');
                        if ($sub !== '') {
                            $f899[$sub] = $val;
                        }
                    }
                }

                $rawSigla = $f899['b'] ?? '';
                if ($rawSigla === '' && $permLoc !== '') {
                    $rawSigla = self::extractSiglaFromPermanentLocation($permLoc);
                }

                $branch = self::resolveBranchBySigla($rawSigla);
                $isAvailable = ($status === '1' && mb_stripos($locText, 'не доступен') === false);

                $copies[] = [
                    'inventory'          => $inv ?: ($f899['x'] ?? ''),
                    'barcode'            => ($barcode !== 'NO' && $barcode !== '') ? $barcode : ($f899['p'] ?? 'NO'),
                    'shifr'              => $shifr ?: ($f899['j'] ?? ''),
                    'bbk'                => $f899['j'] ?? $shifr,
                    'author_sign'        => $f899['i'] ?? '',
                    'status_code'        => $status,
                    'is_available'       => $isAvailable,
                    'location_text'      => $locText,
                    'permanent_location' => $permLoc,
                    'sigla_code'         => $rawSigla,
                    'organization'       => $f899['a'] ?? 'ЦГБ Г. ВЛАДИМИРА',
                    'act_number'         => $f899['y'] ?? '',
                    'price'              => $f899['9'] ?? '',
                    'branch'             => $branch
                ];
            }
        }

        return [
            'success'   => true,
            'record_id' => $recordId,
            'found'     => $found ?: count($copies),
            'free'      => $free,
            'outform'   => $outform,
            'copies'    => $copies
        ];
    }

    /**
     * Декодирование машиночитаемого формата UNIMARC без SimpleXML
     */
    public function parseUnimarcXml(string $xml): array
    {
        if (empty($xml) || !preg_match('/<UNIMARC[^>]*>(.*?)<\/UNIMARC>/is', $xml, $mUni)) {
            return ['success' => false, 'error' => 'UNIMARC data not found'];
        }

        preg_match_all('/<entry[^>]*>(.*?)<\/entry>/is', $mUni[1], $mEntries);

        $fields = [];
        foreach ($mEntries[1] as $rawVal) {
            $line = trim(html_entity_decode($rawVal, ENT_QUOTES | ENT_XML1, 'UTF-8'));
            if (strlen($line) < 3) continue;

            $tag = substr($line, 0, 3);
            $rest = substr($line, 3);

            $subfieldParts = explode('$', $rest);
            $indicators = array_shift($subfieldParts);

            $subs = [];
            foreach ($subfieldParts as $sp) {
                if (strlen($sp) < 1) continue;
                $subCode = $sp[0];
                $subVal = substr($sp, 1);
                $subs[$subCode] = $subVal;
            }

            $fields[] = [
                'tag'        => $tag,
                'indicators' => trim($indicators),
                'subfields'  => $subs,
                'raw'        => $line
            ];
        }

        $title = '';
        $author = '';
        $publisher = '';
        $year = '';
        $bbk = '';
        $copies899 = [];

        foreach ($fields as $f) {
            if ($f['tag'] === '200') {
                $title = $f['subfields']['a'] ?? '';
            } elseif ($f['tag'] === '700') {
                $author = trim(($f['subfields']['a'] ?? '') . ' ' . ($f['subfields']['b'] ?? ''));
            } elseif ($f['tag'] === '210') {
                $publisher = $f['subfields']['c'] ?? '';
                $year = $f['subfields']['d'] ?? '';
            } elseif ($f['tag'] === '686' && empty($bbk)) {
                $bbk = $f['subfields']['a'] ?? '';
            } elseif ($f['tag'] === '899') {
                $copies899[] = [
                    'org'     => $f['subfields']['a'] ?? '',
                    'sigla'   => $f['subfields']['b'] ?? '',
                    'bbk'     => $f['subfields']['j'] ?? '',
                    'sign'    => $f['subfields']['i'] ?? '',
                    'inv'     => $f['subfields']['x'] ?? '',
                    'act'     => $f['subfields']['y'] ?? '',
                    'price'   => $f['subfields']['9'] ?? '',
                    'barcode' => $f['subfields']['p'] ?? 'NO'
                ];
            }
        }

        return [
            'success'   => true,
            'title'     => $title,
            'author'    => $author,
            'publisher' => $publisher,
            'year'      => $year,
            'bbk'       => $bbk,
            'holdings'  => $copies899,
            'fields'    => $fields
        ];
    }

    /**
     * Извлечение значения XML атрибута с деэкранированием сущностей
     */
    private static function extractXmlAttr(string $str, string $attrName): string
    {
        if (preg_match('/' . preg_quote($attrName, '/') . '="([^"]*)"/i', $str, $m)) {
            return html_entity_decode($m[1], ENT_QUOTES | ENT_XML1, 'UTF-8');
        }
        return '';
    }

    /**
     * Сопоставление кода сигла с эталонным словарем филиалов
     */
    public static function resolveBranchBySigla(string $rawSigla): ?array
    {
        $code = mb_strtolower(trim($rawSigla), 'UTF-8');
        $code = preg_replace('/^(цгб[-_\s]+|мбук[-_\s]+)/ui', '', $code);

        // 1. Прямой поиск в словаре
        if (isset(self::$siglaDictionary[$code])) {
            return self::$siglaDictionary[$code];
        }

        // 2. Поиск по алиасам (например цдч, цди, ф2д, ф7н, ф13н и др.)
        foreach (self::$siglaDictionary as $rootSigla => $info) {
            if (!empty($info['aliases']) && in_array($code, $info['aliases'], true)) {
                return $info;
            }
        }

        // 3. Нормализация филиалов с суффиксами (например ф4д -> ф4, ф14нд -> ф14)
        if (preg_match('/^(ф\d+)/ui', $code, $mBranch)) {
            $rootCode = $mBranch[1];
            if (isset(self::$siglaDictionary[$rootCode])) {
                $info = self::$siglaDictionary[$rootCode];
                return $info;
            }
        }

        return null;
    }

    /**
     * Извлечение сигла из permanentLocation (например 'ЦГБ-Ф4' -> 'ф4')
     */
    public static function extractSiglaFromPermanentLocation(string $perm): string
    {
        $perm = mb_strtolower(trim($perm), 'UTF-8');
        $perm = preg_replace('/^цгб[-_\s]*/ui', '', $perm);
        return $perm;
    }

    /**
     * Возвращает полный эталонный словарь филиалов
     */
    public static function getSiglaDictionary(): array
    {
        return self::$siglaDictionary;
    }
}

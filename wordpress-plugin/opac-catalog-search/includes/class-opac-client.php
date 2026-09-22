<?php
/**
 * OPACWP Client — эталонный словарь сигл филиалов ЦГБ г. Владимира (БД 62).
 * Портировано из api/OpacClient.php проекта vk_wall_searcher_php (сокращённая версия:
 * используются только статические сопоставители сигл — сетевые вызовы выполняет class-opac-gateway.php).
 */

defined('ABSPATH') || exit;

if (!defined("OPACWP_MB_POLYFILLS_LOADED")) {
    define("OPACWP_MB_POLYFILLS_LOADED", 1);
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
}

if (!class_exists("OpacWPClient")) {
class OpacWPClient
{
    private $host = 'https://opac.lib33.ru';
    private $loginUrl = 'https://opac.lib33.ru/cgiopac/opacg/opac.exe';
    private $directUrl = 'https://opac.lib33.ru/cgiopac/opacg/direct.exe';
    private $dbId = 62;
    private $user = 'SHARE';
    private $pass = 'TLBYSQ028';
    private $cacheDir;

    private $session = null;
    private $cookie = null;

    /**
     * Эталонный словарь библиотечных сигл филиалов г. Владимира
     */
    private static $siglaDictionary = [
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
}

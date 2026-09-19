<?php
/**
 * OPAC_Ajax — маршрутизация запросов фронтенда к шлюзу OPACWP через admin-ajax.php.
 *
 * Портировано из opac_handle_http_request() api/opac.php (действия search / copies / cover / status).
 * Все эндпоинты публичные (доступны посетителям сайта), защита — файловый Rate Limiter шлюза.
 */

defined('ABSPATH') || exit;

class OPAC_Ajax
{
    /**
     * Обёртка ответа: JSON + код HTTP
     *
     * @param array $payload Данные ответа
     * @param int $httpCode HTTP-код (200, 400, 429, 503...)
     */
    private static function respond(array $payload, int $httpCode = 200)
    {
        if ($httpCode !== 200) {
            status_header($httpCode);
        }
        wp_send_json($payload);
    }

    /**
     * Ответ 429 при превышении Rate Limit (формат совместим с исходным api/opac.php)
     */
    private static function respondRateLimited()
    {
        nocache_headers();
        self::respond([
            'ok'           => false,
            'rate_limited' => true,
            'retry_after'  => 5,
            'error'        => 'Слишком много запросов к каталогу. Пожалуйста, подождите несколько секунд.',
        ], 429);
    }

    /**
     * Извлечение строкового параметра из GET/POST
     */
    private static function param(string $key, string $default = ''): string
    {
        return isset($_REQUEST[$key]) ? trim(wp_unslash((string)$_REQUEST[$key])) : $default;
    }

    /**
     * Отметка «нет кэширования» для динамических ответов каталога
     */
    public static function no_cache_headers()
    {
        nocache_headers();
        header('Content-Type: application/json; charset=UTF-8');
    }

    /* ======================================================================
     * action=opac_search — библиографический поиск с обогащением экземплярами
     * ==================================================================== */
    public static function handle_search()
    {
        self::no_cache_headers();

        if (!opacwp_rate_limit('search', 30, 150)) {
            self::respondRateLimited();
        }

        $query         = self::param('query', self::param('q'));
        $page          = max(1, (int)self::param('page', '1'));
        $length        = isset($_REQUEST['length']) ? (int)$_REQUEST['length'] : 4;
        $start         = isset($_REQUEST['start']) ? (int)$_REQUEST['start'] : (($page - 1) * $length);
        $cascade       = self::param('cascade', '1') !== '0';
        $includeCopies = !empty($_REQUEST['include_copies']) || !empty($_REQUEST['include_holdings']) || !empty($_REQUEST['copies']);
        $branchFilter  = self::param('branch');
        $onlyAvailable = !empty($_REQUEST['only_available']) || !empty($_REQUEST['available']);
        $refresh       = !empty($_REQUEST['refresh']);

        // Защита сервера OPAC: при include_copies жестко ограничиваем длину максимум 6 записями (по умолчанию 4)
        if ($includeCopies) {
            $length = max(1, min(6, $length));
        } else {
            $length = max(1, min(20, $length));
        }

        // Быстрый возврат из объединённого обогащённого кэша (Full Enriched Cache, TTL 2 часа)
        $cacheDir      = opacwp_get_cache_dir();
        $fullCacheKey  = md5('v3|' . mb_strtolower($query, 'UTF-8') . '|' . $length . '|' . $start . '|' . ($cascade ? 1 : 0) . '|' . ($includeCopies ? 1 : 0) . '|' . mb_strtolower($branchFilter, 'UTF-8') . '|' . ($onlyAvailable ? 1 : 0));
        $fullCacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'opacwp_full_v3_' . $fullCacheKey . '.json';

        if (!$refresh && is_file($fullCacheFile)) {
            $mtime = @filemtime($fullCacheFile);
            if ($mtime !== false && (time() - $mtime < 7200)) {
                $cachedFull = @json_decode((string)@file_get_contents($fullCacheFile), true);
                if (is_array($cachedFull) && !empty($cachedFull['ok'])) {
                    $cachedFull['_cached']      = true;
                    $cachedFull['_cached_full'] = true;
                    $cachedFull['_cached_at']   = $mtime;
                    if (isset($cachedFull['raw_xml'])) {
                        unset($cachedFull['raw_xml']);
                    }
                    self::respond($cachedFull);
                }
            }
        }

        if ($cascade) {
            $result = opacwp_cascade_search($query, $length, $start);
        } else {
            $result = opacwp_search_raw($query, $length, $start);
        }

        // Метаданные пагинации
        $result['page']        = $page;
        $result['per_page']    = $length;
        $totalFound            = (int)($result['total_found'] ?? 0);
        $result['total_pages'] = $totalFound > 0 ? (int)ceil($totalFound / $length) : 1;
        $result['start']       = $start;

        // Пакетное обогащение экземплярами (holdings) с защитой от перегрузки OPAC
        if ($includeCopies && !empty($result['ok']) && !empty($result['items'])) {
            $maxEnrichItems = $length;
            $enrichedCount  = 0;

            foreach ($result['items'] as &$item) {
                if (empty($item['id'])) {
                    continue;
                }

                if ($enrichedCount >= $maxEnrichItems) {
                    // Данные по остальным записям страницы достраиваются по требованию (copies action)
                    $item['copies']           = [];
                    $item['total_copies']     = $item['available_quantity'] ?? 0;
                    $item['available_copies'] = $item['available_possible'] ?? 0;
                    $item['holding_branches'] = $item['locations'] ?? [];
                    $item['has_dobroye']      = in_array('ф4', $item['locations'] ?? [], true) || in_array('аб', $item['locations'] ?? [], true);
                    $item['has_branch4']      = in_array('ф4', $item['locations'] ?? [], true);
                    $item['copies_on_demand'] = true;
                    continue;
                }

                $copiesData     = opacwp_get_copies_raw($item['id']);
                $copies         = $copiesData['copies'] ?? [];
                $availableCount = 0;
                $branchList     = [];
                $hasDobroye     = false;
                $hasBranch4     = false;

                foreach ($copies as $c) {
                    if (!empty($c['is_available'])) {
                        $availableCount++;
                    }
                    $bCode = $c['branch_code'] ?? ($c['subfield_b'] ?? '');
                    if ($bCode !== '' && !in_array($bCode, $branchList, true)) {
                        $branchList[] = $bCode;
                    }
                    if (!empty($c['is_dobroye'])) {
                        $hasDobroye = true;
                    }
                    if (($c['subfield_b'] ?? '') === 'ф4' || ($c['branch_code'] ?? '') === 'Филиал №4') {
                        $hasBranch4 = true;
                    }
                }

                // Гарантируем наличие инвентарного номера у книги и копий
                $itemInventory = trim((string)($item['inventory'] ?? ''));
                if ($itemInventory === '') {
                    foreach ($copies as $c) {
                        if (!empty($c['inventory'])) {
                            $itemInventory = trim((string)$c['inventory']);
                            break;
                        }
                    }
                    if ($itemInventory !== '') {
                        $item['inventory'] = $itemInventory;
                    }
                }
                if ($itemInventory !== '') {
                    foreach ($copies as &$c) {
                        if (empty($c['inventory'])) {
                            $c['inventory'] = $itemInventory;
                        }
                    }
                    unset($c);
                }

                $item['copies']           = $copies;
                $item['total_copies']     = count($copies);
                $item['available_copies'] = $availableCount;
                $item['holding_branches'] = $branchList;
                $item['has_dobroye']      = $hasDobroye;
                $item['has_branch4']      = $hasBranch4;
                $enrichedCount++;

                // Вежливая пауза 200мс между сетевыми запросами к OPAC
                if (empty($copiesData['_cached'])) {
                    usleep(200000);
                }
            }
            unset($item);

            // Фильтрация по филиалу при наличии параметра branch
            if ($branchFilter !== '') {
                $result['items'] = self::filter_items_by_branch($result['items'], $branchFilter);
                $result['count'] = count($result['items']);
            }

            // Фильтрация «только в наличии»
            if ($onlyAvailable) {
                $availableItems = [];
                foreach ($result['items'] as $item) {
                    if (!empty($item['available_copies']) && $item['available_copies'] > 0) {
                        $availableItems[] = $item;
                    }
                }
                $result['items'] = $availableItems;
                $result['count'] = count($availableItems);
            }
        }

        // Сырой XML клиенту не отдаём
        if (isset($result['raw_xml'])) {
            unset($result['raw_xml']);
        }

        // Атомарное сохранение объединённого кэша
        if (!empty($result['ok'])) {
            opacwp_atomic_write_json($fullCacheFile, $result);
        }

        self::respond($result);
    }

    /**
     * Фильтрация записей по филиалу (порт логики исходного обработчика search)
     *
     * @param array $items
     * @param string $branchFilter
     * @return array
     */
    private static function filter_items_by_branch(array $items, string $branchFilter): array
    {
        $bFilterLower = mb_strtolower($branchFilter, 'UTF-8');
        $filtered     = [];

        foreach ($items as $item) {
            $matches = false;

            if ($bFilterLower === 'ф4' || $bFilterLower === 'f4') {
                $matches = !empty($item['has_branch4']);
            } elseif ($bFilterLower === 'доброе' || $bFilterLower === 'dobroye') {
                $matches = !empty($item['has_dobroye']);
            } elseif ($bFilterLower === 'цдб' || $bFilterLower === 'cdb') {
                foreach ($item['copies'] ?? [] as $c) {
                    $sub = mb_strtolower(trim($c['subfield_b'] ?? ''), 'UTF-8');
                    if (!empty($c['is_center']) || $sub === 'цдб' || $sub === 'до' || ($c['branch_code'] ?? '') === 'ЦДБ') {
                        $matches = true;
                        break;
                    }
                }
            } elseif ($bFilterLower === 'цгб' || $bFilterLower === 'cgb') {
                foreach ($item['copies'] ?? [] as $c) {
                    $sub = mb_strtolower(trim($c['subfield_b'] ?? ''), 'UTF-8');
                    if ($sub === 'до') continue; // Сигла ДО — это ЦДБ!
                    if (($c['branch_code'] ?? '') === 'ЦГБ' || in_array($sub, ['аб', 'чз', 'кх'], true)) {
                        $matches = true;
                        break;
                    }
                }
            } elseif (preg_match('/^[fф]-?(\d+)$/ui', $bFilterLower, $fnum)) {
                $num      = (int)$fnum[1];
                $siglaKey = 'ф' . $num;
                $filialKey = '№' . $num;
                foreach ($item['copies'] ?? [] as $c) {
                    $sub  = mb_strtolower($c['subfield_b'] ?? '', 'UTF-8');
                    $code = mb_strtolower($c['branch_code'] ?? '', 'UTF-8');
                    $name = mb_strtolower($c['branch_name'] ?? '', 'UTF-8');
                    $loc  = mb_strtolower($c['permanent_location'] ?? '', 'UTF-8');
                    if (strpos($sub, $siglaKey) !== false ||
                        strpos($code, $filialKey) !== false ||
                        strpos($name, $filialKey) !== false ||
                        strpos($loc, $siglaKey) !== false) {
                        $matches = true;
                        break;
                    }
                }
            } else {
                foreach ($item['copies'] ?? [] as $c) {
                    if (mb_stripos($c['branch_code'] ?? '', $branchFilter) !== false ||
                        mb_stripos($c['subfield_b'] ?? '', $branchFilter) !== false ||
                        mb_stripos($c['branch_name'] ?? '', $branchFilter) !== false ||
                        mb_stripos($c['branch_address'] ?? '', $branchFilter) !== false) {
                        $matches = true;
                        break;
                    }
                }
            }

            if ($matches) {
                $filtered[] = $item;
            }
        }

        return $filtered;
    }

    /* ======================================================================
     * action=opac_copies — экземпляры и филиалы по idbr
     * ==================================================================== */
    public static function handle_copies()
    {
        self::no_cache_headers();

        if (!opacwp_rate_limit('copies', 30, 150)) {
            self::respondRateLimited();
        }

        $recordId = self::param('idbr', self::param('id', self::param('record_id')));
        $result   = opacwp_get_copies_raw($recordId);

        if (isset($result['raw_xml'])) {
            unset($result['raw_xml']);
        }

        self::respond($result);
    }

    /* ======================================================================
     * action=opac_cover — поиск обложки (ЛитРес -> Яндекс -> OpenLibrary -> Google)
     * ==================================================================== */
    public static function handle_cover()
    {
        self::no_cache_headers();

        if (!opacwp_rate_limit('cover', 30, 150)) {
            self::respondRateLimited();
        }

        if (!opacwp_get_setting('enable_covers')) {
            self::respond(['ok' => true, 'found' => false, 'url' => null, 'source' => null]);
        }

        $rawTitle     = self::param('title', self::param('q'));
        $rawAuthor    = self::param('author');
        $isbn         = self::param('isbn');
        $sourceFilter = self::param('source');
        $coverRes     = opacwp_resolve_book_cover($rawTitle, $rawAuthor, $isbn, $sourceFilter);

        self::respond($coverRes);
    }

    /* ======================================================================
     * action=opac_status — проверка сессии (без раскрытия секретов)
     * ==================================================================== */
    public static function handle_status()
    {
        self::no_cache_headers();

        if (!opacwp_rate_limit('status', 30, 150)) {
            self::respondRateLimited();
        }

        // Принудительное обновление сессии доступно только администраторам
        $force = !empty($_REQUEST['refresh']) && current_user_can('manage_options');
        $session = opacwp_get_session($force);

        $safeSession = [
            'ok'            => !empty($session['ok']),
            'from_cache'    => !empty($session['from_cache']),
            'ttl_remaining' => isset($session['expires_at']) ? max(0, (int)$session['expires_at'] - time()) : 0,
        ];
        if (!empty($session['error'])) {
            $safeSession['error'] = (string)$session['error'];
        }

        self::respond($safeSession);
    }
}

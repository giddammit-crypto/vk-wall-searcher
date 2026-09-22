<?php
/**
 * Plugin Name:       Каталог OPAC — поиск по электронному каталогу ЦГБ
 * Plugin URI:        https://biblioteka33.ru
 * Description:       Модальное окно поиска по электронному каталогу OPAC-Global (БД 62, ЦГБ г. Владимира): поиск изданий, экземпляры и наличие по 18 филиалам, обложки, фильтры. Встраивается в меню WordPress, шорткодом [opac_catalog] или плавающей кнопкой.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.1
 * Author:            AURORA Core Team
 * License:           MIT
 * Text Domain:       opac-catalog-search
 */

defined('ABSPATH') || exit;

define('OPACWP_VERSION', '1.0.0');
define('OPACWP_FILE', __FILE__);
define('OPACWP_DIR', plugin_dir_path(__FILE__));
define('OPACWP_URL', plugin_dir_url(__FILE__));

require_once OPACWP_DIR . 'includes/class-opac-client.php';
require_once OPACWP_DIR . 'includes/class-opac-gateway.php';
require_once OPACWP_DIR . 'includes/class-opac-ajax.php';

/* ============================================================================
 * Настройки
 * ========================================================================== */

/**
 * Значения по умолчанию всех опций плагина
 */
function opacwp_default_settings()
{
    return [
        'opac_base_url'        => 'https://opac.lib33.ru',
        'opac_login'           => 'CGBRD',
        'opac_password'        => '', // задаётся на странице настроек плагина — не хранить пароль в коде
        'opac_type_access'     => 'PayAccess',
        'opac_db_id'           => '62',
        'opac_session_ttl'     => 3600,
        'opac_copies_ttl'      => 10800,
        'opac_rate_limit_ms'   => 350,
        'opac_connect_timeout' => 4,
        'opac_timeout'         => 10,
        'opac_search_ttl'      => 21600,
        'enable_covers'        => 1,
        // Внешний вид и встраивание
        'menu_title'           => 'Каталог книг',
        'menu_badge'           => 'OPAC',
        'inject_menu_location' => 'none',   // slug зарегистрированной локации меню или 'none'
        'floating_button'      => 0,        // плавающая кнопка в углу экрана
        'enqueue_assets'       => 1,        // подключать CSS/JS на всех страницах
        'load_material_icons'  => 1,        // подключать шрифт Material Symbols с fonts.googleapis.com
        'direct_catalog_url'   => 'http://library.vladimir.ru/rguest_vlad_cgb.htm',
    ];
}

/**
 * Все опции плагина с подстановкой значений по умолчанию
 *
 * @return array
 */
function opacwp_get_settings()
{
    $saved = get_option('opacwp_settings', []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return wp_parse_args($saved, opacwp_default_settings());
}

/**
 * Значение одной опции
 *
 * @param string $key
 * @return mixed
 */
function opacwp_get_setting($key)
{
    $settings = opacwp_get_settings();
    return $settings[$key] ?? null;
}

/* ============================================================================
 * Активация / деактивация / удаление
 * ========================================================================== */

register_activation_hook(__FILE__, function () {
    $saved = get_option('opacwp_settings', []);
    if (!is_array($saved)) {
        $saved = [];
    }
    update_option('opacwp_settings', array_merge(opacwp_default_settings(), $saved));

    // Прогрев кэш-директории
    $dir = opacwp_get_cache_dir();
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
});

register_deactivation_hook(__FILE__, function () {
    // Сессию и предохранитель сбрасываем, кэш результатов оставляем
    $cacheDir = opacwp_get_cache_dir();
    foreach (['opacwp_session.json', 'opacwp_circuit_breaker.json'] as $f) {
        if (is_file($cacheDir . DIRECTORY_SEPARATOR . $f)) {
            @unlink($cacheDir . DIRECTORY_SEPARATOR . $f);
        }
    }
});

/* ============================================================================
 * AJAX-эндпоинты (публичные: поиск доступен посетителям сайта)
 * ========================================================================== */

add_action('wp_ajax_opac_search', ['OPAC_Ajax', 'handle_search']);
add_action('wp_ajax_nopriv_opac_search', ['OPAC_Ajax', 'handle_search']);
add_action('wp_ajax_opac_copies', ['OPAC_Ajax', 'handle_copies']);
add_action('wp_ajax_nopriv_opac_copies', ['OPAC_Ajax', 'handle_copies']);
add_action('wp_ajax_opac_cover', ['OPAC_Ajax', 'handle_cover']);
add_action('wp_ajax_nopriv_opac_cover', ['OPAC_Ajax', 'handle_cover']);
add_action('wp_ajax_opac_status', ['OPAC_Ajax', 'handle_status']);
add_action('wp_ajax_nopriv_opac_status', ['OPAC_Ajax', 'handle_status']);

/* ============================================================================
 * Подключение ассетов на фронтенде
 * ========================================================================== */

add_action('wp_enqueue_scripts', function () {
    if (!opacwp_get_setting('enqueue_assets')) {
        return;
    }

    // Шрифт иконок Material Symbols (используется модальным окном каталога)
    if (opacwp_get_setting('load_material_icons')) {
        wp_enqueue_style(
            'opacwp-material-symbols',
            'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
            [],
            null
        );
    }

    wp_enqueue_style('opacwp-catalog', OPACWP_URL . 'assets/css/opac-search.css', [], OPACWP_VERSION);
    wp_enqueue_script('opacwp-catalog', OPACWP_URL . 'assets/js/opac-modal.js', [], OPACWP_VERSION, true);

    wp_localize_script('opacwp-catalog', 'OpacCatalogConfig', [
        'ajaxUrl'        => admin_url('admin-ajax.php'),
        'assetUrl'       => OPACWP_URL . 'assets/',
        'bannerUrl'      => OPACWP_URL . 'assets/img/catalog_banner.svg',
        'noCoverImgUrl'  => OPACWP_URL . 'assets/img/robot_shock.png',
        'directUrl'      => (string)opacwp_get_setting('direct_catalog_url'),
        'enableCovers'   => (bool)opacwp_get_setting('enable_covers'),
        'actions'        => [
            'search' => 'opac_search',
            'copies' => 'opac_copies',
            'cover'  => 'opac_cover',
            'status' => 'opac_status',
        ],
    ]);
});

/* ============================================================================
 * Кнопки открытия каталога: шорткод, меню, плавающая кнопка
 * ========================================================================== */

/**
 * HTML кнопки открытия каталога
 *
 * @param array $atts Атрибуты шорткода
 * @return string
 */
function opacwp_render_trigger_button($atts = [])
{
    $atts = shortcode_atts([
        'text'  => (string)opacwp_get_setting('menu_title'),
        'badge' => (string)opacwp_get_setting('menu_badge'),
        'class' => '',
        'icon'  => 'menu_book',
    ], $atts, 'opac_catalog');

    $classes = trim('opac-trigger-btn opac-open-trigger ' . $atts['class']);

    $html = '<button type="button" class="' . esc_attr($classes) . '" title="Электронный каталог книг OPAC">';
    $html .= '<span class="material-symbols-outlined icon">' . esc_html($atts['icon']) . '</span>';
    $html .= '<span class="opac-trigger-text">' . esc_html($atts['text']) . '</span>';
    if ($atts['badge'] !== '' && $atts['badge'] !== '0') {
        $html .= '<span class="opac-nav-badge">' . esc_html($atts['badge']) . '</span>';
    }
    $html .= '</button>';

    return $html;
}

add_shortcode('opac_catalog', 'opacwp_render_trigger_button');
add_shortcode('opac_catalog_button', 'opacwp_render_trigger_button');

/**
 * Автовставка пункта «Каталог книг» в меню WordPress выбранной локации.
 * Внешний вид → Меню: администратору достаточно назначить локацию в настройках плагина.
 */
add_filter('wp_nav_menu_objects', function ($items, $args) {
    $target = (string)opacwp_get_setting('inject_menu_location');
    if ($target === 'none' || $target === '') {
        return $items;
    }
    if (!isset($args->theme_location) || $args->theme_location !== $target) {
        return $items;
    }

    // Уже есть пункт, ведущий на каталог (добавлен вручную через «Произвольную ссылку» #opac-catalog)
    foreach ($items as $item) {
        if (strpos((string)($item->url ?? ''), '#opac-catalog') !== false) {
            return $items;
        }
    }

    $post = new stdClass();
    $post->ID            = 0;
    $post->db_id         = 0;
    $post->menu_item_parent = 0;
    $post->title         = (string)opacwp_get_setting('menu_title');
    $post->url           = '#opac-catalog';
    $post->classes       = ['menu-item', 'menu-item-opac-catalog'];
    $post->type          = 'custom';
    $post->object        = 'custom';
    $post->object_id     = '';
    $post->current       = false;
    $post->current_item_ancestor = false;
    $post->current_item_parent   = false;
    $post->attr_title    = 'Электронный каталог книг OPAC';
    $post->description   = '';
    $post->target        = '';
    $post->xfn           = '';
    $post->post_status   = 'publish';
    $post->menu_order    = 9999;

    $items[] = $post;
    return $items;
}, 10, 2);

/**
 * Плавающая кнопка каталога в углу экрана
 */
add_action('wp_footer', function () {
    if (!opacwp_get_setting('floating_button')) {
        return;
    }
    echo '<div class="opac-float-wrap">' . opacwp_render_trigger_button([
        'class' => 'opac-float-btn',
    ]) . '</div>';
});

/* ============================================================================
 * Страница настроек: Настройки → Каталог OPAC
 * ========================================================================== */

add_action('admin_menu', function () {
    add_options_page(
        'Каталог OPAC',
        'Каталог OPAC',
        'manage_options',
        'opac-catalog-search',
        'opacwp_render_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('opacwp_settings_group', 'opacwp_settings', [
        'type'              => 'array',
        'sanitize_callback' => 'opacwp_sanitize_settings',
    ]);
});

/**
 * Санитизация настроек
 *
 * @param array $input
 * @return array
 */
function opacwp_sanitize_settings($input)
{
    $defaults = opacwp_default_settings();
    $clean = opacwp_get_settings();

    $textKeys = ['opac_base_url', 'opac_login', 'opac_password', 'opac_type_access', 'opac_db_id', 'menu_title', 'menu_badge', 'inject_menu_location', 'direct_catalog_url'];
    foreach ($textKeys as $key) {
        if (isset($input[$key])) {
            $clean[$key] = sanitize_text_field((string)$input[$key]);
        }
    }

    $intKeys = ['opac_session_ttl', 'opac_copies_ttl', 'opac_search_ttl', 'opac_rate_limit_ms', 'opac_connect_timeout', 'opac_timeout'];
    foreach ($intKeys as $key) {
        if (isset($input[$key])) {
            $clean[$key] = max(1, (int)$input[$key]);
        }
    }

    foreach (['enable_covers', 'floating_button', 'enqueue_assets', 'load_material_icons'] as $key) {
        $clean[$key] = empty($input[$key]) ? 0 : 1;
    }

    // Локация меню должна существовать или быть 'none'
    if (isset($clean['inject_menu_location']) && $clean['inject_menu_location'] !== 'none') {
        $locations = array_keys(get_registered_nav_menus());
        if (!in_array($clean['inject_menu_location'], $locations, true)) {
            $clean['inject_menu_location'] = 'none';
        }
    }

    // Базовый URL без завершающего слэша
    $clean['opac_base_url'] = rtrim($clean['opac_base_url'], '/');

    return $clean;
}

/**
 * Разметка страницы настроек
 */
function opacwp_render_settings_page()
{
    if (!current_user_can('manage_options')) {
        return;
    }

    $s = opacwp_get_settings();
    $locations = get_registered_nav_menus();
    ?>
    <div class="wrap">
        <h1>Каталог OPAC — настройки</h1>
        <p>Модальное окно поиска по электронному каталогу OPAC-Global (БД <?php echo esc_html($s['opac_db_id']); ?>, ЦГБ г. Владимира).</p>

        <form method="post" action="options.php">
            <?php settings_fields('opacwp_settings_group'); ?>

            <h2 class="title">Подключение к OPAC-Global</h2>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="opacwp_base_url">Базовый URL каталога</label></th>
                    <td><input type="url" class="regular-text" id="opacwp_base_url" name="opacwp_settings[opac_base_url]" value="<?php echo esc_attr($s['opac_base_url']); ?>"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="opacwp_login">Логин читателя</label></th>
                    <td><input type="text" class="regular-text" id="opacwp_login" name="opacwp_settings[opac_login]" value="<?php echo esc_attr($s['opac_login']); ?>"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="opacwp_password">Пароль</label></th>
                    <td><input type="text" class="regular-text" id="opacwp_password" name="opacwp_settings[opac_password]" value="<?php echo esc_attr($s['opac_password']); ?>"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="opacwp_db_id">Идентификатор БД (iddb)</label></th>
                    <td><input type="text" class="regular-text" id="opacwp_db_id" name="opacwp_settings[opac_db_id]" value="<?php echo esc_attr($s['opac_db_id']); ?>"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="opacwp_session_ttl">TTL сессии, сек.</label></th>
                    <td><input type="number" class="regular-text" id="opacwp_session_ttl" name="opacwp_settings[opac_session_ttl]" value="<?php echo esc_attr($s['opac_session_ttl']); ?>"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="opacwp_copies_ttl">Кэш экземпляров, сек.</label></th>
                    <td><input type="number" class="regular-text" id="opacwp_copies_ttl" name="opacwp_settings[opac_copies_ttl]" value="<?php echo esc_attr($s['opac_copies_ttl']); ?>"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="opacwp_rate_limit_ms">Пауза между запросами, мс.</label></th>
                    <td><input type="number" class="regular-text" id="opacwp_rate_limit_ms" name="opacwp_settings[opac_rate_limit_ms]" value="<?php echo esc_attr($s['opac_rate_limit_ms']); ?>">
                    <p class="description">Защита CGI-шлюза OPAC от перегрузки (не ставить ниже 300).</p></td>
                </tr>
            </table>

            <h2 class="title">Встраивание в сайт</h2>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="opacwp_menu_title">Название пункта меню</label></th>
                    <td><input type="text" class="regular-text" id="opacwp_menu_title" name="opacwp_settings[menu_title]" value="<?php echo esc_attr($s['menu_title']); ?>"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="opacwp_menu_badge">Бейдж на кнопке</label></th>
                    <td><input type="text" class="regular-text" id="opacwp_menu_badge" name="opacwp_settings[menu_badge]" value="<?php echo esc_attr($s['menu_badge']); ?>">
                    <p class="description">Небольшая метка справа (например «OPAC»). Оставьте пустым, чтобы скрыть.</p></td>
                </tr>
                <tr>
                    <th scope="row"><label for="opacwp_inject">Меню для авто-вставки пункта</label></th>
                    <td>
                        <select id="opacwp_inject" name="opacwp_settings[inject_menu_location]">
                            <option value="none">— Не вставлять автоматически —</option>
                            <?php foreach ($locations as $slug => $label) : ?>
                                <option value="<?php echo esc_attr($slug); ?>" <?php selected($s['inject_menu_location'], $slug); ?>>
                                    <?php echo esc_html($label . ' (' . $slug . ')'); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <p class="description">Пункт «Каталог книг» будет добавлен в конец выбранного меню.
                        Альтернативы: шорткод <code>[opac_catalog]</code>, произвольная ссылка меню <code>#opac-catalog</code>
                        или плавающая кнопка ниже.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Плавающая кнопка</th>
                    <td><label><input type="checkbox" name="opacwp_settings[floating_button]" value="1" <?php checked($s['floating_button'], 1); ?>> Показывать кнопку каталога в углу экрана на всех страницах</label></td>
                </tr>
                <tr>
                    <th scope="row">Обложки книг</th>
                    <td><label><input type="checkbox" name="opacwp_settings[enable_covers]" value="1" <?php checked($s['enable_covers'], 1); ?>> Загружать обложки (ЛитРес → Яндекс Книги → OpenLibrary → Google Книги)</label></td>
                </tr>
                <tr>
                    <th scope="row">Ассеты плагина</th>
                    <td>
                        <label><input type="checkbox" name="opacwp_settings[enqueue_assets]" value="1" <?php checked($s['enqueue_assets'], 1); ?>> Подключать CSS/JS плагина на всех страницах</label><br>
                        <label><input type="checkbox" name="opacwp_settings[load_material_icons]" value="1" <?php checked($s['load_material_icons'], 1); ?>> Подключать шрифт Material Symbols (icons) с fonts.googleapis.com</label>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="opacwp_direct_url">Ссылка «OPAC-Global» в карточке</label></th>
                    <td><input type="text" class="regular-text" id="opacwp_direct_url" name="opacwp_settings[direct_catalog_url]" value="<?php echo esc_attr($s['direct_catalog_url']); ?>"></td>
                </tr>
            </table>

            <?php submit_button('Сохранить настройки'); ?>
        </form>

        <hr>
        <h2 class="title">Проверка соединения</h2>
        <p>
            <button type="button" class="button button-secondary" id="opacwp-test-btn">Проверить сессию OPAC</button>
            <span id="opacwp-test-result" style="margin-left:12px;"></span>
        </p>
        <script>
            document.getElementById('opacwp-test-btn').addEventListener('click', function () {
                var out = document.getElementById('opacwp-test-result');
                out.textContent = 'Проверяется…';
                fetch(<?php echo wp_json_encode(admin_url('admin-ajax.php')); ?>, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'action=opac_status&refresh=1'
                }).then(function (r) { return r.json(); }).then(function (d) {
                    if (d && d.ok) {
                        out.innerHTML = '<span style="color:#00a32a;font-weight:600;">✔ Сессия OPAC активна (TTL ' + (d.ttl_remaining || 0) + ' c.)</span>';
                    } else {
                        out.innerHTML = '<span style="color:#d63638;font-weight:600;">✖ ' + (d && d.error ? d.error : 'Сессия недоступна') + '</span>';
                    }
                }).catch(function () {
                    out.innerHTML = '<span style="color:#d63638;font-weight:600;">✖ Сетевая ошибка</span>';
                });
            });
        </script>
    </div>
    <?php
}

/**
 * Ссылка «Настройки» в списке плагинов
 */
add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
    array_unshift($links, '<a href="' . esc_url(admin_url('options-general.php?page=opac-catalog-search')) . '">Настройки</a>');
    return $links;
});

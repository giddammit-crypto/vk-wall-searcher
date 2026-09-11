<?php
/**
 * api/data.php — серверное хранилище телеметрии (история подписчиков филиалов)
 * =============================================================================
 * Данные накапливаются на сервере в каталоге /data и переживают перезапуск
 * браузера. Подписочные снимки (members_count) складываются в
 * `data/subscribers.json` и используются вкладкой «Подписчики» для расчёта
 * динамики по дням / неделям / месяцам.
 *
 * Совместимо с PHP 7.4+. Разработка: Амброзиев О.А. (модуль 3.4)
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dataDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0775, true);
}
$subsFile = $dataDir . DIRECTORY_SEPARATOR . 'subscribers.json';

/**
 * Атомарная запись JSON в файл (защита от повреждении при обрыве запроса)
 */
function vkws_atomic_write($path, array $payload)
{
    $tmp = $path . '.tmp.' . getmypid();
    $ok = @file_put_contents($tmp, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    if ($ok === false) {
        return false;
    }
    return @rename($tmp, $path);
}

function vkws_read_store($path)
{
    if (!is_file($path)) {
        return ['snapshots' => []];
    }
    $raw = @file_get_contents($path);
    $decoded = json_decode((string)$raw, true);
    if (!is_array($decoded) || !isset($decoded['snapshots']) || !is_array($decoded['snapshots'])) {
        return ['snapshots' => []];
    }
    return $decoded;
}

$action = isset($_REQUEST['action']) ? (string)$_REQUEST['action'] : 'history';

// ---------------------------------------------------------------------------
// GET history — отдаём всю историю снимков
// ---------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'history') {
    $store = vkws_read_store($subsFile);
    echo json_encode([
        'ok' => true,
        'snapshots' => $store['snapshots']
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ---------------------------------------------------------------------------
// POST — изменения
// ---------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Некорректный JSON'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $action = isset($body['action']) ? (string)$body['action'] : '';

    // --- save: добавляем пачку снимков ------------------------------------
    if ($action === 'save') {
        $incoming = isset($body['snapshots']) && is_array($body['snapshots']) ? $body['snapshots'] : [];
        if (count($incoming) === 0) {
            echo json_encode(['ok' => true, 'added' => 0], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $store = vkws_read_store($subsFile);
        $added = 0;

        foreach ($incoming as $snap) {
            $groupId = isset($snap['group_id']) ? (int)$snap['group_id'] : 0;
            $members = isset($snap['members']) ? (int)$snap['members'] : -1;
            if ($groupId <= 0 || $members < 0) {
                continue;
            }
            $ts = isset($snap['ts']) ? (int)$snap['ts'] : time();
            $entry = [
                'group_id' => $groupId,
                'name' => isset($snap['name']) ? (string)$snap['name'] : '',
                'screen_name' => isset($snap['screen_name']) ? (string)$snap['screen_name'] : '',
                'branch' => isset($snap['branch']) ? (string)$snap['branch'] : '',
                'members' => $members,
                'ts' => $ts
            ];

            // Не более одного снимка на группу в календарный день:
            // если за сегодня точка уже есть — обновляем её свежим значением.
            $dayKey = date('Y-m-d', $ts);
            $replaced = false;
            foreach ($store['snapshots'] as $idx => $existing) {
                if ((int)$existing['group_id'] === $groupId && date('Y-m-d', (int)$existing['ts']) === $dayKey) {
                    if ($ts >= (int)$existing['ts']) {
                        $store['snapshots'][$idx] = $entry;
                    }
                    $replaced = true;
                    break;
                }
            }
            if (!$replaced) {
                $store['snapshots'][] = $entry;
            }
            $added++;
        }

        // Ограничиваем объём хранилища (последние 200 000 точек)
        if (count($store['snapshots']) > 200000) {
            $store['snapshots'] = array_slice($store['snapshots'], -200000);
        }

        if (!vkws_atomic_write($subsFile, $store)) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Не удалось записать файл данных'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        echo json_encode(['ok' => true, 'added' => $added], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // --- reset: полная очистка истории ------------------------------------
    if ($action === 'reset') {
        vkws_atomic_write($subsFile, ['snapshots' => []]);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Неизвестное действие: ' . $action], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Метод не поддерживается'], JSON_UNESCAPED_UNICODE);

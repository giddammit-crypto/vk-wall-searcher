<?php
/**
 * Figma API Proxy Endpoint for AURORA Poster Editor
 * =============================================================================
 * Проксирует запросы к официальному REST API Figma (api.figma.com/v1).
 * Обходит ограничения браузерного CORS, защищает секретные токены и
 * обеспечивает двустороннюю интеграцию: импорт макетов/слоев и экспорт в Figma.
 *
 * Поддерживаемые действия (action):
 *   - 'me' / 'validate'     → проверка валидности Figma Personal Access Token
 *   - 'file'                → получение структуры файла / фреймов / слоёв
 *   - 'nodes'               → получение конкретных нод макета
 *   - 'images'              → получение URL отрендеренных слоёв / компонентов
 *   - 'image_proxy'         → проксирование изображений с S3 Figma (обход CORS)
 *   - 'post_comment'        → публикация комментария со спецификацией макета
 *   - 'post_dev_resource'   → прикрепление ссылки на афишу в Dev Resources Figma
 *
 * Совместимо с PHP 7.4+ (cURL). Разработка: АВРОРА.
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

// -----------------------------------------------------------------------------
// 1. CORS & Preflight Headers
// -----------------------------------------------------------------------------
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Figma-Token, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// -----------------------------------------------------------------------------
// 2. Вспомогательные функции
// -----------------------------------------------------------------------------
function figma_json_reply($data, $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function figma_error($msg, $code = 400, $extra = [])
{
    figma_json_reply(array_merge([
        'ok' => false,
        'error' => $msg,
        'code' => $code
    ], $extra), $code);
}

// -----------------------------------------------------------------------------
// 3. Загрузка конфигурации
// -----------------------------------------------------------------------------
$figmaConfig = [];
foreach ([__DIR__ . '/config.php', __DIR__ . '/config.local.php'] as $cfgFile) {
    if (is_readable($cfgFile)) {
        $loaded = include $cfgFile;
        if (is_array($loaded)) {
            $figmaConfig = array_merge($figmaConfig, $loaded);
        }
    }
}

// Чтение входных данных (GET, POST или JSON-тело)
$rawBody = file_get_contents('php://input');
$bodyJson = !empty($rawBody) ? json_decode($rawBody, true) : null;
$inputData = is_array($bodyJson) ? array_merge($_GET, $_POST, $bodyJson) : array_merge($_GET, $_POST);

$action = trim((string)($inputData['action'] ?? $_GET['action'] ?? ''));

// Определение токена доступа Figma (из запроса или серверного конфига)
$token = '';
if (!empty($_SERVER['HTTP_X_FIGMA_TOKEN'])) {
    $token = trim((string)$_SERVER['HTTP_X_FIGMA_TOKEN']);
} elseif (!empty($_SERVER['HTTP_AUTHORIZATION']) && preg_match('/Bearer\s+(\S+)/i', $_SERVER['HTTP_AUTHORIZATION'], $m)) {
    $token = trim($m[1]);
} elseif (!empty($inputData['token'])) {
    $token = trim((string)$inputData['token']);
} elseif (!empty($figmaConfig['figma_api_token'])) {
    $token = trim((string)$figmaConfig['figma_api_token']);
}

// Специальное действие: проксирование картинки с CDN Figma (S3) без токена
if ($action === 'image_proxy') {
    $imgUrl = trim((string)($inputData['url'] ?? ''));
    if ($imgUrl === '' || !preg_match('#^https://(?:figma-alpha-api\.s3|[\w.-]+\.figma\.com)#i', $imgUrl)) {
        figma_error('Недопустимый URL изображения для проксирования.', 400);
    }

    $ch = curl_init($imgUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 3,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_USERAGENT      => 'AURORA-Poster-Editor/2.2.0 (+https://biblioteka33.ru/)'
    ]);
    $imgData = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $contentType = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    if ($httpCode !== 200 || empty($imgData)) {
        figma_error('Не удалось загрузить изображение с серверов Figma.', 502);
    }

    if (empty($contentType)) {
        $contentType = 'image/png';
    }

    header('Content-Type: ' . $contentType);
    header('Cache-Control: public, max-age=86400');
    header('Access-Control-Allow-Origin: *');
    echo $imgData;
    exit;
}

// -----------------------------------------------------------------------------
// 4. Проверка токена для всех остальных действий
// -----------------------------------------------------------------------------
if ($token === '' || strpos($token, 'ВСТАВЬТЕ') === 0) {
    figma_error('Не указан Figma API Token. Введите персональный токен доступа (Personal Access Token) в окне интеграции Figma.', 401, [
        'hint' => 'В Figma: Account Settings → Personal Access Tokens → Generate new token'
    ]);
}

/**
 * Выполнение HTTP-запроса к Figma REST API (cURL)
 */
function figma_api_request($endpoint, $token, $method = 'GET', $payload = null)
{
    $url = 'https://api.figma.com/v1/' . ltrim($endpoint, '/');
    $ch = curl_init($url);

    $headers = [
        'X-Figma-Token: ' . $token,
        'Accept: application/json',
        'User-Agent: AURORA-Poster-Figma-Bridge/2.2.0'
    ];

    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 35,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ];

    if ($method === 'POST') {
        $opts[CURLOPT_POST] = true;
        if ($payload !== null) {
            $jsonPayload = is_string($payload) ? $payload : json_encode($payload, JSON_UNESCAPED_UNICODE);
            $opts[CURLOPT_POSTFIELDS] = $jsonPayload;
            $headers[] = 'Content-Type: application/json';
        }
    } elseif ($method !== 'GET') {
        $opts[CURLOPT_CUSTOMREQUEST] = $method;
    }

    $opts[CURLOPT_HTTPHEADER] = $headers;
    curl_setopt_array($ch, $opts);

    $res = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($res === false) {
        return [$httpCode > 0 ? $httpCode : 502, ['error' => 'Сетевой сбой при обращении к Figma API: ' . $curlErr]];
    }

    $decoded = json_decode($res, true);
    if (!is_array($decoded)) {
        return [$httpCode > 0 ? $httpCode : 502, ['error' => 'Некорректный ответ от Figma API', 'raw' => mb_substr($res, 0, 500, 'UTF-8')]];
    }

    return [$httpCode, $decoded];
}

// -----------------------------------------------------------------------------
// 5. Маршрутизация действий
// -----------------------------------------------------------------------------

// Проверка токена / профиль пользователя
if ($action === 'me' || $action === 'validate' || $action === 'status') {
    list($status, $resp) = figma_api_request('me', $token);
    if ($status === 200) {
        figma_json_reply([
            'ok'      => true,
            'user'    => [
                'id'     => $resp['id'] ?? '',
                'handle' => $resp['handle'] ?? 'Figma User',
                'email'  => $resp['email'] ?? '',
                'avatar' => $resp['img_url'] ?? ''
            ],
            'message' => 'Figma токен действителен.'
        ]);
    }
    $errMsg = $resp['err'] ?? $resp['message'] ?? 'Неверный или отозванный Figma API токен.';
    figma_error($errMsg, $status >= 400 ? $status : 401);
}

// Получение структуры файла
if ($action === 'file') {
    $fileKey = trim((string)($inputData['file_key'] ?? ''));
    if ($fileKey === '') {
        figma_error('Параметр file_key обязателен для действия file.', 400);
    }
    // Санитизация ключа файла
    if (!preg_match('/^[a-zA-Z0-9_-]{15,64}$/', $fileKey)) {
        figma_error('Некорректный формат ключа файла Figma.', 400);
    }

    $nodeId = trim((string)($inputData['node_id'] ?? ''));
    $depth  = isset($inputData['depth']) ? (int)$inputData['depth'] : 0;

    $endpoint = 'files/' . urlencode($fileKey);
    $query = [];
    if ($nodeId !== '') {
        $query['ids'] = $nodeId;
    }
    if ($depth > 0) {
        $query['depth'] = $depth;
    }
    if (!empty($query)) {
        $endpoint .= '?' . http_build_query($query);
    }

    list($status, $resp) = figma_api_request($endpoint, $token);
    if ($status === 200 && is_array($resp)) {
        figma_json_reply([
            'ok'        => true,
            'name'      => $resp['name'] ?? 'Без названия',
            'version'   => $resp['version'] ?? '',
            'last_mod'  => $resp['lastModified'] ?? '',
            'thumbnail' => $resp['thumbnailUrl'] ?? '',
            'document'  => $resp['document'] ?? null,
            'nodes'     => $resp['nodes'] ?? null,
            'styles'    => $resp['styles'] ?? null
        ]);
    }

    $errMsg = $resp['err'] ?? $resp['message'] ?? 'Не удалось получить данные файла из Figma.';
    if ($status === 404) {
        $errMsg = 'Файл не найден в Figma. Проверьте правильность ссылки или убедитесь, что у вашего аккаунта есть доступ к файлу.';
    } elseif ($status === 403) {
        $errMsg = 'Доступ запрещён. Убедитесь, что токен имеет права на чтение файла.';
    }
    figma_error($errMsg, $status >= 400 ? $status : 502);
}

// Получение конкретных нод
if ($action === 'nodes') {
    $fileKey = trim((string)($inputData['file_key'] ?? ''));
    $ids     = trim((string)($inputData['ids'] ?? ''));
    if ($fileKey === '' || $ids === '') {
        figma_error('Параметры file_key и ids обязательны для действия nodes.', 400);
    }

    $endpoint = 'files/' . urlencode($fileKey) . '/nodes?ids=' . urlencode($ids);
    list($status, $resp) = figma_api_request($endpoint, $token);
    if ($status === 200 && is_array($resp)) {
        figma_json_reply([
            'ok'    => true,
            'name'  => $resp['name'] ?? '',
            'nodes' => $resp['nodes'] ?? []
        ]);
    }
    figma_error($resp['err'] ?? $resp['message'] ?? 'Ошибка получения нод Figma.', $status);
}

// Получение растровых/векторных рендеров нод (Figma Image API)
if ($action === 'images') {
    $fileKey = trim((string)($inputData['file_key'] ?? ''));
    $ids     = trim((string)($inputData['ids'] ?? ''));
    $format  = strtolower(trim((string)($inputData['format'] ?? 'png')));
    $scale   = isset($inputData['scale']) ? max(1, min(4, (float)$inputData['scale'])) : 2;

    if (!in_array($format, ['png', 'jpg', 'svg', 'pdf'], true)) {
        $format = 'png';
    }

    if ($fileKey === '' || $ids === '') {
        figma_error('Параметры file_key и ids обязательны для получения изображений.', 400);
    }

    $endpoint = 'images/' . urlencode($fileKey) . '?ids=' . urlencode($ids) . '&format=' . $format . '&scale=' . $scale;
    list($status, $resp) = figma_api_request($endpoint, $token);
    if ($status === 200 && is_array($resp) && isset($resp['images'])) {
        figma_json_reply([
            'ok'     => true,
            'images' => $resp['images']
        ]);
    }
    figma_error($resp['err'] ?? $resp['message'] ?? 'Не удалось сгенерировать изображения в Figma.', $status);
}

// Экспорт: публикация комментария к файлу Figma
if ($action === 'post_comment') {
    $fileKey = trim((string)($inputData['file_key'] ?? ''));
    $message = trim((string)($inputData['message'] ?? ''));

    if ($fileKey === '' || $message === '') {
        figma_error('Параметры file_key и message обязательны для публикации комментария.', 400);
    }

    $payload = ['message' => $message];
    if (isset($inputData['client_meta']) && is_array($inputData['client_meta'])) {
        $payload['client_meta'] = $inputData['client_meta'];
    }

    $endpoint = 'files/' . urlencode($fileKey) . '/comments';
    list($status, $resp) = figma_api_request($endpoint, $token, 'POST', $payload);
    if (($status === 200 || $status === 201) && is_array($resp)) {
        figma_json_reply([
            'ok'      => true,
            'comment' => $resp,
            'message' => 'Комментарий успешно добавлен в Figma!'
        ]);
    }
    figma_error($resp['err'] ?? $resp['message'] ?? 'Не удалось опубликовать комментарий в Figma.', $status);
}

// Экспорт: создание ссылки Dev Resource в файле Figma
if ($action === 'post_dev_resource') {
    $fileKey = trim((string)($inputData['file_key'] ?? ''));
    $name    = trim((string)($inputData['name'] ?? 'Афиша АВРОРА'));
    $url     = trim((string)($inputData['url'] ?? ''));
    $nodeId  = trim((string)($inputData['node_id'] ?? ''));

    if ($fileKey === '' || $url === '') {
        figma_error('Параметры file_key и url обязательны для добавления Dev Resource.', 400);
    }

    $payload = [
        'name'     => $name,
        'url'      => $url,
        'file_key' => $fileKey
    ];
    if ($nodeId !== '') {
        $payload['node_id'] = $nodeId;
    }

    $endpoint = 'dev_resources';
    list($status, $resp) = figma_api_request($endpoint, $token, 'POST', $payload);
    if (($status === 200 || $status === 201) && is_array($resp)) {
        figma_json_reply([
            'ok'       => true,
            'resource' => $resp,
            'message'  => 'Dev Resource успешно прикреплён к Figma!'
        ]);
    }
    figma_error($resp['err'] ?? $resp['message'] ?? 'Не удалось зарегистрировать Dev Resource в Figma.', $status);
}

figma_error('Неизвестное действие: ' . htmlspecialchars($action) . '. Допустимые: validate, file, nodes, images, image_proxy, post_comment, post_dev_resource.', 400);

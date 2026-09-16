<?php
/**
 * AURORA - Синхронизация и автоматическая загрузка стикеров Космо в Сообщество ВКонтакте
 * Загружает все мини-стикеры из assets/images/mascot_vk/ на серверы ВКонтакте
 * и сохраняет актуальную карту attachment ID в cache/vk_mascot_stickers.json
 */

$root = dirname(__DIR__);
$configPath = $root . '/api/config.php';
if (!file_exists($configPath)) {
    die("Error: config.php not found at {$configPath}\n");
}

$config = require $configPath;
$token = $config['vk_community_token'] ?? '';
if (!$token) {
    die("Error: vk_community_token is empty in config.php\n");
}

$mascotVkDir = $root . '/assets/images/mascot_vk';
$cacheDir = $root . '/cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}

$stickersCacheFile = $cacheDir . '/vk_mascot_stickers.json';
$stickersMap = [];
if (file_exists($stickersCacheFile)) {
    $existing = json_decode(@file_get_contents($stickersCacheFile), true);
    if (is_array($existing)) {
        $stickersMap = $existing;
    }
}

// Известные рабочие стикеры первой и второй волны
$defaultKnown = [
    'smile'    => 'photo-241534292_457239033',
    'tired'    => 'photo-241534292_457239034',
    'yawn'     => 'photo-241534292_457239035',
    'idle'     => 'photo-241534292_457239036',
    'sleep'    => 'photo-241534292_457239037',
    'thinking' => 'photo-241534292_457239038',
    'angry'    => 'photo-241534292_457239039'
];

foreach ($defaultKnown as $k => $v) {
    if (empty($stickersMap[$k])) {
        $stickersMap[$k] = $v;
    }
}

$files = glob($mascotVkDir . '/robot_*.png');
if (!$files) {
    die("No sticker files found in {$mascotVkDir}\n");
}

echo "=== Синхронизация стикеров Космо с сообществом ВКонтакте ===\n";
echo "Каталог стикеров: {$mascotVkDir}\n";
echo "Всего файлов: " . count($files) . "\n\n";

$uploadedCount = 0;

foreach ($files as $file) {
    $baseName = basename($file, '.png');
    $emo = preg_replace('/^robot_/', '', $baseName);

    // Если стикер уже загружен и имеет валидный ID фото группы 241534292 — пропускаем
    if (!empty($stickersMap[$emo]) && strpos($stickersMap[$emo], 'photo-241534292_') === 0) {
        echo "✓ [{$emo}]: уже в сообществе -> {$stickersMap[$emo]}\n";
        continue;
    }

    echo "⏳ Загрузка в сообщество [{$emo}] ({$baseName}.png)... ";

    // 1. Получаем upload_url через photos.getMessagesUploadServer
    $serverUrl = "https://api.vk.com/method/photos.getMessagesUploadServer?v=5.131&access_token=" . urlencode($token);
    $ch = curl_init($serverUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15
    ]);
    $srvRaw = curl_exec($ch);
    curl_close($ch);
    $srvJson = json_decode($srvRaw, true);

    $uploadUrl = $srvJson['response']['upload_url'] ?? '';
    if (!$uploadUrl) {
        echo "ОШИБКА: не удалось получить upload_url: {$srvRaw}\n";
        continue;
    }

    // 2. Отправляем файл на upload_url
    $cFile = new CURLFile(realpath($file), 'image/png', basename($file));
    $ch = curl_init($uploadUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => ['photo' => $cFile],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30
    ]);
    $upRaw = curl_exec($ch);
    curl_close($ch);
    $upJson = json_decode($upRaw, true);

    if (empty($upJson['photo']) || empty($upJson['server']) || empty($upJson['hash'])) {
        echo "ОШИБКА загрузки файла: {$upRaw}\n";
        continue;
    }

    // 3. Сохраняем фото в сообщения сообщества через photos.saveMessagesPhoto
    $saveUrl = "https://api.vk.com/method/photos.saveMessagesPhoto";
    $saveData = [
        'photo'        => $upJson['photo'],
        'server'       => $upJson['server'],
        'hash'         => $upJson['hash'],
        'v'            => '5.131',
        'access_token' => $token
    ];
    $ch = curl_init($saveUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($saveData),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20
    ]);
    $saveRaw = curl_exec($ch);
    curl_close($ch);
    $saveJson = json_decode($saveRaw, true);

    $savedPhoto = $saveJson['response'][0] ?? null;
    if ($savedPhoto && isset($savedPhoto['owner_id'], $savedPhoto['id'])) {
        $attId = 'photo' . $savedPhoto['owner_id'] . '_' . $savedPhoto['id'];
        $stickersMap[$emo] = $attId;
        $uploadedCount++;
        echo "УСПЕХ -> {$attId}\n";
        
        // Сразу сохраняем прогресс в кэш
        file_put_contents($stickersCacheFile, json_encode($stickersMap, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    } else {
        echo "ОШИБКА сохранения: {$saveRaw}\n";
    }

    // Задержка между загрузками для VK API
    usleep(800000); // 800ms
}

// Итоговое сохранение кэша
file_put_contents($stickersCacheFile, json_encode($stickersMap, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo "\n=== Синхронизация завершена ===\n";
echo "Новых загружено: {$uploadedCount}\n";
echo "Всего стикеров в сообществе: " . count($stickersMap) . "\n";
echo "Кэш записан в: {$stickersCacheFile}\n\n";

echo "Актуальная карта стикеров:\n";
print_r($stickersMap);

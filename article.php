<?php
/**
 * AURORA Cosmos — Читатель статей робота Космо
 * Централизованная библиотечная система г. Владимира (biblioteka33.ru)
 * Срок хранения статей: 12 часов с момента публикации
 */

// Базовые настройки безопасности
if (!headers_sent()) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
}

$articleId = isset($_GET['id']) ? preg_replace('/[^a-zA-Z0-9_]/', '', (string)$_GET['id']) : '';
$cacheDir = __DIR__ . '/cache/articles';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0777, true);
}

// Фоновая очистка устаревших статей (> 12 часов)
if (mt_rand(1, 10) === 1) {
    $files = @glob($cacheDir . '/*.json');
    if ($files) {
        $now = time();
        foreach ($files as $f) {
            $fdata = @json_decode(@file_get_contents($f), true);
            if (is_array($fdata) && isset($fdata['expires_at']) && $now > (int)$fdata['expires_at']) {
                @unlink($f);
            }
        }
    }
}

$articleData = null;
$isExpired = false;
$notFound = false;

if ($articleId === '') {
    $notFound = true;
} else {
    $filePath = $cacheDir . '/' . $articleId . '.json';
    if (!file_exists($filePath)) {
        $notFound = true;
    } else {
        $rawJson = @file_get_contents($filePath);
        $articleData = @json_decode($rawJson, true);
        if (!is_array($articleData)) {
            $notFound = true;
        } else {
            $expiresAt = (int)($articleData['expires_at'] ?? 0);
            if (time() > $expiresAt) {
                $isExpired = true;
                @unlink($filePath);
            } else {
                // Инкремент счётчика просмотров
                $articleData['views'] = ((int)($articleData['views'] ?? 0)) + 1;
                $fh = @fopen($filePath, 'c+');
                if ($fh) {
                    if (@flock($fh, LOCK_EX)) {
                        ftruncate($fh, 0);
                        rewind($fh);
                        fwrite($fh, json_encode($articleData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                        fflush($fh);
                        @flock($fh, LOCK_UN);
                    }
                    fclose($fh);
                }
            }
        }
    }
}

// Данные для вывода
$art = $articleData['article'] ?? [];
$pageTitle = !empty($art['title']) ? htmlspecialchars($art['title']) : 'Статья от робота Космо';
$pageSubtitle = !empty($art['subtitle']) ? htmlspecialchars($art['subtitle']) : '';
$pageLead = !empty($art['lead']) ? htmlspecialchars($art['lead']) : '';
$category = !empty($art['category']) ? htmlspecialchars($art['category']) : 'Литература и чтение';
$readingTime = !empty($art['reading_time_min']) ? (int)$art['reading_time_min'] : 5;
$tags = isset($art['tags']) && is_array($art['tags']) ? $art['tags'] : ['Литература', 'Книги', 'Космо'];
$sections = isset($art['sections']) && is_array($art['sections']) ? $art['sections'] : [];
$curiousFacts = isset($art['curious_facts']) && is_array($art['curious_facts']) ? $art['curious_facts'] : [];
$libraryRec = !empty($art['library_recommendation']) ? $art['library_recommendation'] : '';
$conclusion = !empty($art['conclusion']) ? $art['conclusion'] : '';
$createdAt = (int)($articleData['created_at'] ?? time());
$expiresAt = (int)($articleData['expires_at'] ?? (time() + 43200));
$viewsCount = (int)($articleData['views'] ?? 1);
$currentUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'biblioteka33.ru') . ($_SERVER['REQUEST_URI'] ?? '');
?>
<!DOCTYPE html>
<html lang="ru" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $pageTitle ?> — Робот Космо (Библиотека 33)</title>
    <meta name="description" content="<?= htmlspecialchars(mb_substr($pageLead !== '' ? $pageLead : $pageSubtitle, 0, 160)) ?>">
    <meta name="robots" content="noindex, follow">

    <!-- OpenGraph -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="<?= $pageTitle ?>">
    <meta property="og:description" content="<?= htmlspecialchars(mb_substr($pageLead !== '' ? $pageLead : $pageSubtitle, 0, 200)) ?>">
    <meta property="og:url" content="<?= htmlspecialchars($currentUrl) ?>">
    <meta property="og:site_name" content="Централизованная библиотечная система г. Владимира">
    <meta property="og:image" content="https://biblioteka33.ru/stat/assets/images/mascot/robot_smile.png">

    <!-- Google Fonts: Montserrat & Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />

    <style>
        :root {
            --bg-base: #0a0e1a;
            --bg-surface: rgba(18, 26, 44, 0.75);
            --bg-card: rgba(26, 37, 64, 0.65);
            --border-glass: rgba(255, 255, 255, 0.1);
            --border-accent: rgba(99, 102, 241, 0.35);
            --text-main: #f1f5f9;
            --text-muted: #94a3b8;
            --text-heading: #ffffff;
            --primary: #6366f1;
            --primary-glow: rgba(99, 102, 241, 0.35);
            --accent: #38bdf8;
            --accent-glow: rgba(56, 189, 248, 0.3);
            --amber: #f59e0b;
            --radius-lg: 20px;
            --radius-md: 14px;
            --radius-sm: 8px;
            --shadow-card: 0 16px 40px rgba(0, 0, 0, 0.35);
        }

        [data-theme="light"] {
            --bg-base: #f4f6fb;
            --bg-surface: rgba(255, 255, 255, 0.85);
            --bg-card: rgba(255, 255, 255, 0.95);
            --border-glass: rgba(0, 0, 0, 0.08);
            --border-accent: rgba(99, 102, 241, 0.25);
            --text-main: #1e293b;
            --text-muted: #64748b;
            --text-heading: #0f172a;
            --primary: #4f46e5;
            --primary-glow: rgba(79, 70, 229, 0.15);
            --accent: #0284c7;
            --accent-glow: rgba(2, 132, 199, 0.12);
            --amber: #d97706;
            --shadow-card: 0 16px 36px rgba(15, 23, 42, 0.08);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-base);
            color: var(--text-main);
            min-height: 100vh;
            line-height: 1.7;
            overflow-x: hidden;
            transition: background-color 0.3s ease, color 0.3s ease;
            position: relative;
        }

        /* Фоновые градиентные сферы AURORA */
        .aurora-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
        }
        .aurora-blob {
            position: absolute;
            filter: blur(100px);
            opacity: 0.45;
            border-radius: 50%;
            animation: floatBlob 24s infinite alternate ease-in-out;
        }
        .blob-1 {
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, #4f46e5 0%, transparent 70%);
            top: -150px;
            left: -100px;
        }
        .blob-2 {
            width: 550px;
            height: 550px;
            background: radial-gradient(circle, #0284c7 0%, transparent 70%);
            bottom: -150px;
            right: -100px;
            animation-duration: 28s;
        }
        .blob-3 {
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.25;
        }

        @keyframes floatBlob {
            0% { transform: translate(0, 0) scale(1); }
            100% { transform: translate(60px, 40px) scale(1.1); }
        }

        /* Навигационная шапка */
        .site-header {
            position: sticky;
            top: 0;
            z-index: 100;
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            background: var(--bg-surface);
            border-bottom: 1px solid var(--border-glass);
            padding: 14px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .header-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: var(--text-heading);
        }
        .brand-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px var(--primary-glow);
            overflow: hidden;
            flex-shrink: 0;
        }
        .brand-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .brand-text h1 {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.05rem;
            font-weight: 700;
            line-height: 1.2;
            letter-spacing: -0.01em;
        }
        .brand-text p {
            font-size: 0.76rem;
            color: var(--text-muted);
        }
        .header-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .header-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            border-radius: var(--radius-sm);
            font-size: 0.85rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            border: 1px solid var(--border-glass);
            background: var(--bg-card);
            color: var(--text-main);
            transition: all 0.2s ease;
        }
        .header-btn:hover {
            border-color: var(--primary);
            background: var(--primary-glow);
            color: var(--text-heading);
            transform: translateY(-1px);
        }

        /* Контейнер страницы */
        .page-container {
            position: relative;
            z-index: 10;
            max-width: 860px;
            margin: 0 auto;
            padding: 24px 20px 80px 20px;
        }

        /* Таймер-плашка 12 часов */
        .expiry-banner {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(99, 102, 241, 0.12));
            border: 1px solid rgba(245, 158, 11, 0.35);
            border-radius: var(--radius-md);
            padding: 14px 20px;
            margin-bottom: 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }
        .banner-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .banner-icon {
            font-size: 1.7rem;
            color: var(--amber);
        }
        .banner-text {
            font-size: 0.88rem;
            color: var(--text-main);
        }
        .banner-text strong {
            color: var(--text-heading);
        }
        .timer-badge {
            background: rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(245, 158, 11, 0.4);
            color: #fbbf24;
            font-family: 'Montserrat', monospace;
            font-size: 1.05rem;
            font-weight: 800;
            padding: 6px 14px;
            border-radius: var(--radius-sm);
            letter-spacing: 0.06em;
            white-space: nowrap;
            box-shadow: 0 0 15px rgba(245, 158, 11, 0.2);
        }
        [data-theme="light"] .timer-badge {
            background: rgba(245, 158, 11, 0.15);
            color: #b45309;
        }

        /* Карточка статьи */
        .article-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-lg);
            padding: 44px 48px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: var(--shadow-card);
        }

        /* Заголовок статьи */
        .article-meta-top {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
        }
        .badge-category {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            color: #ffffff;
            font-size: 0.78rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 5px 12px;
            border-radius: 20px;
            box-shadow: 0 2px 8px var(--primary-glow);
        }
        .badge-readtime, .badge-views {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.82rem;
            color: var(--text-muted);
            background: var(--bg-card);
            border: 1px solid var(--border-glass);
            padding: 4px 10px;
            border-radius: 20px;
        }
        .article-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 2.25rem;
            font-weight: 800;
            line-height: 1.25;
            color: var(--text-heading);
            margin-bottom: 16px;
            letter-spacing: -0.02em;
        }
        .article-subtitle {
            font-size: 1.18rem;
            color: var(--text-muted);
            font-weight: 500;
            line-height: 1.55;
            margin-bottom: 28px;
            padding-bottom: 24px;
            border-bottom: 1px solid var(--border-glass);
        }

        /* Авторская плашка Космо */
        .author-box {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 34px;
            padding: 12px 18px;
            background: var(--bg-card);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-md);
        }
        .author-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4f46e5, #06b6d4);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.2);
            flex-shrink: 0;
        }
        .author-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .author-info h3 {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--text-heading);
            margin-bottom: 2px;
        }
        .author-info p {
            font-size: 0.8rem;
            color: var(--text-muted);
        }

        /* Лид статьи */
        .article-lead {
            font-size: 1.15rem;
            line-height: 1.8;
            color: var(--text-main);
            font-weight: 500;
            margin-bottom: 34px;
            background: rgba(99, 102, 241, 0.05);
            border-left: 4px solid var(--primary);
            padding: 18px 22px;
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        }

        /* Текстовые разделы */
        .article-content {
            font-size: 1.05rem;
            color: var(--text-main);
            margin-bottom: 40px;
        }
        .article-section {
            margin-bottom: 36px;
        }
        .section-heading {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.45rem;
            font-weight: 700;
            color: var(--text-heading);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            letter-spacing: -0.01em;
        }
        .section-heading::before {
            content: '';
            display: inline-block;
            width: 8px;
            height: 24px;
            background: linear-gradient(to bottom, var(--primary), var(--accent));
            border-radius: 4px;
        }
        .section-text {
            margin-bottom: 16px;
            line-height: 1.85;
            white-space: pre-line;
        }

        /* Цитаты */
        .article-quote {
            position: relative;
            background: var(--bg-card);
            border-left: 4px solid var(--accent);
            border-radius: 0 var(--radius-md) var(--radius-md) 0;
            padding: 20px 24px 20px 28px;
            margin: 24px 0;
            font-style: italic;
            font-size: 1.08rem;
            line-height: 1.7;
            color: var(--text-heading);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }
        .article-quote::before {
            content: '«';
            font-size: 2.8rem;
            position: absolute;
            top: 4px;
            left: 8px;
            opacity: 0.15;
            font-family: serif;
            color: var(--accent);
        }

        /* Списки */
        .article-list {
            list-style: none;
            margin: 18px 0;
            padding: 0;
        }
        .article-list li {
            position: relative;
            padding-left: 28px;
            margin-bottom: 10px;
            line-height: 1.7;
        }
        .article-list li::before {
            content: '✦';
            position: absolute;
            left: 6px;
            top: 0;
            color: var(--accent);
            font-size: 1rem;
        }

        /* Блок интересных фактов */
        .facts-card {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(56, 189, 248, 0.08));
            border: 1px solid var(--border-accent);
            border-radius: var(--radius-md);
            padding: 26px 30px;
            margin: 36px 0;
        }
        .facts-card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 18px;
        }
        .facts-card-header h3 {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-heading);
        }
        .facts-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
        }
        .fact-item {
            background: var(--bg-card);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-sm);
            padding: 14px 18px;
            font-size: 0.96rem;
            line-height: 1.65;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }
        .fact-icon {
            color: var(--amber);
            font-size: 1.3rem;
            flex-shrink: 0;
            margin-top: 2px;
        }

        /* Блок фондов библиотек */
        .library-card {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(56, 189, 248, 0.08));
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: var(--radius-md);
            padding: 24px 28px;
            margin: 36px 0;
            display: flex;
            align-items: flex-start;
            gap: 18px;
        }
        .library-icon {
            font-size: 2.2rem;
            color: #10b981;
            flex-shrink: 0;
        }
        .library-info h4 {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.15rem;
            font-weight: 700;
            color: var(--text-heading);
            margin-bottom: 6px;
        }
        .library-info p {
            font-size: 0.96rem;
            line-height: 1.65;
            color: var(--text-main);
        }

        /* Заключение */
        .article-conclusion {
            background: var(--bg-card);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-md);
            padding: 24px 28px;
            margin: 36px 0;
        }
        .article-conclusion h4 {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.15rem;
            font-weight: 700;
            color: var(--text-heading);
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Теги статьи */
        .article-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 30px 0 20px 0;
            padding-top: 24px;
            border-top: 1px solid var(--border-glass);
        }
        .article-tag {
            font-size: 0.8rem;
            color: var(--text-muted);
            background: var(--bg-card);
            border: 1px solid var(--border-glass);
            padding: 4px 10px;
            border-radius: 6px;
        }

        /* Панель шеринга и действий */
        .article-actions-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 36px;
            padding-top: 24px;
            border-top: 1px solid var(--border-glass);
        }
        .action-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            border-radius: var(--radius-sm);
            font-size: 0.92rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            border: 1px solid var(--border-glass);
            background: var(--bg-card);
            color: var(--text-heading);
            transition: all 0.2s ease;
        }
        .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }
        .btn-primary {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            border-color: transparent;
            color: #ffffff !important;
            box-shadow: 0 4px 16px var(--primary-glow);
        }
        .btn-vk {
            background: #2787f5;
            border-color: transparent;
            color: #ffffff !important;
        }

        /* Экран 404 / 410 (Истекла или не найдена) */
        .error-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-lg);
            padding: 60px 40px;
            text-align: center;
            max-width: 650px;
            margin: 60px auto;
            backdrop-filter: blur(20px);
            box-shadow: var(--shadow-card);
        }
        .error-icon {
            width: 90px;
            height: 90px;
            margin: 0 auto 24px auto;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(99, 102, 241, 0.2));
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            color: var(--amber);
        }
        .error-card h2 {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.7rem;
            font-weight: 800;
            color: var(--text-heading);
            margin-bottom: 12px;
        }
        .error-card p {
            color: var(--text-muted);
            font-size: 1.05rem;
            line-height: 1.7;
            margin-bottom: 28px;
        }

        /* Всплывающий тост */
        .toast-notify {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: #10b981;
            color: #ffffff;
            font-weight: 600;
            padding: 12px 24px;
            border-radius: 30px;
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
            z-index: 1000;
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .toast-notify.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }

        /* Адаптивность для смартфонов */
        @media (max-width: 640px) {
            .page-container {
                padding: 16px 12px 60px 12px;
            }
            .article-card {
                padding: 24px 20px;
            }
            .article-title {
                font-size: 1.65rem;
            }
            .article-subtitle {
                font-size: 1.02rem;
            }
            .expiry-banner {
                flex-direction: column;
                align-items: flex-start;
                padding: 12px 16px;
            }
            .timer-badge {
                align-self: flex-start;
            }
            .article-actions-bar {
                flex-direction: column;
            }
            .action-btn {
                width: 100%;
                justify-content: center;
            }
        }
    </style>
</head>
<body>

    <!-- Фоновые градиенты AURORA -->
    <div class="aurora-bg">
        <div class="aurora-blob blob-1"></div>
        <div class="aurora-blob blob-2"></div>
        <div class="aurora-blob blob-3"></div>
    </div>

    <!-- Шапка страницы -->
    <header class="site-header">
        <a href="https://biblioteka33.ru/stat/" class="header-brand" title="На главную страницу статистики">
            <div class="brand-avatar">
                <img src="assets/images/mascot/robot_smile.png" alt="Робот Космо">
            </div>
            <div class="brand-text">
                <h1>Робот Космо 🤖📚</h1>
                <p>Библиотеки Владимира • biblioteka33.ru</p>
            </div>
        </a>
        <div class="header-actions">
            <button type="button" class="header-btn" id="themeToggleBtn" title="Переключить тему">
                <span class="material-symbols-outlined" id="themeIcon">light_mode</span>
            </button>
            <a href="https://biblioteka33.ru/stat/" class="header-btn" title="Перейти к статистике">
                <span class="material-symbols-outlined">analytics</span>
                <span class="btn-text">Статистика</span>
            </a>
        </div>
    </header>

    <div class="page-container">

        <?php if ($notFound): ?>
            <!-- Ошибка: статья не найдена -->
            <div class="error-card">
                <div class="error-icon">🔍</div>
                <h2>Статья не найдена</h2>
                <p>Возможно, ссылка указана с ошибкой или статья была перемещена. Напишите роботу Космо в чате ВКонтакте, и он подготовит для вас новую познавательную статью!</p>
                <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
                    <a href="https://vk.com/im?sel=-241534292" class="action-btn btn-primary" target="_blank" rel="noopener">
                        <span class="material-symbols-outlined">smart_toy</span>
                        Написать Космо в ВК
                    </a>
                    <a href="https://biblioteka33.ru/stat/" class="action-btn">
                        На главную
                    </a>
                </div>
            </div>

        <?php elseif ($isExpired): ?>
            <!-- Ошибка: срок хранения 12 часов истёк -->
            <div class="error-card">
                <div class="error-icon">⏳</div>
                <h2>Срок хранения статьи истёк</h2>
                <p>Статьи робота Космо генерируются по запросу читателей и бережно хранятся ровно <strong>12 часов</strong>, после чего отправляются в электронный архив. Вы можете в любой момент сгенерировать новую свежую статью в нашем сообществе!</p>
                <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
                    <a href="https://vk.com/im?sel=-241534292" class="action-btn btn-primary" target="_blank" rel="noopener">
                        <span class="material-symbols-outlined">edit_document</span>
                        Заказать новую статью у Космо
                    </a>
                    <a href="https://biblioteka33.ru/" class="action-btn" target="_blank" rel="noopener">
                        Сайт библиотек Владимира
                    </a>
                </div>
            </div>

        <?php else: ?>
            <!-- Плашка обратного отсчёта 12 часов -->
            <div class="expiry-banner" id="expiryBanner">
                <div class="banner-left">
                    <span class="material-symbols-outlined banner-icon">hourglass_top</span>
                    <div class="banner-text">
                        <strong>Статья сгенерирована роботом Космо и хранится 12 часов!</strong>
                        <div>Ознакомьтесь с материалом или сохраните выдержки себе на память.</div>
                    </div>
                </div>
                <div class="timer-badge" id="countdownBadge" data-expires="<?= $expiresAt ?>">
                    --:--:--
                </div>
            </div>

            <!-- Основная карточка статьи -->
            <article class="article-card">
                <div class="article-meta-top">
                    <span class="badge-category"><?= $category ?></span>
                    <span class="badge-readtime">
                        <span class="material-symbols-outlined" style="font-size:16px;">schedule</span>
                        ~<?= $readingTime ?> мин. чтения
                    </span>
                    <span class="badge-views">
                        <span class="material-symbols-outlined" style="font-size:16px;">visibility</span>
                        <?= $viewsCount ?>
                    </span>
                </div>

                <h1 class="article-title"><?= $pageTitle ?></h1>

                <?php if ($pageSubtitle !== ''): ?>
                    <div class="article-subtitle"><?= $pageSubtitle ?></div>
                <?php endif; ?>

                <!-- Автор статьи -->
                <div class="author-box">
                    <div class="author-avatar">
                        <img src="assets/images/mascot/robot_smile.png" alt="Космо">
                    </div>
                    <div class="author-info">
                        <h3>Робот Космо 🤖</h3>
                        <p>Библиограф и литературный эксперт ЦБС г. Владимира • <?= date('d.m.Y H:i', $createdAt) ?> МСК</p>
                    </div>
                </div>

                <!-- Вводный лид -->
                <?php if ($pageLead !== ''): ?>
                    <div class="article-lead"><?= $pageLead ?></div>
                <?php endif; ?>

                <!-- Основной контент статьи по разделам -->
                <div class="article-content">
                    <?php foreach ($sections as $sec): ?>
                        <section class="article-section">
                            <?php if (!empty($sec['heading'])): ?>
                                <h2 class="section-heading"><?= htmlspecialchars($sec['heading']) ?></h2>
                            <?php endif; ?>

                            <?php if (!empty($sec['content'])): ?>
                                <div class="section-text"><?= htmlspecialchars($sec['content']) ?></div>
                            <?php endif; ?>

                            <?php if (!empty($sec['quote'])): ?>
                                <div class="article-quote">
                                    <?= htmlspecialchars($sec['quote']) ?>
                                </div>
                            <?php endif; ?>

                            <?php if (!empty($sec['list']) && is_array($sec['list'])): ?>
                                <ul class="article-list">
                                    <?php foreach ($sec['list'] as $item): ?>
                                        <li><?= htmlspecialchars($item) ?></li>
                                    <?php endforeach; ?>
                                </ul>
                            <?php endif; ?>
                        </section>
                    <?php endforeach; ?>
                </div>

                <!-- Блок интересных фактов -->
                <?php if (!empty($curiousFacts)): ?>
                    <div class="facts-card">
                        <div class="facts-card-header">
                            <span class="material-symbols-outlined" style="color:var(--amber); font-size:26px;">lightbulb</span>
                            <h3>Любопытные факты от библиографа</h3>
                        </div>
                        <div class="facts-grid">
                            <?php foreach ($curiousFacts as $fact): ?>
                                <div class="fact-item">
                                    <span class="material-symbols-outlined fact-icon">star</span>
                                    <div><?= htmlspecialchars($fact) ?></div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endif; ?>

                <!-- Рекомендация фонда библиотек Владимира -->
                <?php if ($libraryRec !== ''): ?>
                    <div class="library-card">
                        <span class="material-symbols-outlined library-icon">menu_book</span>
                        <div class="library-info">
                            <h4>Книжные фонды библиотек г. Владимира</h4>
                            <p><?= htmlspecialchars($libraryRec) ?></p>
                        </div>
                    </div>
                <?php endif; ?>

                <!-- Заключение -->
                <?php if ($conclusion !== ''): ?>
                    <div class="article-conclusion">
                        <h4>
                            <span class="material-symbols-outlined" style="color:var(--primary)">auto_awesome</span>
                            Резюме от Космо
                        </h4>
                        <p style="line-height:1.75;"><?= htmlspecialchars($conclusion) ?></p>
                    </div>
                <?php endif; ?>

                <!-- Теги статьи -->
                <?php if (!empty($tags)): ?>
                    <div class="article-tags">
                        <?php foreach ($tags as $tag): ?>
                            <span class="article-tag">#<?= htmlspecialchars($tag) ?></span>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>

                <!-- Панель действий -->
                <div class="article-actions-bar">
                    <button type="button" class="action-btn btn-primary" id="copyLinkBtn">
                        <span class="material-symbols-outlined">content_copy</span>
                        Скопировать ссылку
                    </button>
                    <a href="https://vk.com/share.php?url=<?= urlencode($currentUrl) ?>&title=<?= urlencode($pageTitle) ?>" target="_blank" rel="noopener" class="action-btn btn-vk">
                        <span class="material-symbols-outlined">share</span>
                        Поделиться ВКонтакте
                    </a>
                    <a href="https://vk.com/im?sel=-241534292" target="_blank" rel="noopener" class="action-btn">
                        <span class="material-symbols-outlined">chat</span>
                        Спросить Космо в ВК
                    </a>
                </div>
            </article>
        <?php endif; ?>

    </div>

    <!-- Всплывающий тост -->
    <div class="toast-notify" id="toastNotify">Ссылка успешно скопирована в буфер!</div>

    <script>
    (function() {
        // 1. Переключение Тёмная / Светлая тема
        var themeToggleBtn = document.getElementById('themeToggleBtn');
        var themeIcon = document.getElementById('themeIcon');
        var rootHtml = document.documentElement;

        function applyTheme(t) {
            rootHtml.setAttribute('data-theme', t);
            localStorage.setItem('aurora_theme', t);
            if (themeIcon) {
                themeIcon.textContent = t === 'dark' ? 'light_mode' : 'dark_mode';
            }
        }

        var savedTheme = localStorage.getItem('aurora_theme') || 'dark';
        applyTheme(savedTheme);

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', function() {
                var cur = rootHtml.getAttribute('data-theme') || 'dark';
                var next = cur === 'dark' ? 'light' : 'dark';
                applyTheme(next);
            });
        }

        // 2. Таймер обратного отсчёта 12 часов
        var countdownBadge = document.getElementById('countdownBadge');
        if (countdownBadge) {
            var expiresTs = parseInt(countdownBadge.getAttribute('data-expires'), 10) || 0;
            function updateTimer() {
                var nowTs = Math.floor(Date.now() / 1000);
                var diff = expiresTs - nowTs;
                if (diff <= 0) {
                    countdownBadge.textContent = '00:00:00 (Архив)';
                    countdownBadge.style.color = '#ef4444';
                    return;
                }
                var hours = Math.floor(diff / 3600);
                var mins = Math.floor((diff % 3600) / 60);
                var secs = diff % 60;
                var hStr = hours < 10 ? '0' + hours : '' + hours;
                var mStr = mins < 10 ? '0' + mins : '' + mins;
                var sStr = secs < 10 ? '0' + secs : '' + secs;
                countdownBadge.textContent = hStr + ':' + mStr + ':' + sStr;
            }
            updateTimer();
            setInterval(updateTimer, 1000);
        }

        // 3. Копирование ссылки
        var copyBtn = document.getElementById('copyLinkBtn');
        var toast = document.getElementById('toastNotify');
        if (copyBtn) {
            copyBtn.addEventListener('click', function() {
                var url = window.location.href;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(url).then(showToast).catch(fallbackCopy);
                } else {
                    fallbackCopy();
                }
            });
        }

        function fallbackCopy() {
            var input = document.createElement('input');
            input.value = window.location.href;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            showToast();
        }

        function showToast() {
            if (!toast) return;
            toast.classList.add('show');
            setTimeout(function() {
                toast.classList.remove('show');
            }, 3000);
        }
    })();
    </script>
</body>
</html>

<?php
/**
 * Aurora Cloud 24H — Страница просмотра загруженного сайта с верхней панелью управления
 */

require_once __DIR__ . '/../api/cloud-common.php';

cloud_cleanup_expired();

$id = trim($_GET['id'] ?? '');
$id = preg_replace('/[^a-zA-Z0-9_\-]/', '', $id);

$storageDir = cloud_get_storage_dir();
$itemDir = $storageDir . '/' . $id;
$metaFile = $itemDir . '/meta.json';

$isExpired = false;
$meta = null;

if (!$id || !file_exists($metaFile)) {
    $isExpired = true;
} else {
    $raw = file_get_contents($metaFile);
    $meta = $raw ? json_decode($raw, true) : null;
    $now = time();
    if (!$meta || empty($meta['expires_at']) || $now >= (int)$meta['expires_at']) {
        $isExpired = true;
        cloud_rrmdir($itemDir);
    }
}

$title = $meta['title'] ?? 'Сайт в Аврора Облаке';
$filename = $meta['filename'] ?? 'site.zip';
$filesizeFormatted = $meta['filesize_formatted'] ?? '';
$expiresAt = (int)($meta['expires_at'] ?? (time() + 86400));
$remainingSec = max(0, $expiresAt - time());
$downloadUrl = '../api/cloud-download.php?id=' . urlencode($id);
$previewUrl = '../api/cloud-preview.php?id=' . urlencode($id);
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= htmlspecialchars($title) ?> — Аврора Облако (24H)</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" />
<style>
  :root {
    --bg-dark: #080c14;
    --bg-panel: rgba(15, 23, 42, 0.95);
    --border-color: rgba(255, 255, 255, 0.1);
    --primary-cyan: #22d3ee;
    --primary-purple: #c084fc;
    --accent-emerald: #4ade80;
    --text-primary: #f8fafc;
    --text-muted: #94a3b8;
    --bar-height: 54px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--bg-dark);
    color: var(--text-primary);
    font-family: 'Montserrat', sans-serif;
  }

  /* ── Верхняя панель Аврора ── */
  .aurora-topbar {
    height: var(--bar-height);
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    gap: 12px;
    backdrop-filter: blur(20px);
    z-index: 1000;
    position: relative;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }

  .bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .brand-link {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: var(--text-primary);
    font-weight: 800;
    font-size: 14px;
    letter-spacing: -0.02em;
    flex-shrink: 0;
  }

  .brand-logo-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--primary-cyan), var(--primary-purple));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #020617;
    font-size: 16px;
    box-shadow: 0 0 12px rgba(34, 211, 238, 0.4);
  }

  .brand-text span {
    background: linear-gradient(135deg, var(--primary-cyan), var(--primary-purple));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .divider {
    width: 1px;
    height: 20px;
    background: var(--border-color);
    flex-shrink: 0;
  }

  .file-badge-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .file-title {
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #e2e8f0;
    max-width: 240px;
  }

  .file-size {
    font-size: 11px;
    color: var(--text-muted);
    font-family: 'JetBrains Mono', monospace;
    flex-shrink: 0;
  }

  /* ── Центр: Таймер ── */
  .bar-center {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .timer-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 5px 14px;
    border-radius: 20px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    color: var(--primary-cyan);
    box-shadow: 0 0 16px rgba(34, 211, 238, 0.15);
  }

  .timer-pill .material-symbols-rounded {
    font-size: 18px;
    color: var(--primary-cyan);
    animation: pulseIcon 2s ease-in-out infinite;
  }

  @keyframes pulseIcon {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.9); }
  }

  /* ── Правые действия ── */
  .bar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .btn-bar {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s ease;
  }

  .btn-bar-download {
    background: linear-gradient(135deg, var(--primary-cyan), #3b82f6);
    color: #020617;
    box-shadow: 0 0 14px rgba(34, 211, 238, 0.3);
  }

  .btn-bar-download:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 20px rgba(34, 211, 238, 0.5);
  }

  .btn-bar-ghost {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
    border-color: var(--border-color);
  }

  .btn-bar-ghost:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  /* ── Фрейм сайта ── */
  .preview-frame-container {
    width: 100%;
    height: calc(100vh - var(--bar-height));
    position: relative;
    background: #000;
  }

  iframe {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
  }

  /* ── Модальное окно QR-кода ── */
  .qr-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.8);
    backdrop-filter: blur(8px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
  }

  .qr-modal-backdrop.is-open {
    opacity: 1;
    pointer-events: auto;
  }

  .qr-modal-card {
    background: #0f172a;
    border: 1px solid rgba(56, 189, 248, 0.3);
    border-radius: 20px;
    padding: 32px;
    text-align: center;
    max-width: 360px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(34, 211, 238, 0.2);
    position: relative;
    transform: scale(0.92);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .qr-modal-backdrop.is-open .qr-modal-card {
    transform: scale(1);
  }

  .qr-box {
    background: #ffffff;
    padding: 16px;
    border-radius: 14px;
    margin: 16px auto;
    width: 200px;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .qr-modal-close {
    position: absolute;
    top: 14px;
    right: 14px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 20px;
  }

  @media (max-width: 768px) {
    .file-badge-wrap { display: none; }
    .btn-bar span:last-child { display: none; }
    .timer-pill { font-size: 11px; padding: 4px 10px; }
  }
</style>
</head>
<body>

<?php if ($isExpired): ?>
  <div style="min-height: 100vh; display:flex; align-items:center; justify-content:center; padding:24px;">
    <div style="max-width:480px; width:100%; background:rgba(15,23,42,0.9); border:1px solid rgba(239,68,68,0.4); border-radius:20px; padding:36px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.8);">
      <span class="material-symbols-rounded" style="font-size:52px; color:#f87171; margin-bottom:12px;">timer_off</span>
      <h2 style="font-size:20px; font-weight:800; margin-bottom:10px;">Срок хранения сайта истёк</h2>
      <p style="font-size:14px; color:#94a3b8; line-height:1.6; margin-bottom:24px;">Файлы в Аврора Облаке хранятся ровно 24 часа с момента публикации, после чего автоматически удаляются.</p>
      <a href="index.html" style="display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg, #22d3ee, #6366f1); color:#020617; text-decoration:none; font-weight:700; font-size:14px; padding:12px 24px; border-radius:30px;">
        <span class="material-symbols-rounded">cloud_upload</span>
        <span>Загрузить новый сайт</span>
      </a>
    </div>
  </div>
<?php else: ?>

  <!-- Шапка предпросмотра -->
  <header class="aurora-topbar">
    <div class="bar-left">
      <a href="index.html" class="brand-link" title="Перейти в Аврора Облако">
        <div class="brand-logo-icon">
          <span class="material-symbols-rounded">cloud</span>
        </div>
        <div class="brand-text">Аврора <span>Облако</span></div>
      </a>
      <div class="divider"></div>
      <div class="file-badge-wrap">
        <div class="file-title" title="<?= htmlspecialchars($filename) ?>"><?= htmlspecialchars($title) ?></div>
        <div class="file-size"><?= htmlspecialchars($filesizeFormatted) ?></div>
      </div>
    </div>

    <div class="bar-center">
      <div class="timer-pill" id="ttl-pill" title="Время до автоматического удаления сайта">
        <span class="material-symbols-rounded">timer</span>
        <span id="countdown-text">24:00:00</span>
      </div>
    </div>

    <div class="bar-right">
      <a href="<?= htmlspecialchars($downloadUrl) ?>" class="btn-bar btn-bar-download" title="Скачать файл или архив сайта">
        <span class="material-symbols-rounded">download</span>
        <span>Скачать</span>
      </a>
      <button type="button" class="btn-bar btn-bar-ghost" id="btn-show-qr" title="Показать QR-код для телефона">
        <span class="material-symbols-rounded">qr_code_2</span>
        <span>QR-код</span>
      </button>
      <a href="<?= htmlspecialchars($previewUrl) ?>" target="_blank" class="btn-bar btn-bar-ghost" title="Открыть чистый сайт на весь экран без панели">
        <span class="material-symbols-rounded">open_in_new</span>
      </a>
      <a href="index.html" class="btn-bar btn-bar-ghost" title="Загрузить свой сайт">
        <span class="material-symbols-rounded">add</span>
      </a>
    </div>
  </header>

  <!-- Фрейм с сайтом -->
  <main class="preview-frame-container">
    <iframe src="<?= htmlspecialchars($previewUrl) ?>" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="Сайт пользователя"></iframe>
  </main>

  <!-- Модалка QR-кода -->
  <div class="qr-modal-backdrop" id="qr-modal">
    <div class="qr-modal-card">
      <button type="button" class="qr-modal-close" id="btn-close-qr"><span class="material-symbols-rounded">close</span></button>
      <h3 style="font-size: 16px; font-weight:800; margin-bottom: 4px;">Сайт на смартфоне</h3>
      <p style="font-size: 12px; color: var(--text-muted);">Наведите камеру телефона для перехода</p>
      <div class="qr-box" id="qr-canvas-wrap"></div>
      <button type="button" class="btn-bar btn-bar-ghost" id="btn-copy-link" style="width: 100%; justify-content:center; margin-top:8px;">
        <span class="material-symbols-rounded">link</span>
        <span>Скопировать ссылку</span>
      </button>
    </div>
  </div>

  <script src="../vk-miniapp/poster/qrcode.min.js"></script>
  <script>
    // Таймер обратного отсчета
    let remainingSec = <?= $remainingSec ?>;
    const countEl = document.getElementById('countdown-text');

    function updateTimer() {
      if (remainingSec <= 0) {
        countEl.textContent = 'Истекло';
        setTimeout(() => location.reload(), 1500);
        return;
      }
      const h = Math.floor(remainingSec / 3600);
      const m = Math.floor((remainingSec % 3600) / 60);
      const s = remainingSec % 60;
      countEl.textContent = 
        String(h).padStart(2, '0') + ':' + 
        String(m).padStart(2, '0') + ':' + 
        String(s).padStart(2, '0');
      remainingSec--;
    }
    updateTimer();
    setInterval(updateTimer, 1000);

    // QR код
    const qrWrap = document.getElementById('qr-canvas-wrap');
    if (qrWrap && typeof QRCode !== 'undefined') {
      new QRCode(qrWrap, {
        text: window.location.href,
        width: 170,
        height: 170,
        colorDark: '#0f172a',
        colorLight: '#ffffff'
      });
    }

    const qrModal = document.getElementById('qr-modal');
    document.getElementById('btn-show-qr')?.addEventListener('click', () => qrModal.classList.add('is-open'));
    document.getElementById('btn-close-qr')?.addEventListener('click', () => qrModal.classList.remove('is-open'));
    qrModal?.addEventListener('click', e => { if (e.target === qrModal) qrModal.classList.remove('is-open'); });

    document.getElementById('btn-copy-link')?.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        const btn = document.getElementById('btn-copy-link');
        btn.querySelector('span:last-child').textContent = 'Скопировано!';
        setTimeout(() => btn.querySelector('span:last-child').textContent = 'Скопировать ссылку', 2000);
      });
    });
  </script>
<?php endif; ?>

</body>
</html>

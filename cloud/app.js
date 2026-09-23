/**
 * Aurora Cloud 24H — Frontend Application Logic
 * Платформа «Аврора» · Временное хранилище любых файлов с TTL 24 часа
 */

(function () {
  'use strict';

  // Константы
  const API_UPLOAD_URL = '../api/cloud-upload.php';
  const STORAGE_KEY = 'aurora_cloud_history_v1';
  const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250 MB

  // DOM Элементы
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const btnBrowse = document.getElementById('btn-browse');

  const uploadProgressWrap = document.getElementById('upload-progress');
  const progressFilename = document.getElementById('progress-filename');
  const progressPercent = document.getElementById('progress-percent');
  const progressBar = document.getElementById('progress-bar');
  const progressBytes = document.getElementById('progress-bytes');
  const progressStatus = document.getElementById('progress-status');

  const resultCard = document.getElementById('result-card');
  const resFilename = document.getElementById('res-filename');
  const resBadge = document.getElementById('res-badge');
  const resFilesize = document.getElementById('res-filesize');
  const resIcon = document.getElementById('res-icon');
  const resCountdown = document.getElementById('res-countdown');

  const rowPreview = document.getElementById('row-preview');
  const inputViewUrl = document.getElementById('input-view-url');
  const btnCopyView = document.getElementById('btn-copy-view');
  const btnOpenView = document.getElementById('btn-open-view');

  const inputDownloadUrl = document.getElementById('input-download-url');
  const btnCopyDownload = document.getElementById('btn-copy-download');
  const btnDoDownload = document.getElementById('btn-do-download');

  const qrContainer = document.getElementById('res-qrcode');
  const btnShareTg = document.getElementById('btn-share-tg');
  const btnShareVk = document.getElementById('btn-share-vk');
  const btnCopyAll = document.getElementById('btn-copy-all');
  const btnUploadAnother = document.getElementById('btn-upload-another');

  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // Модальное окно вставки текста / кода
  const modalPaste = document.getElementById('modal-paste');
  const btnOpenPasteModal = document.getElementById('btn-open-paste-modal');
  const btnClosePaste = document.getElementById('btn-close-paste');
  const btnCancelPaste = document.getElementById('btn-cancel-paste');
  const btnSubmitPaste = document.getElementById('btn-submit-paste');
  const pasteTitleInput = document.getElementById('paste-title');
  const pasteCodeInput = document.getElementById('paste-code');

  const toastContainer = document.getElementById('toast-container');

  // Переменные состояния
  let activeCountdownInterval = null;
  let activeExpiresAt = null;
  let currentResultData = null;

  // ─── Инициализация ──────────────────────────────────────────────────────────
  function init() {
    setupDragAndDrop();
    setupFileInput();
    setupModalPaste();
    setupActionButtons();
    renderHistory();
    startHistoryTick();
  }

  // ─── Drag & Drop ────────────────────────────────────────────────────────────
  function setupDragAndDrop() {
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('is-dragover');
      }, false);
    });

    ['dragleave', 'dragend'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('is-dragover');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('is-dragover');

      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        handleFileSelection(dt.files[0]);
      }
    }, false);

    // Клик по дропзоне (если клик не по кнопкам)
    dropzone.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      fileInput && fileInput.click();
    });
  }

  function setupFileInput() {
    if (!btnBrowse || !fileInput) return;

    btnBrowse.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        handleFileSelection(fileInput.files[0]);
      }
    });
  }

  // ─── Валидация и загрузка файла ─────────────────────────────────────────────
  function handleFileSelection(file) {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      showToast('Размер файла превышает лимит 250 МБ для 24-часового хранилища', 'error');
      return;
    }

    uploadFile(file);
  }

  function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    // Сбрасываем и показываем прогресс
    showProgress(file.name, file.size);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_UPLOAD_URL, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        updateProgress(percent, e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.ok) {
            hideProgress();
            handleUploadSuccess(res);
          } else {
            hideProgress();
            showToast(res.error || 'Ошибка при загрузке на сервер', 'error');
          }
        } catch (err) {
          hideProgress();
          showToast('Ошибка разбора ответа сервера: ' + err.message, 'error');
        }
      } else {
        hideProgress();
        let errMsg = 'Ошибка загрузки (код ' + xhr.status + ')';
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.error) errMsg = res.error;
        } catch (e) {}
        showToast(errMsg, 'error');
      }
    };

    xhr.onerror = () => {
      hideProgress();
      showToast('Ошибка сети при отправке файла в облако', 'error');
    };

    xhr.send(formData);
  }

  // ─── Прогресс-бар ───────────────────────────────────────────────────────────
  function showProgress(name, totalSize) {
    if (!uploadProgressWrap) return;
    uploadProgressWrap.classList.add('is-active');
    progressFilename.textContent = name;
    progressPercent.textContent = '0%';
    progressBar.style.width = '0%';
    progressBytes.textContent = '0 / ' + formatBytes(totalSize);
    progressStatus.textContent = 'Отправка в защищённое облако...';
  }

  function updateProgress(percent, loaded, total) {
    if (!uploadProgressWrap) return;
    progressPercent.textContent = percent + '%';
    progressBar.style.width = percent + '%';
    progressBytes.textContent = formatBytes(loaded) + ' / ' + formatBytes(total);

    if (percent >= 100) {
      progressStatus.textContent = 'Обработка и сохранение файла...';
    } else {
      progressStatus.textContent = 'Отправка в защищённое облако...';
    }
  }

  function hideProgress() {
    if (!uploadProgressWrap) return;
    uploadProgressWrap.classList.remove('is-active');
    if (fileInput) fileInput.value = '';
  }

  // ─── Подбор иконки по расширению ───────────────────────────────────────────
  function getFileIcon(ext) {
    const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'];
    const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'];
    const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
    const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'];
    const codeExts = ['html', 'htm', 'css', 'js', 'json', 'xml', 'sql', 'py', 'ts', 'java', 'c', 'cpp'];

    if (archiveExts.includes(ext)) return 'folder_zip';
    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video_file';
    if (audioExts.includes(ext)) return 'audio_file';
    if (docExts.includes(ext)) return 'description';
    if (codeExts.includes(ext)) return 'code';
    return 'draft';
  }

  // ─── Успешная загрузка (Отображение результата) ──────────────────────────────
  function handleUploadSuccess(data) {
    currentResultData = data;

    // Заполнение полей карточки
    resFilename.textContent = data.filename || data.title || 'Файл';
    resFilesize.textContent = data.filesize_formatted || formatBytes(data.filesize || 0);

    const ext = (data.filename || '').split('.').pop().toLowerCase();
    resBadge.textContent = ext ? ext.toUpperCase() : 'ФАЙЛ';
    resIcon.textContent = getFileIcon(ext);

    // Ссылки
    const viewUrl = data.view_url || (window.location.origin + '/cloud/view.php?id=' + data.id);
    const downloadUrl = data.download_url || (window.location.origin + '/api/cloud-download.php?id=' + data.id);

    inputViewUrl.value = viewUrl;
    btnOpenView.href = viewUrl;

    inputDownloadUrl.value = downloadUrl;
    btnDoDownload.href = downloadUrl;

    // Скрывать строку предпросмотра, если файл не имеет предпросмотра
    if (data.preview_url === null && !data.view_url) {
      rowPreview.style.display = 'none';
    } else {
      rowPreview.style.display = 'block';
    }

    // Таймер обратного отсчета
    activeExpiresAt = data.expires_at || (Math.floor(Date.now() / 1000) + 86400);
    startCountdown(activeExpiresAt);

    // QR Код
    generateQrCode(viewUrl);

    // Кнопки соцсетей
    const shareText = encodeURIComponent('Файл в Аврора Облаке: ' + (data.title || data.filename) + ' (ссылка активна 24 часа)');
    btnShareTg.href = 'https://t.me/share/url?url=' + encodeURIComponent(viewUrl) + '&text=' + shareText;
    btnShareVk.href = 'https://vk.com/share.php?url=' + encodeURIComponent(viewUrl) + '&title=' + encodeURIComponent(data.title || data.filename);

    // Показываем карточку результата
    resultCard.classList.add('is-active');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Сохраняем в localStorage
    saveToHistory({
      id: data.id,
      title: data.title || data.filename,
      filename: data.filename,
      filesize_formatted: data.filesize_formatted || formatBytes(data.filesize || 0),
      view_url: viewUrl,
      download_url: downloadUrl,
      uploaded_at: data.uploaded_at || Math.floor(Date.now() / 1000),
      expires_at: activeExpiresAt,
      ext: ext
    });

    renderHistory();
    showToast('Файл успешно загружен в облако на 24 часа! 🚀', 'success');
  }

  // ─── Таймер обратного отсчета 24 часа ────────────────────────────────────────
  function startCountdown(expiresAt) {
    if (activeCountdownInterval) clearInterval(activeCountdownInterval);

    function update() {
      const now = Math.floor(Date.now() / 1000);
      const diff = expiresAt - now;

      if (diff <= 0) {
        clearInterval(activeCountdownInterval);
        resCountdown.textContent = '00:00:00 (Истёк)';
        resCountdown.className = 'ttl-countdown is-danger';
        return;
      }

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      const pad = (n) => String(n).padStart(2, '0');
      resCountdown.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

      if (diff < 3600) {
        resCountdown.className = 'ttl-countdown is-danger';
      } else if (diff < 21600) { // < 6 часов
        resCountdown.className = 'ttl-countdown is-warning';
      } else {
        resCountdown.className = 'ttl-countdown';
      }
    }

    update();
    activeCountdownInterval = setInterval(update, 1000);
  }

  // ─── Генерация QR Кода ──────────────────────────────────────────────────────
  function generateQrCode(url) {
    if (!qrContainer) return;
    qrContainer.innerHTML = '';

    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(qrContainer, {
          text: url,
          width: 124,
          height: 124,
          colorDark: '#090d16',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
        return;
      } catch (e) {
        console.warn('QRCode JS error, using image fallback', e);
      }
    }

    // Fallback через сервис генерации QR-кодов
    const img = document.createElement('img');
    img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=124x124&data=' + encodeURIComponent(url);
    img.alt = 'QR Код ссылки на файл';
    img.style.width = '124px';
    img.style.height = '124px';
    qrContainer.appendChild(img);
  }

  // ─── Модальное окно быстрой вставки текста или HTML ──────────────────────────
  function setupModalPaste() {
    if (!btnOpenPasteModal || !modalPaste) return;

    btnOpenPasteModal.addEventListener('click', () => {
      modalPaste.classList.add('is-open');
      pasteCodeInput.focus();
    });

    [btnClosePaste, btnCancelPaste].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          modalPaste.classList.remove('is-open');
        });
      }
    });

    modalPaste.addEventListener('click', (e) => {
      if (e.target === modalPaste) {
        modalPaste.classList.remove('is-open');
      }
    });

    btnSubmitPaste.addEventListener('click', () => {
      const code = pasteCodeInput.value.trim();
      const title = pasteTitleInput.value.trim() || 'Заметка Аврора';

      if (!code) {
        showToast('Пожалуйста, введите текст или код для сохранения', 'warning');
        return;
      }

      modalPaste.classList.remove('is-open');
      showProgress(title, code.length);

      fetch(API_UPLOAD_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          title: title,
          html: code
        })
      })
      .then(res => res.json())
      .then(data => {
        hideProgress();
        if (data.ok) {
          handleUploadSuccess(data);
          pasteCodeInput.value = '';
        } else {
          showToast(data.error || 'Ошибка публикации', 'error');
        }
      })
      .catch(err => {
        hideProgress();
        showToast('Ошибка сети: ' + err.message, 'error');
      });
    });
  }

  // ─── Кнопки действий карточки результата ────────────────────────────────────
  function setupActionButtons() {
    if (btnCopyView) {
      btnCopyView.addEventListener('click', () => {
        copyToClipboard(inputViewUrl.value, 'Ссылка на просмотр скопирована!');
      });
    }

    if (btnCopyDownload) {
      btnCopyDownload.addEventListener('click', () => {
        copyToClipboard(inputDownloadUrl.value, 'Ссылка на скачивание файла скопирована!');
      });
    }

    if (btnCopyAll) {
      btnCopyAll.addEventListener('click', () => {
        if (!currentResultData) return;
        const text = `📁 Файл в Аврора Облаке: ${currentResultData.title || currentResultData.filename}\n` +
                     `⏱️ Ссылка активна 24 часа\n` +
                     `🔗 Предпросмотр: ${inputViewUrl.value}\n` +
                     `📥 Скачать: ${inputDownloadUrl.value}`;
        copyToClipboard(text, 'Полная информация скопирована в буфер!');
      });
    }

    if (btnUploadAnother) {
      btnUploadAnother.addEventListener('click', () => {
        resultCard.classList.remove('is-active');
        dropzone.scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (btnClearHistory) {
      btnClearHistory.addEventListener('click', () => {
        if (confirm('Очистить локальную историю загрузок на этом устройстве?')) {
          localStorage.removeItem(STORAGE_KEY);
          renderHistory();
          showToast('История очищена', 'info');
        }
      });
    }
  }

  // ─── Управление историей в localStorage ─────────────────────────────────────
  function getHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveToHistory(item) {
    try {
      let list = getHistory();
      // Удаляем дубликат по ID, если есть
      list = list.filter(x => x.id !== item.id);
      list.unshift(item);
      // Ограничиваем 20 записями
      list = list.slice(0, 20);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }

  function renderHistory() {
    if (!historyList) return;
    const list = getHistory();

    if (list.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history-box">
          <span class="material-symbols-rounded">cloud_off</span>
          Вы пока не загружали файлы. Перетащите файл в область выше!
        </div>
      `;
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    let html = '';

    list.forEach(item => {
      const remaining = item.expires_at - now;
      const isExpired = remaining <= 0;
      const remainingText = isExpired ? 'Истёк' : formatRemaining(remaining);
      const timerClass = isExpired ? 'history-timer expired' : 'history-timer';
      const ext = item.ext || (item.filename || '').split('.').pop().toLowerCase();
      const icon = getFileIcon(ext);

      html += `
        <div class="history-card" data-id="${escapeHtml(item.id)}">
          <div class="history-left">
            <div class="history-icon">
              <span class="material-symbols-rounded">${icon}</span>
            </div>
            <div class="history-meta">
              <div class="history-title" title="${escapeHtml(item.filename)}">${escapeHtml(item.title || item.filename)}</div>
              <div class="history-sub">
                <span>${escapeHtml(item.filesize_formatted || '')}</span>
                <span>&bull;</span>
                <span class="${timerClass}" data-expires="${item.expires_at}">${remainingText}</span>
              </div>
            </div>
          </div>
          <div class="history-actions">
            ${!isExpired ? `
              <a href="${escapeHtml(item.view_url)}" target="_blank" class="btn-icon-action primary" title="Открыть просмотр">
                <span class="material-symbols-rounded">visibility</span>
                <span>Открыть</span>
              </a>
              <button type="button" class="btn-icon-action btn-hist-copy" data-url="${escapeHtml(item.download_url)}" title="Скопировать ссылку на скачивание">
                <span class="material-symbols-rounded">content_copy</span>
              </button>
            ` : `
              <span style="font-size: 12px; color: var(--text-dim); margin-right: 8px;">Файл удален</span>
            `}
            <button type="button" class="btn-icon-action btn-hist-del" data-id="${escapeHtml(item.id)}" title="Удалить из списка">
              <span class="material-symbols-rounded">delete</span>
            </button>
          </div>
        </div>
      `;
    });

    historyList.innerHTML = html;

    // Привязываем события для кнопок в истории
    historyList.querySelectorAll('.btn-hist-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        copyToClipboard(btn.dataset.url, 'Ссылка на скачивание скопирована!');
      });
    });

    historyList.querySelectorAll('.btn-hist-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        deleteHistoryItem(id);
      });
    });
  }

  function deleteHistoryItem(id) {
    let list = getHistory();
    list = list.filter(x => x.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    renderHistory();
  }

  function startHistoryTick() {
    setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const timerEls = document.querySelectorAll('.history-timer[data-expires]');
      timerEls.forEach(el => {
        const expiresAt = parseInt(el.getAttribute('data-expires'), 10);
        const remaining = expiresAt - now;
        if (remaining <= 0) {
          el.textContent = 'Истёк';
          el.className = 'history-timer expired';
        } else {
          el.textContent = formatRemaining(remaining);
        }
      });
    }, 1000);
  }

  // ─── Вспомогательные утилиты ────────────────────────────────────────────────
  function formatBytes(bytes) {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
  }

  function formatRemaining(sec) {
    if (sec <= 0) return '00:00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function copyToClipboard(text, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage || 'Скопировано в буфер обмена', 'success');
      }).catch(() => {
        fallbackCopy(text, successMessage);
      });
    } else {
      fallbackCopy(text, successMessage);
    }
  }

  function fallbackCopy(text, successMessage) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(successMessage || 'Скопировано в буфер обмена', 'success');
    } catch (e) {
      showToast('Не удалось скопировать, выделите текст вручную', 'warning');
    }
    document.body.removeChild(ta);
  }

  function showToast(message, type = 'info') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'error';
    if (type === 'warning') icon = 'warning';

    toast.innerHTML = `
      <span class="material-symbols-rounded">${icon}</span>
      <span>${escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('is-leaving');
      setTimeout(() => {
        toast.remove();
      }, 250);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Запуск при загрузке документа
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

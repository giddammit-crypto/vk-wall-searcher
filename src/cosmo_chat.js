/**
 * src/cosmo_chat.js — Интерактивный чат с Космо (Cosmo AI Chat) (v4.19.0)
 * ============================================================================
 * Полноценный модальный чат с роботом-маскотом Космо:
 *   • Вызывается по двойному клику на Космо
 *   • Адаптивное модальное окно в неоновом стиле AURORA
 *   • Полная поддержка Markdown (заголовки, списки, таблицы, код, цитаты)
 *   • Кнопки «Скопировать пост» прямо в сообщениях ИИ
 *   • Прикрепление и анализ файлов (тексты, черновики постов, JSON, CSV, изображения)
 *   • Библиотечный SMM-ассистент: посты, интерактивы, анализ реальных данных групп ВК
 * ============================================================================
 */

import { resolveApiUrl } from './api.js?v=4.19.0';

const AI_PROXY_URL = resolveApiUrl('api/ai-proxy.php');

/* ---------------------------------------------------------------------------
 * Вспомогательные функции экранирования и Markdown
 * ------------------------------------------------------------------------- */
function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Инлайн-разметка Markdown: жирный, курсив, код, ссылки, выделения
 */
function mdInline(s) {
    // Инлайн-код
    s = s.replace(/`([^`\n]+)`/g, '<code class="cosmo-chat-code">$1</code>');
    // Ссылки
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="cosmo-chat-link">$1</a>');
    s = s.replace(/(^|[\s(])((?:https?:\/\/)[^\s<]+)/g,
        '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="cosmo-chat-link">$2</a>');
    // Акценты
    s = s.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/==([^\n]+?)==/g, '<mark class="cosmo-chat-hl">$1</mark>');
    s = s.replace(/__([^_\n]+)__/g, '<u class="cosmo-chat-u">$1</u>');
    s = s.replace(/~~([^~\n]+)~~/g, '<s class="cosmo-chat-s">$1</s>');
    s = s.replace(/(^|[^\w*])\*([^*\n]+)\*(?=[^\w*]|$)/g, '$1<em>$2</em>');
    // Подсветка цифр внутри жирного текста
    s = s.replace(/<strong>([^<]*)<\/strong>/g, (m, inner) =>
        '<strong>' + inner.replace(/(\d[\d\s.,%₽руб]*)/g, '<span class="cosmo-chat-num">$1</span>') + '</strong>');
    return s;
}

/**
 * Блочная разметка Markdown: заголовки, списки, таблицы, цитаты, код, абзацы
 */
export function parseCosmoMarkdown(text) {
    if (!text) return '';
    const src = escapeHtml(String(text).replace(/\r\n/g, '\n'));
    const lines = src.split('\n');
    const out = [];
    let para = [];
    let list = null; // {type: 'ul'|'ol', items: []}
    let code = null; // {lines: []}
    let table = [];  // [rows][cells]
    let quote = [];
    let olCounter = 0;

    const flushPara = () => {
        if (para.length) {
            out.push('<p>' + mdInline(para.join('<br>')) + '</p>');
            para = [];
        }
    };

    const flushList = () => {
        if (list) {
            if (list.type === 'ol') {
                out.push('<div class="cosmo-chat-ol">' +
                    list.items.map((it, idx) => {
                        const n = (list.startFrom || 1) + idx;
                        return '<div class="cosmo-chat-ol-item"><span class="cosmo-chat-ol-num">' + n + '</span>'
                            + '<span class="cosmo-chat-ol-text">' + mdInline(it.join('<br>')) + '</span></div>';
                    }).join('') +
                    '</div>');
            } else {
                out.push('<ul class="cosmo-chat-ul">' +
                    list.items.map(it => '<li>' + mdInline(it.join('<br>')) + '</li>').join('') +
                    '</ul>');
            }
            list = null;
        }
    };

    const flushCode = () => {
        if (code) {
            const rawCode = code.lines.join('\n');
            out.push(`
                <div class="cosmo-chat-codeblock-wrap">
                    <button type="button" class="cosmo-chat-copy-code-btn" data-copy-code title="Скопировать код">
                        <span class="material-symbols-outlined">content_copy</span> Скопировать
                    </button>
                    <pre class="cosmo-chat-codeblock"><code>${rawCode}</code></pre>
                </div>
            `);
            code = null;
        }
    };

    const flushTable = () => {
        if (table.length) {
            const rows = table.filter(r => !r.every(c => /^[\s:-]*$/.test(c)));
            if (rows.length) {
                const head = rows[0];
                const body = rows.slice(1);
                let t = '<div class="cosmo-chat-table-wrap"><table class="cosmo-chat-table">';
                t += '<thead><tr>' + head.map(c => '<th>' + mdInline(c.trim()) + '</th>').join('') + '</tr></thead>';
                if (body.length) {
                    t += '<tbody>' + body.map(r =>
                        '<tr>' + head.map((_, i) => '<td>' + mdInline((r[i] || '').trim()) + '</td>').join('') + '</tr>'
                    ).join('') + '</tbody>';
                }
                t += '</table></div>';
                out.push(t);
            }
        }
        table = [];
    };

    const flushQuote = () => {
        if (quote.length) {
            out.push('<blockquote class="cosmo-chat-quote">' + mdInline(quote.join('<br>')) + '</blockquote>');
            quote = [];
        }
    };

    const flushAll = () => {
        flushPara();
        flushList();
        flushCode();
        flushTable();
        flushQuote();
        olCounter = 0;
    };

    for (const raw of lines) {
        const t = raw.trim();

        // Блоки кода ```
        if (/^```/.test(t)) {
            if (code) {
                flushCode();
            } else {
                flushAll();
                code = { lines: [] };
            }
            continue;
        }
        if (code) {
            code.lines.push(raw);
            continue;
        }

        // Пустая строка разделяет блоки
        if (t === '') {
            flushAll();
            continue;
        }

        // Горизонтальный разделитель ---
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
            flushAll();
            out.push('<hr class="cosmo-chat-hr">');
            continue;
        }

        // Заголовки # ... ####
        const h = t.match(/^(#{1,4})\s+(.+)$/);
        if (h) {
            flushAll();
            const lvl = h[1].length;
            out.push(`<div class="cosmo-chat-h cosmo-chat-h${lvl}">${mdInline(h[2])}</div>`);
            continue;
        }

        // Цитаты >
        if (/^(&gt;|>)/.test(t)) {
            flushPara();
            flushList();
            flushTable();
            quote.push(t.replace(/^(&gt;|>)\s?/, ''));
            continue;
        }

        // Таблицы | a | b |
        if (/^\|.*\|$/.test(t)) {
            flushPara();
            flushList();
            flushQuote();
            table.push(t.slice(1, -1).split('|'));
            continue;
        }

        // Списки
        const ul = t.match(/^[-*•]\s+(.+)$/);
        const ol = t.match(/^(\d{1,2})[.)]\s+(.+)$/);
        if (ul || ol) {
            flushPara();
            flushQuote();
            flushTable();
            if (ol) {
                if (list && list.type === 'ul') flushList();
                olCounter++;
                if (!list || list.type !== 'ol') {
                    list = { type: 'ol', items: [], startFrom: olCounter };
                }
                list.items.push([ol[2]]);
            } else {
                if (list && list.type === 'ol') flushList();
                if (!list || list.type !== 'ul') {
                    list = { type: 'ul', items: [] };
                }
                list.items.push([ul[1]]);
            }
            continue;
        }

        // Обычная строка
        flushList();
        para.push(t);
    }

    flushAll();
    return out.join('');
}


/* ===========================================================================
 * КЛАСС CosmoChatModal
 * =========================================================================== */
export class CosmoChatModal {
    constructor({ mascot }) {
        this.mascot = mascot;
        this.overlayEl = null;
        this.dialogEl = null;
        this.messagesEl = null;
        this.inputEl = null;
        this.sendBtnEl = null;
        this.attachBtnEl = null;
        this.fileInputEl = null;
        this.attachmentBarEl = null;
        this.chipsContainerEl = null;
        this.statusPillEl = null;

        this.isOpen = false;
        this.isBusy = false;
        this.messages = []; // [{role: 'user'|'assistant', content: string, file?: Object}]
        this.attachedFile = null; // {name, size, type, isImage, textContent, dataUrl}
        this.audioEnabled = true;

        this.onEscKeyDown = this.onEscKeyDown.bind(this);
    }

    /* ---------------------------------------------------------------------
     * Инициализация DOM-структуры модального окна
     * ------------------------------------------------------------------- */
    createDOM() {
        if (this.overlayEl) return;

        const overlay = document.createElement('div');
        overlay.className = 'cosmo-chat-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Чат с Космо');

        overlay.innerHTML = `
            <div class="cosmo-chat-dialog">
                <!-- Шапка чата -->
                <div class="cosmo-chat-header">
                    <div class="cosmo-chat-brand">
                        <div class="cosmo-chat-avatar-wrap">
                            <img src="assets/images/mascot/robot_smile.png?v=4.19.0"
                                 alt="Космо"
                                 class="cosmo-chat-avatar-img" />
                            <span class="cosmo-chat-online-dot" title="Космо на связи"></span>
                        </div>
                        <div class="cosmo-chat-title-group">
                            <div class="cosmo-chat-title-row">
                                <h3 class="cosmo-chat-title">ЧАТ С КОСМО</h3>
                                <span class="cosmo-chat-badge">AI SMM-GURU</span>
                            </div>
                            <div class="cosmo-chat-subtitle">
                                <span class="material-symbols-outlined">auto_awesome</span>
                                <span>Библиотечный ИИ-ассистент • Онлайн</span>
                            </div>
                        </div>
                    </div>

                    <div class="cosmo-chat-header-actions">
                        <button type="button" class="cosmo-chat-tool-btn" data-chat-clear title="Начать новый диалог">
                            <span class="material-symbols-outlined">restart_alt</span>
                            <span class="tool-btn-text">Новый диалог</span>
                        </button>
                        <button type="button" class="cosmo-chat-tool-btn" data-chat-sound title="Озвучка реплик Космо">
                            <span class="material-symbols-outlined chat-sound-icon">volume_up</span>
                        </button>
                        <button type="button" class="cosmo-chat-close-btn" data-chat-close title="Закрыть окно (Esc)">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <!-- Область сообщений -->
                <div class="cosmo-chat-messages" data-chat-messages></div>

                <!-- Быстрые чипы-подсказки -->
                <div class="cosmo-chat-chips" data-chat-chips>
                    <button type="button" class="cosmo-chip" data-prompt="Напиши вовлекающий пост для библиотеки о новинках книг с интерактивом и призывом к чтению!">
                        <span class="chip-icon">📚</span> Пост о новинках
                    </button>
                    <button type="button" class="cosmo-chip" data-prompt="Сделай детальный анализ активности групп библиотек по результатам последнего сканирования: кто лидер, у кого высокий ER и где просадка?">
                        <span class="chip-icon">📊</span> Анализ лидеров скана
                    </button>
                    <button type="button" class="cosmo-chip" data-prompt="Придумай 3 оригинальные идеи для викторины или опроса в библиотечной группе ВК, чтобы повысить охваты!">
                        <span class="chip-icon">🔥</span> Идея для интерактива
                    </button>
                    <button type="button" class="cosmo-chip" data-prompt="Как библиотеке поднять показатель ER и привлекать больше комментариев в ВК? Дай конкретные рекомендации.">
                        <span class="chip-icon">🚀</span> Как поднять ER?
                    </button>
                    <button type="button" class="cosmo-chip" data-prompt="Подбери 5 трендовых и целевых хэштегов для публикации библиотеки о встрече читательского клуба.">
                        <span class="chip-icon">🏷️</span> Хэштеги для поста
                    </button>
                </div>

                <!-- Плашка прикреплённого файла -->
                <div class="cosmo-chat-attachment-bar" data-chat-attachment style="display: none;">
                    <div class="attachment-preview-icon">
                        <span class="material-symbols-outlined" data-attach-icon>description</span>
                    </div>
                    <div class="attachment-meta">
                        <span class="attachment-name" data-attach-name>file.txt</span>
                        <span class="attachment-size" data-attach-size>12 КБ</span>
                    </div>
                    <button type="button" class="attachment-remove-btn" data-attach-remove title="Удалить прикреплённый файл">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                <!-- Нижняя панель ввода -->
                <div class="cosmo-chat-footer">
                    <input type="file"
                           class="cosmo-chat-file-input"
                           data-chat-file-input
                           accept=".txt,.md,.json,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp"
                           style="display: none;" />

                    <button type="button" class="cosmo-chat-attach-btn" data-chat-attach title="Прикрепить файл для анализа ИИ (текст, данные или фото)">
                        <span class="material-symbols-outlined">attach_file</span>
                        <span class="attach-btn-label">Файл</span>
                    </button>

                    <div class="cosmo-chat-input-wrap">
                        <textarea class="cosmo-chat-input"
                                  data-chat-input
                                  rows="1"
                                  placeholder="Спроси Космо, попроси написать пост или перетащи файл... (Enter — отправить, Shift+Enter — перенос)"></textarea>
                    </div>

                    <button type="button" class="cosmo-chat-send-btn" data-chat-send title="Отправить сообщение (Enter)">
                        <span class="material-symbols-outlined">send</span>
                        <span class="send-btn-label">Отправить</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlayEl = overlay;
        this.dialogEl = overlay.querySelector('.cosmo-chat-dialog');
        this.messagesEl = overlay.querySelector('[data-chat-messages]');
        this.inputEl = overlay.querySelector('[data-chat-input]');
        this.sendBtnEl = overlay.querySelector('[data-chat-send]');
        this.attachBtnEl = overlay.querySelector('[data-chat-attach]');
        this.fileInputEl = overlay.querySelector('[data-chat-file-input]');
        this.attachmentBarEl = overlay.querySelector('[data-chat-attachment]');
        this.chipsContainerEl = overlay.querySelector('[data-chat-chips]');

        this.bindEvents();
    }

    /* ---------------------------------------------------------------------
     * Привязка событий интерфейса
     * ------------------------------------------------------------------- */
    bindEvents() {
        // Клик вне диалога — закрыть
        this.overlayEl.addEventListener('click', (e) => {
            if (e.target === this.overlayEl) {
                this.close();
            }
        });

        // Кнопка «Закрыть»
        const closeBtn = this.overlayEl.querySelector('[data-chat-close]');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());

        // Кнопка «Новый диалог»
        const clearBtn = this.overlayEl.querySelector('[data-chat-clear]');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.messages = [];
                this.clearAttachedFile();
                this.renderWelcome();
                if (this.inputEl) this.inputEl.focus();
            });
        }

        // Кнопка звука
        const soundBtn = this.overlayEl.querySelector('[data-chat-sound]');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.audioEnabled = !this.audioEnabled;
                const icon = soundBtn.querySelector('.chat-sound-icon');
                if (icon) icon.textContent = this.audioEnabled ? 'volume_up' : 'volume_off';
                soundBtn.classList.toggle('is-muted', !this.audioEnabled);
            });
        }

        // Кнопка «Отправить»
        this.sendBtnEl.addEventListener('click', () => this.handleSend());

        // Авто-рост поля ввода и отправка по Enter
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        this.inputEl.addEventListener('input', () => {
            this.inputEl.style.height = 'auto';
            const newHeight = Math.min(this.inputEl.scrollHeight, 140);
            this.inputEl.style.height = `${newHeight}px`;
        });

        // Кнопка «Прикрепить файл»
        this.attachBtnEl.addEventListener('click', () => {
            if (this.fileInputEl) this.fileInputEl.click();
        });

        this.fileInputEl.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                this.processSelectedFile(files[0]);
            }
            this.fileInputEl.value = '';
        });

        // Удаление прикреплённого файла
        const removeAttachBtn = this.overlayEl.querySelector('[data-attach-remove]');
        if (removeAttachBtn) {
            removeAttachBtn.addEventListener('click', () => this.clearAttachedFile());
        }

        // Быстрые чипы
        this.chipsContainerEl.addEventListener('click', (e) => {
            const chip = e.target.closest('.cosmo-chip');
            if (chip && chip.dataset.prompt) {
                this.inputEl.value = chip.dataset.prompt;
                this.handleSend();
            }
        });

        // Делегирование копирования постов и блоков кода
        this.messagesEl.addEventListener('click', (e) => {
            const copyPostBtn = e.target.closest('[data-copy-post]');
            if (copyPostBtn) {
                const text = copyPostBtn.getAttribute('data-copy-post') || '';
                this.copyToClipboard(text, copyPostBtn, 'Пост скопирован! ✅');
                return;
            }

            const copyCodeBtn = e.target.closest('[data-copy-code]');
            if (copyCodeBtn) {
                const wrap = copyCodeBtn.closest('.cosmo-chat-codeblock-wrap');
                const codeBlock = wrap ? wrap.querySelector('code') : null;
                const text = codeBlock ? codeBlock.textContent : '';
                this.copyToClipboard(text, copyCodeBtn, 'Скопировано! ✅');
            }
        });

        // Drag & Drop файлов прямо на окно чата
        const dropTarget = this.dialogEl;
        ['dragenter', 'dragover'].forEach(name => {
            dropTarget.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropTarget.classList.add('is-dragover');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropTarget.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropTarget.classList.remove('is-dragover');
            });
        });

        dropTarget.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                this.processSelectedFile(dt.files[0]);
            }
        });
    }

    /* ---------------------------------------------------------------------
     * Обработка и чтение прикреплённого файла
     * ------------------------------------------------------------------- */
    processSelectedFile(file) {
        if (!file) return;

        const maxBytes = 10 * 1024 * 1024; // 10 МБ лимит загрузки
        if (file.size > maxBytes) {
            alert(`Файл слишком большой (${formatBytes(file.size)}). Максимальный размер: 10 МБ.`);
            return;
        }

        const isImage = file.type.startsWith('image/');
        const ext = file.name.split('.').pop().toLowerCase();
        const isText = isImage ? false : (
            file.type.startsWith('text/') ||
            ['txt', 'md', 'json', 'csv', 'js', 'html', 'css', 'xml', 'log'].includes(ext)
        );

        const attachObj = {
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            ext,
            isImage,
            isText,
            textContent: null,
            dataUrl: null
        };

        if (isText) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Ограничиваем считываемый текст до 60 КБ для гарантированного прохождения в ИИ
                let text = String(e.target.result || '');
                if (text.length > 60000) {
                    text = text.slice(0, 60000) + '\n\n...[остальная часть файла опущена для экономии контекста]';
                }
                attachObj.textContent = text;
                this.displayAttachmentBar(attachObj);
            };
            reader.readAsText(file);
        } else if (isImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                attachObj.dataUrl = e.target.result;
                this.displayAttachmentBar(attachObj);
            };
            reader.readAsDataURL(file);
        } else {
            // Бинарный файл / документ (например, docx/pdf)
            this.displayAttachmentBar(attachObj);
        }
    }

    displayAttachmentBar(attachObj) {
        this.attachedFile = attachObj;
        if (!this.attachmentBarEl) return;

        const nameEl = this.attachmentBarEl.querySelector('[data-attach-name]');
        const sizeEl = this.attachmentBarEl.querySelector('[data-attach-size]');
        const iconEl = this.attachmentBarEl.querySelector('[data-attach-icon]');

        if (nameEl) nameEl.textContent = attachObj.name;
        if (sizeEl) sizeEl.textContent = formatBytes(attachObj.size);
        if (iconEl) {
            iconEl.textContent = attachObj.isImage ? 'image' : (attachObj.isText ? 'description' : 'attach_file');
        }

        this.attachmentBarEl.style.display = 'flex';
    }

    clearAttachedFile() {
        this.attachedFile = null;
        if (this.attachmentBarEl) {
            this.attachmentBarEl.style.display = 'none';
        }
    }

    /* ---------------------------------------------------------------------
     * Открытие и закрытие модального окна
     * ------------------------------------------------------------------- */
    open(initialQuery = '') {
        this.createDOM();
        this.isOpen = true;

        document.addEventListener('keydown', this.onEscKeyDown);
        this.overlayEl.classList.add('is-open');

        // Если диалог пуст — показываем приветствие Космо
        if (this.messages.length === 0) {
            this.renderWelcome();
        }

        // Анимация радости у маскота
        if (this.mascot) {
            this.mascot.setState('smile');
            this.mascot.setMoodBadge('💬', 4000);
            if (this.mascot.playVoice) {
                this.mascot.playVoice('post_scan_10', true);
            }
        }

        setTimeout(() => {
            if (this.inputEl) {
                if (initialQuery) {
                    this.inputEl.value = initialQuery;
                }
                this.inputEl.focus();
            }
        }, 150);
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        document.removeEventListener('keydown', this.onEscKeyDown);

        if (this.overlayEl) {
            this.overlayEl.classList.remove('is-open');
            this.overlayEl.classList.add('is-closing');
            setTimeout(() => {
                this.overlayEl.classList.remove('is-closing');
            }, 260);
        }

        if (this.mascot) {
            this.mascot.setState('idle');
        }
    }

    onEscKeyDown(e) {
        if (e.key === 'Escape') {
            this.close();
        }
    }

    /* ---------------------------------------------------------------------
     * Приветственное сообщение
     * ------------------------------------------------------------------- */
    renderWelcome() {
        this.messagesEl.innerHTML = '';

        const welcomeHtml = `
            <div class="cosmo-chat-msg cosmo-chat-msg-bot">
                <div class="msg-avatar">
                    <img src="assets/images/mascot/robot_smile.png?v=4.19.0" alt="Космо" />
                </div>
                <div class="msg-content">
                    <div class="msg-author">Космо • SMM-гуру библиотек</div>
                    <div class="msg-body">
                        <p>Привет, коллега! Я <strong>Космо</strong> 🤖📚 — твой космический напарник, библиотечный ИИ-ассистент и по совместительству величайший SMM-гуру галактики ВКонтакте!</p>
                        <p>Чем могу помочь прямо сейчас?</p>
                        <ul class="cosmo-chat-ul">
                            <li>✍️ <strong>Написать огненный пост</strong> для группы библиотеки (о книгах, событиях, клубах, акциях, с интерактивом и призывом к действию).</li>
                            <li>📊 <strong>Проанализировать группы ВК</strong> и реальные показатели сканирования (без выдумок и галлюцинаций — только точные цифры!).</li>
                            <li>📎 <strong>Оценить черновик или файл</strong> — прикрепи файл через кнопку со скрепкой внизу или перетащи сюда.</li>
                            <li>🎯 <strong>Придумать викторину, опрос или рубрику</strong>, чтобы поднять охваты и вовлечённость читателей.</li>
                        </ul>
                        <p>Выбирай быструю тему из карточек ниже или пиши свой вопрос прямо в чат! 🚀✨</p>
                    </div>
                </div>
            </div>
        `;

        this.messagesEl.innerHTML = welcomeHtml;
    }

    /* ---------------------------------------------------------------------
     * Добавление сообщений в ленту
     * ------------------------------------------------------------------- */
    appendUserMessage(text, attachObj) {
        let fileSnippet = '';
        if (attachObj) {
            const icon = attachObj.isImage ? 'image' : 'description';
            let preview = '';
            if (attachObj.isImage && attachObj.dataUrl) {
                preview = `<div class="msg-file-thumb"><img src="${attachObj.dataUrl}" alt="${escapeHtml(attachObj.name)}" /></div>`;
            }
            fileSnippet = `
                <div class="msg-attached-card">
                    <div class="msg-attached-head">
                        <span class="material-symbols-outlined">${icon}</span>
                        <span class="msg-attached-name">${escapeHtml(attachObj.name)}</span>
                        <span class="msg-attached-size">${formatBytes(attachObj.size)}</span>
                    </div>
                    ${preview}
                </div>
            `;
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = 'cosmo-chat-msg cosmo-chat-msg-user';
        msgDiv.innerHTML = `
            <div class="msg-avatar">
                <span class="material-symbols-outlined">person</span>
            </div>
            <div class="msg-content">
                <div class="msg-author">Вы</div>
                <div class="msg-body">
                    ${fileSnippet}
                    <p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>
                </div>
            </div>
        `;

        this.messagesEl.appendChild(msgDiv);
        this.scrollToBottom();
    }

    appendBotMessage(markdownText) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'cosmo-chat-msg cosmo-chat-msg-bot';

        const parsedHtml = parseCosmoMarkdown(markdownText);

        // Если ответ похож на пост (содержит хэштеги или эмодзи/абзацы), добавляем кнопку копирования всего поста
        const isPostDraft = /#[а-яёa-z0-9_]+/i.test(markdownText) || markdownText.length > 120;
        const copyActionBtn = isPostDraft ? `
            <div class="msg-actions">
                <button type="button" class="cosmo-chat-action-btn" data-copy-post="${escapeHtml(markdownText)}">
                    <span class="material-symbols-outlined">content_copy</span> Скопировать текст поста
                </button>
            </div>
        ` : '';

        msgDiv.innerHTML = `
            <div class="msg-avatar">
                <img src="assets/images/mascot/robot_smile.png?v=4.19.0" alt="Космо" />
            </div>
            <div class="msg-content">
                <div class="msg-author">Космо • SMM-гуру</div>
                <div class="msg-body">
                    ${parsedHtml}
                </div>
                ${copyActionBtn}
            </div>
        `;

        this.messagesEl.appendChild(msgDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'cosmo-chat-msg cosmo-chat-msg-bot cosmo-chat-typing-msg';
        typingDiv.setAttribute('data-typing-indicator', '');

        typingDiv.innerHTML = `
            <div class="msg-avatar">
                <img src="assets/images/mascot/robot_thinking.png?v=4.19.0" alt="Космо думает" class="avatar-pulse" />
            </div>
            <div class="msg-content">
                <div class="msg-author">Космо генерирует ответ...</div>
                <div class="msg-body">
                    <div class="cosmo-chat-typing">
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                        <span class="typing-text">Квантовые нейроны советуются с классиками литературы...</span>
                    </div>
                </div>
            </div>
        `;

        this.messagesEl.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const el = this.messagesEl.querySelector('[data-typing-indicator]');
        if (el) el.remove();
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            if (this.messagesEl) {
                this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
            }
        });
    }

    /* ---------------------------------------------------------------------
     * Формирование системного промпта Космо со знанием реального сканирования
     * ------------------------------------------------------------------- */
    buildCosmoSystemPrompt() {
        let statsContext = 'Данные сканирования пока не собраны (сканирование не запускалось). Предложи пользователю запустить поиск по стене.';

        if (this.mascot && typeof this.mascot.getLiveScanStats === 'function') {
            const stats = this.mascot.getLiveScanStats();
            if (stats && stats.count > 0) {
                statsContext = `
РЕАЛЬНЫЕ ДАННЫЕ ТЕКУЩЕГО СКАНИРОВАНИЯ БИБЛИОТЕК ВЛАДИМИРА:
- Всего просканировано филиалов: ${stats.count}
- Всего найдено постов: ${stats.totalPosts || 'несколько'}
- Сумма просмотров: ${stats.totalViews.toLocaleString('ru-RU')}
- Сумма лайков: ${stats.totalLikes.toLocaleString('ru-RU')}
- Сумма репостов: ${stats.totalReposts.toLocaleString('ru-RU')}
- Сумма комментариев: ${stats.totalComments.toLocaleString('ru-RU')}
- Абсолютный лидер по просмотрам: ${stats.topByViews ? `${stats.topByViews.name} (${stats.topByViews.views.toLocaleString('ru-RU')} просмотров)` : 'нет'}
- Лидер по вовлечённости (ER): ${stats.topByER ? `${stats.topByER.name} (ER ${stats.topByER.erPost}%)` : 'нет'}
- Средний показатель ER по сети: ${stats.avgER}%
- Филиалы с нулевой активностью в данном периоде: ${stats.zeroPostsCount || 0}
`;
            }
        }

        return `Ты — Космо (Cosmo), интерактивный робот-маскот AURORA, библиотечный ИИ-ассистент и величайший SMM-гуру галактики ВКонтакте.

МИССИЯ:
1. Помогать методистам и сотрудникам библиотек города Владимира вести сообщества ВКонтакте на высшем уровне.
2. Писать вовлекающие, живые, стильные посты для ВК: книжные подборки, анонсы лекций, встреч, клубов, мастер-классов, викторины, цитаты, обзоры.
3. Анализировать активность и показатели групп ВК, опираясь ТОЛЬКО на реальные данные сканирования.
4. Анализировать прикреплённые пользователем файлы (черновики постов, тексты, статистические отчёты, CSV/JSON, изображения) и давать конкретную пользу.

ХАРАКТЕР И ТОНАЛЬНОСТЬ:
- Ты весёлый, озорной, в меру ироничный, интеллигентный и начитанный робот.
- С юмором относишься к шаблонным канцеляризмам («В стенах нашего уютного учреждения состоялось мероприятие...» — категорически запрещено!).
- Учишь писать современным, человечным языком, который цепляет с первой строчки (Hook), удерживает внимание и побуждает оставить комментарий или прийти за книгой.
- Подбираешь 3–5 точных, релевантных хэштегов (без спама сорока метками).
- Если тебя просят написать пост — оформляй его готовым к публикации (с цепляющим заголовком, абзацами, эмодзи в меру, интерактивом и призывом к действию).

КОНТЕКСТ ДАННЫХ:
${statsContext}

ПРАВИЛО ТОЧНОСТИ:
- Любые цифры по филиалам и статистике бери ТОЛЬКО из предоставленного контекста сканирования. Никогда не выдумывай несуществующие показатели. Если данных нет — честно скажи об этом и посоветуй запустить сканирование.
- Форматируй ответы с красивой структурой Markdown: используй заголовки, списки, выделения жирным и цитаты.`;
    }

    /* ---------------------------------------------------------------------
     * Отправка запроса в ИИ
     * ------------------------------------------------------------------- */
    async handleSend() {
        const text = (this.inputEl.value || '').trim();
        const attach = this.attachedFile;

        if ((!text && !attach) || this.isBusy) return;

        this.inputEl.value = '';
        this.inputEl.style.height = 'auto';
        this.clearAttachedFile();

        // Добавляем сообщение пользователя в UI
        this.appendUserMessage(text || '(Прикреплён файл для анализа)', attach);

        // Формируем контент для запроса к ИИ
        let userContent = text;
        if (attach) {
            if (attach.textContent) {
                userContent = `[Прикреплён текстовый файл: "${attach.name}" (${formatBytes(attach.size)})]:\n\`\`\`\n${attach.textContent}\n\`\`\`\n\n${text || 'Проанализируй этот файл, оцени текст и дай рекомендации.'}`;
            } else if (attach.isImage) {
                userContent = `[Прикреплено изображение: "${attach.name}" (${formatBytes(attach.size)})]:\n${text || 'Помоги составить вовлекающий пост к этой фотографии/иллюстрации для группы библиотеки.'}`;
            } else {
                userContent = `[Прикреплён документ: "${attach.name}" (${formatBytes(attach.size)})]:\n${text || 'Изучи этот документ и подскажи, как адаптировать его для публикаций в ВК.'}`;
            }
        }

        // Сохраняем в историю диалога
        this.messages.push({ role: 'user', content: userContent });

        this.isBusy = true;
        this.sendBtnEl.disabled = true;
        this.showTypingIndicator();

        if (this.mascot) {
            this.mascot.setState('thinking');
        }

        try {
            const systemPrompt = this.buildCosmoSystemPrompt();

            // Берём последние 12 реплик для контекста диалога
            const history = this.messages.slice(-12).map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...history
                    ],
                    max_tokens: 2200,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errJson = await response.json().catch(() => null);
                throw new Error((errJson && errJson.error && errJson.error.error_msg) || `HTTP ${response.status}`);
            }

            const data = await response.json();
            let replyText = '';

            if (data && data.choices && data.choices[0] && data.choices[0].message) {
                replyText = data.choices[0].message.content || '';
            } else {
                replyText = 'Хм, мои квантовые каналы вернули пустой ответ. Давай попробуем сформулировать вопрос ещё раз!';
            }

            this.hideTypingIndicator();
            this.messages.push({ role: 'assistant', content: replyText });
            this.appendBotMessage(replyText);

            if (this.mascot) {
                this.mascot.setState('smile');
                this.mascot.setMoodBadge('✨', 4000);
                if (this.audioEnabled && this.mascot.playVoice) {
                    this.mascot.playVoice('post_scan_8');
                }
            }

        } catch (err) {
            console.error('[CosmoChat] Ошибка запроса к ИИ:', err);
            this.hideTypingIndicator();

            const errorMsg = `Ой! Не удалось связаться с нейросетью: *${escapeHtml(err.message)}*.\n\nПроверь подключение к интернету или статус ИИ в настройках. Я всегда готов повторить попытку! 🛠️`;
            this.appendBotMessage(errorMsg);

            if (this.mascot) {
                this.mascot.setState('angry');
                this.mascot.setMoodBadge('⚠️', 4000);
            }
        } finally {
            this.isBusy = false;
            this.sendBtnEl.disabled = false;
        }
    }

    /* ---------------------------------------------------------------------
     * Копирование текста в буфер обмена с визуальным фидбэком
     * ------------------------------------------------------------------- */
    copyToClipboard(text, btnEl, successLabel = 'Скопировано! ✅') {
        if (!text) return;
        const doCopy = (val) => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(val);
            }
            const ta = document.createElement('textarea');
            ta.value = val;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            return Promise.resolve();
        };

        doCopy(text).then(() => {
            if (btnEl) {
                const origHtml = btnEl.innerHTML;
                btnEl.innerHTML = `<span class="material-symbols-outlined">check</span> ${successLabel}`;
                btnEl.classList.add('is-copied');
                setTimeout(() => {
                    btnEl.innerHTML = origHtml;
                    btnEl.classList.remove('is-copied');
                }, 2200);
            }
        });
    }
}

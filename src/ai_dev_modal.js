/**
 * src/ai_dev_modal.js — AI Dev Hub: База знаний и ресурсы для ИИ-разработчиков
 * =============================================================================
 * Полнофункциональный ES-модуль для платформы AURORA (Cyber-Glassmorphism):
 *   • 1) Бесплатные ИИ (топовые чаты и песочницы: Arena, Qwen, DeepSeek, Z.AI, HF, Perplexity, OpenRouter)
 *   • 2) MCP (Model Context Protocol: спецификация, каталоги, топ серверов, конфиги Claude & Antigravity)
 *   • 3) Skills (Агентные навыки: архитектура SKILL.md, репозитории, промпты, готовые шаблоны)
 *   • 4) GitHub-репозитории (Claude Code, Aider, Roo-Code/Cline, Ollama, vLLM, Awesome Prompts)
 *   • 5) Практический гайд (Planning Mode, Subagents, проверка синтаксиса node/php, экономия токенов)
 *   • Быстрый поиск в реальном времени, подсветка, копирование ссылок и конфигов
 *   • Поддержка светлой и тёмной тем, горячие клавиши (Esc, /)
 *
 * Разработка: AURORA Core Team (Lead Fullstack Dev)
 * =============================================================================
 */

let modalOverlayEl = null;
let searchInputEl = null;
let clearBtnEl = null;
let searchCounterEl = null;
let tabBtns = [];
let tabPanels = [];
let emptyStateEl = null;
let currentActiveTab = 'free-ai';
let currentSearchQuery = '';
let currentSubfilter = 'all';

// Вспомогательная функция копирования в буфер обмена
export async function copyToClipboard(text, triggerBtn = null, successMsg = 'Скопировано в буфер обмена!') {
    let success = false;
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            success = true;
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            ta.style.top = '-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            success = document.execCommand('copy');
            document.body.removeChild(ta);
        }
    } catch (err) {
        console.warn('[AI Dev Hub] Clipboard copy failed:', err);
    }

    if (success && triggerBtn) {
        const originalHtml = triggerBtn.innerHTML;
        triggerBtn.classList.add('is-copied');
        const icon = triggerBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'check';

        setTimeout(() => {
            triggerBtn.classList.remove('is-copied');
            triggerBtn.innerHTML = originalHtml;
        }, 2000);
    }

    if (success && typeof window.showToast === 'function') {
        window.showToast(successMsg, 'check_circle', 2800);
    }
    return success;
}

/**
 * Рендеринг HTML разметки модального окна AI Dev Hub
 */
export function getAiDevModalHtml() {
    return `
    <div class="ai-dev-dialog" role="document">
        <!-- Шапка с маскотом Космо -->
        <header class="ai-dev-header">
            <div class="ai-dev-header-inner">
                <div class="ai-dev-header-left">
                    <div class="ai-dev-cosmo-avatar" title="Космо — научный ассистент AURORA">
                        <img src="assets/images/mascot/robot_idea.png?v=4.63.0" alt="Космо Робот" class="ai-dev-cosmo-img" />
                    </div>
                    <div class="ai-dev-title-block">
                        <div class="ai-dev-title-row">
                            <h2 id="ai-dev-modal-title" class="ai-dev-title">База знаний и ресурсы для ИИ-разработчиков</h2>
                            <span class="ai-dev-hub-badge">
                                <span class="ai-dev-badge-pulse-dot"></span>
                                AI DEV HUB • AURORA
                            </span>
                        </div>
                        <p class="ai-dev-subtitle">
                            Флагманские нейросети, протоколы MCP, агентные навыки Skills, открытые репозитории и гайды от Космо
                        </p>
                    </div>
                </div>
                <button type="button" class="ai-dev-close-btn" data-aidev-close title="Закрыть окно (Esc)">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        </header>

        <!-- Строка мгновенного поиска -->
        <div class="ai-dev-search-bar">
            <div class="ai-dev-search-input-wrap">
                <span class="material-symbols-outlined ai-dev-search-icon">search</span>
                <input
                    type="text"
                    class="ai-dev-search-input"
                    data-aidev-search
                    placeholder="Быстрый поиск ресурсов, моделей, MCP-серверов, навыков Skills или команд..."
                    autocomplete="off"
                    spellcheck="false"
                />
                <button type="button" class="ai-dev-clear-btn hidden" data-aidev-clear title="Очистить поиск">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="ai-dev-search-counter" data-aidev-counter>
                <span class="material-symbols-outlined" style="font-size: 16px;">explore</span>
                <span class="counter-text">Все ресурсы активны</span>
            </div>
        </div>

        <!-- Навигационные вкладки -->
        <nav class="ai-dev-tabs-bar" role="tablist" aria-label="Разделы базы знаний">
            <button type="button" class="ai-dev-tab-btn active" data-tab-target="free-ai" role="tab" aria-selected="true">
                <span class="material-symbols-outlined">smart_toy</span>
                <span>Бесплатные ИИ</span>
                <span class="ai-dev-tab-count" data-tab-count="free-ai">56</span>
            </button>
            <button type="button" class="ai-dev-tab-btn" data-tab-target="mcp" role="tab" aria-selected="false">
                <span class="material-symbols-outlined">bolt</span>
                <span>MCP Серверы</span>
                <span class="ai-dev-tab-count" data-tab-count="mcp">11</span>
            </button>
            <button type="button" class="ai-dev-tab-btn" data-tab-target="skills" role="tab" aria-selected="false">
                <span class="material-symbols-outlined">psychology</span>
                <span>Агентные Skills</span>
                <span class="ai-dev-tab-count" data-tab-count="skills">8</span>
            </button>
            <button type="button" class="ai-dev-tab-btn" data-tab-target="repos" role="tab" aria-selected="false">
                <span class="material-symbols-outlined">terminal</span>
                <span>GitHub Репозитории</span>
                <span class="ai-dev-tab-count" data-tab-count="repos">8</span>
            </button>
            <button type="button" class="ai-dev-tab-btn" data-tab-target="guide" role="tab" aria-selected="false">
                <span class="material-symbols-outlined">rocket_launch</span>
                <span>Практический гайд</span>
                <span class="ai-dev-tab-count" data-tab-count="guide">4</span>
            </button>
        </nav>

        <!-- Тело со вкладками -->
        <main class="ai-dev-body">
            <!-- ========================================================
                 ВКЛАДКА 1: БЕСПЛАТНЫЕ ИИ (ЧАТЫ И ПЕСОЧНИЦЫ)
                 ======================================================== -->
            <section class="ai-dev-tab-panel active" id="tab-free-ai" role="tabpanel" data-tab-panel="free-ai">
                <div class="ai-dev-intro-banner">
                    <div class="ai-dev-intro-icon">
                        <span class="material-symbols-outlined">token</span>
                    </div>
                    <div class="ai-dev-intro-content">
                        <h3 class="ai-dev-intro-title">Топовые бесплатные чаты, арены и песочницы LLM</h3>
                        <p class="ai-dev-intro-desc">
                            Подборка лучших сервисов для прямого общения, слепых баттлов моделей, генерации сложного кода и веб-поиска без платных подписок. Используйте для генерации архитектурных решений, прототипирования и парного программирования.
                        </p>
                    </div>
                </div>

                <!-- Быстрые фильтры по направлениям инструментов -->
                <div class="ai-dev-subchips-bar" data-subfilter-bar>
                    <button type="button" class="ai-dev-subchip active" data-subfilter="all">Все ресурсы (56)</button>
                    <button type="button" class="ai-dev-subchip" data-subfilter="chat">Чат-боты и Reasoning (14)</button>
                    <button type="button" class="ai-dev-subchip" data-subfilter="api">Быстрый API-инференс (10)</button>
                    <button type="button" class="ai-dev-subchip" data-subfilter="ide">ИИ-IDE и Кодинг (11)</button>
                    <button type="button" class="ai-dev-subchip" data-subfilter="local">Локальные LLM (8)</button>
                    <button type="button" class="ai-dev-subchip" data-subfilter="prompt">Промпты и Рейтинги (8)</button>
                    <button type="button" class="ai-dev-subchip" data-subfilter="rag">Векторные БД и RAG (5)</button>
                </div>

                <div class="ai-dev-grid">
                    <!-- LMSYS Chatbot Arena -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="lmsys arena blind battle gpt-4o claude 3.5 gemini deepseek r1 leaderboard elo">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">swords</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">LMSYS Chatbot Arena</h4>
                                        <span class="ai-dev-tag tag-amber">БАТТЛЫ</span>
                                    </div>
                                    <span class="ai-dev-card-host">arena.ai • chat.lmsys.org</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Главная независимая площадка для слепых баттлов всех флагманских LLM (GPT-4o, Claude 3.5 Sonnet, Gemini 2.0, DeepSeek R1). Режимы анонимного A/B сравнения ответов, прямой выбор моделей и глобальный Elo-лидерборд.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">Blind A/B Test</span>
                                <span class="ai-dev-tag tag-purple">Elo Leaderboard</span>
                                <span class="ai-dev-tag">Side-by-Side</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://arena.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть LMSYS Chatbot Arena</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://arena.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Qwen Chat (Alibaba) -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="qwen chat alibaba coder 32b 72b max 128k context artifacts code">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">code</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Qwen Chat (Alibaba)</h4>
                                        <span class="ai-dev-tag tag-cyan">ТОП КОДИНГ</span>
                                    </div>
                                    <span class="ai-dev-card-host">chat.qwen.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Официальный бесплатный веб-чат к флагманским моделям Alibaba Cloud. Включает Qwen 2.5 Coder 32B/72B (одна из сильнейших открытых моделей программирования), контекст до 128k токенов, артефакты и анализ файлов.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">Qwen 2.5 Coder</span>
                                <span class="ai-dev-tag tag-purple">128k Context</span>
                                <span class="ai-dev-tag">Artifacts</span>
                                <span class="ai-dev-tag tag-green">Без лимитов</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://chat.qwen.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Qwen Chat</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://chat.qwen.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- DeepSeek Chat -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="deepseek chat r1 v3 reasoning chain-of-thought cot code open source free">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-blue">
                                    <span class="material-symbols-outlined">neurology</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">DeepSeek Chat</h4>
                                        <span class="ai-dev-tag tag-purple">REASONING SOTA</span>
                                    </div>
                                    <span class="ai-dev-card-host">chat.deepseek.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Революционный сервис с моделями DeepSeek-V3 и DeepSeek-R1. Открытое рассуждение (Chain-of-Thought) мирового уровня, глубокий архитектурный анализ кода, поиск в реальном интернете и моментальный отклик.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">DeepSeek-R1</span>
                                <span class="ai-dev-tag tag-cyan">DeepSeek-V3</span>
                                <span class="ai-dev-tag">Deep Reasoning</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://chat.deepseek.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть DeepSeek Chat</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://chat.deepseek.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Z.AI / GLM (Zhipu AI) -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="z.ai glm-4 glm-zero zhipu ai china search artifacts multimodal">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple">
                                    <span class="material-symbols-outlined">psychology_alt</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Z.AI / GLM (Zhipu AI)</h4>
                                        <span class="ai-dev-tag tag-purple">GLM-4 / ZERO</span>
                                    </div>
                                    <span class="ai-dev-card-host">chat.z.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Флагманская платформа от китайской лаборатории Zhipu AI. Доступ к семейству моделей GLM-4, GLM-4-Plus и GLM-Zero. Отличный анализ кодовых баз, встроенный веб-поиск, визуализация и генерация алгоритмов.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">GLM-4 Plus</span>
                                <span class="ai-dev-tag tag-cyan">GLM-Zero</span>
                                <span class="ai-dev-tag">Web Search</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://chat.z.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Z.AI / GLM</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://chat.z.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Kimi (Moonshot AI) -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="kimi moonshot ai 2m context pdf long context reasoning k1.5 documents">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">auto_stories</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Kimi (Moonshot AI)</h4>
                                        <span class="ai-dev-tag tag-cyan">2M КОНТЕКСТ</span>
                                    </div>
                                    <span class="ai-dev-card-host">kimi.com • kimi.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Абсолютный чемпион по удержанию сверхдлинного контекста до 2 000 000 токенов. Позволяет загружать целые репозитории, технические регламенты и толстые PDF со мгновенным поиском фактов и reasoning-моделью Kimi k1.5.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">2M Tokens</span>
                                <span class="ai-dev-tag tag-purple">Kimi k1.5</span>
                                <span class="ai-dev-tag">Docs & Repos</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://www.kimi.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Kimi</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://www.kimi.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Le Chat (Mistral AI) -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="mistral le chat codestral pixtral mistral large canvas web search france">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">brush</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Le Chat (Mistral AI)</h4>
                                        <span class="ai-dev-tag tag-amber">CODESTRAL 2501</span>
                                    </div>
                                    <span class="ai-dev-card-host">chat.mistral.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Флагманский европейский веб-чат от Mistral AI. Предоставляет свободный доступ к Codestral (ноябрь 2024/2025), Mistral Large 2, Pixtral для зрения, живому веб-поиску и встроенному интерактивному холсту Canvas.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">Codestral 2501</span>
                                <span class="ai-dev-tag tag-cyan">Mistral Large 2</span>
                                <span class="ai-dev-tag">Canvas Холст</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://chat.mistral.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Le Chat</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://chat.mistral.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Perplexity AI -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="perplexity ai search live citations web academic writing research">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">search</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Perplexity AI</h4>
                                        <span class="ai-dev-tag tag-cyan">ИИ ПОИСК</span>
                                    </div>
                                    <span class="ai-dev-card-host">perplexity.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Интеллектуальная диалоговая поисковая система нового поколения. Мгновенные ответы на сложные инженерные вопросы со ссылками на первоисточники, GitHub, научные статьи и документацию в реальном времени.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">Live Web Search</span>
                                <span class="ai-dev-tag tag-purple">Citations</span>
                                <span class="ai-dev-tag">Academic Mode</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://www.perplexity.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Perplexity AI</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://www.perplexity.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Phind for Developers -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="phind search developers programming code stackoverflow github documentation">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-blue">
                                    <span class="material-symbols-outlined">terminal</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Phind for Developers</h4>
                                        <span class="ai-dev-tag tag-blue">DEV SEARCH</span>
                                    </div>
                                    <span class="ai-dev-card-host">phind.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Специализированный поисковый движок и чат-ассистент, оптимизированный исключительно для разработчиков. Индексирует свежую документацию библиотек, объясняет стек-трейсы ошибок и генерирует рабочие сниппеты.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-blue">Dev Search Engine</span>
                                <span class="ai-dev-tag tag-cyan">Code Context</span>
                                <span class="ai-dev-tag">VS Code Extension</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://www.phind.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Phind for Developers</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://www.phind.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Claude.ai (Anthropic) -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="claude ai anthropic sonnet 3.5 haiku artifacts coding architecture">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">psychology</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Claude.ai (Anthropic)</h4>
                                        <span class="ai-dev-tag tag-amber">SONNET 3.5</span>
                                    </div>
                                    <span class="ai-dev-card-host">claude.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Официальный веб-интерфейс к Claude 3.5 Sonnet и Haiku от Anthropic. Золотой стандарт качества программного кода, глубокого контекстного понимания, редактирования текстов и интерактивных визуальных артефактов.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">Claude 3.5 Sonnet</span>
                                <span class="ai-dev-tag tag-purple">Artifacts</span>
                                <span class="ai-dev-tag">Project Knowledge</span>
                                <span class="ai-dev-tag tag-green">Базовый доступ</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Claude.ai</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://claude.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- ChatGPT (OpenAI) -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="chatgpt openai gpt-4o o3-mini o1 canvas python reasoning">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald">
                                    <span class="material-symbols-outlined">chat</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">ChatGPT (OpenAI)</h4>
                                        <span class="ai-dev-tag tag-green">GPT-4o & o3</span>
                                    </div>
                                    <span class="ai-dev-card-host">chatgpt.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Официальный чат OpenAI. В бесплатном тарифе доступна новейшая модель GPT-4o, reasoning-модель o3-mini для глубоких математических и алгоритмических задач, загрузка файлов и визуальный редактор кода Canvas.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-green">GPT-4o</span>
                                <span class="ai-dev-tag tag-purple">o3-mini Reasoning</span>
                                <span class="ai-dev-tag">Canvas</span>
                                <span class="ai-dev-tag tag-green">Free Tier</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть ChatGPT</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://chatgpt.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Microsoft Copilot -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="microsoft copilot gpt-4o bing search designer dall-e free">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-blue">
                                    <span class="material-symbols-outlined">smart_toy</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Microsoft Copilot</h4>
                                        <span class="ai-dev-tag tag-blue">MICROSOFT</span>
                                    </div>
                                    <span class="ai-dev-card-host">copilot.microsoft.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Бесплатный корпоративный ассистент от Microsoft на базе GPT-4o. Включает неограниченный веб-поиск по Bing, генерацию изображений через Designer (DALL-E 3), анализ веб-страниц и плагины без подписки.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-blue">GPT-4o Free</span>
                                <span class="ai-dev-tag tag-cyan">Bing Search</span>
                                <span class="ai-dev-tag">Image Gen</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://copilot.microsoft.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Microsoft Copilot</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://copilot.microsoft.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- DuckDuckGo AI Chat -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="duckduckgo ai chat anonymous private no logs claude gpt-4o llama free">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald">
                                    <span class="material-symbols-outlined">shield</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">DuckDuckGo AI Chat</h4>
                                        <span class="ai-dev-tag tag-green">100% ПРИВАТНО</span>
                                    </div>
                                    <span class="ai-dev-card-host">duckduckgo.com/chat</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Анонимный чат без регистрации, сбора логов и привязки IP. Предоставляет бесплатный доступ к Claude 3 Haiku, GPT-4o mini, Llama 3.3 70B и Mixtral 8x7B с гарантией того, что данные не обучают модели.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-green">No Signup</span>
                                <span class="ai-dev-tag tag-cyan">Claude 3 Haiku</span>
                                <span class="ai-dev-tag tag-purple">Llama 3.3 70B</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://duckduckgo.com/chat" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть DuckDuckGo AI Chat</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://duckduckgo.com/chat" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Яндекс Нейро -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="yandex neuro ya.ru нейро поиск yandexgpt рунет суммаризация">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">travel_explore</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Яндекс Нейро</h4>
                                        <span class="ai-dev-tag tag-amber">НЕЙРОПОИСК</span>
                                    </div>
                                    <span class="ai-dev-card-host">ya.ru</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Объединение поисковой машины Яндекса и языковой модели YandexGPT. Изучает сотни источников в Рунете и мире в реальном времени, объединяя их в один понятный фактологический ответ с гиперссылками.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">YandexGPT</span>
                                <span class="ai-dev-tag tag-cyan">Живой Рунет</span>
                                <span class="ai-dev-tag">Источники</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://ya.ru" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Яндекс Нейро</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://ya.ru" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Яндекс 300 (Краткий пересказ) -->
                    <article class="ai-dev-card" data-subcat="chat" data-keywords="300 ya ru yandex краткий пересказ выжимка статей youtube видео тезисы">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">format_list_bulleted</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Яндекс 300 (Краткий пересказ)</h4>
                                        <span class="ai-dev-tag tag-amber">ТЕЗИСЫ</span>
                                    </div>
                                    <span class="ai-dev-card-host">300.ya.ru</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Бесплатный сервис мгновенной выжимки ключевых мыслей из длинных статей, технической документации, англоязычных публикаций и любых видео на YouTube по ссылке или вставленному тексту.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">Суммаризация</span>
                                <span class="ai-dev-tag tag-purple">YouTube видео</span>
                                <span class="ai-dev-tag">Ключевые тезисы</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://300.ya.ru" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Яндекс 300</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://300.ya.ru" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Google AI Studio -->
                    <article class="ai-dev-card" data-subcat="api" data-keywords="google ai studio gemini 2.0 flash pro 2m context multimodal api free">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">developer_board</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Google AI Studio</h4>
                                        <span class="ai-dev-tag tag-cyan">2M ТОКЕНОВ</span>
                                    </div>
                                    <span class="ai-dev-card-host">aistudio.google.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Официальная веб-студия для экспериментов с Gemini 2.0 Flash, Gemini 1.5 Pro и Thinking-моделями. Включает бесплатный API-ключ с гигантским контекстом до 2 млн токенов, structured JSON и вызовом функций.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">Gemini 2.0 Flash</span>
                                <span class="ai-dev-tag tag-purple">2M Context</span>
                                <span class="ai-dev-tag">Free API Key</span>
                                <span class="ai-dev-tag tag-green">Щедрый Free Tier</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Google AI Studio</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://aistudio.google.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Groq Cloud Console -->
                    <article class="ai-dev-card" data-subcat="api" data-keywords="groq console lpu ultra fast speed inference 500 tokens llama mistral deepseek">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">speed</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Groq Cloud Console</h4>
                                        <span class="ai-dev-tag tag-amber">500+ ТОК/СЕК</span>
                                    </div>
                                    <span class="ai-dev-card-host">console.groq.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Сверхбыстрый инференс открытых моделей на чипах Groq LPU (Language Processing Unit). Мгновенная генерация ответов со скоростью свыше 500 токенов в секунду с бесплатным API-тарифом для Llama 3.3 70B и DeepSeek R1.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">Ultra Fast LPU</span>
                                <span class="ai-dev-tag tag-green">Llama 3.3 70B</span>
                                <span class="ai-dev-tag">Whisper v3</span>
                                <span class="ai-dev-tag tag-green">Free Tier</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Groq Cloud Console</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://console.groq.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Cerebras Inference Cloud -->
                    <article class="ai-dev-card" data-subcat="api" data-keywords="cerebras cloud wafer scale engine fastest inference lpu llama free api">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple">
                                    <span class="material-symbols-outlined">bolt</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Cerebras Inference Cloud</h4>
                                        <span class="ai-dev-tag tag-purple">2000+ ТОК/СЕК</span>
                                    </div>
                                    <span class="ai-dev-card-host">cloud.cerebras.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Мировой рекорд скорости инференса на гигантских чипах Wafer-Scale Engine 3 (WSE-3). Выдает до 2100 токенов/сек для Llama 3.1 8B и 450 токенов/сек для 70B. Бесплатный API ключ для разработчиков.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">2000+ tok/s</span>
                                <span class="ai-dev-tag tag-cyan">WSE-3 Chip</span>
                                <span class="ai-dev-tag">Llama 3.1 70B</span>
                                <span class="ai-dev-tag tag-green">Free API</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://cloud.cerebras.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Cerebras Inference Cloud</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://cloud.cerebras.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- SambaNova Cloud -->
                    <article class="ai-dev-card" data-subcat="api" data-keywords="sambanova cloud sn40l qwen 2.5 coder llama 3.3 70b fast free tier">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">memory</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">SambaNova Cloud</h4>
                                        <span class="ai-dev-tag tag-cyan">SN40L ЧИПЫ</span>
                                    </div>
                                    <span class="ai-dev-card-host">cloud.sambanova.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Облачный сервис на базе реконфигурируемых процессоров SN40L. Молниеносный инференс Qwen 2.5 Coder 32B, Llama 3.3 70B и DeepSeek-R1 с полным контекстом без урезания. Щедрые бесплатные лимиты.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">SN40L RDU</span>
                                <span class="ai-dev-tag tag-purple">Qwen 2.5 Coder</span>
                                <span class="ai-dev-tag">DeepSeek-R1</span>
                                <span class="ai-dev-tag tag-green">Free Tier</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://cloud.sambanova.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть SambaNova Cloud</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://cloud.sambanova.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- OpenRouter -->
                    <article class="ai-dev-card" data-subcat="api" data-keywords="openrouter api hub free pool gateway deepseek llama mistral routing">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple">
                                    <span class="material-symbols-outlined">hub</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">OpenRouter</h4>
                                        <span class="ai-dev-tag tag-purple">300+ МОДЕЛЕЙ</span>
                                    </div>
                                    <span class="ai-dev-card-host">openrouter.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Единый шлюз-агрегатор с OpenAI-совместимым API к сотням моделей мира. Содержит постоянно доступный бесплатный пул моделей с суффиксом \`:free\` (DeepSeek-R1, Llama 3.3, Qwen 2.5, Gemini Flash).
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">Unified API</span>
                                <span class="ai-dev-tag tag-cyan">:free Pool</span>
                                <span class="ai-dev-tag">Fallback Routing</span>
                                <span class="ai-dev-tag tag-green">Free Models</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть OpenRouter</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://openrouter.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Hugging Face Hub -->
                    <article class="ai-dev-card" data-subcat="api" data-keywords="hugging face hub transformers datasets spaces open source models weights">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">emoji_emotions</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Hugging Face Hub</h4>
                                        <span class="ai-dev-tag tag-amber">ГЛАВНЫЙ ХАБ</span>
                                    </div>
                                    <span class="ai-dev-card-host">huggingface.co</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Главный мировой репозиторий открытых весов, датасетов и нейросетевых приложений (Spaces). Бесплатный Serverless Inference API, запуск демо на CPU/GPU, библиотека Transformers и Hugging Face Chat.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">Open Source Hub</span>
                                <span class="ai-dev-tag tag-cyan">Inference API</span>
                                <span class="ai-dev-tag">Spaces Demo</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://huggingface.co" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Hugging Face Hub</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://huggingface.co" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Together AI -->
                    <article class="ai-dev-card" data-subcat="api" data-keywords="together ai cloud inference lora fine-tuning fast api open models">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">layers</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Together AI</h4>
                                        <span class="ai-dev-tag tag-cyan">100+ МОДЕЛЕЙ</span>
                                    </div>
                                    <span class="ai-dev-card-host">together.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Высокоскоростная облачная платформа для инференса и файн-тюнинга открытых моделей (Llama, DeepSeek, FLUX, Mixtral). Предоставляет стартовые бесплатные кредиты при регистрации и сверхнизкие задержки.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">High Speed API</span>
                                <span class="ai-dev-tag tag-purple">FLUX & Llama</span>
                                <span class="ai-dev-tag">Fine-tuning</span>
                                <span class="ai-dev-tag tag-green">Free Balance</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://www.together.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Together AI</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://www.together.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Fireworks AI -->
                    <article class="ai-dev-card" data-subcat="api" data-keywords="fireworks ai fast inference speculative decoding compound lora credits">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">local_fire_department</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Fireworks AI</h4>
                                        <span class="ai-dev-tag tag-amber">COMPOUND AI</span>
                                    </div>
                                    <span class="ai-dev-card-host">fireworks.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Инновационный облачный инференс, оптимизированный для составных ИИ-систем (Compound AI). Поддержка спекулятивного декодирования, LoRA на лету и бесплатный тестовый баланс для разработчиков.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">Speculative Engine</span>
                                <span class="ai-dev-tag tag-purple">LoRA Serving</span>
                                <span class="ai-dev-tag">Sub-second TTFT</span>
                                <span class="ai-dev-tag tag-green">Free Credits</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://fireworks.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Fireworks AI</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://fireworks.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- SiliconFlow (SiliconCloud) -->
                    <article class="ai-dev-card" data-subcat="api" data-keywords="siliconflow siliconcloud deepseek r1 v3 qwen flux china fast free tokens">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple">
                                    <span class="material-symbols-outlined">cloud_done</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">SiliconFlow (SiliconCloud)</h4>
                                        <span class="ai-dev-tag tag-purple">20M ТОКЕНОВ</span>
                                    </div>
                                    <span class="ai-dev-card-host">cloud.siliconflow.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Один из крупнейших азиатских облачных провайдеров инференса. Полная поддержка DeepSeek-R1, DeepSeek-V3, Qwen 2.5 Coder и генерации картинок FLUX. Дарит миллионы бесплатных токенов при регистрации.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">DeepSeek Official</span>
                                <span class="ai-dev-tag tag-cyan">20M Free Tokens</span>
                                <span class="ai-dev-tag">FLUX.1 Speed</span>
                                <span class="ai-dev-tag tag-green">Free API</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://cloud.siliconflow.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть SiliconFlow</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://cloud.siliconflow.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Glif — AI Workflow Hub -->
                    <article class="ai-dev-card" data-subcat="api" data-keywords="glif app visual workflows generator ai pipelines multimodal free">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald">
                                    <span class="material-symbols-outlined">widgets</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Glif — AI Workflow Hub</h4>
                                        <span class="ai-dev-tag tag-green">PIPELINES</span>
                                    </div>
                                    <span class="ai-dev-card-host">glif.app</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Визуальный конструктор и хаб мультимодальных ИИ-пайплайнов. Позволяет связывать текст, FLUX, Stable Diffusion, ComfyUI и скрейперы в готовые веб-микросервисы с бесплатным запуском через веб и API.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-green">Visual Pipelines</span>
                                <span class="ai-dev-tag tag-cyan">FLUX & LLM</span>
                                <span class="ai-dev-tag">API Export</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://glif.app" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Glif — AI Workflow Hub</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://glif.app" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Cursor AI Code Editor -->
                    <article class="ai-dev-card" data-subcat="ide" data-keywords="cursor ai code editor composer multi-file vscode ai pair programming">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">desktop_windows</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Cursor AI Code Editor</h4>
                                        <span class="ai-dev-tag tag-cyan">ТОП AI IDE</span>
                                    </div>
                                    <span class="ai-dev-card-host">cursor.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Самый признанный в индустрии редактор кода на базе VS Code с глубокой интеграцией ИИ. Режим Composer для редактирования нескольких файлов разом, индексация кодовой базы, умный Tab-автокомплит.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">Composer</span>
                                <span class="ai-dev-tag tag-purple">Codebase Index</span>
                                <span class="ai-dev-tag">VS Code Fork</span>
                                <span class="ai-dev-tag tag-green">Бесплатный план</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://www.cursor.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Cursor AI Code Editor</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://www.cursor.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Windsurf Editor (Codeium) -->
                    <article class="ai-dev-card" data-subcat="ide" data-keywords="windsurf codeium editor agent cascade flows ai autocomplete free">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">air</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Windsurf Editor (Codeium)</h4>
                                        <span class="ai-dev-tag tag-cyan">FLOWS & AGENT</span>
                                    </div>
                                    <span class="ai-dev-card-host">codeium.com/windsurf</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Агентная среда разработки нового поколения от команды Codeium. Технологии Flows и Cascade позволяют агенту действовать проактивно, непрерывно анализируя весь контекст репозитория. Бесплатный тариф без ограничений на автодополнение.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">Cascade Agent</span>
                                <span class="ai-dev-tag tag-purple">Flows Context</span>
                                <span class="ai-dev-tag">Codeium Engine</span>
                                <span class="ai-dev-tag tag-green">Free Tier</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://codeium.com/windsurf" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Windsurf Editor</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://codeium.com/windsurf" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Trae AI IDE (ByteDance) -->
                    <article class="ai-dev-card" data-subcat="ide" data-keywords="trae ai bytedance ide claude 3.5 sonnet gpt-4o builder mode free">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple">
                                    <span class="material-symbols-outlined">integration_instructions</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Trae AI IDE (ByteDance)</h4>
                                        <span class="ai-dev-tag tag-purple">100% БЕСПЛАТНО</span>
                                    </div>
                                    <span class="ai-dev-card-host">trae.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Бесплатная адаптивная ИИ-IDE от ByteDance на базе VS Code. Предоставляет бесплатный доступ к Claude 3.5 Sonnet и GPT-4o прямо в редакторе, включает автономный режим Builder для создания проектов с нуля.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">Claude 3.5 Free</span>
                                <span class="ai-dev-tag tag-cyan">GPT-4o Free</span>
                                <span class="ai-dev-tag">Builder Mode</span>
                                <span class="ai-dev-tag tag-green">100% Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://www.trae.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Trae AI IDE</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://www.trae.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Zed Editor -->
                    <article class="ai-dev-card" data-subcat="ide" data-keywords="zed dev editor rust fast 120fps ai assistant ollama claude open source">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">bolt</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Zed Editor</h4>
                                        <span class="ai-dev-tag tag-amber">RUST 120 FPS</span>
                                    </div>
                                    <span class="ai-dev-card-host">zed.dev</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Сверхбыстрый мультиплеерный редактор кода, написанный с нуля на Rust. Нативная поддержка AI Assistant (Anthropic Claude, OpenAI, Ollama, GitHub Copilot), мгновенный запуск и нулевой лаг при вводе.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">Rust Core</span>
                                <span class="ai-dev-tag tag-cyan">Local Ollama</span>
                                <span class="ai-dev-tag">Multiplayer</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://zed.dev" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Zed Editor</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://zed.dev" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Aider CLI -->
                    <article class="ai-dev-card" data-subcat="ide" data-keywords="aider chat cli terminal git pair programming autonomous architect python">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald">
                                    <span class="material-symbols-outlined">terminal</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Aider CLI</h4>
                                        <span class="ai-dev-tag tag-green">GIT AGENT</span>
                                    </div>
                                    <span class="ai-dev-card-host">aider.chat</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Ведущий опенсорсный терминальный парный программист. Лидирует в бенчмарках SWE-bench, автоматически формирует аккуратные Git-коммиты, поддерживает Architect Mode и работает с любой моделью по API или локально.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-green">Auto Git Commits</span>
                                <span class="ai-dev-tag tag-cyan">Architect Mode</span>
                                <span class="ai-dev-tag">SWE-bench Top</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://aider.chat" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Aider CLI</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://aider.chat" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Continue.dev -->
                    <article class="ai-dev-card" data-subcat="ide" data-keywords="continue dev vscode jetbrains copilot autocomplete ollama open source">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">extension</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Continue.dev</h4>
                                        <span class="ai-dev-tag tag-cyan">OPEN COPILOT</span>
                                    </div>
                                    <span class="ai-dev-card-host">continue.dev</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Открытое расширение для VS Code и JetBrains. Позволяет превратить любую локальную модель из Ollama или LM Studio в полноценный Copilot с автодополнением по Tab, кодовым чатом и быстрым рефакторингом.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">VS Code & JetBrains</span>
                                <span class="ai-dev-tag tag-purple">Ollama Native</span>
                                <span class="ai-dev-tag">Zero Telemetry</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://www.continue.dev" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Continue.dev</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://www.continue.dev" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Roo Code (Roo-Cline) -->
                    <article class="ai-dev-card" data-subcat="ide" data-keywords="roo code roo-cline cline vscode autonomous agent mcp architect role">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple">
                                    <span class="material-symbols-outlined">smart_toy</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Roo Code (Roo-Cline)</h4>
                                        <span class="ai-dev-tag tag-purple">AUTONOMOUS</span>
                                    </div>
                                    <span class="ai-dev-card-host">roocode.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Популярный автономный агент в виде расширения для VS Code (форк Cline). Поддерживает переключение между ролями (Code, Architect, Ask), подключение протоколов MCP, запуск bash-команд и умный контекст.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">Architect & Code</span>
                                <span class="ai-dev-tag tag-cyan">MCP Support</span>
                                <span class="ai-dev-tag">Terminal Exec</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://roocode.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Roo Code</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://roocode.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Bolt.new (StackBlitz) -->
                    <article class="ai-dev-card" data-subcat="ide" data-keywords="bolt new stackblitz in-browser webcontainers fullstack vite react npm live">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">flash_on</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Bolt.new (StackBlitz)</h4>
                                        <span class="ai-dev-tag tag-amber">IN-BROWSER DEV</span>
                                    </div>
                                    <span class="ai-dev-card-host">bolt.new</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Запуск полностековых веб-приложений (Vite, React, Node.js) прямо в браузере с технологией WebContainers. Агент пишет код, устанавливает npm-пакеты, запускает локальный сервер и дает live preview.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">WebContainers</span>
                                <span class="ai-dev-tag tag-cyan">Fullstack Node</span>
                                <span class="ai-dev-tag">Live Preview</span>
                                <span class="ai-dev-tag tag-green">Бесплатные токены</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://bolt.new" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Bolt.new</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://bolt.new" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- v0.dev by Vercel -->
                    <article class="ai-dev-card" data-subcat="ide" data-keywords="v0 dev vercel ui generator tailwind react next.js shadcn free credits">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald">
                                    <span class="material-symbols-outlined">brush</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">v0.dev by Vercel</h4>
                                        <span class="ai-dev-tag tag-green">UI GENERATOR</span>
                                    </div>
                                    <span class="ai-dev-card-host">v0.dev</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Генератор интерфейсов и компонентов от команды Vercel. Создает чистый код на React, Tailwind CSS и shadcn/ui по текстовому описанию или загруженному дизайн-макету с поддержкой копирования кода в 1 клик.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-green">shadcn/ui</span>
                                <span class="ai-dev-tag tag-cyan">Tailwind & React</span>
                                <span class="ai-dev-tag">Image to Code</span>
                                <span class="ai-dev-tag tag-green">Ежедневные кредиты</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://v0.dev" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть v0.dev by Vercel</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://v0.dev" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Lovable.dev -->
                    <article class="ai-dev-card" data-subcat="ide" data-keywords="lovable dev app builder react vite supabase github sync prototype mvp">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-pink">
                                    <span class="material-symbols-outlined">favorite</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Lovable.dev</h4>
                                        <span class="ai-dev-tag tag-pink">APP BUILDER</span>
                                    </div>
                                    <span class="ai-dev-card-host">lovable.dev</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Платформа визуального создания веб-приложений. Генерирует готовые полнофункциональные проекты на React/Vite с подключением базы Supabase, аутентификацией и двухсторонней синхронизацией с репозиторием GitHub.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-pink">React + Supabase</span>
                                <span class="ai-dev-tag tag-cyan">GitHub Sync</span>
                                <span class="ai-dev-tag">Rapid MVP</span>
                                <span class="ai-dev-tag tag-green">Бесплатный старт</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Lovable.dev</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://lovable.dev" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Replit -->
                    <article class="ai-dev-card" data-subcat="ide" data-keywords="replit cloud ide python nodejs ai agent deploy postgres hosting">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-blue">
                                    <span class="material-symbols-outlined">cloud_queue</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Replit</h4>
                                        <span class="ai-dev-tag tag-blue">CLOUD CODING</span>
                                    </div>
                                    <span class="ai-dev-card-host">replit.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Облачная среда программирования со встроенным агентным помощником. Поддерживает запуск Python, Node.js, Go, Rust, хранение секретов в .env, хостинг баз данных PostgreSQL и деплой веб-сервисов.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-blue">50+ Languages</span>
                                <span class="ai-dev-tag tag-cyan">Instant Deploy</span>
                                <span class="ai-dev-tag">Cloud Postgres</span>
                                <span class="ai-dev-tag tag-green">Free Tier</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://replit.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Replit</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://replit.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Ollama -->
                    <article class="ai-dev-card" data-subcat="local" data-keywords="ollama local models run gpu cpu llama deepseek qwen mistral open source">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">memory</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Ollama</h4>
                                        <span class="ai-dev-tag tag-cyan">LOCAL LLM SOTA</span>
                                    </div>
                                    <span class="ai-dev-card-host">ollama.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Индустриальный стандарт для локального запуска открытых языковых моделей (Llama 3.3, DeepSeek R1, Qwen 2.5, Mistral) одной командой в терминале. Включает нативный OpenAI-совместимый REST API сервер.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">CLI & Server</span>
                                <span class="ai-dev-tag tag-purple">GGUF Engine</span>
                                <span class="ai-dev-tag">GPU Acceleration</span>
                                <span class="ai-dev-tag tag-green">100% Free</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Ollama</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://ollama.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- LM Studio -->
                    <article class="ai-dev-card" data-subcat="local" data-keywords="lm studio lmstudio local gui gguf huggingface server offline free">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple">
                                    <span class="material-symbols-outlined">desktop_mac</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">LM Studio</h4>
                                        <span class="ai-dev-tag tag-purple">DESKTOP GUI</span>
                                    </div>
                                    <span class="ai-dev-card-host">lmstudio.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Красивое настольное приложение для поиска, скачивания и запуска GGUF-моделей прямо с Hugging Face. Включает встроенный локальный сервер на порту 1234 для подключения к Cursor, Continue и Aider.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">macOS/Win/Linux</span>
                                <span class="ai-dev-tag tag-cyan">Local API:1234</span>
                                <span class="ai-dev-tag">Model Discovery</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://lmstudio.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть LM Studio</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://lmstudio.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Jan.ai -->
                    <article class="ai-dev-card" data-subcat="local" data-keywords="jan ai open source chatgpt local offline privacy desktop gguf">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald">
                                    <span class="material-symbols-outlined">lock</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Jan.ai</h4>
                                        <span class="ai-dev-tag tag-green">LOCAL CHATGPT</span>
                                    </div>
                                    <span class="ai-dev-card-host">jan.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Полностью открытая, приватная и автономная замена ChatGPT для вашего компьютера. 100% офлайн, нулевая телеметрия, настраиваемый движок Cortex C++ и интеграция с локальными расширениями.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-green">100% Offline</span>
                                <span class="ai-dev-tag tag-cyan">Zero Telemetry</span>
                                <span class="ai-dev-tag">Cortex Engine</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://jan.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Jan.ai</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://jan.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Open WebUI -->
                    <article class="ai-dev-card" data-subcat="local" data-keywords="open-webui open webui self-hosted chat ui ollama rag pipelines docker">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-blue">
                                    <span class="material-symbols-outlined">web</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Open WebUI</h4>
                                        <span class="ai-dev-tag tag-blue">SELF-HOSTED UI</span>
                                    </div>
                                    <span class="ai-dev-card-host">openwebui.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Лучший веб-интерфейс для самостоятельного развертывания через Docker. Нативная интеграция с Ollama, загрузка документов для RAG-поиска, веб-поиск, голосовое управление и мультиюзерная авторизация.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-blue">Docker Ready</span>
                                <span class="ai-dev-tag tag-cyan">Built-in RAG</span>
                                <span class="ai-dev-tag">Voice & Vision</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://openwebui.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Open WebUI</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://openwebui.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- vLLM Production Serving -->
                    <article class="ai-dev-card" data-subcat="local" data-keywords="vllm inference serving pagedattention high throughput gpu production open source">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">dns</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">vLLM Production Serving</h4>
                                        <span class="ai-dev-tag tag-amber">PRODUCTION</span>
                                    </div>
                                    <span class="ai-dev-card-host">vllm.ai • docs.vllm.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Высокопроизводительная библиотека сервинга LLM для нагруженных продакшен-систем. Революционный алгоритм PagedAttention обеспечивает максимальную утилизацию видеопамяти и рекордную пропускную способность.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">PagedAttention</span>
                                <span class="ai-dev-tag tag-purple">Continuous Batching</span>
                                <span class="ai-dev-tag">Distributed GPU</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://vllm.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть vLLM Production Serving</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://vllm.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- llama.cpp (Georgi Gerganov) -->
                    <article class="ai-dev-card" data-subcat="local" data-keywords="llama.cpp gerganov gguf c++ local inference quantization cpu metal">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">terminal</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">llama.cpp (Georgi Gerganov)</h4>
                                        <span class="ai-dev-tag tag-cyan">C/C++ CORE</span>
                                    </div>
                                    <span class="ai-dev-card-host">github.com/ggerganov/llama.cpp</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Фундаментальный открытый проект, позволяющий запускать LLM с квантованием 4-bit/8-bit на обычных процессорах CPU и видеокартах Apple Silicon / NVIDIA. Лежит в основе Ollama, Jan и LM Studio.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">GGUF Format</span>
                                <span class="ai-dev-tag tag-purple">CPU Inference</span>
                                <span class="ai-dev-tag">Apple Metal</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://github.com/ggerganov/llama.cpp" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть llama.cpp</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://github.com/ggerganov/llama.cpp" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Text Generation WebUI -->
                    <article class="ai-dev-card" data-subcat="local" data-keywords="text generation webui oobabooga exl2 awq gptq gguf gradio lora">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple">
                                    <span class="material-symbols-outlined">settings_suggest</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Text Generation WebUI</h4>
                                        <span class="ai-dev-tag tag-purple">ALL FORMATS</span>
                                    </div>
                                    <span class="ai-dev-card-host">github.com/oobabooga/text-generation-webui</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Универсальный «швейцарский нож» (Oobabooga) для запуска весов моделей любых архитектур и квантований (GGUF, EXL2, AWQ, GPTQ, Hqq). Поддерживает загрузку LoRA-адаптеров, кастомные семплеры и плагины.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">EXL2 & AWQ</span>
                                <span class="ai-dev-tag tag-cyan">LoRA Loader</span>
                                <span class="ai-dev-tag">Gradio UI</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://github.com/oobabooga/text-generation-webui" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Text Generation WebUI</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://github.com/oobabooga/text-generation-webui" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- LocalAI -->
                    <article class="ai-dev-card" data-subcat="local" data-keywords="localai local ai self-hosted drop-in openai api audio vision tts cpu">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald">
                                    <span class="material-symbols-outlined">dns</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">LocalAI</h4>
                                        <span class="ai-dev-tag tag-green">OPENAI CLONE</span>
                                    </div>
                                    <span class="ai-dev-card-host">localai.io</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Свободная self-hosted замена OpenAI API без внешних облаков. Работает без видеокарты, поддерживает генерацию текста, транскрибацию Whisper, генерацию картинок и эмбеддинги для RAG.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-green">Drop-in API</span>
                                <span class="ai-dev-tag tag-cyan">Audio & TTS</span>
                                <span class="ai-dev-tag">No GPU Required</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://localai.io" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть LocalAI</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://localai.io" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- LearnPrompting.org -->
                    <article class="ai-dev-card" data-subcat="prompt" data-keywords="learn prompting guide course prompt engineering few-shot rag agents free">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">school</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">LearnPrompting.org</h4>
                                        <span class="ai-dev-tag tag-cyan">КУРС SOTA</span>
                                    </div>
                                    <span class="ai-dev-card-host">learnprompting.org</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Самый полный и авторитетный открытый интерактивный курс по промпт-инжинирингу. Охватывает как базовые техники (Zero-Shot, Few-Shot), так и продвинутый RAG, агентные паттерны и защиту от уязвимостей.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">Open Course</span>
                                <span class="ai-dev-tag tag-purple">RAG & Agents</span>
                                <span class="ai-dev-tag">Prompt Security</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://learnprompting.org" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть LearnPrompting.org</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://learnprompting.org" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Anthropic Prompt Library -->
                    <article class="ai-dev-card" data-subcat="prompt" data-keywords="anthropic prompt library claude official system prompts engineering code">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">library_books</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Anthropic Prompt Library</h4>
                                        <span class="ai-dev-tag tag-amber">ЭТАЛОН</span>
                                    </div>
                                    <span class="ai-dev-card-host">docs.anthropic.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Официальная коллекция проверенных промптов от исследователей Anthropic. Готовые рецепты для рефакторинга архитектуры, генерации юнит-тестов, анализа сложного кода и извлечения сущностей из текстов.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">Anthropic Official</span>
                                <span class="ai-dev-tag tag-purple">System Prompts</span>
                                <span class="ai-dev-tag">Code & Refactor</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://docs.anthropic.com/en/prompt-library/library" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Anthropic Prompt Library</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://docs.anthropic.com/en/prompt-library/library" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- OpenAI Cookbook -->
                    <article class="ai-dev-card" data-subcat="prompt" data-keywords="openai cookbook recipes python function calling embeddings rag fine-tuning">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald">
                                    <span class="material-symbols-outlined">menu_book</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">OpenAI Cookbook</h4>
                                        <span class="ai-dev-tag tag-green">РЕЦЕПТЫ КОДА</span>
                                    </div>
                                    <span class="ai-dev-card-host">cookbook.openai.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Официальная книга рецептов с тысячами строк готового рабочего кода на Python. Подробные инструкции по Function Calling, Structured Outputs, RAG, семантическому поиску и файн-тюнингу моделей.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-green">Python Recipes</span>
                                <span class="ai-dev-tag tag-cyan">Function Calling</span>
                                <span class="ai-dev-tag">RAG & Embeddings</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://cookbook.openai.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть OpenAI Cookbook</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://cookbook.openai.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Awesome ChatGPT Prompts -->
                    <article class="ai-dev-card" data-subcat="prompt" data-keywords="awesome chatgpt prompts f awesome-chatgpt-prompts prompt engineering collection roles">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple">
                                    <span class="material-symbols-outlined">auto_awesome</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Awesome ChatGPT Prompts</h4>
                                        <span class="ai-dev-tag tag-purple">115K+ ЗВЕЗД</span>
                                    </div>
                                    <span class="ai-dev-card-host">prompts.chat</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Легендарный репозиторий с сотнями готовых системных ролей («Действуй как Senior Fullstack Developer», «Действуй как Linux Terminal», «Действуй как UX Designer») для ChatGPT, Claude и открытых моделей.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">115k+ Stars</span>
                                <span class="ai-dev-tag tag-cyan">System Roles</span>
                                <span class="ai-dev-tag">Ready Prompts</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://prompts.chat" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Awesome ChatGPT Prompts</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://prompts.chat" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Artificial Analysis -->
                    <article class="ai-dev-card" data-subcat="prompt" data-keywords="artificial analysis benchmarks llm speed latency price quality leaderboard">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-blue">
                                    <span class="material-symbols-outlined">analytics</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Artificial Analysis</h4>
                                        <span class="ai-dev-tag tag-blue">НЕЗАВИСИМЫЕ ЗАМЕРЫ</span>
                                    </div>
                                    <span class="ai-dev-card-host">artificialanalysis.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Объективный бенчмарк-анализатор всех мировых провайдеров LLM. Интерактивные графики соотношения цены за 1M токенов, скорости генерации (токен/сек), качества моделей (Quality Index) и задержки TTFT.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-blue">Speed Benchmarks</span>
                                <span class="ai-dev-tag tag-cyan">Price per 1M</span>
                                <span class="ai-dev-tag">Latency TTFT</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://artificialanalysis.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Artificial Analysis</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://artificialanalysis.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Open LLM Leaderboard (HF) -->
                    <article class="ai-dev-card" data-subcat="prompt" data-keywords="open llm leaderboard hugging face benchmarks mmlu math gsm8k elo evaluation">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">leaderboard</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Open LLM Leaderboard (HF)</h4>
                                        <span class="ai-dev-tag tag-amber">ГЛОБАЛЬНЫЙ ТОП</span>
                                    </div>
                                    <span class="ai-dev-card-host">huggingface.co/spaces/open-llm-leaderboard</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Главный мировой научный рейтинг открытых языковых моделей от команды Hugging Face. Строгая проверка на бенчмарках MMLU-Pro, GSM8k, MATH, GPQA и IFEval с защитой от читерства и подгонки тестов.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">MMLU-Pro</span>
                                <span class="ai-dev-tag tag-purple">MATH & GSM8K</span>
                                <span class="ai-dev-tag">Hugging Face</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Open LLM Leaderboard</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Futurepedia -->
                    <article class="ai-dev-card" data-subcat="prompt" data-keywords="futurepedia directory ai tools catalog free filters software review">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">explore</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Futurepedia</h4>
                                        <span class="ai-dev-tag tag-cyan">КАТАЛОГ СЕРВИСОВ</span>
                                    </div>
                                    <span class="ai-dev-card-host">futurepedia.io</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Крупнейший регулярно обновляемый каталог инструментов искусственного интеллекта. Удобная сортировка по категориям (кодинг, дизайн, текст, аудио, маркетинг) и фильтр исключительно бесплатных инструментов.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">10 000+ Tools</span>
                                <span class="ai-dev-tag tag-purple">Daily Updates</span>
                                <span class="ai-dev-tag">Pricing Filters</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://www.futurepedia.io" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Futurepedia</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://www.futurepedia.io" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- There's An AI For That (TAAFT) -->
                    <article class="ai-dev-card" data-subcat="prompt" data-keywords="theres an ai for that taaft search ai directory tools tasks catalog">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple">
                                    <span class="material-symbols-outlined">travel_explore</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">There's An AI For That (TAAFT)</h4>
                                        <span class="ai-dev-tag tag-purple">20K+ НЕЙРОСЕТЕЙ</span>
                                    </div>
                                    <span class="ai-dev-card-host">theresanaiforthat.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Самый масштабный поисковик нейросетей в мире. Позволяет ввести любую прикладную рабочую задачу («автоматизация рефакторинга», «генерация тестов») и получить список проверенных специализированных инструментов.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">Task Search</span>
                                <span class="ai-dev-tag tag-cyan">Timeline AI</span>
                                <span class="ai-dev-tag">20 000+ AI</span>
                                <span class="ai-dev-tag tag-green">Бесплатно</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://theresanaiforthat.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть There's An AI For That</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://theresanaiforthat.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Qdrant Cloud -->
                    <article class="ai-dev-card" data-subcat="rag" data-keywords="qdrant cloud vector database rust rag embeddings similarity search free">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-pink">
                                    <span class="material-symbols-outlined">data_array</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Qdrant Cloud</h4>
                                        <span class="ai-dev-tag tag-pink">ВЕКТОРНАЯ БД</span>
                                    </div>
                                    <span class="ai-dev-card-host">qdrant.tech</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Сверхбыстрая векторная база данных с открытым исходным кодом, написанная на Rust. Предоставляет пожизненный бесплатный кластер в Qdrant Cloud (1GB RAM) для RAG-приложений, семантического и гибридного поиска.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-pink">Rust Powered</span>
                                <span class="ai-dev-tag tag-cyan">Free 1GB Cluster</span>
                                <span class="ai-dev-tag">Hybrid Search</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://qdrant.tech" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Qdrant Cloud</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://qdrant.tech" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Pinecone Serverless -->
                    <article class="ai-dev-card" data-subcat="rag" data-keywords="pinecone serverless vector database rag embeddings low latency free starter">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">database</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Pinecone Serverless</h4>
                                        <span class="ai-dev-tag tag-cyan">SERVERLESS DB</span>
                                    </div>
                                    <span class="ai-dev-card-host">pinecone.io</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Лидирующая облачная бессерверная векторная база данных. Включает бесплатный постоянный план Starter для разработчиков с мгновенным масштабированием и субсекундным временем отклика на миллионах векторов.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">Free Starter Tier</span>
                                <span class="ai-dev-tag tag-purple">Serverless</span>
                                <span class="ai-dev-tag">Ultra Low Latency</span>
                                <span class="ai-dev-tag tag-green">Free Tier</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://www.pinecone.io" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Pinecone Serverless</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://www.pinecone.io" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Chroma DB -->
                    <article class="ai-dev-card" data-subcat="rag" data-keywords="chroma trychroma embedded vector database python javascript rag local">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber">
                                    <span class="material-symbols-outlined">storage</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Chroma DB</h4>
                                        <span class="ai-dev-tag tag-amber">EMBEDDED DB</span>
                                    </div>
                                    <span class="ai-dev-card-host">trychroma.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Легковесная встраиваемая опенсорсная векторная база данных для Python и JavaScript. Разворачивается в 2 строчки кода прямо внутри вашего скрипта без необходимости администрировать внешние серверы.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">In-Memory / SQLite</span>
                                <span class="ai-dev-tag tag-cyan">Python & JS SDK</span>
                                <span class="ai-dev-tag">Local First</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://www.trychroma.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Chroma DB</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://www.trychroma.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- LangSmith (LangChain) -->
                    <article class="ai-dev-card" data-subcat="rag" data-keywords="langsmith langchain tracing debugging llmops agent testing evaluation free">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple">
                                    <span class="material-symbols-outlined">query_stats</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">LangSmith (LangChain)</h4>
                                        <span class="ai-dev-tag tag-purple">ОТЛАДКА И ТРЕЙСИНГ</span>
                                    </div>
                                    <span class="ai-dev-card-host">smith.langchain.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Платформа мониторинга и отладки агентных систем от LangChain. Позволяет визуализировать каждый шаг цепочки рассуждений LLM, замерять расход токенов, отслеживать ошибки и тестировать датасеты. Бесплатный Developer-план.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">Agent Tracing</span>
                                <span class="ai-dev-tag tag-cyan">Prompt Debugger</span>
                                <span class="ai-dev-tag">LLMOps</span>
                                <span class="ai-dev-tag tag-green">Free Tier</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://smith.langchain.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть LangSmith</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://smith.langchain.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- LlamaIndex -->
                    <article class="ai-dev-card" data-subcat="rag" data-keywords="llamaindex llama hub rag framework data connectors parsing retrieval agents">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald">
                                    <span class="material-symbols-outlined">account_tree</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">LlamaIndex</h4>
                                        <span class="ai-dev-tag tag-green">RAG FRAMEWORK</span>
                                    </div>
                                    <span class="ai-dev-card-host">llamaindex.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Ведущий фреймворк для обогащения LLM пользовательскими данными. Сотни готовых загрузчиков (LlamaHub) для парсинга PDF, баз данных, Notion, Slack и структурирования сложных индексов для вопросно-ответных систем.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-green">LlamaHub Connectors</span>
                                <span class="ai-dev-tag tag-cyan">Advanced RAG</span>
                                <span class="ai-dev-tag">Python & TS</span>
                                <span class="ai-dev-tag tag-green">Open Source</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://www.llamaindex.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть LlamaIndex</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://www.llamaindex.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>
                </div>
            </section>

            <!-- ========================================================
                 ВКЛАДКА 2: MCP (MODEL CONTEXT PROTOCOL)
                 ======================================================== -->
            <section class="ai-dev-tab-panel" id="tab-mcp" role="tabpanel" data-tab-panel="mcp">
                <div class="ai-dev-intro-banner">
                    <div class="ai-dev-intro-icon">
                        <span class="material-symbols-outlined">bolt</span>
                    </div>
                    <div class="ai-dev-intro-content">
                        <h3 class="ai-dev-intro-title">Model Context Protocol (MCP) — Стандарт подключения инструментов</h3>
                        <p class="ai-dev-intro-desc">
                            Открытый стандарт от Anthropic, стандартизирующий безопасное подключение LLM и агентных систем (Claude Desktop, Claude Code, Cursor, Antigravity) к локальной файловой системе, Git, базам данных, браузерам и внешним API.
                        </p>
                    </div>
                </div>

                <!-- Каталоги серверов MCP -->
                <h4 class="ai-dev-section-title">
                    <span class="material-symbols-outlined">menu_book</span>
                    <span>Официальные спецификации и каталоги MCP-серверов</span>
                </h4>
                <div class="ai-dev-grid">
                    <article class="ai-dev-card" data-keywords="mcp specification anthropic docs standard protocol">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple">
                                    <span class="material-symbols-outlined">description</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Спецификация MCP</h4>
                                        <span class="ai-dev-tag tag-purple">ANTHROPIC</span>
                                    </div>
                                    <span class="ai-dev-card-host">modelcontextprotocol.io</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Официальная документация архитектуры Client-Server, протокол JSON-RPC, спецификация Prompts, Resources и Tools, SDK для TypeScript и Python.
                            </p>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Документация</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://modelcontextprotocol.io">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <article class="ai-dev-card" data-keywords="mcp github official repo servers anthropic">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">folder_open</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Официальный репозиторий серверов</h4>
                                        <span class="ai-dev-tag tag-cyan">GITHUB</span>
                                    </div>
                                    <span class="ai-dev-card-host">github.com/modelcontextprotocol/servers</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Эталонная коллекция серверов от Anthropic: Filesystem, Git, GitHub, Memory, Fetch, Puppeteer, PostgreSQL, Slack, SQLite, Google Maps.
                            </p>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://github.com/modelcontextprotocol/servers" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>GitHub Servers</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://github.com/modelcontextprotocol/servers">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <article class="ai-dev-card" data-keywords="mcpservers glama mcp-market smithery catalog directories">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald">
                                    <span class="material-symbols-outlined">category</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Каталоги MCP-серверов</h4>
                                        <span class="ai-dev-tag tag-green">DIRECTORIES</span>
                                    </div>
                                    <span class="ai-dev-card-host">mcpservers.org &bull; glama.co/mcp &bull; mcp-market.com</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Крупнейшие открытые реестры проверенных серверов от мирового сообщества с фильтрами по категориям, популярности и 1-click установщикам.
                            </p>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://mcpservers.org" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>mcpservers.org</span>
                            </a>
                            <a href="https://glama.co/mcp/servers" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-secondary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>glama.co</span>
                            </a>
                        </div>
                    </article>
                </div>

                <!-- Топ полезных серверов MCP -->
                <h4 class="ai-dev-section-title">
                    <span class="material-symbols-outlined">construction</span>
                    <span>Топ-7 ключевых серверов для повседневной разработки</span>
                </h4>
                <div class="ai-dev-grid">
                    <article class="ai-dev-card" data-keywords="filesystem mcp server files directories read write edit">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan"><span class="material-symbols-outlined">folder</span></div>
                                <div class="ai-dev-card-info">
                                    <h4 class="ai-dev-card-title">1. Filesystem Server</h4>
                                    <span class="ai-dev-card-host">@modelcontextprotocol/server-filesystem</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">Безопасное чтение, запись, поиск и листинг директорий только в разрешённых папках проекта.</p>
                            <div class="ai-dev-code-block">
                                <div class="ai-dev-code-header">
                                    <span class="ai-dev-code-label">Команда запуска</span>
                                    <button type="button" class="ai-dev-code-copy-btn" data-copy-code="npx -y @modelcontextprotocol/server-filesystem /path/to/project">
                                        <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Копировать
                                    </button>
                                </div>
                                <pre class="ai-dev-code-content"><span class="c-cmd">npx</span> -y @modelcontextprotocol/server-filesystem <span class="c-str">/path/to/project</span></pre>
                            </div>
                        </div>
                    </article>

                    <article class="ai-dev-card" data-keywords="git mcp server commits branches diff history">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber"><span class="material-symbols-outlined">commit</span></div>
                                <div class="ai-dev-card-info">
                                    <h4 class="ai-dev-card-title">2. Git Server</h4>
                                    <span class="ai-dev-card-host">mcp-server-git (Python uvx)</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">Чтение истории коммитов, веток, git diff, авто-создание коммитов с осмысленными описаниями изменений.</p>
                            <div class="ai-dev-code-block">
                                <div class="ai-dev-code-header">
                                    <span class="ai-dev-code-label">Команда запуска</span>
                                    <button type="button" class="ai-dev-code-copy-btn" data-copy-code="uvx mcp-server-git --repository /path/to/repo">
                                        <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Копировать
                                    </button>
                                </div>
                                <pre class="ai-dev-code-content"><span class="c-cmd">uvx</span> mcp-server-git --repository <span class="c-str">/path/to/repo</span></pre>
                            </div>
                        </div>
                    </article>

                    <article class="ai-dev-card" data-keywords="github mcp server pr pull request issues fork api">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple"><span class="material-symbols-outlined">device_hub</span></div>
                                <div class="ai-dev-card-info">
                                    <h4 class="ai-dev-card-title">3. GitHub Server</h4>
                                    <span class="ai-dev-card-host">@modelcontextprotocol/server-github</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">Полная интеграция с GitHub API: инспекция issues, создание pull requests, чтение веток и code review.</p>
                            <div class="ai-dev-code-block">
                                <div class="ai-dev-code-header">
                                    <span class="ai-dev-code-label">Команда запуска</span>
                                    <button type="button" class="ai-dev-code-copy-btn" data-copy-code="npx -y @modelcontextprotocol/server-github">
                                        <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Копировать
                                    </button>
                                </div>
                                <pre class="ai-dev-code-content"><span class="c-cmd">npx</span> -y @modelcontextprotocol/server-github</pre>
                            </div>
                        </div>
                    </article>

                    <article class="ai-dev-card" data-keywords="fetch puppeteer mcp web scrape markdown screenshots">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan"><span class="material-symbols-outlined">public</span></div>
                                <div class="ai-dev-card-info">
                                    <h4 class="ai-dev-card-title">4. Fetch & Puppeteer</h4>
                                    <span class="ai-dev-card-host">@modelcontextprotocol/server-fetch</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">Скрапинг веб-страниц, автоматическая очистка HTML в Markdown, выполнение клиентского JavaScript и снимки страниц.</p>
                            <div class="ai-dev-code-block">
                                <div class="ai-dev-code-header">
                                    <span class="ai-dev-code-label">Команда запуска</span>
                                    <button type="button" class="ai-dev-code-copy-btn" data-copy-code="uvx mcp-server-fetch">
                                        <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Копировать
                                    </button>
                                </div>
                                <pre class="ai-dev-code-content"><span class="c-cmd">uvx</span> mcp-server-fetch</pre>
                            </div>
                        </div>
                    </article>

                    <article class="ai-dev-card" data-keywords="postgres sql postgresql database schema inspection queries">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-blue"><span class="material-symbols-outlined">database</span></div>
                                <div class="ai-dev-card-info">
                                    <h4 class="ai-dev-card-title">5. PostgreSQL Server</h4>
                                    <span class="ai-dev-card-host">@modelcontextprotocol/server-postgres</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">Анализ схемы таблиц, индексов и связей БД, выполнение безопасных read-only или миграционных SQL-запросов.</p>
                            <div class="ai-dev-code-block">
                                <div class="ai-dev-code-header">
                                    <span class="ai-dev-code-label">Команда запуска</span>
                                    <button type="button" class="ai-dev-code-copy-btn" data-copy-code="npx -y @modelcontextprotocol/server-postgres postgresql://user:pass@localhost:5432/dbname">
                                        <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Копировать
                                    </button>
                                </div>
                                <pre class="ai-dev-code-content"><span class="c-cmd">npx</span> -y @modelcontextprotocol/server-postgres <span class="c-str">postgresql://user:pass@localhost:5432/db</span></pre>
                            </div>
                        </div>
                    </article>

                    <article class="ai-dev-card" data-keywords="memory knowledge graph entities relations long-term mcp">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald"><span class="material-symbols-outlined">psychology</span></div>
                                <div class="ai-dev-card-info">
                                    <h4 class="ai-dev-card-title">6. Memory Server (Knowledge Graph)</h4>
                                    <span class="ai-dev-card-host">@modelcontextprotocol/server-memory</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">Графовая база знаний долгосрочной памяти. Сохраняет сущности, архитектурные решения и контекст между сессиями агента.</p>
                            <div class="ai-dev-code-block">
                                <div class="ai-dev-code-header">
                                    <span class="ai-dev-code-label">Команда запуска</span>
                                    <button type="button" class="ai-dev-code-copy-btn" data-copy-code="npx -y @modelcontextprotocol/server-memory">
                                        <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Копировать
                                    </button>
                                </div>
                                <pre class="ai-dev-code-content"><span class="c-cmd">npx</span> -y @modelcontextprotocol/server-memory</pre>
                            </div>
                        </div>
                    </article>

                    <article class="ai-dev-card" data-keywords="tilda webhooks rest api custom cms mcp">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-pink"><span class="material-symbols-outlined">api</span></div>
                                <div class="ai-dev-card-info">
                                    <h4 class="ai-dev-card-title">7. Tilda / Custom REST API</h4>
                                    <span class="ai-dev-card-host">custom-mcp-server</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">Интеграция с веб-сервисами, CMS Tilda, вебхуками и внутренними микросервисами платформы «Аврора».</p>
                            <div class="ai-dev-code-block">
                                <div class="ai-dev-code-header">
                                    <span class="ai-dev-code-label">Пример запуска</span>
                                    <button type="button" class="ai-dev-code-copy-btn" data-copy-code="node ./scripts/tilda-mcp-server.js">
                                        <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Копировать
                                    </button>
                                </div>
                                <pre class="ai-dev-code-content"><span class="c-cmd">node</span> ./scripts/tilda-mcp-server.js</pre>
                            </div>
                        </div>
                    </article>
                </div>

                <!-- Готовые конфигурации для копирования -->
                <h4 class="ai-dev-section-title">
                    <span class="material-symbols-outlined">settings_suggest</span>
                    <span>Готовые примеры конфигурационных файлов MCP</span>
                </h4>
                <div class="ai-dev-grid">
                    <!-- claude_desktop_config.json -->
                    <article class="ai-dev-card" data-keywords="claude_desktop_config.json config claude desktop anthropic json">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple"><span class="material-symbols-outlined">desktop_windows</span></div>
                                <div class="ai-dev-card-info">
                                    <h4 class="ai-dev-card-title">claude_desktop_config.json</h4>
                                    <span class="ai-dev-card-host">~/.config/Claude/claude_desktop_config.json</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">Конфигурация для официального клиента Claude Desktop на Linux/macOS/Windows.</p>
                            <div class="ai-dev-code-block">
                                <div class="ai-dev-code-header">
                                    <span class="ai-dev-code-label">JSON Config</span>
                                    <button type="button" class="ai-dev-code-copy-btn" data-copy-code='{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/astra/projects"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "/home/astra/projects/aurora"]
    },
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}'>
                                        <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Скопировать конфиг
                                    </button>
                                </div>
                                <pre class="ai-dev-code-content">{
  <span class="c-key">"mcpServers"</span>: {
    <span class="c-key">"filesystem"</span>: {
      <span class="c-key">"command"</span>: <span class="c-str">"npx"</span>,
      <span class="c-key">"args"</span>: [<span class="c-str">"-y"</span>, <span class="c-str">"@modelcontextprotocol/server-filesystem"</span>, <span class="c-str">"/path/to/projects"</span>]
    },
    <span class="c-key">"git"</span>: {
      <span class="c-key">"command"</span>: <span class="c-str">"uvx"</span>,
      <span class="c-key">"args"</span>: [<span class="c-str">"mcp-server-git"</span>, <span class="c-str">"--repository"</span>, <span class="c-str">"/path/to/repo"</span>]
    },
    <span class="c-key">"fetch"</span>: {
      <span class="c-key">"command"</span>: <span class="c-str">"uvx"</span>,
      <span class="c-key">"args"</span>: [<span class="c-str">"mcp-server-fetch"</span>]
    },
    <span class="c-key">"memory"</span>: {
      <span class="c-key">"command"</span>: <span class="c-str">"npx"</span>,
      <span class="c-key">"args"</span>: [<span class="c-str">"-y"</span>, <span class="c-str">"@modelcontextprotocol/server-memory"</span>]
    }
  }
}</pre>
                            </div>
                        </div>
                    </article>

                    <!-- antigravity.mcp.json / Cursor -->
                    <article class="ai-dev-card" data-keywords="antigravity mcp cursor json config settings">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan"><span class="material-symbols-outlined">terminal</span></div>
                                <div class="ai-dev-card-info">
                                    <h4 class="ai-dev-card-title">antigravity.mcp.json (Cursor / Antigravity)</h4>
                                    <span class="ai-dev-card-host">.antigravity/mcp.json &bull; Cursor Settings</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">Конфигурация для агентов Antigravity и IDE Cursor с переменными окружения.</p>
                            <div class="ai-dev-code-block">
                                <div class="ai-dev-code-header">
                                    <span class="ai-dev-code-label">JSON Config</span>
                                    <button type="button" class="ai-dev-code-copy-btn" data-copy-code='{
  "mcp": {
    "servers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
      },
      "github": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {
          "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
        }
      },
      "postgres": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:pass@localhost:5432/aurora_db"]
      }
    }
  }
}'>
                                        <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Скопировать конфиг
                                    </button>
                                </div>
                                <pre class="ai-dev-code-content">{
  <span class="c-key">"mcp"</span>: {
    <span class="c-key">"servers"</span>: {
      <span class="c-key">"filesystem"</span>: {
        <span class="c-key">"command"</span>: <span class="c-str">"npx"</span>,
        <span class="c-key">"args"</span>: [<span class="c-str">"-y"</span>, <span class="c-str">"@modelcontextprotocol/server-filesystem"</span>, <span class="c-str">"."</span>]
      },
      <span class="c-key">"github"</span>: {
        <span class="c-key">"command"</span>: <span class="c-str">"npx"</span>,
        <span class="c-key">"args"</span>: [<span class="c-str">"-y"</span>, <span class="c-str">"@modelcontextprotocol/server-github"</span>],
        <span class="c-key">"env"</span>: {
          <span class="c-key">"GITHUB_PERSONAL_ACCESS_TOKEN"</span>: <span class="c-str">"&lt;YOUR_TOKEN&gt;"</span>
        }
      },
      <span class="c-key">"postgres"</span>: {
        <span class="c-key">"command"</span>: <span class="c-str">"npx"</span>,
        <span class="c-key">"args"</span>: [<span class="c-str">"-y"</span>, <span class="c-str">"@modelcontextprotocol/server-postgres"</span>, <span class="c-str">"postgresql://localhost:5432/db"</span>]
      }
    }
  }
}</pre>
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <!-- ========================================================
                 ВКЛАДКА 3: SKILLS (АГЕНТНЫЕ НАВЫКИ)
                 ======================================================== -->
            <section class="ai-dev-tab-panel" id="tab-skills" role="tabpanel" data-tab-panel="skills">
                <div class="ai-dev-intro-banner">
                    <div class="ai-dev-intro-icon">
                        <span class="material-symbols-outlined">psychology</span>
                    </div>
                    <div class="ai-dev-intro-content">
                        <h3 class="ai-dev-intro-title">Архитектура Skills — Модульные навыки для AI-агентов</h3>
                        <p class="ai-dev-intro-desc">
                            Skills позволяют упаковывать сложные инженерные сценарии, чек-листы качества и алгоритмы в переиспользуемые файлы <code>SKILL.md</code>. Агент автоматически подключает навык при совпадении триггеров задачи.
                        </p>
                    </div>
                </div>

                <!-- Структура SKILL.md -->
                <div class="ai-dev-grid">
                    <article class="ai-dev-card" data-keywords="skill.md architecture yaml frontmatter markdown instructions structure">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan"><span class="material-symbols-outlined">schema</span></div>
                                <div class="ai-dev-card-info">
                                    <h4 class="ai-dev-card-title">Анатомия файла SKILL.md</h4>
                                    <span class="ai-dev-card-host">Стандарт структуры навыка</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Файл состоит из двух взаимосвязанных частей: строгий YAML Frontmatter в начале для оркестратора агентов + подробное Markdown руководство с критериями качества.
                            </p>
                            <div class="ai-dev-code-block">
                                <div class="ai-dev-code-header">
                                    <span class="ai-dev-code-label">YAML + Markdown</span>
                                    <button type="button" class="ai-dev-code-copy-btn" data-copy-code='---
name: "fullstack-code-reviewer"
description: "Аудит изменений, проверка синтаксиса node/php и безопасность"
version: "1.0.0"
tools_required:
  - run_command
  - view_file
  - replace_file_content
triggers:
  - "проведи код-ревью"
  - "найди баги"
  - "проверь безопасность"
---

# Роль
Ты — Senior Fullstack Reviewer. Проверяй код перед сдачей.

## Алгоритм:
1. Запусти 'git diff' для инспекции измененных файлов.
2. Проверь синтаксис: 'node -c <js_files>' и 'php -l <php_files>'.
3. Убедись в санитизации HTML/SQL параметров.
4. Проверь мобильную адаптивность и доступность.
5. Предоставь отчет с конкретными строками и исправлениями.'>
                                        <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Скопировать шаблон
                                    </button>
                                </div>
                                <pre class="ai-dev-code-content"><span class="c-cmt">---</span>
<span class="c-key">name</span>: <span class="c-str">"fullstack-code-reviewer"</span>
<span class="c-key">description</span>: <span class="c-str">"Аудит кода, проверка синтаксиса node/php и безопасность"</span>
<span class="c-key">version</span>: <span class="c-str">"1.0.0"</span>
<span class="c-key">tools_required</span>:
  - run_command
  - view_file
<span class="c-cmt">---</span>

<span class="c-key"># Роль</span>
Ты — Senior Fullstack Reviewer. Проверяй код перед сдачей.

<span class="c-key">## Алгоритм:</span>
1. Запусти \`git diff\` для инспекции измененных файлов.
2. Проверь синтаксис: \`node -c &lt;js&gt;\` и \`php -l &lt;php&gt;\`.
3. Убедись в санитизации HTML/SQL параметров.
4. Проверь мобильную адаптивность и доступность.</pre>
                            </div>
                        </div>
                    </article>

                    <!-- Мета-промпт для генерации навыков -->
                    <article class="ai-dev-card" data-keywords="meta prompt skills generator prompt engineering chatgpt claude">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple"><span class="material-symbols-outlined">auto_fix_high</span></div>
                                <div class="ai-dev-card-info">
                                    <h4 class="ai-dev-card-title">Мета-промпт для создания навыков</h4>
                                    <span class="ai-dev-card-host">Генератор идеальных SKILL.md</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Отправьте этот промпт в Claude 3.5 или DeepSeek-R1, чтобы получить безупречно оформленный файл навыка для вашего проекта под любую инженерную задачу.
                            </p>
                            <div class="ai-dev-code-block">
                                <div class="ai-dev-code-header">
                                    <span class="ai-dev-code-label">PROMPT TEMPLATE</span>
                                    <button type="button" class="ai-dev-code-copy-btn" data-copy-code='Создай файл SKILL.md для автономного AI-агента (Claude Code / Antigravity / Cline).

Задача навыка: [Опиши задачу: например, "Аудит доступности ARIA и контрастности UI"].

Требования:
1. Валидный YAML frontmatter (name, description, version, tools_required, triggers).
2. Четкая роль эксперта с критериями "Definition of Done".
3. Пошаговый пайплайн с обработкой пограничных случаев и ошибок.
4. Конкретные консольные команды для автоматической верификации.
5. Запрет на предположения: проверять все факты инструментами.'>
                                        <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Скопировать промпт
                                    </button>
                                </div>
                                <pre class="ai-dev-code-content">Создай файл SKILL.md для автономного AI-агента.

Задача навыка: <span class="c-str">[Опиши задачу разработчика]</span>.

Требования:
1. Валидный YAML frontmatter (name, tools, triggers).
2. Роль с критериями "Definition of Done".
3. Пошаговый пайплайн с обработкой ошибок.
4. Конкретные команды для автоматической проверки.
5. Запрет на догадки: верифицировать инструментами.</pre>
                            </div>
                        </div>
                    </article>
                </div>

                <!-- Популярные готовые Skills -->
                <h4 class="ai-dev-section-title">
                    <span class="material-symbols-outlined">stars</span>
                    <span>Рекомендуемые каталоги и идеи готовых агентных навыков</span>
                </h4>
                <div class="ai-dev-grid">
                    <article class="ai-dev-card" data-keywords="awesome skills repository catalog community prompt library">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald"><span class="material-symbols-outlined">collections_bookmark</span></div>
                                <div class="ai-dev-card-info">
                                    <h4 class="ai-dev-card-title">Каталоги агентных навыков</h4>
                                    <span class="ai-dev-card-host">Community Skills Repositories</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">Открытые библиотеки готовых навыков для рефакторинга кода, генерации юнит-тестов (Jest, PHPUnit), анализа безопасности OWASP и локализации.</p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-green">Refactor Assistant</span>
                                <span class="ai-dev-tag tag-cyan">Bug Hunter</span>
                                <span class="ai-dev-tag tag-purple">Auto-Docs</span>
                            </div>
                        </div>
                    </article>

                    <article class="ai-dev-card" data-keywords="subagents parallel architecture contract delegator coordinator">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber"><span class="material-symbols-outlined">diversity_3</span></div>
                                <div class="ai-dev-card-info">
                                    <h4 class="ai-dev-card-title">Skill: Subagents Delegator</h4>
                                    <span class="ai-dev-card-host">Оркестрация под-агентов</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">Шаблон делегирования ресурсоемких задач (сбор данных, запуск тестов, проверка стилей) изолированным саб-агентам для сохранения чистоты контекста.</p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">Context Isolation</span>
                                <span class="ai-dev-tag tag-cyan">Parallel Execution</span>
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <!-- ========================================================
                 ВКЛАДКА 4: GITHUB РЕПОЗИТОРИИ
                 ======================================================== -->
            <section class="ai-dev-tab-panel" id="tab-repos" role="tabpanel" data-tab-panel="repos">
                <div class="ai-dev-intro-banner">
                    <div class="ai-dev-intro-icon">
                        <span class="material-symbols-outlined">terminal</span>
                    </div>
                    <div class="ai-dev-intro-content">
                        <h3 class="ai-dev-intro-title">Лучшие инструменты и репозитории для ИИ-разработки</h3>
                        <p class="ai-dev-intro-desc">
                            Подборка ведущих открытых проектов: от официального CLI-агента Claude Code и терминального помощника Aider до легковесных расширений VSCode и высокоскоростных движков инференса.
                        </p>
                    </div>
                </div>

                <div class="ai-dev-grid">
                    <!-- anthropics/claude-code -->
                    <article class="ai-dev-card" data-keywords="claude-code anthropics cli terminal agent autonomous coding">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-purple"><span class="material-symbols-outlined">terminal</span></div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">anthropics/claude-code</h4>
                                        <span class="ai-dev-tag tag-purple">OFFICIAL CLI</span>
                                    </div>
                                    <span class="ai-dev-card-host">github.com/anthropics/claude-code</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Официальный терминальный AI-агент от Anthropic. Умеет перемещаться по кодовой базе, редактировать файлы, запускать тесты, выполнять git-команды и решать инженерные задачи в реальном времени.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">Anthropic</span>
                                <span class="ai-dev-tag tag-cyan">CLI Agent</span>
                                <span class="ai-dev-tag tag-green">npm i -g @anthropic-ai/claude-code</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://github.com/anthropics/claude-code" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть репозиторий</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://github.com/anthropics/claude-code">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Aider -->
                    <article class="ai-dev-card" data-keywords="aider paul-gauthier git pair programming terminal benchmark">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan"><span class="material-symbols-outlined">group_work</span></div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Aider (paul-gauthier/aider)</h4>
                                        <span class="ai-dev-tag tag-cyan">ПАРНЫЙ КОДИНГ</span>
                                    </div>
                                    <span class="ai-dev-card-host">github.com/paul-gauthier/aider</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Золотой стандарт парного программирования в консоли. Автоматически создает git-коммиты, строит карту репозитория на Tree-sitter, лидирует в бенчмарках SWE-bench и поддерживает десятки LLM.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">SWE-bench Leader</span>
                                <span class="ai-dev-tag tag-purple">Auto-Commit</span>
                                <span class="ai-dev-tag">Python</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://github.com/paul-gauthier/aider" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Aider</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://github.com/paul-gauthier/aider">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Roo-Code / Cline -->
                    <article class="ai-dev-card" data-keywords="roo-code cline vscode extension autonomous agent mcp architect">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber"><span class="material-symbols-outlined">extension</span></div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Roo-Code & Cline (VSCode)</h4>
                                        <span class="ai-dev-tag tag-amber">АВТОНОМНЫЙ VSCODE</span>
                                    </div>
                                    <span class="ai-dev-card-host">github.com/RooVetGit/Roo-Code</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Передовые автономные расширения для VSCode. Включают встроенную поддержку MCP-серверов, кастомные режимы (Architect, Code, Ask), контроль стоимости каждого шага и безопасность выполнения bash-команд.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">VSCode Extension</span>
                                <span class="ai-dev-tag tag-cyan">MCP Native</span>
                                <span class="ai-dev-tag">Custom Modes</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://github.com/RooVetGit/Roo-Code" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Roo-Code</span>
                            </a>
                            <a href="https://github.com/cline/cline" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-secondary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Cline</span>
                            </a>
                        </div>
                    </article>

                    <!-- Ollama -->
                    <article class="ai-dev-card" data-keywords="ollama local models run gpu cpu llama deepseek qwen mistral">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald"><span class="material-symbols-outlined">deployed_code</span></div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Ollama (ollama/ollama)</h4>
                                        <span class="ai-dev-tag tag-green">ЛОКАЛЬНЫЙ ИИ</span>
                                    </div>
                                    <span class="ai-dev-card-host">github.com/ollama/ollama</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Легендарный инструмент для локального запуска открытых LLM (Llama 3.3, DeepSeek R1, Qwen 2.5 Coder, Mistral) одной командой. Поддерживает GPU-ускорение (NVIDIA CUDA, Apple Metal) и OpenAI-совместимый API.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-green">ollama run deepseek-r1:8b</span>
                                <span class="ai-dev-tag tag-cyan">OpenAI API</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://github.com/ollama/ollama" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Ollama</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://github.com/ollama/ollama">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- vLLM -->
                    <article class="ai-dev-card" data-keywords="vllm inference serving pagedattention high throughput gpu production">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-pink"><span class="material-symbols-outlined">bolt</span></div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">vLLM (vllm-project/vllm)</h4>
                                        <span class="ai-dev-tag tag-purple">ПРОМЫШЛЕННЫЙ СЕРВИНГ</span>
                                    </div>
                                    <span class="ai-dev-card-host">github.com/vllm-project/vllm</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Высокопроизводительный движок инференса и сервировки моделей с технологией PagedAttention. В 10-24 раза быстрее традиционных решений за счет эффективного батчинга и управления виртуальной памятью KV-кэша.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">PagedAttention</span>
                                <span class="ai-dev-tag tag-cyan">High Throughput</span>
                                <span class="ai-dev-tag">Enterprise</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://github.com/vllm-project/vllm" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть vLLM</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://github.com/vllm-project/vllm">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Awesome ChatGPT Prompts -->
                    <article class="ai-dev-card" data-keywords="awesome chatgpt prompts f awesome-chatgpt-prompts prompt engineering collection">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-amber"><span class="material-symbols-outlined">auto_stories</span></div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Awesome ChatGPT Prompts</h4>
                                        <span class="ai-dev-tag tag-amber">ЗОЛОТОЙ ФОНД</span>
                                    </div>
                                    <span class="ai-dev-card-host">github.com/f/awesome-chatgpt-prompts</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Всемирно известный курируемый каталог системных промптов и специализированных ролей для AI (Linux Terminal, Senior Software Engineer, Security Auditor, UX Designer, Math Teacher и др.).
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">110k+ Stars</span>
                                <span class="ai-dev-tag tag-cyan">Prompt Engineering</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://github.com/f/awesome-chatgpt-prompts" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Prompts</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://github.com/f/awesome-chatgpt-prompts">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Continue -->
                    <article class="ai-dev-card" data-keywords="continue-dev continue open source autocomplete copilot vscode jetbrains">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan"><span class="material-symbols-outlined">code_blocks</span></div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Continue (continue-dev/continue)</h4>
                                        <span class="ai-dev-tag tag-cyan">OPEN COPILOT</span>
                                    </div>
                                    <span class="ai-dev-card-host">github.com/continuedev/continue</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Открытая замена GitHub Copilot для VSCode и JetBrains. Таб-автодополнение, кодинг в чате по контексту репозитория, поддержка Ollama, OpenRouter, Anthropic и кастомных моделей.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">Tab Autocomplete</span>
                                <span class="ai-dev-tag tag-purple">VSCode & JetBrains</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://github.com/continuedev/continue" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Continue</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://github.com/continuedev/continue">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Open-WebUI -->
                    <article class="ai-dev-card" data-keywords="open-webui self-hosted chat ui ollama rag pipelines">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-blue"><span class="material-symbols-outlined">web</span></div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Open-WebUI</h4>
                                        <span class="ai-dev-tag tag-green">SELF-HOSTED UI</span>
                                    </div>
                                    <span class="ai-dev-card-host">github.com/open-webui/open-webui</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Полнофункциональный веб-интерфейс в стиле ChatGPT для локального Ollama и любых OpenAI API шлюзов. Встроенный RAG, голосовой ввод, генерация изображений и разграничение прав доступа.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-green">Docker Ready</span>
                                <span class="ai-dev-tag tag-cyan">Built-in RAG</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://github.com/open-webui/open-webui" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Open-WebUI</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://github.com/open-webui/open-webui">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>
                </div>
            </section>

            <!-- ========================================================
                 ВКЛАДКА 5: ПРАКТИЧЕСКИЙ ГАЙД (CLAUDE CODE, ANTIGRAVITY, CURSOR)
                 ======================================================== -->
            <section class="ai-dev-tab-panel" id="tab-guide" role="tabpanel" data-tab-panel="guide">
                <div class="ai-dev-intro-banner">
                    <div class="ai-dev-intro-icon">
                        <span class="material-symbols-outlined">rocket_launch</span>
                    </div>
                    <div class="ai-dev-intro-content">
                        <h3 class="ai-dev-intro-title">Инженерный гайд по эффективной работе с ИИ-агентами</h3>
                        <p class="ai-dev-intro-desc">
                            Практические правила, проверенные на разработке платформы «Аврора»: как управлять контекстом, планировать шаги, запускать под-агентов и предотвращать регрессии в кодовой базе.
                        </p>
                    </div>
                </div>

                <!-- 1. Planning Mode -->
                <div class="ai-dev-guide-step" data-keywords="planning mode plan research decomposition checklist todo">
                    <div class="ai-dev-guide-step-header">
                        <span class="ai-dev-step-num">1</span>
                        <h4 class="ai-dev-step-title">Режим планирования (Planning Mode)</h4>
                    </div>
                    <p class="ai-dev-card-desc">
                        Никогда не начинайте менять код без предварительного исследования кодовой базы.
                    </p>
                    <ul class="ai-dev-guide-list">
                        <li><strong>Фаза 1: Exploration (Read-only)</strong> — используйте поиск (<code>grep_search</code>, <code>find_by_name</code>) и точечный просмотр (<code>view_file</code>), чтобы понять текущие связи компонентов и архитектуру.</li>
                        <li><strong>Фиксация плана в Todo/Markdown</strong> — разбейте сложную задачу на 4–6 атомарных шагов с критериями приемки.</li>
                        <li><strong>Фаза 2: Execution (Пошаговое внедрение)</strong> — реализуйте строго по одному шагу за раз. После каждого изменения верифицируйте результат перед переходом к следующему пункту.</li>
                    </ul>
                </div>

                <!-- 2. Subagents -->
                <div class="ai-dev-guide-step" data-keywords="subagents delegation context isolation tokens parallel">
                    <div class="ai-dev-guide-step-header">
                        <span class="ai-dev-step-num">2</span>
                        <h4 class="ai-dev-step-title">Использование под-агентов (Subagents)</h4>
                    </div>
                    <p class="ai-dev-card-desc">
                        Контекстное окно агента — это самый ценный и исчерпаемый ресурс. Загрязнение контекста логами и черновиками снижает интеллект модели.
                    </p>
                    <ul class="ai-dev-guide-list">
                        <li><strong>Изоляция контекста</strong> — тяжелый аудит, чтение больших JSON или запуск многострочных тестов делегируйте саб-агентам. Главный агент получает только чистый структурированный результат.</li>
                        <li><strong>Параллелизация задач</strong> — независимые задачи (например, верстка модального окна и написание PHP эндпоинта) выполняются быстрее параллельными агентами.</li>
                        <li><strong>Строгий контракт обмена</strong> — всегда передавайте точные пути к файлам и вызывайте <code>send_message</code> для уведомления вызывающего агента.</li>
                    </ul>
                </div>

                <!-- 3. Автоматическая проверка синтаксиса -->
                <div class="ai-dev-guide-step" data-keywords="syntax check node -c php -l test compile validation">
                    <div class="ai-dev-guide-step-header">
                        <span class="ai-dev-step-num">3</span>
                        <h4 class="ai-dev-step-title">Мгновенная проверка синтаксиса и автотесты</h4>
                    </div>
                    <p class="ai-dev-card-desc">
                        Проверяйте синтаксис сразу после редактирования файлов еще до обновления страницы в браузере.
                    </p>
                    <div class="ai-dev-grid" style="margin-top: 14px; margin-bottom: 0;">
                        <div class="ai-dev-code-block" style="margin: 0;">
                            <div class="ai-dev-code-header">
                                <span class="ai-dev-code-label">JavaScript (Node.js)</span>
                                <button type="button" class="ai-dev-code-copy-btn" data-copy-code="node -c src/ai_dev_modal.js && node -c src/app.js">
                                    <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Копировать
                                </button>
                            </div>
                            <pre class="ai-dev-code-content"><span class="c-cmd">node</span> -c src/ai_dev_modal.js</pre>
                        </div>
                        <div class="ai-dev-code-block" style="margin: 0;">
                            <div class="ai-dev-code-header">
                                <span class="ai-dev-code-label">PHP Syntax Lint</span>
                                <button type="button" class="ai-dev-code-copy-btn" data-copy-code="php -l api/ai-proxy.php && php -l index.php">
                                    <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Копировать
                                </button>
                            </div>
                            <pre class="ai-dev-code-content"><span class="c-cmd">php</span> -l api/ai-proxy.php</pre>
                        </div>
                    </div>
                </div>

                <!-- 4. Экономия токенов -->
                <div class="ai-dev-guide-step" data-keywords="token economy optimization slice view range limit git ignore">
                    <div class="ai-dev-guide-step-header">
                        <span class="ai-dev-step-num">4</span>
                        <h4 class="ai-dev-step-title">Экономия токенов и оптимизация контекста</h4>
                    </div>
                    <p class="ai-dev-card-desc">
                        Золотые правила экономии бюджета и сохранения максимальной резкости рассуждений LLM:
                    </p>
                    <ul class="ai-dev-guide-list">
                        <li><strong>Точечное чтение (Line Ranges)</strong> — никогда не выгружайте файлы на 10 000 строк целиком. Указывайте <code>StartLine</code> и <code>EndLine</code> (по 50–150 строк).</li>
                        <li><strong>Исключение лишнего мусора</strong> — всегда фильтруйте <code>node_modules</code>, <code>.git</code>, <code>vendor</code>, <code>cache</code> и временные дампы при поиске по проекту.</li>
                        <li><strong>Компактные правки (replace_file_content)</strong> — заменяйте только конкретный блок кода, не переписывая файл с нуля.</li>
                        <li><strong>Своевременная очистка сессии</strong> — при смене темы обсуждения начинайте новую сессию или компактно резюмируйте достигнутый прогресс.</li>
                    </ul>
                </div>
            </section>

            <!-- Пустой результат поиска -->
            <div class="ai-dev-empty-state" data-aidev-empty>
                <img src="assets/images/mascot/robot_thinking.png?v=4.63.0" alt="Космо думает" class="ai-dev-empty-img" />
                <h4 class="ai-dev-empty-title">Ничего не найдено</h4>
                <p class="ai-dev-empty-desc">
                    По запросу <strong data-aidev-query></strong> ресурсов не обнаружено. Попробуйте изменить ключевые слова или сбросить фильтр.
                </p>
                <button type="button" class="ai-dev-empty-reset-btn" data-aidev-reset>
                    Показать все ресурсы
                </button>
            </div>
        </main>
    </div>
    `;
}

/**
 * Инициализация логики модального окна AI Dev Hub
 */
export function initAiDevModal() {
    let overlay = document.getElementById('ai-dev-modal');

    // Если контейнера еще нет в DOM, создаем его
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ai-dev-modal';
        overlay.className = 'ai-dev-modal-overlay hidden no-print';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'ai-dev-modal-title');
        overlay.innerHTML = getAiDevModalHtml();
        document.body.appendChild(overlay);
    } else if (!overlay.querySelector('.ai-dev-dialog')) {
        // Если контейнер существует, но пуст
        overlay.innerHTML = getAiDevModalHtml();
    }

    modalOverlayEl = overlay;
    searchInputEl = overlay.querySelector('[data-aidev-search]');
    clearBtnEl = overlay.querySelector('[data-aidev-clear]');
    searchCounterEl = overlay.querySelector('[data-aidev-counter] .counter-text');
    emptyStateEl = overlay.querySelector('[data-aidev-empty]');
    tabBtns = Array.from(overlay.querySelectorAll('.ai-dev-tab-btn'));
    tabPanels = Array.from(overlay.querySelectorAll('.ai-dev-tab-panel'));

    bindModalEvents();
    updateTabCounts();
    return modalOverlayEl;
}

/**
 * Переключение активной вкладки
 */
export function switchAiDevTab(targetTabId) {
    if (!targetTabId) return;
    currentActiveTab = targetTabId;
    currentSubfilter = 'all';
    if (modalOverlayEl) {
        modalOverlayEl.querySelectorAll('.ai-dev-subchip').forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-subfilter') === 'all');
        });
    }

    tabBtns.forEach(btn => {
        const matches = btn.getAttribute('data-tab-target') === targetTabId;
        btn.classList.toggle('active', matches);
        btn.setAttribute('aria-selected', matches ? 'true' : 'false');
    });

    tabPanels.forEach(panel => {
        const matches = panel.getAttribute('data-tab-panel') === targetTabId;
        panel.classList.toggle('active', matches);
    });

    applySearchFilter(currentSearchQuery);
}

/**
 * Фильтрация карточек и элементов в реальном времени
 */
export function applySearchFilter(query = '') {
    currentSearchQuery = (query || '').trim().toLowerCase();
    if (clearBtnEl) {
        clearBtnEl.classList.toggle('hidden', currentSearchQuery === '');
    }

    const allCards = modalOverlayEl.querySelectorAll('.ai-dev-card, .ai-dev-guide-step');
    let totalVisible = 0;
    let visibleInActiveTab = 0;

    const countsPerTab = {
        'free-ai': 0,
        'mcp': 0,
        'skills': 0,
        'repos': 0,
        'guide': 0
    };

    allCards.forEach(card => {
        const panel = card.closest('.ai-dev-tab-panel');
        const tabKey = panel ? panel.getAttribute('data-tab-panel') : null;
        const subcat = card.getAttribute('data-subcat');
        const matchesSubfilter = !currentSubfilter || currentSubfilter === 'all' || !subcat || subcat === currentSubfilter;

        if (!currentSearchQuery) {
            const isVisible = matchesSubfilter;
            card.classList.toggle('is-hidden', !isVisible);
            if (isVisible) {
                totalVisible++;
                if (tabKey && countsPerTab[tabKey] !== undefined) countsPerTab[tabKey]++;
                if (tabKey === currentActiveTab) visibleInActiveTab++;
            }
            return;
        }

        const keywords = (card.getAttribute('data-keywords') || '').toLowerCase();
        const textContent = (card.textContent || '').toLowerCase();
        const isMatch = matchesSubfilter && (keywords.includes(currentSearchQuery) || textContent.includes(currentSearchQuery));

        card.classList.toggle('is-hidden', !isMatch);
        if (isMatch) {
            totalVisible++;
            if (tabKey && countsPerTab[tabKey] !== undefined) countsPerTab[tabKey]++;
            if (tabKey === currentActiveTab) visibleInActiveTab++;
        }
    });

    // Обновляем бейджи количества в табах
    Object.keys(countsPerTab).forEach(tabKey => {
        const countBadge = modalOverlayEl.querySelector(`[data-tab-count="${tabKey}"]`);
        if (countBadge) {
            countBadge.textContent = countsPerTab[tabKey];
            countBadge.style.opacity = countsPerTab[tabKey] === 0 ? '0.4' : '1';
        }
    });

    // Обновляем индикатор поиска
    if (searchCounterEl) {
        if (!currentSearchQuery) {
            searchCounterEl.textContent = `Все ресурсы активны (${totalVisible})`;
        } else {
            searchCounterEl.textContent = `Найдено: ${totalVisible}`;
        }
    }

    // Показ пустого состояния
    if (emptyStateEl) {
        const isCurrentEmpty = currentSearchQuery !== '' && visibleInActiveTab === 0;
        emptyStateEl.classList.toggle('is-visible', isCurrentEmpty);
        const querySpan = emptyStateEl.querySelector('[data-aidev-query]');
        if (querySpan) querySpan.textContent = `«${currentSearchQuery}»`;
    }
}

/**
 * Первоначальный подсчет карточек
 */
function updateTabCounts() {
    if (!modalOverlayEl) return;
    const tabKeys = ['free-ai', 'mcp', 'skills', 'repos', 'guide'];
    tabKeys.forEach(key => {
        const panel = modalOverlayEl.querySelector(`[data-tab-panel="${key}"]`);
        const countBadge = modalOverlayEl.querySelector(`[data-tab-count="${key}"]`);
        if (panel && countBadge) {
            const items = panel.querySelectorAll('.ai-dev-card, .ai-dev-guide-step');
            countBadge.textContent = items.length;
        }
    });
}

/**
 * Привязка слушателей событий
 */
function bindModalEvents() {
    if (!modalOverlayEl) return;

    // Закрытие по кнопке крестика
    const closeBtns = modalOverlayEl.querySelectorAll('[data-aidev-close]');
    closeBtns.forEach(btn => btn.addEventListener('click', closeAiDevModal));

    // Клик по оверлею (за пределами диалога)
    modalOverlayEl.addEventListener('click', (e) => {
        if (e.target === modalOverlayEl) {
            closeAiDevModal();
        }
    });

    // Фильтрация по подкатегориям (чипам)
    modalOverlayEl.addEventListener('click', (e) => {
        const subchip = e.target.closest('[data-subfilter]');
        if (subchip) {
            const filterVal = subchip.getAttribute('data-subfilter');
            const parent = subchip.closest('.ai-dev-subchips-bar');
            if (parent) {
                parent.querySelectorAll('.ai-dev-subchip').forEach(c => c.classList.remove('active'));
                subchip.classList.add('active');
            }
            currentSubfilter = filterVal;
            applySearchFilter(currentSearchQuery);
        }
    });

    // Переключение вкладок
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab-target');
            switchAiDevTab(target);
        });
    });

    // Ввод в поиск
    if (searchInputEl) {
        searchInputEl.addEventListener('input', (e) => {
            applySearchFilter(e.target.value);
        });
    }

    // Очистка поиска
    if (clearBtnEl) {
        clearBtnEl.addEventListener('click', () => {
            if (searchInputEl) {
                searchInputEl.value = '';
                searchInputEl.focus();
            }
            applySearchFilter('');
        });
    }

    // Сброс поиска из пустого состояния
    const resetBtn = modalOverlayEl.querySelector('[data-aidev-reset]');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (searchInputEl) searchInputEl.value = '';
            applySearchFilter('');
        });
    }

    // Копирование ссылок по кнопке [data-copy-link]
    modalOverlayEl.addEventListener('click', (e) => {
        const copyLinkBtn = e.target.closest('[data-copy-link]');
        if (copyLinkBtn) {
            e.preventDefault();
            e.stopPropagation();
            const link = copyLinkBtn.getAttribute('data-copy-link');
            copyToClipboard(link, copyLinkBtn, 'Ссылка скопирована в буфер!');
            return;
        }

        const copyCodeBtn = e.target.closest('[data-copy-code]');
        if (copyCodeBtn) {
            e.preventDefault();
            e.stopPropagation();
            const code = copyCodeBtn.getAttribute('data-copy-code');
            copyToClipboard(code, copyCodeBtn, 'Конфигурация скопирована!');
            return;
        }
    });

    // Горячие клавиши (Esc, /)
    document.addEventListener('keydown', (e) => {
        if (modalOverlayEl && modalOverlayEl.classList.contains('is-open')) {
            if (e.key === 'Escape') {
                closeAiDevModal();
            } else if (e.key === '/' && document.activeElement !== searchInputEl) {
                e.preventDefault();
                if (searchInputEl) searchInputEl.focus();
            }
        }
    });
}

/**
 * Открытие модального окна AI Dev Hub
 */
export function openAiDevModal(targetTab = null) {
    if (!modalOverlayEl) {
        initAiDevModal();
    }

    modalOverlayEl.classList.remove('hidden');
    // Force reflow for smooth animation
    void modalOverlayEl.offsetWidth;
    modalOverlayEl.classList.add('is-open');
    document.body.classList.add('ai-dev-modal-open');

    if (targetTab) {
        switchAiDevTab(targetTab);
    } else {
        switchAiDevTab(currentActiveTab);
    }

    // Автофокус на поле поиска с задержкой после открытия анимации
    setTimeout(() => {
        if (searchInputEl && window.innerWidth > 768) {
            searchInputEl.focus();
        }
    }, 280);
}

/**
 * Закрытие модального окна AI Dev Hub
 */
export function closeAiDevModal() {
    if (!modalOverlayEl) return;
    modalOverlayEl.classList.remove('is-open');
    document.body.classList.remove('ai-dev-modal-open');

    setTimeout(() => {
        if (!modalOverlayEl.classList.contains('is-open')) {
            modalOverlayEl.classList.add('hidden');
        }
    }, 280);
}

// Экспорт в глобальную область window для интеграции
if (typeof window !== 'undefined') {
    window.__openAiDevModal = (tab = null) => openAiDevModal(tab);
    window.initAiDevModal = initAiDevModal;
    window.openAiDevModal = openAiDevModal;
    window.closeAiDevModal = closeAiDevModal;
}

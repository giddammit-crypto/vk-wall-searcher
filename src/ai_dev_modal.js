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
                <span class="ai-dev-tab-count" data-tab-count="free-ai">9</span>
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

                <div class="ai-dev-grid">
                    <!-- LMSYS Chatbot Arena -->
                    <article class="ai-dev-card" data-keywords="lmsys arena blind battle gpt-4o claude 3.5 gemini deepseek r1 leaderboard elo">
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
                                    <span class="ai-dev-card-host">arena.ai &bull; chat.lmsys.org</span>
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
                                <span>Открыть Arena.ai</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://arena.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Qwen Chat -->
                    <article class="ai-dev-card" data-keywords="qwen chat alibaba coder 32b 72b max 128k context artifacts code">
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
                                Официальный бесплатный веб-чат к флагманским моделям Alibaba Cloud. Включает Qwen 2.5 Coder 32B/72B (одна из сильнейших открытых моделей программирования в мире), контекст до 128k токенов, артефакты и анализ файлов.
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
                    <article class="ai-dev-card" data-keywords="deepseek chat r1 v3 reasoning chain-of-thought cot code open source free">
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
                                Революционный китайский сервис с моделями DeepSeek-V3 и DeepSeek-R1. Открытое рассуждение (Chain-of-Thought) мирового уровня, глубокий архитектурный анализ кода, поиск в реальном интернете и моментальный отклик.
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
                                <span>Открыть DeepSeek</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://chat.deepseek.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Z.AI / GLM (Zhipu AI) -->
                    <article class="ai-dev-card" data-keywords="z.ai glm-4 glm-zero zhipu ai china search artifacts multimodal">
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
                                <span>Открыть Z.AI</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://chat.z.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Hugging Face Chat -->
                    <article class="ai-dev-card" data-keywords="hugging face chat llama 3.3 mistral command r qwen open source hub">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-emerald">
                                    <span class="material-symbols-outlined">hub</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Hugging Face Chat</h4>
                                        <span class="ai-dev-tag tag-green">OPEN SOURCE</span>
                                    </div>
                                    <span class="ai-dev-card-host">huggingface.co/chat</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Бесплатный интерфейс доступа к новейшим открытым моделям сообщества: Meta Llama 3.3 70B, Mistral Large 2, Cohere Command R+, Qwen 2.5. Поддерживает создание пользовательских ассистентов и подключение поиска.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-green">Llama 3.3 70B</span>
                                <span class="ai-dev-tag tag-cyan">Mistral Large</span>
                                <span class="ai-dev-tag">No Login Needed</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://huggingface.co/chat" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть HF Chat</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://huggingface.co/chat" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Perplexity AI -->
                    <article class="ai-dev-card" data-keywords="perplexity ai search live citations web academic writing research">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-cyan">
                                    <span class="material-symbols-outlined">travel_explore</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">Perplexity AI</h4>
                                        <span class="ai-dev-tag tag-cyan">ПОИСК С ССЫЛКАМИ</span>
                                    </div>
                                    <span class="ai-dev-card-host">perplexity.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Мощная вопросно-ответная поисковая система с обязательным цитированием первоисточников. Незаменима для поиска актуальной документации, проверки API новых библиотек и решения ошибок компиляции.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">Live Web Search</span>
                                <span class="ai-dev-tag tag-purple">Citations</span>
                                <span class="ai-dev-tag">Pro Search</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://www.perplexity.ai" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Perplexity</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://www.perplexity.ai" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- OpenRouter -->
                    <article class="ai-dev-card" data-keywords="openrouter api hub free pool gateway deepseek llama mistral">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-pink">
                                    <span class="material-symbols-outlined">alt_route</span>
                                </div>
                                <div class="ai-dev-card-info">
                                    <div class="ai-dev-card-title-row">
                                        <h4 class="ai-dev-card-title">OpenRouter</h4>
                                        <span class="ai-dev-tag tag-purple">ХАБ API МОДЕЛЕЙ</span>
                                    </div>
                                    <span class="ai-dev-card-host">openrouter.ai</span>
                                </div>
                            </div>
                            <p class="ai-dev-card-desc">
                                Универсальный шлюз с единым OpenAI-совместимым API к сотням LLM. Предоставляет постоянный пул бесплатных моделей (:free) без кредитной карты: DeepSeek R1, Llama 3.3 70B, Gemini 2.0 Flash Exp.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-purple">Free Tier Pool</span>
                                <span class="ai-dev-tag tag-cyan">Unified API</span>
                                <span class="ai-dev-tag">OpenAI Format</span>
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

                    <!-- Google AI Studio -->
                    <article class="ai-dev-card" data-keywords="google ai studio gemini 2.0 flash pro 2m context multimodal api free">
                        <div>
                            <div class="ai-dev-card-header">
                                <div class="ai-dev-card-icon icon-blue">
                                    <span class="material-symbols-outlined">memory</span>
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
                                Официальная веб-песочница Google для разработчиков. Бесплатный доступ к Gemini 2.0 Flash и Pro с гигантским контекстным окном до 2 000 000 токенов (можно загрузить целые репозитории, видео и книги) + бесплатные API ключи.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-cyan">Gemini 2.0 Flash</span>
                                <span class="ai-dev-tag tag-purple">2M Context</span>
                                <span class="ai-dev-tag tag-green">Free API Keys</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть AI Studio</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://aistudio.google.com" title="Скопировать ссылку">
                                <span class="material-symbols-outlined">content_copy</span>
                                <span>Копировать</span>
                            </button>
                        </div>
                    </article>

                    <!-- Groq Console -->
                    <article class="ai-dev-card" data-keywords="groq console lpu ultra fast speed inference 500 tokens llama mistral">
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
                                Сверхбыстрый инференс открытых моделей на специализированных чипах Groq LPU (Language Processing Unit). Мгновенная генерация ответов со скоростью свыше 500 токенов в секунду с бесплатным тарифом API.
                            </p>
                            <div class="ai-dev-card-badges">
                                <span class="ai-dev-tag tag-amber">Ultra Fast LPU</span>
                                <span class="ai-dev-tag tag-green">Llama 3.3 70B</span>
                                <span class="ai-dev-tag">Free Tier</span>
                            </div>
                        </div>
                        <div class="ai-dev-card-actions">
                            <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" class="ai-dev-action-btn ai-dev-action-primary">
                                <span class="material-symbols-outlined">open_in_new</span>
                                <span>Открыть Groq</span>
                            </a>
                            <button type="button" class="ai-dev-action-btn ai-dev-action-secondary" data-copy-link="https://console.groq.com" title="Скопировать ссылку">
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

        if (!currentSearchQuery) {
            card.classList.remove('is-hidden');
            totalVisible++;
            if (tabKey && countsPerTab[tabKey] !== undefined) countsPerTab[tabKey]++;
            if (tabKey === currentActiveTab) visibleInActiveTab++;
            return;
        }

        const keywords = (card.getAttribute('data-keywords') || '').toLowerCase();
        const textContent = (card.textContent || '').toLowerCase();
        const isMatch = keywords.includes(currentSearchQuery) || textContent.includes(currentSearchQuery);

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

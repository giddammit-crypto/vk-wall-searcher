/**
 * src/mascot.js — Интерактивный робот-маскот Космо (Cosmo) для AURORA (v4.21.0)
 * ============================================================================
 * Персонаж: Космо (Cosmo) — величайший SMM-гуру галактики ВКонтакте.
 * Озвучка: Женский мультяшный голос Бэла (ElevenLabs, звонкий писклявый тон).
 *
 * Ключевые возможности:
 *   1. Озвучка ElevenLabs (61 аудиофайл, голос Бэлы + Cartoon Pitch-Shift):
 *      - 9 шуток во время сканирования для развлечения пользователя (scan_wait_1..9)
 *      - 3 панических вопля при высокой высоте подъема («Спасите-помогите!») (high_altitude_1..3)
 *      - 3 крика радостного полета при броске/швырянии («Уи-и-и-и! Я лечу-у-у-у!») (throw_fling_1..3)
 *      - 20 остроумных и ехидных критических замечаний по статистике постов (critique_1..20)
 *      - 10 реплик ироничной оценки статистики после сканирования (post_scan_1..10)
 *      - 4 комичных ворчания при обычном перетаскивании (drag_drop_1..4)
 *   2. Полное видение открытой страницы (Active Page & Tab Vision):
 *      - Реакция на переключение всех вкладок (Карточки, Отчёт, Аналитика, Советы, Подписчики, ИИ) голосом и текстом.
 *      - Динамические контекстные чипы под каждую вкладку.
 *      - Распознавание фильтрации по филиалу и кликов по хэштегам.
 *   3. Максимальная интеграция ИИ (Full Statistical AI Brain):
 *      - Передача полной картины сканирования (лидеры, просмотры, ER, отстающие) в системный промпт ИИ.
 *      - Голосовое озвучивание ответов ИИ мультяшными репликами Бэлы.
 *   4. Стопроцентное видение результатов сканирования (Zero-Loss Stats Tracking):
 *      - Безупречный доступ к результатам через getLiveScanStats() из state / snapshot.
 *      - Точный пьедестал лидеров без ложного «статистика ещё не собрана».
 *   5. Активная разговорная жизнь:
 *      - Проактивные реплики каждые 16 секунд (голосом и текстом).
 *      - Озвучка всех 20 автономных активностей мультяшными аудиоклипами.
 * ============================================================================
 */

import { resolveApiUrl } from './api.js?v=4.23.2';
import { CosmoChatModal } from './cosmo_chat.js?v=4.64.2';

const AI_PROXY_URL = resolveApiUrl('api/ai-proxy.php');
const TTS_PROXY_URL = resolveApiUrl('api/tts-proxy.php');
const BRANCHES_CACHE_URL = resolveApiUrl('branches_cache.json');
const SUBSCRIBERS_URL = resolveApiUrl('data/subscribers.json');

/**
 * Сигнал таймаута для запросов к ИИ/TTS: зависший прокси не должен оставлять
 * вечное «Космо думает…» — запрос прерывается и падает в обработчик ошибки
 */
function aiFetchSignal(ms) {
    try {
        return (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(ms) : undefined;
    } catch (e) {
        return undefined;
    }
}

// Базовые PNG-спрайты (100% чистый PNG, Zero SVG)
const SPRITES = {
    idle: 'assets/images/mascot/robot_idle.png?v=4.63.0',
    smile: 'assets/images/mascot/robot_smile.png?v=4.63.0',
    thinking: 'assets/images/mascot/robot_thinking.png?v=4.63.0',
    yawn: 'assets/images/mascot/robot_yawn.png?v=4.63.0',
    tired: 'assets/images/mascot/robot_tired.png?v=4.63.0',
    sleep: 'assets/images/mascot/robot_sleep.png?v=4.63.0',
    angry: 'assets/images/mascot/robot_angry.png?v=4.63.0',
    cool: 'assets/images/mascot/robot_cool.png?v=4.63.0',
    idea: 'assets/images/mascot/robot_idea.png?v=4.63.0',
    laugh: 'assets/images/mascot/robot_laugh.png?v=4.63.0',
    party: 'assets/images/mascot/robot_party.png?v=4.63.0',
    read: 'assets/images/mascot/robot_read.png?v=4.63.0',
    shock: 'assets/images/mascot/robot_shock.png?v=4.63.0',
    waving: 'assets/images/mascot/robot_waving.png?v=4.63.0',
    wink: 'assets/images/mascot/robot_wink.png?v=4.63.0',
    sad: 'assets/images/mascot/robot_sad.png?v=4.63.0',
    love: 'assets/images/mascot/robot_love.png?v=4.63.0'
};

// 49 аудиофайлов голоса Космо (Бэла, ElevenLabs + Cartoon Pitch-Shift)
/* Иконка-чип эмоции на облачке */
const BUBBLE_EMO = {
    idle: '🤖', smile: '✨', wink: '😉', love: '❤️', party: '🎉', laugh: '😂',
    cool: '😎', idea: '💡', shock: '⚡', angry: '💢', sad: '💧', tired: '💤',
    yawn: '🥱', thinking: '🤔', waving: '👋', read: '📖', sleep: '😴'
};

const AUDIO_CLIPS = {
    // 10 реплик оценки статистики
    post_scan_1: 'assets/audio/cosmo/post_scan_1.mp3?v=4.23.2',
    post_scan_2: 'assets/audio/cosmo/post_scan_2.mp3?v=4.23.2',
    post_scan_3: 'assets/audio/cosmo/post_scan_3.mp3?v=4.23.2',
    post_scan_4: 'assets/audio/cosmo/post_scan_4.mp3?v=4.23.2',
    post_scan_5: 'assets/audio/cosmo/post_scan_5.mp3?v=4.23.2',
    post_scan_6: 'assets/audio/cosmo/post_scan_6.mp3?v=4.23.2',
    post_scan_7: 'assets/audio/cosmo/post_scan_7.mp3?v=4.23.2',
    post_scan_8: 'assets/audio/cosmo/post_scan_8.mp3?v=4.23.2',
    post_scan_9: 'assets/audio/cosmo/post_scan_9.mp3?v=4.23.2',
    post_scan_10: 'assets/audio/cosmo/post_scan_10.mp3?v=4.23.2',

    // 9 шуток и реплик во время сканирования
    scan_wait_1: 'assets/audio/cosmo/scan_wait_1.mp3?v=4.23.2',
    scan_wait_2: 'assets/audio/cosmo/scan_wait_2.mp3?v=4.23.2',
    scan_wait_3: 'assets/audio/cosmo/scan_wait_3.mp3?v=4.23.2',
    scan_wait_4: 'assets/audio/cosmo/scan_wait_4.mp3?v=4.23.2',
    scan_wait_5: 'assets/audio/cosmo/scan_wait_5.mp3?v=4.23.2',
    scan_wait_6: 'assets/audio/cosmo/scan_wait_6.mp3?v=4.23.2',
    scan_wait_7: 'assets/audio/cosmo/scan_wait_7.mp3?v=4.23.2',
    scan_wait_8: 'assets/audio/cosmo/scan_wait_8.mp3?v=4.23.2',
    scan_wait_9: 'assets/audio/cosmo/scan_wait_9.mp3?v=4.23.2',

    // 4 комичных ворчания при обычном перетаскивании
    drag_drop_1: 'assets/audio/cosmo/drag_drop_1.mp3?v=4.23.2',
    drag_drop_2: 'assets/audio/cosmo/drag_drop_2.mp3?v=4.23.2',
    drag_drop_3: 'assets/audio/cosmo/drag_drop_3.mp3?v=4.23.2',
    drag_drop_4: 'assets/audio/cosmo/drag_drop_4.mp3?v=4.23.2',

    // 3 панических вопля при высокой высоте («Спасите! Помогите!»)
    high_altitude_1: 'assets/audio/cosmo/high_altitude_1.mp3?v=4.23.2',
    high_altitude_2: 'assets/audio/cosmo/high_altitude_2.mp3?v=4.23.2',
    high_altitude_3: 'assets/audio/cosmo/high_altitude_3.mp3?v=4.23.2',

    // 3 крика радостного сверхзвукового полёта при швырянии («Уи-и-и-и! Я лечу-у-у-у!»)
    throw_fling_1: 'assets/audio/cosmo/throw_fling_1.mp3?v=4.23.2',
    throw_fling_2: 'assets/audio/cosmo/throw_fling_2.mp3?v=4.23.2',
    throw_fling_3: 'assets/audio/cosmo/throw_fling_3.mp3?v=4.23.2',

    // 20 остроумных и ехидных критических замечаний по статистике и постам
    critique_1: 'assets/audio/cosmo/critique_1.mp3?v=4.23.2',
    critique_2: 'assets/audio/cosmo/critique_2.mp3?v=4.23.2',
    critique_3: 'assets/audio/cosmo/critique_3.mp3?v=4.23.2',
    critique_4: 'assets/audio/cosmo/critique_4.mp3?v=4.23.2',
    critique_5: 'assets/audio/cosmo/critique_5.mp3?v=4.23.2',
    critique_6: 'assets/audio/cosmo/critique_6.mp3?v=4.23.2',
    critique_7: 'assets/audio/cosmo/critique_7.mp3?v=4.23.2',
    critique_8: 'assets/audio/cosmo/critique_8.mp3?v=4.23.2',
    critique_9: 'assets/audio/cosmo/critique_9.mp3?v=4.23.2',
    critique_10: 'assets/audio/cosmo/critique_10.mp3?v=4.23.2',
    critique_11: 'assets/audio/cosmo/critique_11.mp3?v=4.23.2',
    critique_12: 'assets/audio/cosmo/critique_12.mp3?v=4.23.2',
    critique_13: 'assets/audio/cosmo/critique_13.mp3?v=4.23.2',
    critique_14: 'assets/audio/cosmo/critique_14.mp3?v=4.23.2',
    critique_15: 'assets/audio/cosmo/critique_15.mp3?v=4.23.2',
    critique_16: 'assets/audio/cosmo/critique_16.mp3?v=4.23.2',
    critique_17: 'assets/audio/cosmo/critique_17.mp3?v=4.23.2',
    critique_18: 'assets/audio/cosmo/critique_18.mp3?v=4.23.2',
    critique_19: 'assets/audio/cosmo/critique_19.mp3?v=4.23.2',
    critique_20: 'assets/audio/cosmo/critique_20.mp3?v=4.23.2',

    // 3 фразы искреннего удивления охватами
    surprise_1: 'assets/audio/cosmo/surprise_1.mp3?v=4.23.2',
    surprise_2: 'assets/audio/cosmo/surprise_2.mp3?v=4.23.2',
    surprise_3: 'assets/audio/cosmo/surprise_3.mp3?v=4.23.2',

    // 3 фразы комичного разочарования
    disappoint_1: 'assets/audio/cosmo/disappoint_1.mp3?v=4.23.2',
    disappoint_2: 'assets/audio/cosmo/disappoint_2.mp3?v=4.23.2',
    disappoint_3: 'assets/audio/cosmo/disappoint_3.mp3?v=4.23.2',

    // 2 фразы острой критики контента
    critique_extra_1: 'assets/audio/cosmo/critique_extra_1.mp3?v=4.23.2',
    critique_extra_2: 'assets/audio/cosmo/critique_extra_2.mp3?v=4.23.2',

    // 4 фразы искромётного сарказма и SMM-шуток
    sarcasm_1: 'assets/audio/cosmo/sarcasm_1.mp3?v=4.23.2',
    sarcasm_2: 'assets/audio/cosmo/sarcasm_2.mp3?v=4.23.2',
    sarcasm_3: 'assets/audio/cosmo/sarcasm_3.mp3?v=4.23.2',
    sarcasm_4: 'assets/audio/cosmo/sarcasm_4.mp3?v=4.23.2'
};

const MOOD_EMOJIS = {
    idle: '',
    smile: '✨',
    thinking: '💡',
    yawn: '🥱',
    tired: '😮‍💨',
    sleep: '😴',
    angry: '💢',
    ai: '⚡',
    smm: '📈',
    tablet: '📱',
    cool: '🕶️',
    like: '❤️',
    star: '⭐',
    crown: '👑',
    wave: '👋',
    telescope: '🔭',
    scan: '🔍',
    laugh: '😄',
    read: '📖',
    idea: '💡',
    party: '🎉',
    waving: '👋',
    wink: '😉',
    shock: '⚡',
    sad: '😢',
    love: '❤️'
};

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\'/g, '&#039;');
}

function formatViews(num) {
    const n = Number(num) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString('ru-RU');
}

const TAB_SPEECH_VARIANTS = {
    'visual-tab': [
        {
            voice: 'critique_10',
            activity: 'inspect_screen',
            text: (s) => s?.count
                ? `## Лента постов 🖼️📰\nСобрано **${s.count}** записей! Лидер по просмотрам — **${escapeHtml(s.topBranch || 'Лидер')}**. Изучай визуальный стиль!`
                : `## Карточки публикаций 🖼️\nЗдесь живая лента постов. Запусти поиск сверху, и я найду лучшие публикации!`
        },
        {
            voice: 'critique_3',
            activity: 'magnifier_scan',
            text: (s) => s?.count
                ? `## Визуальный ряд 🎨\nКачественные иллюстрации привлекают на 40% больше внимания. Оцени снимки в этой ленте!`
                : `## Визуальная витрина 🎨\nУмная лента обожает сочные фотографии и живые кадры. Скоро здесь будут все посты!`
        },
        {
            voice: 'post_scan_1',
            activity: 'inspect_screen',
            text: (s) => s?.count
                ? `## Анализ публикаций 🧐\nВсе посты перед глазами! Обрати внимание на соотношение текста и иллюстраций у лидеров.`
                : `## Обзор стены 🚀\nГотов разложить публикации по полочкам! Нажимай сканирование, полетели!`
        },
        {
            voice: 'critique_7',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Структура текстов 📜\nКороткие абзацы и лёгкий слог выигрывают у полотен текста. Лидеры знают этот секрет!`
                : `## Формат контента 📜\nВ этой вкладке удобно сравнивать подачу материала и оформление постов.`
        },
        {
            voice: 'critique_14',
            activity: 'check_watch',
            text: (s) => s?.count
                ? `## Эмоции и акценты ✨\nУмеренные эмодзи оживляют текст. Главное — не перегружать пост знаками!`
                : `## Эстетика ленты ✨\nПосле сканирования здесь появятся карточки с полными метриками вовлечённости.`
        },
        {
            voice: 'surprise_1',
            activity: 'inspect_screen',
            text: (s) => s?.count
                ? `## Отличные охваты! 🚀\nТоповые записи набрали внушительное число просмотров! Берём лучшие приёмы на вооружение.`
                : `## Поиск шедевров 🔍\nИщу публикации, которые покорили сердца читателей. Запустим сканирование?`
        },
        {
            voice: 'critique_16',
            activity: 'magnifier_scan',
            text: (s) => s?.count
                ? `## Спектр вовлечённости 🔬\nПроверь реакцию аудитории на каждый пост: лайки, репосты и комментарии на виду!`
                : `## Глубокий просмотр 🔬\nЗдесь можно детально изучить каждый пост с прямыми ссылками во ВКонтакте.`
        },
        {
            voice: 'sarcasm_2',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Секреты алгоритма 🤖\nУмная лента благоволит оригинальным публикациям с живыми фотографиями читателей.`
                : `## Умный показ 🤖\nПосмотрим, кого алгоритм продвигает охотнее всего! Включай поиск!`
        },
        {
            voice: 'critique_4',
            activity: 'inspect_screen',
            text: (s) => s?.count
                ? `## Хэштеги и навигация #️⃣\nГрамотные тематические теги помогают читателям находить нужные книги и события.`
                : `## Навигация по записям #️⃣\nФильтруй публикации по рубрикам и хэштегам прямо в этой ленте.`
        },
        {
            voice: 'post_scan_10',
            activity: 'smm_guru_pose',
            text: (s) => s?.count
                ? `## Галерея вдохновения 🌟\nИзучай опыт коллег и внедряй самые удачные форматы в свои публикации!`
                : `## Визуальная галерея 🌟\nКосмо готов к инспекции контента! Жду твою команду на старт!`
        }
    ],
    'report-tab': [
        {
            voice: 'critique_19',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Табличный отчёт 📊📋\nВсе ссылки и цифры по филиалам как на ладони! Идеально для методических отчётов.`
                : `## Табличный отчёт 📋\nСводная таблица с кликабельными ссылками на посты. Отсканируй стену для заполнения!`
        },
        {
            voice: 'post_scan_3',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Точные цифры 🔢\nСтатистика просмотров, лайков и репостов сведена в строгий реестр.`
                : `## Реестр показателей 🔢\nЗдесь формируется точная ведомость для руководства. Запусти сбор данных!`
        },
        {
            voice: 'critique_1',
            activity: 'check_watch',
            text: (s) => s?.count
                ? `## Анализ обратной связи 💬\nТаблица показывает активность аудитории по каждому филиалу без прикрас.`
                : `## Учёт активности 💬\nВсе ключевые метрики будут структурированы по столбцам и датам.`
        },
        {
            voice: 'critique_12',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Лидеры таблицы 🥇\nВверху списка — самые результативные публикации периода. Заслуженное признание!`
                : `## Ранжирование постов 🥇\nПосле поиска ты сможешь отсортировать отчёт по любому столбцу.`
        },
        {
            voice: 'post_scan_6',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Готово к экспорту 📑\nДанные проверены и готовы к выгрузке в Excel или печати.`
                : `## Экспорт и печать 📑\nУдобный формат для сохранения сводок и подготовки официальных справок.`
        },
        {
            voice: 'critique_17',
            activity: 'check_watch',
            text: (s) => s?.count
                ? `## Методический порядок 📁\nКосмо обожает структуру: каждый филиал на своём месте, все показатели сходятся!`
                : `## Структурирование данных 📁\nАвтоматическое сведение сотен постов в единую наглядную таблицу.`
        },
        {
            voice: 'critique_5',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Хронология записей ⏳\nОбрати внимание на даты и время публикаций: есть ли закономерность в успехе?`
                : `## Временные интервалы ⏳\nТаблица поможет выявить наиболее удачные часы для выхода анонсов.`
        },
        {
            voice: 'surprise_3',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Впечатляющий массив 📈\nСводка заполнена до отказа! С такими данными любой отчёт пишется за пару минут.`
                : `## База показателей 📈\nЖду результатов сканирования, чтобы сформировать полную ведомость!`
        },
        {
            voice: 'critique_18',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Внимание на экран 🚀\nДанные говорят сами за себя. Пора делать выводы и планировать контент-план!`
                : `## Аналитическая ведомость 🚀\nЗдесь нет лишней графики — только сухие факты и ссылки для проверки.`
        },
        {
            voice: 'post_scan_4',
            activity: 'smm_guru_pose',
            text: (s) => s?.count
                ? `## Полный контроль 🎯\nВся библиотечная сеть перед глазами. С Космо ни один показатель не потеряется!`
                : `## Контроль показателей 🎯\nЗапусти сканирование, и сводный отчёт будет сформирован мгновенно!`
        }
    ],
    'analytics-tab': [
        {
            voice: 'critique_2',
            activity: 'smm_guru_pose',
            text: (s) => s?.count
                ? `## Рейтинг активности 📈👑\nВот они, графики славы! На первом месте **${escapeHtml(s.topBranch || 'Лидер')}**. Изучаем диаграммы!`
                : `## Рейтинг активности 📈\nЗдесь появятся сравнительные диаграммы охватов и вовлечённости филиалов.`
        },
        {
            voice: 'critique_13',
            activity: 'magnifier_scan',
            text: (s) => s?.count
                ? `## Коэффициент вовлечённости 💡\nВысокий ER доказывает, что искренний контент привлекает больше, чем формальный!`
                : `## Вовлечённость аудитории 💡\nГрафики покажут процент читателей, которые активно реагируют на посты.`
        },
        {
            voice: 'surprise_2',
            activity: 'smm_guru_pose',
            text: (s) => s?.count
                ? `## Прорывные результаты! ⚡\nНекоторые филиалы показали потрясающую динамику по охватам!`
                : `## Потенциал роста ⚡\nСравним показатели библиотек в едином наглядном масштабе.`
        },
        {
            voice: 'critique_8',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Авторский контент 💎\nОригинальные посты всегда приносят втрое больше просмотров, чем простые репосты.`
                : `## Сравнение форматов 💎\nУзнаем, какие публикации дают максимальный прирост внимания читателей.`
        },
        {
            voice: 'critique_12',
            activity: 'smm_guru_pose',
            text: (s) => s?.count
                ? `## Чемпионский отрыв 🥇\nЛидер уверенно держит планку! Остальным филиалам есть на кого равняться.`
                : `## Определение лидеров 🥇\nДиаграммы наглядно продемонстрируют распределение читательского внимания.`
        },
        {
            voice: 'critique_16',
            activity: 'magnifier_scan',
            text: (s) => s?.count
                ? `## Глубокий анализ 🔬\nСравниваем средний охват на один пост: это самый честный показатель качества контента.`
                : `## Оценка эффективности 🔬\nАлгоритмы рассчитают удельные метрики по каждому подразделению сети.`
        },
        {
            voice: 'sarcasm_3',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Борьба за охваты 🔥\nКонкуренция в умной ленте растёт! Пора обновить визуальный стиль отстающим.`
                : `## Тренды умной ленты 🔥\nПосмотрим, кто сумел покорить рекомендательную ленту ВКонтакте!`
        },
        {
            voice: 'disappoint_2',
            activity: 'check_watch',
            text: (s) => s?.count
                ? `## Резервы для роста 📉\nЕсли показатели просели — не опускайте руки. Регулярность быстро вернёт охваты!`
                : `## Точки роста 📉\nГрафики сразу подсветят направления, требующие методической поддержки.`
        },
        {
            voice: 'post_scan_2',
            activity: 'smm_guru_pose',
            text: (s) => s?.count
                ? `## Стратегический обзор 🗺️\nКартина ясна: баланс между анонсами и обзорами книг даёт лучший отклик.`
                : `## Стратегия продвижения 🗺️\nЗапусти поиск, и диаграммы нарисуют полную карту активности сети!`
        },
        {
            voice: 'critique_20',
            activity: 'smm_guru_pose',
            text: (s) => s?.count
                ? `## Вершина мастерства 💅\nГрамотная SMM-стратегия видна невооружённым глазом на этих графиках!`
                : `## Профессиональный аудит 💅\nКосмо готов разложить всю аналитику по полочкам на высшем уровне!`
        }
    ],
    'summary-tab': [
        {
            voice: 'critique_17',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Пояснительная записка 📜🧐\nГотовая сводка для руководства с формулировками и цифрами. Только суть!`
                : `## Пояснительная записка 📜\nЗдесь автоматически сформируется аналитическая записка по итогам поиска.`
        },
        {
            voice: 'post_scan_6',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Официальная справка 🏛️\nСформулированы ключевые тенденции и итоги периода. Можно сразу вставлять в отчёт!`
                : `## Методический синтез 🏛️\nАвтоматическая подготовка текста аналитического отчёта для методистов.`
        },
        {
            voice: 'critique_19',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Выводы и заключения 📑\nВсе основные цифры подтверждены ссылками на первоисточники.`
                : `## Сводные заключения 📑\nПозволь алгоритмам обобщить массив данных в стройный связный текст.`
        },
        {
            voice: 'post_scan_3',
            activity: 'check_watch',
            text: (s) => s?.count
                ? `## Лаконичность и точность 🎯\nНичего лишнего: объём контента, лидеры просмотров и главные показатели периода.`
                : `## Итоговый конспект 🎯\nЭкономит часы методической работы. Нажми поиск для генерации!`
        },
        {
            voice: 'critique_15',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Взвешенная оценка ⚖️\nОбъективный взгляд на общую динамику публикационной активности библиотечной системы.`
                : `## Объективная оценка ⚖️\nЗдесь формируется резюме эффективности информационной работы филиалов.`
        },
        {
            voice: 'surprise_3',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Впечатляющий объём 📚\nБиблиотеки проделали огромную работу за этот период! Все достижения зафиксированы.`
                : `## Фиксация результатов 📚\nОтсканируй стену, чтобы получить подробную пояснительную записку.`
        },
        {
            voice: 'critique_10',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Качественные ориентиры 🏆\nОтмечены лучшие практики, которые стоит тиражировать на всю сеть.`
                : `## Лучшие практики 🏆\nСправка выделит самые результативные решения для масштабирования.`
        },
        {
            voice: 'disappoint_3',
            activity: 'check_watch',
            text: (s) => s?.count
                ? `## Зоны внимания ⚠️\nВ записке корректно указаны слабые места, требующие своевременной корректировки.`
                : `## Выявление недочётов ⚠️\nСистема деликатно подскажет, где показатели отстают от средних.`
        },
        {
            voice: 'critique_18',
            activity: 'smm_guru_pose',
            text: (s) => s?.count
                ? `## Внимание на экран 🚀\nТекст вычитан, цифры проверены. Документ готов к отправке!`
                : `## Финальный отчёт 🚀\nКосмо подготовит безупречную аналитическую записку сразу после поиска!`
        },
        {
            voice: 'post_scan_8',
            activity: 'smm_guru_pose',
            text: (s) => s?.count
                ? `## Высший пилотаж 🌟\nПрофессионально оформленная пояснительная записка — гордость любого методиста!`
                : `## Экспертная записка 🌟\nЗапусти сканирование, и сводный документ будет составлен автоматически!`
        }
    ],
    'advice-tab': [
        {
            voice: 'critique_11',
            activity: 'magnifier_scan',
            text: (s) => s?.count
                ? `## Советы филиалам 💡🚀\nИндивидуальные рекомендации! Добавляйте живые фото читателей и открытые вопросы.`
                : `## Советы филиалам 💡\nЗдесь собраны умные советы для каждого филиала. Запусти сканирование!`
        },
        {
            voice: 'critique_3',
            activity: 'magnifier_scan',
            text: (s) => s?.count
                ? `## Сила иллюстраций 📸\nНикогда не публикуйте сухой текст без качественного изображения или обложки книги!`
                : `## Визуальные подсказки 📸\nПодробные советы по улучшению оформления постов для каждого филиала.`
        },
        {
            voice: 'critique_7',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Лёгкость восприятия 📖\nРазбивайте длинные мысли на абзацы и списки. Читателям проще воспринимать ритмичный текст.`
                : `## Работа со словом 📖\nРекомендации по структуре текстов и созданию цепляющих вступлений.`
        },
        {
            voice: 'critique_4',
            activity: 'magnifier_scan',
            text: (s) => s?.count
                ? `## Умеренность в тегах #️⃣\nИспользуйте от трёх до пяти целевых хэштегов. Избыток тегов снижает приоритет в ленте.`
                : `## Рубрикация записей #️⃣\nСоветы по грамотному тегированию и созданию узнаваемых постоянных рубрик.`
        },
        {
            voice: 'critique_5',
            activity: 'check_watch',
            text: (s) => s?.count
                ? `## Своевременность анонсов ⏰\nПубликуйте анонсы мероприятий за три-четыре дня до события, а не за пару часов!`
                : `## Планирование времени ⏰\nМетодические ориентиры по составлению эффективного графика публикаций.`
        },
        {
            voice: 'critique_1',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Диалог с читателем 💬\nЗадавайте вопрос в конце поста и обязательно отвечайте на каждый комментарий!`
                : `## Вовлечение читателей 💬\nПроверенные механики для оживления обсуждений под публикациями.`
        },
        {
            voice: 'sarcasm_1',
            activity: 'tablet_study',
            text: (s) => s?.count
                ? `## Время выхода 🦉\nЛучшие часы для библиотечных групп — утро (с 9 до 11) и вечер (с 18 до 20). Не постите в полночь!`
                : `## Прайм-тайм группы 🦉\nПодсказки по выбору оптимального времени публикации для максимального охвата.`
        },
        {
            voice: 'critique_8',
            activity: 'magnifier_scan',
            text: (s) => s?.count
                ? `## Свой уникальный голос ✍️\nЧитатели ценят авторский взгляд библиотекаря. Делитесь личными впечатлениями о книгах!`
                : `## Индивидуальный почерк ✍️\nКак выделиться на фоне сотен однотипных новостных сообщений.`
        },
        {
            voice: 'critique_extra_2',
            activity: 'magnifier_scan',
            text: (s) => s?.count
                ? `## Призыв к действию 🎯\nПриглашайте читателей прийти за книгой или оставить мнение: прямой призыв повышает отклик.`
                : `## Мотивация аудитории 🎯\nПрактические советы по формулированию ясных призывов к действию.`
        },
        {
            voice: 'post_scan_10',
            activity: 'smm_guru_pose',
            text: (s) => s?.count
                ? `## Секрет успеха от Космо ✨\nЛюбите своих читателей, делайте душевные фото, а Космо поможет с цифрами!`
                : `## Космические секреты ✨\nСканируй стену, и я выдам персональный рецепт успеха для каждого филиала!`
        }
    ],
    'subscribers-tab': [
        {
            voice: 'critique_13',
            activity: 'telescope_look',
            text: (s) => s?.count
                ? `## Аудитория и подписчики 👥📈\nДинамика сообществ! Помни: читатели подписываются на искренность, а не на сухие отчёты.`
                : `## Аудитория и подписчики 👥\nЗдесь отображаются данные о подписчиках и активности филиальных групп.`
        },
        {
            voice: 'post_scan_4',
            activity: 'telescope_look',
            text: (s) => s?.count
                ? `## Ядро сообщества ❤️\nГлавная ценность — преданные постоянные читатели, которые регулярно комментируют записи.`
                : `## Читательское сообщество ❤️\nОтслеживай рост лояльной аудитории и постоянных посетителей библиотек.`
        },
        {
            voice: 'critique_2',
            activity: 'telescope_look',
            text: (s) => s?.count
                ? `## Лидеры по охвату аудитории 👑\nКрупные филиалы собирают тысячи читателей. Учимся масштабировать опыт!`
                : `## Масштаб аудитории 👑\nСравнение численности и динамики подписчиков по всем филиалам города.`
        },
        {
            voice: 'surprise_1',
            activity: 'telescope_look',
            text: (s) => s?.count
                ? `## Прирост читателей 🚀\nИнтересные посты и фотоотчёты привлекают новых подписчиков быстрее любой рекламы!`
                : `## Рост сообществ 🚀\nУзнай, какие темы вызывают наибольший приток новых читателей.`
        },
        {
            voice: 'critique_16',
            activity: 'telescope_look',
            text: (s) => s?.count
                ? `## Плотность взаимодействия 🔬\nИногда группа на 500 человек активнее многотысячного паблика. Всё дело в душевности!`
                : `## Активность на подписчика 🔬\nОцениваем реальное качество контакта с каждым читателем.`
        },
        {
            voice: 'disappoint_1',
            activity: 'check_watch',
            text: (s) => s?.count
                ? `## Удержание внимания 🧲\nЕсли подписчики молчат, запустите книжную викторину или интерактивный опрос!`
                : `## Вовлечение молчунов 🧲\nПодсказки по превращению пассивных читателей в активных участников бесед.`
        },
        {
            voice: 'sarcasm_4',
            activity: 'telescope_look',
            text: (s) => s?.count
                ? `## Не числом, а умением! 💅\nКачество контакта с аудиторией важнее пустых цифр в счётчике!`
                : `## Настоящие читатели 💅\nОриентируемся на живых людей, а не на накрученные цифры.`
        },
        {
            voice: 'critique_10',
            activity: 'telescope_look',
            text: (s) => s?.count
                ? `## Читательский отклик 💬\nБлагодарите читателей за комментарии: личное внимание превращает подписчиков в друзей библиотеки.`
                : `## Культура общения 💬\nРазвиваем доброжелательное общение в комментариях под публикациями.`
        },
        {
            voice: 'post_scan_1',
            activity: 'telescope_look',
            text: (s) => s?.count
                ? `## Горизонт охвата 🔭\nВместе наши библиотеки формируют огромное культурное сообщество города Владимира!`
                : `## Культурный охват 🔭\nУзнай суммарную читательскую аудиторию всей централизованной системы.`
        },
        {
            voice: 'post_scan_10',
            activity: 'smm_guru_pose',
            text: (s) => s?.count
                ? `## Вдохновляй аудиторию! ✨\nКаждый новый подписчик — это потенциальный гость в читальном зале!`
                : `## Центр притяжения ✨\nБиблиотечная группа ВКонтакте — это виртуальный читальный зал 24/7.`
        }
    ]
};


// Быстрые чипы для диалога
const QUICK_CHIPS = [
    { label: '💬 Чат с Космо', action: 'open-chat' },
    { label: '🎮 Игра «Спасатель ПК»', action: 'open-game' },
    { label: '📊 Кто лидер?', action: 'leader' },
    { label: '🛸 Патруль 30 сек', action: 'patrol' },
    { label: '💡 Совет по контенту', query: 'Дай один короткий совет для роста активности читателей.' },
    { label: '✨ Спросить Космо...', action: 'custom' }
];

// Локальные реплики Космо (0 токенов!)
const COSMO_LOCAL_BANTER = [
    'Библиотечные паблики рулят, если в них есть душа и юмор! Ну и я, конечно же. ✨',
    'Умная лента ВК сканирует пост за 0.03 секунды. Я делаю это быстрее, но результат тот же: шедевр! ⚡',
    'Утренние посты в 08:15 читают в автобусах. Лови сонных читателей теплым контентом! ☕',
    'Репост без своего комментария — как чай без заварки. Добавь пару мыслей для виральности! 💡',
    'Карусель из картинок удерживает взгляд на 4 секунды дольше. А это победа над лентой новостей! 🎠',
    'Инфографика в библиотеке? Читатели в восторге, методисты в экстазе! Делай чаще. 📈',
    'Хочешь виральный охват? Расскажи историю о потерянной и найденной через 30 лет книге! 📖',
    'Пока ты думаешь над темой, другие уже собирают просмотры на котиках в читальном зале! 🐱',
    'Ого, какая скорость клика! Тренируешься ставить лайки на сверхзвуке? ⚡',
    'Курсор замер... Ищешь кнопку «Сделать шедевр»? Она прямо передо мной! 🎨',
    'Не туда кликаешь, дай покажу как надо! Я же сертифицированный SMM-гуру. 💅',
    'Курсор кругами ходит... Пытаешься заколдовать алгоритмы продвижения? 🌀',
    'Быстрый скролл детектирован! Читаешь посты со скоростью света? 🔍',
    'Патрулирую периметр экрана. Ни один читатель без лайка не уйдет! 🚨',
    'Знаешь главное правило SMM? Контент — король, а Космо — его космический советник! 👑',
    'Смотрю на графики во вкладке «Аналитика»... Чистая поэзия цифр! 📊',
    'Ты работаешь, я патрулирую экран. Идеальный экипаж AURORA! 🚀'
];

export class AuroraMascot {
    constructor() {
        this.container = null;
        this.bodyEl = null;
        this.floaterEl = null;
        this.spriteImg = null;
        this.bubbleEl = null;
        this.bubbleTextEl = null;
        this.statusTitleEl = null;
        this.moodBadgeEl = null;
        this.collapsedPill = null;
        this.particlesLayerEl = null;
        this.propsLayerEl = null;
        this.fxLayerEl = null;
        this.modalOverlayEl = null;
        this.modalEscHandler = null;
        this.chatModal = null;
        this.snapshotGetter = null;
        this.aiInputWrapEl = null;
        this.aiInputEl = null;
        this.aiSendBtnEl = null;
        this.soundToggleBtn = null;

        this.currentState = 'idle';
        this.isSleeping = false;
        this.isCollapsed = false;
        this.isIn3D = false;
        this.isAiLoading = false;
        this.isPerformingActivity = false;
        this.isPatrolling = false;
        this.isDragging = false;
        this.isReturningHome = false;
        this.dragSessionId = 0;
        this.isMuted = false;
        this.isSpeakingAudio = false;
        this.userDismissedBubble = false;

        this.currentAudio = null;
        this.speechTimer = null;
        this.idleTimer = null;
        this.proactiveTimer = null;
        this.activityCycleTimer = null;
        this.returnTimer = null;
        this.stateResetTimer = null;
        this.badgeResetTimer = null;
        this.clickTimeout = null;
        this.patrolAnimFrame = null;
        this.animFrameId = null;
        this.scanBanterTimer = null;
        this.usedScanWaitJokes = new Set();

        // Позиционирование
        this.currentPosX = 24;
        this.currentPosY = 24;
        this.homePosX = 24;
        this.baseLeft = 24;
        this.baseBottom = 24;

        // 2.5D трекинг курсора
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.lastMouseMoveTime = Date.now();
        this.mouseVelocity = 0;
        this.currentRotX = 0;
        this.currentRotY = 0;
        this.targetRotX = 0;
        this.targetRotY = 0;
        this.lastTeaseCommentTime = 0;
        this.teaseCooldownMs = 14000;
        this.lastTabSwitchTime = 0;
        this.tabSpeechHistory = {};
        this.lastTabVoiceTime = 0;
        this.tabVoiceCooldownMs = 20000;
        this.analyzedTop3Signatures = new Set();
        this.analyzedTop3AudioCache = new Map();
        this.chipsContainer = null;

        // Кэш и сканирование
        this.aiResponseCache = new Map();
        this.lastAiQueryTime = 0;
        this.aiQueryCooldownMs = 10000;
        this.lastScanStats = null;
        this.currentActivity = null;

        // База знаний проекта: справочник филиалов и динамика подписчиков
        this.branchesRef = null;
        this.subscribersData = null;
        this.knowledgeLoaded = false;
        // Короткая память диалога для уточняющих вопросов ИИ
        this.aiConversationMemory = [];

        // Рабочий режим: инсайты вместо болтовни (настройка сохраняется)
        this.isWorkMode = false;
        try {
            this.isWorkMode = localStorage.getItem('aurora_cosmo_work_mode') === '1';
        } catch (e) {}

        // Включение / выключение маскота: по умолчанию выключен ('0')
        this.isEnabled = false;
        try {
            this.isEnabled = localStorage.getItem('aurora_mascot_enabled') === '1';
        } catch (e) {
            this.isEnabled = false;
        }

        this.modeToggleBtn = null;
        this.reminderTimers = [];
        this.lastScanTime = null;
        this.lastScanInsight = null;

        this.onMouseMove = this.onMouseMove.bind(this);
        this.onUserActivity = this.onUserActivity.bind(this);
        this.updateParallaxAndMotion = this.updateParallaxAndMotion.bind(this);
    }

    isMobile() {
        return window.innerWidth <= 768 || (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 768px)').matches);
    }

    /* ---------------------------------------------------------------------
     * 1. Инициализация DOM-структуры Космо
     * ------------------------------------------------------------------- */
    init() {
        if (this.container) {
            this.syncToggleButtons();
            return;
        }

        // Восстановление закреплённой пользователем базы Космо из localStorage (только на ПК)
        try {
            if (!this.isMobile()) {
                const savedX = localStorage.getItem('aurora_mascot_base_x');
                const savedY = localStorage.getItem('aurora_mascot_base_y');
                if (savedX !== null && !isNaN(parseFloat(savedX))) {
                    this.baseLeft = parseFloat(savedX);
                    this.currentPosX = this.baseLeft;
                    this.homePosX = this.baseLeft;
                }
                if (savedY !== null && !isNaN(parseFloat(savedY))) {
                    this.baseBottom = parseFloat(savedY);
                    this.currentPosY = this.baseBottom;
                }
            } else {
                this.currentPosX = 14;
                this.homePosX = 14;
                this.baseLeft = 14;
                this.currentPosY = 16;
                this.baseBottom = 16;
            }
        } catch (e) {
            console.debug('[Cosmo] Failed to load saved base from localStorage:', e);
        }

        // Предзагрузка спрайтов
        Object.values(SPRITES).forEach(url => {
            const img = new Image();
            img.src = url;
        });

        const container = document.createElement('div');
        container.className = 'aurora-mascot-container';
        container.setAttribute('data-state', 'idle');
        container.style.left = `${this.currentPosX}px`;
        container.style.bottom = `${this.currentPosY}px`;

        container.innerHTML = `
            <!-- Облачко диалога и подсказок (поддержка Markdown) -->
            <div class="mascot-bubble" data-mascot-bubble>
                <div class="mascot-bubble-header">
                    <span class="mascot-status-tag">
                        <span class="mascot-status-dot"></span>
                        <span class="mascot-status-title" data-mascot-title>КОСМО • SMM-ГУРУ</span>
                        <span class="mascot-voice-bars">
                            <span class="voice-bar"></span>
                            <span class="voice-bar"></span>
                            <span class="voice-bar"></span>
                            <span class="voice-bar"></span>
                        </span>
                    </span>
                    <button type="button" class="mascot-sound-toggle mascot-chat-toggle" title="Открыть полноценный чат с Космо" data-mascot-open-chat>💬</button>
                    <button type="button" class="mascot-sound-toggle mascot-mode-toggle" title="Режим: работа (инсайты) / развлечение (шутки)" data-mascot-mode>🎭</button>
                    <button type="button" class="mascot-sound-toggle" title="Включить/выключить голос Космо" data-mascot-sound>🔊</button>
                    <button type="button" class="mascot-bubble-close" title="Закрыть реплику" data-bubble-close>&times;</button>
                </div>

                <div class="mascot-bubble-emo" data-bubble-emo>🤖</div>
                <div class="mascot-bubble-text" data-bubble-text>
                    <div class="mascot-md-h2">Салют! Я Космо 🚀</div>
                    Твой озорной робот-маскот и главный SMM-эксперт галактики. Показывай стену, **прокачаем охваты до небес!** ✨
                </div>

                <!-- Ряд быстрых чипов для экспресс-подсказок -->
                <div class="mascot-ai-chip-row" data-mascot-chips>
                    ${QUICK_CHIPS.map(c => `
                        <button type="button" class="mascot-ai-chip" data-chip="${c.label}" data-query="${c.query || ''}" data-action="${c.action || ''}">
                            ${c.label}
                        </button>
                    `).join('')}
                </div>

                <!-- Микро-поле ввода вопроса ИИ -->
                <div class="mascot-ai-input-wrap" data-mascot-ai-wrap>
                    <input type="text" class="mascot-ai-input" data-mascot-ai-input placeholder="Спросить Космо..." maxlength="120" />
                    <button type="button" class="mascot-ai-send-btn" data-mascot-ai-send title="Отправить Космо">➤</button>
                </div>
            </div>

            <!-- Корпус Космо: drag & drop, 2.5D трекинг, моушен-слои -->
            <div class="mascot-body-wrapper" data-mascot-body title="Космо: зажми ЛКМ для переноса, клик — эмоция, двойной клик — чат с Космо!">
                <button type="button" class="mascot-direct-chat-btn" title="Открыть диалог с Космо (двойной клик по роботу)" data-mascot-open-chat>💬 Чат</button>
                <button type="button" class="mascot-toggle-btn" title="Свернуть Космо" data-mascot-collapse>&minus;</button>
                
                <div class="mascot-floater" data-mascot-floater>
                    <!-- Энергетическая аура за корпусом -->
                    <div class="mascot-aura"></div>

                    <!-- Орбитальные точки размышлений -->
                    <div class="mascot-think-orbit"><span></span><span></span><span></span></div>

                    <!-- Неоновый маячок антенны -->
                    <div class="mascot-antenna-beacon"></div>

                    <!-- Эмодзи-бейдж настроения -->
                    <div class="mascot-mood-badge" data-mascot-mood-badge></div>

                    <!-- Плазменный факел антигравитации -->
                    <div class="mascot-thruster-glow"></div>

                    <!-- 100% чистый PNG спрайт робота -->
                    <img src="${SPRITES.idle}" alt="Космо" class="mascot-sprite-img" data-mascot-img draggable="false" />

                    <!-- Слой сканлайнов визора -->
                    <div class="mascot-screen-overlay"></div>

                    <!-- Слой динамических реквизитов -->
                    <div class="mascot-props-layer" data-mascot-props></div>

                    <!-- Частицы и искры -->
                    <div class="mascot-particles-layer" data-mascot-particles></div>

                    <!-- Частицы сна (Zzz) -->
                    <div class="mascot-sleep-particles">
                        <span class="sleep-z z-1">z</span><span class="sleep-z z-2">Z</span><span class="sleep-z z-3">Z</span>
                    </div>
                </div>

                <!-- Слой ударных эффектов (шок-волна приземления) -->
                <div class="mascot-fx-layer" data-mascot-fx></div>

                <!-- Динамическая тень на полу -->
                <div class="mascot-shadow"></div>
            </div>
        `;

        // Пилюля для свернутого состояния
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'mascot-collapsed-pill';
        pill.title = 'Развернуть Космо';
        pill.innerHTML = `
            <img src="${SPRITES.idle}" alt="Космо" class="mascot-pill-avatar" />
            <span>Космо • SMM</span>
        `;

        document.body.appendChild(container);
        document.body.appendChild(pill);

        this.container = container;
        this.bodyEl = container.querySelector('[data-mascot-body]');
        this.floaterEl = container.querySelector('[data-mascot-floater]');
        this.spriteImg = container.querySelector('[data-mascot-img]');
        this.bubbleEl = container.querySelector('[data-mascot-bubble]');
        this.bubbleTextEl = container.querySelector('[data-bubble-text]');
        this.bubbleEmoEl = container.querySelector('[data-bubble-emo]');
        this.statusTitleEl = container.querySelector('[data-mascot-title]');
        this.moodBadgeEl = container.querySelector('[data-mascot-mood-badge]');
        this.particlesLayerEl = container.querySelector('[data-mascot-particles]');
        this.propsLayerEl = container.querySelector('[data-mascot-props]');
        this.buildActivityProps();
        this.fxLayerEl = container.querySelector('[data-mascot-fx]');
        this.aiInputWrapEl = container.querySelector('[data-mascot-ai-wrap]');
        this.aiInputEl = container.querySelector('[data-mascot-ai-input]');
        this.aiSendBtnEl = container.querySelector('[data-mascot-ai-send]');
        this.soundToggleBtn = container.querySelector('[data-mascot-sound]');
        this.chipsContainer = container.querySelector('[data-mascot-chips]');
        this.collapsedPill = pill;
        this.chatModal = new CosmoChatModal({ mascot: this });

        this.bindEvents();
        this.scheduleReminders();
        this.bindDragAndDrop();
        this.bindAutonomousInteractions();
        this.getLiveScanStats();
        this.updateDynamicChips();
        this.syncToggleButtons();

        if (!this.isEnabled) {
            this.container.classList.add('mascot-hidden');
            this.container.style.display = 'none';
            this.collapsedPill.classList.remove('is-visible');
            this.collapsedPill.style.display = 'none';
        } else {
            this.startAutonomousCycle();
            this.startProactiveChatter();
            this.updateParallaxAndMotion();
            this.resetIdleTimer();

            // Приветствие через 1.6 сек с голосовой фразой
            this.greetingTimer = setTimeout(() => {
                if (!this.isIn3D && !this.isCollapsed && this.isEnabled) {
                    this.say(`## Космо на связи! 🚀\nГотов помочь с аналитикой и подсказать **лучших по охватам!**`, 6500, 'smile', 'post_scan_10');
                }
            }, 1600);

            // Первый автоматический 30-секундный патруль через 8.5 секунд после загрузки (только на ПК)!
            this.initialPatrolTimer = setTimeout(() => {
                if (!this.isMobile() && !this.isIn3D && !this.isCollapsed && !this.isDragging && !this.isPatrolling && this.isEnabled) {
                    this.startContinuousPatrol(30000);
                }
            }, 8500);
        }

        this.loadProjectKnowledge();

        window.__AURORA_MASCOT__ = this;
    }

    /* ---------------------------------------------------------------------
     * 1a. База знаний Космо: branches_cache.json + data/subscribers.json
     * Космо знает адреса, телефоны, VK-ссылки и динамику подписчиков.
     * ------------------------------------------------------------------- */
    async loadProjectKnowledge() {
        try {
            const res = await fetch(BRANCHES_CACHE_URL, { cache: 'no-cache' });
            if (res.ok) this.branchesRef = await res.json();
        } catch (e) {
            console.debug('[Cosmo] branches_cache.json unavailable:', e.message);
        }
        try {
            const res = await fetch(SUBSCRIBERS_URL, { cache: 'no-cache' });
            if (res.ok) this.subscribersData = await res.json();
        } catch (e) {
            console.debug('[Cosmo] subscribers.json unavailable:', e.message);
        }
        this.knowledgeLoaded = true;
    }

    /* Компактная сводка подписчиков для контекста ИИ (топ по members, тренд если есть история) */
    buildSubscribersSummary() {
        const snaps = this.subscribersData?.snapshots;
        if (!Array.isArray(snaps) || snaps.length === 0) return '';
        const latest = snaps.reduce((acc, s) => {
            if (!acc || (s.ts || 0) >= (acc.ts || 0)) acc = s;
            return acc;
        }, null);
        const rows = snaps.filter(s => !latest || s.ts === latest.ts);
        if (rows.length === 0) return '';
        const total = rows.reduce((sum, s) => sum + (Number(s.members) || 0), 0);
        const top = [...rows].sort((a, b) => (b.members || 0) - (a.members || 0)).slice(0, 3)
            .map(s => `${s.name || s.branch}: ${s.members}`)
            .join('; ');
        return ` Справочник подписчиков: всего в сетях ${total} человек. Топ-3 по подписчикам: ${top}. Дата снимка: ${latest?.ts ? new Date(latest.ts * 1000).toLocaleDateString('ru-RU') : 'неизвестна'}.`;
    }

    /* Поиск филиала в справочнике по части названия (для ответа «что за филиал») */
    findBranchInfo(nameFragment) {
        if (!Array.isArray(this.branchesRef) || !nameFragment) return null;
        const q = String(nameFragment).toLowerCase();
        return this.branchesRef.find(b =>
            (b.branch_name || '').toLowerCase().includes(q) ||
            (b.branch_num || '').toLowerCase() === q ||
            (b.branch_num || '').toLowerCase() === `ф-${q.replace(/^ф-?/,'')}`
        ) || null;
    }

    /* ---------------------------------------------------------------------
     * 2. Markdown парсер для облачка
     * ------------------------------------------------------------------- */
    parseMarkdown(text) {
        if (!text) return '';
        let src = String(text);

        // Защита от XSS (ответ ИИ идёт в innerHTML): сначала прячем собственные
        // безопасные теги Космо (<br> и кнопки действий) в плейсхолдеры,
        // затем экранируем весь остальной HTML, и только после этого
        // применяем Markdown-замены (как в src/ai.js mdLite).
        const safeHtml = [];
        const stash = (tag) => `\u0001${safeHtml.push(tag) - 1}\u0001`;
        src = src
            .replace(/<br\s*\/?>/gi, (m) => stash('<br>'))
            .replace(/<div class="mascot-choice-actions">/gi, (m) => stash(m))
            .replace(/<button type="button" class="mascot-action-btn[^"]*" data-mascot-action="[\w-]+">/gi, (m) => stash(m))
            .replace(/<\/(?:div|button)>/gi, (m) => stash(m));

        let html = escapeHtml(src)
            .replace(/^##\s+(.*$)/gim, '<div class="mascot-md-h2">$1</div>')
            .replace(/^###\s+(.*$)/gim, '<div class="mascot-md-h3">$1</div>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="mascot-md-code">$1</code>')
            .replace(/\n/g, stash('<br>'));

        // Возвращаем заранее разрешённые безопасные теги из плейсхолдеров
        html = html.replace(/\u0001(\d+)\u0001/g, (_, i) => safeHtml[Number(i)] ?? '');
        return html;
    }

    /* ---------------------------------------------------------------------
     * 3. Аудио-движок голоса Бэлы (ElevenLabs)
     * ------------------------------------------------------------------- */
    playVoice(key, isUserAction = false) {
        if (!this.isEnabled || this.isMuted || !AUDIO_CLIPS[key]) return;
        // Голосовой гейт: частота ×0.5 для фоновых реплик + защита от спама.
        // say() предварительно прогоняет ключ через shouldSpeakVoice и ставит
        // _voiceGatePass, чтобы монетка не бросалась дважды.
        const gatePass = this._voiceGatePass === true;
        this._voiceGatePass = false;
        if (!gatePass && !isUserAction && !this.shouldSpeakVoice(key, false)) return null;
        if (gatePass || isUserAction || this.shouldSpeakVoice(key, isUserAction)) {
            const now = Date.now();
            this._lastVoiceAt = now;
            const cat = String(key).replace(/_\d+$/, '');
            (this._voiceCatAt || (this._voiceCatAt = {}))[cat] = now;
        }
        // Защита от перебивания: если уже говорит и это фоновый вызов, не перебиваем речь!
        if (!isUserAction && this.isSpeakingAudio && this.currentAudio && !this.currentAudio.paused) {
            return;
        }
        try {
            if (this.currentAudio) {
                try { this.currentAudio.pause(); } catch (e) {}
                this.currentAudio = null;
            }
            const audio = new Audio(AUDIO_CLIPS[key]);
            audio.volume = 0.88;
            this.currentAudio = audio;
            this.isSpeakingAudio = true;

            if (this.bubbleEl) this.bubbleEl.classList.add('is-speaking');

            audio.onplay = () => {
                this.isSpeakingAudio = true;
                if (this.bubbleEl) this.bubbleEl.classList.add('is-speaking');
            };
            audio.onended = () => {
                this.isSpeakingAudio = false;
                if (this.bubbleEl) this.bubbleEl.classList.remove('is-speaking');
                this.currentAudio = null;
                // Естественная дыхательная пауза перед закрытием облачка (1.6 сек)
                clearTimeout(this.speechTimer);
                this.speechTimer = setTimeout(() => {
                    this.hideBubble(false);
                }, 1600);
            };
            audio.onerror = () => {
                this.isSpeakingAudio = false;
                if (this.bubbleEl) this.bubbleEl.classList.remove('is-speaking');
                this.currentAudio = null;
            };

            // Динамическое продление жизни облачка на основе точной длительности аудио
            audio.addEventListener('loadedmetadata', () => {
                if (audio.duration && !isNaN(audio.duration)) {
                    const audioMs = (audio.duration * 1000) + 1800;
                    if (audioMs > (this.currentSpeechDuration || 0)) {
                        this.currentSpeechDuration = audioMs;
                        clearTimeout(this.speechTimer);
                        this.speechTimer = setTimeout(() => {
                            this.hideBubble(false);
                        }, audioMs);
                    }
                }
            });

            audio.play().catch(e => {
                console.debug('[Cosmo Voice] Autoplay blocked:', e.message);
            });
            return audio;
        } catch (e) {
            console.warn('[Cosmo Voice] Play error:', e);
            this.isSpeakingAudio = false;
            return null;
        }
    }

    /* ---------------------------------------------------------------------
     * ПРЕЗЕНТАЦИЯ «КОСМО РАССКАЗЫВАЕТ О СЕБЕ» (кнопка «Заставка», ~36с)
     * ------------------------------------------------------------------- */
    startPresentation() {
        if (this.isInPresentation || this.isIn3D) return;

        // Если маскот выключен или свернут, автоматически включаем и разворачиваем его
        if (!this.isEnabled) {
            this.enableMascot();
        }
        if (this.isCollapsed) {
            this.expand();
        }
        this.isInPresentation = true;

        if (this.container) {
            this.container.classList.remove('mascot-hidden');
            this.container.style.display = '';
        }

        // Остановить автономный цикл и текущую речь
        clearTimeout(this.activityCycleTimer);
        this.stopVoice(true);
        clearTimeout(this.speechTimer);
        this.userDismissedBubble = false;

        this.buildStageDom();
        document.body.classList.add('cosmo-stage-open');
        this.container.classList.add('is-on-stage');
        this.setState('waving', 0);

        // Космическая эмбиент-музыка: тихий фон на всю презентацию (loop 45с)
        try {
            this._stageMusic = this._stageMusic || new Audio('assets/audio/cosmo/presentation_ambient.ogg');
            this._stageMusic.loop = true;
            this._stageMusic.volume = 0;
            this._stageMusic.play().catch(() => {});
            const target = 0.26;
            const fade = setInterval(() => {
                try {
                    this._stageMusic.volume = Math.min(target, this._stageMusic.volume + 0.02);
                    if (this._stageMusic.volume >= target) clearInterval(fade);
                } catch (e) { clearInterval(fade); }
            }, 150);
            this._musicFade = fade;
        } catch (e) { /* аудио недоступно */ }

        const BEATS = [
            { t: 2500,   dur: 7000, sprite: 'waving',  voice: 'greet_2',      bubble: 'Салют! 👋',    sub: 'Салют! Я Космо — робот-помощник библиотечной аналитики. Вот что я умею!' , tts: 'assets/audio/cosmo/pres_01.ogg' },
            { t: 9500,   dur: 7000, sprite: 'idle',    voice: null,           bubble: 'На орбите! 🛰️', sub: 'Живу в углу экрана: слежу за охватами, подмечаю тренды и подбадриваю команду.' , tts: 'assets/audio/cosmo/pres_02.ogg' },
            { t: 16500,  dur: 8000, sprite: 'cool',    voice: 'post_scan_2',  bubble: 'Аудит! 🛰️',    sub: 'Сканирую стены ВКонтакте всех 16 филиалов: посты, просмотры, лайки, репосты — полный аудит охватов.' , tts: 'assets/audio/cosmo/pres_03.ogg' },
            { t: 24500,  dur: 8000, sprite: 'thinking', voice: 'post_scan_7', bubble: 'Глубже! 📊',   sub: 'Считаю ER, лучшее время публикаций и нахожу посты-рекордсмены.' , tts: 'assets/audio/cosmo/pres_04.ogg' },
            { t: 32500,  dur: 8000, sprite: 'party',   voice: 'post_scan_10', bubble: 'Топ-3! 🏆',    sub: 'Строю пьедестал лидеров и разбираю тройку лучших голосом Бэлы.' , tts: 'assets/audio/cosmo/pres_05.ogg' },
            { t: 40500,  dur: 8000, sprite: 'smile',   voice: 'post_scan_5',  bubble: 'Голос! 🎙️',    sub: 'Да-да, это я сейчас говорю голосом Бэлы — синтез речи прямо в отчётах!' , tts: 'assets/audio/cosmo/pres_06.ogg' },
            { t: 48500,  dur: 8000, sprite: 'read',    voice: null,           bubble: 'Книги! 📚',    sub: 'Найду книгу в каталоге OPAC: по названию, автору и даже инвентарному номеру.' , tts: 'assets/audio/cosmo/pres_07.ogg' },
            { t: 56500,  dur: 8000, sprite: 'idea',    voice: null,           bubble: 'Наличие! 🏛️',  sub: 'И скажу, в каком филиале издание стоит — хоть в Добром, хоть в Юрьевце.' , tts: 'assets/audio/cosmo/pres_08.ogg' },
            { t: 64500,  dur: 8000, sprite: 'waving',  voice: null,           bubble: 'Пишу! ✍️',     sub: 'Сочиняю посты для ВКонтакте: анонсы, обзоры, викторины — под вашу аудиторию.' , tts: 'assets/audio/cosmo/pres_09.ogg' },
            { t: 72500,  dur: 8000, sprite: 'idea',    voice: null,           bubble: 'План! 📅',     sub: 'Составлю контент-план на неделю вперёд — со статьями и идеями постов.' , tts: 'assets/audio/cosmo/pres_10.ogg' },
            { t: 80500,  dur: 8200, sprite: 'angry',   voice: null,           bubble: 'Ревизия! 💢',  sub: 'Провожу ревизию хэштегов: что работает, а что тянет охваты вниз.', gag: { t: 4200, sprite: 'shock', dur: 500 } , tts: 'assets/audio/cosmo/pres_11.ogg' },
            { t: 88700,  dur: 8000, sprite: 'thinking', voice: null,          bubble: 'Диагноз! 🩺',  sub: 'Ставлю «диагноз» отстающим филиалам и подсказываю, как реанимировать охваты.' , tts: 'assets/audio/cosmo/pres_12.ogg' },
            { t: 96700,  dur: 8000, sprite: 'smile',   voice: null,           bubble: 'Чат! 💬',      sub: 'Открой чат — подберу книги читателям по вкусу и отвечу на любые вопросы.' , tts: 'assets/audio/cosmo/pres_13.ogg' },
            { t: 104700, dur: 8000, sprite: 'wink',    voice: null,           bubble: 'Файлы! 📎',    sub: 'Прикрепи файл или ссылку — разберу текст, найду факты и подскажу улучшения.' , tts: 'assets/audio/cosmo/pres_14.ogg' },
            { t: 112700, dur: 8000, sprite: 'love',    voice: 'post_scan_8',  bubble: 'Чувства! ❤️',  sub: 'Шлю стикеры-эмоции и веду лигу филиалов: очки, дивизионы, награды!' , tts: 'assets/audio/cosmo/pres_15.ogg' },
            { t: 120700, dur: 8000, sprite: 'party',   voice: null,           bubble: 'Лига! 🏆',     sub: 'Рейтинг активности филиалов обновляется после каждого сканирования — участвуй!' , tts: 'assets/audio/cosmo/pres_16.ogg' },
            { t: 128700, dur: 8000, sprite: 'cool',    voice: null,           bubble: 'Напомню! ⏰',  sub: 'И да: скажи, что напомнить — вовремя подниму тревогу на орбите.' , tts: 'assets/audio/cosmo/pres_17.ogg' },
            { t: 136700, dur: 8000, sprite: 'wink',    voice: null,           bubble: 'Финал! ⭐',    sub: 'Жми на меня в любой момент — я всегда на орбите!' , tts: 'assets/audio/cosmo/pres_18.ogg' },
            { t: 144700, dur: 7000, sprite: 'waving',  voice: 'greet_1',      bubble: 'Поехали! 🚀',  sub: 'Поехали! До связи на орбите!' , tts: 'assets/audio/cosmo/pres_19.ogg' },
        ];
        this._stageBeats = BEATS;
        this._stageTimers = [];

        // Прогресс-точки
        const dots = this._stageEl.progress;
        dots.innerHTML = '';
        BEATS.forEach((b, i) => {
            const dot = document.createElement('span');
            dot.className = 'cosmo-stage-dot';
            dots.appendChild(dot);
        });

        BEATS.forEach((beat, i) => {
            this._stageTimers.push(setTimeout(() => {
                this.setState(beat.sprite, beat.dur);
                this.bubbleTextEl.innerHTML = this.parseMarkdown(`## ${beat.bubble}`);
                this.bubbleEl.classList.add('is-active');
                if (beat.tts) {
                    // Озвучка бита голосом Бэлы (ElevenLabs, прегенерация)
                    AUDIO_CLIPS[`pres_tts_${i}`] = beat.tts;
                    this.playVoice(`pres_tts_${i}`, true);
                }
                const subLine = this._stageEl.subLine;
                subLine.textContent = beat.sub;
                subLine.classList.remove('cosmo-sub-line');
                void subLine.offsetWidth;
                subLine.classList.add('cosmo-sub-line');
                [...dots.children].forEach((d, di) => {
                    d.classList.toggle('is-active', di === i);
                    d.classList.toggle('is-done', di < i);
                });
                if (beat.gag) {
                    this._stageTimers.push(setTimeout(() => {
                        this.setState(beat.gag.sprite, beat.gag.dur);
                        this._stageTimers.push(setTimeout(() => this.setState(beat.sprite, beat.dur), beat.gag.dur));
                    }, beat.gag.t));
                }
            }, beat.t));
        });

        // Финальный отлёт и восстановление (151.7с → конец ~156с)
        this._stageTimers.push(setTimeout(() => this.endPresentation(false), 151700));
    }

    buildStageDom() {
        if (this._stageEl) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <div class="cosmo-stage-dim"></div>
            <div class="cosmo-stage-backdrop">
                <div class="cosmo-stage-stars"></div>
                <div class="cosmo-stage-vignette"></div>
            </div>
            <div class="cosmo-stage-beam"></div>
            <div class="cosmo-stage-podium">
                <div class="cosmo-stage-ring"></div>
                <div class="cosmo-stage-ring r2"></div>
            </div>
            <div class="cosmo-stage-subtitles">
                <span class="cosmo-sub-name">Космо • презентация</span>
                <span class="cosmo-sub-line"></span>
            </div>
            <div class="cosmo-stage-progress"></div>
            <div class="cosmo-stage-skip">Клик — пропуск</div>
            <div class="cosmo-stage-catcher"></div>
        `;
        const els = {};
        ['dim', 'backdrop', 'beam', 'podium', 'subtitles', 'progress', 'skip', 'catcher'].forEach(k => {
            els[k] = wrap.querySelector(`.cosmo-stage-${k}`);
        });
        els.subLine = wrap.querySelector('.cosmo-sub-line');
        document.body.appendChild(wrap);
        this._stageWrap = wrap;
        this._stageEl = els;
        els.catcher.addEventListener('click', () => this.endPresentation(true));

        this._escStageHandler = (e) => {
            if (e.key === 'Escape' && this.isInPresentation) {
                e.preventDefault();
                this.endPresentation(true);
            }
        };
        document.addEventListener('keydown', this._escStageHandler);
    }

    endPresentation(skipped = false) {
        if (!this.isInPresentation) return;
        this.isInPresentation = false;
        if (this._escStageHandler) {
            document.removeEventListener('keydown', this._escStageHandler);
            this._escStageHandler = null;
        }
        (this._stageTimers || []).forEach(clearTimeout);
        this._stageTimers = [];
        this.stopVoice(true);
        // Музыка: мягкий fade-out 1.2с и стоп
        try {
            const mus = this._stageMusic;
            if (mus) {
                const f = setInterval(() => {
                    try {
                        mus.volume = Math.max(0, mus.volume - 0.04);
                        if (mus.volume <= 0.02) { clearInterval(f); mus.pause(); mus.currentTime = 0; }
                    } catch (e) { clearInterval(f); }
                }, 100);
            }
        } catch (e) {}

        if (!skipped) {
            // Ракетный отлёт
            this.container.classList.add('is-launching');
        }
        document.body.classList.remove('cosmo-stage-open');
        setTimeout(() => {
            this.container.classList.remove('is-on-stage', 'is-launching');
            this.container.classList.add('mascot-hidden');
            this.hideBubble(true);
            // Демонтаж оверлея: иначе невидимый .cosmo-stage-catcher (z 100030,
            // inset 0) навсегда перекрывает страницу — кнопки и драг умирают
            if (this._stageWrap) {
                this._stageWrap.remove();
                this._stageWrap = null;
                this._stageEl = null;
            }
            // Сайт вернулся; маскот материализуется в родном углу
            setTimeout(() => {
                if (this.isEnabled && !this.isCollapsed) {
                    this.container.classList.remove('mascot-hidden');
                    this.container.classList.add('is-returning');
                    setTimeout(() => {
                        this.container.classList.remove('is-returning');
                        this.setState('idle', 2000);
                        this.startAutonomousCycle();
                    }, 900);
                }
            }, skipped ? 100 : 500);
        }, skipped ? 350 : 1500);
    }

    /**
     * Решает, стоит ли озвучивать фразу: частота снижена вдвое
     * (глобальная пауза 90с + монета 55%), одна категория — не чаще раза в 150с,
     * пользовательские действия озвучиваются всегда с паузой 8с.
     */
    shouldSpeakVoice(key, isUserAction = false) {
        const now = Date.now();
        const last = this._lastVoiceAt || 0;
        if (isUserAction) return (now - last) >= 8000;
        if (now - last < 90000) return false;
        if (Math.random() > 0.55) return false;
        const cat = String(key).replace(/_\d+$/, '');
        const catMap = this._voiceCatAt || (this._voiceCatAt = {});
        if (now - (catMap[cat] || 0) < 150000) return false;
        return true;
    }

    stopVoice(immediate = false) {
        if (!this.currentAudio) {
            this.isSpeakingAudio = false;
            if (this.bubbleEl) this.bubbleEl.classList.remove('is-speaking');
            return;
        }
        this.isSpeakingAudio = false;
        if (this.bubbleEl) this.bubbleEl.classList.remove('is-speaking');

        const aud = this.currentAudio;
        this.currentAudio = null;

        if (immediate) {
            try { aud.pause(); } catch (e) {}
        } else {
            // Мягкий фейд-аут за 80 мс без щелчков в динамиках
            try {
                let vol = aud.volume;
                const fade = setInterval(() => {
                    vol = Math.max(0, vol - 0.22);
                    try { aud.volume = vol; } catch (e) {}
                    if (vol <= 0.04) {
                        clearInterval(fade);
                        try { aud.pause(); } catch (e) {}
                    }
                }, 20);
            } catch (e) {
                try { aud.pause(); } catch (e) {}
            }
        }
    }

    /* ---------------------------------------------------------------------
     * 4. Привязка событий интерфейса
     * ------------------------------------------------------------------- */
    bindEvents() {
        // Разблокировка аудио при первом взаимодействии с экраном
        const unlockAudio = () => {
            try {
                const a = new Audio();
                a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
                a.play().catch(() => {});
            } catch (e) {}
            window.removeEventListener('pointerdown', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
        window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
        window.addEventListener('keydown', unlockAudio, { once: true, passive: true });

        window.addEventListener('mousemove', this.onMouseMove, { passive: true });

        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
            window.addEventListener(evt, this.onUserActivity, { passive: true });
        });

        // Кнопки переключения маскота Космо (в шапке, меню и настройках)
        const handleMascotToggle = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            this.toggleMascot();
        };

        const toggleBtn = document.getElementById('mascot-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', handleMascotToggle);
        }
        const dropdownToggleBtn = document.getElementById('dropdown-mascot-toggle-btn');
        if (dropdownToggleBtn) {
            dropdownToggleBtn.addEventListener('click', handleMascotToggle);
        }
        const modalToggleBtn = document.getElementById('modal-mascot-toggle-btn');
        if (modalToggleBtn) {
            modalToggleBtn.addEventListener('click', handleMascotToggle);
        }

        // Кнопка «Заставка» в шапке: большая презентация возможностей Космо
        const presBtn = document.getElementById('cosmo-presentation-btn');
        if (presBtn) {
            presBtn.addEventListener('click', () => this.startPresentation());
        }

        // Клик по роботу: на мобильных устройствах одиночный тап сразу открывает чат с Космо;
        // на ПК: одиночный — тычок и реплика, двойной — открытие чата с Космо
        this.bodyEl.addEventListener('click', (e) => {
            if (e.target.closest('[data-mascot-collapse]') || e.target.closest('[data-mascot-open-chat]')) return;
            e.stopPropagation();
            this.userDismissedBubble = false;
            if (this.isDragging) return;
            if (this.isSleeping) {
                this.wakeUp();
                return;
            }

            const isMobile = window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches;
            if (isMobile) {
                if (this.clickTimeout) {
                    clearTimeout(this.clickTimeout);
                    this.clickTimeout = null;
                }
                this.openCosmoChat();
                return;
            }

            if (this.clickTimeout) {
                // Второй клик пришёл до истечения таймаута — это двойной клик!
                clearTimeout(this.clickTimeout);
                this.clickTimeout = null;
                this.openCosmoChat();
            } else {
                // Первый клик: ждём 380мс, если второго клика нет — выполняем тычок
                this.clickTimeout = setTimeout(() => {
                    this.clickTimeout = null;
                    if (!this.isDragging) this.triggerPokeSquish();
                }, 380);
            }
        });

        // Нативный двойной клик по роботу — гарантированное открытие чата
        this.bodyEl.addEventListener('dblclick', (e) => {
            if (e.target.closest('[data-mascot-collapse]')) return;
            e.preventDefault();
            e.stopPropagation();
            this.userDismissedBubble = false;
            if (this.clickTimeout) {
                clearTimeout(this.clickTimeout);
                this.clickTimeout = null;
            }
            this.openCosmoChat();
        });

        // Кнопки открытия полноценного чата с Космо (в шапке облачка и плавающий бейдж)
        this.container.querySelectorAll('[data-mascot-open-chat]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.userDismissedBubble = false;
                if (this.clickTimeout) {
                    clearTimeout(this.clickTimeout);
                    this.clickTimeout = null;
                }
                this.openCosmoChat();
            });
        });

        // Переключатель режима «работа / развлечение»
        this.modeToggleBtn = this.container.querySelector('[data-mascot-mode]');
        if (this.modeToggleBtn) {
            this.modeToggleBtn.textContent = this.isWorkMode ? '💼' : '🎭';
            this.modeToggleBtn.classList.toggle('is-work', this.isWorkMode);
            this.modeToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.userDismissedBubble = false;
                this.toggleWorkMode();
            });
        }

        // Закрытие облачка
        const closeBtn = this.container.querySelector('[data-bubble-close]');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.userDismissedBubble = true;
                clearTimeout(this.speechTimer);
                this.stopVoice(true);
                this.hideBubble(true);
            });
        }

        // Переключатель звука: при включении сразу воспроизводит тестовую реплику
        if (this.soundToggleBtn) {
            this.soundToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.isMuted = !this.isMuted;
                this.soundToggleBtn.textContent = this.isMuted ? '🔇' : '🔊';
                this.soundToggleBtn.classList.toggle('is-muted', this.isMuted);
                if (this.isMuted) {
                    this.stopVoice();
                } else {
                    this.say(`## Голос ElevenLabs включён! 🔊✨\nЯ звучу в звонком мультяшном качестве Бэлы!`, 4500, 'smile', 'post_scan_10');
                }
            });
        }

        // Сворачивание / разворачивание
        const collapseBtn = this.container.querySelector('[data-mascot-collapse]');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.collapse();
            });
        }
        this.collapsedPill.addEventListener('click', () => this.expand());

        // Чипы в облачке
        const chipsContainer = this.container.querySelector('[data-mascot-chips]');
        if (chipsContainer) {
            chipsContainer.addEventListener('click', (e) => {
                const chip = e.target.closest('.mascot-ai-chip');
                if (!chip) return;
                const action = chip.getAttribute('data-action');
                const query = chip.getAttribute('data-query');

                if (action === 'open-chat') {
                    this.openCosmoChat();
                } else if (action === 'open-game') {
                    window.open('game/', '_blank');
                } else if (action === 'start-search') {
                    this.triggerSearchFromMascot();
                } else if (action === 'leader') {
                    this.showLeaderReport();
                } else if (action === 'analyze-top3') {
                    this.analyzeTop3Leaders(true);
                } else if (action === 'patrol') {
                    this.startContinuousPatrol(30000);
                } else if (action === 'stay-here' || action === 'confirm-stay') {
                    this.confirmNewBase();
                } else if (action === 'go-home') {
                    clearTimeout(this.returnTimer);
                    this.navigateBackHome(this.baseLeft ?? 24);
                } else if (action === 'generate-post') {
                    this.generatePostDraft();
                } else if (action === 'week-ideas') {
                    this.generateWeekIdeas();
                } else if (action === 'hashtag-advice') {
                    this.suggestHashtags();
                } else if (action === 'branch-diagnose') {
                    this.diagnoseBranch();
                } else if (action === 'copy-report') {
                    this.copyReportToClipboard();
                } else if (action === 'set-reminder') {
                    this.setReminder(60);
                } else if (action === 'custom') {
                    if (this.aiInputWrapEl) {
                        this.aiInputWrapEl.classList.toggle('is-visible');
                        if (this.aiInputWrapEl.classList.contains('is-visible')) {
                            this.aiInputEl?.focus();
                        }
                    }
                } else if (query) {
                    this.openCosmoChat(query);
                }
            });
        }

        // Кнопки действий внутри облачка (например, [🚀 Запустить сканирование], [📌 Закрепить здесь], [🏠 На базу])
        if (this.bubbleEl) {
            this.bubbleEl.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-mascot-action]');
                if (!actionBtn) return;
                const action = actionBtn.getAttribute('data-mascot-action');
                if (action === 'start-search') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.triggerSearchFromMascot();
                } else if (action === 'analyze-top3') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.analyzeTop3Leaders(true);
                } else if (action === 'stay-here' || action === 'confirm-stay') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.confirmNewBase();
                } else if (action === 'go-home') {
                    e.preventDefault();
                    e.stopPropagation();
                    clearTimeout(this.returnTimer);
                    this.navigateBackHome(this.baseLeft ?? 24);
                } else if (action === 'copy-text') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.copyBubbleText();
                }
            });
        }

        // Поле ввода вопроса ИИ
        if (this.aiSendBtnEl && this.aiInputEl) {
            const submitAiQuestion = () => {
                const val = (this.aiInputEl.value || '').trim();
                if (!val || this.isAiLoading) return;
                this.aiInputEl.value = '';
                this.openCosmoChat(val);
            };

            this.aiSendBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                submitAiQuestion();
            });

            this.aiInputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitAiQuestion();
                }
            });
        }

        // Синхронизация 2D / 3D
        window.addEventListener('aurora:warp-started', () => this.setIn3D(true));
        window.addEventListener('aurora:space3d-opened', () => this.setIn3D(true));
        window.addEventListener('aurora:space3d-closed', () => this.setIn3D(false));
    }

    /* ---------------------------------------------------------------------
     * 5. МЕХАНИКА DRAG & DROP, ВЫСОТНЫЙ ПИСК И БРОСОК (FLING) С КРИКОМ «УИ-И-И!»
     * ------------------------------------------------------------------- */
    bindDragAndDrop() {
        if (!this.bodyEl || !this.container) return;

        let startX = 0;
        let startY = 0;
        let preLeft = 0;
        let preBottom = 0;
        let hasMoved = false;

        // Трекинг скорости броска (Velocity Tracking)
        let lastMoveTime = 0;
        let lastMoveX = 0;
        let lastMoveY = 0;
        let velocityX = 0;
        let velocityY = 0;
        let altitudeScreamPlayed = false;

        const onStart = (e) => {
            // На мобильных устройствах отключаем перетаскивание Космо: робот зафиксирован в углу и не блокирует скролл
            if (this.isMobile()) return;
            if (e.button !== undefined && e.button !== 0) return; // Только ЛКМ
            if (e.target.closest('[data-mascot-collapse]') || e.target.closest('[data-bubble-close]') || e.target.closest('[data-mascot-sound]') || e.target.closest('[data-mascot-open-chat]')) return;

            // Для тач-устройств предотвращаем прокрутку страницы во время драга
            if (e.type === 'touchstart' && e.cancelable) {
                e.preventDefault();
            }

            // Новая сессия драга: гасим активный CSS-переход (например, возврат на базу),
            // чтобы контейнер не «уезжал» из-под курсора во время перетаскивания
            this.dragSessionId += 1;
            this.container.style.transition = 'none';

            const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
            const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;

            startX = clientX;
            startY = clientY;
            lastMoveX = clientX;
            lastMoveY = clientY;
            lastMoveTime = performance.now();
            velocityX = 0;
            velocityY = 0;
            altitudeScreamPlayed = false;

            preLeft = parseFloat(this.container.style.left) || this.currentPosX;
            preBottom = parseFloat(this.container.style.bottom) || this.baseBottom || 24;
            hasMoved = false;

            const onMove = (moveEvent) => {
                const currentX = (moveEvent.touches && moveEvent.touches.length > 0) ? moveEvent.touches[0].clientX : moveEvent.clientX;
                const currentY = (moveEvent.touches && moveEvent.touches.length > 0) ? moveEvent.touches[0].clientY : moveEvent.clientY;
                const now = performance.now();
                const dt = Math.max(8, now - lastMoveTime);

                // Расчет мгновенной скорости в px/ms
                velocityX = (currentX - lastMoveX) / dt;
                velocityY = (currentY - lastMoveY) / dt;
                lastMoveX = currentX;
                lastMoveY = currentY;
                lastMoveTime = now;

                const dx = currentX - startX;
                const dy = currentY - startY;

                if (!hasMoved && Math.hypot(dx, dy) > 4) {
                    hasMoved = true;
                    this.isDragging = true;
                    if (this.isPatrolling) this.stopContinuousPatrol(false);
                    clearTimeout(this.returnTimer);
                    // Если прервали возврат на базу — сбрасываем флаг и классы ходьбы,
                    // иначе isReturningHome зависнет (таймер финала уже отменён)
                    if (this.isReturningHome) {
                        this.isReturningHome = false;
                        this.bodyEl.classList.remove('is-walking-left', 'is-walking-right');
                        this.floaterEl?.classList.remove('patrol-walking');
                    }
                    this.container.classList.add('is-dragging');
                    this.bodyEl.classList.add('is-dragged');
                    this.setState('thinking');
                    this.setMoodBadge('😮‍💨', 5000);
                }

                if (this.isDragging) {
                    moveEvent.preventDefault();
                    const newLeft = Math.max(10, Math.min(window.innerWidth - 130, preLeft + dx));
                    const newBottom = Math.max(10, Math.min(window.innerHeight - 150, preBottom - dy));
                    this.currentPosX = newLeft;
                    this.currentPosY = newBottom;
                    this.container.style.left = `${newLeft}px`;
                    this.container.style.bottom = `${newBottom}px`;

                    // РЕАКЦИЯ НА ВЫСОКИЙ ПОДЪЕМ: если пользователь поднял Космо высоко (>190px от пола)
                    if (newBottom > 210 && !altitudeScreamPlayed) {
                        altitudeScreamPlayed = true;
                        this.bodyEl.classList.add('is-high-altitude');
                        const altScreams = [
                            { k: 'high_altitude_1', t: '## Спасите-е-е! Помогите-е-е! 😱\nГравитация, вернись! **Я боюсь высоты-ы-ы!**' },
                            { k: 'high_altitude_2', t: '## Ой-ой-ой, мамочки! 😱💥\nВысота-то какая! Мои шестерёнки сейчас от страха заклинит!' },
                            { k: 'high_altitude_3', t: '## Э-э-эй, осторожнее! 😨\nЯ робот-помощник, **а не квадрокоптер!** Спусти на землю!' }
                        ];
                        const altPick = altScreams[Math.floor(Math.random() * altScreams.length)];
                        this.say(altPick.t, 5500, 'angry', altPick.k);
                        this.setMoodBadge('😱', 4000);
                    } else if (newBottom <= 140 && altitudeScreamPlayed) {
                        altitudeScreamPlayed = false;
                        this.bodyEl.classList.remove('is-high-altitude');
                    }
                }
            };

            const onEnd = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onEnd);
                window.removeEventListener('touchmove', onMove);
                window.removeEventListener('touchend', onEnd);
                window.removeEventListener('touchcancel', onEnd);

                if (this.isDragging) {
                    const landingHomeX = preLeft;
                    this.container.classList.remove('is-dragging');
                    this.bodyEl.classList.remove('is-dragged', 'is-high-altitude');

                    // ПРОВЕРКА НА БРОСОК / ШВЫРЯНИЕ (Fling / Throw)
                    const speed = Math.hypot(velocityX, velocityY);
                    if (speed > 0.85 || Math.abs(velocityX) > 0.75) {
                        this.triggerThrowFling(velocityX, velocityY, landingHomeX);
                    } else {
                        // Мягкое физическое падение на пол (на высоту закреплённой базы)
                        this.container.style.transition = 'bottom 0.45s cubic-bezier(0.55, 0.055, 0.675, 0.19)';
                        this.currentPosY = this.baseBottom || 24;
                        this.container.style.bottom = `${this.currentPosY}px`;

                        // Синхронный сброс флага драга — новый драг не должен блокироваться
                        this.isDragging = false;
                        const session = this.dragSessionId;

                        setTimeout(() => {
                            this.container.style.transition = '';
                            this.triggerPlopLanding(landingHomeX);
                        }, 460);

                        // Защита от гонки: таймер сбрасывает флаг только если не начался новый драг
                        setTimeout(() => {
                            if (this.dragSessionId === session) this.isDragging = false;
                        }, 250);
                    }
                } else {
                    // Простой клик без переноса: возвращаем CSS-переходы, сброшенные в onStart
                    this.container.style.transition = '';
                }
            };

            window.addEventListener('mousemove', onMove, { passive: false });
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('touchend', onEnd);
            window.addEventListener('touchcancel', onEnd);
        };

        this.bodyEl.addEventListener('mousedown', onStart);
        this.bodyEl.addEventListener('touchstart', onStart, { passive: false });
    }

    /* Бросок / швыряние с криком «Уи-и-и-и! Я лечу-у-у-у!» */
    triggerThrowFling(vx, vy, landingHomeX) {
        this.isDragging = false;
        this.bodyEl.classList.add('is-flung');

        const flingClips = [
            { k: 'throw_fling_1', t: '## Уи-и-и-и-и! Я лечу-у-у-у! 🚀💨\nПристегните ремни! **Вхожу в плотные слои атмосферы!**' },
            { k: 'throw_fling_2', t: '## Уи-и-и-и! Сверхзвуковой полёт! ⚡\nБез парашюта и без страховки! **Встречайте метеор!**' },
            { k: 'throw_fling_3', t: '## Уи-и-и-и-и! Метеоритная посадка! ☄️\nБерегись, пол, **Космо идёт на таран!**' }
        ];
        const flingPick = flingClips[Math.floor(Math.random() * flingClips.length)];
        this.say(flingPick.t, 5000, 'smile', flingPick.k);
        this.setMoodBadge('🚀', 3500);

        // Расчет точки приземления с физикой рикошета
        const throwDistX = vx * 420;
        let targetX = Math.max(16, Math.min(window.innerWidth - 150, this.currentPosX + throwDistX));

        // Полёт по дуге: перелет по X и падение на высоту закреплённой базы (baseBottom)
        this.container.style.transition = 'left 0.75s cubic-bezier(0.22, 1, 0.36, 1), bottom 0.75s cubic-bezier(0.55, 0.055, 0.675, 0.19)';
        this.currentPosX = targetX;
        this.currentPosY = this.baseBottom || 24;
        this.container.style.left = `${targetX}px`;
        this.container.style.bottom = `${this.currentPosY}px`;

        setTimeout(() => {
            this.container.style.transition = '';
            this.bodyEl.classList.remove('is-flung');
            this.triggerPlopLanding(landingHomeX);
        }, 760);
    }

    confirmNewBase() {
        clearTimeout(this.returnTimer);
        this.returnTimer = null;
        this.isReturningHome = false;
        if (this.bodyEl) {
            this.bodyEl.classList.remove('is-walking-left', 'is-walking-right', 'is-plop-landing');
        }
        this.floaterEl?.classList.remove('patrol-walking');
        if (this.container) {
            this.container.style.transition = '';
        }

        this.baseLeft = this.currentPosX;
        this.baseBottom = this.currentPosY;
        this.homePosX = this.currentPosX;

        try {
            localStorage.setItem('aurora_mascot_base_x', String(this.baseLeft));
            localStorage.setItem('aurora_mascot_base_y', String(this.baseBottom));
        } catch (e) {
            console.warn('[Cosmo] Failed to persist base in localStorage:', e);
        }

        this.stopVoice(true);
        this.setMoodBadge('📌', 4500);
        this.spawnSparkles(16);
        this.setState('smile', 5000);
        this.say(`## База закреплена! 📌✨\nОтлично, закрепился на новой позиции! **Теперь мой квантовый пост здесь.**`, 4500, 'smile', null, true);
    }

    triggerPlopLanding(originalHomeX) {
        this.bodyEl.classList.remove('is-plop-landing');
        void this.bodyEl.offsetWidth;
        this.bodyEl.classList.add('is-plop-landing');
        this.spawnSparkles(12);
        this.spawnLandingFx();

        // Расширенный пул голосов и реплик: удивление, сарказм, критика, драг-дроп
        const landingScenarios = [
            { key: 'drag_drop_1', text: `## Эй, гравитация так не работает! 🤖💥\nПоставь меня на место, **я тебе не плюшевая игрушка!**`, mood: '💢', sprite: 'angry' },
            { key: 'drag_drop_2', text: `## Ой-ой-ой! Полёт нормальный, но посадка... 😵💫\n**Плюх!** Мои квантовые гироскопы кругом идут!`, mood: '😵', sprite: 'yawn' },
            { key: 'drag_drop_3', text: `## Куда тащишь SMM-гуру?! 🤨💅\nУ меня тут вообще-то **важные расчёты охватов** были!`, mood: '💅', sprite: 'smile' },
            { key: 'drag_drop_4', text: `## Хулиганство! 😤⚡\nЛадно-ладно, сейчас отряхнусь и сам решу, где дежурить!`, mood: '😤', sprite: 'angry' },
            { key: 'sarcasm_1', text: `## Потрясающая посадка! 🚀💫\nПрямо в яблочко! Теперь я охраняю этот угол экрана!`, mood: '🚀', sprite: 'smile' },
            { key: 'sarcasm_2', text: `## Отличная траектория! 🎯\nКурс выдержан, перегрузка три Жэ! Разворачиваю мобильный пункт!`, mood: '🎯', sprite: 'smile' },
            { key: 'sarcasm_4', text: `## Ну всё, держите меня семеро! 💥\nС такой динамикой мы обгоним сообщество любителей тишины!`, mood: '⚡', sprite: 'smile' },
            { key: 'surprise_1', text: `## Ого! Вот это перемещение! 🔭✨\nНе ожидал смены дислокации! Отсюда прекрасный вид на сайт!`, mood: '✨', sprite: 'smile' },
            { key: 'surprise_3', text: `## Вот это поворот! 🛋️✨\nА тут, между прочим, очень даже уютно! Оставишь меня здесь?`, mood: '🛋️', sprite: 'smile' },
            { key: 'disappoint_1', text: `## Эх, приземлился... 😅\nНо посадка мягкая! Проверяю исправность антигравитатора!`, mood: '🤖', sprite: 'smile' }
        ];

        const pick = landingScenarios[Math.floor(Math.random() * landingScenarios.length)];
        this.setState(pick.sprite, 5000);
        this.setMoodBadge(pick.mood, 4000);

        setTimeout(() => {
            this.bodyEl.classList.remove('is-plop-landing');
        }, 850);

        const homeX = (this.baseLeft !== null && this.baseLeft !== undefined) ? this.baseLeft : originalHomeX;
        const distToHome = Math.abs(this.currentPosX - homeX);

        if (distToHome > 45) {
            clearTimeout(this.returnTimer);

            // Кнопки выбора действия для пользователя в стиле дизайна сайта
            const choiceButtonsHtml = `
                <div class="mascot-choice-actions">
                    <button type="button" class="mascot-action-btn" data-mascot-action="stay-here">📌 Закрепить здесь</button>
                    <button type="button" class="mascot-action-btn btn-secondary" data-mascot-action="go-home">🏠 На базу</button>
                </div>
            `;

            // 50% вероятность: Космо решает предложить остаться
            const wantsToStay = Math.random() < 0.5;
            if (wantsToStay) {
                const stayText = `${pick.text}\n\n**Оставить меня здесь или вернуть на базу?**${choiceButtonsHtml}`;
                this.say(stayText, 9500, pick.sprite, pick.key);

                // Если пользователь ничего не нажал в течение 9 секунд — остаёмся на новом месте
                this.returnTimer = setTimeout(() => {
                    if (!this.isDragging && !this.isIn3D && !this.isCollapsed && !this.isPatrolling) {
                        this.baseLeft = this.currentPosX;
                        this.baseBottom = this.currentPosY;
                        this.homePosX = this.currentPosX;
                        try {
                            localStorage.setItem('aurora_mascot_base_x', String(this.baseLeft));
                            localStorage.setItem('aurora_mascot_base_y', String(this.baseBottom));
                        } catch (e) {}
                        this.say(`Остаюсь на новом месте! **Здесь обзор отличный.** 🛰️`, 4000, 'smile');
                    }
                }, 9000);
            } else {
                const returnPromptText = `${pick.text}\n\n${choiceButtonsHtml}`;
                this.say(returnPromptText, 7500, pick.sprite, pick.key);

                // Если не закрепили за 13 секунд — топаем домой
                this.returnTimer = setTimeout(() => {
                    if (!this.isDragging && !this.isIn3D && !this.isCollapsed && !this.isPatrolling) {
                        this.navigateBackHome(homeX);
                    }
                }, 13000);
            }
        } else {
            this.say(pick.text, 7500, pick.sprite, pick.key);
        }
    }

    navigateBackHome(targetX) {
        if (this.isMobile()) {
            this.currentPosX = 14;
            this.currentPosY = 16;
            if (this.container) {
                this.container.style.transition = 'none';
                this.container.style.left = '14px';
                this.container.style.bottom = '16px';
            }
            this.isReturningHome = false;
            return;
        }

        this.isReturningHome = true;
        const goingLeft = (this.currentPosX > targetX);
        this.bodyEl.classList.toggle('is-walking-left', goingLeft);
        this.bodyEl.classList.toggle('is-walking-right', !goingLeft);
        this.floaterEl?.classList.add('patrol-walking');
        this.setState('tired', 4500);
        this.setMoodBadge('🚶‍♂️', 4000);

        this.say(`Топаю обратно на базу... **Никакой дисциплины** у пользователей! 🚶‍♂️💨`, 4000, 'tired');

        const stepSpeed = 140;
        const distance = Math.abs(this.currentPosX - targetX);
        const durationSec = Math.max(1.5, Math.min(5.5, distance / stepSpeed));

        this.container.style.transition = `left ${durationSec.toFixed(2)}s cubic-bezier(0.25, 1, 0.5, 1), bottom 0.5s ease-out`;
        this.currentPosX = targetX;
        this.currentPosY = this.baseBottom || 24;
        this.container.style.left = `${targetX}px`;
        this.container.style.bottom = `${this.currentPosY}px`;

        // Финал возврата храним в returnTimer: драг/новая команда должны уметь его отменить
        clearTimeout(this.returnTimer);
        this.returnTimer = setTimeout(() => {
            this.container.style.transition = '';
            this.floaterEl?.classList.remove('patrol-walking');
            this.bodyEl?.classList.remove('is-walking-left', 'is-walking-right');
            this.isReturningHome = false;
            this.setState('smile', 3500);
            this.setMoodBadge('✨', 3000);
            this.spawnSparkles(6);
            this.say(`## Фух, добрался! 🏠✨\nНа базе **лучше всего**. Больше так не хулигань! 😉`, 5000, 'smile');
        }, durationSec * 1000);
    }

    /* ---------------------------------------------------------------------
     * 6. НЕПРЕРЫВНОЕ 30-СЕКУНДНОЕ ПАТРУЛИРОВАНИЕ ПО ВСЕЙ ШИРИНЕ ЭКРАНА (PATROL 2.0)
     * ------------------------------------------------------------------- */
    spawnPatrolPlasmaParticle(x, dir) {
        if (!this.container) return;
        const p = document.createElement('div');
        p.className = 'mascot-patrol-particle';
        p.style.left = `${dir > 0 ? -10 : 100}px`;
        p.style.bottom = `${12 + Math.random() * 10}px`;
        this.container.appendChild(p);
        setTimeout(() => p.remove(), 600);
    }

    startContinuousPatrol(totalDurationMs = 30000) {
        if (!this.isEnabled || !this.container || this.isMobile() || this.isIn3D || this.isCollapsed || this.isDragging || this.isReturningHome) return;

        this.isPatrolling = true;
        const body = this.bodyEl;
        const floater = this.floaterEl;
        const container = this.container;

        // Отключаем CSS-переход для абсолютной плавности 60 FPS
        container.classList.add('is-patrolling');
        container.style.transition = 'none';
        floater?.classList.add('patrol-walking', 'is-patrol-flying');

        this.setState('smile', totalDurationMs);
        this.setMoodBadge('🛸', 4000);

        this.say(`## Патрулирование 30 секунд! 🛸\nОблетаю **всю ширину экрана** от края до края! Ни один тренд не скроется! 🚨`, 5000, 'smile');

        const startTime = performance.now();
        let lastTime = startTime;
        let lastParticleTime = startTime;
        const minX = 16;
        const getMaxX = () => Math.max(minX + 350, window.innerWidth - 150);

        let goingRight = (this.currentPosX < window.innerWidth / 2);
        let currentTilt = goingRight ? 8 : -8;

        const speedPxPerSec = 220;
        let midWayNotified = false;
        let obsStop1Done = false;
        let obsStop2Done = false;
        let isObserving = false;

        const patrolStep = (currentTime) => {
            if (!this.isPatrolling || this.isDragging || this.isReturningHome) {
                container.classList.remove('is-patrolling');
                container.style.transition = '';
                floater?.classList.remove('is-patrol-flying');
                if (body) body.style.transform = '';
                return;
            }

            const elapsed = currentTime - startTime;
            if (elapsed >= totalDurationMs) {
                this.stopContinuousPatrol(true);
                return;
            }

            const dtSec = Math.min(0.1, (currentTime - lastTime) / 1000);
            lastTime = currentTime;

            // Гармоническое синусоидальное покачивание по высоте (sine-wave bobbing)
            const bobY = Math.sin((elapsed / 1000) * 3.5) * 8;
            const currentBaseBottom = (this.baseBottom !== undefined && this.baseBottom !== null) ? this.baseBottom : 24;
            container.style.bottom = `${(currentBaseBottom + bobY).toFixed(1)}px`;

            // Точки наблюдения во время полёта (Observation Stops):
            // Остановка 1 на ~9.5-12.2 сек:
            if (!obsStop1Done && elapsed >= 9500 && elapsed < 12200) {
                if (!isObserving) {
                    isObserving = true;
                    body?.classList.add('is-observing-scan');
                    this.say(`## Засёк аномалию! 🔍⚡\nКвантовые сенсоры сканируют ленту... Всё в норме, летим дальше!`, 3200, 'thinking', 'surprise_1');
                    this.setMoodBadge('🔍', 3000);
                }
                this.patrolAnimFrame = requestAnimationFrame(patrolStep);
                return;
            } else if (isObserving && elapsed >= 12200 && !obsStop1Done) {
                isObserving = false;
                obsStop1Done = true;
                body?.classList.remove('is-observing-scan');
            }

            // Остановка 2 на ~20.5-23.2 сек:
            if (!obsStop2Done && elapsed >= 20500 && elapsed < 23200) {
                if (!isObserving) {
                    isObserving = true;
                    body?.classList.add('is-observing-scan');
                    this.say(`## Зависаю над данными! 🛰️📊\nПроверяю активность читателей... Отличная динамика!`, 3200, 'thinking', 'critique_extra_1');
                    this.setMoodBadge('🛰️', 3000);
                }
                this.patrolAnimFrame = requestAnimationFrame(patrolStep);
                return;
            } else if (isObserving && elapsed >= 23200 && !obsStop2Done) {
                isObserving = false;
                obsStop2Done = true;
                body?.classList.remove('is-observing-scan');
            }

            // Спавн плазменных частиц
            if (currentTime - lastParticleTime > 120) {
                lastParticleTime = currentTime;
                this.spawnPatrolPlasmaParticle(this.currentPosX, goingRight ? 1 : -1);
            }

            // Реплика на экваторе патруля (~15 сек)
            if (!midWayNotified && elapsed >= totalDurationMs * 0.48) {
                midWayNotified = true;
                this.say(`## Половина пути пройдена! 🛰️\nПериметр под надзором, **квантовые датчики ловят охваты!** ✨`, 4500, 'smile');
                this.setMoodBadge('🛰️', 3500);
            }

            const maxX = getMaxX();
            if (goingRight && this.currentPosX >= maxX - 5) {
                goingRight = false;
            } else if (!goingRight && this.currentPosX <= minX + 5) {
                goingRight = true;
            }

            // Динамический угол наклона (Banking Tilt):
            const targetTilt = goingRight ? 9 : -9;
            currentTilt += (targetTilt - currentTilt) * 0.12;

            if (body) {
                if (goingRight) {
                    body.style.transform = `scaleX(1) rotate(${currentTilt.toFixed(1)}deg)`;
                } else {
                    body.style.transform = `scaleX(-1) rotate(${(-currentTilt).toFixed(1)}deg)`;
                }
            }

            const dir = goingRight ? 1 : -1;
            this.currentPosX += dir * speedPxPerSec * dtSec;
            this.currentPosX = Math.max(minX, Math.min(maxX, this.currentPosX));
            container.style.left = `${this.currentPosX.toFixed(1)}px`;

            if (this.currentPosX > window.innerWidth - 380) {
                container.classList.add('is-near-right-edge');
            } else {
                container.classList.remove('is-near-right-edge');
            }

            this.patrolAnimFrame = requestAnimationFrame(patrolStep);
        };

        if (this.patrolAnimFrame) cancelAnimationFrame(this.patrolAnimFrame);
        this.patrolAnimFrame = requestAnimationFrame(patrolStep);
    }

    stopContinuousPatrol(showNotice = true) {
        this.isPatrolling = false;
        if (this.patrolAnimFrame) cancelAnimationFrame(this.patrolAnimFrame);
        this.container?.classList.remove('is-patrolling', 'is-near-right-edge');
        if (this.container) {
            this.container.style.transition = '';
            this.container.style.bottom = `${this.baseBottom || 24}px`;
        }
        this.floaterEl?.classList.remove('patrol-walking', 'is-patrol-flying');
        if (this.bodyEl) {
            this.bodyEl.classList.remove('is-walking-right', 'is-walking-left', 'is-observing-scan');
            this.bodyEl.style.transform = '';
        }

        if (showNotice) {
            this.spawnSparkles(10);
            this.setState('smile', 4500);
            this.setMoodBadge('🛡️', 3500);
            this.say(`## Патруль 30 сек завершён! 🛡️✨\nПериметр проверен, **все посты в полном порядке!**`, 4500, 'smile');
        }
    }

    setSnapshotGetter(fn) {
        this.snapshotGetter = typeof fn === 'function' ? fn : null;
    }

    getAiSnapshot() {
        if (typeof this.snapshotGetter === 'function') {
            try {
                return this.snapshotGetter();
            } catch (e) {
                console.warn('[Cosmo] Error executing snapshotGetter:', e);
            }
        }
        return null;
    }

    /* ---------------------------------------------------------------------
     * 7. РАСЧЕТ И ОТОБРАЖЕНИЕ ЛИДЕРОВ (Zero Hallucinations Guarantee)
     * ------------------------------------------------------------------- */
    getLiveScanStats() {
        // 1. Проверяем кэшированные данные
        let s = this.lastScanStats || window.__AURORA_LAST_SCAN_SNAPSHOT__;

        // 2. Если в глобальном state приложения уже есть данные сканирования — строим богатую сводку
        const appState = window.__VK_APP__?.state;
        if (appState && appState.matchedPosts && appState.matchedPosts.length > 0) {
            const posts = appState.matchedPosts;
            const groupsStats = appState.lastGroupsStats || [];
            let validStats = groupsStats.filter(g => (g.postsCount || 0) > 0);

            // Если groupsStats ещё не рассчитан, агрегируем напрямую из posts
            if (validStats.length === 0 && posts.length > 0) {
                const branchMap = {};
                posts.forEach(p => {
                    const bName = p.canonicalBranch?.name || p.targetInfo?.canonicalName || p.targetInfo?.name || p.branchName || (p.owner_id ? `ID ${p.owner_id}` : 'Библиотека');
                    if (!branchMap[bName]) {
                        branchMap[bName] = {
                            info: { canonicalName: bName, name: bName },
                            views: 0,
                            likes: 0,
                            comments: 0,
                            reposts: 0,
                            postsCount: 0,
                            totalInteractions: 0
                        };
                    }
                    const v = Number(p.views?.count || p.views) || 0;
                    const l = Number(p.likes?.count || p.likes) || 0;
                    const c = Number(p.comments?.count || p.comments) || 0;
                    const r = Number(p.reposts?.count || p.reposts) || 0;
                    branchMap[bName].views += v;
                    branchMap[bName].likes += l;
                    branchMap[bName].comments += c;
                    branchMap[bName].reposts += r;
                    branchMap[bName].postsCount += 1;
                    branchMap[bName].totalInteractions += (l + c + r);
                });
                validStats = Object.values(branchMap);
                validStats.forEach(g => {
                    g.erViews = g.views > 0 ? (g.totalInteractions / g.views) * 100 : 0;
                });
            }

            const sortedByViews = [...validStats].sort((a, b) => (b.views || 0) - (a.views || 0));
            // «Чемпион по ER» только на репрезентативной выборке: микро-филиал
            // с одним постом и 40 просмотрами не должен обходить сетевых лидеров
            const sortedByEr = [...validStats].filter(g => (g.views || 0) >= 300 && (g.postsCount || 0) >= 2).sort((a, b) => (b.erViews || 0) - (a.erViews || 0));
            const sortedByReactions = [...validStats].sort((a, b) => (b.totalInteractions || 0) - (a.totalInteractions || 0));

            const totalViews = posts.reduce((sum, p) => sum + (Number(p.views?.count || p.views) || 0), 0);
            const totalLikes = posts.reduce((sum, p) => sum + (Number(p.likes?.count || p.likes) || 0), 0);
            const totalComments = posts.reduce((sum, p) => sum + (Number(p.comments?.count || p.comments) || 0), 0);
            const totalReposts = posts.reduce((sum, p) => sum + (Number(p.reposts?.count || p.reposts) || 0), 0);
            const avgEr = totalViews > 0 ? (((totalLikes + totalComments + totalReposts) / totalViews) * 100).toFixed(2) : '0.00';

            const topByViews = sortedByViews[0] ? {
                name: sortedByViews[0].info?.canonicalName || sortedByViews[0].info?.name || 'Лидер',
                views: sortedByViews[0].views || 0,
                postsCount: sortedByViews[0].postsCount || 0,
                likes: sortedByViews[0].likes || 0,
                comments: sortedByViews[0].comments || 0,
                reposts: sortedByViews[0].reposts || 0,
                er: (Number(sortedByViews[0].erViews) || 0).toFixed(2)
            } : null;

            const secondByViews = sortedByViews[1] ? {
                name: sortedByViews[1].info?.canonicalName || sortedByViews[1].info?.name || '',
                views: sortedByViews[1].views || 0,
                postsCount: sortedByViews[1].postsCount || 0,
                likes: sortedByViews[1].likes || 0,
                comments: sortedByViews[1].comments || 0,
                reposts: sortedByViews[1].reposts || 0,
                er: (Number(sortedByViews[1].erViews) || 0).toFixed(2)
            } : null;

            const thirdByViews = sortedByViews[2] ? {
                name: sortedByViews[2].info?.canonicalName || sortedByViews[2].info?.name || '',
                views: sortedByViews[2].views || 0,
                postsCount: sortedByViews[2].postsCount || 0,
                likes: sortedByViews[2].likes || 0,
                comments: sortedByViews[2].comments || 0,
                reposts: sortedByViews[2].reposts || 0,
                er: (Number(sortedByViews[2].erViews) || 0).toFixed(2)
            } : null;

            const topByEr = sortedByEr[0] ? {
                name: sortedByEr[0].info?.canonicalName || sortedByEr[0].info?.name || '',
                er: (Number(sortedByEr[0].erViews) || 0).toFixed(2),
                views: sortedByEr[0].views || 0
            } : null;

            const rankedBranches = sortedByViews.map(g => ({
                name: g.info?.canonicalName || g.info?.name || '',
                shortCode: g.info?.shortCode || '',
                views: g.views || 0,
                interactions: g.totalInteractions || 0,
                postsCount: g.postsCount || 0,
                likes: g.likes || 0,
                comments: g.comments || 0,
                reposts: g.reposts || 0,
                er: (Number(g.erViews) || 0).toFixed(2)
            }));

            const byBranch = {};
            groupsStats.forEach(g => {
                const name = g.info?.canonicalName || g.info?.name;
                if (name) {
                    byBranch[name] = {
                        posts: g.postsCount || 0,
                        views: g.views || 0,
                        likes: g.likes || 0,
                        comments: g.comments || 0,
                        reposts: g.reposts || 0,
                        er: (g.erViews || 0).toFixed(2)
                    };
                }
            });

            const enriched = {
                count: posts.length,
                totalViews,
                totalLikes,
                totalComments,
                totalReposts,
                avgEr,
                topBranch: topByViews?.name || '',
                topByViews,
                secondByViews,
                thirdByViews,
                topByEr,
                topByReactions: sortedByReactions[0] ? {
                    name: sortedByReactions[0].info?.canonicalName || sortedByReactions[0].info?.name || '',
                    interactions: sortedByReactions[0].totalInteractions || 0
                } : null,
                worstBranch: sortedByViews[sortedByViews.length - 1] ? {
                    name: sortedByViews[sortedByViews.length - 1].info?.canonicalName || sortedByViews[sortedByViews.length - 1].info?.name || '',
                    views: sortedByViews[sortedByViews.length - 1].views || 0,
                    postsCount: sortedByViews[sortedByViews.length - 1].postsCount || 0,
                    likes: sortedByViews[sortedByViews.length - 1].likes || 0,
                    comments: sortedByViews[sortedByViews.length - 1].comments || 0,
                    reposts: sortedByViews[sortedByViews.length - 1].reposts || 0,
                    er: (Number(sortedByViews[sortedByViews.length - 1].erViews) || 0).toFixed(2),
                    noViewsData: (sortedByViews[sortedByViews.length - 1].views || 0) === 0 && (sortedByViews[sortedByViews.length - 1].postsCount || 0) > 0
                } : null,
                branchCount: validStats.length,
                zeroPostsCount: Math.max(0, (groupsStats || []).length - validStats.length),
                rankedBranches,
                byBranch,
                query: appState.lastScanQuery || this.lastScanStats?.query || document.getElementById('keyword-input')?.value?.trim() || ''
            };

            this.lastScanStats = enriched;
            window.__AURORA_LAST_SCAN_SNAPSHOT__ = enriched;
            return enriched;
        }

        // Если есть сохраненный snapshot
        if (s && (s.count > 0 || (Array.isArray(s.rankedBranches) && s.rankedBranches.length > 0))) {
            // Нормализация контракта: payload onScanComplete({count, topBranch, stats})
            // кладёт в кэш объект без тоталов — иначе потребители ловят undefined.toLocaleString
            s.count = Number(s.count) || 0;
            s.totalViews = Number(s.totalViews) || 0;
            s.totalLikes = Number(s.totalLikes) || 0;
            s.totalComments = Number(s.totalComments) || 0;
            s.totalReposts = Number(s.totalReposts) || 0;
            s.avgEr = s.avgEr != null ? String(s.avgEr) : '0.00';
            if (!s.byBranch && Array.isArray(s.rankedBranches)) {
                s.byBranch = {};
                s.rankedBranches.forEach(b => {
                    s.byBranch[b.name] = {
                        posts: b.postsCount || 0,
                        views: b.views || 0,
                        likes: b.likes,
                        comments: b.comments,
                        reposts: b.reposts,
                        er: (Number(b.er) || 0).toFixed(2)
                    };
                });
            }
            if (!s.topByViews && Array.isArray(s.rankedBranches) && s.rankedBranches[0]) {
                s.topByViews = s.rankedBranches[0];
            }
            if (!s.secondByViews && Array.isArray(s.rankedBranches) && s.rankedBranches[1]) {
                s.secondByViews = s.rankedBranches[1];
            }
            if (!s.thirdByViews && Array.isArray(s.rankedBranches) && s.rankedBranches[2]) {
                s.thirdByViews = s.rankedBranches[2];
            }
            return s;
        }

        return null;
    }

    buildAiPageContext() {
        const stats = this.getLiveScanStats();
        const activeTabEl = document.querySelector('.tab-btn.active');
        const activeTabTitle = activeTabEl ? activeTabEl.innerText.trim().replace(/\d+$/, '').trim() : 'Лента';
        const branchFilter = window.__VK_APP__?.state?.activeBranchFilter || null;
        const hashtagFilter = window.__VK_APP__?.state?.activeHashtagFilter || null;

        let ctx = `Текущая открытая вкладка: «${activeTabTitle}».`;
        if (branchFilter) {
            ctx += ` Выбран фильтр по филиалу: «${branchFilter}».`;
            const branchInfo = this.findBranchInfo(branchFilter);
            if (branchInfo) {
                ctx += ` Справка: ${branchInfo.branch_num} — ${branchInfo.branch_name}, адрес: ${branchInfo.address}${branchInfo.phone ? `, тел.: ${branchInfo.phone}` : ''}${Array.isArray(branchInfo.vk_links) && branchInfo.vk_links[0] ? `, VK: ${branchInfo.vk_links[0]}` : ''}.`;
            }
        }
        if (hashtagFilter) ctx += ` Активен фильтр по хэштегу: «#${hashtagFilter}».`;
        ctx += this.buildSubscribersSummary();

        if (stats && stats.count > 0) {
            // Для модели — точные числа (toLocaleString), formatViews с округлениями
            // оставляем только для человеческих реплик: ИИ должен называть точные цифры
            const exact = (n) => (Number(n) || 0).toLocaleString('ru-RU');
            const avgViewsPerPost = stats.count > 0 ? Math.round(stats.totalViews / stats.count) : 0;
            const scopeMark = branchFilter ? ' (весь скан, без учёта фильтра)' : '';
            ctx += ` Всего найдено постов: ${stats.count}, суммарно просмотров: ${exact(stats.totalViews)} (в среднем ~${exact(avgViewsPerPost)} на пост), лайков: ${exact(stats.totalLikes)}, комментариев: ${exact(stats.totalComments)}, репостов: ${exact(stats.totalReposts)}, средний ER по сети: ${Number(stats.avgEr || 0).toFixed(2)}%.${scopeMark}`;
            if (branchFilter) {
                const fb = stats.byBranch?.[branchFilter] || stats.rankedBranches?.find(b => b.name === branchFilter);
                if (fb) {
                    ctx += ` По выбранному филиалу «${branchFilter}»: постов ${fb.posts ?? fb.postsCount ?? 0}, просмотров ${exact(fb.views)}, лайков ${exact(fb.likes)}, ER ${Number(fb.er || 0).toFixed(2)}% — отвечай на вопросы о цифрах именно этой выборки.`;
                }
            }
            if (stats.topByViews) ctx += ` Абсолютный лидер по просмотрам: «${stats.topByViews.name}» (${exact(stats.topByViews.views)} просм, ${stats.topByViews.postsCount} постов, ER: ${Number(stats.topByViews.er || 0).toFixed(2)}%).`;
            if (stats.secondByViews) ctx += ` 2-е место: «${stats.secondByViews.name}» (${exact(stats.secondByViews.views)} просм, ER: ${Number(stats.secondByViews.er || 0).toFixed(2)}%).`;
            if (stats.thirdByViews) ctx += ` 3-е место: «${stats.thirdByViews.name}» (${exact(stats.thirdByViews.views)} просм, ER: ${Number(stats.thirdByViews.er || 0).toFixed(2)}%).`;
            if (stats.topByEr) ctx += ` Чемпион по вовлечённости читателей (ER по просмотрам): «${stats.topByEr.name}» (ER: ${Number(stats.topByEr.er || 0).toFixed(2)}%, ${exact(stats.topByEr.views)} просм).`;
            if (stats.worstBranch && stats.worstBranch.name && stats.worstBranch.name !== stats.topByViews?.name) {
                ctx += stats.worstBranch.noViewsData
                    ? ` У филиала «${stats.worstBranch.name}» (${stats.worstBranch.postsCount} постов) просмотры не получены из API — данных нет, не интерпретируй это как нулевой охват.`
                    : ` Самый отстающий филиал по просмотрам: «${stats.worstBranch.name}» (${exact(stats.worstBranch.views)} просм, ${stats.worstBranch.postsCount} постов).`;
            }
            if (stats.query) ctx += ` Поисковый запрос этого сканирования: «${stats.query}».`;
        } else {
            ctx += ` Посты ещё не сканированы (поиск не запущен).`;
        }
        return ctx;
    }

    updateDynamicChips(tabId = null) {
        if (!this.chipsContainer) {
            this.chipsContainer = this.container?.querySelector('[data-mascot-chips]');
        }
        if (!this.chipsContainer) return;

        const stats = this.getLiveScanStats();
        const hasStats = Boolean(stats && stats.count > 0);
        let chips = [];

        if (hasStats) {
            if (tabId === 'analytics-tab') {
                chips = [
                    { label: '🏆 Кто лидер?', action: 'leader' },
                    { label: '🎙️ Разбор топ-3', action: 'analyze-top3' },
                    { label: '🏆 Анализ победы лидера', query: 'Проанализируй победу лидера по просмотрам. За счёт чего он обогнал всех остальных?' },
                    { label: '📈 Как спасти отстающих?', query: 'Как спасти филиалы с низкими охватами? Дай 3 конкретных шага.' },
                    { label: '🩺 Диагноз отстающему', action: 'branch-diagnose' },
                    { label: '📋 Отчёт в буфер', action: 'copy-report' },
                    { label: '✨ Спросить Космо...', action: 'custom' }
                ];
            } else if (tabId === 'visual-tab') {
                chips = [
                    { label: '🏆 Кто лидер?', action: 'leader' },
                    { label: '🎙️ Разбор топ-3', action: 'analyze-top3' },
                    { label: '🕒 Время для постов', query: 'В какое время лучше выкладывать посты библиотекам для максимального охвата?' },
                    { label: '🖼️ Ошибки картинок', query: 'Назови главные визуальные ошибки оформления постов в библиотеках.' },
                    { label: '✍️ Напиши пост', action: 'generate-post' },
                    { label: '#️⃣ Хэштег-ревизия', action: 'hashtag-advice' },
                    { label: '✨ Спросить Космо...', action: 'custom' }
                ];
            } else if (tabId === 'advice-tab') {
                chips = [
                    { label: '🎙️ Разбор топ-3', action: 'analyze-top3' },
                    { label: '✍️ Идея вирусного поста', query: 'Придумай одну взрывную идею вирусного поста для библиотеки, чтобы залететь в рекомендации.' },
                    { label: '🚀 Как залететь в топ?', query: 'Как библиотеке сделать виральный пост во Владимире?' },
                    { label: '💡 Идеи интерактива', query: 'Предложи 2 крутые темы интерактива для читателей библиотек.' },
                    { label: '📅 Идеи недели', action: 'week-ideas' },
                    { label: '✍️ Напиши пост', action: 'generate-post' },
                    { label: '✨ Спросить Космо...', action: 'custom' }
                ];
            } else if (tabId === 'subscribers-tab') {
                chips = [
                    { label: '🎙️ Разбор топ-3', action: 'analyze-top3' },
                    { label: '👥 Топ по подписчикам', query: 'Опираясь на данные о подписчиках из контекста, назови топ-3 филиала по числу подписчиков и дай аутсайдеру один конкретный шаг для роста.' },
                    { label: '👥 Удержание читателей', query: 'Как превратить случайных посетителей в постоянных читателей паблика?' },
                    { label: '📈 Секрет роста', query: 'Что привлекает новых читателей в библиотечные соцсети?' },
                    { label: '🩺 Диагноз отстающему', action: 'branch-diagnose' },
                    { label: '✨ Спросить Космо...', action: 'custom' }
                ];
            } else {
                chips = [
                    { label: '🏆 Кто лидер?', action: 'leader' },
                    { label: '🎙️ Разбор топ-3', action: 'analyze-top3' },
                    { label: '📅 Идеи недели', action: 'week-ideas' },
                    { label: '⏰ Напомни через час', action: 'set-reminder' },
                    { label: '✨ Спросить Космо...', action: 'custom' }
                ];
            }
        } else {
            chips = [
                { label: '🚀 Запустить поиск', action: 'start-search' },
                { label: '📅 Идеи недели', action: 'week-ideas' },
                { label: '✍️ Напиши пост', action: 'generate-post' },
                { label: '✨ Спросить Космо...', action: 'custom' }
            ];
        }

        // Если Космо смещён от закреплённой базы — даём чип быстрого закрепления
        const baseX = (this.baseLeft !== undefined && this.baseLeft !== null) ? this.baseLeft : 24;
        const baseY = (this.baseBottom !== undefined && this.baseBottom !== null) ? this.baseBottom : 24;
        const isDisplaced = Math.abs(this.currentPosX - baseX) > 45 || Math.abs(this.currentPosY - baseY) > 45;
        if (isDisplaced) {
            chips.unshift({ label: '📌 Закрепить базу', action: 'stay-here' });
        }

        this.chipsContainer.innerHTML = chips.map(c => `
            <button type="button" class="mascot-ai-chip" data-chip="${c.label}" data-query="${c.query || ''}" data-action="${c.action || ''}">
                ${c.label}
            </button>
        `).join('');
    }

    onTabSwitched(tabId, customContext = null) {
        if (!this.isEnabled || this.isSleeping || this.isIn3D || this.isCollapsed) return;

        const now = Date.now();
        // Защита от частых кликов: если вкладку переключили быстрее чем через 12 секунд,
        // обновляем только фишки и контекст, но НЕ говорим и не перебиваем голос!
        if (now - this.lastTabVoiceTime < this.tabVoiceCooldownMs) {
            this.updateDynamicChips(tabId);
            return;
        }

        // Если сейчас играет звук и это фоновое переключение, не перебиваем
        if (this.isSpeakingAudio && this.currentAudio && !this.currentAudio.paused) {
            this.updateDynamicChips(tabId);
            return;
        }

        const variants = TAB_SPEECH_VARIANTS[tabId];
        if (!variants || variants.length === 0) {
            this.updateDynamicChips(tabId);
            return;
        }

        if (!this.tabSpeechHistory[tabId]) {
            this.tabSpeechHistory[tabId] = 0;
        }

        const idx = this.tabSpeechHistory[tabId] % variants.length;
        this.tabSpeechHistory[tabId] = (idx + 1) % variants.length;
        this.lastTabVoiceTime = now;

        const liveStats = this.getLiveScanStats();
        const chosen = variants[idx];
        const msg = chosen.text(liveStats);

        this.say(msg, 7500, 'smile', chosen.voice, false);
        if (chosen.activity) {
            this.playActivity(chosen.activity, false, 3500);
        }

        this.updateDynamicChips(tabId);
    }

    playDynamicAudio(audioUrl, text, spriteMood = 'smile', isUserAction = true) {
        if (!this.bubbleEl || !this.bubbleTextEl || this.isCollapsed || this.isIn3D) return;

        // Если пользователь закрыл облачко вручную, не открываем его самопроизвольно
        if (this.userDismissedBubble) {
            if (!isUserAction) return;
            this.userDismissedBubble = false;
        }

        if (this.currentAudio) {
            try { this.currentAudio.pause(); } catch (e) {}
            this.currentAudio = null;
        }

        this.bubbleTextEl.innerHTML = this.parseMarkdown(text);
        this.bubbleEl.classList.add('is-active');

        try {
            const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || 'visual-tab';
            this.updateDynamicChips(activeTab);
        } catch (e) {}

        if (spriteMood) this.setState(spriteMood, 14000);

        if (this.isMuted) {
            clearTimeout(this.speechTimer);
            this.speechTimer = setTimeout(() => this.hideBubble(false), 9000);
            return;
        }

        const audio = new Audio(this.resolveTtsAudioUrl(audioUrl));
        audio.volume = 0.9;
        this.currentAudio = audio;
        this.isSpeakingAudio = true;
        this.bubbleEl.classList.add('is-speaking');

        audio.onplay = () => {
            this.isSpeakingAudio = true;
            this.bubbleEl?.classList.add('is-speaking');
        };
        audio.onended = () => {
            this.isSpeakingAudio = false;
            this.bubbleEl?.classList.remove('is-speaking');
            this.currentAudio = null;
            clearTimeout(this.speechTimer);
            this.speechTimer = setTimeout(() => this.hideBubble(false), 2000);
        };
        audio.onerror = () => {
            this.isSpeakingAudio = false;
            this.bubbleEl?.classList.remove('is-speaking');
            this.currentAudio = null;
            clearTimeout(this.speechTimer);
            this.speechTimer = setTimeout(() => this.hideBubble(false), 3000);
        };
        audio.addEventListener('loadedmetadata', () => {
            if (audio.duration && !isNaN(audio.duration)) {
                const audioMs = (audio.duration * 1000) + 2200;
                clearTimeout(this.speechTimer);
                this.speechTimer = setTimeout(() => this.hideBubble(false), audioMs);
            }
        });

        audio.play().catch(e => {
            console.debug('[Cosmo Dynamic Voice] Playback blocked:', e.message);
        });
    }

    async analyzeTop3Leaders(isUserAction = false) {
        if (this.isAiLoading) return;
        const stats = this.getLiveScanStats();
        if (!stats || !stats.count || !stats.topByViews) {
            this.say(`Сначала запустим сканирование стены, чтобы было кого разбирать! 🚀`, 5000, 'smile', 'scan_wait_7', isUserAction);
            return;
        }

        const b1 = stats.topByViews;
        const b2 = stats.secondByViews || stats.rankedBranches?.[1] || null;
        const b3 = stats.thirdByViews || stats.rankedBranches?.[2] || null;

        const sig = `${b1?.name || ''}_${b1?.views || 0}_${b2?.name || ''}_${b2?.views || 0}_${b3?.name || ''}_${b3?.views || 0}`;

        // Если уже озвучивали эту тройку лидеров — не генерируем повторно в ElevenLabs!
        if (this.analyzedTop3Signatures.has(sig)) {
            const cached = this.analyzedTop3AudioCache.get(sig);
            if (cached) {
                if (isUserAction) {
                    this.playDynamicAudio(cached.audioUrl, `Разбор уже звучал! Слушай и читай окно по центру 🎙️`, 'smile', true);
                    this.showCosmoModal('Разбор тройки лидеров 🎙️', cached.text, cached.text.replace(/^##\s+/m, ''));
                }
                return;
            }
        }

        this.isAiLoading = true;
        this.setState('thinking', 15000);
        this.setMoodBadge('⚡', 10000);
        this.say(`## Анализирую тройку лидеров... 🎙️\nПодключаюсь к ИИ и квантовому синтезатору речи Бэлы!`, 10000, 'thinking', 'scan_wait_3', isUserAction);

        try {
            const branchLine = (place, b) => {
                const posts = b.postsCount || b.posts || 0;
                const avgViews = posts > 0 ? Math.round((b.views || 0) / posts) : 0;
                const fmt = (v) => (v === null || v === undefined) ? 'нет данных' : String(v).toLocaleString('ru-RU');
                return `${place}: «${b.name}» — ${(Number(b.views) || 0).toLocaleString('ru-RU')} просмотров, ${posts} постов, лайков: ${fmt(b.likes)}, комментариев: ${fmt(b.comments)}, репостов: ${fmt(b.reposts)}, ER: ${Number(b.er || 0).toFixed(2)}%, средний просмотр на пост: ${(Number(avgViews) || 0).toLocaleString('ru-RU')}.`;
            };
            const leadersInfo = [
                branchLine('1 место', b1),
                b2 ? branchLine('2 место', b2) : null,
                b3 ? branchLine('3 место', b3) : null
            ].filter(Boolean).join('\n');

            const systemPrompt = `Ты — Космо, робот-маскот AURORA, величайший SMM-гуру галактики. Составь подробный аналитический разбор топ-3 филиалов библиотечной сети по просмотрам.
ФОРМАТ ОТВЕТА (строго в Markdown, без вступлений):
### 🥇 1 место: «название»
- **Почему на этом месте:** 1-2 предложения по цифрам.
- **Как этого добились:** 2-3 вероятные причины успеха (регулярность, охваты, вовлечённость, средний просмотр на пост).
### 🥈 2 место: «название»
(та же структура)
### 🥉 3 место: «название»
(та же структура)
### 📊 Общий вывод
2-3 предложения: что отличает лидеров от остальных и один конкретный шаг для отстающих.
ПРАВИЛА:
1. Опирайся строго на переданные цифры — запрещено выдумывать или округлять числа.
2. Для каждого места объясни разрыв с соседями (например, «просмотров в 2 раза больше, чем у второго места»).
3. Тон живой, доброжелательный, с лёгкой иронией; 1-2 эмодзи на раздел.
4. Пиши безупречно грамотно (по правилам Дитмара Розенталя), без клише вроде «Мой вердикт».`;

            const userPrompt = `Вот тройка лидеров библиотечной сети по просмотрам:\n${leadersInfo}\nСоставь полный разбор по формату выше: для каждого из трёх мест объясни, почему филиал на этой позиции и как он этого добился.`;

            // Используем резолвенный AI_PROXY_URL (как в askAiThrifty), а не относительный путь
            const aiResponse = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: aiFetchSignal(90000),
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 1500,
                    temperature: 0.6
                })
            });

            if (!aiResponse.ok) throw new Error(`AI proxy HTTP ${aiResponse.status}`);
            const aiData = await aiResponse.json();
            const { text: commentary, truncated: top3Truncated } = this.parseAiChoice(aiData);

            if (!commentary) throw new Error('Empty AI commentary');

            // Для озвучки берём короткое начало разбора (TTS-прокси обрезает до 450 символов)
            const voiceText = commentary.replace(/^#{2,}\s+/gm, '').replace(/[*_`]/g, '').slice(0, 380);

            // Синтезируем аудио через ElevenLabs TTS proxy
            const ttsResponse = await fetch(TTS_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: aiFetchSignal(60000),
                body: JSON.stringify({ text: voiceText })
            });

            if (!ttsResponse.ok) {
                const errBody = await ttsResponse.text();
                throw new Error(`TTS proxy HTTP ${ttsResponse.status}: ${errBody}`);
            }
            const ttsData = await ttsResponse.json();

            if ((!ttsData.success && ttsData.status !== 'success') || !ttsData.audio_url) {
                throw new Error(ttsData.error || 'TTS generation failed');
            }

            const formattedText = `## Разбор тройки лидеров 🎙️🔥\n${commentary}${top3Truncated ? this.truncationNote() : ''}\n\n\`Все цифры — из результатов последнего сканирования.\``;
            this.analyzedTop3Signatures.add(sig);
            this.analyzedTop3AudioCache.set(sig, {
                audioUrl: ttsData.audio_url,
                text: formattedText
            });

            // Голос играет, а текст разбора открываем в модальном окне по центру
            this.playDynamicAudio(ttsData.audio_url, `Разбор топ-3 готов! Слушай Бэлу и читай окно по центру 🎙️🔥`, 'smile', true);
            this.showCosmoModal('Разбор тройки лидеров 🎙️', formattedText, commentary);
            this.spawnSparkles(10);
        } catch (err) {
            console.warn('[Cosmo Top-3 AI/TTS] Error:', err);
            // ИИ недоступен — показываем честный разбор из сырых цифр сканирования
            const rows = [b1, b2, b3].filter(Boolean).map((b, i) => {
                const medal = ['🥇', '🥈', '🥉'][i];
                const posts = b.postsCount || b.posts || 0;
                const avgViews = posts > 0 ? Math.round((b.views || 0) / posts) : 0;
                const fmt = (v) => (v === null || v === undefined) ? 'нет данных' : (Number(v) || 0).toLocaleString('ru-RU');
                return `${medal} **${b.name}**: ${fmt(b.views)} просмотров, ${posts} постов, лайков: ${fmt(b.likes)}, ER: ${Number(b.er || 0).toFixed(2)}%, средний просмотр на пост: ${fmt(avgViews)}.`;
            }).join('\n\n');
            const fallbackText = `## Тройка лидеров 🏆\n${rows}\n\n*ИИ-аналитик временно недоступен — цифры напрямую из сканирования.*`;
            this.say(`ИИ на связи барахлит, но цифры не врут! Разбор — в окне по центру 🏆`, 7000, 'smile', 'critique_2', isUserAction);
            this.showCosmoModal('Тройка лидеров 🏆', fallbackText, fallbackText.replace(/\*\*/g, '').replace(/^##\s+/m, ''));
        } finally {
            this.isAiLoading = false;
        }
    }

    onBranchFiltered(branchName, branchData = null) {
        if (!this.isEnabled || this.isSleeping || this.isIn3D || this.isCollapsed) return;
        const posts = branchData?.postsCount || branchData?.posts || '';
        const views = branchData?.views ? formatViews(branchData.views) : '';
        let text = `## Филиал: ${escapeHtml(branchName)} 🏛️\nПоказываю записи этой библиотеки!`;
        if (posts) text += ` Найдено **${posts}** постов.`;
        if (views) text += ` Просмотров: **${views}**.`;
        text += ` Изучаем их стиль!`;
        this.say(text, 6500, 'smile', 'critique_13');
        this.setMoodBadge('🏛️', 3500);
        this.updateDynamicChips('visual-tab');
    }

    onBranchFilterCleared() {
        if (!this.isEnabled || this.isSleeping || this.isIn3D || this.isCollapsed) return;
        this.say(`## Все филиалы 🏛️✨\nФильтр сброшен, показываю общую ленту всех библиотек Владимира!`, 4500, 'smile', 'post_scan_1');
        this.updateDynamicChips('visual-tab');
    }

    onHashtagFiltered(tag, count = null) {
        if (!this.isEnabled || this.isSleeping || this.isIn3D || this.isCollapsed) return;
        let text = `## Хэштег #${escapeHtml(tag)} #️⃣\nФильтруем записи с этим тегом!`;
        if (count) text += ` Всего **${count}** постов.`;
        text += ` Меньше лишних тегов — выше читаемость!`;
        this.say(text, 6500, 'smile', 'critique_4');
        this.setMoodBadge('🏷️', 3500);
        this.updateDynamicChips('visual-tab');
    }

    onSortChanged(sortLabel) {
        if (!this.isEnabled || this.isSleeping || this.isIn3D || this.isCollapsed) return;
        this.say(`## Сортировка: ${escapeHtml(sortLabel)} 🔃\nПерестроили ленту! Изучаем лидеров в этом разрезе!`, 5500, 'smile', 'critique_16');
        this.setMoodBadge('🔃', 3000);
    }

    showLeaderReport() {
        const stats = this.getLiveScanStats();

        if (!stats || stats.count === 0) {
            this.say(`
## Статистика ещё не собрана! 📊
Чтобы определить лидера, **запусти сканирование постов** с помощью формы наверху или по кнопке ниже:
<br><br>
<button type="button" class="mascot-action-btn" data-mascot-action="start-search">
    🚀 Запустить сканирование филиалов
</button>
            `.trim(), 12000, 'thinking');
            this.setMoodBadge('💡', 4000);
            return;
        }

        const top1 = stats.topByViews;
        const top2 = stats.secondByViews;
        const top3 = stats.thirdByViews;

        let report = `## Пьедестал лидеров по просмотрам 🏆`;
        if (top1) {
            report += `\n\n🥇 **${top1.name}**: ${top1.postsCount || top1.posts || 0} постов, ${(Number(top1.views) || 0).toLocaleString('ru-RU')} просмотров (ER: ${Number(top1.er || 0).toFixed(2)}%)`;
        }
        if (top2) {
            report += `\n\n🥈 **${top2.name}**: ${top2.postsCount || top2.posts || 0} постов, ${(Number(top2.views) || 0).toLocaleString('ru-RU')} просмотров`;
        }
        if (top3) {
            report += `\n\n🥉 **${top3.name}**: ${top3.postsCount || top3.posts || 0} постов, ${(Number(top3.views) || 0).toLocaleString('ru-RU')} просмотров`;
        }
        if (stats.topByEr && stats.topByEr.name && stats.topByEr.name !== top1?.name) {
            report += `\n\n⚡ **Лидер по вовлечённости (ER по просмотрам)**: **${stats.topByEr.name}** (${Number(stats.topByEr.er || 0).toFixed(2)}%)! Красавчики!`;
        }
        report += `\n\n*Космо в восторге! Все цифры строго из результатов сканирования филиалов!* 🕶️✨`;

        this.say(`Пьедестал готов! Полный отчёт — в окне по центру 🏆`, 6000, 'smile');
        this.showCosmoModal('Пьедестал лидеров 🏆', report, report.replace(/\*\*/g, '').replace(/^##\s+/m, ''));
        this.setMoodBadge('🏆', 4000);
        this.spawnSparkles(8);
        this.playActivity('smm_guru_pose', false, 4000);

        // Воспроизводим одну из 10 фраз оценки статистики
        const postClips = ['post_scan_1', 'post_scan_2', 'post_scan_3', 'post_scan_4', 'post_scan_5', 'post_scan_6', 'post_scan_7', 'post_scan_8', 'post_scan_9', 'post_scan_10', 'critique_2', 'critique_12'];
        const chosen = postClips[Math.floor(Math.random() * postClips.length)];
        this.playVoice(chosen);
    }

    triggerSearchFromMascot() {
        this.say(`## Погнали! 🚀⚡\nЗапускаю сканирование постов ВКонтакте! Держись крепче!`, 5000, 'smile', 'scan_wait_1');
        this.spawnSparkles(8);
        const searchForm = document.getElementById('search-form');
        const submitBtn = document.getElementById('submit-search-btn') || document.getElementById('submit-btn');
        if (searchForm) {
            searchForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setTimeout(() => {
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.click();
            }
        }, 450);
    }

    /* ---------------------------------------------------------------------
     * 8. АВТОНОМНЫЙ ЦИКЛ 20 АКТИВНОСТЕЙ КОСМО
     * ------------------------------------------------------------------- */
    startAutonomousCycle() {
        if (!this.isEnabled) return;
        const scheduleNext = () => {
            const delay = 82000 + Math.random() * 56000; // ×1/0.8 от 65+rnd*45 сек
            this.activityCycleTimer = setTimeout(() => {
                if (!this.isSleeping && !this.isIn3D && !this.isCollapsed && !this.isAiLoading && !this.isPerformingActivity && !this.isDragging && !this.isPatrolling && !this.isReturningHome && !this.isSpeakingAudio && (!this.currentAudio || this.currentAudio.paused)) {
                    this.executeRandomActivity();
                }
                scheduleNext();
            }, delay);
        };
        scheduleNext();
    }

    executeRandomActivity() {
        if (this.isInPresentation) return;
        // Патруль имеет сбалансированный вес в цикле (20% вероятность) только на ПК
        if (!this.isMobile() && Math.random() < 0.20) {
            this.startContinuousPatrol(30000);
            return;
        }

        const activities = [
            'tablet_study', 'inspect_screen', 'magnifier_scan',
            'visor_wipe', 'antenna_tune', 'joy_dance', 'upside_down', 'energy_drink',
            'laser_pointer', 'shrug_confused', 'flex_muscles', 'check_watch',
            'dizzy_spin', 'telescope_look', 'excited_wave',
            'easter_flip', 'sleep_snooze', 'smm_guru_pose'
        ];

        const pick = activities[Math.floor(Math.random() * activities.length)];
        // В 76% случаев робот совершает пантомиму молча (без звука и пузыря), в 24% — со звуком (×0.8 от 30%)
        const shouldSpeak = (Math.random() < 0.24);
        this.playActivity(pick, shouldSpeak ? null : false);
    }

    playActivity(activityName, customText = null, forcedDuration = null) {
        if (!this.bodyEl) return;
        this.isPerformingActivity = true;
        this.currentActivity = activityName;
        this.bodyEl.setAttribute('data-activity', activityName);
        const shouldSpeak = (customText !== false);

        let duration = forcedDuration || 4500;
        let sprite = 'smile';
        let emoji = '✨';

        switch (activityName) {
            case 'tablet_study':
                sprite = 'thinking';
                emoji = '📱';
                duration = 4800;
                if (shouldSpeak) this.say(customText || `## Аналитика на планшете 📱\nУмная лента сегодня благоволит **хорошим визуалам!**`, duration, sprite, 'post_scan_2');
                break;

            case 'inspect_screen':
                sprite = 'idle';
                emoji = '🔍';
                duration = 5200;
                if (shouldSpeak) this.say(customText || `## Инспекция страницы 👀\nРазворачиваюсь и **сканирую лучом** верстку сайта!`, duration, sprite, 'critique_16');
                break;

            case 'horizontal_patrol':
                if (this.isMobile()) {
                    this.playActivity('joy_dance', customText, forcedDuration);
                    return;
                }
                sprite = 'smile';
                emoji = '🛸';
                duration = 30000;
                this.startContinuousPatrol(30000);
                // Патруль управляет своим завершением, но нужно снять флаг активности
                setTimeout(() => {
                    if (this.currentActivity === activityName) {
                        this.bodyEl?.removeAttribute('data-activity');
                        this.currentActivity = null;
                        this.isPerformingActivity = false;
                    }
                }, duration);
                return;

            case 'magnifier_scan':
                sprite = 'thinking';
                emoji = '🔎';
                duration = 4200;
                if (shouldSpeak) this.say(customText || `## Неоновая лупа 🔎\nОбнаружен **высокий читательский потенциал!** 💡`, duration, sprite, 'critique_3');
                break;

            case 'visor_wipe':
                sprite = 'smile';
                emoji = '🧽';
                duration = 3800;
                this.spawnSparkles(6);
                if (shouldSpeak) this.say(customText || `## Полировка визора ✨\nТеперь каждый лайк сияет в **4K Ultra HD!**`, duration, sprite, 'post_scan_10');
                break;

            case 'antenna_tune':
                sprite = 'thinking';
                emoji = '📡';
                duration = 4000;
                if (shouldSpeak) this.say(customText || `## Настройка антенны 📻\nЛовлю радиоволну **рекомендаций ВКонтакте!**`, duration, sprite, 'scan_wait_7');
                break;

            case 'joy_dance':
                sprite = 'smile';
                emoji = '🕺';
                duration = 3600;
                this.spawnSparkles(8);
                if (shouldSpeak) this.say(customText || `## Победный танец! 🕺🔥\nПусть охваты растут **со скоростью света!**`, duration, sprite, 'post_scan_1');
                break;

            case 'upside_down':
                sprite = 'smile';
                emoji = '🙃';
                duration = 4500;
                if (shouldSpeak) this.say(customText || `## Вверх ногами! 🙃\nВ невесомости так даже веселее! Привет с орбиты!`, duration, sprite, 'throw_fling_2');
                break;

            case 'energy_drink':
                sprite = 'idle';
                emoji = '🧃';
                duration = 4200;
                if (shouldSpeak) this.say(customText || `## Дозаправка 🧃⚙️\nСинтетическое масло *Cyber Oil* с ароматом новых книг!`, duration, sprite, 'scan_wait_8');
                break;

            case 'laser_pointer':
                sprite = 'idle';
                emoji = '🎯';
                duration = 4600;
                if (shouldSpeak) this.say(customText || `## Лазерная точка 🔴\nТренируем внимательность умной ленты!`, duration, sprite, 'critique_4');
                break;

            case 'shrug_confused':
                sprite = 'tired';
                emoji = '❓';
                duration = 3500;
                if (shouldSpeak) this.say(customText || `## Недоумение 🤷‍♂️\nОпять пост без картинки? Ну как так, друзья?`, duration, sprite, 'critique_6');
                break;

            case 'flex_muscles':
                sprite = 'smile';
                emoji = '💪';
                duration = 3800;
                this.spawnSparkles(7);
                if (shouldSpeak) this.say(customText || `## Сила SMM! 💪💥\nС такими бицепсами любой пост **залетит в тренды!**`, duration, sprite, 'post_scan_9');
                break;

            case 'check_watch':
                sprite = 'idle';
                emoji = '⌚';
                duration = 4000;
                if (shouldSpeak) this.say(customText || `## Время постов! ⏰\nСамое время порадовать читателей свежим анонсом!`, duration, sprite, 'critique_5');
                break;

            case 'dizzy_spin':
                sprite = 'yawn';
                emoji = '💫';
                duration = 4500;
                this.spawnSparkles(8);
                if (shouldSpeak) this.say(customText || `## Ой, закружился! 🌀\nЗвёздочки на орбите, но Космо в строю!`, duration, sprite, 'drag_drop_2');
                break;

            case 'cursor_dodge':
                sprite = 'smile';
                emoji = '⚡';
                duration = 3200;
                this.spawnSparkles(5);
                if (shouldSpeak) this.say(customText || `## Ловкий уворот! 🏃‍♂️💨\nМоя квантовая реакция — \`0.001 секунды!\``, duration, sprite, 'drag_drop_3');
                break;

            case 'telescope_look':
                sprite = 'thinking';
                emoji = '🔭';
                duration = 4800;
                if (shouldSpeak) this.say(customText || `## Кибер-телескоп 🔭\nВижу горизонт грандиозных **библиотечных просмотров!**`, duration, sprite, 'critique_12');
                break;

            case 'excited_wave':
                sprite = 'smile';
                emoji = '👋';
                duration = 3400;
                this.spawnSparkles(6);
                if (shouldSpeak) this.say(customText || `## Привет всем! 👋🥰\nКосмо машет ручками всем труженикам библиотек!`, duration, sprite, 'post_scan_5');
                break;

            case 'easter_flip':
                sprite = 'smile';
                emoji = '🤸';
                duration = 1800;
                this.spawnSparkles(12);
                if (shouldSpeak) this.say(customText || `## Сальто 360°! 🚀\nАнтигравы работают **на все 100%!**`, duration, sprite, 'throw_fling_1');
                break;

            case 'sleep_snooze':
                sprite = 'sleep';
                emoji = '😴';
                duration = 5000;
                if (shouldSpeak) this.say(customText || `Режим быстрой энергосберегающей подзарядки... zZz... 💤`, duration, sprite, 'scan_wait_9');
                break;

            case 'smm_guru_pose':
            default:
                sprite = 'smile';
                emoji = '👑';
                duration = 4500;
                this.spawnSparkles(10);
                if (shouldSpeak) this.say(customText || `## Космо — SMM-гуру! 👑💅\nВеличайший эксперт галактики **к вашим услугам!**`, duration, sprite, 'critique_20');
                break;
        }

        this.setState(sprite, duration);
        this.setMoodBadge(emoji, duration);

        setTimeout(() => {
            if (this.currentActivity === activityName) {
                this.bodyEl?.removeAttribute('data-activity');
                this.currentActivity = null;
                this.isPerformingActivity = false;
            }
        }, duration);
    }

    /* ---------------------------------------------------------------------
     * 9. 2.5D трекинг курсора
     * ------------------------------------------------------------------- */
    onMouseMove(e) {
        const now = Date.now();
        const dt = Math.max(1, now - this.lastMouseMoveTime);

        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        const distMoved = Math.hypot(dx, dy);

        this.mouseVelocity = distMoved / dt;

        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.lastMouseMoveTime = now;

        if (this.isSleeping || this.isCollapsed || !this.bodyEl || this.isDragging) {
            this.targetRotX = 0;
            this.targetRotY = 0;
            return;
        }

        const rect = this.bodyEl.getBoundingClientRect();
        const mascotCenterX = rect.left + rect.width / 2;
        const mascotCenterY = rect.top + rect.height / 2;
        const distToCosmo = Math.hypot(this.mouseX - mascotCenterX, this.mouseY - mascotCenterY);

        const relX = (this.mouseX - mascotCenterX) / window.innerWidth;
        const relY = (this.mouseY - mascotCenterY) / window.innerHeight;
        this.targetRotY = Math.max(-18, Math.min(18, relX * 34));
        this.targetRotX = Math.max(-14, Math.min(14, -relY * 24));

        // Спокойный 2.5D трекинг без возмущений и без обрыва аудио при движении мыши
    }

    updateParallaxAndMotion() {
        if (!this.isIn3D && !this.isCollapsed && this.floaterEl && !this.isDragging) {
            this.currentRotX += (this.targetRotX - this.currentRotX) * 0.12;
            this.currentRotY += (this.targetRotY - this.currentRotY) * 0.12;

            if (!this.isPerformingActivity) {
                this.floaterEl.style.transform = `rotateX(${this.currentRotX.toFixed(2)}deg) rotateY(${this.currentRotY.toFixed(2)}deg)`;
            }
        }
        this.animFrameId = requestAnimationFrame(this.updateParallaxAndMotion);
    }

    onUserActivity() {
        this.resetIdleTimer();
        if (this.isSleeping) {
            this.wakeUp();
        }
    }

    /* ---------------------------------------------------------------------
     * 10. Автономные реакции на действия на сайте (0 токенов!)
     * ------------------------------------------------------------------- */
    bindAutonomousInteractions() {
        // Разблокировка аудио при первом касании страницы
        const unlockAudio = () => {
            const silent = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=');
            silent.play().catch(() => {});
            document.removeEventListener('pointerdown', unlockAudio);
        };
        document.addEventListener('pointerdown', unlockAudio, { once: true });

        // Фокус на поле ввода поискового запроса
        const searchInput = document.getElementById('keyword-input') || document.getElementById('search-input');
        if (searchInput) {
            let focusCommentTimer = null;
            searchInput.addEventListener('focus', () => {
                if (this.isSleeping || this.isIn3D || this.isCollapsed) return;
                clearTimeout(focusCommentTimer);
                focusCommentTimer = setTimeout(() => {
                    if (document.activeElement === searchInput && !searchInput.value.trim()) {
                        this.say(`## Что поищем? 🔍\nНапример: **«мастер-класс»**, **«новинки книг»** или **«выставка»**!`, 6000, 'thinking', 'scan_wait_7');
                    }
                }, 900);
            });
        }

        // Глобальные реакции на интерфейс (вкладки, филиалы, теги, пресеты, тема)
        document.addEventListener('click', (e) => {
            const toggleTarget = e.target.closest('#mascot-toggle-btn, #dropdown-mascot-toggle-btn, #modal-mascot-toggle-btn');
            if (toggleTarget) {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMascot();
                return;
            }

            if (!this.isEnabled || this.isSleeping || this.isIn3D || this.isCollapsed) return;

            // 1. Клик по кнопке вкладки
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                const tabTarget = tabBtn.getAttribute('data-tab') || tabBtn.dataset.tab;
                if (tabTarget) {
                    this.onTabSwitched(tabTarget);
                }
                return;
            }

            // 2. Клик по карточке филиала в витрине источников
            const showcaseCard = e.target.closest('.showcase-card, .showcase-filter-btn');
            if (showcaseCard) {
                const nameEl = showcaseCard.querySelector('.showcase-name, .branch-name') || showcaseCard;
                const branchName = nameEl?.innerText?.trim() || 'филиал';
                this.onBranchFiltered(branchName);
                return;
            }

            // 3. Клик по хэштегу
            const tagPill = e.target.closest('.hashtag-pill');
            if (tagPill) {
                const tagText = tagPill.querySelector('span')?.innerText?.replace(/^#/, '') || '';
                if (tagText) {
                    this.onHashtagFiltered(tagText);
                }
                return;
            }

            // 4. Клик по пресету периода дат
            const presetPill = e.target.closest('.preset-pill');
            if (presetPill) {
                const text = presetPill.innerText?.trim();
                this.say(`## Период: ${escapeHtml(text)} 📅\nОтличный интервал! Запускаем сканирование постов?`, 5500, 'smile', 'scan_wait_7');
                this.setMoodBadge('📅', 3000);
                return;
            }

            // 5. Переключение темы оформления
            const themeBtn = e.target.closest('#theme-toggle-btn');
            if (themeBtn) {
                this.say(`## Смена темы! 🌓✨\nВ свете звёзд или при дневном освещении — мой корпус сияет безупречно!`, 4500, 'smile', 'post_scan_10');
                this.spawnSparkles(6);
                return;
            }
        });
    }

    /* ---------------------------------------------------------------------
     * 11. Пасхалки и клики
     * ------------------------------------------------------------------- */
    triggerPokeSquish() {
        if (!this.bodyEl) return;
        this.bodyEl.classList.remove('is-poked');
        void this.bodyEl.offsetWidth;
        this.bodyEl.classList.add('is-poked');

        const pokeReplies = [
            `Ой! Щекотно! Мои квантовые датчики реагируют на каждый клик! 🤖`,
            `Тыкаешь? Двойной клик по мне — и откроется **полноценный чат с Космо!** 💬✨`,
            `Космо на страже ваших охватов! Чем помочь, друг? ✨`,
            `Два быстрых клика — и полетели писать посты и анализировать ВК! 💬🚀`,
            `Я заряжен на 100% позитива и готов штурмовать алгоритмы ВК! ⚡`
        ];
        const randomReply = pokeReplies[Math.floor(Math.random() * pokeReplies.length)];
        this.say(randomReply, 5500, 'smile');
        this.spawnSparkles(6);
    }

    triggerEasterBackflip(speak = true) {
        if (!this.bodyEl) return;
        this.bodyEl.classList.remove('is-backflipping');
        void this.bodyEl.offsetWidth;
        this.bodyEl.classList.add('is-backflipping');

        this.setState('smile', 1800);
        this.setMoodBadge('✨', 2500);
        this.spawnSparkles(14);
        if (speak) {
            this.say(`## Сальто в невесомости! 🚀✨\nТройной квантовый тулуп с приземлением на орбиту!`, 4000, 'smile');
        }

        setTimeout(() => {
            if (this.bodyEl) this.bodyEl.classList.remove('is-backflipping');
        }, 1200);
    }

    /* ---------------------------------------------------------------------
     * 12. Речь и диалоговое облачко (с Markdown и речью Бэлы)
     * ------------------------------------------------------------------- */
    say(text, duration = 6000, spriteMood = 'smile', voiceKey = null, isUserAction = false) {
        if (!this.isEnabled && !isUserAction) return;
        if (this.isInPresentation) return;
        if (!this.bubbleEl || !this.bubbleTextEl || this.isCollapsed || this.isIn3D) return;

        // Если пользователь закрыл облачко вручную, не открываем его самопроизвольно
        if (this.userDismissedBubble) {
            if (!isUserAction) return;
            this.userDismissedBubble = false;
        }

        // Если сейчас уже играет голосовая фраза, и это не действие пользователя, НЕ перебиваем речь!
        if (!isUserAction && this.isSpeakingAudio && this.currentAudio && !this.currentAudio.paused) {
            return;
        }

        this.bubbleTextEl.innerHTML = this.parseMarkdown(text);
        this.bubbleEl.classList.add('is-active');

        try {
            const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || 'visual-tab';
            this.updateDynamicChips(activeTab);
        } catch (e) {}

        if (spriteMood) {
            this.setState(spriteMood, duration);
        }

        clearTimeout(this.speechTimer);
        this.currentSpeechDuration = duration;

        const voiceAllowed = voiceKey && !this.isMuted && this.shouldSpeakVoice(voiceKey, isUserAction);
        if (voiceAllowed) {
            // пропускаем монету в playVoice: решение уже принято
            this._voiceGatePass = true;
            this.playVoice(voiceKey, isUserAction);
            // Если играет голос — задаём таймер не менее 7500 мс (или обновится из metadata)
            const safeVoiceDuration = Math.max(duration, 7500);
            this.currentSpeechDuration = safeVoiceDuration;
            this.speechTimer = setTimeout(() => {
                this.hideBubble(false);
            }, safeVoiceDuration);
        } else {
            if (duration > 0) {
                this.speechTimer = setTimeout(() => {
                    this.hideBubble(false);
                }, duration);
            }
        }
    }

    hideBubble(force = false) {
        if (!this.bubbleEl) return;
        // Защита от обрыва: если звук играет и это не принудительное закрытие, не закрываем
        if (!force && this.isSpeakingAudio && this.currentAudio && !this.currentAudio.paused) {
            return;
        }

        this.bubbleEl.classList.remove('is-active');
        clearTimeout(this.speechTimer);
        this.stopVoice(force);
    }

    setState(state, autoResetMs = 0) {
        if (!this.container || !this.spriteImg) return;
        const emotionChanged = this.currentState !== state;
        this.currentState = state;
        this.container.setAttribute('data-state', state);

        if (SPRITES[state]) {
            this.spriteImg.src = SPRITES[state];
        }
        if (this.bubbleEmoEl) {
            this.bubbleEmoEl.textContent = BUBBLE_EMO[state] || '🤖';
        }

        // Пружинный «поп» спрайта при каждой смене эмоции
        if (emotionChanged && state !== 'idle') {
            this.spriteImg.classList.remove('emotion-pop');
            void this.spriteImg.offsetWidth;
            this.spriteImg.classList.add('emotion-pop');
        }

        if (MOOD_EMOJIS[state] !== undefined) {
            this.setMoodBadge(MOOD_EMOJIS[state], autoResetMs);
        }

        clearTimeout(this.stateResetTimer);
        if (autoResetMs > 0 && state !== 'idle' && state !== 'sleep') {
            this.stateResetTimer = setTimeout(() => {
                if (this.currentState === state && !this.isSleeping) {
                    this.setState('idle');
                }
            }, autoResetMs);
        }
    }

    setMoodBadge(emoji, duration = 3000) {
        if (!this.moodBadgeEl) return;
        this.moodBadgeEl.textContent = emoji || '';
        this.moodBadgeEl.classList.toggle('is-visible', Boolean(emoji));

        clearTimeout(this.badgeResetTimer);
        if (duration > 0 && emoji) {
            this.badgeResetTimer = setTimeout(() => {
                if (this.moodBadgeEl) {
                    this.moodBadgeEl.classList.remove('is-visible');
                    this.moodBadgeEl.textContent = '';
                }
            }, duration);
        }
    }

    /* Реквизит 20 активностей: создаётся один раз, CSS показывает его по [data-activity] */
    buildActivityProps() {
        if (!this.propsLayerEl || this.propsLayerEl.childElementCount > 0) return;
        const layer = this.propsLayerEl;

        const tablet = document.createElement('div');
        tablet.className = 'mascot-holo-tablet';
        const bars = document.createElement('div');
        bars.className = 'holo-tablet-bars';
        bars.innerHTML = '<span></span><span></span><span></span><span></span>';
        tablet.appendChild(bars);
        layer.appendChild(tablet);

        const cone = document.createElement('div');
        cone.className = 'mascot-scan-cone';
        layer.appendChild(cone);

        const magnifier = document.createElement('div');
        magnifier.className = 'mascot-holo-magnifier';
        layer.appendChild(magnifier);

        const cloth = document.createElement('div');
        cloth.className = 'mascot-wipe-cloth';
        layer.appendChild(cloth);

        const drink = document.createElement('div');
        drink.className = 'mascot-drink-box';
        const straw = document.createElement('div');
        straw.className = 'mascot-drink-straw';
        drink.appendChild(straw);
        layer.appendChild(drink);

        const laser = document.createElement('div');
        laser.className = 'mascot-laser-dot';
        layer.appendChild(laser);

        const orbit = document.createElement('div');
        orbit.className = 'mascot-orbit-stars';
        orbit.textContent = '💫⭐💫';
        layer.appendChild(orbit);

        const telescope = document.createElement('div');
        telescope.className = 'mascot-telescope';
        layer.appendChild(telescope);

        const crown = document.createElement('div');
        crown.className = 'mascot-guru-crown';
        crown.textContent = '👑';
        layer.appendChild(crown);
    }

    /* Шок-волна и пыль при приземлении после броска/падения */
    spawnLandingFx() {
        if (!this.fxLayerEl) return;
        const ring = document.createElement('div');
        ring.className = 'mascot-landing-ring';
        this.fxLayerEl.appendChild(ring);
        setTimeout(() => ring.remove(), 650);

        for (let i = 0; i < 6; i++) {
            const dust = document.createElement('div');
            dust.className = 'mascot-landing-dust';
            dust.style.setProperty('--ddx', `${(Math.random() * 90 - 45).toFixed(0)}px`);
            dust.style.animationDelay = `${(Math.random() * 0.08).toFixed(2)}s`;
            this.fxLayerEl.appendChild(dust);
            setTimeout(() => dust.remove(), 720);
        }
    }

    spawnSparkles(count = 6) {
        if (!this.particlesLayerEl) return;
        for (let i = 0; i < count; i++) {
            const sp = document.createElement('div');
            sp.className = 'mascot-sparkle';
            const size = 5 + Math.random() * 8;
            sp.style.width = `${size}px`;
            sp.style.height = `${size}px`;
            sp.style.left = `${20 + Math.random() * 60}%`;
            sp.style.top = `${20 + Math.random() * 60}%`;
            // Вектор разлёта для keyframe sparkleFlyOut (без них искры не анимируются)
            sp.style.setProperty('--dx', `${(Math.random() * 120 - 60).toFixed(0)}px`);
            sp.style.setProperty('--dy', `${(-30 - Math.random() * 70).toFixed(0)}px`);
            sp.style.setProperty('--rot', `${(Math.random() * 360 - 180).toFixed(0)}deg`);
            this.particlesLayerEl.appendChild(sp);

            setTimeout(() => sp.remove(), 800);
        }
    }

    /* ---------------------------------------------------------------------
     * 13. Сверхэкономный ИИ для Космо (<45 токенов, кэш Map) + Знание всей статистики!
     * ------------------------------------------------------------------- */
    async askAiThrifty(userQuestion) {
        if (!userQuestion || this.isAiLoading) return;

        const now = Date.now();
        if (now - this.lastAiQueryTime < this.aiQueryCooldownMs) {
            const waitSec = Math.ceil((this.aiQueryCooldownMs - (now - this.lastAiQueryTime)) / 1000);
            this.say(`Погоди \`${waitSec} сек\`, мои квантовые нейроны ещё остывают! ⏳`, 4000, 'yawn');
            return;
        }

        // Ключ кэша включает сигнатуру статистики: после нового скана ответы обновятся.
        // totalViews в сигнатуре — иначе скан с тем же числом постов, но другими цифрами,
        // получит устаревший текст с прежними показателями
        const stats = this.getLiveScanStats();
        const statsSig = stats && stats.count > 0
            ? `${stats.count}_${stats.totalViews || 0}_${stats.topByViews?.name || ''}_${stats.topByViews?.views || 0}`
            : 'noscan';
        const normalizedKey = `${userQuestion.toLowerCase().trim()}||${statsSig}`;
        if (this.aiResponseCache.has(normalizedKey)) {
            const cached = this.aiResponseCache.get(normalizedKey);
            this.say(`Уже отвечал на это! Полный ответ — в окне по центру 💡`, 5000, 'smile');
            this.showCosmoModal('Ответ Космо 💡', cached);
            this.spawnSparkles(8);
            return;
        }
        // Ограничение размера кэша (не более 40 записей)
        if (this.aiResponseCache.size >= 40) {
            const firstKey = this.aiResponseCache.keys().next().value;
            this.aiResponseCache.delete(firstKey);
        }

        this.isAiLoading = true;
        this.lastAiQueryTime = now;
        this.setState('thinking');
        this.setMoodBadge('⚡', 15000);
        this.say(`## Анализирую страницу... ⚡\nКвантовый процессор обрабатывает данные и статистику!`, 10000, 'thinking', 'scan_wait_7');

        try {
            const pageCtx = this.buildAiPageContext();
            const systemPrompt = `Ты — Космо, робот-маскот AURORA, величайший SMM-гуру галактики ВКонтакте.
ПРАВИЛА ОТВЕТА:
1. Пиши безукоризненно грамотно, соблюдая все правила русской орфографии и пунктуации (по академическим правилам Дитмара Розенталя). Никаких грамматических или орфографических ошибок, дефисы и тире на своих местах.
2. Не используй штампы и клише (не пиши «Мой вердикт»).
3. Ты добрый, озорной, любишь ехидно шутить над ошибками в библиотечных пабликах (сорок хештегов, посты в 4 утра, посты без картинок, слабый ER), но даёшь меткие практические советы.
4. Текущий контекст страницы: ${pageCtx}.
5. Отвечай кратко (2-3 предложения, до 35 слов, 1-2 эмодзи), дерзко, весело, опираясь на реальные цифры и открытую вкладку!`;

            // Память диалога: последние реплики уходят в Mistral, чтобы Космо
            // понимал уточняющие вопросы («а теперь сравни со вторым местом»)
            const sanitizeStr = (s) => {
                if (typeof s !== 'string') return '';
                return s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
                        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
            };

            const history = this.aiConversationMemory.slice(-4).map(h => ({
                role: h.role,
                content: sanitizeStr(h.content)
            }));

            const payloadObj = {
                messages: [
                    { role: 'system', content: sanitizeStr(systemPrompt) },
                    ...history,
                    { role: 'user', content: sanitizeStr(userQuestion) }
                ],
                max_tokens: 350,
                temperature: 0.75
            };
            const payloadJson = JSON.stringify(payloadObj);

            let response = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                signal: aiFetchSignal(60000),
                body: payloadJson
            });

            if (!response.ok) {
                // Резервный формат application/x-www-form-urlencoded
                const bodyParams = new URLSearchParams();
                bodyParams.append('data', payloadJson);
                response = await fetch(AI_PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                    signal: aiFetchSignal(60000),
                    body: bodyParams.toString()
                });
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const parsed = this.parseAiChoice(data);
            const reply = parsed.text || 'Умная лента любит смелых! Делай упор на яркие фото и искренние заголовки! ✨';

            this.aiResponseCache.set(normalizedKey, reply);

            this.aiConversationMemory.push({ role: 'user', content: userQuestion });
            this.aiConversationMemory.push({ role: 'assistant', content: reply });
            if (this.aiConversationMemory.length > 8) {
                this.aiConversationMemory = this.aiConversationMemory.slice(-8);
            }

            // Подпись источника данных: пользователь видит, откуда цифры
            const sourceLabel = this.lastScanTime
                ? `\n\n\`📊 Источник: сканирование ${new Date(this.lastScanTime).toLocaleString('ru-RU')}\``
                : '';

            const truncNote = parsed.truncated ? this.truncationNote() : '';
            this.say(`Готово! Полный ответ — в окне по центру экрана 💡`, 6000, 'smile', null);
            this.showCosmoModal('Ответ Космо 💡', `${reply}${truncNote}${sourceLabel}`);

            // Озвучиваем реальный текст ответа голосом Бэлы (TTS);
            // при недоступности синтеза — запасной записанный клип
            const spoken = await this.speakReplyViaTts(reply);
            if (!spoken) {
                const replyVoices = [
                    'surprise_1', 'surprise_2', 'surprise_3',
                    'sarcasm_1', 'sarcasm_2', 'sarcasm_3', 'sarcasm_4',
                    'critique_extra_1', 'critique_extra_2',
                    'critique_1', 'critique_2', 'critique_3', 'critique_4', 'critique_6',
                    'critique_7', 'critique_10', 'critique_11', 'critique_13', 'critique_15',
                    'critique_16', 'critique_17', 'critique_18', 'critique_20',
                    'critique_5', 'critique_9', 'critique_14', 'critique_19'
                ];
                const chosenVoice = replyVoices[Math.floor(Math.random() * replyVoices.length)];
                this.playVoice(chosenVoice);
            }
            this.setMoodBadge('💡', 5000);
            this.spawnSparkles(8);
        } catch (err) {
            console.warn('[Cosmo AI] Fallback on error:', err);
            const fallbackReply = COSMO_LOCAL_BANTER[Math.floor(Math.random() * COSMO_LOCAL_BANTER.length)];
            this.say(fallbackReply, 8000, 'smile');
        } finally {
            this.isAiLoading = false;
        }
    }

    /* ---------------------------------------------------------------------
     * 13a. РАБОЧИЙ ИНСТРУМЕНТАРИЙ КОСМО: контент, аналитика, экспорт
     * ------------------------------------------------------------------- */

    /* Озвучка реального текста ответа через TTS-прокси (голос Бэлы).
       Возвращает true, если аудио запущено, иначе нужен запасной клип. */
    async speakReplyViaTts(replyText) {
        if (this.isMuted) return false;
        try {
            // TTS-прокси сам чистит markdown/эмодзи и обрезает до 450 символов
            const plain = replyText
                .replace(/^##+\s*/gm, '')
                .replace(/[*_`#]/g, '')
                .trim();
            if (!plain) return false;

            const res = await fetch(TTS_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: aiFetchSignal(60000),
                body: JSON.stringify({ text: plain.slice(0, 450) })
            });
            if (!res.ok) return false;
            const data = await res.json();
            if (!data.audio_url && data.status !== 'success') return false;
            if (!data.audio_url) return false;

            // Проигрываем синтез, не трогая содержимое облачка
            // (внутри него уже показан ответ с кнопкой копирования)
            if (this.currentAudio) {
                try { this.currentAudio.pause(); } catch (e) {}
                this.currentAudio = null;
            }
            const audio = new Audio(this.resolveTtsAudioUrl(data.audio_url));
            audio.volume = 0.9;
            this.currentAudio = audio;
            this.isSpeakingAudio = true;
            this.bubbleEl?.classList.add('is-speaking');

            const cleanup = () => {
                this.isSpeakingAudio = false;
                this.bubbleEl?.classList.remove('is-speaking');
                this.currentAudio = null;
            };
            audio.onended = cleanup;
            audio.onerror = cleanup;
            audio.addEventListener('loadedmetadata', () => {
                if (audio.duration && !isNaN(audio.duration)) {
                    clearTimeout(this.speechTimer);
                    this.speechTimer = setTimeout(() => this.hideBubble(false), (audio.duration * 1000) + 2200);
                }
            });
            audio.play().catch(e => {
                console.debug('[Cosmo TTS] Playback blocked:', e.message);
                cleanup();
            });
            return true;
        } catch (e) {
            console.debug('[Cosmo TTS] Fallback:', e.message);
            return false;
        }
    }

    /* История сканов в localStorage + инсайт при сравнении с прошлым сканом */
    recordScanHistory() {
        const stats = this.getLiveScanStats();
        if (!stats || !stats.count) return;

        const entry = {
            ts: Date.now(),
            count: stats.count,
            totalViews: stats.totalViews || 0,
            totalLikes: stats.totalLikes || 0,
            topBranch: stats.topByViews?.name || '',
            topViews: stats.topByViews?.views || 0,
            query: (stats.query || '').trim().toLowerCase()
        };

        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('aurora_scan_history') || '[]');
        } catch (e) {}

        const prev = history[history.length - 1];
        if (prev && prev.ts !== entry.ts) {
            // Сравнивать сканы можно только при одинаковом запросе: год против недели
            // или «сказки» против «все посты» дают фейковые «просмотры упали на 90%»
            this.lastScanInsight = (prev.query || '') === entry.query
                ? this.buildScanInsight(prev, entry)
                : null;
        }

        history.push(entry);
        // Храним не более 20 сканов
        if (history.length > 20) history = history.slice(-20);
        try {
            localStorage.setItem('aurora_scan_history', JSON.stringify(history));
        } catch (e) {}
    }

    buildScanInsight(prev, current) {
        const days = Math.max(0, Math.round((current.ts - prev.ts) / 86400000));
        const period = days === 0 ? 'с прошлого скана' : `за ${days} дн.`;

        if (current.totalViews > 0 && prev.totalViews > 0) {
            const deltaPct = Math.round(((current.totalViews - prev.totalViews) / prev.totalViews) * 100);
            if (Math.abs(deltaPct) >= 10) {
                const dir = deltaPct > 0 ? 'выросли' : 'упали';
                return `Суммарные просмотры ${dir} на **${Math.abs(deltaPct)}%** ${period} (${formatViews(prev.totalViews)} → ${formatViews(current.totalViews)}). ${deltaPct > 0 ? 'Отличная динамика, продолжайте!' : 'Проверьте время публикации и заголовки!'}`;
            }
        }
        if (prev.topBranch && current.topBranch && prev.topBranch !== current.topBranch) {
            return `Смена лидера! ${period} на первое место вышел **«${current.topBranch}»**, сместив «${prev.topBranch}».`;
        }
        if (current.count !== prev.count) {
            const delta = current.count - prev.count;
            return `Найдено постов: **${current.count}** (в прошлый раз ${prev.count}, ${delta >= 0 ? '+' : ''}${delta}). Динамика публикаций ${delta >= 0 ? 'растёт' : 'снижается'}.`;
        }
        return `Показатели стабильны относительно прошлого скана. Стабильность — тоже результат!`;
    }

    /* Тренды подписчиков из data/subscribers.json (рост/отток) */
    subscribersTrendsSummary() {
        const snaps = this.subscribersData?.snapshots;
        if (!Array.isArray(snaps) || snaps.length < 2) return null;
        const timestamps = [...new Set(snaps.map(s => s.ts || 0))].sort((a, b) => a - b);
        if (timestamps.length < 2) return null;
        const [tOld, tNew] = [timestamps[timestamps.length - 2], timestamps[timestamps.length - 1]];
        const old = snaps.filter(s => s.ts === tOld);
        const fresh = snaps.filter(s => s.ts === tNew);
        const totalOld = old.reduce((a, s) => a + (s.members || 0), 0);
        const totalNew = fresh.reduce((a, s) => a + (s.members || 0), 0);
        const delta = totalNew - totalOld;
        const byBranch = fresh.map(s => {
            const o = old.find(x => (x.branch && x.branch === s.branch) || x.group_id === s.group_id);
            return { name: s.name || s.branch, delta: o ? (s.members || 0) - (o.members || 0) : 0 };
        });
        const worst = byBranch.reduce((m, b) => (!m || b.delta < m.delta ? b : m), null);
        const best = byBranch.reduce((m, b) => (!m || b.delta > m.delta ? b : m), null);
        return { totalNew, delta, worst, best };
    }

    /* Чип: ✍️ Напиши пост — черновик под конкретный филиал или сеть в целом */
    async generatePostDraft() {
        if (this.isAiLoading) return;
        this.isAiLoading = true;
        this.setState('thinking');
        this.setMoodBadge('✍️', 15000);
        this.say(`## Пишу черновик поста... ✍️⚡\nМистраль подбирает слова, а Космо следит за стилем!`, 8000, 'thinking', 'scan_wait_3', true);

        try {
            const branchFilter = window.__VK_APP__?.state?.activeBranchFilter;
            const info = branchFilter ? this.findBranchInfo(branchFilter) : null;
            const target = info
                ? `${info.branch_name} (${info.branch_num}, адрес: ${info.address})`
                : 'библиотечной сети города Владимира в целом';

            const systemPrompt = `Ты — опытный SMM-копирайтер библиотек. Напиши готовый черновик поста ВКонтакте для ${target}.
ТРЕБОВАНИЯ:
1. Тёплый, дружелюбный тон, без канцелярита.
2. Цепляющий заголовок в первой строке.
3. 4-7 строк текста с призывом к действию.
4. В конце — 4-5 релевантных хэштегов.
5. Предложи 2 альтернативных коротких заголовка отдельными строками в конце.
Формат: сначала заголовок, затем текст, затем хэштеги, затем строка «Альтернативные заголовки:» и два варианта. Без пояснений.`;

            const res = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: aiFetchSignal(90000),
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: 'Напиши черновик поста на актуальную тему для читателей (новинки книг, мероприятия, уют библиотеки — выбери сам).' }
                    ],
                    max_tokens: 1500,
                    temperature: 0.85
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const { text: draft, truncated } = this.parseAiChoice(data);
            if (!draft) throw new Error('Empty draft');

            this.lastGeneratedText = draft;
            this.say(`## Черновик готов! ✍️✨\nОткрываю предпросмотр — там можно скопировать!`, 7000, 'smile', 'post_scan_1', true);
            this.showCosmoModal('Черновик поста ✍️', truncated ? draft + this.truncationNote() : draft);
        } catch (e) {
            console.warn('[Cosmo] generatePostDraft error:', e);
            this.say(`Ой, синтезатор слов барахлит! Попробуй ещё раз чуть позже 🙈`, 7000, 'tired', 'disappoint_1', true);
        } finally {
            this.isAiLoading = false;
        }
    }

    /* Чип: 📅 Идеи недели — контент-план с учётом даты */
    async generateWeekIdeas() {
        if (this.isAiLoading) return;
        this.isAiLoading = true;
        this.setState('thinking');
        this.setMoodBadge('📅', 15000);
        this.say(`## Составляю план недели... 📅⚡`, 6000, 'thinking', 'scan_wait_5', true);

        try {
            const today = new Date();
            const dateStr = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
            const trends = this.subscribersTrendsSummary();
            const trendsNote = trends
                ? ` Динамика подписчиков: всего ${trends.totalNew} (${trends.delta >= 0 ? '+' : ''}${trends.delta} к прошлому снимку).`
                : '';

            const res = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: aiFetchSignal(90000),
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: `Ты — контент-стратег библиотечной сети. Сегодня ${dateStr}.${trendsNote} Составь подробный контент-план на ближайшие 7 дней для библиотек Владимира. Для каждого дня (все 7 подряд): заголовок дня жирным (**Понедельник**, **Вторник** и т.д.), тема поста (до 8 слов), формат (фото/видео/опрос/подборка/карточки) и одно предложение-описание, что именно делать. Форматируй в Markdown списком, без вступлений и заключений.` },
                        { role: 'user', content: 'Дай контент-план на все 7 дней этой недели для библиотек Владимира.' }
                    ],
                    max_tokens: 1500,
                    temperature: 0.8
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const { text: ideas, truncated } = this.parseAiChoice(data);
            if (!ideas) throw new Error('Empty ideas');

            this.lastGeneratedText = ideas;
            this.say(`## Контент-план недели готов! 📅✨\nОткрываю предпросмотр!`, 7000, 'smile', 'post_scan_2', true);
            this.showCosmoModal('Контент-план недели 📅', truncated ? ideas + this.truncationNote() : ideas);
        } catch (e) {
            console.warn('[Cosmo] generateWeekIdeas error:', e);
            this.say(`Календарь идей пока недоступен — попробуй ещё раз! 🗓️`, 7000, 'tired', 'disappoint_2', true);
        } finally {
            this.isAiLoading = false;
        }
    }

    /* Чип: #️⃣ Хэштег-советник — по реальным данным сканирования */
    suggestHashtags() {
        const stats = this.getLiveScanStats();
        if (!stats || !stats.count) {
            this.say(`Сначала запусти сканирование — мне нужны реальные посты, чтобы советовать теги! 🔍`, 7000, 'thinking', 'scan_wait_7', true);
            return;
        }
        // Топ хэштегов берём из аналитического снимка сканирования (buildAiSnapshot.topHashtags)
        let topTags = null;
        try {
            const raw = this.getAiSnapshot();
            if (raw) {
                const snap = typeof raw === 'string' ? JSON.parse(raw) : raw;
                if (Array.isArray(snap?.topHashtags)) topTags = snap.topHashtags;
            }
        } catch (e) { /* снимка нет — покажем общий совет */ }

        let msg = `## Хэштег-ревизия #️⃣`;
        if (topTags && topTags.length > 0) {
            const list = topTags.slice(0, 6).map(t => `**#${t.tag || t}** (${t.count || '?'})`).join(', ');
            msg += `\nСамые частые теги сети: ${list}.`;
            msg += `\n**Совет Космо:** оставь 3-5 релевантных тегов в конце поста. Больше — умная лента считает спамом!`;
        } else {
            msg += `\nВ этом скане топов тегов нет, но правило всегда одно: **3-5 точных тегов** лучше сорока общих!`;
            msg += `\nРабочая формула: тег города (#Владимир) + тег библиотеки + тема поста + формат (#афиша).`;
        }
        this.say(`Ревизия тегов готова! Подробности — в окне по центру #️⃣`, 6000, 'smile', 'critique_4', true);
        this.showCosmoModal('Хэштег-ревизия #️⃣', msg, msg.replace(/\*\*/g, '').replace(/^##\s+/m, ''));
        this.setMoodBadge('#️⃣', 5000);
    }

    /* Чип: 🩺 Диагноз отстающему — структурный разбор одного филиала */
    async diagnoseBranch() {
        const stats = this.getLiveScanStats();
        const branch = stats?.worstBranch;
        if (!stats || !stats.count || !branch) {
            this.say(`Диагноз ставить некому — запусти сканирование, и я найду отстающих! 🩺`, 7000, 'thinking', 'scan_wait_7', true);
            return;
        }
        if (this.isAiLoading) return;
        this.isAiLoading = true;
        this.setState('thinking');
        this.setMoodBadge('🩺', 15000);
        this.say(`## Ставлю диагноз: «${escapeHtml(branch.name)}» 🩺⚡\nАнализирую симптомы...`, 8000, 'thinking', 'scan_wait_6', true);

        try {
            const info = this.findBranchInfo(branch.name);
            const subsNote = this.subscribersTrendsSummary();
            // Полные метрики филиала: worstBranch приходит обогащённым из getLiveScanStats,
            // на всякий случай добираем из карты byBranch
            const full = (branch.likes !== undefined && branch.likes !== null) ? branch : (stats.byBranch?.[branch.name] || null);
            const fmt = (v) => (v === null || v === undefined) ? 'нет данных' : (Number(v) || 0).toLocaleString('ru-RU');
            const context = [
                `Филиал: ${branch.name}.`,
                `Найдено постов за период: ${branch.postsCount || 0}.`,
                `Просмотры: ${fmt(branch.views)}, лайки: ${fmt(full?.likes)}, комментарии: ${fmt(full?.comments)}, репосты: ${fmt(full?.reposts)}.`,
                full?.er != null
                    ? `ER по просмотрам: ${Number(full.er).toFixed(2)}%.`
                    : (branch.noViewsData ? 'Просмотры из API не получены — данных нет.' : 'ER: нет данных.'),
                info ? `Справка: ${info.branch_num}, адрес ${info.address}.` : '',
                subsNote ? `Подписчиков у сети всего: ${subsNote.totalNew}.` : ''
            ].filter(Boolean).join(' ');

            const res = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: aiFetchSignal(90000),
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'Ты — строгий, но доброжелательный SMM-аудитор библиотек. Проанализируй данные отстающего филиала и выдай: 1) краткий диагноз (1-2 предложения), 2) три вероятные причины слабых показателей, 3) три конкретных шага на ближайшую неделю. Пиши списком, без воды, опирайся только на данные.' },
                        { role: 'user', content: `Данные отстающего филиала: ${context}` }
                    ],
                    max_tokens: 1200,
                    temperature: 0.5
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const { text: diagnosis, truncated } = this.parseAiChoice(data);
            if (!diagnosis) throw new Error('Empty diagnosis');

            this.say(`Диагноз готов! Полный разбор — в окне по центру 🩺`, 6000, 'smile', null, true);
            this.showCosmoModal(`Диагноз: «${branch.name}» 🩺`, `## Диагноз: «${branch.name}» 🩺\n${diagnosis}${truncated ? this.truncationNote() : ''}`);
            await this.speakReplyViaTts(`Диагноз готов. ${diagnosis.slice(0, 300)}`);
        } catch (e) {
            console.warn('[Cosmo] diagnoseBranch error:', e);
            this.say(`Мой стетоскоп сломался! Попробуй диагноз ещё раз 🙈`, 7000, 'tired', 'disappoint_3', true);
        } finally {
            this.isAiLoading = false;
        }
    }

    /* Чип: 📋 Экспорт отчёта в буфер обмена */
    copyReportToClipboard() {
        const stats = this.getLiveScanStats();
        if (!stats || !stats.count) {
            this.say(`Отчёт пуст! Сначала сканирование — потом бумажки 📋`, 6500, 'tired', 'scan_wait_7', true);
            return;
        }
        const lines = [
            `ОТЧЁТ AURORA — сканирование от ${new Date().toLocaleString('ru-RU')}`,
            `Постов найдено: ${stats.count}`,
            `Просмотры: ${stats.totalViews}, лайки: ${stats.totalLikes}, комментарии: ${stats.totalComments}, репосты: ${stats.totalReposts}`,
            stats.avgEr != null ? `Средний ER: ${stats.avgEr}%` : '',
            `Лидер по просмотрам: ${stats.topByViews?.name || '—'} (${formatViews(stats.topByViews?.views || 0)})`,
            stats.topByEr ? `Лидер по вовлечённости: ${stats.topByEr.name} (ER ${stats.topByEr.er}%)` : '',
            stats.worstBranch ? `Требует внимания: ${stats.worstBranch.name} (${formatViews(stats.worstBranch.views || 0)} просмотров)` : ''
        ].filter(Boolean);

        const report = lines.join('\n');
        this.copyToClipboard(report);
        const mdReport = report.split('\n').map((l, i) => (i === 0 ? `## ${l}` : l)).join('\n\n');
        this.say(`Отчёт скопирован и открыт в окне по центру 📋✅`, 6000, 'smile', 'post_scan_9', true);
        this.showCosmoModal('Отчёт о сканировании 📋', mdReport, report);
    }

    /* Кнопка копирования сгенерированного текста из облачка */
    copyBubbleText() {
        const text = this.lastGeneratedText || this.bubbleTextEl?.innerText || '';
        if (!text) return;
        this.copyToClipboard(text);
        this.say(`Готово! Текст в буфере обмена 📋✨`, 5000, 'smile', 'post_scan_10', true);
    }

    copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).catch(() => this.fallbackCopy(text));
            } else {
                this.fallbackCopy(text);
            }
        } catch (e) {
            this.fallbackCopy(text);
        }
    }

    fallbackCopy(text) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        } catch (e) {}
    }

    /* Разбор ответа ИИ: текст и признак обрыва по лимиту токенов */
    parseAiChoice(data) {
        const choice = data?.choices?.[0];
        const text = (choice?.message?.content || data?.reply || '').trim();
        const truncated = choice?.finish_reason === 'length';
        return { text, truncated };
    }

    truncationNote() {
        return `\n\n*⚠️ Ответ оборвался на лимите токенов — попроси Космо повторить или задай вопрос короче!*`;
    }

    /* Абсолютный путь к синтезированному аудио: относительное «?audio=хэш»
       резолвится от адреса TTS-прокси (работает в любой поддиректории сайта) */
    resolveTtsAudioUrl(url) {
        try {
            return new URL(url, TTS_PROXY_URL).href;
        } catch (e) {
            return url;
        }
    }

    /* ---------------------------------------------------------------------
     * Модальное окно предпросмотра: отформатированный Markdown-текст от ИИ,
     * адаптивное, с кнопками «Скопировать» и «Закрыть»
     * ------------------------------------------------------------------- */
    showCosmoModal(title, rawText, copyText = null) {
        if (!rawText) return;
        const textToCopy = copyText || rawText;
        this.closeCosmoModal(true);

        const overlay = document.createElement('div');
        overlay.className = 'cosmo-modal-overlay';
        overlay.setAttribute('data-cosmo-modal', '');

        overlay.innerHTML = `
            <div class="cosmo-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
                <div class="cosmo-modal-header">
                    <span class="cosmo-modal-title">${escapeHtml(title)}</span>
                    <button type="button" class="cosmo-modal-close" data-cosmo-modal-close title="Закрыть">&times;</button>
                </div>
                <div class="cosmo-modal-body">${this.parseMarkdown(rawText)}</div>
                <div class="cosmo-modal-footer">
                    <button type="button" class="mascot-action-btn" data-cosmo-modal-copy>📋 Скопировать</button>
                    <button type="button" class="mascot-action-btn btn-secondary" data-cosmo-modal-close>Закрыть</button>
                </div>
            </div>
        `;

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeCosmoModal();
        });
        overlay.querySelectorAll('[data-cosmo-modal-close]').forEach(btn => {
            btn.addEventListener('click', () => this.closeCosmoModal());
        });

        const copyBtn = overlay.querySelector('[data-cosmo-modal-copy]');
        copyBtn.addEventListener('click', () => {
            this.copyToClipboard(textToCopy);
            copyBtn.textContent = 'Скопировано! ✅';
            copyBtn.classList.add('is-copied');
            setTimeout(() => {
                copyBtn.textContent = '📋 Скопировать';
                copyBtn.classList.remove('is-copied');
            }, 2200);
        });

        this.modalEscHandler = (e) => {
            if (e.key === 'Escape') this.closeCosmoModal();
        };
        document.addEventListener('keydown', this.modalEscHandler);

        document.body.appendChild(overlay);
        this.modalOverlayEl = overlay;
        requestAnimationFrame(() => overlay.classList.add('is-open'));
    }

    closeCosmoModal(silent = false) {
        if (this.modalEscHandler) {
            document.removeEventListener('keydown', this.modalEscHandler);
            this.modalEscHandler = null;
        }
        if (!this.modalOverlayEl) return;
        const overlay = this.modalOverlayEl;
        this.modalOverlayEl = null;
        if (silent) {
            overlay.remove();
            return;
        }
        overlay.classList.remove('is-open');
        overlay.classList.add('is-closing');
        setTimeout(() => overlay.remove(), 260);
    }

    /* ---------------------------------------------------------------------
     * Интерактивный чат с Космо (двойной клик по маскоту)
     * ------------------------------------------------------------------- */
    openCosmoChat(initialQuery = '') {
        if (this.isSleeping) {
            this.wakeUp();
        }
        this.hideBubble();
        this.triggerEasterBackflip(false);
        if (!this.chatModal) {
            this.chatModal = new CosmoChatModal({ mascot: this });
        }
        this.chatModal.open(initialQuery);
        this.startChatCompanionLoop();
    }

    openShelfRecommendation(genreId = 'universal', branchCode = 'cgb') {
        if (this.isSleeping) {
            this.wakeUp();
        }
        this.hideBubble();
        this.triggerEasterBackflip(false);
        if (!this.chatModal) {
            this.chatModal = new CosmoChatModal({ mascot: this });
        }
        this.chatModal.openShelfRecommendation(genreId, branchCode);
        this.startChatCompanionLoop();
    }

    closeCosmoChat() {
        this.stopChatCompanionLoop();
        if (this.chatModal) {
            this.chatModal.close();
        }
    }

    startChatCompanionLoop() {
        this.stopChatCompanionLoop();
        const companionActivities = [
            'tablet_study', 'antenna_tune', 'laser_pointer',
            'excited_wave', 'magnifier_scan', 'flex_muscles',
            'joy_dance', 'smm_guru_pose', 'check_watch', 'telescope_look'
        ];

        const scheduleCompanionAct = () => {
            if (!this.chatModal || !this.chatModal.isOpen) return;
            const delay = 11000 + Math.random() * 9000; // каждые 11-20 сек активные действия
            this.chatCompanionTimer = setTimeout(() => {
                if (!this.chatModal || !this.chatModal.isOpen) return;
                if (!this.isPerformingActivity && !this.isDragging && !this.isSpeakingAudio) {
                    const act = companionActivities[Math.floor(Math.random() * companionActivities.length)];
                    this.playActivity(act, false); // анимация маскота без прерывания текста чата
                    this.spawnSparkles(4);
                }
                scheduleCompanionAct();
            }, delay);
        };
        scheduleCompanionAct();
    }

    stopChatCompanionLoop() {
        if (this.chatCompanionTimer) {
            clearTimeout(this.chatCompanionTimer);
            this.chatCompanionTimer = null;
        }
    }

    /* Напоминания: «⏰ Напомни через час» с сохранением между сессиями */
    setReminder(minutes = 60, text = 'Проверь комментарии и опубликуй пост!') {
        const reminder = { at: Date.now() + minutes * 60000, text };
        let list = [];
        try {
            list = JSON.parse(localStorage.getItem('aurora_cosmo_reminders') || '[]');
        } catch (e) {}
        list.push(reminder);
        try {
            localStorage.setItem('aurora_cosmo_reminders', JSON.stringify(list));
        } catch (e) {}

        const timer = setTimeout(() => this.fireReminder(reminder), minutes * 60000);
        this.reminderTimers.push(timer);
        this.say(`## Напоминание принято! ⏰\nЧерез **${minutes} мин** напомню: ${escapeHtml(text)}`, 7000, 'smile', null, true);
        this.setMoodBadge('⏰', 4000);
    }

    scheduleReminders() {
        let list = [];
        try {
            list = JSON.parse(localStorage.getItem('aurora_cosmo_reminders') || '[]');
        } catch (e) {}
        const now = Date.now();
        const active = [];
        list.forEach(r => {
            if (r.at <= now) {
                // Просроченное: напомнить сразу после загрузки
                setTimeout(() => this.fireReminder(r, true), 4000);
            } else {
                const timer = setTimeout(() => this.fireReminder(r), r.at - now);
                this.reminderTimers.push(timer);
                active.push(r);
            }
        });
        try {
            localStorage.setItem('aurora_cosmo_reminders', JSON.stringify(active));
        } catch (e) {}
    }

    fireReminder(reminder, late = false) {
        try {
            const list = JSON.parse(localStorage.getItem('aurora_cosmo_reminders') || '[]');
            localStorage.setItem('aurora_cosmo_reminders', JSON.stringify(list.filter(r => r.at !== reminder.at)));
        } catch (e) {}
        if (this.isCollapsed) this.expand?.();
        this.wakeUp?.();
        this.say(`## ⏰ Напоминание от Космо!\n${late ? '(чуть с опозданием — я спал) ' : ''}${escapeHtml(reminder.text)}`, 10000, 'smile', 'high_altitude_1', true);
        this.setMoodBadge('⏰', 6000);
        this.spawnSparkles(8);
    }

    /* Режим «работа / развлечение»: в рабочем Космо молчит сам и только анализирует */
    toggleWorkMode() {
        this.isWorkMode = !this.isWorkMode;
        try {
            localStorage.setItem('aurora_cosmo_work_mode', this.isWorkMode ? '1' : '0');
        } catch (e) {}
        if (this.modeToggleBtn) {
            this.modeToggleBtn.textContent = this.isWorkMode ? '💼' : '🎭';
            this.modeToggleBtn.classList.toggle('is-work', this.isWorkMode);
        }
        if (this.statusTitleEl) {
            this.statusTitleEl.textContent = this.isWorkMode ? 'КОСМО • АНАЛИТИК' : 'КОСМО • SMM-ГУРУ';
        }
        if (this.isWorkMode) {
            this.say(`## Рабочий режим активирован 💼\nБолтовня отключена — только инсайты по делу. Вернуть шутки? Жми 🎭!`, 8000, 'thinking', null, true);
        } else {
            this.say(`## Режим развлечений снова в эфире! 🎭🎉`, 6000, 'smile', 'post_scan_1', true);
        }
    }

    /* ---------------------------------------------------------------------
     * 14. Хуки сканирования стены (9 шуток ожидания, критика и похвала)
     * ------------------------------------------------------------------- */
    onScanStart(query = '') {
        if (!this.isEnabled) return;
        this.setState('thinking', 15000);
        this.setMoodBadge('🔍', 8000);
        this.usedScanWaitJokes.clear();

        // 9 мультяшных шуток во время ожидания сканирования
        const scanJokes = [
            { k: 'scan_wait_1', t: '## Запуск сканирования! 🚀\nПодключаюсь к квантовым серверам ВКонтакте! Держитесь крепче!' },
            { k: 'scan_wait_2', t: '## Сканирую ленту! ⚡\nИщу самые виральные библиотечные посты! Алгоритмы в шоке!' },
            { k: 'scan_wait_3', t: '## Почти готово! ✨\nМои квантовые алгоритмы уже пересчитывают каждый ваш лайк!' },
            { k: 'scan_wait_4', t: '## Шуршу терабайтами! 📚\nНадеюсь, вы не забыли прикрепить картинку к каждому посту?' },
            { k: 'scan_wait_5', t: '## Борьба с лентой! 🤖\nУмная лента сопротивляется, но куда ей против моего процессора!' },
            { k: 'scan_wait_6', t: '## Серверы в Питере! 📡\nОпрашиваю серверы... Сказали, что владимирские библиотекари лучшие!' },
            { k: 'scan_wait_7', t: '## Оптические датчики! 🔍\nСтолько постов про книги я не видел со времён Александрийской библиотеки!' },
            { k: 'scan_wait_8', t: '## Обработка реакций! ❤️\nОбрабатываю лайки... Эй, кто поставил грустный смайлик на анонс?' },
            { k: 'scan_wait_9', t: '## Связь с орбитой! 🛰️\nКосмонавты на МКС передают привет и просят побольше фантастики!' }
        ];

        // Первая реплика при старте
        const firstJoke = scanJokes[0];
        this.usedScanWaitJokes.add(firstJoke.k);
        this.say(firstJoke.t, 5500, 'thinking', firstJoke.k);

        // Периодический таймер шуток во время длительного сканирования (каждые 6.5 секунд)
        clearInterval(this.scanBanterTimer);
        this.scanBanterTimer = setInterval(() => {
            if (!this.container) return;
            const available = scanJokes.filter(j => !this.usedScanWaitJokes.has(j.k));
            if (available.length > 0) {
                const joke = available[Math.floor(Math.random() * available.length)];
                this.usedScanWaitJokes.add(joke.k);
                this.say(joke.t, 5000, 'smile', joke.k);
                this.spawnSparkles(5);
            }
        }, 20000); // ×1/0.8 от 16 сек — реже болтаем во время сканирования
    }

    onScanProgress(percent, count) {
        if (!this.isEnabled) return;
        // Дополнительные отметки на ключевых рубежах прогресса
        if (percent >= 45 && percent < 55 && !this.usedScanWaitJokes.has('mid_progress')) {
            this.usedScanWaitJokes.add('mid_progress');
            this.say(`## Экватор пройден: ${percent}%! 📈\nСобрано уже **${count}** постов. Анализирую охваты!`, 4500, 'smile', 'scan_wait_4');
        } else if (percent >= 85 && !this.usedScanWaitJokes.has('near_finish')) {
            this.usedScanWaitJokes.add('near_finish');
            this.say(`## Финишная прямая: ${percent}%! 🏁\nСверяю результаты и готовлю **острый разбор полётов!**`, 4500, 'smile', 'scan_wait_3');
        }
    }

    onScanSuccess(data) {
        if (!this.isEnabled) return;
        clearInterval(this.scanBanterTimer);
        this.scanBanterTimer = null;
        this.lastScanStats = data;
        window.__AURORA_LAST_SCAN_SNAPSHOT__ = data;

        const count = data.count || 0;
        const top = data.topBranch || (data.topByViews?.name || '');

        let msg = `## Сканирование завершено! 🏆\nСобрано **${count}** постов.`;
        if (top) {
            msg += ` Лидер по просмотрам: **${escapeHtml(top)}**!`;
        }
        msg += `\nНажми **«Кто лидер?»** или послушай мою рецензию!`;

        // Пул из 20 критических замечаний, 10 пост-скан фраз и 12 новых реакций
        const critiqueClips = [
            'surprise_1', 'surprise_2', 'surprise_3',
            'sarcasm_1', 'sarcasm_2', 'sarcasm_3', 'sarcasm_4',
            'critique_extra_1', 'critique_extra_2',
            'critique_1', 'critique_2', 'critique_3', 'critique_4', 'critique_5',
            'critique_6', 'critique_7', 'critique_8', 'critique_9', 'critique_10',
            'critique_11', 'critique_12', 'critique_13', 'critique_14', 'critique_15',
            'critique_16', 'critique_17', 'critique_18', 'critique_19', 'critique_20',
            'post_scan_1', 'post_scan_2', 'post_scan_3', 'post_scan_4', 'post_scan_5'
        ];
        const chosenVoice = critiqueClips[Math.floor(Math.random() * critiqueClips.length)];

        this.lastScanTime = Date.now();

        this.say(msg, 12000, 'smile', chosenVoice, true);
        this.setMoodBadge('🏆', 4000);
        this.spawnSparkles(10);

        // Проактивная аналитика: сравнение с прошлым сканом → точный инсайт
        this.recordScanHistory();
        if (this.lastScanInsight) {
            const insight = this.lastScanInsight;
            this.lastScanInsight = null;
            setTimeout(() => {
                if (!this.isCollapsed && !this.isIn3D && !this.isSleeping) {
                    this.say(`## Инсайт Космо 🔎\n${insight}`, 11000, 'thinking', 'critique_extra_1', true);
                    this.setMoodBadge('🔎', 5000);
                }
            }, this.isWorkMode ? 1500 : 6500);
        }
    }

    onScanComplete(count, topBranch, stats = null) {
        if (!this.isEnabled) return;
        clearInterval(this.scanBanterTimer);
        this.scanBanterTimer = null;
        this.onScanSuccess({ count, topBranch, stats });
    }

    onScanEmpty(query = '') {
        if (!this.isEnabled) return;
        clearInterval(this.scanBanterTimer);
        this.scanBanterTimer = null;
        this.lastScanStats = null;
        window.__AURORA_LAST_SCAN_SNAPSHOT__ = null;
        // Итог скана — важный статус: показываем всегда, даже поверх играющего аудио
        this.say(
            query
                ? `По запросу **«${escapeHtml(query)}»** ничего не нашлось. Попробуй изменить слово!`
                : 'За указанный период постов не обнаружено. Попробуй выбрать другой год или месяц!',
            9000,
            'tired',
            null,
            true
        );
    }

    onScanCancel() {
        if (!this.isEnabled) return;
        clearInterval(this.scanBanterTimer);
        this.scanBanterTimer = null;
        this.say(
            `## Поиск остановлен! 🛑\nСканирование прервано. Открываю собранные материалы!`,
            8000,
            'tired',
            null,
            true
        );
        this.setState('tired', 6000);
        this.setMoodBadge('🛑', 4000);
    }

    onScanError() {
        if (!this.isEnabled) return;
        clearInterval(this.scanBanterTimer);
        this.scanBanterTimer = null;
        this.say(
            `## Ошибка связи! ⚠️\nСбой подключения к ВКонтакте. Проверь токен или интернет!`,
            10000,
            'angry',
            null,
            true
        );
        this.setState('angry', 8000);
        this.setMoodBadge('💢', 6000);
    }

    onScanReset() {
        if (!this.isEnabled) return;
        clearInterval(this.scanBanterTimer);
        this.scanBanterTimer = null;
        this.lastScanStats = null;
        window.__AURORA_LAST_SCAN_SNAPSHOT__ = null;
    }

    /* ---------------------------------------------------------------------
     * 15. Проактивная жизнь (Критика, сарказм, язвительные подколы и советы)
     * ------------------------------------------------------------------- */
    startProactiveChatter() {
        if (!this.isEnabled) return;
        clearInterval(this.proactiveTimer);
        this.proactiveTimer = setInterval(() => {
            if (this.isSleeping || this.isIn3D || this.isCollapsed || this.isAiLoading || this.isPerformingActivity || this.isDragging || this.isPatrolling || this.isSpeakingAudio || (this.currentAudio && !this.currentAudio.paused)) return;

            // Рабочий режим: без болтовни — только короткий факт по данным
            if (this.isWorkMode) {
                const ws = this.getLiveScanStats();
                if (ws && ws.count > 0 && ws.topByViews) {
                    this.say(`Лидер: **${escapeHtml(ws.topByViews.name)}** — ${formatViews(ws.topByViews.views)} просмотров. Всего постов: ${ws.count}. 💼`, 6000, 'idle');
                }
                return;
            }

            const stats = this.getLiveScanStats();

            // Если есть данные сканирования — выдаем сочные критические замечания голосом Бэлы
            if (stats && stats.count > 0) {
                const critiquePhrases = [
                    { k: 'surprise_1', t: '## Ого! Вот это поворот! 🔭✨\nЯ даже свои оптические сенсоры протёр, не верю глазам! Вот это цифры!' },
                    { k: 'surprise_2', t: '## Невероятно! 🚀⚡\nЭтот пост пробил стратосферу рекомендаций! Мои квантовые датчики зашкаливают!' },
                    { k: 'surprise_3', t: '## Вот это да! 🛋️✨\nОказывается, если выложить пост вовремя — читатели действительно приходят! Чудеса!' },
                    { k: 'disappoint_1', t: '## Эх, ну как же так... 🥺💔\nОпять картинка смазанная, а текст длиннее Войны и Мира. Умная лента плачет!' },
                    { k: 'disappoint_2', t: '## Опять унылый репост 🔄🥱\nШеф, ну мы же договаривались делать авторский контент, а не чужой копировать!' },
                    { k: 'disappoint_3', t: '## Тишина в комментариях 🦗💔\nДаже сверчки постеснялись стрекотать под этим постом. Грусть-тоска!' },
                    { k: 'critique_extra_1', t: '## Скучный заголовок 😴📝\nМысль отличная, но заголовок такой скучный, что я чуть в спящий режим не ушёл!' },
                    { k: 'critique_extra_2', t: '## Пять хештегов #️⃣🤨\nПять тегов и ни одного призыва к действию! Кто будет комментировать, Пушкин?' },
                    { k: 'sarcasm_1', t: '## Стратегия века! 🦉⏰\nВыложить пост в три часа ночи в понедельник! Читатели точно оценят!' },
                    { k: 'sarcasm_2', t: '## Алгоритм виноват? 🤖🙄\nКонечно-конечно, умная лента во всём виновата! А не пятнадцать восклицательных знаков!' },
                    { k: 'sarcasm_3', t: '## Репост прошлогоднего анонса 🔄🤦‍♂️\nГениально! Давайте ещё разок репостнем, вдруг кто-то забыл, как мы ленимся!' },
                    { k: 'sarcasm_4', t: '## Держите меня семеро! 💥💅\nС такой активностью мы обгоним сообщество любителей тишины!' },
                    { k: 'critique_1', t: '## Взгляд на комментарии 💬\nПосмотрел я на комментарии... Читатели ставят лайк и молча убегают!' },
                    { k: 'critique_2', t: '## Лидер филиалов 👑\nЛидер филиалов забрал почти все просмотры! Остальным пора устроить мозговой штурм!' },
                    { k: 'critique_3', t: '## Пост без картинки?! 🖼️\nОдин пост без картинки? В двадцать первом веке?! Умная лента рыдает в уголке!' },
                    { k: 'critique_4', t: '## Сорок хештегов #️⃣\nСорок хештегов в конце текста, а охват не вырос... Меньше тегов, больше смысла!' },
                    { k: 'critique_5', t: '## Срочный анонс ⏳\nВыложили анонс за два часа до начала? Спонтанность — второе имя библиотеки!' },
                    { k: 'critique_6', t: '## Пульс контента 💔\nВовлечённость нулевая, пульс контента едва прощупывается... Срочно котиков в ленту!' },
                    { k: 'critique_7', t: '## Стена текста 📜\nЭтот длинный текст не читал даже тот, кто его писал! Разделяй абзацы!' },
                    { k: 'critique_8', t: '## Репост репоста 🔄\nО, репостнули репост из другой группы? Где авторский стиль, друзья?' },
                    { k: 'critique_9', t: '## Ночные совы 🦉\nПост опубликован в четыре утра... Для кого, для лунатиков в библиотечном фонде?' },
                    { k: 'critique_10', t: '## Просмотры без лайков 💔\nШикарные цифры просмотров! Но где лайки? Читатели любуются молча?' },
                    { k: 'critique_11', t: '## Секрет от Космо 💡\nТайный совет от Космо: если пост не залетает, добавьте фото чашки кофе и уютного пледа!' },
                    { k: 'critique_12', t: '## Филиал на первом месте 🥇\nФилиал на первом месте оторвался в космос! Его уже не догнать даже на ракете!' },
                    { k: 'critique_13', t: '## Маленький гигант 📈\nУ этого филиала вовлечённость выше, хотя подписчиков меньше! Вот что значит душевный контент!' },
                    { k: 'critique_14', t: '## Восклицательные знаки ❗\nДве строчки текста и шесть восклицательных знаков! Спокойнее, мы и так всё поняли!' },
                    { k: 'critique_15', t: '## Умная лента 🤖\nЕсли бы алгоритм ВК был человеком, он бы поставил этому посту твердую троечку с плюсом!' },
                    { k: 'critique_16', t: '## Спектральный анализ 🔬\nЯ провёл спектральный анализ активности: потенциал виральности обнаружен, но глубоко зарыт!' },
                    { k: 'critique_17', t: '## Разбор полётов 📊\nЛидеры ликуют, отстающие делают вид, что им просто некогда писать посты!' },
                    { k: 'critique_18', t: '## Внимание на экран 🚀\nПотенциал отличный, осталось научиться писать цепляющие заголовки!' },
                    { k: 'critique_19', t: '## Репосты в топе 📢\nТакое количество репостов говорит об одном: методичка удалась на славу!' },
                    { k: 'critique_20', t: '## Оценка SMM-гуру 💅\nВ целом неплохо для простых смертных, но с Космо ваши охваты улетят на Альфа Центавра!' }
                ];
                const p = critiquePhrases[Math.floor(Math.random() * critiquePhrases.length)];
                this.say(p.t, 7500, 'smile', p.k);
                this.setMoodBadge('📈', 3500);
            } else {
                const idleChatterPhrases = [
                    { k: 'scan_wait_7', t: '## Сканируем стену? 🚀\nЖми большую кнопку поиска! Я в реальном времени разберу все охваты по полочкам!' },
                    { k: 'critique_11', t: '## Мудрость SMM-гуру 💡\nЗнаешь формулу успеха? Качественные фото, регулярность и немного космической магии Космо!' },
                    { k: 'post_scan_10', t: '## Я на страже охватов 🛡️\nМой квантовый сенсор настроен на частоты рекомендаций ВКонтакте! Все системы готовы!' },
                    { k: 'critique_18', t: '## Заголовок решает всё! 📝\nПервые две строчки поста — это 80% успеха! Зацепи читателя сразу!' },
                    { k: 'scan_wait_8', t: '## Заправка кофе ☕\nПока ты думаешь над запросом, я подкачал батареи синтетическим кофе! Готов к анализу!' },
                    { k: 'critique_20', t: '## Величайший гуру 💅\nЕсли нужна помощь с выбором лучшего филиала или поста — я всегда рядом!' },
                    { k: 'post_scan_5', t: '## Привет библиотекам! 👋\nВладимирские библиотеки — лучшие во Вселенной! Давай докажем это статистикой!' },
                    { k: 'critique_15', t: '## Алгоритмы не спят 🤖\nУмная лента любит свежий оригинальный контент! Давай проанализируем, что сейчас в тренде!' }
                ];
                const p = idleChatterPhrases[Math.floor(Math.random() * idleChatterPhrases.length)];
                this.say(p.t, 7000, 'smile', p.k);
                this.setMoodBadge('✨', 3000);
            }
        }, 94000); // ×1/0.8 от исходных 75 сек — чуть реже болтаем
    }

    resetIdleTimer() {
        clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
            if (!this.isIn3D && !this.isCollapsed && !this.isSleeping && !this.isPerformingActivity && !this.isDragging && !this.isPatrolling) {
                this.goToSleep();
            }
        }, 180000);
    }

    goToSleep() {
        this.isSleeping = true;
        this.setState('sleep');
        this.say('Космо ушёл в режим гибернации... zZz... Кликни по мне, чтобы разбудить! 💤', 8000, 'sleep');
    }

    wakeUp() {
        this.isSleeping = false;
        this.setState('smile', 3000);
        this.spawnSparkles(8);
        this.say(`## Оп! Я проснулся! 🚀\nСистемы онлайн, готов к покорению умной ленты!`, 6000, 'smile');
        this.resetIdleTimer();
    }

    enableMascot() {
        this.isEnabled = true;
        try {
            localStorage.setItem('aurora_mascot_enabled', '1');
        } catch (e) {}

        if (!this.container) {
            this.init();
            return;
        }

        this.isCollapsed = false;
        this.container.style.display = '';
        this.container.classList.remove('mascot-hidden');
        if (this.collapsedPill) {
            this.collapsedPill.style.display = '';
            this.collapsedPill.classList.remove('is-visible');
        }

        this.startAutonomousCycle();
        this.startProactiveChatter();
        this.updateParallaxAndMotion();
        this.resetIdleTimer();
        this.syncToggleButtons();

        this.spawnSparkles(12);
        this.say(`## Космо включён! 🚀✨\nРад встрече! Системы онлайн, готов анализировать посты и помогать!`, 5500, 'smile', 'post_scan_10', true);
    }

    disableMascot() {
        this.isEnabled = false;
        try {
            localStorage.setItem('aurora_mascot_enabled', '0');
        } catch (e) {}

        this.stopVoice();
        if (this.isPatrolling) {
            this.stopContinuousPatrol(false);
        }
        clearInterval(this.proactiveTimer);
        clearInterval(this.scanBanterTimer);
        clearTimeout(this.activityCycleTimer);
        clearTimeout(this.idleTimer);
        clearTimeout(this.greetingTimer);
        clearTimeout(this.initialPatrolTimer);
        clearTimeout(this.speechTimer);

        if (this.container) {
            this.container.classList.add('mascot-hidden');
            this.container.style.display = 'none';
        }
        if (this.collapsedPill) {
            this.collapsedPill.classList.remove('is-visible');
            this.collapsedPill.style.display = 'none';
        }
        this.hideBubble();
        this.syncToggleButtons();
    }

    toggleMascot() {
        if (this.isEnabled) {
            this.disableMascot();
        } else {
            this.enableMascot();
        }
    }

    syncToggleButtons() {
        const on = Boolean(this.isEnabled);

        // 1. Кнопка в шапке сайта
        const headerBtn = document.getElementById('mascot-toggle-btn');
        if (headerBtn) {
            headerBtn.classList.toggle('is-on', on);
            headerBtn.classList.toggle('is-off', !on);
            headerBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
            headerBtn.title = on ? 'Выключить маскота Космо на странице' : 'Включить маскота Космо на странице';
            const textEl = headerBtn.querySelector('#mascot-toggle-text');
            if (textEl) textEl.textContent = on ? 'Космо: Вкл' : 'Космо: Выкл';
        }

        // 2. Пункт в выпадающем меню "Интерактив"
        const dropBadge = document.getElementById('dropdown-mascot-badge');
        const dropDesc = document.getElementById('dropdown-mascot-desc');
        if (dropBadge) {
            dropBadge.textContent = on ? 'ВКЛ' : 'ВЫКЛ';
            dropBadge.className = on ? 'game-nav-badge badge-on' : 'game-nav-badge badge-off';
            dropBadge.style.background = on
                ? 'linear-gradient(135deg, #00F0FF, #00FF9D)'
                : 'rgba(255,255,255,0.12)';
            dropBadge.style.color = on ? '#041026' : 'var(--text-muted, #94a3b8)';
        }
        if (dropDesc) {
            dropDesc.textContent = on
                ? 'Интерактивный робот-помощник активен'
                : 'Интерактивный робот-помощник выключен';
        }

        // 3. Кнопка в модальном окне настроек
        const modalBtnText = document.getElementById('modal-mascot-toggle-text');
        const modalBtn = document.getElementById('modal-mascot-toggle-btn');
        if (modalBtnText) {
            modalBtnText.textContent = on ? 'Выключить Космо' : 'Включить Космо';
        }
        if (modalBtn) {
            modalBtn.classList.toggle('btn-secondary', on);
            modalBtn.classList.toggle('btn-primary', !on);
        }
    }

    collapse() {
        if (!this.isEnabled) return;
        this.isCollapsed = true;
        // Сворачивание прерывает патрулирование — иначе rAF-цикл зависает без видимого робота
        if (this.isPatrolling) this.stopContinuousPatrol(false);
        this.stopVoice();
        this.container?.classList.add('mascot-hidden');
        this.collapsedPill?.classList.add('is-visible');
        this.hideBubble();
    }

    expand() {
        if (!this.isEnabled) return;
        this.isCollapsed = false;
        this.collapsedPill?.classList.remove('is-visible');
        this.container?.classList.remove('mascot-hidden');
        this.say('Космо снова с вами! Продолжаем работу! ✨', 5000, 'smile');
        this.resetIdleTimer();
    }

    setIn3D(in3D) {
        this.isIn3D = Boolean(in3D);
        if (this.isIn3D) {
            // Вход в 3D прерывает патрулирование — робот скрыт, rAF-цикл не нужен
            if (this.isPatrolling) this.stopContinuousPatrol(false);
            this.stopVoice();
            this.container?.classList.add('mascot-hidden');
            this.collapsedPill?.classList.remove('is-visible');
            this.hideBubble();
        } else {
            if (this.isEnabled && !this.isCollapsed) {
                this.container?.classList.remove('mascot-hidden');
            }
        }
    }

    destroy() {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        if (this.patrolAnimFrame) cancelAnimationFrame(this.patrolAnimFrame);
        this.stopVoice();
        window.removeEventListener('mousemove', this.onMouseMove);
        clearInterval(this.proactiveTimer);
        clearInterval(this.scanBanterTimer);
        clearTimeout(this.idleTimer);
        clearTimeout(this.activityCycleTimer);
        clearTimeout(this.returnTimer);
        clearTimeout(this.greetingTimer);
        clearTimeout(this.initialPatrolTimer);
        clearTimeout(this.speechTimer);
        clearTimeout(this.stateResetTimer);
        clearTimeout(this.badgeResetTimer);
        clearTimeout(this.clickTimeout);
        this.closeCosmoModal(true);
        if (this.chatModal) {
            this.chatModal.close();
            this.chatModal.overlayEl?.remove();
        }
        this.container?.remove();
        this.collapsedPill?.remove();
    }
}

export const Mascot = new AuroraMascot();
if (typeof window !== 'undefined') {
    window.Mascot = Mascot;
    window.__MASCOT__ = Mascot;
    window.AuroraMascot = AuroraMascot;
    window.openCosmoChat = (q) => Mascot.openCosmoChat(q);
    window.toggleCosmoMascot = () => Mascot.toggleMascot();
    window.enableCosmoMascot = () => Mascot.enableMascot();
    window.disableCosmoMascot = () => Mascot.disableMascot();
}

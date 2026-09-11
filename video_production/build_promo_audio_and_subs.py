import os
import subprocess

PROJECT_DIR = "/home/astra/vint2/proj/vk_wall_searcher_php"
VOICE_DIR = os.path.join(PROJECT_DIR, "video_production/new_voiceover")
AMBIENT_WAV = os.path.join(PROJECT_DIR, "video_production/background_ambient.wav")
OUTPUT_AUDIO = os.path.join(PROJECT_DIR, "video_production/promo_master_audio.m4a")
OUTPUT_ASS = os.path.join(PROJECT_DIR, "video_production/promo_subtitles.ass")

TOTAL_DURATION = 316.0  # 20.0s intro + 276.7s user video + 19.3s outro

# Precise timeline of segments and phrase-level subtitles
segments_subtitles = [
    # --- 01_INTRO (0.5s - 19.05s) ---
    ("0:00:00.80", "0:00:06.50", "Здравствуйте, уважаемые коллеги!"),
    ("0:00:06.70", "0:00:13.20", "Представляем сервис мониторинга и аналитики публикаций библиотек Владимира."),
    ("0:00:13.40", "0:00:19.05", "Платформа объединяет 16 филиалов, экономя часы рутинной работы."),

    # --- 02_PARAMS (20.5s - 53.12s) ---
    ("0:00:20.50", "0:00:25.50", "Перед нами главная панель управления поиском и фильтрацией."),
    ("0:00:25.80", "0:00:32.00", "По умолчанию включён режим пакетного сбора сразу по всем 16 филиалам."),
    ("0:00:32.30", "0:00:39.50", "Гибкая настройка периода: текущий месяц, конкретный день или диапазон лет."),
    ("0:00:39.80", "0:00:46.50", "Фильтры по ключевым словам, исключениям, хэштегам и типам контента:"),
    ("0:00:46.80", "0:00:53.12", "фото, видео, репосты, опросы и ссылки. Запускаем поиск!"),

    # --- 03_SCANNING (55.0s - 88.65s) ---
    ("0:00:55.00", "0:01:02.00", "Стартует высокоскоростное сканирование через VK API execute."),
    ("0:01:02.30", "0:01:10.50", "Платформа выгружает данные пакетами до 1 000 записей за один сетевой запрос."),
    ("0:01:10.80", "0:01:18.00", "В реальном времени виден прогресс: каждый филиал обрабатывается за доли секунды."),
    ("0:01:18.30", "0:01:26.50", "Сервер аккуратно собирает тексты, даты, вложения, просмотры, лайки и репосты."),
    ("0:01:26.80", "0:01:34.00", "Более 2 000 записей проанализированы без потерь и зависаний."),

    # --- 04_FEED_MODAL (123.5s - 153.5s) ---
    ("0:02:03.50", "0:02:11.00", "Сканирование завершено! Сверху открывается витрина источников по всем филиалам."),
    ("0:02:11.30", "0:02:18.50", "Первая вкладка — удобная визуальная лента публикаций."),
    ("0:02:18.80", "0:02:26.00", "Клик по карточке открывает быстрый просмотр: полный текст, фото и охваты."),
    ("0:02:26.30", "0:02:33.50", "В один клик можно скопировать ссылку на запись или открыть пост ВКонтакте."),

    # --- 05_REPORT (157.0s - 193.02s) ---
    ("0:02:37.00", "0:02:44.00", "Вкладка «Отчёт с ссылками» — официальный документ учреждения."),
    ("0:02:44.30", "0:02:51.50", "Длинные тексты сокращены до 10 предложений с защитой адресов и дат."),
    ("0:02:51.80", "0:02:58.50", "Кнопка «Развернуть полностью» открывает всю публикацию целиком."),
    ("0:02:58.80", "0:03:06.50", "Интеллектуальная обработка репостов: атрибуция филиала и ссылка на оригинал."),
    ("0:03:06.80", "0:03:13.02", "Закреплённая шапка таблицы остаётся на виду при любой прокрутке."),

    # --- 06_ANALYTICS (217.0s - 249.88s) ---
    ("0:03:37.00", "0:03:44.00", "Вкладка «Рейтинг активности»: глубокий аналитический срез."),
    ("0:03:44.30", "0:03:51.50", "Автоматический расчёт ER вовлечённости, читательского охвата и реакций."),
    ("0:03:51.80", "0:03:59.00", "Интерактивная диаграмма сравнивает динамику публикаций по филиалам."),
    ("0:03:59.30", "0:04:09.88", "Сводная таблица рейтинга с залипающей шапкой и честными метриками."),

    # --- 07_MEMO (253.5s - 264.92s) ---
    ("0:04:13.50", "0:04:19.00", "Четвёртая вкладка — готовая пояснительная записка методиста."),
    ("0:04:19.30", "0:04:24.92", "Точная дата, ключевые цифры, облако хэштегов и реестр внешних ссылок."),

    # --- 08_DARK_THEME (265.5s - 282.37s) ---
    ("0:04:25.50", "0:04:32.50", "Стильная тёмная тема Аврора снижает нагрузку на зрение при вечерней работе."),
    ("0:04:32.80", "0:04:42.37", "Встроенное руководство пользователя содержит формулу ER и советы по охватам."),

    # --- 09_LIGHT_THEME (287.5s - 295.25s) ---
    ("0:04:47.50", "0:04:51.50", "Возвращаемся в светлую тему с обновлённым комфортным контрастом."),
    ("0:04:51.80", "0:04:55.25", "Отчёты готовы к выгрузке в Word, Excel или мгновенной печати."),

    # --- 10_OUTRO (297.2s - 314.34s) ---
    ("0:04:57.20", "0:05:04.00", "Оптимизируйте отчётность и экономьте время вместе с нашим сервисом!"),
    ("0:05:04.30", "0:05:10.50", "Переходите по адресу biblioteka33.ru/stat прямо сейчас."),
    ("0:05:10.80", "0:05:15.00", "Спасибо за внимание и продуктивной вам работы!")
]

def generate_ass():
    header = """[Script Info]
Title: Promo Biblioteka33
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Montserrat,24,&H00FFFFFF,&H000000FF,&H000F172A,&HB0000000,-1,0,0,0,100,100,0.5,0,1,2.2,1.2,2,40,40,32,1
Style: Accent,Montserrat,25,&H00C4E63E,&H000000FF,&H000F172A,&HB0000000,-1,0,0,0,100,100,0.5,0,1,2.5,1.5,2,40,40,32,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []
    for start, end, text in segments_subtitles:
        # Highlight domain or keywords if present
        styled_text = text
        if "biblioteka33.ru/stat" in styled_text:
            styled_text = styled_text.replace("biblioteka33.ru/stat", "{\\c&H00C4E63E&}biblioteka33.ru/stat{\\c&H00FFFFFF&}")
        events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{styled_text}")
    
    with open(OUTPUT_ASS, "w", encoding="utf-8") as f:
        f.write(header + "\n".join(events) + "\n")
    print(f"Generated subtitles: {OUTPUT_ASS} ({len(events)} cues)")

def generate_audio():
    # Audio delays for the 10 files in milliseconds
    delays = [
        ("01_intro.mp3", 500),         # 0.5s
        ("02_params.mp3", 20500),       # 20.5s
        ("03_scanning.mp3", 55000),     # 55.0s
        ("04_feed_modal.mp3", 123500),  # 123.5s
        ("05_report.mp3", 157000),      # 157.0s
        ("06_analytics.mp3", 217000),   # 217.0s
        ("07_memo.mp3", 253500),        # 253.5s
        ("08_dark_theme.mp3", 265500),  # 265.5s
        ("09_light_theme.mp3", 287500), # 287.5s
        ("10_outro.mp3", 297200)        # 297.2s
    ]

    inputs = []
    filter_parts = []
    mix_inputs = []

    for i, (fname, delay_ms) in enumerate(delays):
        inputs.extend(["-i", os.path.join(VOICE_DIR, fname)])
        filter_parts.append(f"[{i}:a]adelay={delay_ms}|{delay_ms}[v{i}];")
        mix_inputs.append(f"[v{i}]")

    # Background music input
    bg_idx = len(delays)
    inputs.extend(["-stream_loop", "-1", "-i", AMBIENT_WAV])

    # All voice segments combined into [all_voices]
    all_voices_mix = "".join(mix_inputs) + f"amix=inputs={len(delays)}:normalize=0[all_voices];"
    
    # Background music ducked to 0.07, fade in 2s, fade out last 3s
    bg_filter = f"[{bg_idx}:a]volume=0.07,afade=t=in:ss=0:d=2.5,afade=t=out:st={TOTAL_DURATION-3.0}:d=3.0[bg_music];"

    # Master mix
    master_filter = f"[all_voices][bg_music]amix=inputs=2:duration=first[master_out]"

    full_filter = "".join(filter_parts) + all_voices_mix + bg_filter + master_filter

    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", full_filter,
        "-map", "[master_out]",
        "-t", str(TOTAL_DURATION),
        "-c:a", "aac",
        "-b:a", "192k",
        OUTPUT_AUDIO
    ]

    print("Running FFmpeg audio mix...")
    res = subprocess.run(cmd)
    if res.returncode != 0:
        raise RuntimeError("FFmpeg audio mix failed")
    print(f"Generated master audio: {OUTPUT_AUDIO}")

if __name__ == "__main__":
    generate_ass()
    generate_audio()

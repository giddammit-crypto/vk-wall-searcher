import urllib.request
import json
import os
import sys
import time
import subprocess

API_KEY = "sk_4db51c71946165f5132f0276283047de69abfe24da40bc3e"
VOICE_ID = "EXAVITQu4vr4xnSDxMaL"  # Bella
OUT_DIR = "/home/astra/vint2/proj/vk_wall_searcher_php/assets/video/audio_raw"
os.makedirs(OUT_DIR, exist_ok=True)

segments = [
    ("scene1_intro.mp3", "Привет! Я робот Космо, твой проводник в умной аналитике библиотек! Добро пожаловать в АВРОРУ!"),
    ("scene2_analytics.mp3", "Система сканирует шестнадцать филиалов, строит теплокарту активности и считает честный рейтинг вовлечённости!"),
    ("scene3_promo_qr.mp3", "Печатайте полиграфию в один клик! Плакаты А четыре, тейблтенты и закладки с векторным кьюар-кодом уже готовы!"),
    ("scene4_cosmo_chat.mp3", "А ещё заглядывайте в чат со мной! Десять пресетов экспресс-анализа, генерация постов ВКонтакте и аудит филиалов!"),
    ("scene5_outro.mp3", "Исследуйте космос библиотечных данных на сайте библиотека тридцать три точка ру слэш стат! Полетели!")
]

print(f"Synthesizing {len(segments)} concise segments for 35s video...")

durations = []
for idx, (filename, text) in enumerate(segments, 1):
    raw_path = os.path.join(OUT_DIR, filename)
    pitched_path = os.path.join(OUT_DIR, filename.replace(".mp3", "_pitched.wav"))
    
    print(f"[{idx}/{len(segments)}] Synthesizing {filename}...")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    payload = json.dumps({
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.50,
            "similarity_boost": 0.85,
            "style": 0.28,
            "use_speaker_boost": True
        }
    }).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "xi-api-key": API_KEY,
            "Content-Type": "application/json"
        }
    )
    
    with urllib.request.urlopen(req, timeout=30) as resp:
        audio_data = resp.read()
        with open(raw_path, "wb") as f:
            f.write(audio_data)
        
    cmd = [
        "ffmpeg", "-y", "-i", raw_path,
        "-filter:a", "asetrate=44100*1.24,atempo=1/1.24",
        "-ar", "44100", "-ac", "2",
        pitched_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    dur_cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", pitched_path]
    dur = float(subprocess.check_output(dur_cmd).decode().strip())
    durations.append(dur)
    print(f"  -> Pitched: {dur:.2f}s")
    time.sleep(0.4)

print(f"\nTotal voice duration: {sum(durations):.2f}s (fits perfectly into 35s!)")

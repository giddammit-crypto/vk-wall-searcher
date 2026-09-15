import os, subprocess

ROOT = "/home/astra/vint2/proj/vk_wall_searcher_php/assets/video"
AUDIO_DIR = os.path.join(ROOT, "audio_raw")
OUT_AUDIO = os.path.join(ROOT, "final_audio_35s.aac")

# Timestamps for 5 scenes within 35.0s:
# Scene 1: 0.0 - 6.5s  (Voice starts at 0.25s)
# Scene 2: 6.5 - 13.6s (Voice starts at 6.65s)
# Scene 3: 13.6 - 20.8s (Voice starts at 13.75s)
# Scene 4: 20.8 - 28.0s (Voice starts at 20.95s)
# Scene 5: 28.0 - 35.0s (Voice starts at 28.20s)

c1 = os.path.join(AUDIO_DIR, "scene1_intro_pitched.wav")
c2 = os.path.join(AUDIO_DIR, "scene2_analytics_pitched.wav")
c3 = os.path.join(AUDIO_DIR, "scene3_promo_qr_pitched.wav")
c4 = os.path.join(AUDIO_DIR, "scene4_cosmo_chat_pitched.wav")
c5 = os.path.join(AUDIO_DIR, "scene5_outro_pitched.wav")

# Speed-adjust slightly so each voice fits its window with nice spacing:
# c1: 6.05s -> keep as is (0.25 + 6.05 = 6.30s <= 6.5s)
# c2: 7.55s -> atempo=1.12 (6.74s -> 6.65 + 6.74 = 13.39s <= 13.6s)
# c3: 7.81s -> atempo=1.15 (6.79s -> 13.75 + 6.79 = 20.54s <= 20.8s)
# c4: 7.58s -> atempo=1.13 (6.70s -> 20.95 + 6.70 = 27.65s <= 28.0s)
# c5: 6.21s -> atempo=1.05 (5.91s -> 28.20 + 5.91 = 34.11s <= 35.0s)

# Create timed voices using adelay and amix:
filter_complex = (
    # Ambient space music: lush sine chords (F# minor: 185Hz, 220Hz, 277Hz, 370Hz) + lowpass filter + chorus
    "aevalsrc=sin(185*2*PI*t)*0.18+sin(277*2*PI*t)*0.12+sin(370*2*PI*t)*0.08+sin(440*2*PI*t)*0.05:s=44100:d=35.0[synth];"
    "[synth]lowpass=f=450,volume=0.22,afade=t=in:ss=0:d=0.8,afade=t=out:st=33.8:d=1.2[bgm];"
    
    # Process and delay voice segments
    "[0:a]volume=1.05,adelay=250|250[v1];"
    "[1:a]atempo=1.12,volume=1.05,adelay=6650|6650[v2];"
    "[2:a]atempo=1.15,volume=1.05,adelay=13750|13750[v3];"
    "[3:a]atempo=1.13,volume=1.05,adelay=20950|20950[v4];"
    "[4:a]atempo=1.05,volume=1.05,adelay=28200|28200[v5];"
    
    # Mix all 5 voices
    "[v1][v2][v3][v4][v5]amix=inputs=5:duration=longest:dropout_transition=0:normalize=0[voice_all];"
    
    # Mix voices with ambient BGM
    "[voice_all][bgm]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,volume=1.15,alimiter=limit=0.96,atrim=0:35.0,asetpts=PTS-STARTPTS,afade=t=out:st=34.2:d=0.8[aout]"
)

cmd = [
    "ffmpeg", "-y",
    "-i", c1,
    "-i", c2,
    "-i", c3,
    "-i", c4,
    "-i", c5,
    "-filter_complex", filter_complex,
    "-map", "[aout]",
    "-c:a", "aac",
    "-b:a", "192k",
    OUT_AUDIO
]

print("Mixing 35s audio with ffmpeg...")
subprocess.run(cmd, check=True)

# Verify duration
dur = float(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", OUT_AUDIO
]).decode().strip())

print(f"Final audio created: {OUT_AUDIO} (Duration: {dur:.2f}s)")

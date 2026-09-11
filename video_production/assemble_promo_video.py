import os
import sys
import subprocess

PROJECT_DIR = "/home/astra/vint2/proj/vk_wall_searcher_php"
INTRO_MP4 = os.path.join(PROJECT_DIR, "video_production/intro.mp4")
USER_MP4 = "/home/astra/snap/obs-studio/common/2026-09-11 00-00-44.mp4"
OUTRO_MP4 = os.path.join(PROJECT_DIR, "video_production/outro.mp4")
AUDIO_M4A = os.path.join(PROJECT_DIR, "video_production/promo_master_audio.m4a")
SUBTITLES_ASS = os.path.join(PROJECT_DIR, "video_production/promo_subtitles.ass")
FINAL_MP4 = os.path.join(PROJECT_DIR, "promo_biblioteka33_final.mp4")

# Check all inputs exist
for f in [INTRO_MP4, USER_MP4, OUTRO_MP4, AUDIO_M4A, SUBTITLES_ASS]:
    if not os.path.exists(f):
        print(f"Error: missing input {f}")
        sys.exit(1)

print("All inputs verified:")
print(f"  Intro: {INTRO_MP4}")
print(f"  User video (UNMODIFIED): {USER_MP4}")
print(f"  Outro: {OUTRO_MP4}")
print(f"  Master audio: {AUDIO_M4A}")
print(f"  Subtitles: {SUBTITLES_ASS}")
print(f"  Target: {FINAL_MP4}")

cmd = [
    "ffmpeg", "-y",
    "-i", INTRO_MP4,
    "-i", USER_MP4,
    "-i", OUTRO_MP4,
    "-i", AUDIO_M4A,
    "-filter_complex",
    f"[0:v:0][1:v:0][2:v:0]concat=n=3:v=1:a=0[vconcat];[vconcat]ass={SUBTITLES_ASS}[vfinal]",
    "-map", "[vfinal]",
    "-map", "3:a:0",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    "-shortest",
    FINAL_MP4
]

print("Launching FFmpeg assembly...")
res = subprocess.run(cmd)
if res.returncode != 0:
    print("FFmpeg assembly failed with code:", res.returncode)
    sys.exit(res.returncode)

print("\nSUCCESS! Final promo video created:", FINAL_MP4)
size_mb = os.path.getsize(FINAL_MP4) / 1024 / 1024
print(f"File size: {size_mb:.2f} MB")

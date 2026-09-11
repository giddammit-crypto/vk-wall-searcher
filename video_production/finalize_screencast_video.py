import os
import sys
import glob
import json
import subprocess

PROJECT_DIR = "/home/astra/vint2/proj/vk_wall_searcher_php"
RAW_DIR = os.path.join(PROJECT_DIR, "video_production/raw_video")
AUDIO_FILE = os.path.join(PROJECT_DIR, "video_production/master_audio.m4a")
SUBTITLES_FILE = os.path.join(PROJECT_DIR, "video_production/subtitles.ass")
OUTPUT_VIDEO = os.path.join(PROJECT_DIR, "video_review_biblioteka33.mp4")
PREVIEW_DIR = os.path.join(PROJECT_DIR, "video_production/final_previews")
TIMING_FILE = os.path.join(PROJECT_DIR, "video_production/timing_offset.json")
os.makedirs(PREVIEW_DIR, exist_ok=True)

trim_offset = 0.0
if os.path.exists(TIMING_FILE):
    try:
        with open(TIMING_FILE) as f:
            data = json.load(f)
            trim_offset = float(data.get("trim_offset", 0.0))
    except Exception as e:
        print("Could not load timing offset:", e)

print(f"Using trim offset: {trim_offset:.3f}s")

webms = glob.glob(os.path.join(RAW_DIR, "*.webm"))
if not webms:
    print("Error: No webm file found in", RAW_DIR)
    sys.exit(1)

raw_webm = max(webms, key=os.path.getsize)
print(f"Using raw recorded video: {raw_webm} ({os.path.getsize(raw_webm) / 1024 / 1024:.2f} MB)")

# Probe raw webm duration
probe_cmd = [
    "ffprobe", "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    raw_webm
]
dur_str = subprocess.check_output(probe_cmd).decode().strip()
print(f"Raw video duration: {dur_str} seconds")

print(f"Muxing Full HD video with audio ({AUDIO_FILE}) and burning subtitles ({SUBTITLES_FILE})...")

ffmpeg_cmd = [
    "ffmpeg", "-y",
    "-ss", f"{trim_offset:.3f}",
    "-i", raw_webm,
    "-i", AUDIO_FILE,
    "-vf", f"ass={SUBTITLES_FILE}",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "256k",
    "-t", "212.5",
    "-shortest",
    "-movflags", "+faststart",
    OUTPUT_VIDEO
]

res = subprocess.run(ffmpeg_cmd)
if res.returncode != 0:
    print("FFmpeg failed!")
    sys.exit(res.returncode)

print(f"Final MP4 successfully generated: {OUTPUT_VIDEO}")
print(f"File size: {os.path.getsize(OUTPUT_VIDEO) / 1024 / 1024:.2f} MB")

# Probe final video
probe_final = [
    "ffprobe", "-v", "error",
    "-show_entries", "format=duration,size:stream=width,height,r_frame_rate",
    "-of", "default=noprint_wrappers=1",
    OUTPUT_VIDEO
]
subprocess.run(probe_final)

# Extract preview screenshots at representative timestamps
timestamps = [
    ("00_splash", "00:00:03"),
    ("01_intro", "00:00:14"),
    ("02_params", "00:00:41"),
    ("03_scanning", "00:01:32"),
    ("04_feed", "00:01:52"),
    ("05_report", "00:02:25"),
    ("06_analytics", "00:02:51"),
    ("07_memo", "00:03:10"),
    ("08_outro", "00:03:22")
]

for name, ts in timestamps:
    out_img = os.path.join(PREVIEW_DIR, f"{name}.jpg")
    cmd = [
        "ffmpeg", "-y", "-ss", ts,
        "-i", OUTPUT_VIDEO,
        "-vframes", "1",
        "-q:v", "2",
        out_img
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Generated preview frame: {out_img}")

print("All done!")

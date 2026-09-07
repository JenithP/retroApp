# -*- coding: utf-8 -*-
"""원본 영상·음원을 웹용으로 줄인다.

    python tools/encode_media.py

원본을 media_src/ 에 넣으면 길이를 재서 크기 한도에 맞는 화질을 스스로 고르고
public/media/ 로 내보낸다. 길이가 얼마든 파일 하나가 한도를 넘지 않는다.

    media_src/tv/ch7_1.mp4      →  public/media/tv/ch7_1.mp4
    media_src/radio/95.1.wav    →  public/media/radio/95.1.mp3
"""
import os, sys, re, subprocess, shutil
sys.stdout.reconfigure(encoding="utf-8")

try:
    import imageio_ffmpeg
except ImportError:
    print("ffmpeg을 내려받습니다…")
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "imageio-ffmpeg"], check=True)
    import imageio_ffmpeg

FF   = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "media_src")
DST  = os.path.join(ROOT, "public", "media")

TV_CAP_MB    = 5.0        # 영상 한 개가 넘지 않을 크기
RADIO_CAP_MB = 1.6        # 음원 한 개가 넘지 않을 크기
TV_HEIGHT    = 360
VID_MIN, VID_MAX = 110, 420   # kbps 하한과 상한

def duration(path):
    out = subprocess.run([FF, "-hide_banner", "-i", path],
                         capture_output=True, text=True, encoding="utf-8",
                         errors="replace").stderr
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", out)
    if not m:
        return None
    h, mi, s = m.groups()
    return int(h)*3600 + int(mi)*60 + float(s)

def run(cmd):
    subprocess.run(cmd, check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def do_video(src, dst):
    d = duration(src)
    if not d:
        print(f"  {os.path.basename(src)} — 길이를 못 읽어 건너뜁니다"); return
    audio_k = 48
    total_k = TV_CAP_MB * 8192 / d            # 이 길이를 한도 안에 담을 총 비트레이트
    v = int(max(VID_MIN, min(VID_MAX, total_k - audio_k)))
    fps = 20 if d > 60 else 24
    run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", src,
         "-vf", f"scale=-2:{TV_HEIGHT},fps={fps}",
         "-c:v", "libx264", "-preset", "veryslow", "-b:v", f"{v}k",
         "-maxrate", f"{int(v*1.35)}k", "-bufsize", f"{int(v*2.6)}k",
         "-profile:v", "main", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
         "-c:a", "aac", "-b:a", f"{audio_k}k", "-ac", "1", "-ar", "32000", dst])
    print(f"  {os.path.basename(dst):12s} {d:6.1f}초  영상 {v:3d}kbps  "
          f"{os.path.getsize(src)/1e6:6.1f}MB → {os.path.getsize(dst)/1e6:4.1f}MB")

def do_audio(src, dst):
    d = duration(src)
    if not d:
        print(f"  {os.path.basename(src)} — 길이를 못 읽어 건너뜁니다"); return
    k = int(max(40, min(96, RADIO_CAP_MB * 8192 / d)))
    run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", src,
         "-c:a", "libmp3lame", "-b:a", f"{k}k", "-ac", "1", "-ar", "32000", dst])
    print(f"  {os.path.basename(dst):12s} {d:6.1f}초  {k:2d}kbps  "
          f"{os.path.getsize(src)/1e6:6.1f}MB → {os.path.getsize(dst)/1e6:4.1f}MB")

def sweep(kind, exts, worker, out_ext):
    s, d = os.path.join(SRC, kind), os.path.join(DST, kind)
    os.makedirs(d, exist_ok=True)
    if not os.path.isdir(s):
        print(f"{kind}: media_src/{kind}/ 폴더가 없습니다"); return
    files = sorted(f for f in os.listdir(s) if os.path.splitext(f)[1].lower() in exts)
    if not files:
        print(f"{kind}: 원본이 없습니다"); return
    print(f"{kind}")
    for f in files:
        worker(os.path.join(s, f), os.path.join(d, os.path.splitext(f)[0] + out_ext))

sweep("tv", {".mp4", ".mov", ".m4v", ".avi", ".mkv"}, do_video, ".mp4")
sweep("radio", {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"}, do_audio, ".mp3")

if os.path.isdir(DST):
    tot = sum(os.path.getsize(os.path.join(r, f))
              for r, _, fs in os.walk(DST) for f in fs)
    print(f"\npublic/media 합계 {tot/1e6:.1f}MB")
    print("이제 firebase deploy 를 하시면 됩니다.")

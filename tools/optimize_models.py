# -*- coding: utf-8 -*-
"""Tripo 가 내준 GLB 를 교실에서 쓸 크기로 줄인다.

    python tools/optimize_models.py                 # ../시간여행_모델 을 훑는다
    python tools/optimize_models.py D:/어딘가/모델   # 다른 폴더

Tripo 모델은 보통 면이 수십만 개, 텍스처가 8192 픽셀이라 한 개가 40MB 안팎이다.
80명이 동시에 받으면 교실 무선망이 멈추고, 아이패드는 그래픽 메모리가 모자라 꺼진다.
그래서 모양은 두고 이렇게 줄인다.

    면        약 4.5만 개로 (캐릭터) · 약 1만 개로 (소품)
    텍스처    1024 픽셀, WebP
    좌표      양자화 — 받는 쪽에 따로 풀개가 필요 없는 방식

결과는 public/time/models/ 에 같은 이름으로 들어간다. 원본은 건드리지 않는다.
node 가 필요하다 (npx gltf-transform 을 쓴다).
"""
import os, sys, subprocess, tempfile, shutil
sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(ROOT), "시간여행_모델")
DST  = os.path.join(ROOT, "public", "time", "models")

# 캐릭터는 면을 넉넉히, 소품은 더 줄인다
PROPS = {"hut", "firekit", "drum", "desk", "press", "typecase"}
TARGET_TRIS = {"char": 45000, "prop": 10000}   # 캐릭터 4.5만 — 누로 눈으로 확인한 품질

GT = ["npx", "--yes", "@gltf-transform/cli@4"]


def run(*args):
    r = subprocess.run(GT + list(args), capture_output=True, text=True, encoding="utf-8",
                       errors="replace", shell=(os.name == "nt"))
    if r.returncode:
        raise RuntimeError(r.stderr.strip()[-400:])
    return r.stdout


def triangles(path):
    out = run("inspect", path, "--format", "csv")
    # MESHES 표의 glPrimitives 열을 더한다 — 첫 줄은 머리글
    tris, section = 0, None
    for line in out.splitlines():
        if line.strip() == "MESHES": section = "m"; continue      # 머리 줄 앞에 공백이 붙어 나온다
        if section == "m" and line.startswith("#"): continue
        if section == "m" and line and line[0].isdigit():
            cols = line.split(",")
            try: tris += int(cols[4].replace('"', "").replace(",", ""))
            except (ValueError, IndexError): pass
        if section == "m" and not line.strip(): break
    return tris


def optimize(src, dst, kind):
    with tempfile.TemporaryDirectory() as tmp:
        a, b, c, d = (os.path.join(tmp, f"{i}.glb") for i in "abcd")
        run("weld", src, a)
        n = triangles(a)
        if n <= 1:                       # 못 읽었으면 줄이지 않은 큰 파일을 내보내기 전에 멈춘다
            raise RuntimeError("면 수를 읽지 못했습니다 — 원본은 그대로 두었습니다")
        ratio = min(1.0, TARGET_TRIS[kind] / n)
        run("simplify", a, b, "--ratio", f"{ratio:.4f}", "--error", "0.002")
        run("resize", b, c, "--width", "1024", "--height", "1024")
        run("webp", c, d, "--quality", "82")
        run("quantize", d, dst)
        return n


def main():
    if not os.path.isdir(SRC):
        print("모델 폴더가 없습니다:", SRC); return
    os.makedirs(DST, exist_ok=True)
    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith(".glb"))
    if not files:
        print("GLB 파일이 없습니다:", SRC); return
    for f in files:
        name = os.path.splitext(f)[0]
        kind = "prop" if name in PROPS else "char"
        src, dst = os.path.join(SRC, f), os.path.join(DST, f)
        try:
            n = optimize(src, dst, kind)
            if os.path.getsize(dst) > 4e6: print(f"  ! {f} 가 여전히 4MB 가 넘습니다 — 확인이 필요합니다")
            print(f"  {f:16s} 면 {n:>8,} → 약 {TARGET_TRIS[kind]:,}   "
                  f"{os.path.getsize(src)/1e6:6.1f}MB → {os.path.getsize(dst)/1e6:4.2f}MB")
        except Exception as e:
            print(f"  {f:16s} 실패 — {e}")
    print("\n이제 firebase deploy --only hosting 을 하시면 됩니다.")


if __name__ == "__main__":
    main()

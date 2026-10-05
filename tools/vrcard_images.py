"""6주차 VR · AR 적용 판단 실습 — 카드 그림을 웹용으로 줄인다.

원본(번호로 시작하는 그림, 예: 01_소방대피훈련.png)을 4:3 으로 잘라 480×360 webp 로 만들어
public/vrcard/img/cards/01.webp … 18.webp 에 넣는다. 원본 폴더는 인자로 준다.

    python tools/vrcard_images.py "../6주차그림 자료/카드그림"
"""
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "../6주차그림 자료/카드그림")
OUT = Path(__file__).resolve().parent.parent / "public" / "vrcard" / "img" / "cards"
SIZE = (480, 360)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    done = []
    for f in sorted(SRC.iterdir()):
        m = re.match(r"^(\d{1,2})\D?", f.name)
        if not m or f.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
            continue
        n = int(m.group(1))
        if not 1 <= n <= 18:
            continue
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        im = ImageOps.fit(im, SIZE, Image.LANCZOS, centering=(0.5, 0.5))
        dst = OUT / f"{n:02d}.webp"
        im.save(dst, "WEBP", quality=80, method=6)
        done.append(n)
        print(f"{f.name} → {dst.name} ({dst.stat().st_size // 1024} KB)")
    missing = [n for n in range(1, 19) if n not in done]
    print(f"\n{len(done)}장 변환" + (f" · 없는 번호: {missing}" if missing else " · 18장 모두 있음"))


if __name__ == "__main__":
    main()

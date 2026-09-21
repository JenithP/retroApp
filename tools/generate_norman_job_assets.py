from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math


W, H = 1080, 675
S = 2

BG = (247, 248, 250)
SURFACE = (255, 255, 255)
INK = (37, 42, 48)
MUTED = (108, 118, 128)
SOFT = (229, 233, 237)
LINE = (214, 221, 227)
ACCENT = (70, 124, 132)
ACCENT_DARK = (45, 86, 94)
PHOTO = (236, 239, 242)
PAPER = (253, 250, 244)


FONT_REGULAR_CANDIDATES = [
    Path(r"C:\Users\User\AppData\Local\Microsoft\Windows\Fonts\NanumBarunGothic.ttf"),
    Path(r"C:\Windows\Fonts\malgun.ttf"),
]
FONT_BOLD_CANDIDATES = [
    Path(r"C:\Users\User\AppData\Local\Microsoft\Windows\Fonts\NanumBarunGothicBold.ttf"),
    Path(r"C:\Windows\Fonts\malgunbd.ttf"),
]


def pick_font(candidates):
    for path in candidates:
        if path.exists():
            return str(path)
    raise FileNotFoundError("No Korean font found")


FONT_REGULAR = pick_font(FONT_REGULAR_CANDIDATES)
FONT_BOLD = pick_font(FONT_BOLD_CANDIDATES)


def s(value):
    return int(round(value * S))


def scale_box(box):
    return tuple(s(v) for v in box)


def blend(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


class Canvas:
    def __init__(self):
        self.image = Image.new("RGB", (W * S, H * S), BG)
        self.draw = ImageDraw.Draw(self.image)

    def font(self, size, bold=False):
        return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, s(size))

    def text(self, xy, text, size=28, fill=INK, bold=False, anchor=None, align="left"):
        kwargs = {"font": self.font(size, bold), "fill": fill, "align": align}
        if anchor:
            kwargs["anchor"] = anchor
        self.draw.text((s(xy[0]), s(xy[1])), text, **kwargs)

    def rr(self, box, radius=24, fill=SURFACE, outline=None, width=1):
        self.draw.rounded_rectangle(
            scale_box(box),
            radius=s(radius),
            fill=fill,
            outline=outline,
            width=s(width),
        )

    def rect(self, box, fill=None, outline=None, width=1):
        self.draw.rectangle(scale_box(box), fill=fill, outline=outline, width=s(width))

    def line(self, points, fill=LINE, width=2):
        self.draw.line([(s(x), s(y)) for x, y in points], fill=fill, width=s(width))

    def ellipse(self, box, fill=None, outline=None, width=1):
        self.draw.ellipse(scale_box(box), fill=fill, outline=outline, width=s(width))

    def polygon(self, points, fill=None, outline=None):
        self.draw.polygon([(s(x), s(y)) for x, y in points], fill=fill, outline=outline)

    def arc(self, box, start, end, fill=LINE, width=2):
        self.draw.arc(scale_box(box), start=start, end=end, fill=fill, width=s(width))

    def save(self, path):
        final = self.image.resize((W, H), Image.Resampling.LANCZOS)
        final.save(path, "WEBP", quality=90, method=6)


def header(c, title, subtitle=None):
    c.text((70, 54), title, 34, INK, True)
    if subtitle:
        c.text((70, 96), subtitle, 20, MUTED)
    c.line([(70, 132), (1010, 132)], SOFT, 2)


def small_label(c, xy, text):
    c.text(xy, text, 20, MUTED)


def money(c, xy, text, size=34):
    c.text(xy, text, size, ACCENT_DARK, True)


def star_row(c, x, y, count=5):
    for i in range(count):
        c.text((x + i * 28, y), "★", 21, ACCENT if i < 4 else (190, 197, 204))


def mountain_photo(c, box, sunset=False):
    x, y, w, h = box
    c.rr((x, y, x + w, y + h), 24, fill=(232, 235, 237))
    sky = (231, 235, 238) if not sunset else (236, 220, 196)
    c.rect((x + 8, y + 8, x + w - 8, y + h - 8), fill=sky)
    c.ellipse((x + w * 0.68, y + 34, x + w * 0.8, y + 34 + w * 0.12), fill=(220, 177, 112))
    c.polygon([(x + 20, y + h - 40), (x + w * 0.35, y + h * 0.38), (x + w * 0.6, y + h - 40)], fill=(172, 185, 187))
    c.polygon([(x + w * 0.36, y + h - 40), (x + w * 0.7, y + h * 0.32), (x + w - 20, y + h - 40)], fill=(150, 170, 174))
    c.rect((x + 8, y + h - 72, x + w - 8, y + h - 8), fill=(183, 197, 174))


def coat_photo(c, box, tone=(188, 194, 198)):
    x, y, w, h = box
    c.rr((x, y, x + w, y + h), 24, fill=(233, 236, 239))
    c.rect((x + 16, y + 16, x + w - 16, y + h - 16), fill=(224, 228, 232))
    cx = x + w / 2
    c.ellipse((cx - 52, y + 52, cx + 52, y + 156), fill=(209, 191, 174))
    c.polygon([(cx - 124, y + h - 36), (cx - 70, y + 152), (cx + 70, y + 152), (cx + 124, y + h - 36)], fill=tone)
    c.line([(cx, y + 170), (cx, y + h - 50)], fill=(248, 249, 250), width=5)
    c.line([(cx - 62, y + 184), (cx - 92, y + h - 48)], fill=blend(tone, (40, 40, 40), 0.18), width=6)
    c.line([(cx + 62, y + 184), (cx + 92, y + h - 48)], fill=blend(tone, (40, 40, 40), 0.18), width=6)


def food_photo(c, box, soup=False):
    x, y, w, h = box
    c.rr((x, y, x + w, y + h), 24, fill=(243, 239, 232))
    c.ellipse((x + w * 0.16, y + h * 0.24, x + w * 0.84, y + h * 0.9), fill=(232, 232, 226), outline=(212, 210, 202), width=2)
    c.ellipse((x + w * 0.24, y + h * 0.32, x + w * 0.76, y + h * 0.8), fill=(182, 116, 91) if soup else (203, 174, 118))
    for i in range(9):
        px = x + w * (0.32 + (i % 3) * 0.12)
        py = y + h * (0.42 + (i // 3) * 0.08)
        c.ellipse((px, py, px + 28, py + 18), fill=(132, 151, 103))
    c.rect((x + 42, y + h - 42, x + w - 42, y + h - 30), fill=(210, 191, 167))


def room_photo(c, box):
    x, y, w, h = box
    c.rr((x, y, x + w, y + h), 24, fill=(235, 237, 239))
    c.rect((x + 10, y + 10, x + w - 10, y + h - 10), fill=(232, 225, 215))
    c.rect((x + 54, y + 78, x + w - 54, y + h - 74), fill=(252, 252, 250))
    c.rect((x + 80, y + 102, x + w - 80, y + h - 94), fill=(232, 236, 238))
    c.rect((x + 72, y + h - 126, x + w - 72, y + h - 68), fill=(218, 211, 202))
    c.rect((x + 40, y + h - 60, x + w - 40, y + h - 22), fill=(202, 191, 178))
    c.rect((x + w - 160, y + 52, x + w - 70, y + 168), fill=(222, 229, 232))


def plane_photo(c, box):
    x, y, w, h = box
    c.rr((x, y, x + w, y + h), 24, fill=(230, 238, 241))
    for i in range(4):
        c.ellipse((x + 40 + i * 160, y + h - 130 - i * 12, x + 240 + i * 160, y + h - 44), fill=(245, 247, 248))
    c.line([(x + 180, y + 180), (x + w - 190, y + 94)], fill=ACCENT, width=8)
    c.polygon([(x + w - 206, y + 90), (x + w - 138, y + 78), (x + w - 192, y + 130)], fill=ACCENT)
    c.polygon([(x + 400, y + 132), (x + 290, y + 86), (x + 386, y + 160)], fill=blend(ACCENT, SURFACE, 0.25))
    c.polygon([(x + 438, y + 126), (x + 350, y + 202), (x + 464, y + 150)], fill=blend(ACCENT, SURFACE, 0.18))


def album_art(c, box):
    x, y, w, h = box
    c.rr((x, y, x + w, y + h), 34, fill=(224, 228, 231))
    c.rect((x + 16, y + 16, x + w - 16, y + h - 16), fill=(33, 52, 58))
    c.ellipse((x + w * 0.12, y + h * 0.18, x + w * 0.88, y + h * 0.94), fill=(48, 77, 84))
    c.ellipse((x + w * 0.34, y + h * 0.34, x + w * 0.66, y + h * 0.66), fill=(217, 190, 128))
    for i in range(7):
        c.arc((x + 80 + i * 18, y + 80 + i * 18, x + w - 80 - i * 18, y + h - 80 - i * 18), 30, 300, fill=(231, 236, 237), width=2)


def cooking_thumb(c, box, kind=0):
    x, y, w, h = box
    c.rr((x, y, x + w, y + h), 22, fill=(240, 237, 232))
    c.rect((x + 14, y + 14, x + w - 14, y + h - 14), fill=(236, 231, 224))
    c.ellipse((x + w * 0.2, y + h * 0.34, x + w * 0.66, y + h * 0.88), fill=(224, 223, 216))
    c.ellipse((x + w * 0.28, y + h * 0.42, x + w * 0.58, y + h * 0.75), fill=(191, 133, 90) if kind == 0 else (220, 194, 142))
    c.rect((x + w * 0.66, y + h * 0.44, x + w * 0.88, y + h * 0.72), fill=(200, 211, 197))


def cafe_view(c, box):
    x, y, w, h = box
    c.rect((x, y, x + w, y + h), fill=(229, 226, 220))
    c.rect((x + 0, y + h * 0.58, x + w, y + h), fill=(195, 181, 164))
    c.ellipse((x + w * 0.18, y + h * 0.48, x + w * 0.5, y + h * 0.78), fill=(245, 244, 240), outline=(206, 198, 188), width=3)
    c.ellipse((x + w * 0.25, y + h * 0.54, x + w * 0.43, y + h * 0.71), fill=(142, 105, 82))
    c.rect((x + w * 0.58, y + h * 0.42, x + w * 0.86, y + h * 0.78), fill=(238, 239, 237))
    c.line([(x + w * 0.6, y + h * 0.55), (x + w * 0.84, y + h * 0.55)], fill=(194, 199, 198), width=3)
    c.line([(x + 60, y + 52), (x + 170, y + 52)], fill=(255, 255, 255), width=5)
    c.line([(x + 60, y + 52), (x + 60, y + 162)], fill=(255, 255, 255), width=5)
    c.line([(x + w - 60, y + 52), (x + w - 170, y + 52)], fill=(255, 255, 255), width=5)
    c.line([(x + w - 60, y + 52), (x + w - 60, y + 162)], fill=(255, 255, 255), width=5)


def map_scene(c, box, car=False):
    x, y, w, h = box
    c.rect((x, y, x + w, y + h), fill=(239, 243, 244))
    for i in range(7):
        bx = x + 40 + (i % 4) * 230
        by = y + 44 + (i // 4) * 190
        c.rect((bx, by, bx + 120, by + 92), fill=(224, 229, 231), outline=(215, 221, 224))
    c.line([(x + 30, y + h * 0.62), (x + w - 30, y + h * 0.28)], fill=(255, 255, 255), width=44)
    c.line([(x + 30, y + h * 0.62), (x + w - 30, y + h * 0.28)], fill=(203, 214, 218), width=4)
    c.line([(x + w * 0.2, y + 30), (x + w * 0.48, y + h - 30)], fill=(255, 255, 255), width=34)
    c.line([(x + w * 0.2, y + 30), (x + w * 0.48, y + h - 30)], fill=(203, 214, 218), width=3)
    c.text((x + 96, y + 95), "성북로", 20, MUTED)
    c.text((x + w - 230, y + 120), "도서관", 20, MUTED)
    c.text((x + 580, y + h - 92), "공원", 20, MUTED)
    if car:
        cx, cy = x + w * 0.56, y + h * 0.49
        c.rr((cx - 38, cy - 20, cx + 38, cy + 20), 12, fill=ACCENT)
        c.ellipse((cx - 30, cy + 12, cx - 12, cy + 30), fill=(49, 56, 62))
        c.ellipse((cx + 12, cy + 12, cx + 30, cy + 30), fill=(49, 56, 62))


def draw_graph_axes(c, x, y, w, h):
    c.line([(x, y + h), (x + w, y + h)], LINE, 2)
    for i in range(4):
        yy = y + h - i * h / 3
        c.line([(x, yy), (x + w, yy)], (235, 238, 241), 1)


def bank_next(c):
    header(c, "이체 확인", "모아은행")
    c.rr((70, 170, 1010, 294), 28)
    small_label(c, (104, 196), "출금 가능 잔액")
    money(c, (104, 230), "1,248,300원")
    c.rr((70, 326, 1010, 532), 28)
    small_label(c, (104, 356), "받는 사람")
    c.text((104, 395), "김서연", 36, INK, True)
    c.text((104, 443), "국민 123-45-6789", 24, MUTED)
    c.line([(104, 482), (976, 482)], SOFT, 2)
    small_label(c, (104, 506), "보낼 금액")
    money(c, (800, 494), "45,000원", 30)


def bank_account(c):
    header(c, "최근 보낸 사람", "모아은행 송금")
    names = ["지민", "서연", "현우", "민서", "준호"]
    for i, name in enumerate(names):
        x = 116 + i * 188
        c.ellipse((x, 190, x + 104, 294), fill=(218, 225, 228), outline=(205, 214, 218), width=2)
        c.ellipse((x + 32, 220, x + 72, 260), fill=(188, 164, 145))
        c.arc((x + 23, 210, x + 81, 269), 200, 340, fill=(75, 84, 90), width=8)
        c.text((x + 52, 322), name, 24, INK, True, anchor="mm")
        c.text((x + 52, 354), "최근 송금", 18, MUTED, anchor="mm")
    c.rr((70, 430, 1010, 560), 26)
    c.text((104, 468), "오늘 보낸 금액", 24, MUTED)
    money(c, (104, 505), "82,000원")


def shop_card(c):
    header(c, "겨울 아우터", "오늘의 추천 상품")
    coat_photo(c, (70, 168, 430, 300), (164, 174, 178))
    coat_photo(c, (580, 168, 430, 300), (128, 145, 150))
    c.text((90, 492), "울 더블 코트", 28, INK, True)
    c.text((90, 532), "128,000원", 26, ACCENT_DARK, True)
    c.text((600, 492), "패딩 하프 점퍼", 28, INK, True)
    c.text((600, 532), "96,000원", 26, ACCENT_DARK, True)


def shop_cart(c):
    header(c, "울 싱글 코트", "상품 상세")
    coat_photo(c, (70, 158, 500, 390), (158, 166, 171))
    c.text((620, 188), "클래식 울 싱글 코트", 34, INK, True)
    star_row(c, 620, 242)
    c.text((770, 244), "4.8  후기 132개", 22, MUTED)
    money(c, (620, 306), "128,000원", 40)
    c.text((620, 374), "겉감 울 70%", 22, MUTED)
    c.text((620, 408), "차분한 차콜 색상", 22, MUTED)
    c.line([(620, 466), (980, 466)], SOFT, 2)
    c.text((620, 500), "배송 예정 9월 24일", 22, MUTED)


def food_swipe(c):
    header(c, "근처 맛집", "오늘 도착 가능한 가게")
    for i, (title, time, soup) in enumerate([("한그릇 찌개집", "28분", True), ("담백한 분식", "35분", False)]):
        y = 168 + i * 194
        food_photo(c, (70, y, 260, 150), soup)
        c.text((365, y + 18), title, 30, INK, True)
        c.text((365, y + 62), f"배달 예상 {time}", 23, MUTED)
        c.text((365, y + 100), "최소 주문 9,000원", 21, MUTED)
        c.line([(70, y + 176), (1010, y + 176)], SOFT, 2)


def food_option(c):
    header(c, "김치찌개 정식", "메뉴 정보")
    food_photo(c, (70, 166, 462, 320), True)
    c.text((580, 196), "돼지고기 김치찌개", 34, INK, True)
    c.text((580, 248), "기본 가격", 23, MUTED)
    money(c, (580, 286), "8,500원", 38)
    c.line([(580, 354), (980, 354)], SOFT, 2)
    c.text((580, 390), "공깃밥 포함", 23, MUTED)
    c.text((580, 426), "맵기 기본", 23, MUTED)


def map_pin(c):
    header(c, "주변 지도", "핀 없는 지도 화면")
    map_scene(c, (70, 160, 940, 450), False)


def taxi_start(c):
    header(c, "주변 택시", "현재 도로 상황")
    map_scene(c, (70, 154, 940, 468), True)


def stay_date(c):
    header(c, "숙소 정보", "예약 가능한 객실")
    room_photo(c, (70, 158, 560, 360))
    c.text((680, 190), "북촌 레지던스", 34, INK, True)
    star_row(c, 680, 244)
    c.text((830, 246), "4.7", 22, MUTED)
    c.text((680, 304), "디럭스 더블룸", 24, MUTED)
    c.text((680, 340), "서울 종로구", 24, MUTED)
    c.line([(680, 416), (980, 416)], SOFT, 2)
    c.text((680, 450), "1박 평균 142,000원", 24, ACCENT_DARK, True)


def air_trip(c):
    header(c, "항공권", "도시를 잇는 여정")
    plane_photo(c, (70, 160, 940, 300))
    c.text((120, 512), "서울 ICN", 34, INK, True)
    c.line([(315, 536), (755, 536)], ACCENT, 4)
    c.text((790, 512), "제주 CJU", 34, INK, True)
    c.text((120, 562), "9월 28일 월요일", 22, MUTED)


def music_cover(c):
    header(c, "지금 듣는 음악", "앨범 정보")
    album_art(c, (70, 160, 420, 420))
    c.text((550, 226), "밤의 공방", 42, INK, True)
    c.text((552, 282), "윤하린", 28, MUTED)
    c.line([(552, 356), (960, 356)], SOFT, 2)
    c.text((552, 390), "잔잔한 어쿠스틱", 23, MUTED)
    c.text((552, 426), "2026 싱글", 23, MUTED)


def video_play(c):
    header(c, "요리 영상", "재생 표시 없는 목록")
    cooking_thumb(c, (70, 166, 420, 236), 0)
    cooking_thumb(c, (590, 166, 420, 236), 1)
    c.text((70, 430), "집밥 김치볶음밥", 28, INK, True)
    c.text((70, 468), "12분  ·  오늘의 부엌", 21, MUTED)
    c.text((590, 430), "따뜻한 수프 만들기", 28, INK, True)
    c.text((590, 468), "9분  ·  작은 식탁", 21, MUTED)


def book_page(c):
    c.rect((0, 0, W, H), fill=(238, 235, 226))
    c.rr((98, 56, 982, 622), 16, fill=PAPER, outline=(225, 219, 207))
    c.text((156, 112), "마지막 등불", 34, INK, True)
    paragraphs = [
        "오래된 공방의 문이 닫히자 거리의 소리는 천천히 멀어졌다.",
        "노인은 손바닥 위의 작은 물건을 한참 바라보다가 고개를 끄덕였다.",
        "빛은 크지 않았지만, 나무 상판 위의 흠집마다 조용한 그림자를 남겼다.",
        "처음 보는 사람에게는 낯선 물건이었고, 오래 쓴 사람에게는 익숙한 약속이었다.",
        "그는 말없이 창가 쪽 의자를 당겨 놓고, 다시 등불의 심지를 낮추었다.",
        "어둠은 방을 채웠지만, 필요한 곳만은 충분히 밝았다.",
        "그리고 그 작은 차이가 모든 사용법의 시작이었다.",
    ]
    y = 178
    for line in paragraphs:
        c.text((156, y), line, 22, (72, 75, 78))
        y += 54


def photo_slider(c):
    header(c, "사진 보정", "따뜻한 색감의 풍경")
    mountain_photo(c, (70, 152, 940, 470), True)


def camera_lock(c):
    c.rect((0, 0, W, H), fill=(218, 218, 214))
    cafe_view(c, (0, 0, W, H))
    c.text((70, 54), "카메라", 32, (255, 255, 255), True)
    c.text((70, 98), "카페 테이블", 21, (245, 245, 245))


def msg_status(c):
    header(c, "민지", "메신저 대화")
    bubbles = [
        (110, 180, 520, 244, "오늘 자료 봤어?", (237, 239, 241), INK),
        (570, 272, 970, 336, "응, 화면 위쪽만 남겼어.", blend(ACCENT, SURFACE, 0.75), INK),
        (110, 364, 610, 428, "좋아. 버튼은 비워두자.", (237, 239, 241), INK),
        (570, 456, 940, 520, "수업에서 붙이면 되겠다.", blend(ACCENT, SURFACE, 0.75), INK),
    ]
    for box in bubbles:
        x0, y0, x1, y1, text, fill, color = box
        c.rr((x0, y0, x1, y1), 26, fill=fill)
        c.text((x0 + 26, y0 + 19), text, 24, color)
    c.text((456, 548), "오후 2:18", 19, MUTED)


def mail_archive(c):
    header(c, "받은 편지함", "새 편지 3개")
    rows = [
        ("성신 도서관", "예약 도서가 준비되었습니다", "오전 9:12"),
        ("수업 공지", "이번 주 실습 안내", "오전 10:04"),
        ("작은 공방", "수리 의뢰 접수 내역", "오후 1:37"),
    ]
    y = 174
    for sender, subject, time in rows:
        c.text((86, y), sender, 24, INK, True)
        c.text((86, y + 38), subject, 24, MUTED)
        c.text((890, y + 6), time, 19, MUTED)
        c.line([(70, y + 94), (1010, y + 94)], SOFT, 2)
        y += 122


def cal_drag(c):
    header(c, "9월 셋째 주", "주간 달력")
    days = ["월", "화", "수", "목", "금", "토", "일"]
    x0, y0, cw = 160, 170, 118
    for i, day in enumerate(days):
        c.text((x0 + i * cw + cw / 2, y0), day, 22, INK, True, anchor="mm")
        c.text((x0 + i * cw + cw / 2, y0 + 34), str(21 + i), 21, MUTED, anchor="mm")
    for t in range(5):
        y = 242 + t * 78
        c.text((78, y - 10), f"{9 + t}:00", 18, MUTED)
        c.line([(150, y), (1010, y)], (228, 233, 236), 2)
    for i in range(8):
        x = 150 + i * cw
        c.line([(x, 226), (x, 560)], (236, 239, 242), 1)


def todo_check(c):
    header(c, "오늘", "할 일 앱 상단")
    c.rr((70, 170, 1010, 352), 30)
    c.text((110, 210), "2026년 9월 21일", 34, INK, True)
    c.text((110, 260), "월요일 · 맑음", 25, MUTED)
    c.ellipse((826, 198, 930, 302), fill=(235, 199, 106))
    for angle in range(0, 360, 45):
        cx, cy = 878, 250
        c.line([(cx, cy), (cx + math.cos(math.radians(angle)) * 76, cy + math.sin(math.radians(angle)) * 76)], (235, 199, 106), 3)
    c.text((110, 422), "집중 시간", 24, MUTED)
    c.text((110, 462), "오전 10:00 - 12:00", 28, INK, True)


def memo_title(c):
    header(c, "메모", "빈 종이")
    c.rr((160, 158, 920, 604), 20, fill=PAPER, outline=(224, 218, 208))
    c.text((210, 210), "2026. 9. 21.", 24, MUTED)
    for y in [282, 340, 398, 456, 514]:
        c.line([(210, y), (870, y)], (230, 225, 216), 2)


def fit_start(c):
    header(c, "이번 주 운동", "기록 요약")
    c.rr((70, 166, 1010, 566), 30)
    c.text((110, 208), "운동 시간", 28, INK, True)
    c.text((110, 248), "총 4시간 20분", 24, MUTED)
    x, y, w, h = 140, 338, 760, 150
    labels = ["월", "화", "수", "목", "금", "토", "일"]
    vals = [72, 40, 110, 55, 96, 130, 80]
    for i, val in enumerate(vals):
        bx = x + i * 104
        c.rr((bx, y + h - val, bx + 48, y + h), 12, fill=blend(ACCENT, SURFACE, 0.15))
        c.text((bx + 24, y + h + 34), labels[i], 18, MUTED, anchor="mm")


def health_dot(c):
    header(c, "걸음 수", "최근 7일")
    c.rr((70, 166, 1010, 566), 30)
    draw_graph_axes(c, 150, 248, 780, 230)
    pts = [(150, 424), (280, 380), (410, 398), (540, 312), (670, 338), (800, 270), (930, 298)]
    c.line(pts, ACCENT, 6)
    for x, y in pts:
        c.ellipse((x - 10, y - 10, x + 10, y + 10), fill=ACCENT_DARK)
    c.text((120, 206), "평균 7,820걸음", 30, INK, True)
    c.text((120, 510), "월  화  수  목  금  토  일", 20, MUTED)


def calm_play(c):
    c.rect((0, 0, W, H), fill=(230, 235, 236))
    c.rect((0, 0, W, 675), fill=(222, 231, 232))
    c.rect((0, 386, W, 675), fill=(204, 217, 219))
    for i in range(7):
        y = 420 + i * 32
        c.arc((120 - i * 20, y, 960 + i * 20, y + 68), 0, 180, blend(ACCENT, SURFACE, 0.45), 3)
    c.polygon([(0, 330), (220, 210), (460, 330)], fill=(196, 207, 207))
    c.polygon([(370, 340), (650, 185), (920, 340)], fill=(184, 199, 200))
    c.text((70, 58), "호수 명상", 36, (48, 66, 70), True)
    c.text((70, 106), "안개 낀 아침", 23, (88, 104, 108))


def learn_choice(c):
    header(c, "문제 7", "학습 퀴즈")
    c.rr((70, 176, 1010, 216), 18, fill=(235, 239, 241))
    c.rr((70, 176, 540, 216), 18, fill=blend(ACCENT, SURFACE, 0.18))
    c.text((70, 272), "다음 설명에 맞는 개념은?", 36, INK, True)
    c.text((70, 334), "사용자가 무엇을 할 수 있는지 알려주는 시각적 단서", 28, MUTED)
    c.text((70, 442), "진도 46%", 23, ACCENT_DARK, True)


def lang_record(c):
    header(c, "오늘의 단어", "발음 카드")
    c.rr((150, 166, 930, 548), 34)
    c.text((540, 250), "listen", 66, INK, True, anchor="mm")
    c.text((540, 324), "[ˈlɪsən]", 32, ACCENT_DARK, anchor="mm")
    c.text((540, 390), "듣다, 귀 기울이다", 28, MUTED, anchor="mm")
    c.line([(260, 452), (820, 452)], SOFT, 2)
    c.text((540, 496), "예문  I listen to the rain.", 22, MUTED, anchor="mm")


def news_tag(c):
    header(c, "오늘의 기사", "서울일보")
    mountain_photo(c, (70, 160, 420, 270), False)
    c.text((540, 182), "오래된 시장에 새 조명이 켜졌다", 34, INK, True)
    c.text((540, 246), "서울일보 · 사회", 23, MUTED)
    c.text((540, 300), "퇴근길 시민들이 밝아진 골목을 지나며\n상점가의 변화를 체감하고 있다.", 23, (77, 84, 90))
    c.line([(70, 486), (1010, 486)], SOFT, 2)
    c.text((70, 524), "편집국 주요 기사", 23, MUTED)


def comm_like(c):
    header(c, "동네 게시판", "오늘 올라온 글")
    mountain_photo(c, (70, 160, 940, 270), True)
    c.text((90, 464), "오늘 노을이 유난히 예뻤어요.", 30, INK, True)
    c.text((90, 506), "혜화동 산책길에서 찍은 사진입니다.", 24, MUTED)
    c.text((90, 552), "작성자  나무늘보", 20, MUTED)


def sns_profile(c):
    header(c, "소연", "피드")
    mountain_photo(c, (160, 156, 760, 390), True)
    c.text((160, 584), "ssoyeon.day", 24, INK, True)
    c.text((320, 584), "늦은 오후의 산책", 24, MUTED)


def sns_comment(c):
    header(c, "댓글", "먼저 달린 이야기")
    rows = [
        ("민지", "색감이 정말 따뜻하다."),
        ("하린", "저 골목 나도 가 본 것 같아."),
        ("도윤", "등불 켜진 시간이 제일 예쁘네."),
    ]
    y = 178
    for name, body in rows:
        c.ellipse((82, y, 138, y + 56), fill=(218, 225, 228))
        c.text((162, y + 2), name, 23, INK, True)
        c.text((162, y + 38), body, 24, MUTED)
        c.line([(162, y + 92), (1010, y + 92)], SOFT, 2)
        y += 126


def story_tap(c):
    mountain_photo(c, (0, 0, W, H), True)
    c.rect((0, 0, W, 160), fill=(0, 0, 0))
    c.rect((0, 160, W, H), fill=None)
    overlay = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle((0, 0, W * S, s(180)), fill=(0, 0, 0, 70))
    c.image = Image.alpha_composite(c.image.convert("RGBA"), overlay).convert("RGB")
    c.draw = ImageDraw.Draw(c.image)
    c.text((70, 54), "여행 기록", 34, (255, 255, 255), True)
    c.text((70, 100), "부산 바닷길", 22, (234, 238, 240))


def set_toggle(c):
    header(c, "설정", "구분선만 있는 상단")
    sections = ["계정", "알림", "화면", "개인정보"]
    y = 180
    for title in sections:
        c.text((86, y), title, 27, INK, True)
        c.line([(70, y + 56), (1010, y + 56)], SOFT, 2)
        y += 94


def perm_allow(c):
    header(c, "위치 권한 안내", "근처 정보를 위한 설명")
    c.rr((260, 174, 820, 454), 34)
    map_scene(c, (300, 208, 480, 160), False)
    c.text((540, 412), "내 주변 장소를 보여드려요", 30, INK, True, anchor="mm")
    c.text((540, 462), "현재 위치를 기준으로 가까운 가게와 길을 정리합니다.", 23, MUTED, anchor="mm")


def sub_trial(c):
    header(c, "구독 안내", "요금제와 혜택")
    c.rr((70, 160, 1010, 520), 30)
    c.text((110, 204), "스탠더드", 28, INK, True)
    c.text((430, 204), "프로", 28, INK, True)
    c.text((720, 204), "팀", 28, INK, True)
    c.line([(110, 252), (970, 252)], SOFT, 2)
    rows = [("월 요금", "7,900원", "12,900원", "24,000원"), ("저장 공간", "10GB", "50GB", "200GB"), ("공유 인원", "1명", "3명", "8명")]
    y = 294
    for row in rows:
        for i, txt in enumerate(row):
            c.text((110 + i * 300, y), txt, 23, MUTED if i == 0 else INK, bold=i > 0)
        y += 64


def sub_cancel(c):
    header(c, "구독 관리", "현재 이용 중인 요금제")
    c.rr((70, 170, 1010, 376), 30)
    c.text((110, 214), "현재 요금제", 24, MUTED)
    c.text((110, 258), "프로 월간", 38, INK, True)
    c.text((110, 318), "저장 공간 50GB · 공유 인원 3명", 24, MUTED)
    c.rr((70, 414, 1010, 548), 28)
    c.text((110, 452), "다음 결제일", 24, MUTED)
    c.text((110, 494), "2026년 10월 21일", 32, ACCENT_DARK, True)


def login_error(c):
    header(c, "환영합니다", "로그인 화면 상단")
    c.ellipse((452, 184, 628, 360), fill=blend(ACCENT, SURFACE, 0.1))
    c.ellipse((496, 228, 584, 316), fill=SURFACE)
    c.text((540, 430), "다시 만나 반가워요", 38, INK, True, anchor="mm")
    c.text((540, 486), "오늘도 조용히 이어서 시작해요.", 24, MUTED, anchor="mm")


def join_rule(c):
    header(c, "회원가입", "진행 단계")
    stages = ["약관", "정보", "확인", "완료"]
    x0, y = 210, 260
    c.line([(x0, y), (870, y)], LINE, 5)
    for i, stage in enumerate(stages):
        x = x0 + i * 220
        fill = ACCENT if i <= 1 else (229, 233, 237)
        c.ellipse((x - 22, y - 22, x + 22, y + 22), fill=fill)
        c.text((x, y + 58), stage, 24, INK if i <= 1 else MUTED, True, anchor="mm")
    c.text((540, 406), "2단계  기본 정보", 34, INK, True, anchor="mm")
    c.text((540, 456), "입력 영역은 아래 화면에 이어집니다.", 23, MUTED, anchor="mm")


def file_upload(c):
    header(c, "파일", "최근 항목")
    items = [("강의자료", "폴더"), ("과제초안.pdf", "문서"), ("발표이미지", "폴더"), ("회의기록.txt", "문서")]
    y = 178
    for name, kind in items:
        if kind == "폴더":
            c.rect((86, y + 10, 146, y + 56), fill=(225, 217, 190))
            c.rect((86, y, 126, y + 20), fill=(215, 205, 176))
        else:
            c.rect((88, y, 140, y + 66), fill=SURFACE, outline=LINE, width=2)
            c.line([(100, y + 22), (128, y + 22)], LINE, 2)
            c.line([(100, y + 38), (128, y + 38)], LINE, 2)
        c.text((174, y + 6), name, 26, INK, True)
        c.text((174, y + 42), kind, 21, MUTED)
        c.line([(70, y + 90), (1010, y + 90)], SOFT, 2)
        y += 112


def cloud_sync(c):
    header(c, "클라우드 저장공간", "용량 현황")
    c.rr((70, 176, 1010, 406), 30)
    c.text((110, 222), "사용 중", 24, MUTED)
    c.text((110, 268), "38.4GB", 42, INK, True)
    c.text((290, 282), "/ 100GB", 26, MUTED)
    c.rr((110, 342, 930, 374), 16, fill=(235, 239, 241))
    c.rr((110, 342, 426, 374), 16, fill=blend(ACCENT, SURFACE, 0.1))
    c.text((110, 470), "남은 용량 61.6GB", 28, ACCENT_DARK, True)


def coupon_apply(c):
    header(c, "예약 결제", "숙소와 날짜")
    room_photo(c, (70, 160, 420, 280))
    c.text((540, 186), "북촌 레지던스", 34, INK, True)
    c.text((540, 240), "9월 28일 - 9월 29일", 26, MUTED)
    c.text((540, 294), "성인 2명 · 디럭스 더블룸", 24, MUTED)
    c.line([(540, 368), (980, 368)], SOFT, 2)
    c.text((540, 408), "예약 금액", 23, MUTED)
    money(c, (540, 446), "142,000원", 38)


def pay_final(c):
    header(c, "결제", "주문한 상품")
    coat_photo(c, (70, 160, 360, 300), (158, 166, 171))
    c.text((480, 190), "울 싱글 코트", 34, INK, True)
    c.text((480, 246), "수량 1개", 26, MUTED)
    c.text((480, 298), "색상 차콜 · 사이즈 M", 24, MUTED)
    c.line([(480, 372), (980, 372)], SOFT, 2)
    c.text((480, 414), "상품 금액", 23, MUTED)
    money(c, (480, 452), "128,000원", 38)


SCENES = {
    "bank-next.webp": bank_next,
    "bank-account.webp": bank_account,
    "shop-card.webp": shop_card,
    "shop-cart.webp": shop_cart,
    "food-swipe.webp": food_swipe,
    "food-option.webp": food_option,
    "map-pin.webp": map_pin,
    "taxi-start.webp": taxi_start,
    "stay-date.webp": stay_date,
    "air-trip.webp": air_trip,
    "music-cover.webp": music_cover,
    "video-play.webp": video_play,
    "book-page.webp": book_page,
    "photo-slider.webp": photo_slider,
    "camera-lock.webp": camera_lock,
    "msg-status.webp": msg_status,
    "mail-archive.webp": mail_archive,
    "cal-drag.webp": cal_drag,
    "todo-check.webp": todo_check,
    "memo-title.webp": memo_title,
    "fit-start.webp": fit_start,
    "health-dot.webp": health_dot,
    "calm-play.webp": calm_play,
    "learn-choice.webp": learn_choice,
    "lang-record.webp": lang_record,
    "news-tag.webp": news_tag,
    "comm-like.webp": comm_like,
    "sns-profile.webp": sns_profile,
    "sns-comment.webp": sns_comment,
    "story-tap.webp": story_tap,
    "set-toggle.webp": set_toggle,
    "perm-allow.webp": perm_allow,
    "sub-trial.webp": sub_trial,
    "sub-cancel.webp": sub_cancel,
    "login-error.webp": login_error,
    "join-rule.webp": join_rule,
    "file-upload.webp": file_upload,
    "cloud-sync.webp": cloud_sync,
    "coupon-apply.webp": coupon_apply,
    "pay-final.webp": pay_final,
}


def main():
    out_dir = Path.cwd() / "public" / "norman" / "img" / "jobs"
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, scene in SCENES.items():
        c = Canvas()
        scene(c)
        c.save(out_dir / name)
        print(name)


if __name__ == "__main__":
    main()

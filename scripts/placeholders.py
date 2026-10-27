"""Generates the placeholder scan photos in public/placeholders/.

The real scope photos are someone's own skin and stay out of the repo (see the
README), so each scan gets made-up close-ups instead, one per light (daylight,
polarized, UV), all from the same surface: a skin tone per person,
fine surface lines, pores, a few hairs and the scope's soft lighting. Lower Calm
adds a faint flush and lower Clarity a few brown marks, so a placeholder moves
with its scan's scores. Nothing here comes from a real photo.

Run from the repo root:  python3 scripts/placeholders.py
Needs numpy and Pillow.
"""

import json
import zlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "placeholders"
W, H = 480, 640

# Each person's tone, light to shadow, from their original placeholders.
TONES = {
    "noor": ("#e3b895", "#c99470"),
    "maya": ("#f3d6c4", "#e2b49a"),
    "jordan": ("#c68e6a", "#a86f4d"),
    "sam": ("#8d5a3b", "#6e4329"),
}


def rgb(hex_: str) -> np.ndarray:
    return np.array([int(hex_[i : i + 2], 16) for i in (1, 3, 5)], dtype=np.float32)


def blurred_noise(rng: np.random.Generator, radius: float) -> np.ndarray:
    """Smooth noise in 0..1: random grey, blurred, then stretched back out."""
    img = Image.fromarray((rng.random((H, W)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius))
    a = np.asarray(img, dtype=np.float32)
    return (a - a.min()) / max(1.0, a.max() - a.min())


def furrows(rng: np.random.Generator, count: int = 320, blur: float = 1.1) -> np.ndarray:
    """Skin's fine criss-cross lines: two families of wavy strokes, softened."""
    img = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(img)
    for angle in (rng.uniform(20, 40), rng.uniform(-60, -40)):
        t = np.radians(angle)
        dx, dy = np.cos(t), np.sin(t)
        for _ in range(count):
            x, y = rng.uniform(-W * 0.2, W * 1.2), rng.uniform(-H * 0.2, H * 1.2)
            length = rng.uniform(40, 160)
            pts = []
            for k in range(12):
                s = length * k / 11
                wob = 3 * np.sin(s / 14 + rng.uniform(0, 6))
                pts.append((x + dx * s - dy * wob, y + dy * s + dx * wob))
            d.line(pts, fill=int(rng.uniform(90, 200)), width=1)
    return np.asarray(img.filter(ImageFilter.GaussianBlur(blur)), dtype=np.float32) / 255


def dots(rng: np.random.Generator, count: int, r: tuple[float, float], blur: float) -> np.ndarray:
    img = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(img)
    for _ in range(count):
        x, y, rad = rng.uniform(0, W), rng.uniform(0, H), rng.uniform(*r)
        d.ellipse((x - rad, y - rad, x + rad, y + rad), fill=int(rng.uniform(120, 255)))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(blur)), dtype=np.float32) / 255


def hairs(rng: np.random.Generator, count: int) -> np.ndarray:
    img = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(img)
    for _ in range(count):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        a, length, bend = rng.uniform(0, np.pi), rng.uniform(80, 220), rng.uniform(-0.004, 0.004)
        pts = []
        for k in range(20):
            s = length * k / 19
            ang = a + bend * s
            pts.append((x + np.cos(ang) * s, y + np.sin(ang) * s))
        d.line(pts, fill=230, width=2)
    return np.asarray(img.filter(ImageFilter.GaussianBlur(0.7)), dtype=np.float32) / 255


def make(person: str, scan: dict) -> dict[str, Image.Image]:
    """The scan under each of the scope's three lights, from one shared surface."""
    rng = np.random.default_rng(zlib.crc32(scan["id"].encode()))
    light, shadow = (rgb(c) for c in TONES[person])
    scores = scan["scores"]
    calm = scores.get("redness") or 75
    clarity = scores.get("pigmentation") or 75
    oil = scores.get("oiliness")
    area = scan["area"].lower()

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # The scope's light: brighter toward the upper left, falling off at the corners.
    lit = 1 - np.clip(((xx / W - 0.38) ** 2 + (yy / H - 0.36) ** 2) ** 0.5 * 1.25, 0, 1) ** 1.6
    base = shadow * 0.82 + (light - shadow * 0.82) * lit[..., None]

    # Mottling at two sizes, then a flush (lower Calm) and brown marks (lower Clarity).
    base *= (0.9 + 0.12 * blurred_noise(rng, 45) + 0.06 * blurred_noise(rng, 12))[..., None]
    flush = blurred_noise(rng, 60) * np.clip((80 - calm) / 40, 0, 1)
    marks = dots(rng, int(np.clip((78 - clarity) / 4, 0, 8)), (4, 11), 3)

    # Surface: fine lines, pores (more on chin and back), the odd hair on body skin.
    # The skin's surface relief: a soft shadow under each line and a lit edge beside it.
    lines = furrows(rng) * 0.7 + furrows(rng, 600, 0.7) * 0.5
    shifted = np.roll(np.roll(lines, 1, axis=0), 1, axis=1)
    relief = -lines * 26 + np.clip(shifted - lines, 0, 1) * 14
    pore_count = 420 if "chin" in area or "back" in area else 260
    pores = dots(rng, pore_count, (0.9, 1.9), 1.1)
    glare = dots(rng, 140, (2, 6), 3.5)  # tiny highlights where skin catches the light
    hair = np.zeros((H, W), np.float32)
    hair_tint = np.array([90, 78, 70], dtype=np.float32)
    if any(k in area for k in ("forearm", "back", "jaw")):
        hair = hairs(rng, int(rng.integers(2, 5)))
    elif rng.random() < 0.35:
        hair = hairs(rng, 1)
        hair_tint = np.array([55, 48, 44], dtype=np.float32)
    grain = rng.normal(0, 2.2, (H, W))
    # Porphyrins in the pores glow orange-red under UV; oilier skin, more of them.
    glow_count = int(np.clip((70 - (oil if oil is not None else 60)) * 2 + 30, 15, 90))
    porphyrins = dots(rng, glow_count, (1.2, 2.6), 1.4)
    sebum = blurred_noise(rng, 30) * np.clip((70 - (oil if oil is not None else 60)) / 40, 0.15, 1)

    def finish(a: np.ndarray, blur: float = 0.4) -> Image.Image:
        a = a + grain[..., None]
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB").filter(ImageFilter.GaussianBlur(blur))

    # Daylight: the surface as the eye sees it, glare and all.
    day = base + flush[..., None] * np.array([28, -6, -8], dtype=np.float32)
    day -= marks[..., None] * np.array([38, 46, 44], dtype=np.float32)
    day += relief[..., None]
    day -= pores[..., None] * 22
    day += glare[..., None] * 9
    day -= hair[..., None] * hair_tint

    # Polarized: the glare is filtered out, so the surface goes flat and matte,
    # and redness and pigment under it show up more strongly.
    pol = (base * 0.94 + base.mean(axis=(0, 1)) * 0.06) * np.array([1.0, 0.98, 0.97], dtype=np.float32)
    pol += flush[..., None] * np.array([38, -10, -10], dtype=np.float32)
    pol -= marks[..., None] * np.array([64, 74, 70], dtype=np.float32)
    pol += relief[..., None] * 0.35
    pol -= pores[..., None] * 12
    pol -= hair[..., None] * hair_tint * 0.8

    # UV (365 nm): the skin goes dark violet, pigment darker still, and oil
    # and porphyrins fluoresce.
    lum = (day.mean(axis=2) - 60) / 180
    uv = np.stack([lum * 44 + 20, lum * 34 + 16, lum * 86 + 46], axis=2)
    uv -= marks[..., None] * np.array([26, 18, 46], dtype=np.float32)
    uv += sebum[..., None] * np.array([18, 26, 34], dtype=np.float32)
    uv += porphyrins[..., None] * np.array([250, 130, 20], dtype=np.float32)

    return {"": finish(day), "-polarized": finish(pol, 0.6), "-uva": finish(uv, 0.5)}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    made = 0
    for person in TONES:
        report = json.loads((ROOT / "data" / "reports" / f"{person}.json").read_text())
        for scan in report["scans"]:
            if not scan.get("photoUrl"):
                continue  # The upload failed; the app says so instead of showing a photo.
            for suffix, img in make(person, scan).items():
                img.save(OUT / f"{scan['id']}{suffix}.jpg", quality=82, optimize=True, progressive=True)
                made += 1
    print(f"{made} placeholders in {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

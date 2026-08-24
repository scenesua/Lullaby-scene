from __future__ import annotations

import argparse
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

WIDTH, HEIGHT, FPS, SECONDS = 1280, 720, 30, 10
FRAMES = FPS * SECONDS
TAU = math.tau


def soft_mask(draw_fn, blur=14):
    image = Image.new("L", (WIDTH, HEIGHT), 0)
    draw_fn(ImageDraw.Draw(image))
    if blur:
        image = image.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(image, dtype=np.float32) / 255.0


def ellipse_mask(box, blur=12):
    return soft_mask(lambda draw: draw.ellipse(box, fill=255), blur)


def polygon_mask(points, blur=12):
    return soft_mask(lambda draw: draw.polygon(points, fill=255), blur)


def tint(frame, mask, color, amount):
    alpha = np.clip(mask * amount, 0.0, 1.0)[..., None]
    return frame * (1.0 - alpha) + np.asarray(color, dtype=np.float32) * alpha


def shifted_region(frame, base, mask, dx=0, dy=0):
    shifted = np.roll(base, (dy, dx), axis=(0, 1)).astype(np.float32)
    alpha = mask[..., None]
    return frame * (1.0 - alpha) + shifted * alpha


def particle_layer(seed, phase, mask, count, color, radius=(1, 2), vertical_cycles=1):
    rng = np.random.default_rng(seed)
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for _ in range(count):
        x = float(rng.uniform(0, WIDTH))
        y0 = float(rng.uniform(0, HEIGHT))
        y = (y0 + HEIGHT * vertical_cycles * phase) % HEIGHT
        drift = math.sin(TAU * phase + rng.uniform(0, TAU)) * rng.uniform(2, 9)
        r = int(rng.integers(radius[0], radius[1] + 1))
        a = int(rng.integers(35, 105))
        draw.ellipse((x + drift - r, y - r, x + drift + r, y + r), fill=(*color, a))
    rgba = np.asarray(image, dtype=np.float32)
    rgba[..., 3] *= mask
    return rgba


def composite_rgba(frame, rgba):
    alpha = rgba[..., 3:4] / 255.0
    return frame * (1.0 - alpha) + rgba[..., :3] * alpha


def aircraft(base, phase, masks):
    frame = base.astype(np.float32)
    dx = round(7 * math.sin(TAU * phase))
    frame = shifted_region(frame, base, masks["windows"], dx=dx)
    breath = 0.5 - 0.5 * math.cos(TAU * phase * 2)
    frame = tint(frame, masks["windows"], (32, 82, 140), 0.035 * breath)
    frame = tint(frame, masks["lamps"], (255, 164, 82), 0.10 * breath)
    return frame


def train(base, phase, masks):
    frame = base.astype(np.float32)
    dx = round(14 * math.sin(TAU * phase))
    frame = shifted_region(frame, base, masks["windows"], dx=dx)
    rain = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(rain)
    rng = np.random.default_rng(2408)
    for _ in range(115):
        x = int(rng.uniform(0, WIDTH))
        y = int((rng.uniform(0, HEIGHT) + HEIGHT * 2 * phase) % HEIGHT)
        length = int(rng.uniform(7, 19))
        draw.line((x, y, x - 2, y + length), fill=(155, 190, 214, int(rng.uniform(18, 52))), width=1)
    rgba = np.asarray(rain, dtype=np.float32)
    rgba[..., 3] *= masks["windows"]
    frame = composite_rgba(frame, rgba)
    lamp = 0.5 - 0.5 * math.cos(TAU * phase * 2)
    return tint(frame, masks["lamps"], (255, 177, 92), 0.055 * lamp)


def spacecraft(base, phase, masks):
    frame = base.astype(np.float32)
    angle = 0.42 * math.sin(TAU * phase)
    planet = Image.fromarray(base).rotate(angle, resample=Image.Resampling.BICUBIC, center=(840, 195))
    planet_arr = np.asarray(planet, dtype=np.float32)
    alpha = masks["planet"][..., None]
    frame = frame * (1.0 - alpha) + planet_arr * alpha
    stars = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(stars)
    rng = np.random.default_rng(307)
    for _ in range(70):
        x0, y0 = rng.uniform(45, 1235), rng.uniform(95, 475)
        x = x0 + math.sin(TAU * phase + rng.uniform(0, TAU)) * rng.uniform(0.8, 2.2)
        y = y0 + math.cos(TAU * phase + rng.uniform(0, TAU)) * rng.uniform(0.4, 1.3)
        r = 1
        a = int(rng.uniform(20, 62))
        draw.ellipse((x-r, y-r, x+r, y+r), fill=(178, 216, 255, a))
    rgba = np.asarray(stars, dtype=np.float32)
    rgba[..., 3] *= masks["window"]
    frame = composite_rgba(frame, rgba)
    glow = 0.5 - 0.5 * math.cos(TAU * phase)
    frame = tint(frame, masks["planet_glow"], (72, 142, 232), 0.055 * glow)
    return tint(frame, masks["console"], (70, 165, 238), 0.08 * (0.5 - 0.5 * math.cos(TAU * phase * 2)))


def ferry(base, phase, masks):
    frame = base.astype(np.float32)
    wake = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(wake)
    for band in range(7):
        points = []
        for x in range(420, WIDTH + 20, 16):
            y = 475 + band * 18 + 7 * math.sin(x * 0.021 + TAU * phase + band)
            points.append((x, y))
        draw.line(points, fill=(93, 148, 196, 8 + band), width=1)
    rgba = np.asarray(wake, dtype=np.float32)
    rgba[..., 3] *= masks["water"]
    frame = composite_rgba(frame, rgba)
    return tint(frame, masks["interior"], (236, 151, 77), 0.04 * (0.5 - 0.5 * math.cos(TAU * phase)))


def submarine(base, phase, masks):
    frame = base.astype(np.float32)
    water = base.copy()
    for y in range(75, 535):
        offset = round(4 * math.sin(TAU * phase + y * 0.018))
        water[y] = np.roll(water[y], offset, axis=0)
    alpha = masks["porthole"][..., None]
    frame = frame * (1.0 - alpha) + water.astype(np.float32) * alpha
    particles = particle_layer(511, phase, masks["porthole"], 105, (115, 207, 222), (1, 1), 1)
    frame = composite_rgba(frame, particles)
    fish = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(fish)
    for idx, (y, size, speed) in enumerate([(225, 9, 1), (278, 7, 2), (345, 6, 1)]):
        x = 410 + ((idx * 290 + phase * speed * 760) % 520)
        bob = 5 * math.sin(TAU * phase * speed + idx)
        draw.ellipse((x-size*1.5, y+bob-size/2, x+size, y+bob+size/2), fill=(12, 42, 49, 115))
        draw.polygon([(x-size*1.5, y+bob), (x-size*2.2, y+bob-size*.7), (x-size*2.2, y+bob+size*.7)], fill=(12, 42, 49, 105))
    rgba = np.asarray(fish, dtype=np.float32)
    rgba[..., 3] *= masks["porthole"]
    frame = composite_rgba(frame, rgba)
    caustic = 0.5 - 0.5 * math.cos(TAU * phase)
    return tint(frame, masks["water_glow"], (52, 167, 196), 0.055 * caustic)


def masks_for(scene):
    if scene == "aircraft":
        windows = np.maximum.reduce([
            ellipse_mask((38, 255, 177, 493), 8), ellipse_mask((255, 284, 361, 466), 7),
            ellipse_mask((390, 300, 467, 437), 6), ellipse_mask((490, 310, 548, 415), 5),
            ellipse_mask((558, 316, 605, 401), 4), ellipse_mask((615, 322, 653, 390), 4),
        ])
        return {"windows": windows, "lamps": polygon_mask([(360,45),(780,160),(1010,267),(545,147)], 20)}
    if scene == "train":
        windows = np.maximum.reduce([
            polygon_mask([(0,0),(326,0),(374,414),(131,458),(0,391)], 9),
            polygon_mask([(445,89),(574,150),(597,321),(460,320)], 7),
            polygon_mask([(1075,77),(1280,41),(1280,379),(1110,361)], 8),
        ])
        return {"windows": windows, "lamps": polygon_mask([(425,110),(1045,169),(1035,260),(430,190)], 18)}
    if scene == "spacecraft":
        return {
            "window": polygon_mask([(35,85),(1245,83),(1198,480),(87,480)], 6),
            "planet": ellipse_mask((724,76,958,315), 6),
            "planet_glow": ellipse_mask((695,48,985,345), 35),
            "console": polygon_mask([(190,475),(1090,475),(1110,630),(170,630)], 34),
        }
    if scene == "ferry":
        return {
            "water": polygon_mask([(145,340),(1280,328),(1280,650),(205,555)], 18),
            "interior": polygon_mask([(0,0),(430,0),(530,720),(0,720)], 38),
        }
    return {
        "porthole": ellipse_mask((405,62,875,529), 8),
        "water_glow": ellipse_mask((430,45,850,470), 45),
    }


SCENES = {
    "aircraft": ("01_aircraft_cabin.png", aircraft),
    "train": ("02_night_train.png", train),
    "spacecraft": ("03_spacecraft.png", spacecraft),
    "ferry": ("04_ferry.png", ferry),
    "submarine": ("05_submarine.png", submarine),
}


def render(scene, source_dir, output_dir):
    filename, effect = SCENES[scene]
    source = Image.open(source_dir / filename).convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    base = np.asarray(source, dtype=np.uint8)
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / f"{scene}_loop_10s_30fps.mp4"
    command = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(output),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    masks = masks_for(scene)
    assert process.stdin is not None
    for index in range(FRAMES):
        phase = index / FRAMES
        frame = np.clip(effect(base, phase, masks), 0, 255).astype(np.uint8)
        process.stdin.write(frame.tobytes())
    process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError(f"ffmpeg failed for {scene}")
    print(output)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("scenes", nargs="*", choices=SCENES, default=list(SCENES))
    parser.add_argument("--source-dir", type=Path, default=Path("runway_journey_sources"))
    parser.add_argument("--output-dir", type=Path, default=Path("journey_loop_previews"))
    args = parser.parse_args()
    for scene in args.scenes:
        render(scene, args.source_dir, args.output_dir)


if __name__ == "__main__":
    main()

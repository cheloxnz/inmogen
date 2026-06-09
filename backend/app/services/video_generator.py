"""
Generador de videos inmobiliarios con efecto Ken Burns (zoom+pan).
Usa FFmpeg — debe estar instalado en el contenedor Docker.

Estilos disponibles:
- kenburns   : zoom-in / zoom-out alternados con pan suave
- slideshow  : transición con fade entre fotos, sin zoom
- beforeafter: divide la pantalla izquierda/derecha (requiere exactamente 2 fotos)
"""
import asyncio
import io
import os
import tempfile
import logging
from typing import Literal

import httpx
from PIL import Image

logger = logging.getLogger(__name__)

# Dimensiones por formato
FORMAT_DIMS = {
    "story_9x16":  (1080, 1920),
    "feed_1x1":    (1080, 1080),
    "banner_16x9": (1200, 628),
    "whatsapp":    (1080, 1080),
}

VideoStyle = Literal["kenburns", "slideshow"]


async def generate_video(
    photo_urls: list[str],
    fmt: str = "story_9x16",
    style: VideoStyle = "kenburns",
    duration_per_photo: int = 4,
) -> bytes:
    """
    Genera un video MP4 a partir de una lista de URLs de fotos.

    Args:
        photo_urls: Lista de URLs públicas (max 10 fotos)
        fmt: Formato de salida (story_9x16, feed_1x1, banner_16x9)
        style: kenburns | slideshow
        duration_per_photo: Segundos por foto (default 4)

    Returns:
        bytes del archivo MP4
    """
    dims = FORMAT_DIMS.get(fmt, FORMAT_DIMS["story_9x16"])
    w, h = dims

    with tempfile.TemporaryDirectory() as tmpdir:
        # 1. Descargar y redimensionar fotos
        photo_paths = await _download_photos(photo_urls[:10], tmpdir, w, h)

        if not photo_paths:
            raise Exception("No se pudieron descargar las fotos para el video")

        output_path = os.path.join(tmpdir, "output.mp4")

        if style == "kenburns":
            await _render_kenburns(photo_paths, output_path, w, h, duration_per_photo)
        else:
            await _render_slideshow(photo_paths, output_path, w, h, duration_per_photo)

        with open(output_path, "rb") as f:
            return f.read()


# ── Ken Burns ────────────────────────────────────────────────────────────────

async def _render_kenburns(
    photo_paths: list[str],
    output_path: str,
    w: int,
    h: int,
    duration: int,
):
    fps = 25
    frames = duration * fps

    # Patrones de zoom/pan alternados para cada foto
    patterns = [
        # zoom-in centrado
        (f"'min(zoom+0.0015,1.35)'", f"'iw/2-(iw/zoom/2)'", f"'ih/2-(ih/zoom/2)'"),
        # zoom-out centrado
        (f"'if(eq(on,1),1.35,max(zoom-0.0015,1.0))'", f"'iw/2-(iw/zoom/2)'", f"'ih/2-(ih/zoom/2)'"),
        # zoom-in + pan derecha
        (f"'min(zoom+0.0012,1.3)'", f"'on/{frames}*iw*0.08'", f"'ih/2-(ih/zoom/2)'"),
        # zoom-in + pan izquierda
        (f"'min(zoom+0.0012,1.3)'", f"'(iw/zoom-iw/zoom*on/{frames}*0.08)'", f"'ih/2-(ih/zoom/2)'"),
        # zoom-in + pan arriba
        (f"'min(zoom+0.0012,1.3)'", f"'iw/2-(iw/zoom/2)'", f"'on/{frames}*ih*0.08'"),
    ]

    inputs = []
    for p in photo_paths:
        inputs += ["-loop", "1", "-t", str(duration), "-i", p]

    filters = []
    for i, path in enumerate(photo_paths):
        z, x, y = patterns[i % len(patterns)]
        filters.append(
            f"[{i}:v]"
            f"scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},"
            f"zoompan=z={z}:x={x}:y={y}:d={frames}:s={w}x{h}:fps={fps}"
            f"[v{i}]"
        )

    # Fade entre clips (crossfade de 0.5s)
    fade_dur = 0.5
    fade_frames = int(fade_dur * fps)
    if len(photo_paths) == 1:
        filters.append(f"[v0]copy[vout]")
    else:
        # Encadenar xfade entre pares consecutivos
        prev = "v0"
        for i in range(1, len(photo_paths)):
            offset = (duration - fade_dur) * i
            out = f"xf{i}" if i < len(photo_paths) - 1 else "vout"
            filters.append(
                f"[{prev}][v{i}]xfade=transition=fade:duration={fade_dur}:offset={offset:.2f}[{out}]"
            )
            prev = f"xf{i}"

    filter_complex = ";".join(filters)

    cmd = (
        ["ffmpeg", "-y"]
        + inputs
        + [
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            output_path,
        ]
    )

    await _run_ffmpeg(cmd)


# ── Slideshow ────────────────────────────────────────────────────────────────

async def _render_slideshow(
    photo_paths: list[str],
    output_path: str,
    w: int,
    h: int,
    duration: int,
):
    fps = 25
    fade = 0.8

    inputs = []
    for p in photo_paths:
        inputs += ["-loop", "1", "-t", str(duration), "-i", p]

    filters = []
    for i, _ in enumerate(photo_paths):
        filters.append(
            f"[{i}:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},setsar=1[v{i}]"
        )

    if len(photo_paths) == 1:
        filters.append(f"[v0]copy[vout]")
    else:
        prev = "v0"
        for i in range(1, len(photo_paths)):
            offset = (duration - fade) * i
            out = f"xf{i}" if i < len(photo_paths) - 1 else "vout"
            filters.append(
                f"[{prev}][v{i}]xfade=transition=dissolve:duration={fade}:offset={offset:.2f}[{out}]"
            )
            prev = f"xf{i}"

    filter_complex = ";".join(filters)

    cmd = (
        ["ffmpeg", "-y"]
        + inputs
        + [
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            output_path,
        ]
    )

    await _run_ffmpeg(cmd)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _download_photos(urls: list[str], tmpdir: str, w: int, h: int) -> list[str]:
    paths = []
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        for i, url in enumerate(urls):
            try:
                r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                r.raise_for_status()
                img = Image.open(io.BytesIO(r.content)).convert("RGB")
                img = _crop_center(img, w, h)
                path = os.path.join(tmpdir, f"photo_{i:02d}.jpg")
                img.save(path, "JPEG", quality=95)
                paths.append(path)
            except Exception as e:
                logger.warning("No se pudo descargar foto %s: %s", url, e)
    return paths


def _crop_center(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Resize + crop al centro para llenar exactamente target_w×target_h."""
    src_w, src_h = img.size
    if src_w / src_h > target_w / target_h:
        new_h = target_h
        new_w = int(src_w * target_h / src_h)
    else:
        new_w = target_w
        new_h = int(src_h * target_w / src_w)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    return img.crop((left, top, left + target_w, top + target_h))


async def _run_ffmpeg(cmd: list[str], timeout: int = 180):
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        raise Exception("FFmpeg tardó demasiado (timeout)")

    if proc.returncode != 0:
        err = stderr.decode(errors="replace")[-800:]
        logger.error("FFmpeg error:\n%s", err)
        raise Exception(f"Error generando el video: {err}")

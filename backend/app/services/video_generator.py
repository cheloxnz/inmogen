"""
Generador de videos inmobiliarios con FFmpeg.
Usa fade/dissolve entre fotos — rápido y confiable.

El efecto "Ken Burns" (zoompan) se descartó por ser extremadamente lento en CPU.
En su lugar se usa scale + pad + xfade que termina en < 30s para 7 fotos.
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

FORMAT_DIMS = {
    "story_9x16":  (1080, 1920),
    "feed_1x1":    (1080, 1080),
    "banner_16x9": (1200, 628),
    "whatsapp":    (1080, 1080),
}

VideoStyle = Literal["cinematic", "slideshow"]


async def generate_video(
    photo_urls: list[str],
    fmt: str = "story_9x16",
    style: VideoStyle = "cinematic",
    duration_per_photo: int = 3,
) -> bytes:
    """
    Genera un video MP4 a partir de fotos.
    - cinematic: fade suave entre fotos (rápido)
    - slideshow: dissolve más lento entre fotos
    """
    dims = FORMAT_DIMS.get(fmt, FORMAT_DIMS["story_9x16"])
    w, h = dims

    with tempfile.TemporaryDirectory() as tmpdir:
        photo_paths = await _download_photos(photo_urls[:7], tmpdir, w, h)

        if not photo_paths:
            raise Exception("No se pudieron descargar las fotos para el video")

        output_path = os.path.join(tmpdir, "output.mp4")
        await _render_video(photo_paths, output_path, w, h, duration_per_photo, style)

        with open(output_path, "rb") as f:
            return f.read()


async def _render_video(
    photo_paths: list[str],
    output_path: str,
    w: int,
    h: int,
    duration: int,
    style: str,
):
    """
    Renderiza el video con xfade entre fotos.
    Mucho más rápido que zoompan — usa preset ultrafast.
    """
    fade_dur = 0.6
    transition = "fade" if style == "cinematic" else "dissolve"

    # Inputs: cada foto dura `duration` segundos
    inputs = []
    for p in photo_paths:
        inputs += ["-loop", "1", "-t", str(duration), "-i", p]

    # Escalar y normalizar cada clip
    n = len(photo_paths)
    filters = []
    for i in range(n):
        filters.append(
            f"[{i}:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},setsar=1,fps=24[v{i}]"
        )

    # Encadenar con xfade
    if n == 1:
        filters.append("[v0]copy[vout]")
    else:
        prev = "v0"
        for i in range(1, n):
            offset = (duration - fade_dur) * i
            out = f"xf{i}" if i < n - 1 else "vout"
            filters.append(
                f"[{prev}][v{i}]xfade=transition={transition}"
                f":duration={fade_dur}:offset={offset:.2f}[{out}]"
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
            "-preset", "ultrafast",   # máxima velocidad de encoding
            "-crf", "26",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            output_path,
        ]
    )

    await _run_ffmpeg(cmd)


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
                img.save(path, "JPEG", quality=92)
                paths.append(path)
            except Exception as e:
                logger.warning("No se pudo descargar foto %s: %s", url, e)
    return paths


def _crop_center(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
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


async def _run_ffmpeg(cmd: list[str], timeout: int = 120):
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        raise Exception("FFmpeg tardó demasiado — intentá con menos fotos o duración más corta")

    if proc.returncode != 0:
        err = stderr.decode(errors="replace")[-600:]
        logger.error("FFmpeg error:\n%s", err)
        raise Exception(f"Error generando el video")

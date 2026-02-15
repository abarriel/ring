"""Download ring images to local filesystem for later S3 upload."""

from __future__ import annotations

import asyncio
import hashlib
from pathlib import Path
from urllib.parse import urlparse

import aiofiles
import httpx
from rich.console import Console

from src.models import CrawledImage, CrawledRing

console = Console()

OUTPUT_DIR = Path(__file__).parent.parent / "output" / "images"


async def download_image(
    client: httpx.AsyncClient,
    image: CrawledImage,
    brand_slug: str,
    ring_index: int,
    semaphore: asyncio.Semaphore,
) -> CrawledImage:
    """Download a single image, return updated CrawledImage with local_path."""
    async with semaphore:
        try:
            # Derive filename from URL hash to avoid duplicates
            url_hash = hashlib.md5(image.url.encode()).hexdigest()[:12]
            ext = _get_extension(image.url)
            filename = f"{brand_slug}_{ring_index:03d}_{image.position:02d}_{url_hash}{ext}"

            brand_dir = OUTPUT_DIR / brand_slug
            brand_dir.mkdir(parents=True, exist_ok=True)
            filepath = brand_dir / filename

            if filepath.exists():
                console.print(f"  [dim]skip (cached): {filename}[/dim]")
                return image.model_copy(update={"local_path": str(filepath)})

            resp = await client.get(
                image.url,
                follow_redirects=True,
                timeout=30.0,
            )
            resp.raise_for_status()

            async with aiofiles.open(filepath, "wb") as f:
                await f.write(resp.content)

            console.print(f"  [green]downloaded:[/green] {filename} ({len(resp.content) // 1024}KB)")
            return image.model_copy(update={"local_path": str(filepath)})

        except Exception as e:
            console.print(f"  [red]failed:[/red] {image.url[:80]} — {e}")
            return image


async def download_ring_images(
    rings: list[CrawledRing],
    brand_slug: str,
    max_concurrent: int = 5,
) -> list[CrawledRing]:
    """Download all images for a list of rings. Returns updated rings with local_path."""
    semaphore = asyncio.Semaphore(max_concurrent)
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
    }

    async with httpx.AsyncClient(headers=headers, http2=True) as client:
        updated_rings: list[CrawledRing] = []

        for i, ring in enumerate(rings):
            if not ring.images:
                updated_rings.append(ring)
                continue

            tasks = [
                download_image(client, img, brand_slug, i, semaphore)
                for img in ring.images
            ]
            updated_images = await asyncio.gather(*tasks)
            updated_rings.append(ring.model_copy(update={"images": list(updated_images)}))

    return updated_rings


def _get_extension(url: str) -> str:
    """Extract file extension from URL."""
    path = urlparse(url).path
    if "." in path.split("/")[-1]:
        ext = "." + path.split(".")[-1].lower()
        if ext in (".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"):
            return ext
    return ".jpg"

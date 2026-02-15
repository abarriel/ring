"""Normalize raw LLM-extracted data into structured CrawledRing models."""

from __future__ import annotations

import re

MAX_IMAGES_PER_RING = 3

# Non-product images to skip
_SKIP_IMAGE_RE = re.compile(
    r"swatch|picto|icon|logo|flag|payment|sprite|pixel|spacer|"
    r"dropdown|banner|slider|hero|lifestyle|editorial|model|portrait|"
    r"artisanat|engagements?-def|pierres?-def|collections?[-_](?:dropdown|banner)|"
    r"newsletter|social|instagram|facebook|twitter|youtube|pinterest|"
    r"badge|label|tag|overlay|placeholder|loading|lazy|"
    r"wysiwyg|cms[-_]|block[-_]|widget|footer|header|nav[-_]|menu|"
    r"/theme/images/|/build/.*?/images/|gems\.jpg|house\.jpg|shops\.jpg",
    re.I,
)


def _is_product_image(url: str) -> bool:
    """Check if URL looks like an actual product photo, not a UI/lifestyle image."""
    return not _SKIP_IMAGE_RE.search(url)


from src.models import (
    CrawledImage,
    CrawledRing,
    LLMRingExtraction,
    MetalType,
    RingStyle,
    StoneType,
    Tier,
)


# ── Metal type mapping ───────────────────────────────────────────────────────

_METAL_MAP: dict[str, MetalType] = {
    "or jaune": MetalType.YELLOW_GOLD,
    "yellow gold": MetalType.YELLOW_GOLD,
    "or blanc": MetalType.WHITE_GOLD,
    "white gold": MetalType.WHITE_GOLD,
    "or rose": MetalType.ROSE_GOLD,
    "rose gold": MetalType.ROSE_GOLD,
    "pink gold": MetalType.ROSE_GOLD,
    "platine": MetalType.PLATINUM,
    "platinum": MetalType.PLATINUM,
    "argent": MetalType.SILVER,
    "silver": MetalType.SILVER,
}


def normalize_metal(raw: str | None) -> MetalType:
    if not raw:
        return MetalType.PLATINUM
    low = raw.lower().strip()
    for key, val in _METAL_MAP.items():
        if key in low:
            return val
    return MetalType.PLATINUM


# ── Stone type mapping ───────────────────────────────────────────────────────

_STONE_MAP: dict[str, StoneType] = {
    "diamant": StoneType.DIAMOND,
    "diamond": StoneType.DIAMOND,
    "saphir": StoneType.SAPPHIRE,
    "sapphire": StoneType.SAPPHIRE,
    "emeraude": StoneType.EMERALD,
    "emerald": StoneType.EMERALD,
    "rubis": StoneType.RUBY,
    "ruby": StoneType.RUBY,
    "moissanite": StoneType.MOISSANITE,
    "morganite": StoneType.MORGANITE,
}


def normalize_stone(raw: str | None) -> StoneType:
    if not raw:
        return StoneType.DIAMOND
    low = raw.lower().strip()
    for key, val in _STONE_MAP.items():
        if key in low:
            return val
    if "sans" in low or "none" in low or "uni" in low:
        return StoneType.NONE
    return StoneType.DIAMOND


# ── Style mapping ────────────────────────────────────────────────────────────

_STYLE_MAP: dict[str, RingStyle] = {
    "solitaire": RingStyle.SOLITAIRE,
    "halo": RingStyle.HALO,
    "vintage": RingStyle.VINTAGE,
    "pave": RingStyle.PAVE,
    "pavé": RingStyle.PAVE,
    "trois pierres": RingStyle.THREE_STONE,
    "three stone": RingStyle.THREE_STONE,
    "three-stone": RingStyle.THREE_STONE,
    "cluster": RingStyle.CLUSTER,
    "eternite": RingStyle.ETERNITY,
    "eternity": RingStyle.ETERNITY,
    "eternité": RingStyle.ETERNITY,
    "tension": RingStyle.TENSION,
    "cathedral": RingStyle.CATHEDRAL,
    "cathédrale": RingStyle.CATHEDRAL,
    "bezel": RingStyle.BEZEL,
    "clos": RingStyle.BEZEL,
    "serti clos": RingStyle.BEZEL,
}


def normalize_style(raw: str | None) -> RingStyle:
    if not raw:
        return RingStyle.SOLITAIRE
    low = raw.lower().strip()
    for key, val in _STYLE_MAP.items():
        if key in low:
            return val
    return RingStyle.SOLITAIRE


# ── Price parsing ────────────────────────────────────────────────────────────

def parse_price_eur(raw: str | None) -> float | None:
    """Parse French-format price strings: '3 450 €', '3.450€', '3,450.00€'"""
    if not raw:
        return None
    # Remove currency symbols and whitespace artifacts
    cleaned = raw.replace("€", "").replace("EUR", "").strip()
    # Handle French number format: 3 450 or 3 450,00
    cleaned = re.sub(r"\s+", "", cleaned)  # "3 450" -> "3450"
    cleaned = cleaned.replace(",", ".")     # "3450,00" -> "3450.00"
    try:
        return float(cleaned)
    except ValueError:
        return None


# ── Carat parsing ────────────────────────────────────────────────────────────

def parse_carat(raw: str | None) -> float:
    if not raw:
        return 0.5
    match = re.search(r"(\d+[.,]?\d*)\s*(ct|carat)", raw.lower())
    if match:
        return float(match.group(1).replace(",", "."))
    # Try just a number
    match = re.search(r"(\d+[.,]\d+)", raw)
    if match:
        return float(match.group(1).replace(",", "."))
    return 0.5


# ── Rating parsing ───────────────────────────────────────────────────────────

def parse_rating(raw: str | None) -> float:
    if not raw:
        return 0.0
    match = re.search(r"(\d+[.,]?\d*)\s*/\s*5", raw)
    if match:
        return min(float(match.group(1).replace(",", ".")), 5.0)
    match = re.search(r"(\d+[.,]?\d*)", raw)
    if match:
        val = float(match.group(1).replace(",", "."))
        return min(val, 5.0)
    return 0.0


def parse_review_count(raw: str | None) -> int:
    if not raw:
        return 0
    match = re.search(r"(\d+)", raw.replace(" ", ""))
    return int(match.group(1)) if match else 0


# ── Full normalization ───────────────────────────────────────────────────────

def normalize_extraction(
    raw: LLMRingExtraction,
    brand: str,
    tier: Tier,
    source_url: str,
) -> CrawledRing:
    """Convert raw LLM extraction into a clean CrawledRing."""
    filtered_urls = [
        url for url in raw.image_urls
        if url and url.startswith("http") and _is_product_image(url)
    ][:MAX_IMAGES_PER_RING]
    images = [CrawledImage(url=url, position=i) for i, url in enumerate(filtered_urls)]

    return CrawledRing(
        name=raw.name.strip() if raw.name else f"{brand} Ring",
        description=raw.description.strip() if raw.description else None,
        metal_type=normalize_metal(raw.metal),
        stone_type=normalize_stone(raw.stone),
        carat_weight=parse_carat(raw.carat),
        style=normalize_style(raw.style),
        rating=parse_rating(raw.rating),
        review_count=parse_review_count(raw.review_count),
        images=images,
        price_eur=parse_price_eur(raw.price),
        brand=brand,
        collection=raw.collection,
        certification=raw.certification,
        sizes_available=raw.sizes,
        source_url=raw.product_url or source_url,
        tier=tier,
    )

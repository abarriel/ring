"""Data models for crawled ring data — maps to Ring app Prisma schema."""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


# ── Enums matching Prisma schema ─────────────────────────────────────────────

class Tier(str, Enum):
    LOW = "low"
    MID = "mid"
    HIGH = "high"


class MetalType(str, Enum):
    YELLOW_GOLD = "YELLOW_GOLD"
    WHITE_GOLD = "WHITE_GOLD"
    ROSE_GOLD = "ROSE_GOLD"
    PLATINUM = "PLATINUM"
    SILVER = "SILVER"


class StoneType(str, Enum):
    DIAMOND = "DIAMOND"
    SAPPHIRE = "SAPPHIRE"
    EMERALD = "EMERALD"
    RUBY = "RUBY"
    MOISSANITE = "MOISSANITE"
    MORGANITE = "MORGANITE"
    NONE = "NONE"


class RingStyle(str, Enum):
    SOLITAIRE = "SOLITAIRE"
    HALO = "HALO"
    VINTAGE = "VINTAGE"
    PAVE = "PAVE"
    THREE_STONE = "THREE_STONE"
    CLUSTER = "CLUSTER"
    ETERNITY = "ETERNITY"
    TENSION = "TENSION"
    CATHEDRAL = "CATHEDRAL"
    BEZEL = "BEZEL"


# ── Crawled ring data (extended) ─────────────────────────────────────────────

class CrawledImage(BaseModel):
    url: str
    local_path: str | None = None
    cdn_url: str | None = None
    position: int = 0


class CrawledRing(BaseModel):
    """Extended ring data extracted from a jeweler's website."""

    # Core fields (map to Prisma Ring model)
    name: str
    description: str | None = None
    metal_type: MetalType = MetalType.PLATINUM
    stone_type: StoneType = StoneType.DIAMOND
    carat_weight: float = 0.5
    style: RingStyle = RingStyle.SOLITAIRE
    rating: float = 0.0
    review_count: int = 0
    images: list[CrawledImage] = Field(default_factory=list)

    # Extended fields (not in current Prisma schema)
    price_eur: float | None = None
    brand: str = ""
    collection: str | None = None
    certification: str | None = None
    sizes_available: list[str] = Field(default_factory=list)
    source_url: str = ""
    tier: Tier = Tier.MID


# ── LLM extraction schema for crawl4ai ───────────────────────────────────────

class LLMRingExtraction(BaseModel):
    """Schema for LLM-based extraction from jewelry pages.
    
    crawl4ai uses this Pydantic model to instruct the LLM on what to extract.
    """

    name: str = Field(description="Ring product name")
    description: str | None = Field(None, description="Product description text")
    price: str | None = Field(None, description="Price as displayed (e.g. '3 450 €')")
    metal: str | None = Field(None, description="Metal type (e.g. 'or blanc', 'platine', 'or rose')")
    stone: str | None = Field(None, description="Main stone type (e.g. 'diamant', 'saphir')")
    carat: str | None = Field(None, description="Carat weight if mentioned (e.g. '0.50 ct')")
    style: str | None = Field(
        None, description="Ring style (e.g. 'solitaire', 'halo', 'pavé', 'trois pierres')"
    )
    collection: str | None = Field(None, description="Collection name if mentioned")
    image_urls: list[str] = Field(default_factory=list, description="Product image URLs")
    product_url: str | None = Field(None, description="Direct URL to this product page")
    rating: str | None = Field(None, description="Rating if visible (e.g. '4.5/5')")
    review_count: str | None = Field(None, description="Number of reviews if visible")
    sizes: list[str] = Field(default_factory=list, description="Available sizes")
    certification: str | None = Field(None, description="Certification (GIA, HRD, etc.)")


# ── Jeweler definition ───────────────────────────────────────────────────────

class PaginationType(str, Enum):
    URL = "url"           # ?page=2, /page/2
    LOAD_MORE = "load_more"  # "Load more" button click
    INFINITE = "infinite"    # Infinite scroll
    NONE = "none"            # Single page


class JewelerConfig(BaseModel):
    """Configuration for crawling a specific jeweler."""

    slug: str
    name: str
    tier: Tier
    base_url: str
    engagement_ring_url: str
    pagination: PaginationType = PaginationType.NONE
    max_pages: int = 5
    max_rings: int = 30
    delay_seconds: float = 2.0

    # CSS selectors (when available) — fallback to LLM extraction
    product_card_selector: str | None = None
    product_link_selector: str | None = None
    next_page_selector: str | None = None
    load_more_selector: str | None = None

    # JS to execute before extraction (e.g. close cookie banners)
    pre_js: list[str] = Field(default_factory=list)

    # Wait condition
    wait_for: str | None = None

    # Whether to crawl individual product pages for full details
    crawl_detail_pages: bool = True

    # Use LLM extraction (True) or CSS extraction (False)
    use_llm: bool = True

"""Regex-based product extractor — zero LLM tokens.

Parses the raw markdown from crawl4ai to extract ring product data
using pattern matching. Falls back to LLM only when this finds 0 results.
"""

from __future__ import annotations

import re

from rich.console import Console

from src.models import LLMRingExtraction

console = Console()

# ── Regex patterns ───────────────────────────────────────────────────────────

# Price: "1 995 €", "3,450€", "À partir de 2 330 €"
PRICE_RE = re.compile(
    r"(?:à\s+partir\s+de\s+)?(\d[\d\s.,]*)\s*€",
    re.IGNORECASE,
)

# Image URL in markdown: ![alt](url)
IMAGE_MD_RE = re.compile(
    r"!\[([^\]]*)\]\((https?://[^)\s]+)\)",
)

# Link: [ content ](url)
LINK_RE = re.compile(
    r"\[([^\]]*)\]\((https?://[^)\s]+)\)",
)

# Bold link: **[ Name ](url)**
BOLD_LINK_RE = re.compile(
    r"\*\*\[\s*(.+?)\s*\]\((https?://[^)\s]+)\)\s*\*\*",
)

# Metal keywords
METAL_KEYWORDS = [
    "or blanc", "or jaune", "or rose", "platine", "platinum",
    "white gold", "yellow gold", "rose gold", "argent", "silver",
    "or 750", "or gris",
]

# Stone keywords
STONE_KEYWORDS = [
    "diamant", "diamond", "saphir", "sapphire", "rubis", "ruby",
    "emeraude", "émeraude", "emerald", "moissanite", "morganite",
]

# Junk name patterns to filter out
JUNK_NAMES = re.compile(
    r"^(background|layer|voir tous?|toutes? les|accueil|paramètre|"
    r"compte|contactez|livraison|copyright|newsletter|inscription|"
    r"nous contacter|mon compte|panier|aide|faq|cgv|mentions|"
    r"les styles|les pierres|les diamants|solitaires? (entourés?|épaulés?|pavés?)|"
    r"solitaires?$|nouvelles? créations?|disponibles? immédiatement|"
    r"alliances?$|horlogerie|nos boutiques|service client|"
    r"suivez-nous|nouveauté|nos collections|découvrir|"
    r"étoile divine$|grandes collections|bijoux mixtes|montres|"
    r"créer votre|personnaliser|filtrer|trier|résultats?|"
    r"en savoir plus|voir le produit|ajouter|retour)",
    re.IGNORECASE,
)

# Nav/menu signals
NAV_SIGNALS = [
    "voir tout", "toutes les", "accueil", "panier", "mon compte",
    "connexion", "paramètre", "nous contacter", "livraison",
    "mentions légales", "cgv", "plan du site", "newsletter",
    "cookie", "copyright", "©", "suivez-nous", "réseaux",
    "inscription", "aide", "faq", "politique",
]


def _is_nav_line(line: str) -> bool:
    low = line.lower().strip()
    return any(s in low for s in NAV_SIGNALS)


def _extract_metal(text: str) -> str:
    low = text.lower()
    for kw in METAL_KEYWORDS:
        if kw in low:
            return kw.title()
    return ""


def _extract_stone(text: str) -> str:
    low = text.lower()
    for kw in STONE_KEYWORDS:
        if kw in low:
            return kw.title()
    return ""


def _is_image_url(url: str) -> bool:
    return url.lower().split("?")[0].endswith((".jpg", ".jpeg", ".png", ".webp", ".avif"))


def _is_product_url(url: str) -> bool:
    """Check if URL looks like a product detail page."""
    low = url.lower()
    if _is_image_url(low):
        return False
    skip_patterns = [
        "/categories/", "/collections/", "#open-search", "#store.",
        "customer/account", "checkout/cart", ".css", ".js", "/static/",
        "/pub/media/wysiwyg/", "javascript:", "#top", "/page/",
        "/mariage/bagues-de-fiancailles/or-", "/mariage/bagues-de-fiancailles/taille-",
        "/mariage/bagues-de-fiancailles/solitaires",
        "/mariage/bagues-de-fiancailles.html",
    ]
    return not any(p in low for p in skip_patterns)


def _is_valid_name(name: str) -> bool:
    """Check if extracted name looks like a real product name."""
    if len(name) < 3 or len(name) > 100:
        return False
    if JUNK_NAMES.match(name):
        return False
    if name.startswith(("http", "#", "!", "[", "*")):
        return False
    # Must contain at least one letter
    if not re.search(r"[a-zA-ZÀ-ÿ]", name):
        return False
    # Skip lines that are just "## Section Title" leftovers
    clean = name.lstrip("#").strip()
    if JUNK_NAMES.match(clean):
        return False
    # Skip lines that are pure nav/social signals
    low = clean.lower()
    if any(s == low for s in NAV_SIGNALS):
        return False
    return True


# ── Main extraction function ─────────────────────────────────────────────────


def extract_from_markdown(raw_markdown: str) -> list[LLMRingExtraction]:
    """Extract product data from raw markdown using regex patterns.

    Scans for repeating product blocks: link/image + name + metal + price.
    Returns LLMRingExtraction objects (same format as LLM output).
    """
    lines = raw_markdown.split("\n")
    extractions: list[LLMRingExtraction] = []

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        if not line or _is_nav_line(line):
            i += 1
            continue

        # ── Try to detect a product block starting here ──

        # Pattern 1: Link line with product URL [ ... ](product_url)
        # followed by name, metal, price on next lines
        link_match = LINK_RE.search(line)
        if link_match and _is_product_url(link_match.group(2)):
            product_url = link_match.group(2)

            # Extract image from inside the link if present: [ ![alt](img) ](url)
            images: list[str] = []
            for img_m in IMAGE_MD_RE.finditer(line):
                img_url = img_m.group(2)
                if _is_image_url(img_url) and img_url not in images:
                    images.append(img_url)

            # Also check for bold link pattern: **[ Name ](url)**
            bold_match = BOLD_LINK_RE.search(line)
            name_from_bold = bold_match.group(1).strip() if bold_match else ""

            # Look ahead for name, metal, price (up to 10 lines)
            name = name_from_bold
            metal = ""
            stone = ""
            price = ""
            lookahead_end = min(i + 11, len(lines))

            for j in range(i + 1, lookahead_end):
                ahead = lines[j].strip()
                if not ahead:
                    continue

                # Check for another product link — stop, we've hit the next product
                ahead_link = LINK_RE.search(ahead)
                if ahead_link and _is_product_url(ahead_link.group(2)):
                    break

                # Skip nav lines entirely
                if _is_nav_line(ahead):
                    continue

                # Grab images from lookahead too
                for img_m in IMAGE_MD_RE.finditer(ahead):
                    img_url = img_m.group(2)
                    if _is_image_url(img_url) and img_url not in images:
                        images.append(img_url)

                # Bold link in lookahead (Mauboussin pattern)
                if not name:
                    bold_m = BOLD_LINK_RE.search(ahead)
                    if bold_m:
                        name = bold_m.group(1).strip()
                        if not product_url:
                            product_url = bold_m.group(2)
                        # Don't continue — check metal/stone/price on same line
                        if not metal:
                            metal = _extract_metal(ahead)
                        if not stone:
                            stone = _extract_stone(ahead)
                        continue

                # Price — extract but don't skip the line (check metal/stone too)
                if not price:
                    price_match = PRICE_RE.search(ahead)
                    if price_match:
                        price = price_match.group(0)

                # Metal (check every line, not just non-price lines)
                if not metal:
                    metal = _extract_metal(ahead)

                # Stone
                if not stone:
                    stone = _extract_stone(ahead)

                # Name: short text, no links, no €, no images
                if (
                    not name
                    and 3 <= len(ahead) < 80
                    and "€" not in ahead
                    and "![" not in ahead
                    and not ahead.startswith(("[", "#", "*", "!"))
                    and _is_valid_name(ahead)
                ):
                    name = ahead

            # Finalize if we have a name
            if name and _is_valid_name(name):
                extractions.append(LLMRingExtraction(
                    name=name,
                    product_url=product_url or None,
                    image_urls=images,
                    price=price or None,
                    metal=metal or None,
                    stone=stone or None,
                    carat=None,
                    style=None,
                    collection=None,
                    description=None,
                    rating=None,
                    review_count=None,
                    sizes=[],
                    certification=None,
                ))

        i += 1

    return extractions

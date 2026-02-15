"""Core crawling engine — LLM extraction via crawl4ai."""

from __future__ import annotations

import asyncio
import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

from crawl4ai import (  # type: ignore[import-untyped]
    AsyncWebCrawler,
    BrowserConfig,
    CacheMode,
    CrawlerRunConfig,
    LLMConfig,
    LLMExtractionStrategy,
)
from rich.console import Console

from src.downloader import download_ring_images
from src.models import CrawledRing, JewelerConfig, LLMRingExtraction, PaginationType, Tier
from src.normalizer import normalize_extraction

console = Console()

OUTPUT_DIR = Path(__file__).parent.parent / "output" / "data"


# ── Token usage tracking ─────────────────────────────────────────────────────


@dataclass
class TokenUsage:
    """Track token usage per jeweler crawl."""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    llm_calls: int = 0
    llm_extractions: int = 0


@dataclass
class CrawlResult:
    """Result of crawling a single jeweler."""

    rings: list[CrawledRing] = field(default_factory=list)
    tokens: TokenUsage = field(default_factory=TokenUsage)


def _get_strategy_tokens(strategy: LLMExtractionStrategy) -> tuple[int, int, int]:
    """Extract total tokens used from an LLM strategy."""
    try:
        usage = strategy.usage_history  # type: ignore[attr-defined]
        prompt = sum(u.get("prompt_tokens", 0) or u.get("prompt", 0) for u in usage)
        completion = sum(u.get("completion_tokens", 0) or u.get("completion", 0) for u in usage)
        return prompt, completion, prompt + completion
    except Exception:
        return 0, 0, 0


# ── LLM Configuration ────────────────────────────────────────────────────────


def _default_llm_config() -> LLMConfig:
    """Auto-detect LLM provider from available API keys."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        return LLMConfig(
            provider="anthropic/claude-sonnet-4-20250514",
            api_token=os.environ["ANTHROPIC_API_KEY"],
        )
    if os.environ.get("OPENAI_API_KEY"):
        return LLMConfig(
            provider="openai/gpt-4o-mini",
            api_token=os.environ["OPENAI_API_KEY"],
        )
    return LLMConfig(provider="anthropic/claude-sonnet-4-20250514", api_token=None)


DEFAULT_LLM_CONFIG = _default_llm_config()

LLM_INSTRUCTION = """You are analyzing a French jewelry website page listing engagement rings.

Extract ALL rings/products visible on this page. For EACH ring you MUST include:
- name: Product name (REQUIRED — the actual ring name, NOT category/collection headers)
- image_urls: Product image URLs (REQUIRED — look carefully for ALL img src attributes, markdown
  image links like ![alt](url), and background images. Every ring on a jewelry listing page has
  at least one product photo. Use full absolute URLs starting with https://)
- product_url: Direct link to the product detail page (full absolute URL)
- price: Price as shown on the page (e.g. "3 450 €", "À partir de 1 995 €")
- metal: Metal type (e.g. "or blanc", "platine", "or rose", "or jaune")
- stone: Main stone (e.g. "diamant", "saphir", "rubis", "émeraude")
- carat: Carat weight if shown (e.g. "0.50 ct")
- style: Ring style (e.g. "solitaire", "halo", "pavé", "trois pierres")
- collection: Collection name if mentioned
- description, rating, review_count, sizes, certification: if visible

CRITICAL RULES:
1. image_urls is MANDATORY — every ring listing has product images. Look for <img> tags, markdown
   images, srcset attributes, and data-src attributes. Never return an empty image_urls array.
2. Skip navigation elements, footer links, category headers, and promotional banners.
   Only extract actual ring products with real names (not "Nouveauté", "Suivez-nous", etc.)
3. Use full absolute URLs (https://...) for all URLs — never relative paths.
4. If a field is not visible on the page, use null.
5. Extract the price exactly as displayed, including "À partir de" prefixes.
"""

# JS to dismiss cookie banners (run before extraction)
DISMISS_COOKIES_JS = """(() => {
    const btns = document.querySelectorAll(
        'button[id*="accept"], button[id*="cookie"], button[class*="accept"], '
        + 'button[class*="cookie"], a[id*="accept"], [data-action="accept"]'
    );
    for (const btn of btns) btn.click();
    const ot = document.getElementById('onetrust-accept-btn-handler');
    if (ot) ot.click();
    const didomi = document.getElementById('didomi-notice-agree-button');
    if (didomi) didomi.click();
})()"""


# ── Browser config ────────────────────────────────────────────────────────────


def _get_browser_config() -> BrowserConfig:
    return BrowserConfig(
        headless=True,
        browser_type="chromium",
        viewport_width=1440,
        viewport_height=900,
        user_agent_mode="random",
        java_script_enabled=True,
        ignore_https_errors=True,
        headers={"Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"},
    )


def _get_llm_strategy() -> LLMExtractionStrategy:
    return LLMExtractionStrategy(
        llm_config=DEFAULT_LLM_CONFIG,
        schema=LLMRingExtraction.model_json_schema(),
        extraction_type="schema",
        instruction=LLM_INSTRUCTION,
        input_format="raw_markdown",
        chunk_token_threshold=8000,
        overlap_rate=0.1,
        apply_chunking=True,
        extra_args={"temperature": 0, "max_tokens": 8000},
    )


# ── Parse LLM extraction result ─────────────────────────────────────────────


def _parse_llm_extractions(raw_content: str) -> list[LLMRingExtraction]:
    """Parse JSON extraction content into LLMRingExtraction models."""
    try:
        raw_data = json.loads(raw_content)
        if isinstance(raw_data, dict):
            raw_data = [raw_data]

        extractions = []
        for item in raw_data:
            try:
                ext = LLMRingExtraction.model_validate(item)
                if ext.name and ext.name.strip():
                    extractions.append(ext)
            except Exception:
                continue
        return extractions
    except json.JSONDecodeError:
        return []


# ── LLM extraction ───────────────────────────────────────────────────────────


async def _extract_page(
    crawler: AsyncWebCrawler,
    url: str,
    strategy: LLMExtractionStrategy,
    session_id: str | None = None,
    js_only: bool = False,
    extra_js: list[str] | None = None,
    wait_seconds: float = 5.0,
) -> list[LLMRingExtraction]:
    """Fetch page and extract ring data via LLM."""
    js_code = [DISMISS_COOKIES_JS]
    if extra_js:
        js_code.extend(extra_js)

    kwargs: dict = dict(
        extraction_strategy=strategy,
        cache_mode=CacheMode.BYPASS,
        delay_before_return_html=wait_seconds,
        page_timeout=60000,
        js_only=js_only,
        simulate_user=True,
        override_navigator=True,
        magic=True,
        remove_overlay_elements=True,
        js_code=js_code,
    )
    if session_id:
        kwargs["session_id"] = session_id

    config = CrawlerRunConfig(**kwargs)
    result = await crawler.arun(url=url, config=config)  # type: ignore[union-attr]

    if not result.success:  # type: ignore[union-attr]
        console.print(f"  [red]crawl failed:[/red] {result.error_message}")
        return []

    if not result.extracted_content:  # type: ignore[union-attr]
        console.print("  [yellow]LLM returned no content[/yellow]")
        return []

    extractions = _parse_llm_extractions(result.extracted_content)
    console.print(f"  [green]LLM extracted {len(extractions)} rings[/green]")
    return extractions


# ── Pagination handlers ──────────────────────────────────────────────────────


async def _crawl_with_load_more(
    crawler: AsyncWebCrawler,
    jeweler: JewelerConfig,
    llm_strategy: LLMExtractionStrategy,
) -> list[LLMRingExtraction]:
    """Handle 'Load More' button pagination."""
    session_id = f"session_{jeweler.slug}"
    all_extractions: list[LLMRingExtraction] = []

    # Initial page load
    console.print(f"  [cyan]page 1[/cyan] — {jeweler.engagement_ring_url}")
    extractions = await _extract_page(
        crawler,
        jeweler.engagement_ring_url,
        llm_strategy,
        session_id=session_id,
        wait_seconds=5.0,
    )
    all_extractions.extend(extractions)
    console.print(f"  [green]found {len(extractions)} rings[/green]")

    # Click "Load More" up to max_pages times
    if jeweler.load_more_selector:
        for page in range(2, jeweler.max_pages + 1):
            if len(all_extractions) >= jeweler.max_rings:
                break

            console.print(f"  [cyan]clicking load more (page {page})[/cyan]")
            await asyncio.sleep(jeweler.delay_seconds)

            click_js = [f"document.querySelector('{jeweler.load_more_selector}')?.click();"]
            more = await _extract_page(
                crawler,
                jeweler.engagement_ring_url,
                llm_strategy,
                session_id=session_id,
                js_only=True,
                extra_js=click_js,
                wait_seconds=3.0,
            )
            if not more:
                console.print("  [yellow]no more results[/yellow]")
                break
            all_extractions.extend(more)
            console.print(f"  [green]+{len(more)} rings (total: {len(all_extractions)})[/green]")

    try:
        await crawler.crawler_strategy.kill_session(session_id)  # type: ignore[attr-defined]
    except Exception:
        pass

    return all_extractions


async def _crawl_with_url_pagination(
    crawler: AsyncWebCrawler,
    jeweler: JewelerConfig,
    llm_strategy: LLMExtractionStrategy,
) -> list[LLMRingExtraction]:
    """Handle URL-based pagination (?page=N)."""
    all_extractions: list[LLMRingExtraction] = []

    for page in range(1, jeweler.max_pages + 1):
        if len(all_extractions) >= jeweler.max_rings:
            break

        sep = "&" if "?" in jeweler.engagement_ring_url else "?"
        url = (
            jeweler.engagement_ring_url
            if page == 1
            else f"{jeweler.engagement_ring_url}{sep}page={page}"
        )
        console.print(f"  [cyan]page {page}[/cyan] — {url}")

        extractions = await _extract_page(
            crawler,
            url,
            llm_strategy,
            wait_seconds=5.0,
        )
        if not extractions:
            console.print("  [yellow]no more results, stopping[/yellow]")
            break

        all_extractions.extend(extractions)
        console.print(
            f"  [green]found {len(extractions)} rings (total: {len(all_extractions)})[/green]"
        )

        if page < jeweler.max_pages:
            await asyncio.sleep(jeweler.delay_seconds)

    return all_extractions


async def _crawl_infinite_scroll(
    crawler: AsyncWebCrawler,
    jeweler: JewelerConfig,
    llm_strategy: LLMExtractionStrategy,
) -> list[LLMRingExtraction]:
    """Handle infinite scroll by scrolling down repeatedly."""
    session_id = f"session_{jeweler.slug}"

    # Initial load
    console.print(f"  [cyan]initial load[/cyan] — {jeweler.engagement_ring_url}")
    extractions = await _extract_page(
        crawler,
        jeweler.engagement_ring_url,
        llm_strategy,
        session_id=session_id,
        wait_seconds=5.0,
    )
    console.print(f"  [green]found {len(extractions)} rings[/green]")

    # Scroll down to load more
    for scroll in range(1, jeweler.max_pages):
        if len(extractions) >= jeweler.max_rings:
            break

        console.print(f"  [cyan]scroll #{scroll}[/cyan]")
        await asyncio.sleep(jeweler.delay_seconds)

        scroll_js = ["window.scrollTo(0, document.body.scrollHeight);"]
        more = await _extract_page(
            crawler,
            jeweler.engagement_ring_url,
            llm_strategy,
            session_id=session_id,
            js_only=True,
            extra_js=scroll_js,
            wait_seconds=3.0,
        )
        if more:
            extractions.extend(more)
            console.print(f"  [green]total: {len(extractions)} rings[/green]")
        else:
            break

    try:
        await crawler.crawler_strategy.kill_session(session_id)  # type: ignore[attr-defined]
    except Exception:
        pass

    return extractions


# ── Detail page image scraper ────────────────────────────────────────────────

# Image URL pattern in markdown: ![alt](url)
_IMAGE_RE = re.compile(r"!\[[^\]]*\]\((https?://[^)\s]+\.(?:jpg|jpeg|png|webp|avif)[^)]*)\)", re.I)

# Non-product images to skip: UI elements, lifestyle/editorial, banners, navigation
_SKIP_IMAGE_RE = re.compile(
    r"swatch|picto|icon|logo|flag|payment|sprite|pixel|spacer|"
    r"dropdown|banner|slider|hero|lifestyle|editorial|model|portrait|"
    r"artisanat|engagements?-def|pierres?-def|collections?[-_](?:dropdown|banner)|"
    r"newsletter|social|instagram|facebook|twitter|youtube|pinterest|"
    r"badge|label|tag|overlay|placeholder|loading|lazy|"
    r"wysiwyg|cms[-_]|block[-_]|widget|footer|header|nav[-_]|menu|"
    r"/theme/images/|/build/.*?/images/|gems\.jpg|house\.jpg|shops\.jpg|"
    r"contentmanager/content/|offres[-_]specials|Push-Mobile|Push-Desktop|"
    r"promo[-_]banner|promotional[-_]",
    re.I,
)


async def _fetch_detail_images(
    crawler: AsyncWebCrawler,
    url: str,
    wait_seconds: float = 3.0,
) -> list[str]:
    """Fetch a product detail page and extract image URLs from markdown."""
    config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        delay_before_return_html=wait_seconds,
        page_timeout=30000,
        simulate_user=True,
        override_navigator=True,
        magic=True,
        remove_overlay_elements=True,
        js_code=[DISMISS_COOKIES_JS],
    )
    result = await crawler.arun(url=url, config=config)  # type: ignore[union-attr]

    if not result.success:  # type: ignore[union-attr]
        return []

    md = result.markdown  # type: ignore[union-attr]
    raw = md.raw_markdown if hasattr(md, "raw_markdown") else str(md)
    if not raw:
        return []

    images: list[str] = []
    for m in _IMAGE_RE.finditer(raw):
        img_url = m.group(1)
        if not _SKIP_IMAGE_RE.search(img_url) and img_url not in images:
            images.append(img_url)
            if len(images) >= 3:
                break
    return images


async def _enrich_missing_images(
    crawler: AsyncWebCrawler,
    extractions: list[LLMRingExtraction],
    concurrency: int = 5,
    max_images: int = 3,
) -> list[LLMRingExtraction]:
    """For extractions with fewer than max_images, fetch their product detail pages.

    Runs up to `concurrency` detail page fetches in parallel.
    """
    needs_images = [
        (i, ext)
        for i, ext in enumerate(extractions)
        if len(ext.image_urls) < max_images and ext.product_url
    ]
    if not needs_images:
        return extractions

    console.print(f"\n[bold]Fetching images from {len(needs_images)} detail pages...[/bold]")

    sem = asyncio.Semaphore(concurrency)

    async def _fetch_one(idx: int, ext: LLMRingExtraction) -> tuple[int, list[str]]:
        async with sem:
            images = await _fetch_detail_images(crawler, ext.product_url)  # type: ignore[arg-type]
            return idx, images

    tasks = [_fetch_one(i, ext) for i, ext in needs_images]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    enriched = 0
    for res in results:
        if isinstance(res, Exception):
            continue
        idx, images = res
        if images:
            existing = extractions[idx].image_urls
            seen = set(existing)
            for img in images:
                if img not in seen and len(existing) < max_images:
                    existing.append(img)
                    seen.add(img)
            extractions[idx].image_urls = existing
            enriched += 1

    console.print(f"  [green]enriched {enriched}/{len(needs_images)} rings with images[/green]")
    return extractions


# ── Main crawl function ──────────────────────────────────────────────────────


async def crawl_jeweler(
    jeweler: JewelerConfig,
    download_images: bool = True,
    llm_config: LLMConfig | None = None,
) -> CrawlResult:
    """Crawl a single jeweler and return normalized ring data + token usage."""
    console.print(f"\n[bold magenta]{'=' * 60}[/bold magenta]")
    console.print(f"[bold]{jeweler.name}[/bold] — [dim]{jeweler.tier.value} tier[/dim]")
    console.print(f"[dim]{jeweler.engagement_ring_url}[/dim]")
    console.print(f"[bold magenta]{'=' * 60}[/bold magenta]")

    if llm_config:
        global DEFAULT_LLM_CONFIG
        DEFAULT_LLM_CONFIG = llm_config

    browser_config = _get_browser_config()
    llm_strategy = _get_llm_strategy()

    async with AsyncWebCrawler(config=browser_config) as crawler:
        match jeweler.pagination:
            case PaginationType.LOAD_MORE:
                raw_extractions = await _crawl_with_load_more(
                    crawler,
                    jeweler,
                    llm_strategy,
                )
            case PaginationType.URL:
                raw_extractions = await _crawl_with_url_pagination(
                    crawler,
                    jeweler,
                    llm_strategy,
                )
            case PaginationType.INFINITE:
                raw_extractions = await _crawl_infinite_scroll(
                    crawler,
                    jeweler,
                    llm_strategy,
                )
            case PaginationType.NONE:
                console.print(f"  [cyan]single page[/cyan] — {jeweler.engagement_ring_url}")
                raw_extractions = await _extract_page(
                    crawler,
                    jeweler.engagement_ring_url,
                    llm_strategy,
                    wait_seconds=5.0,
                )

        # Enrich rings missing images by fetching their detail pages
        if raw_extractions and jeweler.crawl_detail_pages:
            raw_extractions = await _enrich_missing_images(crawler, raw_extractions)

    # Collect token usage
    prompt, completion, total = _get_strategy_tokens(llm_strategy)
    tokens = TokenUsage(
        prompt_tokens=prompt,
        completion_tokens=completion,
        total_tokens=total,
        llm_calls=len(llm_strategy.usage_history) if hasattr(llm_strategy, "usage_history") else 0,
    )

    if not raw_extractions:
        console.print("[yellow]No rings extracted[/yellow]")
        return CrawlResult(rings=[], tokens=tokens)

    # Deduplicate by name
    seen_names: set[str] = set()
    unique_extractions: list[LLMRingExtraction] = []
    for ext in raw_extractions:
        key = ext.name.strip().lower()
        if key not in seen_names:
            seen_names.add(key)
            unique_extractions.append(ext)

    unique_extractions = unique_extractions[: jeweler.max_rings]

    console.print(f"\n[bold green]{len(unique_extractions)} unique rings extracted[/bold green]")

    # Normalize
    rings = [
        normalize_extraction(ext, jeweler.name, jeweler.tier, jeweler.engagement_ring_url)
        for ext in unique_extractions
    ]

    # Download images
    if download_images:
        console.print("\n[bold]Downloading images...[/bold]")
        rings = await download_ring_images(rings, jeweler.slug)

    tokens.llm_extractions = len(unique_extractions)

    # Print token summary
    console.print(
        f"\n[cyan]Tokens: [bold]{tokens.total_tokens:,}[/bold][/cyan]"
        f" (prompt: {tokens.prompt_tokens:,}, completion: {tokens.completion_tokens:,})"
        f" | LLM calls: {tokens.llm_calls}"
    )

    return CrawlResult(rings=rings, tokens=tokens)


# ── Ask: natural language prompt ──────────────────────────────────────────────

_URL_RE = re.compile(r"https?://[^\s\"'<>]+")

ASK_INSTRUCTION = """You are analyzing a French jewelry website page.

The user asked: "{prompt}"

Extract ALL rings/products matching the user's request. For EACH ring include:
- name: Product name (REQUIRED)
- image_urls: Product image URLs (REQUIRED — look for ALL img src, markdown images, srcset,
  data-src. Use full absolute URLs starting with https://)
- product_url: Direct link to the product page (full absolute URL)
- price: Price as displayed (e.g. "3 450 €", "À partir de 1 995 €")
- metal: Metal type (e.g. "or blanc", "platine", "or rose", "or jaune")
- stone: Main stone (e.g. "diamant", "saphir")
- carat: Carat weight if shown
- style: Ring style (e.g. "solitaire", "halo", "pavé")
- collection: Collection name if mentioned
- description, rating, review_count, sizes, certification: if visible

RULES:
1. image_urls is MANDATORY — never return an empty array.
2. Use full absolute URLs (https://...) for all URLs.
3. If a field is not visible, use null.
4. If this is a single product page, extract that one product with maximum detail.
5. If this is a listing page, extract all visible products.
"""


def _get_ask_strategy(prompt: str) -> LLMExtractionStrategy:
    return LLMExtractionStrategy(
        llm_config=DEFAULT_LLM_CONFIG,
        schema=LLMRingExtraction.model_json_schema(),
        extraction_type="schema",
        instruction=ASK_INSTRUCTION.format(prompt=prompt),
        input_format="raw_markdown",
        chunk_token_threshold=8000,
        overlap_rate=0.1,
        apply_chunking=True,
        extra_args={"temperature": 0, "max_tokens": 8000},
    )


async def ask(
    prompt: str,
    download_images: bool = True,
    llm_config: LLMConfig | None = None,
) -> CrawlResult:
    """Extract ring data from a natural language prompt.

    Parses URLs from the prompt, fetches each page, and uses LLM extraction
    with the user's prompt as context.

    Examples:
        "for gemmyo, fetch this ring: https://www.gemmyo.com/bague-lady.html"
        "get all rings from https://www.courbet.com/bagues-de-fiancailles"
    """
    console.print(f"\n[bold magenta]{'=' * 60}[/bold magenta]")
    console.print(f"[bold]ask:[/bold] {prompt}")
    console.print(f"[bold magenta]{'=' * 60}[/bold magenta]")

    if llm_config:
        global DEFAULT_LLM_CONFIG
        DEFAULT_LLM_CONFIG = llm_config

    urls = _URL_RE.findall(prompt)
    if not urls:
        console.print("[red]No URL found in prompt. Include at least one URL to crawl.[/red]")
        return CrawlResult()

    console.print(f"  [cyan]found {len(urls)} URL(s)[/cyan]")
    for u in urls:
        console.print(f"    {u}")

    browser_config = _get_browser_config()
    strategy = _get_ask_strategy(prompt)

    all_extractions: list[LLMRingExtraction] = []

    async with AsyncWebCrawler(config=browser_config) as crawler:
        for url in urls:
            console.print(f"\n  [cyan]fetching[/cyan] {url}")
            extractions = await _extract_page(crawler, url, strategy, wait_seconds=5.0)
            all_extractions.extend(extractions)

        # Enrich missing images from detail pages
        if all_extractions:
            all_extractions = await _enrich_missing_images(crawler, all_extractions)

    # Collect token usage
    prompt_tok, completion_tok, total_tok = _get_strategy_tokens(strategy)
    tokens = TokenUsage(
        prompt_tokens=prompt_tok,
        completion_tokens=completion_tok,
        total_tokens=total_tok,
        llm_calls=len(strategy.usage_history) if hasattr(strategy, "usage_history") else 0,
    )

    if not all_extractions:
        console.print("[yellow]No rings extracted[/yellow]")
        return CrawlResult(rings=[], tokens=tokens)

    # Deduplicate
    seen_names: set[str] = set()
    unique: list[LLMRingExtraction] = []
    for ext in all_extractions:
        key = ext.name.strip().lower()
        if key not in seen_names:
            seen_names.add(key)
            unique.append(ext)

    console.print(f"\n[bold green]{len(unique)} unique rings extracted[/bold green]")

    # Guess brand from URL domain
    domain = urlparse(urls[0]).netloc.replace("www.", "")
    brand = domain.split(".")[0].title()

    # Normalize
    rings = [normalize_extraction(ext, brand, Tier.MID, urls[0]) for ext in unique]

    if download_images:
        console.print("\n[bold]Downloading images...[/bold]")
        slug = brand.lower().replace(" ", "-")
        rings = await download_ring_images(rings, slug)

    tokens.llm_extractions = len(unique)

    console.print(
        f"\n[cyan]Tokens: [bold]{tokens.total_tokens:,}[/bold][/cyan]"
        f" (prompt: {tokens.prompt_tokens:,}, completion: {tokens.completion_tokens:,})"
        f" | LLM calls: {tokens.llm_calls}"
    )

    return CrawlResult(rings=rings, tokens=tokens)


# ── Save results ─────────────────────────────────────────────────────────────


def save_results(rings: list[CrawledRing], filename: str) -> Path:
    """Save crawled rings to JSON file."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    filepath = OUTPUT_DIR / filename

    data = [ring.model_dump(mode="json") for ring in rings]
    filepath.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    console.print(f"\n[bold green]Saved {len(rings)} rings to {filepath}[/bold green]")
    return filepath

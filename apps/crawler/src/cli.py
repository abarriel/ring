"""CLI for the Ring engagement ring crawler."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

import click
from crawl4ai import LLMConfig
from rich.console import Console
from rich.table import Table

from src.engine import CrawlResult, TokenUsage, ask as engine_ask, crawl_jeweler, save_results
from src.jewelers.registry import (
    ALL_JEWELERS,
    get_jeweler_by_slug,
    get_jewelers_by_tier,
    list_all_slugs,
)
from src.models import CrawledRing, Tier

console = Console()
OUTPUT_DIR = Path(__file__).parent.parent / "output" / "data"


def _get_llm_config(provider: str | None, api_key: str | None) -> LLMConfig | None:
    """Build LLM config from CLI args or env vars.

    Priority:
    1. Explicit --provider + --api-key flags
    2. ANTHROPIC_API_KEY env var -> anthropic/claude-sonnet-4-20250514
    3. OPENAI_API_KEY env var -> openai/gpt-4o-mini
    """
    if provider:
        token = api_key or os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY")
        if not token:
            console.print("[red]Error: --api-key or ANTHROPIC_API_KEY / OPENAI_API_KEY env var required[/red]")
            sys.exit(1)
        return LLMConfig(provider=provider, api_token=token)

    # Auto-detect from env
    if api_key:
        # Key provided but no provider — guess from key prefix
        if api_key.startswith("sk-ant-"):
            return LLMConfig(provider="anthropic/claude-sonnet-4-20250514", api_token=api_key)
        return LLMConfig(provider="openai/gpt-4o-mini", api_token=api_key)

    # No explicit args — engine.py auto-detects from env vars
    return None


@click.group()
def main():
    """Ring Crawler — Scrape engagement rings from top French jewelers."""
    pass


@main.command()
def list():
    """List all registered jewelers."""
    table = Table(title="French Jewelers Registry")
    table.add_column("Slug", style="cyan")
    table.add_column("Name", style="bold")
    table.add_column("Tier", style="magenta")
    table.add_column("Pagination")
    table.add_column("Max Rings", justify="right")
    table.add_column("URL", style="dim")

    for tier_name, tier_val in [("HIGH", Tier.HIGH), ("MID", Tier.MID), ("LOW", Tier.LOW)]:
        jewelers = get_jewelers_by_tier(tier_val)
        for j in jewelers:
            table.add_row(
                j.slug,
                j.name,
                tier_name,
                j.pagination.value,
                str(j.max_rings),
                j.engagement_ring_url[:60] + "...",
            )
        if tier_name != "LOW":
            table.add_section()

    console.print(table)
    console.print(f"\n[bold]{len(ALL_JEWELERS)} jewelers[/bold] across 3 tiers")


@main.command()
@click.argument("slug")
@click.option("--no-images", is_flag=True, help="Skip image download")
@click.option("--provider", default=None, help="LLM provider (e.g. openai/gpt-4o-mini)")
@click.option("--api-key", default=None, help="LLM API key")
@click.option("--max-rings", default=None, type=int, help="Override max rings to crawl")
def crawl(slug: str, no_images: bool, provider: str | None, api_key: str | None, max_rings: int | None):
    """Crawl a single jeweler by slug."""
    jeweler = get_jeweler_by_slug(slug)
    if not jeweler:
        console.print(f"[red]Unknown jeweler: {slug}[/red]")
        console.print(f"Available: {', '.join(list_all_slugs())}")
        sys.exit(1)

    if max_rings:
        jeweler = jeweler.model_copy(update={"max_rings": max_rings})

    llm_config = _get_llm_config(provider, api_key)

    result = asyncio.run(
        crawl_jeweler(jeweler, download_images=not no_images, llm_config=llm_config)
    )

    if result.rings:
        save_results(result.rings, f"{slug}.json")
        _print_summary(result.rings)


@main.command("ask")
@click.argument("prompt")
@click.option("--no-images", is_flag=True, help="Skip image download")
@click.option("--provider", default=None, help="LLM provider")
@click.option("--api-key", default=None, help="LLM API key")
@click.option("--output", "-o", default=None, help="Output filename (default: ask_result.json)")
def ask_cmd(prompt: str, no_images: bool, provider: str | None, api_key: str | None, output: str | None):
    """Ask in natural language what to crawl.

    Include a URL in your prompt. Examples:

    \b
      "for gemmyo, fetch this ring: https://www.gemmyo.com/bague-lady.html"
      "get all rings from https://www.courbet.com/bagues-de-fiancailles"
      "extract the solitaire rings from https://www.edenly.com/bague-fiancaille/"
    """
    llm_config = _get_llm_config(provider, api_key)

    result = asyncio.run(
        engine_ask(prompt, download_images=not no_images, llm_config=llm_config)
    )

    if result.rings:
        filename = output or "ask_result.json"
        save_results(result.rings, filename)
        _print_summary(result.rings)
    else:
        console.print("[yellow]No rings found.[/yellow]")


@main.command()
@click.argument("tier", type=click.Choice(["low", "mid", "high", "all"]))
@click.option("--no-images", is_flag=True, help="Skip image download")
@click.option("--provider", default=None, help="LLM provider (e.g. openai/gpt-4o-mini)")
@click.option("--api-key", default=None, help="LLM API key")
@click.option("--max-rings", default=None, type=int, help="Override max rings per jeweler")
@click.option("--delay", default=5.0, type=float, help="Delay between jewelers (seconds)")
def tier(
    tier: str,
    no_images: bool,
    provider: str | None,
    api_key: str | None,
    max_rings: int | None,
    delay: float,
):
    """Crawl all jewelers in a tier (low/mid/high/all)."""
    if tier == "all":
        jewelers = list(ALL_JEWELERS)
    else:
        tier_enum = Tier(tier)
        jewelers = get_jewelers_by_tier(tier_enum)

    if not jewelers:
        console.print(f"[red]No jewelers found for tier: {tier}[/red]")
        sys.exit(1)

    console.print(f"\n[bold]Crawling {len(jewelers)} jewelers ({tier} tier)[/bold]\n")

    llm_config = _get_llm_config(provider, api_key)
    all_rings: list[CrawledRing] = []
    all_results: list[tuple[str, CrawlResult]] = []

    for i, jeweler in enumerate(jewelers):
        if max_rings:
            jeweler = jeweler.model_copy(update={"max_rings": max_rings})

        try:
            result = asyncio.run(
                crawl_jeweler(jeweler, download_images=not no_images, llm_config=llm_config)
            )
            all_results.append((jeweler.name, result))
            if result.rings:
                save_results(result.rings, f"{jeweler.slug}.json")
                all_rings.extend(result.rings)
        except Exception as e:
            console.print(f"[red]Error crawling {jeweler.name}: {e}[/red]")
            all_results.append((jeweler.name, CrawlResult()))

        if i < len(jewelers) - 1:
            console.print(f"\n[dim]Waiting {delay}s before next jeweler...[/dim]")
            asyncio.run(asyncio.sleep(delay))

    # Save combined output
    if all_rings:
        save_results(all_rings, f"all_{tier}.json")
        _print_summary(all_rings)

    # Print token usage summary per jeweler
    _print_token_summary(all_results)


@main.command()
@click.option("--output", "-o", default="all_combined.json", help="Output filename")
def merge(output: str):
    """Merge all individual jeweler JSON files into one."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    all_rings: list[dict] = []

    json_files = sorted(OUTPUT_DIR.glob("*.json"))
    json_files = [f for f in json_files if not f.name.startswith("all_")]

    if not json_files:
        console.print("[yellow]No JSON files found in output/data/[/yellow]")
        return

    for filepath in json_files:
        try:
            data = json.loads(filepath.read_text(encoding="utf-8"))
            console.print(f"  {filepath.name}: {len(data)} rings")
            all_rings.extend(data)
        except Exception as e:
            console.print(f"  [red]{filepath.name}: {e}[/red]")

    outpath = OUTPUT_DIR / output
    outpath.write_text(json.dumps(all_rings, indent=2, ensure_ascii=False), encoding="utf-8")
    console.print(f"\n[bold green]Merged {len(all_rings)} rings into {outpath}[/bold green]")


@main.command()
def stats():
    """Show statistics from crawled data."""
    json_files = sorted(OUTPUT_DIR.glob("*.json"))
    json_files = [f for f in json_files if not f.name.startswith("all_")]

    if not json_files:
        console.print("[yellow]No crawled data found. Run 'crawl' first.[/yellow]")
        return

    table = Table(title="Crawl Statistics")
    table.add_column("Jeweler", style="bold")
    table.add_column("Rings", justify="right")
    table.add_column("With Images", justify="right")
    table.add_column("With Price", justify="right")
    table.add_column("Tier", style="magenta")

    total = 0
    for filepath in json_files:
        try:
            data = json.loads(filepath.read_text(encoding="utf-8"))
            n = len(data)
            with_images = sum(1 for r in data if r.get("images"))
            with_price = sum(1 for r in data if r.get("price_eur"))
            tier_val = data[0].get("tier", "?") if data else "?"
            table.add_row(filepath.stem, str(n), str(with_images), str(with_price), tier_val)
            total += n
        except Exception:
            table.add_row(filepath.stem, "[red]error[/red]", "", "", "")

    console.print(table)
    console.print(f"\n[bold]Total: {total} rings[/bold]")


def _print_summary(rings: list[CrawledRing]) -> None:
    """Print a nice summary of crawled rings."""
    table = Table(title="Crawl Results")
    table.add_column("#", justify="right", style="dim")
    table.add_column("Name", style="bold", max_width=40)
    table.add_column("Metal")
    table.add_column("Stone")
    table.add_column("Carat", justify="right")
    table.add_column("Price", justify="right")
    table.add_column("Images", justify="right")

    for i, ring in enumerate(rings[:20], 1):
        price = f"{ring.price_eur:,.0f} €" if ring.price_eur else "-"
        table.add_row(
            str(i),
            ring.name[:40],
            ring.metal_type.value,
            ring.stone_type.value,
            f"{ring.carat_weight:.2f}",
            price,
            str(len(ring.images)),
        )

    if len(rings) > 20:
        table.add_row("...", f"+ {len(rings) - 20} more", "", "", "", "", "")

    console.print(table)


def _print_token_summary(results: list[tuple[str, CrawlResult]]) -> None:
    """Print a per-jeweler token usage summary table."""
    table = Table(title="Token Usage Summary")
    table.add_column("Jeweler", style="bold")
    table.add_column("Rings", justify="right")
    table.add_column("Method", justify="center")
    table.add_column("LLM Calls", justify="right")
    table.add_column("Prompt", justify="right")
    table.add_column("Completion", justify="right")
    table.add_column("Total Tokens", justify="right", style="bold")

    total_tokens = 0
    total_rings = 0
    total_llm_calls = 0

    for name, result in results:
        t = result.tokens
        n_rings = len(result.rings)

        table.add_row(
            name,
            str(n_rings),
            "[cyan]llm[/cyan]",
            str(t.llm_calls),
            f"{t.prompt_tokens:,}" if t.prompt_tokens else "-",
            f"{t.completion_tokens:,}" if t.completion_tokens else "-",
            f"{t.total_tokens:,}" if t.total_tokens else "-",
        )

        total_tokens += t.total_tokens
        total_rings += n_rings
        total_llm_calls += t.llm_calls

    table.add_section()
    table.add_row(
        "[bold]TOTAL[/bold]",
        f"[bold]{total_rings}[/bold]",
        "",
        f"[bold]{total_llm_calls}[/bold]",
        "",
        "",
        f"[bold]{total_tokens:,}[/bold]",
    )

    console.print(table)

    if total_tokens > 0:
        # Rough cost estimate (Sonnet: $3/M input, $15/M output)
        est_cost = (total_tokens * 0.006) / 1000  # rough average $6/M tokens
        console.print(f"\n[dim]Estimated cost: ~${est_cost:.2f} USD[/dim]")


if __name__ == "__main__":
    main()

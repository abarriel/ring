"""Registry of French jewelers across 3 tiers: low, mid, high."""

from src.models import JewelerConfig, PaginationType, Tier

# Cookie consent dismissal JS — most French sites require this
DISMISS_COOKIES_JS = [
    # Generic cookie banner dismissal
    """(() => {
        const btns = document.querySelectorAll(
            'button[id*="accept"], button[id*="cookie"], button[class*="accept"], '
            + 'button[class*="cookie"], a[id*="accept"], [data-action="accept"]'
        );
        for (const btn of btns) btn.click();
        // OneTrust (used by many luxury brands)
        const ot = document.getElementById('onetrust-accept-btn-handler');
        if (ot) ot.click();
        // Didomi
        const didomi = document.getElementById('didomi-notice-agree-button');
        if (didomi) didomi.click();
    })()""",
]

# ── HIGH TIER — Luxury maisons ───────────────────────────────────────────────

CARTIER = JewelerConfig(
    slug="cartier",
    name="Cartier",
    tier=Tier.HIGH,
    base_url="https://www.cartier.com",
    engagement_ring_url="https://www.cartier.com/fr-fr/bijoux/bagues/bagues-de-fiancailles/",
    pagination=PaginationType.INFINITE,
    max_rings=30,
    delay_seconds=3.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:div[data-testid='product-card'], div.product-card, article.product",
    crawl_detail_pages=True,
    use_llm=True,
)

VAN_CLEEF = JewelerConfig(
    slug="van-cleef-arpels",
    name="Van Cleef & Arpels",
    tier=Tier.HIGH,
    base_url="https://www.vancleefarpels.com",
    engagement_ring_url="https://www.vancleefarpels.com/fr/fr/collections/engagement/engagement-rings.html",
    pagination=PaginationType.NONE,
    max_rings=30,
    delay_seconds=3.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-tile, .product-card, .plp-product",
    crawl_detail_pages=True,
    use_llm=True,
)

BOUCHERON = JewelerConfig(
    slug="boucheron",
    name="Boucheron",
    tier=Tier.HIGH,
    base_url="https://www.boucheron.com",
    engagement_ring_url="https://www.boucheron.com/fr/bagues-de-fiancailles",
    pagination=PaginationType.LOAD_MORE,
    max_rings=30,
    delay_seconds=2.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-tile, .product-card, article[data-product]",
    load_more_selector="button.load-more, button[data-action='load-more'], .show-more button",
    crawl_detail_pages=True,
    use_llm=True,
)

CHAUMET = JewelerConfig(
    slug="chaumet",
    name="Chaumet",
    tier=Tier.HIGH,
    base_url="https://www.chaumet.com",
    engagement_ring_url="https://www.chaumet.com/fr_fr/mariage/bagues-de-fiancailles",
    pagination=PaginationType.LOAD_MORE,
    max_rings=30,
    delay_seconds=2.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-tile, .product-card, .product-item",
    load_more_selector="button.load-more, .show-more button",
    crawl_detail_pages=True,
    use_llm=True,
)

MESSIKA = JewelerConfig(
    slug="messika",
    name="Messika",
    tier=Tier.HIGH,
    base_url="https://www.messika.com",
    engagement_ring_url="https://www.messika.com/fr/joaillerie/categories/bague-diamant",
    pagination=PaginationType.LOAD_MORE,
    max_rings=30,
    delay_seconds=2.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-tile, .product-card, .product-item",
    load_more_selector="button.load-more, .load-more-btn",
    crawl_detail_pages=True,
    use_llm=True,
)

MAUBOUSSIN = JewelerConfig(
    slug="mauboussin",
    name="Mauboussin",
    tier=Tier.HIGH,
    base_url="https://www.mauboussin.fr",
    engagement_ring_url="https://www.mauboussin.fr/fr/mariage/categories/solitaires.html",
    pagination=PaginationType.URL,
    max_pages=3,
    max_rings=30,
    delay_seconds=2.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-item, .product-card",
    crawl_detail_pages=True,
    use_llm=True,
)

FRED = JewelerConfig(
    slug="fred",
    name="Fred",
    tier=Tier.HIGH,
    base_url="https://www.fred.com",
    engagement_ring_url="https://www.fred.com/fr/categories/categories/bagues/",
    pagination=PaginationType.NONE,
    max_rings=30,
    delay_seconds=3.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-tile, .product-card",
    crawl_detail_pages=True,
    use_llm=True,
)

PIAGET = JewelerConfig(
    slug="piaget",
    name="Piaget",
    tier=Tier.HIGH,
    base_url="https://www.piaget.com",
    engagement_ring_url="https://www.piaget.com/fr-fr/joaillerie/bagues-de-fiancailles",
    pagination=PaginationType.LOAD_MORE,
    max_rings=30,
    delay_seconds=3.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-tile, .product-card, .product-grid-item",
    load_more_selector="button.load-more, .show-more",
    crawl_detail_pages=True,
    use_llm=True,
)

BULGARI = JewelerConfig(
    slug="bulgari",
    name="Bulgari",
    tier=Tier.HIGH,
    base_url="https://www.bulgari.com",
    engagement_ring_url="https://www.bulgari.com/fr-fr/fiancailles-et-mariage",
    pagination=PaginationType.LOAD_MORE,
    max_rings=30,
    delay_seconds=3.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-tile, .product-card, .product-item",
    load_more_selector="button.load-more, .show-more button",
    crawl_detail_pages=True,
    use_llm=True,
)

CHOPARD = JewelerConfig(
    slug="chopard",
    name="Chopard",
    tier=Tier.HIGH,
    base_url="https://www.chopard.com",
    engagement_ring_url="https://www.chopard.com/fr-fr/joaillerie/bagues.html",
    pagination=PaginationType.LOAD_MORE,
    max_rings=30,
    delay_seconds=3.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-tile, .product-card",
    load_more_selector="button.load-more, .show-more",
    crawl_detail_pages=True,
    use_llm=True,
)

# ── MID TIER — Accessible luxury / designer ──────────────────────────────────

GEMMYO = JewelerConfig(
    slug="gemmyo",
    name="Gemmyo",
    tier=Tier.MID,
    base_url="https://www.gemmyo.com",
    engagement_ring_url="https://www.gemmyo.com/mariage/bagues-de-fiancailles.html",
    pagination=PaginationType.INFINITE,
    max_rings=30,
    delay_seconds=2.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-card, .product-tile, .product-item",
    crawl_detail_pages=True,
    use_llm=True,
)

COURBET = JewelerConfig(
    slug="courbet",
    name="Courbet",
    tier=Tier.MID,
    base_url="https://www.courbet.com",
    engagement_ring_url="https://www.courbet.com/catalogue/bagues-de-fiancailles",
    pagination=PaginationType.NONE,
    max_rings=30,
    delay_seconds=2.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-card, .collection-product",
    crawl_detail_pages=True,
    use_llm=True,
)

EDENLY = JewelerConfig(
    slug="edenly",
    name="Edenly",
    tier=Tier.MID,
    base_url="https://www.edenly.com",
    engagement_ring_url="https://www.edenly.com/bague-fiancaille/",
    pagination=PaginationType.URL,
    max_pages=3,
    max_rings=30,
    delay_seconds=1.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-item, .product-tile",
    crawl_detail_pages=True,
    use_llm=True,
)

OR_DU_MONDE = JewelerConfig(
    slug="or-du-monde",
    name="Or du Monde",
    tier=Tier.MID,
    base_url="https://www.ordumonde.com",
    engagement_ring_url="https://www.ordumonde.com/collections/bagues-de-fiancailles",
    pagination=PaginationType.NONE,
    max_rings=30,
    delay_seconds=2.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-card, .product-item",
    crawl_detail_pages=True,
    use_llm=True,
)

DIDIER_GUERIN = JewelerConfig(
    slug="didier-guerin",
    name="Didier Guerin",
    tier=Tier.MID,
    base_url="https://www.didierguerin.com",
    engagement_ring_url="https://www.didierguerin.com/bagues-de-fiancailles/",
    pagination=PaginationType.URL,
    max_pages=3,
    max_rings=30,
    delay_seconds=2.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-card, .product-item",
    crawl_detail_pages=True,
    use_llm=True,
)

CELINNI = JewelerConfig(
    slug="celinni",
    name="Celinni",
    tier=Tier.MID,
    base_url="https://www.celinni.com",
    engagement_ring_url="https://www.celinni.com/bague-de-fiancailles.html",
    pagination=PaginationType.URL,
    max_pages=3,
    max_rings=30,
    delay_seconds=2.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-item, .product-card",
    crawl_detail_pages=True,
    use_llm=True,
)

MYEL = JewelerConfig(
    slug="myel",
    name="Myel",
    tier=Tier.MID,
    base_url="https://www.myeldesign.com",
    engagement_ring_url="https://www.myeldesign.com/fr/collections/engagement-rings",
    pagination=PaginationType.NONE,
    max_rings=30,
    delay_seconds=2.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-card, .product-item",
    crawl_detail_pages=True,
    use_llm=True,
)

INNOCENT_STONE = JewelerConfig(
    slug="innocent-stone",
    name="Innocent Stone",
    tier=Tier.MID,
    base_url="https://www.innocent-stone.fr",
    engagement_ring_url="https://www.innocent-stone.fr/collections/bagues-de-fiancailles",
    pagination=PaginationType.NONE,
    max_rings=30,
    delay_seconds=2.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-card, .product-item",
    crawl_detail_pages=True,
    use_llm=True,
)

DJULA = JewelerConfig(
    slug="djula",
    name="Djula",
    tier=Tier.MID,
    base_url="https://www.djula.fr",
    engagement_ring_url="https://www.djula.fr/collections/bagues-de-fiancailles",
    pagination=PaginationType.NONE,
    max_rings=30,
    delay_seconds=2.0,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-card, .product-item",
    crawl_detail_pages=True,
    use_llm=True,
)

POIRAY = JewelerConfig(
    slug="poiray",
    name="Poiray",
    tier=Tier.MID,
    base_url="https://www.poiray.com",
    engagement_ring_url="https://www.poiray.com/fr/bijoux/bagues",
    pagination=PaginationType.NONE,
    max_rings=30,
    delay_seconds=2.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-card, .product-item",
    crawl_detail_pages=True,
    use_llm=True,
)

# ── LOW TIER — Affordable / online-first ─────────────────────────────────────

HISTOIRE_DOR = JewelerConfig(
    slug="histoire-dor",
    name="Histoire d'Or",
    tier=Tier.LOW,
    base_url="https://www.histoiredor.com",
    engagement_ring_url="https://www.histoiredor.com/bagues/bagues-de-fiancailles",
    pagination=PaginationType.LOAD_MORE,
    max_rings=30,
    delay_seconds=1.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-tile, .product-card",
    load_more_selector="button.load-more, .show-more",
    crawl_detail_pages=True,
    use_llm=True,
)

JULIEN_DORCEL = JewelerConfig(
    slug="julien-dorcel",
    name="Julien d'Orcel",
    tier=Tier.LOW,
    base_url="https://www.julien-dorcel.com",
    engagement_ring_url="https://www.julien-dorcel.com/bagues-fiancailles.html",
    pagination=PaginationType.URL,
    max_pages=3,
    max_rings=30,
    delay_seconds=1.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-item, .product-card",
    crawl_detail_pages=True,
    use_llm=True,
)

MATY = JewelerConfig(
    slug="maty",
    name="Maty",
    tier=Tier.LOW,
    base_url="https://www.maty.com",
    engagement_ring_url="https://www.maty.com/bagues-fiancailles-V00028.html",
    pagination=PaginationType.URL,
    max_pages=3,
    max_rings=30,
    delay_seconds=1.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-item, .product-tile",
    crawl_detail_pages=True,
    use_llm=True,
)

CLEOR = JewelerConfig(
    slug="cleor",
    name="Cleor",
    tier=Tier.LOW,
    base_url="https://www.cleor.com",
    engagement_ring_url="https://www.cleor.com/bagues/bagues-de-fiancailles",
    pagination=PaginationType.LOAD_MORE,
    max_rings=30,
    delay_seconds=1.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-tile, .product-card",
    load_more_selector="button.load-more, .show-more",
    crawl_detail_pages=True,
    use_llm=True,
)

BIJOURAMA = JewelerConfig(
    slug="bijourama",
    name="Bijourama",
    tier=Tier.LOW,
    base_url="https://www.bijourama.com",
    engagement_ring_url="https://www.bijourama.com/bagues-fiancailles.html",
    pagination=PaginationType.URL,
    max_pages=3,
    max_rings=30,
    delay_seconds=1.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-item, .product-card",
    crawl_detail_pages=True,
    use_llm=True,
)

DIAMANT_UNIQUE = JewelerConfig(
    slug="diamant-unique",
    name="Diamant Unique",
    tier=Tier.LOW,
    base_url="https://www.diamant-unique.com",
    engagement_ring_url="https://www.diamant-unique.com/17-bague-de-fiancailles",
    pagination=PaginationType.URL,
    max_pages=3,
    max_rings=30,
    delay_seconds=1.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-miniature, .product-item",
    crawl_detail_pages=True,
    use_llm=True,
)

ADAMENCE = JewelerConfig(
    slug="adamence",
    name="Adamence",
    tier=Tier.LOW,
    base_url="https://www.adamence.com",
    engagement_ring_url="https://www.adamence.com/bague-fiancailles.htm",
    pagination=PaginationType.URL,
    max_pages=3,
    max_rings=30,
    delay_seconds=1.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-item, .product-card",
    crawl_detail_pages=True,
    use_llm=True,
)

JUWELO = JewelerConfig(
    slug="juwelo",
    name="Juwelo",
    tier=Tier.LOW,
    base_url="https://www.juwelo.fr",
    engagement_ring_url="https://www.juwelo.fr/bagues/bagues-de-fiancailles/",
    pagination=PaginationType.URL,
    max_pages=3,
    max_rings=30,
    delay_seconds=1.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-item, .product-card",
    crawl_detail_pages=True,
    use_llm=True,
)

BIJOUTERIE_ONLINE = JewelerConfig(
    slug="bijouterie-online",
    name="Bijouterie Online",
    tier=Tier.LOW,
    base_url="https://www.bijouterie-online.com",
    engagement_ring_url="https://www.bijouterie-online.com/bagues-fiancailles.html",
    pagination=PaginationType.URL,
    max_pages=3,
    max_rings=30,
    delay_seconds=1.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-item, .product-card",
    crawl_detail_pages=True,
    use_llm=True,
)

LE_MANEGE_A_BIJOUX = JewelerConfig(
    slug="le-manege-a-bijoux",
    name="Le Manege a Bijoux",
    tier=Tier.LOW,
    base_url="https://www.lemanegeabijoux.com",
    engagement_ring_url="https://www.lemanegeabijoux.com/bagues/fiancailles",
    pagination=PaginationType.LOAD_MORE,
    max_rings=30,
    delay_seconds=1.5,
    pre_js=DISMISS_COOKIES_JS,
    wait_for="css:.product-tile, .product-card",
    load_more_selector="button.load-more, .show-more",
    crawl_detail_pages=True,
    use_llm=True,
)


# ── Registry ─────────────────────────────────────────────────────────────────

ALL_JEWELERS: list[JewelerConfig] = [
    # High tier (10)
    CARTIER, VAN_CLEEF, BOUCHERON, CHAUMET, MESSIKA,
    MAUBOUSSIN, FRED, PIAGET, BULGARI, CHOPARD,
    # Mid tier (10)
    GEMMYO, COURBET, EDENLY, OR_DU_MONDE, DIDIER_GUERIN,
    CELINNI, MYEL, INNOCENT_STONE, DJULA, POIRAY,
    # Low tier (10)
    HISTOIRE_DOR, JULIEN_DORCEL, MATY, CLEOR, BIJOURAMA,
    DIAMANT_UNIQUE, ADAMENCE, JUWELO, BIJOUTERIE_ONLINE, LE_MANEGE_A_BIJOUX,
]


def get_jewelers_by_tier(tier: Tier) -> list[JewelerConfig]:
    return [j for j in ALL_JEWELERS if j.tier == tier]


def get_jeweler_by_slug(slug: str) -> JewelerConfig | None:
    return next((j for j in ALL_JEWELERS if j.slug == slug), None)


def list_all_slugs() -> list[str]:
    return [j.slug for j in ALL_JEWELERS]

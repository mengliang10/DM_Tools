from __future__ import annotations

import json
import logging
import urllib.parse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

def generate_deep_comments(data):
    """
    Analyzes the raw deep scan data and generates human-readable technical comments.
    """
    comments = []

    # 1. Security & Bots
    headers = data.get("security_and_bot_headers", {})
    if headers.get("X-Robots-Tag") and "noai" in headers.get("X-Robots-Tag", "").lower():
        comments.append({"cat": "Bots", "msg": "CRITICAL: X-Robots-Tag:noai detected. This site explicitly forbids AI ingestion via headers.", "type": "fail"})
    if headers.get("Content-Security-Policy"):
        comments.append({"cat": "Security", "msg": "Site implements Content-Security-Policy (CSP). High integrity signal.", "type": "pass"})

    robots = data.get("robots_txt", "")
    if robots and "GPTBot" in robots and "Disallow" in robots:
        comments.append({"cat": "Bots", "msg": "GPTBot is explicitly restricted in robots.txt.", "type": "warn"})

    # 2. DOM & Performance
    dom = data.get("dom_statistics", {})
    if dom.get("total_dom_nodes", 0) > 2000:
        comments.append({"cat": "Perf", "msg": f"High DOM complexity ({dom['total_dom_nodes']} nodes). Large trees can increase LLM compute cost and token usage.", "type": "warn"})
    if dom.get("text_to_html_ratio", 0) < 0.1:
        comments.append({"cat": "Perf", "msg": "Low Text-to-HTML ratio (<10%). Page contains heavy boilerplate or code relative to core content.", "type": "warn"})

    # 3. Headings
    h = dom.get("headings_count", {})
    if h.get("h1") == 0:
        comments.append({"cat": "Structure", "msg": "Missing H1 tag. Primary semantic entity not defined.", "type": "fail"})
    elif h.get("h1") > 1:
        comments.append({"cat": "Structure", "msg": f"Multiple H1 tags ({h['h1']}) detected. Creates semantic ambiguity for document chunking.", "type": "warn"})

    # 4. Links
    links = data.get("links_analysis", {})
    if links.get("nofollow_ugc_sponsored_count", 0) > (links.get("total_links", 1) * 0.5):
        comments.append({"cat": "Links", "msg": "High percentage of non-authoritative (NoFollow) links. May signal lower internal trust flow.", "type": "warn"})

    # 5. Scripts & CSS
    scripts = data.get("scripts_analysis", {})
    if scripts.get("inline_scripts_count", 0) > 10:
        comments.append({"cat": "Code", "msg": "Excessive inline Javascript blocks detected. Increases document entropy for RAG systems.", "type": "warn"})

    # 6. Images
    imgs = data.get("images_analysis", {})
    if imgs.get("images_missing_alt", 0) > 0:
        comments.append({"cat": "A11y", "msg": f"{imgs['images_missing_alt']} images missing ALT text. Degrades multi-modal AI understanding of visual context.", "type": "fail"})

    # 7. Schema
    schemas = data.get("extracted_schemas", [])
    if not schemas:
        comments.append({"cat": "Schema", "msg": "No JSON-LD schemas found. Critical gap in Knowledge Graph injection.", "type": "fail"})
    else:
        has_deep = any("sameAs" in str(s) or "knowsAbout" in str(s) for s in schemas)
        if not has_deep:
            comments.append({"cat": "Schema", "msg": "Found basic Schema, but missing Authority links (sameAs/knowsAbout).", "type": "warn"})

    return comments

async def fetch_lighthouse_data(url: str):
    """
    Queries Google PageSpeed Insights API to get Lighthouse metrics.

    DEPRECATED: Use services/pagespeed.py instead. This function is retained
    only for reference and is never called by the application routes.
    """
    logger.info("Fetching Lighthouse data for: %s", url)
    endpoint = f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={urllib.parse.quote(url)}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO"
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(endpoint, timeout=60.0) # Increased to 60s
            if r.status_code == 200:
                data = r.json()
                lh = data.get("lighthouseResult", {})
                categories = lh.get("categories", {})
                logger.info("Lighthouse data received successfully for %s", url)
                return {
                    "performance": categories.get("performance", {}).get("score", 0) * 100,
                    "accessibility": categories.get("accessibility", {}).get("score", 0) * 100,
                    "best_practices": categories.get("best-practices", {}).get("score", 0) * 100,
                    "seo": categories.get("seo", {}).get("score", 0) * 100,
                    "audits": {
                        "first-contentful-paint": lh.get("audits", {}).get("first-contentful-paint", {}).get("displayValue"),
                        "speed-index": lh.get("audits", {}).get("speed-index", {}).get("displayValue"),
                        "largest-contentful-paint": lh.get("audits", {}).get("largest-contentful-paint", {}).get("displayValue"),
                        "interactive": lh.get("audits", {}).get("interactive", {}).get("displayValue"),
                    }
                }
            else:
                logger.warning("Lighthouse API returned error status %d: %s", r.status_code, r.text[:200])
    except Exception as e:
        logger.warning("Lighthouse fetch failed: %s", e)
    return None

async def run_deep_scan(url: str, html: str, headers: dict, client: httpx.AsyncClient):
    soup = BeautifulSoup(html, "html.parser")
    parsed_url = urllib.parse.urlparse(url)
    base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"

    # 1. HTTP Headers & Security/Bot Signals
    security_headers = {
        "Strict-Transport-Security": headers.get("Strict-Transport-Security"),
        "Content-Security-Policy": headers.get("Content-Security-Policy"),
        "X-Content-Type-Options": headers.get("X-Content-Type-Options"),
        "X-Frame-Options": headers.get("X-Frame-Options"),
        "X-Robots-Tag": headers.get("X-Robots-Tag"),
        "Server": headers.get("Server"),
        "X-Powered-By": headers.get("X-Powered-By"),
        "Content-Encoding": headers.get("Content-Encoding"),
    }

    # 2. Meta Tags Detailed
    meta_tags = []
    for meta in soup.find_all("meta"):
        meta_tags.append(meta.attrs)

    # 3. Comprehensive Link Analysis
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        rel = a.get("rel", [])
        if isinstance(rel, str):
            rel = [rel]
        is_external = href.startswith("http") and parsed_url.netloc not in href
        links.append({
            "href": href,
            "text": a.get_text(separator=" ", strip=True)[:100],
            "rel": rel,
            "is_external": is_external,
            "is_nofollow": "nofollow" in rel or "ugc" in rel or "sponsored" in rel
        })

    # 4. Javascripts
    scripts = []
    for script in soup.find_all("script"):
        src = script.get("src")
        script_info = {
            "src": src,
            "async": script.has_attr("async"),
            "defer": script.has_attr("defer"),
            "type": script.get("type"),
            "integrity": script.get("integrity"),
            "is_inline": not bool(src),
            "inline_length": len(script.string) if script.string and not src else 0
        }
        scripts.append(script_info)

    # 5. CSS & Stylesheets
    stylesheets = []
    for link in soup.find_all("link", rel="stylesheet"):
        stylesheets.append({
            "href": link.get("href"),
            "media": link.get("media"),
            "integrity": link.get("integrity")
        })
    inline_styles = soup.find_all("style")
    style_stats = {
        "external_count": len(stylesheets),
        "inline_count": len(inline_styles),
        "total_inline_css_length": sum(len(s.string) for s in inline_styles if s.string)
    }

    # 6. Images & Optimization
    images = []
    for img in soup.find_all("img"):
        images.append({
            "src": img.get("src")[:200] if img.get("src") else None,
            "alt": img.get("alt", ""),
            "loading": img.get("loading"),
            "width": img.get("width"),
            "height": img.get("height"),
            "srcset": bool(img.get("srcset"))
        })

    # 7. Media (Video, Audio, Iframes)
    media = {
        "videos": [{"src": v.get("src"), "autoplay": v.has_attr("autoplay"), "controls": v.has_attr("controls")} for v in soup.find_all("video")],
        "audio": [{"src": a.get("src")} for a in soup.find_all("audio")],
        "iframes": [{"src": i.get("src"), "title": i.get("title"), "loading": i.get("loading")} for i in soup.find_all("iframe")]
    }

    # 8. Schema.org JSON-LD Extraction
    schemas = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            if script.string:
                schema_data = json.loads(script.string)
                schemas.append(schema_data)
        except json.JSONDecodeError:
            schemas.append({"error": "Invalid JSON-LD syntax", "raw_snippet": script.string[:200] if script.string else ""})

    # 9. Accessibility (ARIA) & i18n
    html_tag = soup.find("html")
    i18n = {
        "html_lang": html_tag.get("lang") if html_tag else None,
        "html_dir": html_tag.get("dir") if html_tag else None,
        "hreflang_links": [{"href": link.get("href"), "hreflang": link.get("hreflang")} for link in soup.find_all("link", hreflang=True)]
    }

    elements_with_roles = soup.find_all(attrs={"role": True})
    roles_used = list(set([el["role"] for el in elements_with_roles]))
    aria_labels_count = len(soup.find_all(attrs={"aria-label": True}))

    # 10. DOM Stats
    all_nodes = soup.find_all(True)
    text_content = soup.get_text(separator=" ", strip=True)

    dom_stats = {
        "total_dom_nodes": len(all_nodes),
        "html_size_bytes": len(html),
        "text_size_bytes": len(text_content),
        "text_to_html_ratio": round(len(text_content) / len(html) if len(html) > 0 else 0, 4),
        "headings_count": {
            "h1": len(soup.find_all("h1")),
            "h2": len(soup.find_all("h2")),
            "h3": len(soup.find_all("h3")),
            "h4": len(soup.find_all("h4")),
            "h5": len(soup.find_all("h5")),
            "h6": len(soup.find_all("h6"))
        }
    }

    # 11. Robots.txt (Bot-Interference)
    robots_txt = None
    try:
        r_resp = await client.get(f"{base_url}/robots.txt", timeout=3.0, follow_redirects=True)
        if r_resp.status_code == 200:
            robots_txt = r_resp.text[:2000] # First 2000 chars to avoid massive files
    except Exception:
        robots_txt = "Failed to fetch or timeout"

    full_data = {
        "security_and_bot_headers": security_headers,
        "robots_txt": robots_txt,
        "dom_statistics": dom_stats,
        "i18n_internationalization": i18n,
        "accessibility_aria": {
            "unique_roles": roles_used,
            "aria_labels_count": aria_labels_count
        },
        "extracted_schemas": schemas,
        "meta_tags": meta_tags,
        "links_analysis": {
            "total_links": len(links),
            "external_links_count": sum(1 for link in links if link["is_external"]),
            "nofollow_ugc_sponsored_count": sum(1 for link in links if link["is_nofollow"]),
            "all_links_list": links
        },
        "scripts_analysis": {
            "total_scripts": len(scripts),
            "external_scripts": [s for s in scripts if not s["is_inline"]],
            "inline_scripts_count": sum(1 for s in scripts if s["is_inline"])
        },
        "styles_analysis": {
            "stylesheets": stylesheets,
            "stats": style_stats
        },
        "images_analysis": {
            "total_images": len(images),
            "images_missing_alt": sum(1 for i in images if not i["alt"]),
            "images_lazy_loaded": sum(1 for i in images if i["loading"] == "lazy"),
            "all_images_list": images
        },
        "rich_media": media
    }

    return {
        "raw": full_data,
        "insights": generate_deep_comments(full_data)
    }

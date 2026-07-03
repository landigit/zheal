"""
INDB Food Image URL Fetcher
============================
For each food item in indb_nutrient_data.csv, this script fetches a free
image URL from:
  1. Wikimedia Commons API  (no key required)
  2. Open Food Facts API    (no key required, fallback)

Output:
  csv_exports/food_images_tagged.csv
  Columns: serial, food_code, english_name, source, image_url,
           thumbnail_url, Hindi, Bengali, Gujarati, Kannada, Malayalam,
           Marathi, Oriya, Punjabi, Tamil, Telugu, Urdu

Usage:
  python3 scripts/fetch_food_images.py
"""

import csv
import json
import time
import urllib.request
import urllib.parse
import urllib.error
import re
import os

# ── Config ────────────────────────────────────────────────────────────────────
NUTRIENT_CSV = "Indian-Nutrient-Databank-INDB/csv_exports/indb_nutrient_data.csv"
OUTPUT_CSV   = "Indian-Nutrient-Databank-INDB/csv_exports/food_images_tagged.csv"
DELAY        = 0.5   # seconds between requests (be polite to free APIs)
THUMB_SIZE   = 500   # thumbnail pixel width

LANG_COLS = ["Hindi", "Bengali", "Gujarati", "Kannada", "Malayalam",
             "Marathi", "Oriya", "Punjabi", "Tamil", "Telugu", "Urdu"]

# ── Helpers ───────────────────────────────────────────────────────────────────
def http_get(url: str, headers: dict = {}) -> dict | None:
    """Simple HTTP GET returning parsed JSON or None on failure."""
    req = urllib.request.Request(url, headers={
        "User-Agent": "zheal-nutrient-tracker/1.0 (educational project)",
        **headers
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"    ⚠ HTTP error for {url[:80]}…: {e}")
        return None

def clean_name(name: str) -> str:
    """Strip Hindi/regional names in parentheses for a cleaner search term."""
    # Remove text inside parens that looks like transliterated Hindi
    cleaned = re.sub(r'\s*\([^)]*\)', '', name).strip()
    return cleaned or name

# ── Wikimedia Commons ─────────────────────────────────────────────────────────
def wikimedia_image(food_name: str) -> tuple[str, str]:
    """
    Search Wikimedia Commons for a food image.
    Returns (image_url, thumbnail_url) or ("", "").
    """
    query = clean_name(food_name)
    
    # 1. Try Wikipedia page image first (reliable and high quality)
    wiki_api = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({
        "action":      "query",
        "titles":      query,
        "prop":        "pageimages",
        "format":      "json",
        "pithumbsize": THUMB_SIZE,
        "pilimit":     1,
    })
    data = http_get(wiki_api)
    if data:
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            thumb = page.get("thumbnail", {})
            if thumb.get("source"):
                full_url = thumb["source"].replace(
                    f"{THUMB_SIZE}px", "1200px")
                return full_url, thumb["source"]

    # 2. Fallback: Search Commons image files directly
    commons_api = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
        "action":    "query",
        "list":      "search",
        "srsearch":  f"{query} food",
        "srnamespace": 6,          # File namespace
        "srlimit":   1,
        "format":    "json",
    })
    data = http_get(commons_api)
    if data:
        results = data.get("query", {}).get("search", [])
        if results:
            title = results[0]["title"]  # e.g. "File:Idli.jpg"
            # Get actual image info
            info_api = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
                "action":  "query",
                "titles":  title,
                "prop":    "imageinfo",
                "iiprop":  "url|thumburl",
                "iiurlwidth": THUMB_SIZE,
                "format":  "json",
            })
            info = http_get(info_api)
            if info:
                for pg in info.get("query", {}).get("pages", {}).values():
                    ii = pg.get("imageinfo", [{}])[0]
                    return ii.get("url", ""), ii.get("thumburl", "")

    return "", ""


# ── Open Food Facts ───────────────────────────────────────────────────────────
def off_image(food_name: str) -> tuple[str, str]:
    """
    Search Open Food Facts for a product image.
    Returns (image_url, thumbnail_url) or ("", "").
    """
    query = clean_name(food_name)
    url = "https://world.openfoodfacts.org/cgi/search.pl?" + urllib.parse.urlencode({
        "search_terms":   query,
        "search_simple":  1,
        "action":         "process",
        "json":           1,
        "page_size":      1,
        "fields":         "image_url,image_thumb_url,product_name",
        "cc":             "in",   # India region first
        "lc":             "en",
    })
    data = http_get(url)
    if data:
        products = data.get("products", [])
        if products:
            p = products[0]
            return p.get("image_url", ""), p.get("image_thumb_url", "")
    return "", ""


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    # Load food items
    items: list[dict] = []
    with open(NUTRIENT_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row.get("food_code", "").strip()
            name = row.get("food_name", "").strip()
            if code:
                items.append({"food_code": code, "english_name": name})

    print(f"Processing {len(items)} food items…\n")

    # Load existing results if resuming
    existing: dict[str, dict] = {}
    if os.path.exists(OUTPUT_CSV):
        with open(OUTPUT_CSV, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row.get("food_code"):
                    existing[row["food_code"]] = row
        print(f"  Resuming — {len(existing)} already processed.\n")

    fieldnames = ["serial", "food_code", "english_name",
                  "source", "image_url", "thumbnail_url"] + LANG_COLS

    results: list[dict] = []
    serial = 1

    for item in items:
        code = item["food_code"]
        name = item["english_name"]

        # Skip already done
        if code in existing:
            results.append(existing[code])
            serial += 1
            continue

        print(f"  [{serial:04d}/{len(items)}] {code}  {name[:50]}")

        img_url, thumb_url, source = "", "", ""

        # Try Wikimedia first
        img_url, thumb_url = wikimedia_image(name)
        if img_url:
            source = "wikimedia"
        else:
            # Fallback to Open Food Facts
            img_url, thumb_url = off_image(name)
            if img_url:
                source = "openfoodfacts"
            else:
                source = "none"

        if img_url:
            print(f"    ✅ {source}: {img_url[:70]}…")
        else:
            print(f"    ❌ No image found")

        results.append({
            "serial":       serial,
            "food_code":    code,
            "english_name": name,
            "source":       source,
            "image_url":    img_url,
            "thumbnail_url": thumb_url,
            **{lang: "" for lang in LANG_COLS},
        })
        serial += 1

        # Write incrementally (safe resume on crash)
        with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(results)

        time.sleep(DELAY)

    # Final summary
    found   = sum(1 for r in results if r.get("image_url"))
    wiki    = sum(1 for r in results if r.get("source") == "wikimedia")
    off     = sum(1 for r in results if r.get("source") == "openfoodfacts")
    missing = len(results) - found

    print(f"\n{'='*55}")
    print(f"  Total items:        {len(results)}")
    print(f"  Images found:       {found}  ({wiki} wikimedia, {off} openfoodfacts)")
    print(f"  Missing images:     {missing}")
    print(f"  Output CSV:         {OUTPUT_CSV}")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    main()

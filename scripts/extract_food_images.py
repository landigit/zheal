"""
IFCT2017 PDF Image Extractor
============================
Extracts food images from IFCT2017 PDFs and maps them to food names
(English + regional translation tags) from the INDB nutrient CSV.

Output:
  - images/  → extracted image files named by food code
  - food_images.csv → serial, food_code, english_name, image_file,
                       hindi, bengali, gujarati, kannada, malayalam,
                       marathi, oriya, punjabi, tamil, telugu, urdu
"""

import fitz  # PyMuPDF
import csv
import os
import re
import hashlib

# ── Config ────────────────────────────────────────────────────────────────────
PDF_FILES = [
    "Indian-Nutrient-Databank-INDB/IFCT2017_v1.pdf",
    "Indian-Nutrient-Databank-INDB/IFCT2017-v2.pdf",
]
NUTRIENT_CSV = "Indian-Nutrient-Databank-INDB/csv_exports/indb_nutrient_data.csv"
OUTPUT_DIR   = "Indian-Nutrient-Databank-INDB/food_images"
OUTPUT_CSV   = "Indian-Nutrient-Databank-INDB/csv_exports/food_images_tagged.csv"

# Regional language column order used in IFCT2017 tables
LANG_COLS = ["Hindi", "Bengali", "Gujarati", "Kannada", "Malayalam",
             "Marathi", "Oriya", "Punjabi", "Tamil", "Telugu", "Urdu"]

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Step 1 – Load nutrient CSV to get food codes + English names ───────────────
def load_food_codes(nutrient_csv: str) -> dict[str, str]:
    """Returns {food_code: english_name}"""
    mapping = {}
    with open(nutrient_csv, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row.get("food_code", "").strip()
            name = row.get("food_name", "").strip()
            if code:
                mapping[code] = name
    print(f"  Loaded {len(mapping)} food codes from nutrient CSV.")
    return mapping

# ── Step 2 – Parse text blocks near images for food codes / names ──────────────
# IFCT food codes look like:  A001, A002 … Z999
CODE_RE = re.compile(r'\b([A-Z]{1,3}\d{3,4})\b')

def slug(name: str) -> str:
    """Convert English name to a safe filename slug."""
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')[:60]

def extract_images_from_pdf(pdf_path: str, food_map: dict[str, str],
                             seen_hashes: set) -> list[dict]:
    """Extract images and associate them with food codes via nearby text."""
    records = []
    doc = fitz.open(pdf_path)
    print(f"\nProcessing: {pdf_path}  ({len(doc)} pages)")

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text")

        # Find all food codes mentioned on this page
        found_codes = CODE_RE.findall(text)

        # Extract images from this page
        img_list = page.get_images(full=True)
        if not img_list:
            continue

        for img_idx, img_info in enumerate(img_list):
            xref = img_info[0]
            base_image = doc.extract_image(xref)

            img_bytes  = base_image["image"]
            img_ext    = base_image["ext"]
            img_w      = base_image["width"]
            img_h      = base_image["height"]

            # Skip tiny images (icons, borders, bullets < 40×40 px)
            if img_w < 40 or img_h < 40:
                continue

            # Deduplicate by content hash
            h = hashlib.md5(img_bytes).hexdigest()
            if h in seen_hashes:
                continue
            seen_hashes.add(h)

            # Choose the best matching food code for this image
            # (prefer codes we know from the nutrient CSV)
            matched_code = None
            for code in found_codes:
                if code in food_map:
                    matched_code = code
                    break

            english_name = food_map.get(matched_code, "") if matched_code else ""

            # Build filename: prefer code, fallback to hash
            if matched_code:
                filename = f"{matched_code}_{slug(english_name)}.{img_ext}"
            else:
                filename = f"unknown_{h[:10]}.{img_ext}"

            out_path = os.path.join(OUTPUT_DIR, filename)
            with open(out_path, "wb") as f:
                f.write(img_bytes)

            records.append({
                "food_code":    matched_code or "",
                "english_name": english_name,
                "image_file":   filename,
                "page":         page_num,
                "pdf":          os.path.basename(pdf_path),
            })

    doc.close()
    return records

# ── Step 3 – Build translation tags from IFCT text tables ─────────────────────
def parse_translations(pdf_path: str) -> dict[str, dict[str, str]]:
    """
    Parse pages that contain food name translation tables.
    Returns {food_code: {Hindi: "...", Bengali: "...", ...}}
    """
    translations: dict[str, dict[str, str]] = {}
    doc = fitz.open(pdf_path)

    for page in doc:
        # Extract table cells via blocks
        blocks = page.get_text("blocks")
        code_match = None
        lang_data: dict[str, str] = {}

        for block in blocks:
            text = block[4].strip()
            # Detect food code
            m = CODE_RE.match(text)
            if m:
                # Save previous entry
                if code_match and lang_data:
                    translations.setdefault(code_match, {}).update(lang_data)
                code_match = m.group(1)
                lang_data = {}
                continue

            # Match language columns by position / order heuristic
            # IFCT tables list: Hindi | Bengali | Gujarati | Kannada …
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            for i, lang in enumerate(LANG_COLS):
                if i < len(lines):
                    lang_data[lang] = lines[i]

        # Save last entry on page
        if code_match and lang_data:
            translations.setdefault(code_match, {}).update(lang_data)

    doc.close()
    return translations

# ── Step 4 – Write output CSV ─────────────────────────────────────────────────
def write_csv(records: list[dict], translations: dict[str, dict[str, str]],
              output_csv: str):
    fieldnames = ["serial", "food_code", "english_name", "image_file",
                  "page", "pdf"] + LANG_COLS

    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for i, rec in enumerate(records, start=1):
            code = rec.get("food_code", "")
            trans = translations.get(code, {})
            row = {
                "serial":       i,
                "food_code":    code,
                "english_name": rec.get("english_name", ""),
                "image_file":   rec.get("image_file", ""),
                "page":         rec.get("page", ""),
                "pdf":          rec.get("pdf", ""),
            }
            for lang in LANG_COLS:
                row[lang] = trans.get(lang, "")
            writer.writerow(row)

    print(f"\n✅  Wrote {len(records)} rows → {output_csv}")

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    food_map     = load_food_codes(NUTRIENT_CSV)
    all_records  = []
    all_trans    = {}
    seen_hashes  : set[str] = set()

    for pdf_path in PDF_FILES:
        if not os.path.exists(pdf_path):
            print(f"  ⚠ Skipping missing file: {pdf_path}")
            continue

        records = extract_images_from_pdf(pdf_path, food_map, seen_hashes)
        trans   = parse_translations(pdf_path)
        all_records.extend(records)
        all_trans.update(trans)

        print(f"  → {len(records)} images extracted, "
              f"{len(trans)} translation entries parsed.")

    write_csv(all_records, all_trans, OUTPUT_CSV)
    print(f"\nImages saved to: {OUTPUT_DIR}/")
    print(f"CSV saved to:    {OUTPUT_CSV}")

if __name__ == "__main__":
    main()

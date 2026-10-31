#!/usr/bin/env python3
"""Rebuild browser-customised Word downloads from the four approved DOCX files.

Run with Python 3 after updating the form assets. No third-party packages needed.
The blank documents are the source of truth; only their optional area/team line
changes in a customised download. Font binaries must never be published here.
"""

import argparse
import base64
import json
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
FILES = {
    "offer": "Offer_a_Call_v12.docx",
    "handover": "Arrange_and_Hand_Over_v12.docx",
    "call_service": "Person_Call_and_Feedback_v13.docx",
    "call_carer": "Carer_Call_and_Feedback_v12.docx",
}


def read_form(filename):
    with ZipFile(ASSETS / filename) as archive:
        parts = {name: archive.read(name) for name in archive.namelist()}
    if any(name.startswith("word/fonts/") for name in parts):
        raise ValueError(f"{filename}: embedded font binaries are not approved for these editable forms")
    document = parts["word/document.xml"].decode("utf-8")
    for label, variable in [("Area", "AREA"), ("Team", "TEAM")]:
        marker = f"{label}: [optional]"
        if document.count(marker) != 1:
            raise ValueError(f"{filename}: expected one unbroken '{marker}' label")
        document = document.replace(marker, f"{label}: {{{{{variable}}}}}")
    parts["word/document.xml"] = document.encode("utf-8")
    return parts


def encode_part(name, data):
    if name.endswith((".xml", ".rels")):
        return {"text": data.decode("utf-8")}
    return {"base64": base64.b64encode(data).decode("ascii")}


def rebuild():
    forms = {key: read_form(filename) for key, filename in FILES.items()}
    first = next(iter(forms.values()))
    common_names = {
        name for name, data in first.items()
        if name != "word/document.xml"
        and all(parts.get(name) == data for parts in forms.values())
    }
    pack = {
        "common": {name: encode_part(name, first[name]) for name in sorted(common_names)},
        "templates": {
            key: {
                name: encode_part(name, data)
                for name, data in sorted(parts.items()) if name not in common_names
            }
            for key, parts in forms.items()
        },
    }
    return (json.dumps(pack, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check the generated pack without changing it")
    args = parser.parse_args()
    target = ASSETS / "word-packs.json"
    content = rebuild()
    if args.check:
        if target.read_bytes() != content:
            raise SystemExit("word-packs.json is stale; run python3 scripts/rebuild-word-packs.py")
        print("All four customised templates match their approved Word forms.")
    else:
        target.write_bytes(content)
        print(f"Rebuilt {target.relative_to(ROOT)} from all four Word forms.")

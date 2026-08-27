#!/usr/bin/env python3
"""
Turn a Claude Artifacts export into a page a static host can serve.

Why this exists
---------------
An artifact export is a fragment: it starts at <title> and has no <!doctype>,
<html>, <head> or <body>. The artifact runtime supplies those at publish time.
Netlify does not. Served raw, the page renders in quirks mode with no
charset (star and arrow glyphs turn into mojibake) and no viewport tag (phones
render it at desktop width and zoom out).

This script adds the document shell, the meta tags, the icons, the social
preview tags and the footer link back to index.html.

Usage
-----
    python3 tools/wrap-artifact.py <exported-file.html> [output.html]

If output.html is omitted the input filename is used. When the output name
matches one of the three games below, its metadata is filled in automatically;
otherwise generic values are used and you can edit the result by hand.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

META = {
    "once-upon-a-year.html": {
        "icon": "assets/favicon-once-upon.svg",
        "og": "assets/og-once-upon-a-year.png",
        "desc": "558 moments from a century of Disney, shuffled. Put them back in "
                "order - solo with three wishes, or 2 to 4 player press-your-luck.",
        "light": "#EFEBFC", "dark": "#1B1440",
    },
    "the-year-drawer.html": {
        "icon": "assets/favicon-year-drawer.svg",
        "og": "assets/og-the-year-drawer.png",
        "desc": "Slot undated events into a timeline you build as you go. Solo runs "
                "with three lives and a cash-out, or 2 to 4 player press-your-luck.",
        "light": "#E9E6D8", "dark": "#161D1A",
    },
    "letter-blitz.html": {
        "icon": "assets/favicon-letter-blitz.svg",
        "og": "assets/og-letter-blitz.png",
        "desc": "Roll a letter, race the clock down a sheet of categories, then score "
                "the answers nobody else thought of. A party game for 2 to 8 players.",
        "light": "#EAF3EE", "dark": "#14201C",
    },
    "e-ticket-tribond.html": {
        "icon": "assets/favicon-tribond.svg",
        "og": "assets/og-e-ticket-tribond.png",
        "desc": "Three Disney things share exactly one connection. A three-player "
                "party game graded like the old A-through-E coupon books.",
        "light": "#0E1A33", "dark": "#0E1A33",
    },
}

GENERIC = {
    "icon": "assets/favicon.svg",
    "og": "assets/og-index.png",
    "desc": "A browser game from The Game Shelf.",
    "light": "#EDEDF2", "dark": "#131318",
}

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="description" content="{desc}">
<meta name="theme-color" content="{light}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="{dark}" media="(prefers-color-scheme: dark)">
<link rel="icon" href="{icon}" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/icon-192.png">
<link rel="manifest" href="site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{og}">
<meta name="twitter:card" content="summary_large_image">
"""

FOOTER_CSS = """<style>
.shelf-footer{
  position:relative;z-index:1;
  max-width:1080px;margin:0 auto;padding:28px 20px 44px;
  font:400 13px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
  letter-spacing:.04em;
}
.shelf-footer a{color:inherit;text-decoration:none;opacity:.6;border-bottom:1px solid currentColor;padding-bottom:2px}
.shelf-footer a:hover,.shelf-footer a:focus-visible{opacity:1}
</style>"""

FOOTER = """<footer class="shelf-footer">
  <a href="index.html">&larr; The Game Shelf</a>
</footer>"""


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)

    src = pathlib.Path(sys.argv[1])
    if not src.exists():
        sys.exit("no such file: " + str(src))

    out_name = sys.argv[2] if len(sys.argv) > 2 else src.name
    out = ROOT / out_name
    meta = META.get(pathlib.Path(out_name).name, GENERIC)

    raw = src.read_text(encoding="utf-8")

    if raw.lstrip().lower().startswith("<!doctype"):
        sys.exit(str(src) + " is already a full document - nothing to do")
    if raw.count("</style>") != 1:
        sys.exit("expected exactly one <style> block, found " + str(raw.count("</style>")))

    cut = raw.index("</style>") + len("</style>")
    head_part, body_part = raw[:cut], raw[cut:]

    m = re.search(r"<title>(.*?)</title>", head_part, re.S)
    if not m:
        sys.exit("the export has no <title> - add one before wrapping")
    title = m.group(1).strip()

    page = (
        HEAD.format(title=title, **meta)
        + head_part.strip() + "\n"
        + FOOTER_CSS + "\n</head>\n<body>\n"
        + body_part.strip() + "\n"
        + FOOTER + "\n</body>\n</html>\n"
    )

    out.write_text(page, encoding="utf-8")
    print("wrote {}  ({:,} bytes)  -  {}".format(out.name, len(page.encode()), title))


if __name__ == "__main__":
    main()

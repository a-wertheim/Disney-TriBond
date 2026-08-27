# The Game Shelf

Three party games that run entirely in a browser tab. No build step, no
framework, no server, no dependencies — each game is a single self-contained
HTML file with its own CSS, JavaScript and card deck inside it.

| Game | What it is | Players | Cards |
|---|---|---|---|
| [Once Upon a Year](once-upon-a-year.html) | Put a century of Disney back in chronological order | 1–4 | 558 |
| [The Year Drawer](the-year-drawer.html) | The same game across history, science, culture, space and sport | 1–4 | 176 |
| [E-Ticket TriBond](e-ticket-tribond.html) | Three Disney things, one hidden connection | 3 | 83 |

---

## Publishing it

1. Push this folder to a GitHub repository.
2. **Settings → Pages → Source**, and pick one:
   - **Deploy from a branch** — choose `main` and `/ (root)`. Simplest option.
     Delete `.github/workflows/deploy.yml`, you won't need it.
   - **GitHub Actions** — the included workflow uploads the whole repo as-is on
     every push to `main`. Use this if you'd rather not hand Pages a branch.
3. Wait for the first deploy, then open `https://<user>.github.io/<repo>/`.

Every link and asset path in the site is **relative**, so it works unchanged
whether it's served from a repo subpath (`user.github.io/games/`), a user site
(`user.github.io/`), or a custom domain. Nothing to configure.

### Local preview

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening the files directly with `file://` mostly works too, but a local server
matches what Pages actually does.

### Checking it before you push

```bash
npm i playwright && npx playwright install chromium
node tools/selftest.js
```

This serves the site from a fake repo subpath — the same shape as
`user.github.io/repo/` — and checks every page for a valid doctype, UTF-8, a
viewport tag, broken links and assets, JavaScript errors, horizontal overflow at
phone width, and that each game still deals a card. It exits non-zero on any
failure, so it drops straight into CI if you ever want it there.

---

## What's in here

```
index.html                 the shelf — links to the three games
once-upon-a-year.html      \
the-year-drawer.html        }  one self-contained game each
e-ticket-tribond.html      /
404.html                   fallback page, served automatically by Pages
.nojekyll                  see below — do not delete
site.webmanifest           lets the site be added to a phone home screen
robots.txt                 allows indexing
assets/
  favicon*.svg             one mark for the site, one per game
  icon-192.png             home-screen icons referenced by the manifest
  icon-512.png
  og-*.png                 1200×630 link-preview images
tools/
  wrap-artifact.py         re-wraps a Claude Artifacts export (see below)
  make-images.js           regenerates the og and icon PNGs
  selftest.js              serves the site and checks every page
.github/workflows/
  deploy.yml               optional — only for the "GitHub Actions" source
```

### `.nojekyll`

GitHub Pages runs everything through Jekyll by default, which silently ignores
files and folders whose names begin with `_` or `.`. This site doesn't need
Jekyll at all, and the empty `.nojekyll` file switches it off. Keep it.

---

## Editing the games

Each game file is plain HTML with three parts in order: a `<style>` block, the
markup, and a `<script>` block. Inside the script, near the top, is the deck:

```js
const DECK = [
  {e:"Pirates of the Caribbean opens at Disneyland",y:1967,c:"park",
   f:"It was the last attraction Walt Disney personally supervised, and he died before it opened."},
  ...
];
```

- `e` — the event, with no year in the text
- `y` — the year, a plain integer (negative for BC in The Year Drawer)
- `c` — the category key, which must match one of the keys in the `CATS` object
  defined just above the deck
- `f` — the one-line fact shown after the card is placed

Add or edit a line, save, reload. Nothing to rebuild.

E-Ticket TriBond's deck uses different fields: `c` is the array of three clues,
`a` is the answer, `h` is the hint, `n` is the note, and `t` is the ticket grade
(`1` = A-ticket, `2` = C-ticket, `3` = E-ticket).

### Renaming the site

"The Game Shelf" appears in `index.html` (the `<h1>`, the `<title>` and the
Open Graph tags), in the footer of each game page, in `404.html`, and in
`site.webmanifest`. A find-and-replace across the repo covers all of them.

---

## Replacing a game with a newer version

Files exported from Claude Artifacts are **fragments** — they begin at `<title>`
and carry no `<!doctype>`, `<html>`, `<head>` or `<body>`, because the artifact
runtime adds those at publish time. A static host does not. Served raw, such a
file renders in quirks mode with no character encoding (the `✦` and `←` glyphs
turn to mojibake) and no viewport tag (phones render it at desktop width).

`tools/wrap-artifact.py` adds the document shell, the meta tags, the icons, the
preview tags and the footer link back to the index:

```bash
python3 tools/wrap-artifact.py ~/Downloads/once-upon-a-year.html
```

It writes to the repo root using the input filename, and fills in that game's
metadata automatically when the name matches one of the three. It refuses to run
on a file that is already a complete document, so it is safe to re-run.

---

## Link previews

The `og:image` tags use relative paths, which most link scrapers resolve against
the page URL. If you want them fully spec-compliant, make them absolute once you
know your Pages URL:

```bash
grep -rl 'content="assets/og-' *.html | xargs sed -i '' \
  's#content="assets/og-#content="https://USER.github.io/REPO/assets/og-#'
```

(Drop the `''` after `-i` on Linux.)

To regenerate the preview images themselves after changing a title:

```bash
npm i playwright && npx playwright install chromium
node tools/make-images.js
```

---

## Privacy

There is no server, no database, no analytics and no third-party script. The
only thing stored is your solo best score, written to your own browser's
`localStorage` and never transmitted. The one external request any page makes is
to Google Fonts for the typefaces; every font declaration has a real fallback
stack, so the games work correctly offline and if that request is blocked.

## A note on the content

The card decks are original text written for these games. Disney, Pixar, Marvel,
Star Wars and the attraction and film names are trademarks of their respective
owners, referred to here descriptively. Nothing in this repo is affiliated with
or endorsed by The Walt Disney Company. TriBond is a trademark of its owner;
"E-Ticket TriBond" is a homemade variant, not a licensed product.

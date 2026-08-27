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

## Deploying to Netlify

There is nothing to build. Pick whichever of these suits you.

### Drag and drop — fastest

Go to **[app.netlify.com/drop](https://app.netlify.com/drop)** and drag this
folder onto the page. That's the whole process. You get a live URL like
`glittering-otter-12ab34.netlify.app` within a few seconds.

To update later, drag the folder again onto the same site's **Deploys** tab.

### Netlify CLI — repeatable

```bash
npm i -g netlify-cli
netlify deploy --dir . --prod
```

The first run walks you through linking or creating a site.

### Connected to a git repository — deploys on every push

In Netlify: **Add new site → Import an existing project**, pick the repo, and
when it asks for build settings:

- **Build command** — leave empty
- **Publish directory** — `.`

`netlify.toml` in this folder already declares both, so you can just accept
what it fills in. Every push to your default branch redeploys.

---

## What's in here

```
index.html                 the shelf — links to the three games
once-upon-a-year.html      \
the-year-drawer.html        }  one self-contained game each
e-ticket-tribond.html      /
404.html                   Netlify serves this automatically for missing pages
netlify.toml               publish dir, short links, cache and security headers
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
  selftest.js              serves the site like Netlify does and checks it
```

Every link and asset path is **relative**, so the site works unchanged at a
`netlify.app` subdomain, at a custom domain, or in a subfolder.

### Short links

`netlify.toml` sets up three, so you can say one out loud across a room:

| Type this | Get this |
|---|---|
| `/disney` | Once Upon a Year |
| `/timeline` | The Year Drawer |
| `/tribond` | E-Ticket TriBond |

---

## Pointing blockcitylabs.com at it

In Netlify: **Site configuration → Domain management → Add a domain**, enter
`blockcitylabs.com`.

Then at your DNS provider, **replace** the four GitHub Pages `A` records the
domain currently has:

- **Apex** (`blockcitylabs.com`) — an `ALIAS`, `ANAME` or flattened `CNAME`
  record pointing to `apex-loadbalancer.netlify.com`. If your provider doesn't
  offer those record types, use an `A` record to `75.2.60.5` instead.
- **www** — a `CNAME` record pointing to your `<site-name>.netlify.app`.

Delete the old `185.199.108–111.153` records, or the domain will keep resolving
to GitHub. Netlify issues the TLS certificate on its own once DNS resolves,
which usually takes minutes but can take up to a day.

---

## Checking it before you deploy

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

For the fuller check:

```bash
npm i playwright && npx playwright install chromium
node tools/selftest.js
```

That one serves the site the way Netlify actually does — folder at the domain
root, `.html` stripped from URLs, the short links redirecting, `404.html` on a
miss — and verifies every page has a valid doctype, UTF-8, a viewport tag, no
broken links or assets, no JavaScript errors, no horizontal overflow at phone
width, and that each game still deals a card. It exits non-zero on any failure.

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

Add or edit a line, save, redeploy. Nothing to rebuild.

E-Ticket TriBond's deck uses different fields: `c` is the array of three clues,
`a` is the answer, `h` is the hint, `n` is the note, and `t` is the ticket grade
(`1` = A-ticket, `2` = C-ticket, `3` = E-ticket).

### Renaming the site

"The Game Shelf" appears in `index.html` (the `<h1>`, the `<title>` and the
Open Graph tags), in the footer of each game page, in `404.html`, and in
`site.webmanifest`. A find-and-replace across the folder covers all of them.

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

It writes to this folder using the input filename and fills in that game's
metadata automatically when the name matches one of the three. It refuses to run
on a file that is already a complete document, so it is safe to re-run.

---

## Link previews

The `og:image` tags use relative paths, which most link scrapers resolve against
the page URL. To make them absolute once you know your domain:

```bash
grep -rl 'content="assets/og-' *.html | xargs sed -i '' \
  's#content="assets/og-#content="https://blockcitylabs.com/assets/og-#'
```

(Drop the `''` after `-i` on Linux.) To regenerate the images themselves after
changing a title: `node tools/make-images.js`.

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
owners, referred to here descriptively. Nothing here is affiliated with or
endorsed by The Walt Disney Company. TriBond is a trademark of its owner;
"E-Ticket TriBond" is a homemade variant, not a licensed product.

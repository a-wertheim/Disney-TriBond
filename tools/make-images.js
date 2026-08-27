/* Regenerates assets/og-*.png and assets/icon-*.png.
   Needs Playwright:  npm i playwright && npx playwright install chromium
   Run from anywhere: node tools/make-images.js                        */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'assets');

const SERIF = "'Bitstream Charter','DejaVu Serif',Georgia,serif";
const SANS = "'TeX Gyre Heros','DejaVu Sans',Helvetica,Arial,sans-serif";
const MONO = "'DejaVu Sans Mono',monospace";

const star = (c) => `<svg viewBox="0 0 78 78" width="150" height="150">
  <path d="M39 6 L46 28 L68 21 L52 39 L68 57 L46 50 L39 72 L32 50 L10 57 L26 39 L10 21 L32 28 Z"
        fill="none" stroke="${c}" stroke-width="2.6" stroke-linejoin="round"/>
  <circle cx="39" cy="39" r="7" fill="${c}"/></svg>`;

const drawer = (c) => `<svg viewBox="0 0 78 78" width="150" height="150">
  <rect x="8" y="15" width="62" height="48" rx="4" fill="none" stroke="${c}" stroke-width="2.6"/>
  <line x1="8" y1="27" x2="70" y2="27" stroke="${c}" stroke-width="2.6"/>
  <rect x="31" y="39" width="16" height="6" rx="3" fill="${c}"/>
  <line x1="19" y1="54" x2="59" y2="54" stroke="${c}" stroke-width="2.6" opacity=".45"/></svg>`;

const ticket = (c, bg) => `<svg viewBox="0 0 78 78" width="150" height="150">
  <rect x="7" y="18" width="64" height="42" rx="4" fill="none" stroke="${c}" stroke-width="2.6"/>
  <circle cx="7" cy="39" r="5.5" fill="${bg}" stroke="${c}" stroke-width="2.6"/>
  <circle cx="71" cy="39" r="5.5" fill="${bg}" stroke="${c}" stroke-width="2.6"/>
  <line x1="21" y1="30" x2="57" y2="30" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>
  <line x1="21" y1="39" x2="57" y2="39" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>
  <line x1="21" y1="48" x2="43" y2="48" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/></svg>`;

const tile = (bg, ink) => `<svg viewBox="0 0 78 78" width="150" height="150">
  <rect x="6" y="6" width="66" height="66" rx="14" fill="${bg}" stroke="${ink}" stroke-width="4"/>
  <text x="39" y="56" text-anchor="middle" font-family="${SERIF}" font-size="46" font-weight="700" fill="${ink}">B</text>
  <circle cx="58" cy="58" r="4" fill="${ink}"/></svg>`;

function card({ bg, glyph, kicker, kickerColor, title, titleColor, accent, sub, facts, rule }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;background:${bg};display:flex;overflow:hidden}
  .pad{padding:74px 84px;display:flex;flex-direction:column;justify-content:space-between;width:100%}
  .top{display:flex;align-items:flex-start;gap:46px}
  .txt{padding-top:6px}
  .k{font-family:${MONO};font-size:20px;letter-spacing:.22em;text-transform:uppercase;color:${kickerColor};margin-bottom:22px}
  h1{font-family:${SERIF};font-size:82px;line-height:1.02;color:${titleColor};letter-spacing:-.01em;font-weight:400}
  h1 em{font-style:normal;color:${accent}}
  .sub{font-family:${SANS};font-size:29px;line-height:1.42;color:${titleColor};opacity:.72;max-width:23ch;margin-top:26px}
  .facts{font-family:${MONO};font-size:21px;letter-spacing:.08em;color:${accent};display:flex;gap:30px;flex-wrap:wrap;
         border-top:2px solid ${rule};padding-top:26px}
  </style></head><body><div class="pad">
    <div class="top">${glyph}
      <div class="txt"><div class="k">${kicker}</div><h1>${title}</h1><div class="sub">${sub}</div></div>
    </div>
    <div class="facts">${facts.map(f => `<span>${f}</span>`).join('')}</div>
  </div></body></html>`;
}

const CARDS = {
  'og-once-upon-a-year.png': card({
    bg: '#1B1440', glyph: star('#F5C24C'),
    kicker: 'A timeline game', kickerColor: '#B8AFDE',
    title: 'Once Upon <em>a Year</em>', titleColor: '#F6F0FF', accent: '#F5C24C', rule: 'rgba(246,240,255,.18)',
    sub: 'A century of Disney, shuffled. Put it back in order.',
    facts: ['558 CARDS', '1893 - 2025', '1-4 PLAYERS'],
  }),
  'og-the-year-drawer.png': card({
    bg: '#171E1B', glyph: drawer('#5CC3B9'),
    kicker: 'A timeline game', kickerColor: '#A4AEA7',
    title: 'The Year <em>Drawer</em>', titleColor: '#EAE6D7', accent: '#5CC3B9', rule: 'rgba(234,230,215,.18)',
    sub: 'File each card where it belongs in time.',
    facts: ['176 CARDS', '3500 BC - 2022', '1-4 PLAYERS'],
  }),
  'og-letter-blitz.png': card({
    bg: '#E7F1EB', glyph: tile('#EE9F2C', '#1D2A25'),
    kicker: 'A category race', kickerColor: '#55635C',
    title: 'Letter <em>Blitz</em>', titleColor: '#1D2A25', accent: '#DE4636', rule: 'rgba(29,42,37,.25)',
    sub: 'One letter. Ninety seconds. No repeats.',
    facts: ['232 CATEGORIES', 'PEN AND PAPER', '2-8 PLAYERS'],
  }),
  'og-e-ticket-tribond.png': card({
    bg: '#0E1A33', glyph: ticket('#F4EAD6', '#0E1A33'),
    kicker: 'A riddle game', kickerColor: 'rgba(244,234,214,.6)',
    title: 'E-Ticket <em>TriBond</em>', titleColor: '#F4EAD6', accent: '#F4B740', rule: 'rgba(244,234,214,.22)',
    sub: 'Three Disney things. One hidden connection.',
    facts: ['83 CARDS', 'A / C / E TICKETS', '3 PLAYERS'],
  }),
};

const INDEX = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#131318;color:#F0F0F5;overflow:hidden}
.pad{padding:78px 84px;height:100%;display:flex;flex-direction:column;justify-content:space-between}
.k{font-family:${MONO};font-size:20px;letter-spacing:.22em;text-transform:uppercase;color:#7A7A88}
h1{font-family:${SERIF};font-size:112px;line-height:.98;letter-spacing:-.02em;font-weight:400;margin-top:24px}
h1 em{font-style:italic;color:#A6A6B4}
.row{display:flex;gap:20px;border-top:2px solid #2C2C38;padding-top:34px}
.g{flex:1;border-left:4px solid var(--c);padding-left:20px}
.g .n{font-family:${SERIF};font-size:26px;color:#F0F0F5;line-height:1.15}
.g .m{font-family:${MONO};font-size:15px;letter-spacing:.06em;color:var(--c);margin-top:10px}
</style></head><body><div class="pad">
<div><div class="k">Four games / one screen / no install</div><h1>The Game <em>Shelf</em></h1></div>
<div class="row">
  <div class="g" style="--c:#C39CF0"><div class="n">Once Upon a Year</div><div class="m">558 CARDS</div></div>
  <div class="g" style="--c:#F0A45C"><div class="n">Letter Blitz</div><div class="m">232 CATEGORIES</div></div>
  <div class="g" style="--c:#5CC3B9"><div class="n">The Year Drawer</div><div class="m">176 CARDS</div></div>
  <div class="g" style="--c:#F0714A"><div class="n">E-Ticket TriBond</div><div class="m">83 CARDS</div></div>
</div></div></body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

  for (const [name, html] of Object.entries({ ...CARDS, 'og-index.png': INDEX })) {
    await p.setContent(html, { waitUntil: 'load' });
    await p.screenshot({ path: path.join(OUT, name) });
    console.log('wrote', name);
  }

  // app icons, rendered from the site favicon
  const svg = fs.readFileSync(path.join(OUT, 'favicon.svg'), 'utf8');
  for (const size of [192, 512]) {
    const ip = await b.newPage({ viewport: { width: size, height: size } });
    await ip.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      *{margin:0}body{width:${size}px;height:${size}px}svg{width:${size}px;height:${size}px;display:block}
      </style></head><body>${svg}</body></html>`, { waitUntil: 'load' });
    await ip.screenshot({ path: path.join(OUT, `icon-${size}.png`) });
    await ip.close();
    console.log('wrote', `icon-${size}.png`);
  }

  await b.close();
})();

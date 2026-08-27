/* Serves the site the way Netlify does and checks every page.
   Reproduces Netlify's behaviour that actually affects these files:
     - the folder is served at the domain root
     - "Pretty URLs" serve /once-upon-a-year from once-upon-a-year.html
     - the short links in netlify.toml redirect
     - 404.html is served for anything missing
   Checks doctype, charset, viewport, broken links and assets, JS errors,
   mobile overflow, and that each game still deals a card.

   Needs Playwright:  npm i playwright && npx playwright install chromium
   Run from anywhere: node tools/selftest.js                                  */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 8788;
const BASE = `http://127.0.0.1:${PORT}/`;

const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.toml': 'text/plain' };

// the short links declared in netlify.toml
const REDIRECTS = { '/disney': '/once-upon-a-year.html', '/timeline': '/the-year-drawer.html',
  '/tribond': '/e-ticket-tribond.html', '/games': '/' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);

  if (REDIRECTS[p]) { res.writeHead(301, { location: REDIRECTS[p] }); return res.end(); }
  // Netlify strips .html and 301s to the clean path
  if (p.endsWith('.html') && p !== '/404.html') {
    res.writeHead(301, { location: p.slice(0, -5) });
    return res.end();
  }
  if (p === '/' || p === '') p = '/index.html';
  else if (!path.extname(p)) p += '.html';          // pretty URL -> real file

  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(ROOT, '404.html')));
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

const PAGES = ['', 'once-upon-a-year', 'the-year-drawer', 'e-ticket-tribond', '404.html'];

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const b = await chromium.launch();
  let fails = 0;
  const bad = (m) => { console.log('  FAIL ' + m); fails++; };

  for (const page of PAGES) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [], missing = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL|ERR_NAME/.test(m.text())) errs.push(m.text()); });
    p.on('response', r => { if (r.status() >= 400 && !/fonts\.g/.test(r.url())) missing.push(r.status() + ' ' + r.url()); });

    await p.goto(BASE + page);
    await p.waitForTimeout(500);
    console.log('\n== /' + page);

    const info = await p.evaluate(() => ({
      mode: document.compatMode,
      charset: document.characterSet,
      lang: document.documentElement.lang,
      viewport: !!document.querySelector('meta[name=viewport]'),
      title: document.title,
      desc: (document.querySelector('meta[name=description]') || {}).content,
      og: (document.querySelector('meta[property="og:image"]') || {}).content,
      icon: (document.querySelector('link[rel=icon]') || {}).href,
      manifest: (document.querySelector('link[rel=manifest]') || {}).href,
      links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      glyphOk: document.body.innerText.indexOf('�') === -1,
      resolvedIcon: (document.querySelector('link[rel=icon]') || {}).href,
    }));

    if (info.mode !== 'CSS1Compat') bad('quirks mode: ' + info.mode);
    if (info.charset !== 'UTF-8') bad('charset is ' + info.charset);
    if (info.lang !== 'en') bad('no lang attribute');
    if (!info.viewport) bad('no viewport meta');
    if (!info.title) bad('no title');
    if (!info.glyphOk) bad('replacement characters in the text - encoding is wrong');
    if (info.overflow > 0) bad('horizontal overflow ' + info.overflow + 'px');
    console.log('  url=' + p.url());
    console.log('  mode=' + info.mode, 'charset=' + info.charset, 'title="' + info.title + '"');
    console.log('  icon resolves to ' + info.resolvedIcon);

    // an asset referenced relatively must resolve to /assets/... from every URL shape
    if (info.resolvedIcon && !/\/assets\//.test(new URL(info.resolvedIcon).pathname))
      bad('relative asset resolved to ' + new URL(info.resolvedIcon).pathname + ' - pretty URLs broke the base path');

    const urls = [info.og, info.icon, info.manifest].filter(Boolean)
      .map(u => new URL(u, p.url()).href)
      .concat(info.links.filter(h => !/^(https?:|mailto:|#)/.test(h)).map(h => new URL(h, p.url()).href));
    for (const u of [...new Set(urls)]) {
      const r = await p.request.get(u);
      if (!r.ok()) bad('broken reference ' + r.status() + ' ' + u.replace(BASE, '/'));
    }

    if (missing.length) bad('failed requests: ' + missing.join(' | '));
    if (errs.length) bad('js errors: ' + errs.join(' | '));
    await p.close();
  }

  console.log('\n== short links');
  for (const [from, to] of Object.entries(REDIRECTS)) {
    const p = await b.newPage();
    await p.goto(BASE + from.slice(1));
    const landed = new URL(p.url()).pathname;
    const want = to === '/' ? '/' : to.replace('.html', '');
    console.log(`  ${from}  ->  ${landed}`);
    if (landed !== want) bad(`${from} landed on ${landed}, expected ${want}`);
    await p.close();
  }

  console.log('\n== gameplay');
  for (const [page, cardSel] of [['once-upon-a-year', '#cardBody'], ['the-year-drawer', '#cardBody'], ['e-ticket-tribond', '#clues']]) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + page); await p.waitForTimeout(400);
    await p.click('#startBtn'); await p.waitForTimeout(300);
    const txt = (await p.textContent(cardSel) || '').trim().replace(/\s+/g, ' ');
    console.log('  ' + page + ': "' + txt.slice(0, 44) + '..." ' + (errs.length ? 'ERRORS ' + errs : 'no errors'));
    if (!txt) bad(page + ' dealt an empty card');
    if (errs.length) fails++;
    await p.close();
  }

  console.log('\n== mobile (390px)');
  for (const page of PAGES.slice(0, 4)) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(BASE + page); await p.waitForTimeout(400);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log('  /' + page + ' overflow: ' + ov + 'px');
    if (ov > 0) bad('/' + page + ' overflows on mobile');
    await p.close();
  }

  const p404 = await b.newPage();
  await p404.goto(BASE + 'nope');
  console.log('\n== missing page shows: "' + (await p404.title()) + '"');
  if (!/shelf/i.test(await p404.title())) bad('404 fallback did not render');

  await b.close(); server.close();
  console.log(fails ? '\n' + fails + ' PROBLEM(S)' : '\nAll checks passed.');
  process.exit(fails ? 1 : 0);
})();

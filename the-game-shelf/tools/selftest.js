/* Serves the site the way GitHub Pages does (including from a repo subpath) and
   checks every page: doctype, charset, viewport, broken links and assets, JS
   errors, mobile overflow, and that each game still deals a card.
   Needs Playwright:  npm i playwright && npx playwright install chromium
   Run from anywhere: node tools/selftest.js                                  */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith('/games')) p = p.slice('/games'.length) || '/';   // simulate a project-site subpath
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(ROOT, '404.html')));
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

const BASE = 'http://127.0.0.1:8731/games/';   // deliberately a subpath, like a project site

(async () => {
  await new Promise(r => server.listen(8731, r));
  const b = await chromium.launch();
  let fails = 0;
  const bad = (m) => { console.log('  FAIL ' + m); fails++; };

  for (const page of ['index.html', 'once-upon-a-year.html', 'the-year-drawer.html', 'e-ticket-tribond.html', '404.html']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [], missing = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL|ERR_NAME/.test(m.text())) errs.push(m.text()); });
    p.on('response', r => { if (r.status() >= 400 && !/fonts\.g/.test(r.url())) missing.push(r.status() + ' ' + r.url()); });

    await p.goto(BASE + page);
    await p.waitForTimeout(500);
    console.log('\n== ' + page);

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
      bodyBg: getComputedStyle(document.body).backgroundColor,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      glyphOk: document.body.innerText.indexOf('�') === -1,
    }));

    if (info.mode !== 'CSS1Compat') bad('quirks mode: ' + info.mode);
    if (info.charset !== 'UTF-8') bad('charset is ' + info.charset);
    if (info.lang !== 'en') bad('no lang attribute');
    if (!info.viewport) bad('no viewport meta');
    if (!info.title) bad('no title');
    if (!info.desc && page !== '404.html') bad('no description');
    if (!info.glyphOk) bad('replacement characters in the text — encoding is wrong');
    if (info.overflow > 0) bad('horizontal overflow ' + info.overflow + 'px');
    if (info.links.some(h => h.startsWith('/'))) bad('root-relative link would break on a project site: ' + info.links.filter(h => h.startsWith('/')));
    console.log('  mode=' + info.mode, 'charset=' + info.charset, 'bg=' + info.bodyBg);
    console.log('  title="' + info.title + '"');
    console.log('  links: ' + info.links.join(', '));

    // every same-origin asset and link must resolve
    const urls = [info.og, info.icon, info.manifest].filter(Boolean)
      .map(u => new URL(u, BASE + page).href)
      .concat(info.links.filter(h => !/^(https?:|mailto:|#)/.test(h)).map(h => new URL(h, BASE + page).href));
    for (const u of [...new Set(urls)]) {
      const r = await p.request.get(u);
      if (!r.ok()) bad('broken reference ' + r.status() + ' ' + u.replace(BASE, ''));
    }

    if (missing.length) bad('failed requests: ' + missing.join(' | '));
    if (errs.length) bad('js errors: ' + errs.join(' | '));
    if (!fails) console.log('  ok');
    await p.close();
  }

  // the games still actually play
  console.log('\n== gameplay smoke test');
  for (const [page, startSel, cardSel] of [
    ['once-upon-a-year.html', '#startBtn', '#cardBody'],
    ['the-year-drawer.html', '#startBtn', '#cardBody'],
    ['e-ticket-tribond.html', '#startBtn', '#clues'],
  ]) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + page); await p.waitForTimeout(400);
    await p.click(startSel); await p.waitForTimeout(300);
    const txt = (await p.textContent(cardSel) || '').trim();
    const slots = await p.$$('#rail .slot, #rail .filed, .slot');
    console.log('  ' + page + ': dealt "' + txt.slice(0, 42) + '..." ' + (errs.length ? 'ERRORS ' + errs : 'no errors'));
    if (!txt) bad(page + ' dealt an empty card');
    if (errs.length) fails++;
    await p.close();
  }

  // mobile pass
  console.log('\n== mobile (390px)');
  for (const page of ['index.html', 'once-upon-a-year.html', 'the-year-drawer.html', 'e-ticket-tribond.html']) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(BASE + page); await p.waitForTimeout(400);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log('  ' + page + ' overflow: ' + ov + 'px');
    if (ov > 0) bad(page + ' overflows on mobile');
    await p.close();
  }

  // a bad URL must land on the 404
  const p404 = await b.newPage();
  await p404.goto(BASE + 'nope.html');
  console.log('\n== 404 fallback title: "' + (await p404.title()) + '"');

  await b.close(); server.close();
  console.log(fails ? '\n' + fails + ' PROBLEM(S)' : '\nAll checks passed.');
  process.exit(fails ? 1 : 0);
})();

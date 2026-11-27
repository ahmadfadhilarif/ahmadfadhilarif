#!/usr/bin/env node
'use strict';
/*
 * Builds the static TMZ website.
 *
 *   node src/build.js                      → ../site            (one HTML file per product)
 *   node src/build.js --artifact <outdir>  → <outdir>           (Claude artifact hosting: one
 *                                                                 product.html#slug page, fewer files)
 */
const fs = require('fs');
const path = require('path');
const J = require('./jersey');
const D = require('./data');
const P = require('./pages');
const { page } = require('./layout');
const { build } = require('./catalog');

const argv = process.argv.slice(2);
const ai = argv.indexOf('--artifact');
const ARTIFACT = ai !== -1;
const OUT = ARTIFACT ? path.resolve(argv[ai + 1] || 'site-artifact') : path.join(__dirname, '..', 'site');
const IMG = ARTIFACT ? 'p' : 'assets/img/products';

const write = (rel, content) => {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
};

const ctx = build(ARTIFACT
  ? { IMG, productUrl: (slug) => `product.html#${slug}`, productR: '', artifact: true }
  : { IMG });
const { all, pitLane } = ctx;
all.forEach((p) => ctx.template(p)); // register every size-guide template up front

// ----------------------------------------------------------------- clean output
if (ARTIFACT) {
  // only ever clear what this build generates inside OUT
  fs.mkdirSync(OUT, { recursive: true });
  for (const d of [IMG, 'assets']) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.html')) fs.unlinkSync(path.join(OUT, f));
  const srcSite = path.join(__dirname, '..', 'site');
  for (const f of ['assets/css/style.css', 'assets/js/main.js', 'assets/img/logo/tmz-logo-black.svg', 'assets/img/logo/tmz-logo-white.svg']) {
    write(f, fs.readFileSync(path.join(srcSite, f)));
  }
} else {
  fs.rmSync(path.join(OUT, IMG), { recursive: true, force: true });
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.html')) fs.unlinkSync(path.join(OUT, f));
  fs.rmSync(path.join(OUT, 'product'), { recursive: true, force: true });
}

// ----------------------------------------------------------------- images
let n = 0;
all.forEach((p) => {
  write(p.img, J.render(p.spec, 'front'));
  write(p.back, J.render(p.spec, 'back'));
  n += 2;
});
pitLane.forEach((p) => {
  write(p.bannerImg, J.render({ ...p.spec, id: p.slug + 'bn', cut: 'long', raglan: true, hemBand: true }, 'front'));
  n++;
});
Object.values(ctx.templates).forEach((t) => {
  write(t.front, J.render(t.spec, 'front'));
  write(t.back, J.render(t.spec, 'back'));
  write(t.dark, J.render({ ...t.spec, id: t.spec.id + 'dk', colors: { base: '#0b0b0b', p1: '#0b0b0b', p2: '#0b0b0b', p3: '#0b0b0b', trim: '#0b0b0b', inner: '#0b0b0b' }, logoColor: '#ffffff', outline: '#ffffff', outlineWidth: 2.2 }, 'front'));
  n += 3;
});

// ----------------------------------------------------------------- 3D viewer (landmarks injected)
write('assets/js/viewer3d.js', fs.readFileSync(path.join(__dirname, 'viewer3d.js'), 'utf8').replace('/*__META__*/ {}', '/*__META__*/ ' + JSON.stringify({ ...J.META, _logo: J.LOGO_VIEWBOX })));

// ----------------------------------------------------------------- pages
const pages = {
  'index.html': P.home(ctx),
  'solo.html': P.soloPage(ctx),
  'running.html': P.runningPage(ctx),
  'shop.html': P.shopPage(ctx),
  'club.html': P.clubPage(ctx),
  'tmz-loyalty.html': P.loyaltyPage(ctx),
  'contact-us.html': P.contactPage(ctx),
  'about-us.html': P.aboutPage(ctx),
  'track-order.html': P.trackPage(ctx),
  'shopping-cart.html': P.cartPage(ctx),
  'checkout.html': P.checkoutPage(ctx),
  'my-account.html': P.accountPage(ctx),
  '404.html': P.notFound(ctx),
};
D.series.forEach((s) => (pages[`${s.slug}.html`] = P.seriesPage(s, ctx)));
Object.entries(P.policies).forEach(([slug, [title, html]]) => (pages[`${slug}.html`] = P.textPage(title, html)));

if (ARTIFACT) {
  // one product page rendered in the browser from the catalogue
  pages['product.html'] = page({
    title: 'Product',
    body: '<div id="product-app"><div class="container" style="padding:80px 15px;text-align:center">Loading…</div></div>',
    scripts: ['assets/js/product-app.js'],
  });
  write('assets/js/product-app.js', bundle());
  // the artifact's main page is wrapped in its own document skeleton, so publish only head tags + body content
  pages['index.html'] = toArtifactPage(pages['index.html'], `${D.site.brand} Sportswear`);
} else {
  all.forEach((p) => (pages[p.url] = P.productPage(p, ctx)));
}
Object.entries(pages).forEach(([f, html]) => write(f, html));

function toArtifactPage(html, title) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<meta charset[^>]*>\s*/, '')
    .replace(/<meta name="viewport"[^>]*>\s*/, '')
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
  return `${head.trim()}\n${body.trim()}\n`;
}

// Browser bundle: catalogue + page templates with a tiny require() shim
function bundle() {
  const mods = ['icons', 'data', 'layout', 'components', 'catalog', 'pages'];
  let out = '/* generated by src/build.js --artifact */\n(function () {\nvar D = {}, C = {};\nfunction require(n) { n = n.replace(/^\\.\\//, ""); if (C[n]) return C[n].exports; var m = { exports: {} }; C[n] = m; D[n](m, m.exports); return m.exports; }\n';
  for (const m of mods) out += `D[${JSON.stringify(m)}] = function (module, exports) {\n${fs.readFileSync(path.join(__dirname, m + '.js'), 'utf8')}\n};\n`;
  out += `
var ctx = require("catalog").build({ IMG: ${JSON.stringify(IMG)}, productUrl: function (s) { return "product.html#" + s; }, productR: "", artifact: true });
var pages = require("pages");
var root = document.getElementById("product-app");
var slug = decodeURIComponent(location.hash.slice(1));
var p = ctx.bySlug[slug];
if (!p) {
  root.innerHTML = '<div class="e404"><b>404</b><h1>Product not found</h1><p>Browse the full range in the shop.</p><a class="btn btn-dark" href="shop.html">Go to shop</a></div>';
} else {
  var r = pages.productBody(p, ctx);
  root.insertAdjacentHTML("beforebegin", r.body);
  root.remove();
  document.title = r.title + " - ${D.site.brand}";
}
window.addEventListener("hashchange", function () { location.reload(); });
})();
`;
  return out;
}

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else files.push(p); } })(OUT);
console.log(`Built ${Object.keys(pages).length} pages, ${all.length} products, ${n} jersey images → ${OUT} (${files.length} files)`);

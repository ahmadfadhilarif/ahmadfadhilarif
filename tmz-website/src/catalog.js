'use strict';
/*
 * Builds the product catalogue (products, lookups and page helpers) from data.js.
 * Pure JavaScript with no Node APIs, so it runs in the build script and in the browser.
 */
const D = require('./data');

// colour family for the shop filter
function family(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  if (l < 0.13) return 'Black';
  if (l > 0.88 && s < 0.5) return 'White';
  if (s < 0.18) return l > 0.6 ? 'White' : l < 0.25 ? 'Black' : 'Grey';
  if (h < 15 || h >= 345) return l > 0.7 ? 'Pink' : 'Red';
  if (h < 45) return 'Orange';
  if (h < 68) return 'Yellow';
  if (h < 170) return 'Green';
  if (h < 255) return 'Blue';
  if (h < 300) return 'Purple';
  return 'Pink';
}

const catSlug = (c) => String(c).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * opts.IMG         folder holding the jersey SVGs
 * opts.productUrl  slug -> page URL
 * opts.productR    path prefix used inside product pages ('../' for product/x.html, '' for product.html#x)
 * opts.artifact    true when building for Claude artifact hosting
 */
function build(opts = {}) {
  const IMG = opts.IMG || 'assets/img/products';
  const productUrl = opts.productUrl || ((slug) => `product/${slug}.html`);
  const all = [];
  const bySeries = {};
  const seriesBySlug = Object.fromEntries(D.series.map((s) => [s.slug, s]));

  D.series.forEach((s) => {
    bySeries[s.slug] = [];
    s.designs.forEach((d, di) => {
      const code = `${s.code}${String(di + 1).padStart(2, '0')}`;
      d.pals.forEach((pk, ci) => {
        const pal = D.pal(pk);
        const colors = { base: pal.base, p1: pal.p1, p2: pal.p2, p3: pal.p3, trim: pal.trim };
        if (d.layout.sleeve === 'accent' || d.layout.sleeve === 'pattern') colors.sleeve = pal.accent;
        if (d.layout.sleeve === 'trim') colors.sleeve = pal.trim;
        if (d.layout.side) colors.side = pal.accent;
        const name = code + 'ABCDE'[ci];
        const slug = name.toLowerCase();
        const p = {
          slug, name, code, type: 'teamwear', series: s.slug, seriesName: s.name, catLabel: s.name, cats: [s.name], isNew: !!s.isNew,
          spec: {
            id: slug, cut: d.cut, raglan: d.raglan, neck: d.neck, pattern: d.pattern, colors,
            sleevePattern: d.layout.sleeve === 'pattern' ? d.sleevePattern || d.pattern : null,
            halfZip: d.halfZip, pocket: d.pocket, hemBand: d.cut === 'long',
            number: d.number ? String(ci + 1 + di * 5) : undefined,
          },
        };
        bySeries[s.slug].push(p);
        all.push(p);
      });
    });
  });

  const solo = D.solo.map((x) => ({ ...x, type: 'solo', catLabel: x.cats.join(', '), spec: { id: x.slug, ...x.spec } }));
  const running = D.running.map((x) => ({ ...x, type: 'running', catLabel: 'Running', spec: { id: x.slug, ...x.spec } }));
  const clubProducts = D.clubs.flatMap((c) => c.products.map((x) => ({
    ...x, type: 'club', club: c.slug, cats: ['Club', c.name], catLabel: `Club, ${c.name}`, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    details: ['TYPE OF COLLAR: ' + (x.spec.neck === 'polo' ? 'Polo Collar' : x.spec.neck === 'hood' ? 'Hood' : 'Round Neck'), 'TYPE OF SLEEVE: ' + (x.spec.cut === 'long' ? 'Long Sleeves' : 'Short Sleeves'), 'CUTTING: Regular Fit'],
    story: `Official ${c.name} merchandise, designed together with the club and produced by ${D.site.brand}.`,
    spec: { id: x.slug, ...x.spec },
  })));
  all.push(...solo, ...running, ...clubProducts);

  all.forEach((p) => {
    p.img = `${IMG}/${p.slug}-front.svg`;
    p.back = `${IMG}/${p.slug}-back.svg`;
    p.url = productUrl(p.slug);
    p.color = family(p.spec.colors.base);
  });
  const bySlug = Object.fromEntries(all.map((p) => [p.slug, p]));
  // shop "Featured" order: retail drops first, then teamwear by series
  [...solo.filter((p) => p.group === 'PIT LANE'), ...clubProducts, ...running, ...solo.filter((p) => p.group !== 'PIT LANE'), ...D.series.flatMap((s) => bySeries[s.slug])].forEach((p, i) => (p.order = i));

  // Pit Lane banner variants (hanging long-sleeve cut for the hero slide)
  const pitLane = solo.filter((p) => p.group === 'PIT LANE').map((p) => ({ ...p, bannerImg: `${IMG}/${p.slug}-banner.svg` }));

  // placement / size-guide templates
  const templates = {};
  function template(p) {
    const s = p.spec;
    const key = `${s.cut}-${s.neck}${s.raglan ? '-r' : ''}`;
    if (!templates[key]) {
      templates[key] = {
        front: `${IMG}/template-${key}-front.svg`, back: `${IMG}/template-${key}-back.svg`, dark: `${IMG}/template-${key}-dark.svg`,
        spec: { id: 'tpl' + key, cut: s.cut, neck: s.neck, raglan: s.raglan, halfZip: s.halfZip, pattern: null, cuffStripe: false, colors: { base: '#ffffff', p1: '#eeeeee', p2: '#dddddd', p3: '#cccccc', trim: '#f2f2f2' }, logoColor: '#222222' },
      };
    }
    return templates[key];
  }

  function siblings(p) {
    if (p.type === 'teamwear') return bySeries[p.series];
    if (p.type === 'club') return clubProducts;
    if (p.type === 'running') return running;
    return solo;
  }
  function related(p) {
    const pool = siblings(p).filter((x) => x !== p && (p.type !== 'teamwear' || x.code !== p.code));
    const step = Math.max(1, Math.floor(pool.length / 6));
    const out = [];
    for (let i = 0; out.length < 6 && i < pool.length; i += step) out.push(pool[i]);
    return out;
  }

  return {
    all, bySeries, bySlug, series: D.series, seriesBySlug, solo, running, clubs: D.clubs, clubProducts, pitLane,
    floral: solo.filter((p) => p.group === 'FLORAL'), siblings, related, template, templates,
    productR: opts.productR === undefined ? '../' : opts.productR, artifact: !!opts.artifact,
  };
}

module.exports = { build, family, catSlug };

'use strict';
const { esc, icon, waLink } = require('./layout');
const { site } = require('./data');

const LOGO_B = 'assets/img/logo/tmz-logo-black.svg';
const LOGO_W = 'assets/img/logo/tmz-logo-white.svg';
const money = (n) => 'RM' + Number(n).toFixed(2);

// ------------------------------------------------------------------ product card
function card(p, R, opts = {}) {
  const labels = [];
  if (p.soldOut) labels.push('<span class="label soldout">Sold out</span>');
  if (p.was) labels.push(`<span class="label sale">-${Math.round((1 - p.price / p.was) * 100)}%</span>`);
  if (p.isNew) labels.push('<span class="label new">New</span>');
  if (p.isHot) labels.push('<span class="label hot">Hot</span>');
  const price = p.price
    ? `<div class="price">${p.was ? `<del>${money(p.was)}</del>` : ''}${money(p.price)}</div>`
    : '';
  return `<div class="product-card${opts.big ? ' big' : ''}" data-cats="${esc(p.cats.join('|'))}" data-price="${p.price || ''}" data-color="${p.color}" data-name="${esc(p.name)}" data-order="${p.order || 0}">
  <a class="thumb" href="${R + p.url}" aria-label="${esc(p.name)}">${labels.length ? `<div class="labels">${labels.join('')}</div>` : ''}<img class="main has-alt" src="${R + p.img}" alt="${esc(p.name)}" loading="lazy" width="600" height="600"><img class="alt" src="${R + p.back}" alt="" loading="lazy" width="600" height="600"></a>
  ${view3d(p, 'btn-3d', '3D')}
  <div class="info"><a class="name" href="${R + p.url}">${esc(p.name)}</a><div class="cats${p.type === 'teamwear' ? ' upper' : ''}">${esc(p.catLabel)}</div>${price}</div>
</div>`;
}

// 3D viewer trigger (paths are relative to the site root; main.js adds the prefix)
function view3d(p, cls, label) {
  const data = JSON.stringify({ n: p.name, c: p.spec.cut, f: p.img, b: p.back, fb: p.spec.fabric });
  return `<button class="${cls}" type="button" data-3d="${esc(data)}" aria-label="View ${esc(p.name)} in 3D on a mannequin">${label}</button>`;
}

// ------------------------------------------------------------------ jersey fan used in banners
function fan(items, R, { widths, lift, rot, captions = true, gap = -1.2 }) {
  return items
    .map((p, i) => {
      const w = widths[i % widths.length];
      return `<figure style="width:${w}cqw;margin:0 ${gap / 2}cqw;transform:translateY(${lift[i % lift.length]}cqw) rotate(${rot[i % rot.length]}deg);z-index:${10 - Math.abs(i - (items.length - 1) / 2) * 2}"><img src="${R + p.img}" alt="${esc(p.name)}" loading="lazy">${captions ? `<figcaption>${esc(p.code || p.name)} &#8595;</figcaption>` : ''}</figure>`;
    })
    .join('');
}

// ------------------------------------------------------------------ series banner
/** variant: 'page' (wide hero on series page) | 'slide' (2:1 home slide) */
function seriesBanner(s, designs, R, variant = 'page', href = '#designs', withBtn = false) {
  const dark = s.theme.ink === '#ffffff';
  const k = variant === 'slide' ? 1.04 : 1;
  const n = designs.length;
  const ts = (9.2 * Math.min(1, 5.2 / s.name.length)).toFixed(2);
  const widths = n >= 5 ? [12, 13.5, 16, 13.5, 12] : n === 2 ? [13, 13] : [15.5, 18.5, 15.5];
  const lift = n >= 5 ? [3, 1, -1.5, 1, 3] : n === 2 ? [0, 0] : [2, -1.5, 2];
  const rot = n >= 5 ? [-5, -2.5, 0, 2.5, 5] : n === 2 ? [-3, 3] : [-4, 0, 4];
  const ratio = variant === 'slide' ? 'ratio-2-1' : 'ratio-series';
  const jrow = variant === 'slide'
    ? `right:0;top:12%;width:56%;height:66%`
    : `right:1%;top:8%;width:59%;height:78%`;
  const scaled = (arr) => arr;
  const balls = s.theme.motif === 'court'
    ? `<span class="ball" style="left:39%;bottom:${variant === 'slide' ? 18 : 10}%;width:${3.4 * k}cqw"></span><span class="ball pickle" style="right:1.5%;bottom:${variant === 'slide' ? 16 : 12}%;width:${3 * k}cqw"></span>`
    : '';
  return `<a class="banner ${ratio} sbanner motif-${s.theme.motif}${dark ? ' dark' : ''}" href="${href}" style="--bg:${s.theme.bg};--bg2:${s.theme.bg2};--ink-c:${s.theme.ink};--k:${k};--ts:${ts}cqw">
  <div class="fill bgfx"></div>
  <div class="sb-text">
    <div class="sb-kicker"><img src="${R + (dark ? LOGO_W : LOGO_B)}" alt="">${s.isNew ? 'NEW EDITION' : 'TEAMWEAR'}</div>
    <h2 class="sb-title">${esc(s.name)}</h2>
    <div class="sb-sub">SERIES</div>
    <div class="sb-sports">${s.sports.map(esc).join(' &nbsp;•&nbsp; ')}</div>
    <div class="sb-btns"><span class="solid">EXPLORE DESIGNS ${icon('arrowDown')}</span><span class="ghost">${n} DESIGNS × 5 COLOURWAYS</span></div>
  </div>
  <div class="jrow" style="${jrow}">${fan(designs, R, { widths: scaled(widths), lift, rot, gap: n >= 5 ? -2.8 : n === 2 ? 2 : -3 })}</div>
  ${balls}
  ${withBtn ? `<span class="hero-cta"><span class="btn">CUSTOM YOURS</span></span>` : ''}
</a>`;
}

// ------------------------------------------------------------------ home slides
function pitLaneSlide(items, R) {
  return `<a class="banner ratio-2-1 pitlane" href="${R}solo.html">
  <div class="fill pl-bg"></div>
  <svg class="fill pl-swirl" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="plsw" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency="0.012 0.03" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 -2.2 1.1"/></filter></defs><rect width="400" height="200" filter="url(#plsw)" opacity=".16"/></svg>
  <div class="jrow pl-row">${items.map((p, i) => `<figure style="width:27cqw;margin:0 -4.6cqw;transform:translateY(${[2, 0.5, -1, 0.5, 2][i]}cqw) rotate(${[-6, -3, 0, 3, 6][i]}deg);z-index:${[1, 2, 3, 2, 1][i]}"><img src="${R + p.bannerImg}" alt="${esc(p.name)}" loading="lazy"></figure>`).join('')}</div>
  <div class="pl-title"><div class="pl-marks">${[0, 1, 2, 3, 4].map(() => `<img src="${R + LOGO_W}" alt="">`).join('')}</div><h2>PIT LANE HERITAGE</h2></div>
</a>`;
}

function clubSlide(items, R) {
  return `<a class="banner ratio-2-1 clubslide" href="${R}club.html">
  <div class="fill cs-bg"></div>
  <span class="cs-ball b1"></span><span class="cs-ball b2"></span><span class="cs-ball b3"></span>
  <div class="cs-text"><div class="cs-k">COLLABORATION</div><h2>CLUB</h2><p>Wear your club’s colours. Exclusive jerseys from the communities we play with.</p><span class="cs-btn">SHOP CLUB ${icon('arrowRight')}</span></div>
  <div class="jrow" style="right:3%;top:12%;width:50%;height:76%">${fan(items, R, { widths: [19, 23, 19], lift: [3, -1, 3], rot: [-7, 0, 7], captions: false, gap: -4 })}</div>
</a>`;
}

function teamSlide(items, R) {
  return `<a class="banner ratio-2-1 teamslide" href="${R}contact-us.html">
  <div class="fill ts-bg"></div>
  <div class="ts-word">YOUR TEAM</div>
  <div class="jrow" style="left:5%;right:5%;top:20%;height:60%">${fan(items, R, { widths: [17, 18.5, 18.5, 17], lift: [2, 0, 0, 2], rot: [-4, -1.5, 1.5, 4], captions: false, gap: 1 })}</div>
  <div class="ts-foot"><img src="${R + LOGO_W}" alt=""><span>TEAMWEAR · MINIMUM 5 PIECES · DESIGNED &amp; MADE IN MALAYSIA</span></div>
</a>`;
}

function runSlide(items, R) {
  return `<a class="banner ratio-2-1 runslide" href="${R}running.html">
  <div class="fill rs-bg"></div>
  <div class="rs-word">RUN<br>FURTHER</div>
  <div class="jrow" style="right:3%;top:14%;width:47%;height:72%">${fan(items, R, { widths: [17, 20, 17], lift: [2.5, -1, 2.5], rot: [-6, 0, 6], captions: false, gap: -3 })}</div>
  <div class="rs-tag"><img src="${R + LOGO_W}" alt="">RUNNING COLLECTION <b>NEW</b></div>
</a>`;
}

function orbitBanner(items, R) {
  return `<div class="banner ratio-hero2 orbitban">
  <a class="fill" href="${R}orbit.html" aria-label="ORBIT series"></a>
  <div class="fill ob-bg"></div>
  <div class="ob-word">ORBIT</div>
  <img class="ob-j j1" src="${R + items[0].img}" alt="${esc(items[0].name)}" loading="lazy">
  <img class="ob-j j2" src="${R + items[1].img}" alt="${esc(items[1].name)}" loading="lazy">
  <div class="banner-center-btn"><a class="btn" href="${R}orbit.html">CUSTOMIZE YOURS.</a></div>
</div>`;
}

// ------------------------------------------------------------------ category tiles
function tile(kind, p, R, href) {
  return `<a class="tile" href="${R + href}"><div class="banner ratio-tile tile-${kind}"><div class="fill zoom tbg"></div><img class="tj zoom" src="${R + p.img}" alt="${esc(p.name)}" loading="lazy"></div></a>`;
}
function soloTile(kind, items, R, href) {
  return `<a class="tile" href="${R + href}"><div class="banner ratio-solo solo-${kind}"><div class="fill zoom tbg"></div>${kind === 'run' ? '<div class="st-word">KEEP<br>MOVING</div>' : ''}<div class="st-row zoom">${items.map((p) => `<img src="${R + p.img}" alt="${esc(p.name)}" loading="lazy">`).join('')}</div></div></a>`;
}

function loyaltyStrip(R) {
  return `<a class="banner ratio-strip loyalty-strip ls" href="${R}tmz-loyalty.html" aria-label="TMZ Loyalty">
  <div class="fill ls-bg"></div>
  <div class="ls-in"><img src="${R + LOGO_W}" alt=""><b>TMZ LOYALTY</b><i></i><span>Shop smart &amp; start earning.</span></div>
</a>`;
}

function ctaBand() {
  return `<section class="cta-band"><span class="blob b1"></span><span class="blob b2"></span>
  <div class="txt"><b>Couldn’t find the design you’re looking for ?</b><span>Let our designers create a custom design exclusively for you, contact us now.</span></div>
  <a class="chip" href="${waLink('Hi TMZ, I would like a custom design.')}" target="_blank" rel="noopener"><i>${icon('whatsapp')}</i>${esc(site.phone)}</a>
  <a class="chip" href="mailto:${site.email}"><i>${icon('mail')}</i>${esc(site.email)}</a>
</section>`;
}

// ------------------------------------------------------------------ product details panels
const GSM = { ARCTIX: 170, HEXA: 150, AGILIS: 160, QUADRA: 150, MICROTEX: 120, TASLAN: 140, RIPSTOP: 130, MESH: 140 };
const DESC = {
  ARCTIX: 'Mediumweight & designed for durability & extreme comfort',
  HEXA: 'Honeycomb knit for airflow & a lighter feel',
  AGILIS: 'Smooth stretch knit that moves with every rally',
  QUADRA: 'Square-grid texture, breathable & quick drying',
  MICROTEX: 'Ultra-light micro fibre with a soft hand feel',
  TASLAN: 'Water-resistant nylon shell for windy days',
  RIPSTOP: 'Grid-reinforced weave that resists tearing',
  MESH: 'Open mesh for maximum ventilation',
};

function panelHead(s, R) {
  return `<div class="dp-head"><div class="dp-kicker"><img src="${R + LOGO_B}" alt="">${esc(s.name)} SERIES</div><img class="dp-logo" src="${R + LOGO_B}" alt="${site.brand}"></div>`;
}

function seriesPanels(s, designs, R, template) {
  const pos5 = [[2, 6], [33, 0], [64, 6], [12, 50], [46, 52]];
  const pos3 = [[4, 10], [36, 2], [66, 12]];
  const pos = designs.length >= 5 ? pos5 : pos3;
  const board = designs
    .map((p, i) => `<figure style="left:${pos[i][0]}%;top:${pos[i][1]}%"><figcaption>${esc(p.code)}</figcaption><img src="${R + p.img}" alt="${esc(p.name)}" loading="lazy"></figure>`)
    .join('');
  const pants = designs[0] && designs[0].spec.cut === 'pants';
  const sizes = pants
    ? [['XS', 12.5, 36.5, 26.5], ['S', 13.5, 37.5, 27.0], ['M', 14.5, 38.5, 27.5], ['L', 15.5, 39.5, 28.0], ['XL', 16.5, 40.5, 28.5], ['2XL', 17.5, 41.0, 29.0], ['3XL', 18.5, 41.5, 29.0], ['4XL', 19.5, 42.0, 29.5], ['5XL', 20.5, 42.5, 29.5]]
    : [['XS', 16.5, 25.5, 8.1], ['S', 17.5, 26.5, 8.4], ['M', 18.5, 27.5, 8.7], ['L', 19.5, 28.5, 9.0], ['XL', 20.5, 29.5, 9.3], ['2XL', 21.5, 30.5, 9.6], ['3XL', 22.5, 31.0, 9.9], ['4XL', 23.5, 31.5, 9.9], ['5XL', 24.5, 32.0, 9.9], ['6XL', 25.5, 32.5, 10.2], ['7XL', 26.5, 33.0, 10.2], ['8XL', 27.5, 33.5, 10.2]];
  return `
<section class="dpanel">
  <div class="dp-intro">
    <div>
      <div class="dp-kicker"><img src="${R + LOGO_B}" alt="">${s.isNew ? 'NEW EDITION' : 'TEAMWEAR'}</div>
      <div class="big">${esc(s.name)}</div>
      <div class="spaced">SERIES</div>
      <p>${esc(s.blurb)}</p>
      <span class="dp-tag">${designs.length} DESIGNS + 5 COLOURWAYS</span>
      <div class="sports">${s.sports.map(esc).join(' • ')}</div>
      <img class="brand" src="${R + LOGO_B}" alt="${site.brand}">
    </div>
    <div class="court-board"><div class="court-bg"></div>${board}<span class="ball" style="left:16%;bottom:4%"></span><span class="ball pickle" style="right:6%;bottom:8%"></span></div>
  </div>
</section>
<section class="dpanel">
  ${panelHead(s, R)}
  <h3>Types of fabric</h3>
  <p>You are allowed to choose <b>(1) type of fabric only per order.</b> May be applied on any types of jersey design.</p>
  <div class="fabric-cards">${s.fabrics
    .map((f, i) => `<div class="fabric-card"><div class="tex t${i + 1}"></div><div class="body"><span class="nm">${f}<small>FABRIC</small></span><div class="gsm">${GSM[f] || 150}<small>GSM</small></div><div class="d">${esc(DESC[f] || '')}</div><div class="ic">${icon('stretch')}${icon('air')}${icon('drop')}<span><b>30%</b><small>FASTER DRY UP</small></span></div></div></div>`)
    .join('')}</div>
</section>
<section class="dpanel">
  ${panelHead(s, R)}
  <h3>Customize it your way</h3>
  ${pants ? `<div class="custom-grid pants">
    <div class="side"><span class="tagm">FRONT</span><img src="${R + template.front}" alt="Front placement guide" loading="lazy">
      <span class="chip" style="left:66%;top:34%">TEAM LOGO</span><span class="ov" style="left:33%;top:62%;--s:1.4">19</span><span class="ov" style="left:67%;top:70%;--s:.7">SPONSOR</span></div>
    <div class="side"><span class="tagm">BACK</span><img src="${R + template.back}" alt="Back placement guide" loading="lazy">
      <span class="ov" style="left:50%;top:15%;--s:.8">NAME</span><span class="chip" style="left:30%;top:40%">LOGO</span><span class="ov" style="left:30%;top:66%;--s:1.4">19</span></div>
  </div>` : `<div class="custom-grid">
    <div class="side"><span class="tagm">FRONT</span><img src="${R + template.front}" alt="Front placement guide" loading="lazy">
      <span class="ov" style="left:50%;top:40%;--s:1.8">19</span><span class="ov" style="left:50%;top:55%;--s:.8">SPONSOR</span>
      <span class="chip" style="left:62%;top:30%">TEAM LOGO</span><span class="chip" style="left:24%;top:31%;--r:-30deg">LOGO</span><span class="chip" style="left:80%;top:31%;--r:30deg">LOGO</span></div>
    <div class="side"><span class="tagm">BACK</span><img src="${R + template.back}" alt="Back placement guide" loading="lazy">
      <span class="ov" style="left:50%;top:30%;--s:1">NAME</span><span class="ov" style="left:50%;top:38%;--s:4">19</span><span class="ov" style="left:50%;top:66%;--s:.8">SPONSOR<br>SPONSOR</span>
      <span class="chip" style="left:22%;top:31%;--r:-30deg">LOGO</span><span class="chip" style="left:80%;top:31%;--r:30deg">LOGO</span></div>
  </div>`}
  <div class="notes4"><h4>Given above is the example(s) for your reference</h4>
    <div class="n"><i>01</i><p>The team logo and numbers on the ${pants ? 'pants' : 'jersey'} will be arranged accordingly to your design.</p></div>
    <div class="n"><i>02</i><p>The amount of sponsors/logos to be added is unlimited.</p></div>
    <div class="n"><i>03</i><p>Additional elements such as team mascot, flags &amp; change of colour are <mark>FREE</mark>.</p></div>
    <div class="n"><i>04</i><p>${site.brand} logo from the front part of the ${pants ? 'pants' : 'jersey'} is irreplaceable.</p></div>
  </div>
</section>
<section class="dpanel">
  ${panelHead(s, R)}
  <h3>Production timeline</h3>
  <div class="timeline-big"><p>Once deposit payment has been received by our end, we will begin to manufacture your desired jersey. The manufacturing process will include a precise quality check to ensure a good quality jersey is produced. Overall progress will take around 7-10 working days.</p><div class="days"><b>7-10</b><span>WORKING DAYS</span></div></div>
  <div class="timeline"><div class="node a"><i>${icon('person')}</i>DAY 1</div><div class="line"></div><div class="node b"><i>${icon('check')}</i>DAY 10</div></div>
</section>
<section class="dpanel">
  ${panelHead(s, R)}
  <div class="size-grid">
    <div><h3>Size chart</h3><div class="small">All measurements in inches. Actual size may vary ±0.5" · 1 inch = 2.54 cm</div>
      <div class="pills"><span class="on">Adults</span><span>Regular fit</span><span>${pants ? 'Tapered leg' : 'Short sleeve'}</span></div>
      <div class="measure${pants ? ' pants' : ''}"><img src="${R + template.front}" alt="Measurement guide" loading="lazy"><div class="legend">${pants
        ? '<div><b>Waist</b>Lay flat and measure straight across the relaxed waistband.</div><div><b>Length</b>From the top of the waistband down to the ankle cuff.</div><div><b>Inseam</b>From the crotch seam down the inner leg to the cuff.</div>'
        : '<div><b>Pit to pit</b>Lay the garment flat. Measure straight across the chest, armpit to armpit.</div><div><b>Length</b>From the highest point of the shoulder straight down to the bottom hem.</div><div><b>Sleeve</b>From the shoulder seam to the end of the sleeve.</div>'}</div></div>
    </div>
    <div><table class="size-table"><thead><tr>${(pants ? ['SIZE', 'WAIST', 'LENGTH', 'INSEAM'] : ['SIZE', 'PIT TO PIT', 'LENGTH', 'SLEEVE']).map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${sizes.map((r) => `<tr>${r.map((c) => `<td>${typeof c === 'number' ? c.toFixed(1) : c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  </div>
</section>`;
}

function soloDetails(p, R, template) {
  const chart = p.sizeChart || { cols: ['SIZE', 'CHEST', 'LENGTH', 'SLEEVE'], rows: [['XS', 17, 26, 7.5], ['S', 18, 27, 8], ['M', 19, 28, 8], ['L', 20, 29, 8.5], ['XL', 21, 30, 8.5], ['2XL', 22, 31, 9], ['3XL', 23, 32, 9]].filter((r) => p.sizes.includes(r[0])) };
  return `<ul class="product-details-list">${p.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
  <div class="solo-chart"><img src="${R + template.dark}" alt="Size guide" loading="lazy"><div><h4>SIZE CHART</h4><small>MEASUREMENT IN INCHES. ACTUAL SIZE MAY VARY +- 0.5</small><table><thead><tr>${chart.cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${chart.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
  <div class="solo-story"><img src="${R + LOGO_W}" alt="${site.brand}"><p>${esc(p.story)}</p></div>
  <div class="solo-fabric"><div><h4>FABRICS</h4><small>This product is made with performance sublimation fabric</small></div><div class="r"><b>AGILIS</b><small>160 GSM – Mediumweight</small></div></div>`;
}

module.exports = {
  card, view3d, seriesBanner, pitLaneSlide, clubSlide, teamSlide, runSlide, orbitBanner, tile, soloTile, loyaltyStrip, ctaBand,
  seriesPanels, soloDetails, money, LOGO_B, LOGO_W,
};

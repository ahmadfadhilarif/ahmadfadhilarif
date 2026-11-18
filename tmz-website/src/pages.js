'use strict';
const { page, esc, icon, waLink } = require('./layout');
const C = require('./components');
const { site } = require('./data');

const arrows = () => `<button class="carousel-arrow prev" aria-label="Previous">${icon('chevLeft')}</button><button class="carousel-arrow next" aria-label="Next">${icon('chevRight')}</button>`;

// =========================================================================== HOME
function home(ctx) {
  const R = '';
  const { bySeries, series, pitLane, clubs, running } = ctx;
  const firsts = (slug) => bySeries[slug].filter((p) => p.slug.endsWith('a'));
  const court = series.find((s) => s.slug === 'court');
  const vertex = series.find((s) => s.slug === 'vertex');
  const clubItems = [clubs[1].products[0], clubs[0].products[0], clubs[1].products[1]].map((x) => ctx.bySlug[x.slug]);
  const teamItems = [firsts('on-field')[0], firsts('prism')[1], firsts('court')[2], firsts('esport')[1]];
  const runItems = [running[0], running[4], running[1]];
  const orbit = bySeries.orbit;
  const body = `
<section class="home-hero">
  <div class="carousel" data-carousel id="hero" data-autoplay="5500">
    <div class="carousel-track">
      ${C.seriesBanner(court, firsts('court'), R, 'slide', 'court.html', true)}
      ${C.pitLaneSlide(pitLane, R)}
      ${C.clubSlide(clubItems, R)}
      ${C.teamSlide(teamItems, R)}
      ${C.seriesBanner(vertex, firsts('vertex'), R, 'slide', 'vertex.html', true)}
      ${C.runSlide(runItems, R)}
    </div>
    ${arrows()}
  </div>
</section>
<div style="height:20px"></div>
${C.orbitBanner([orbit[0], orbit[5]], R)}
<div class="spacer-l"></div>
<div class="container">
  <h1 class="section-title">TEAMWEAR / CATEGORIES</h1>
  <div class="grid-3">
    <div>${C.tile('onfield', bySeries['on-field'][0], R, 'on-field.html')}<h3 class="tile-title">ON-FIELD</h3></div>
    <div>${C.tile('esport', bySeries.esport[0], R, 'esport.html')}<h3 class="tile-title">E-SPORT</h3></div>
    <div>${C.tile('orbit', bySeries.orbit[2], R, 'orbit.html')}<h3 class="tile-title">ORBIT</h3></div>
  </div>
  <div class="spacer-m"></div>
  <h2 class="section-title">SOLO / COLLECTIONS</h2>
  <div class="grid-2">
    <div class="solo-tile">${C.soloTile('run', [running[6], running[3]], R, 'running.html')}<a class="btn btn-dark btn-xs" href="solo.html">SHOP NOW</a></div>
    <div class="solo-tile">${C.soloTile('floral', ctx.floral.slice(2, 4), R, 'solo.html')}<a class="btn btn-dark btn-xs" href="solo.html">SHOP NOW</a></div>
  </div>
</div>
${C.loyaltyStrip(R)}`;
  return page({ body, current: 'home', title: '', description: site.description });
}

// =========================================================================== SERIES
function seriesPage(s, ctx) {
  const R = '';
  const items = ctx.bySeries[s.slug];
  const firsts = items.filter((p) => p.slug.endsWith('a'));
  const groups = {};
  items.forEach((p) => (groups[p.code] = groups[p.code] || []).push(p));
  const body = `
<div class="series-hero">${C.seriesBanner(s, firsts, R, 'page', '#designs')}</div>
<div class="container"><div class="series-intro"><h1>${esc(s.name)}</h1><p>${esc(s.description)}</p></div></div>
<div id="designs" class="container-narrow">
${Object.entries(groups).map(([code, list]) => `<section class="design-group"><h2>TEAMWEAR / ${esc(s.name)} / ${code}</h2><div class="products cols-5">${list.map((p) => C.card(p, R)).join('')}</div></section>`).join('')}
</div>
${C.ctaBand()}`;
  return page({ body, current: 'teamwear', title: s.name, description: s.description });
}

// =========================================================================== PRODUCT
function productPage(p, ctx) {
  const R = '../';
  const list = ctx.siblings(p);
  const idx = list.indexOf(p);
  const prev = list[(idx - 1 + list.length) % list.length];
  const next = list[(idx + 1) % list.length];
  const crumbHref = p.type === 'teamwear' ? `${p.series}.html` : p.type === 'running' ? 'running.html' : p.type === 'club' ? 'club.html' : 'solo.html';
  const crumbLabel = p.type === 'teamwear' ? p.seriesName : p.cats[p.cats.length - 1];
  const labels = [p.isNew ? '<span class="label new">New</span>' : '', p.isHot ? '<span class="label hot">Hot</span>' : '', p.was ? `<span class="label sale">-${Math.round((1 - p.price / p.was) * 100)}%</span>` : ''].join('');
  const shareUrl = encodeURIComponent(`${p.url}`);
  const share = `<div class="share"><b style="color:#333;margin-right:4px">Share:</b>
    <a class="fb" href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener" aria-label="Share on Facebook">${icon('facebook')}</a>
    <a class="x" href="https://x.com/intent/post?text=${encodeURIComponent(p.name)}" target="_blank" rel="noopener" aria-label="Share on X">${icon('x')}</a>
    <a class="wa" href="https://wa.me/?text=${encodeURIComponent(p.name)}" target="_blank" rel="noopener" aria-label="Share on WhatsApp">${icon('whatsapp')}</a>
    <a class="tg" href="https://t.me/share/url?url=${shareUrl}" target="_blank" rel="noopener" aria-label="Share on Telegram">${icon('telegram')}</a></div>`;
  const waChat = `<a class="wa-chat" href="${waLink(`Hi ${site.brand}, I have a question about ${p.name}.`)}" target="_blank" rel="noopener"><span class="av"><img src="${R + C.LOGO_W}" alt=""><span class="dot">${icon('whatsapp')}</span></span><span class="pill"><small>${site.brand} Team <em>Online</em></small><b>Question? Let us assist you</b></span></a>`;

  let summaryInner;
  if (p.type === 'teamwear') {
    summaryInner = `
    <form class="order-card" id="order-form" novalidate>
      <div class="lead">Fill the form below and submit to place order.</div>
      <div class="field"><label for="f-name">Name <span class="req">*</span></label><input id="f-name" name="name" required placeholder="Full name" autocomplete="name"></div>
      <div class="field"><label for="f-email">Email <span class="req">*</span></label><div class="input-icon">${icon('mail')}<input id="f-email" name="email" type="email" required placeholder="you@example.com" autocomplete="email"></div></div>
      <div class="field"><label for="f-phone">Phone (with country code) <span class="req">*</span></label><div class="input-icon">${icon('phone')}<input id="f-phone" name="phone" type="tel" required placeholder="+60 12-345 6789" autocomplete="tel"></div></div>
      <div class="field"><label for="f-team">Team Name</label><input id="f-team" name="team" placeholder="e.g. ${site.brand} FC"></div>
      <div class="field"><label for="f-qty">Estimated quantity <span class="req">*</span></label><div class="qty"><button type="button" data-step="-" aria-label="Decrease">&minus;</button><input id="f-qty" name="quantity" type="number" min="5" value="5"><button type="button" data-step="+" aria-label="Increase">+</button></div><div class="hint">Minimum 5</div></div>
      <div class="field"><label for="f-date">Estimated delivery date</label><div class="input-icon">${icon('calendar')}<input id="f-date" name="date" type="date"></div></div>
      <div class="field"><label for="f-notes">Notes (sizes, collar, fabric…)</label><textarea id="f-notes" name="notes" placeholder="e.g. 10 pcs: 2 S, 4 M, 4 L · ARCTIX fabric"></textarea></div>
      <button class="btn btn-dark btn-block" type="submit" style="min-height:46px;text-transform:none;font-size:14px">Send order request ${icon('arrowRight')}</button>
      <div class="notice" id="order-ok" hidden style="margin:14px 0 0">Thanks! Your request is ready to send on WhatsApp. If it didn’t open, <a href="#" target="_blank" rel="noopener"><b>tap here</b></a>.</div>
    </form>
    <div class="or-sep">OR</div>
    ${waChat}
    <div class="note">Please check your size measurement below and key in data before checkout.</div>
    <div class="meta"><div><b>Category:</b> <a href="${R + crumbHref}">${esc(p.seriesName)}</a></div><div><b>Tag:</b> <a href="${R + crumbHref}#designs">${esc(p.code)}</a></div>${share}</div>`;
  } else {
    const cashback = (p.price * 0.02).toFixed(2);
    summaryInner = `
    <div class="price">${p.was ? `<del style="color:#bbb;font-weight:400;font-size:18px;margin-right:6px">${C.money(p.was)}</del>` : ''}${C.money(p.price)}</div>
    <div class="label-sm">Size</div>
    <div class="sizes">${p.sizes.map((s) => `<button type="button" data-size="${s}">${s}</button>`).join('')}</div>
    <div class="cashback"><i>${icon('money')}</i><div><b>Get RM${cashback} cashback</b><a href="${R}tmz-loyalty.html">Join free and get RM4 now.</a></div></div>
    <div class="buy-row"><div class="qty small"><button type="button" data-step="-" aria-label="Decrease">-</button><input type="number" min="1" value="1" aria-label="Quantity"><button type="button" data-step="+" aria-label="Increase">+</button></div><button class="btn btn-outline" type="button" data-add style="text-transform:none;font-size:14px">Add to bag</button><button class="btn btn-dark" type="button" data-buy style="text-transform:none;font-size:14px">Buy now</button></div>
    <div class="note">Please check your size measurement below and key in data before checkout.</div>
    <div class="meta"><div><b>SKU:</b> N/A</div><div><b>Category:</b> ${p.cats.map((c) => `<a href="${R}shop.html?cat=${encodeURIComponent(c)}">${esc(c)}</a>`).join(', ')}</div><div><b>Tags:</b> ${esc(p.name.toUpperCase())}, ${esc(p.cats[p.cats.length - 1])}</div>${share}</div>`;
  }

  const details = p.type === 'teamwear'
    ? C.seriesPanels(ctx.seriesBySlug[p.series], ctx.bySeries[p.series].filter((x) => x.slug.endsWith('a')), R, ctx.template(p))
    : C.soloDetails(p, R, ctx.template(p));
  const related = ctx.related(p);
  const productData = { slug: p.slug, name: p.name, price: p.price || 0, img: p.img, url: p.url, category: p.type === 'teamwear' ? p.seriesName : p.catLabel };
  const body = `
<div class="product-page container" data-product='${esc(JSON.stringify(productData))}'>
  <div class="product-top">
    <div class="gallery">
      <div class="shot"><img src="${R + p.img}" alt="${esc(p.name)} front"></div>
      <div class="shot"><img src="${R + p.back}" alt="${esc(p.name)} back"></div>
      ${labels ? `<div class="labels">${labels}</div>` : ''}
      <button class="zoom-btn" type="button" aria-label="Enlarge image">${icon('expand')}</button>
    </div>
    <div class="summary">
      <div class="crumb-row"><div><a href="${R}index.html">Home</a><span class="sep">/</span><a href="${R + crumbHref}">${esc(crumbLabel)}</a></div>
        <div class="pn"><a href="${R + prev.url}" aria-label="Previous product">${icon('chevLeft')}</a><a href="${R + crumbHref}" aria-label="Back to collection">${icon('grid')}</a><a href="${R + next.url}" aria-label="Next product">${icon('chevRight')}</a></div></div>
      <h1>${esc(p.name)}</h1>
      ${summaryInner}
    </div>
  </div>
</div>
<div class="tabs">
  <div class="tabs-nav"><button class="on" type="button">${p.type === 'teamwear' ? 'Details Product' : 'Product Details'}</button></div>
  <div class="container"><div class="tab-panel on">${details}</div></div>
</div>
<div class="container related"><h2>Related products</h2><div class="products cols-6">${related.map((r) => C.card(r, R)).join('')}</div></div>
<div class="sticky-atc"><div class="container"><img src="${R + p.img}" alt=""><span class="t">${esc(p.name)}</span>${p.price ? `<span class="p">${C.money(p.price)}</span><button class="btn btn-outline" type="button" data-choose style="text-transform:none">Choose size</button><button class="btn btn-dark" type="button" data-choose style="text-transform:none">Buy now</button>` : `<button class="btn btn-dark" type="button" data-choose style="text-transform:none">Send order request</button>`}</div></div>`;
  return page({ body, depth: 1, current: p.type === 'teamwear' ? 'teamwear' : p.type === 'club' ? 'collab' : 'solo', title: p.name, description: `${p.name} – ${p.type === 'teamwear' ? p.seriesName + ' series custom jersey' : p.catLabel} by ${site.brand}.` });
}

// =========================================================================== SOLO
function soloPage(ctx) {
  const R = '';
  const { solo } = ctx;
  const by = (g) => solo.filter((p) => p.group === g);
  const carousel = (id, list) => {
    const pages = [];
    for (let i = 0; i < list.length; i += 3) pages.push(list.slice(i, i + 3));
    return `<div class="carousel slider-3" data-carousel data-loop="false" id="${id}"><div class="carousel-track">${pages.map((pg) => `<div class="page">${pg.map((p) => C.card(p, R, { big: true })).join('')}</div>`).join('')}</div></div><div class="carousel-dots" data-dots-for="${id}"></div>`;
  };
  const floral = by('FLORAL');
  const body = `
<div class="container" style="padding-top:20px">
  <div class="line-title">PIT LANE</div>
  <div class="products cols-3">${by('PIT LANE').map((p) => C.card(p, R, { big: true })).join('')}</div>
  <div class="line-title">UNITY</div>
  <div class="products cols-3">${by('UNITY').map((p) => C.card(p, R, { big: true })).join('')}</div>
  <div class="line-title">FLORAL</div>
  ${carousel('floral-men', floral.filter((p) => p.name.includes('Men')))}
  <div style="height:20px"></div>
  ${carousel('floral-women', floral.filter((p) => p.name.includes('Women')))}
</div>`;
  return page({ body, current: 'solo', title: 'Solo', description: `Ready-to-wear jerseys from ${site.brand}: Pit Lane Heritage, Unity and Floral collections.` });
}

function runningPage(ctx) {
  const R = '';
  const groups = {};
  ctx.running.forEach((p) => (groups[p.group] = groups[p.group] || []).push(p));
  const body = `
<div class="series-hero">${C.runSlide([ctx.running[0], ctx.running[4], ctx.running[1]], R).replace('ratio-2-1', 'ratio-series').replace(/href="[^"]*running.html"/, 'href="#designs"')}</div>
<div class="container"><div class="series-intro"><h1>RUNNING</h1><p>Featherlight singlets and tees for training days, race days and everything in between. Quick-dry performance fabric, flatlock seams and colourways you can spot from the next kilometre.</p></div></div>
<div class="container" id="designs">
${Object.entries(groups).map(([g, list]) => `<div class="line-title">${esc(g)}</div><div class="products cols-3">${list.map((p) => C.card(p, R, { big: true })).join('')}</div>`).join('')}
</div>`;
  return page({ body, current: 'solo', title: 'Running', description: `${site.brand} running collection.` });
}

// =========================================================================== SHOP
function shopPage(ctx) {
  const R = '';
  const all = ctx.all.slice().sort((a, b) => a.order - b.order);
  const cats = [...new Set(all.flatMap((p) => p.cats))].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const colors = [['Blue', '#1e73be'], ['Green', '#1e8a2e'], ['Grey', '#a0a0a0'], ['Orange', '#f0a030'], ['Pink', '#e83e8c'], ['Purple', '#8e3fd6'], ['Red', '#d32f2f'], ['Yellow', '#f5c518'], ['Black', '#111111'], ['White', '#f2f2f2']];
  const body = `
<div class="container-wide">
  <div class="shop">
    <aside class="shop-side">
      <h1>Shop (<span data-shop-count>${all.length}</span>)</h1>
      <ul class="shop-cats"><li><a href="#" data-cat="all" class="on">All Products</a></li>${cats.map((c) => `<li><a href="#" data-cat="${esc(c)}">${esc(c)}</a></li>`).join('')}</ul>
      <div class="widget"><button class="widget-h" type="button">Shop By Price ${icon('chevDown')}</button><div class="widget-b">
        <label class="check"><input type="checkbox" data-price-range value="1-69.99"> Under RM 70</label>
        <label class="check"><input type="checkbox" data-price-range value="70-99.99"> RM 70 - RM 99</label>
        <label class="check"><input type="checkbox" data-price-range value="100-149.99"> RM 100 - RM 149</label>
        <label class="check"><input type="checkbox" data-price-range value="150-100000"> RM 150 &amp; above</label>
      </div></div>
      <div class="widget"><button class="widget-h" type="button">Filter by Color ${icon('chevDown')}</button><div class="widget-b">
        <div class="swatches">${colors.map(([n, c], i) => `<button type="button" data-color="${n}"${i > 5 ? ' hidden' : ''}><i style="background:${c}${n === 'White' ? ';border:1px solid #ddd' : ''}"></i>${n}</button>`).join('')}</div>
        <button type="button" data-more-colors style="background:none;border:0;padding:10px 0 0;color:#333;font-size:13px">+ More</button>
      </div></div>
    </aside>
    <div>
      <div class="shop-toolbar"><b class="mobile-only shop-count-m">Shop (<span data-shop-count>${all.length}</span>)</b><button type="button" data-hide-filters><span>Hide Filters</span> ${icon('filter')}</button><label>Sort By: <select data-sort aria-label="Sort products"><option value="featured">Featured</option><option value="name">Name</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label></div>
      <div class="products">${all.map((p) => C.card(p, R)).join('')}</div>
      <div class="empty" hidden>No products match your filters.</div>
    </div>
  </div>
</div>`;
  return page({ body, current: 'solo', title: 'Shop', description: `Shop all ${site.brand} jerseys.` });
}

// =========================================================================== CLUB
function clubPage(ctx) {
  const R = '';
  const body = `
<div class="banner ratio-club club-hero" style="max-height:540px"><div class="fill ch-bg"></div><span class="cs-ball b1"></span><span class="cs-ball b2"></span><span class="cs-ball b3"></span><h1>CLUB</h1></div>
<div class="club-intro">Welcome to the Club page, where fan-favourite teams come together to celebrate their communities, stories and passion for sport. This is the hub for fans to connect with their clubs and own a piece of the legacy through exclusive jerseys. With new teams added regularly, this is where clubs give back to their supporters. Find and purchase your favourite club’s jersey directly, all in one place!</div>
<div class="container">
${ctx.clubs.map((c) => {
    const id = 'club-' + c.slug;
    const prods = c.products.map((p) => ctx.bySlug[p.slug]);
    return `<section class="club-block"><h2>CLUB / ${esc(c.name)}</h2>
    <div class="club-row">
      <div class="club-panel" style="background:${c.panel.bg}"><div class="gridlines"></div>${c.panel.badge ? `<div class="crest"><b>${esc(c.panel.mark).replace(' ', '<br>')}</b></div>` : `<div class="mark">${esc(c.panel.mark)}</div>`}</div>
      <div class="club-products"><div class="carousel" data-carousel data-loop="false" id="${id}"><div class="carousel-track">${prods.map((p) => `<div>${C.card(p, R)}</div>`).join('')}</div></div>${prods.length > 1 ? `<div class="carousel-dots" data-dots-for="${id}"></div>` : ''}</div>
    </div></section>`;
  }).join('')}
</div>`;
  return page({ body, current: 'collab', title: 'Club', description: `Club collaboration jerseys by ${site.brand}.` });
}

// =========================================================================== LOYALTY
function loyaltyPage() {
  const R = '';
  const body = `
<div class="loy">
  <section class="loy-hero">
    <div><div class="k">FREE · EASY · BENEFICIAL</div><h1>SHOP MORE, EARN <span>MORE.</span></h1><p>2% cashback on every order, in Ringgit. Use it on your next order with one tap.</p>
      <div class="acts"><a class="btn" href="${R}my-account.html">Join free · get RM4</a><a class="link" href="${R}my-account.html">Log in</a></div></div>
    <div class="loy-badge"><img src="${R + C.LOGO_W}" alt="${site.brand}"><b>LOYALTY</b></div>
  </section>
  <h2>How it works</h2>
  <div class="loy-steps">
    <div class="loy-card"><div class="n">1</div><h4>Join free</h4><p>RM4 cashback is yours right away.</p></div>
    <div class="loy-card"><div class="n">2</div><h4>Shop</h4><p>Every completed order earns 2% or more.</p></div>
    <div class="loy-card"><div class="n">3</div><h4>Use it</h4><p>RM1 cashback = RM1 off at checkout, one tap.</p></div>
  </div>
  <h2>Ways to earn</h2>
  <div class="loy-earn">
    <div class="earn pink"><div class="v">2%–3%</div><h5>Every order</h5><p>Cashback on the product total of every completed order.</p></div>
    <div class="earn mint"><div class="v">+RM1.50</div><h5>Bigger orders</h5><p>+RM0.50 at RM100 · +RM1 at RM150 · +RM1.50 at RM200</p></div>
    <div class="earn butter"><div class="v">2×</div><h5>Member Days</h5><p>Double cashback on 11.11, 12.12, 1.1 and more.</p></div>
    <div class="earn yellow"><div class="v">up to 3%</div><h5>Levels</h5><p>Spend more, earn a higher rate for good.</p></div>
    <div class="earn muted"><span class="soon">COMING SOON</span><h5>Order again</h5><p>Extra cashback when your order no. 2 is completed.</p></div>
    <div class="earn muted"><span class="soon">COMING SOON</span><h5>Refer a teammate</h5><p>Share your link. You get cashback when their first order is completed.</p></div>
    <div class="earn muted"><span class="soon">COMING SOON</span><h5>Review a product</h5><p>For every approved review.</p></div>
    <div class="earn muted"><span class="soon">COMING SOON</span><h5>Early access to drops</h5><p>Pro and Legend members shop new releases first.</p></div>
    <div class="earn muted"><span class="soon">COMING SOON</span><h5>Deals by email</h5><p>Cashback for joining the deals list.</p></div>
  </div>
  <h2>Levels</h2>
  <div class="loy-levels">
    <div class="lvl"><h4>ROOKIE</h4><div class="from">When you join</div><div class="rate">2%<small>cashback</small></div><ul><li>RM4 welcome</li><li>RM3 birthday</li><li>2× on Member Days</li></ul></div>
    <div class="lvl pro"><h4>PRO</h4><div class="from">From RM300 total spend</div><div class="rate">2.5%<small>cashback</small></div><ul><li>RM6 level-up bonus</li><li>RM5 birthday</li><li>2× on Member Days</li></ul></div>
    <div class="lvl legend"><h4>LEGEND</h4><div class="from">From RM800 total spend</div><div class="rate">3%<small>cashback</small></div><ul><li>RM10 level-up bonus</li><li>RM10 birthday</li><li>2× on Member Days</li></ul></div>
  </div>
  <h2>Your cashback</h2>
  <div class="calc"><div><label for="calc-r">Order of</label><div class="amt">RM150</div><input id="calc-r" type="range" min="20" max="1000" step="10" value="150"></div>
    <div class="tiers"><div class="tier on"><b>ROOKIE</b><span>RM4.00</span></div><div class="tier"><b>PRO</b><span>RM4.75</span></div><div class="tier"><b>LEGEND</b><span>RM5.50</span></div></div></div>
  <h2>Questions</h2>
  <div class="faq">
    <details open><summary>When does cashback arrive?</summary><p>When your order is marked completed. You can see it any time in My Account › My Cashback.</p></details>
    <details><summary>How do I use it?</summary><p>At checkout, tap “Use cashback”. RM1 cashback = RM1 off your order.</p></details>
    <details><summary>Does it expire?</summary><p>Cashback stays valid for 12 months from the date it was earned.</p></details>
    <details><summary>How do levels work?</summary><p>Your level is based on your total completed spend. Once you reach a level, you keep it.</p></details>
    <details><summary>What if I return an order?</summary><p>Cashback earned from a returned or refunded order is removed from your balance.</p></details>
    <details><summary>Terms</summary><p>${site.brand} may update the loyalty programme at any time. Cashback has no cash value and cannot be transferred.</p></details>
  </div>
  <div class="loy-cta"><b>JOIN FREE. GET RM4.</b><a class="btn" href="${R}my-account.html">Create account</a></div>
</div>
<div class="spacer-l"></div>`;
  return page({ body, current: 'loyalty', title: 'TMZ Loyalty', description: `Earn cashback on every ${site.brand} order.` });
}

// =========================================================================== CONTACT
function contactPage() {
  const body = `
<div class="container contact">
  <div>
    <h2>Our address</h2>
    <h4>${esc(site.address.city)}</h4>
    <p>${site.address.lines.map(esc).join('<br>')}</p>
    <p style="margin-top:25px"><b>Email:</b> <a href="mailto:${site.email}" style="color:#777">${esc(site.email)}</a><br><b>Phone:</b> ${esc(site.phoneDisplay)}<br><b>Office:</b> ${esc(site.office)}</p>
    <p><b>Business Hours:</b><br>${site.hours.map(([d, h]) => `${esc(d)}: ${esc(h)}`).join('<br>')}</p>
    <h2 style="margin-top:30px">Contact us</h2>
    <p>Whether you’re looking for answers, would like to solve a problem, or just want to let us know how we did, you’ll find it here.</p>
    <a class="btn btn-dark" href="${waLink(`Hi ${site.brand}!`)}" target="_blank" rel="noopener">Write a message</a>
  </div>
  <div class="map"><iframe title="Map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&z=13&output=embed"></iframe></div>
</div>`;
  return page({ body, title: 'Contact Us', description: `Get in touch with ${site.brand}.` });
}

// =========================================================================== ABOUT
function aboutPage(ctx) {
  const R = '';
  const j = (p) => `<img src="${R + p.img}" alt="" style="position:absolute;width:85%;left:7%;top:5%;filter:grayscale(1) brightness(.55) contrast(1.2);mix-blend-mode:luminosity;opacity:.55">`;
  const bg = (extra) => `<div class="bg" style="background:${extra}"></div>`;
  const rows = [
    ['TARGET', '1. TARGET', 'Our main target is to give your body its right!<br>' + site.brand + ' sportswear is made for everyone as a kick-off to a healthier lifestyle, regardless of age, gender or passion.', bg('radial-gradient(60% 70% at 40% 40%, #2a4a63, #0e1e2a 75%)') + j(ctx.bySeries['on-field'][2])],
    ['PRODUCT', '2. PRODUCT', 'We produce the finest quality products to meet the specifications of a professional touch. That is why only high quality performance fabric is used in our production.', bg('radial-gradient(60% 70% at 60% 40%, #24425a, #0b1822 75%)') + j(ctx.bySeries.court[0])],
    ['DESIGN', '3. DESIGN', 'We are joined by a design team with years of experience in this industry. Get ready to be amazed by outstanding designs that suit all kinds of sports and occasions, and can be worn casually too!', bg('repeating-linear-gradient(60deg, rgba(255,255,255,.04) 0 2px, transparent 2px 22px), radial-gradient(60% 70% at 40% 50%, #1f3d52, #0b1822 75%)')],
    ['CUSTOMIZATION', '4. CUSTOMIZATION', site.brand + ' custom products are exclusive because they are personalised only for you! Choose your favourite design and add whatever you like: name, number, logo and more.', bg('radial-gradient(60% 70% at 60% 40%, #24425a, #0b1822 75%)') + j(ctx.bySeries.esport[0])],
    ['TEAM', '5. TEAM', `All of us at ${site.brand} are trained to cover everything throughout the entire process, from liaising with clients, receiving orders and designing, to fabric cutting, sewing and quality control.<br><br>Every step happens under our own roof so that we deliver only the finest quality products. Only the best is served to you!`, bg('linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px) 0 0/40px 40px, linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px) 0 0/40px 40px, radial-gradient(60% 70% at 40% 50%, #203d50, #08131b 75%)')],
  ];
  const body = `
<section class="about-hero"><div class="bglines"></div><img class="bgmark" src="${R + C.LOGO_W}" alt=""><div class="bgword">${site.brand}</div>
  <div class="inner"><div class="tag"><img src="${R + C.LOGO_W}" alt="${site.brand}"><span><b>Malaysia’s</b> custom sportswear manufacturer.</span></div>
  <h1>BEHIND THE BRAND</h1>
  <p><b>${site.brand}</b> exists to make teams look and feel unstoppable. We design and manufacture sublimation sportswear and active lifestyle apparel, taking every jersey from first sketch to final stitch, and taking custom teamwear to the <b>next level</b>.</p></div>
</section>
${rows.map(([word, h, t, art], i) => `<section class="about-row${i % 2 ? ' rev' : ''}"><div class="img">${art}<span class="word">${word}</span></div><div class="txt"><h3>${h}</h3><p>${t}</p></div></section>`).join('')}`;
  return page({ body, title: 'About Us', description: `About ${site.brand}.` });
}

// =========================================================================== TRACK ORDER
function trackPage() {
  const body = `
<div class="page-title"><h1>Track Order</h1><div class="breadcrumbs"><a href="index.html">Home</a><span class="sep">/</span><b>Track Order</b></div></div>
<div class="container">
  <div class="track"><h2>ORDER TRACKING</h2>
    <p>To track your order please enter your Order ID in the box below and press the "Track" button. This was given to you on your receipt and in the confirmation email you should have received.</p>
    <form data-wa="Hi ${site.brand}, I would like to check my order status.">
      <div class="field" style="margin:0"><label for="t-id">Order ID</label><input id="t-id" name="Order ID" required placeholder="Found in your order confirmation email."></div>
      <div class="field" style="margin:0"><label for="t-mail">Billing email</label><input id="t-mail" name="Billing email" type="email" required placeholder="Email you used during checkout."></div>
      <button class="btn btn-dark" type="submit">Track</button>
    </form>
  </div>
  <div class="ship">
    <div>
      <h2>SHIPMENT TRACKING</h2><div class="sub">(${site.brand} shipping partner)</div>
      <div class="step"><b>1.</b><div><h4>Insert your tracking number</h4><p>It’s easy to track in bulk! Simply paste your tracking or order number to get a summarised result for every individual shipment.</p></div></div>
      <div class="step r"><b>2.</b><div><h4>Get summarised results on one page</h4><p>Have too many shipments to track? See up to 15 of your latest shipment statuses on a single page.</p></div></div>
      <div class="step"><b>3.</b><div><h4>Get notified by email on tracking statuses</h4><p>Looking for a more proactive way to keep receivers updated? Status updates can be sent automatically by email.</p></div></div>
    </div>
    <div class="partner">${icon('box')}<b>Courier partner</b><span style="color:#999;font-size:13px">Tracking links are sent by email once your order ships.</span></div>
  </div>
  <div class="answers"><h2>Get answers to all your questions you might have.</h2><p>We will answer any questions you may have about our online sales right here.</p><p>Monday to Friday from <b style="color:#333">10:00 to 18:00</b></p>
    <a class="btn btn-dark" href="contact-us.html">Contact us</a>
    <div class="circles"><a href="${site.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${icon('facebook')}</a><a href="${site.social.x}" target="_blank" rel="noopener" aria-label="X">${icon('x')}</a><a href="${site.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${icon('instagram')}</a><a href="${waLink()}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon('whatsapp')}</a></div>
  </div>
</div>`;
  return page({ body, title: 'Track Order', description: `Track your ${site.brand} order.` });
}

// =========================================================================== CART / CHECKOUT / ACCOUNT
function steps(on) {
  const s = ['Shopping cart', 'Checkout', 'Order complete'];
  return `<div class="page-title"><div class="steps">${s.map((x, i) => `<span class="${i === on ? 'on' : ''}">${x}</span>${i < 2 ? `<span class="arrow">${icon('arrowRight')}</span>` : ''}`).join('')}</div></div>`;
}
function cartPage() {
  return page({ title: 'Shopping Cart', body: `${steps(0)}<div class="container"><div class="cart-wrap" id="cart-root"></div></div>` });
}
function checkoutPage() {
  const body = `${steps(1)}
<div class="container"><form class="checkout" id="checkout-form">
  <div>
    <h3>Billing details</h3>
    <div class="two"><div class="field"><label>First name <span class="req">*</span></label><input name="first" required autocomplete="given-name"></div><div class="field"><label>Last name <span class="req">*</span></label><input name="last" required autocomplete="family-name"></div></div>
    <div class="field"><label>Street address <span class="req">*</span></label><input name="address" required autocomplete="street-address" placeholder="House number and street name"></div>
    <div class="two"><div class="field"><label>Town / City <span class="req">*</span></label><input name="city" required autocomplete="address-level2"></div><div class="field"><label>Postcode <span class="req">*</span></label><input name="postcode" required autocomplete="postal-code"></div></div>
    <div class="field"><label>State <span class="req">*</span></label><select name="state" required>${['Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya'].map((s) => `<option>${s}</option>`).join('')}</select></div>
    <div class="two"><div class="field"><label>Phone <span class="req">*</span></label><input name="phone" type="tel" required autocomplete="tel"></div><div class="field"><label>Email address <span class="req">*</span></label><input name="email" type="email" required autocomplete="email"></div></div>
    <div class="field"><label>Order notes (optional)</label><textarea name="notes" placeholder="Notes about your order, e.g. special notes for delivery."></textarea></div>
  </div>
  <div><div class="review"><h3>Your order</h3><div id="review-lines"></div>
    <label class="pay-opt"><input type="radio" name="payment" value="FPX Online Banking (Billplz)" checked> FPX Online Banking</label>
    <label class="pay-opt"><input type="radio" name="payment" value="Credit / Debit Card"> Credit / Debit Card (Visa, Mastercard)</label>
    <p style="font-size:12px;margin-top:15px">Your personal data will be used to process your order and for other purposes described in our <a href="privacy.html">privacy policy</a>.</p>
    <button class="btn btn-dark btn-block" type="submit" style="min-height:50px">Place order</button>
    <div class="notice" id="checkout-ok" hidden style="margin-top:14px">Thank you! We’ve opened WhatsApp with your order summary. Our team will confirm your order and send a payment link.</div>
  </div></div>
</form></div>`;
  return page({ title: 'Checkout', body });
}
function accountPage() {
  const body = `<div class="page-title"><h1>My account</h1><div class="breadcrumbs"><a href="index.html">Home</a><span class="sep">/</span><b>My account</b></div></div>
<div class="container"><div class="account">
  <div><h2>Login</h2><form data-soon="Online accounts are coming soon. Contact us on WhatsApp for order updates.">
    <div class="field"><label>Username or email address <span class="req">*</span></label><input required autocomplete="username"></div>
    <div class="field"><label>Password <span class="req">*</span></label><input type="password" required autocomplete="current-password"></div>
    <label class="check"><input type="checkbox"> Remember me</label>
    <button class="btn btn-dark btn-block" type="submit" style="margin-top:12px">Log in</button>
    <p style="margin-top:12px"><a href="#" style="color:#777">Lost your password?</a></p></form></div>
  <div><h2>Register</h2><form data-soon="Thanks! Registration opens soon. Your RM4 welcome cashback will be waiting.">
    <div class="field"><label>Email address <span class="req">*</span></label><input type="email" required autocomplete="email"></div>
    <div class="field"><label>Password <span class="req">*</span></label><input type="password" required autocomplete="new-password"></div>
    <p style="font-size:13px">Your personal data will be used to support your experience throughout this website, to manage access to your account, and for other purposes described in our <a href="privacy.html">privacy policy</a>.</p>
    <button class="btn btn-dark btn-block" type="submit">Register</button></form></div>
</div></div>`;
  return page({ title: 'My account', body });
}

// =========================================================================== TEXT PAGES
function textPage(title, html) {
  const body = `<div class="page-title"><h1>${esc(title)}</h1><div class="breadcrumbs"><a href="index.html">Home</a><span class="sep">/</span><b>${esc(title)}</b></div></div><div class="text-page">${html}</div><div class="spacer-m"></div>`;
  return page({ title, body });
}
const B = site.brand;
const policies = {
  'terms-and-conditions': ['Terms & Conditions', `
<p>These terms apply to all purchases made through the ${B} website and through our custom order channels (WhatsApp, email and social media). By placing an order you agree to them.</p>
<h2>1. Custom orders</h2><ul><li>The minimum order quantity for custom teamwear is 5 pieces per design.</li><li>Production starts only after the design mock-up has been approved and the deposit has been received.</li><li>Production takes around 7–10 working days after approval, excluding shipping.</li><li>Names, numbers, logos and sizes must be checked carefully before approval. We are not responsible for errors in information supplied by the customer.</li></ul>
<h2>2. Pricing &amp; payment</h2><ul><li>All prices are in Malaysian Ringgit (RM).</li><li>Custom orders require a deposit before production and full payment before delivery.</li><li>Payments are processed securely through our payment partners.</li></ul>
<h2>3. Colours</h2><p>Sublimation colours may differ slightly from on-screen previews due to monitor settings and fabric type.</p>
<h2>4. Intellectual property</h2><p>Customers confirm they have the right to use any logo, artwork or trademark they supply for printing. ${B} designs remain the property of ${B}.</p>
<h2>5. Changes</h2><p>${B} may update these terms at any time. The version published on this page applies to new orders.</p>`],
  privacy: ['Privacy Policy', `
<p>${B} respects your privacy and processes personal data in line with the Personal Data Protection Act 2010 (PDPA).</p>
<h2>What we collect</h2><ul><li>Contact details you give us (name, email, phone number, delivery address).</li><li>Order details, including team names, numbers and artwork.</li><li>Basic website usage data (for example, items saved in your bag on this device).</li></ul>
<h2>How we use it</h2><ul><li>To process, produce and deliver your orders.</li><li>To contact you about your order or enquiry.</li><li>To send marketing messages if you have opted in. You can opt out at any time.</li></ul>
<h2>Sharing</h2><p>We share data only with service providers needed to complete your order, such as payment gateways and courier partners.</p>
<h2>Your rights</h2><p>You may request access to, correction of, or deletion of your personal data by contacting <a href="mailto:${site.email}">${site.email}</a>.</p>`],
  'payment-flow': ['Payments', `
<p>We accept the following payment methods:</p><ul>${site.payments.map((p) => `<li>${p}</li>`).join('')}</ul>
<h2>Online banking (FPX)</h2><p>Choose your bank at checkout and you’ll be redirected to log in and approve the payment. You’ll return to our website once the payment is complete.</p>
<h2>Credit / debit card</h2><ol><li>Choose “Credit / Debit Card” at checkout.</li><li>Enter your card details on the secure payment page.</li><li>Complete verification (OTP / 3-D Secure) with your bank.</li><li>You’ll receive a confirmation email once the payment is successful.</li></ol>
<h2>Custom orders</h2><p>For custom teamwear, our team will send you a secure payment link for the deposit once your design is confirmed.</p>`],
  'shipping-and-return-policy': ['Shipping & Return Policy', `
<h2>Shipping</h2><ul><li>We ship to all states in Malaysia. Shipping fees are calculated at checkout.</li><li>Ready-to-wear (Solo) items are shipped within 1–3 working days.</li><li>Custom teamwear is shipped after production is complete (around 7–10 working days).</li><li>A tracking number is sent by email once your parcel ships.</li></ul>
<h2>Returns</h2><ul><li>Ready-to-wear items may be exchanged within 7 days of delivery if they are unworn, unwashed and in their original packaging.</li><li>Custom products are made to order and cannot be returned, unless they arrive with a manufacturing defect.</li><li>To request a return or exchange, contact us with your order number and photos of the item.</li></ul>`],
  'refund-policy': ['Refund Policy', `
<p>Refunds are offered for defective or incorrect items reported within 7 days of delivery.</p><ul><li>Approved refunds are processed to the original payment method within 7–14 working days.</li><li>Deposits for custom orders are non-refundable once production has started.</li><li>Shipping fees are non-refundable unless the error was ours.</li></ul>`],
};

function notFound() {
  const body = `<div class="e404"><b>404</b><h1>This page can’t be found</h1><p>It looks like nothing was found at this location.</p><a class="btn btn-dark" href="index.html">Back to home</a></div>`;
  return page({ title: 'Page not found', body });
}

module.exports = { home, seriesPage, productPage, soloPage, runningPage, shopPage, clubPage, loyaltyPage, contactPage, aboutPage, trackPage, cartPage, checkoutPage, accountPage, textPage, policies, notFound };

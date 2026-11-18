'use strict';
const icon = require('./icons');
const { site, menu, series } = require('./data');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const seriesBySlug = Object.fromEntries(series.map((s) => [s.slug, s]));
const waLink = (text = `Hi ${site.brand}`) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;

const FONTS =
  'https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Cinzel:wght@600;700&family=Lato:wght@300;400;700;900&family=Open+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Unbounded:wght@600;700;800&display=swap';

function socialIcons(cls = 'social-icons') {
  return `<div class="${cls}">
    <a href="${site.social.facebook}" target="_blank" rel="noopener noreferrer" aria-label="Facebook">${icon('facebook')}</a>
    <a href="${site.social.x}" target="_blank" rel="noopener noreferrer" aria-label="X">${icon('x')}</a>
    <a href="${site.social.instagram}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">${icon('instagram')}</a>
    <a href="${waLink()}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">${icon('whatsapp')}</a>
  </div>`;
}

function menuItem(it) {
  if (it.series) {
    const s = seriesBySlug[it.series];
    return { label: s.name, href: `${s.slug}.html`, isNew: s.isNew, key: s.slug };
  }
  if (typeof it === 'string') {
    const s = seriesBySlug[it];
    return { label: s.name, href: `${s.slug}.html`, isNew: s.isNew, key: s.slug };
  }
  return it;
}

function desktopNav(R, current) {
  const sub = (items) =>
    `<ul class="dropdown${items.level > 1 ? ' sub' : ''}">${items.list
      .map((raw) => {
        const it = menuItem(raw);
        const href = it.href ? R + it.href : R + (it.children ? menuItem(it.children[0]).href : '#');
        const label = `<span class="t" style="position:relative">${esc(it.label)}${it.isNew ? '<span class="menu-label">NEW</span>' : ''}</span>`;
        if (it.children) {
          return `<li><a href="${href}">${label}${icon('chevRight', 'chev')}</a>${sub({ list: it.children, level: items.level + 1 })}</li>`;
        }
        return `<li><a href="${href}">${label}</a></li>`;
      })
      .join('')}</ul>`;
  return `<nav class="main-nav desktop-only" aria-label="Main"><ul>${menu
    .map((m) => {
      const cur = m.key === current ? ' class="current"' : '';
      if (!m.children) return `<li${cur}><a href="${R + m.href}">${esc(m.label)}</a></li>`;
      return `<li${cur}><a href="#" onclick="return false">${esc(m.label)}${icon('chevDown', 'caret')}</a>${sub({ list: m.children, level: 1 })}</li>`;
    })
    .join('')}</ul></nav>`;
}

function drawerNav(R, current) {
  const items = (list, depth) =>
    `<ul class="${depth ? 'subnav' : ''}">${list
      .map((raw) => {
        const it = menuItem(raw);
        const href = it.href ? R + it.href : '#';
        const cur = it.key === current ? ' class="current"' : '';
        if (it.children) {
          return `<li><div class="row"><a href="${href}" ${it.href ? '' : 'onclick="this.nextElementSibling.click();return false"'}${cur}>${esc(it.label)}</a><button class="toggle" aria-label="Open ${esc(it.label)}">${icon('chevRight')}</button></div>${items(it.children, depth + 1)}</li>`;
        }
        return `<li><div class="row"><a href="${href}"${cur}>${esc(it.label)}${it.isNew ? ' <span class="menu-label" style="top:-6px">NEW</span>' : ''}</a></div></li>`;
      })
      .join('')}</ul>`;
  return `<div class="drawer-overlay"></div>
  <aside class="drawer" aria-label="Mobile menu">${items(menu, 0).replace(/<\/ul>$/, '')}<li><div class="row"><a href="${R}my-account.html">${icon('user')} LOGIN / REGISTER</a></div></li></ul></aside>`;
}

function header(R, current) {
  return `<header class="site-header">
  <div class="topbar"><div class="bar">
    ${socialIcons()}
    <a class="pill desktop-only" href="${R}track-order.html">Track Order</a>
    <span class="divider desktop-only"></span>
    <a class="acct desktop-only" href="${R}my-account.html" aria-label="My account">${icon('user')}</a>
  </div></div>
  <div class="header-main"><div class="bar">
    <button class="hamburger mobile-only" data-drawer-open aria-label="Open menu">${icon('menu')}</button>
    <a class="site-logo" href="${R}index.html" aria-label="${site.brand} home"><img src="${R}assets/img/logo/tmz-logo-black.svg" alt="${site.brand}" width="70" height="46"></a>
    ${desktopNav(R, current)}
    <div class="header-tools">
      <a class="cart-link desktop-only" href="${R}shopping-cart.html">${icon('cart')}<span class="amount"><span data-cart-count>0</span> / <span data-cart-amount>RM0.00</span></span></a>
      <a class="acct-m mobile-only" href="${R}my-account.html" aria-label="My account">${icon('user')}</a>
      <a class="bag-link mobile-only" href="${R}shopping-cart.html" aria-label="Bag">${icon('bag')}<span class="bag-count" data-cart-count>0</span></a>
    </div>
  </div></div>
  <div class="header-spacer"></div>
</header>`;
}

function footer(R) {
  const words = site.rotatingWords;
  const brand = (mobile) => `<div class="tmz-ft__brand">
      <img class="tmz-ft__logo" src="${R}assets/img/logo/tmz-logo-black.svg" alt="${site.brand}">
      <div class="tmz-ft__divider"></div>
      <div class="tmz-ft__wordmark"><b>Built for <span class="tmz-ft__rot" data-words="${esc(words.join('|'))}">${esc(words[0])}</span></b><span>${esc(site.tagline)}</span></div>
    </div>`;
  const social = `<div class="tmz-ft__social">
      <a class="fb" href="${site.social.facebook}" target="_blank" rel="noopener noreferrer nofollow" aria-label="Facebook">${icon('facebook')}</a>
      <a class="x" href="${site.social.x}" target="_blank" rel="noopener noreferrer nofollow" aria-label="X">${icon('x')}</a>
      <a class="ig" href="${site.social.instagram}" target="_blank" rel="noopener noreferrer nofollow" aria-label="Instagram">${icon('instagram')}</a>
      <a class="wa" href="${waLink()}" target="_blank" rel="noopener noreferrer nofollow" aria-label="WhatsApp">${icon('whatsapp')}</a>
    </div>`;
  const pay = `<div class="tmz-ft__pay">${site.payments.map((p) => `<span>${esc(p)}</span>`).join('')}</div>`;
  const copy = `&copy;<span data-year>${site.year}</span> ${site.brand} | ${esc(site.company)} (${esc(site.regNo)})`;
  return `<footer class="tmz-ft" role="contentinfo">
  <div class="tmz-ft__desktop"><div class="tmz-ft__inner">
    <div class="tmz-ft__head">${brand(false)}<a class="tmz-ft__cta" href="${R}contact-us.html">CUSTOM NOW <i>&rarr;</i></a></div>
    <div class="tmz-ft__grid">
      <div class="tmz-ft__card"><div class="tmz-ft__label">CUSTOMER SERVICE</div><div class="tmz-ft__links">
        <a href="${R}contact-us.html">Contact Us</a><a href="${R}about-us.html">About Us</a><a href="${R}track-order.html">Track Order</a><a href="${R}shipping-and-return-policy.html">Returns</a></div></div>
      <div class="tmz-ft__card"><div class="tmz-ft__label">INFORMATION</div><div class="tmz-ft__links">
        <a href="${R}payment-flow.html">Payments</a><a href="${R}terms-and-conditions.html">Terms &amp; Conditions</a><a href="${R}privacy.html">Privacy Policy</a></div></div>
      <div class="tmz-ft__card tmz-ft__card--follow"><div class="tmz-ft__label">FOLLOW / PAYMENT</div>${social}${pay}</div>
    </div>
    <div class="tmz-ft__bottom"><span>${copy}</span><a class="tmz-ft__top" href="#" data-top aria-label="Scroll to top">TOP &uarr;</a></div>
  </div></div>
  <div class="tmz-ft__mobile"><div class="tmz-ft__inner">
    <div class="tmz-ft__brandrow">${brand(true)}<a class="tmz-ft__cta" href="${R}contact-us.html">CUSTOM <i>&rarr;</i></a></div>
    <div class="tmz-ft__mcard">
      <a href="${R}contact-us.html">Contact Us</a><a href="${R}payment-flow.html">Payments</a><a href="${R}about-us.html">About Us</a><a href="${R}terms-and-conditions.html">Terms &amp; Cond.</a><a href="${R}track-order.html">Track Order</a><a href="${R}privacy.html">Privacy Policy</a><a href="${R}shipping-and-return-policy.html">Returns</a>
    </div>
    ${social}${pay}
    <div class="tmz-ft__meta"><span>${copy}</span></div>
  </div></div>
</footer>`;
}

function toolbar(R) {
  return `<nav class="mobile-toolbar" aria-label="Quick links">
    <a href="${R}shopping-cart.html"><span class="tb-icon">${icon('bag')}<span class="bag-count" data-cart-count>0</span></span>Bag</a>
    <a href="${R}my-account.html">${icon('user')}My account</a>
    <a href="${R}index.html">${icon('home')}Home</a>
  </nav>`;
}

/**
 * Wrap page body in the full document.
 * opts: { title, description, depth, current, body, bodyClass, extraHead }
 */
function page(opts) {
  const R = opts.depth ? '../'.repeat(opts.depth) : '';
  const title = opts.title ? `${opts.title} - ${site.brand}` : site.title;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(opts.description || site.description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(opts.description || site.description)}">
<meta property="og:site_name" content="${site.brand}">
<meta name="theme-color" content="#202020">
<link rel="icon" href="${R}assets/img/logo/tmz-logo-black.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${R}assets/css/style.css">
${opts.extraHead || ''}
</head>
<body class="${opts.bodyClass || ''}">
${header(R, opts.current)}
${drawerNav(R, opts.current)}
<main id="main">
${opts.body}
</main>
${footer(R)}
${toolbar(R)}
<script>window.TMZ=${JSON.stringify({ root: R, whatsapp: site.whatsapp, brand: site.brand, email: site.email })};</script>
${(opts.scripts || []).map((src) => `<script src="${R + src}" defer></script>`).join('\n')}
<script src="${R}assets/js/main.js" defer></script>
</body>
</html>
`;
}

module.exports = { page, esc, icon, waLink, socialIcons };

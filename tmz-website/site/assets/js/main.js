/* TMZ storefront behaviour (no dependencies) */
(function () {
  'use strict';
  const CFG = window.TMZ || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const money = (n) => 'RM' + Number(n || 0).toFixed(2);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  // ------------------------------------------------------------ toast
  let toastTimer;
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
  }

  // ------------------------------------------------------------ WhatsApp hand-off
  // Opens WhatsApp when the browser allows it, and always reveals a tappable link
  // (embedded/hosted views can block pop-ups).
  function sendWA(text, notice) {
    const url = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(text)}`;
    if (notice) {
      notice.hidden = false;
      const a = notice.querySelector('a'); if (a) a.href = url;
    }
    try { window.open(url, '_blank', 'noopener'); } catch (e) { /* pop-up blocked: the link above still works */ }
    return url;
  }

  // ------------------------------------------------------------ sticky header
  const header = $('.header-main');
  const spacer = $('.header-spacer');
  if (header) {
    const trigger = () => (window.innerWidth > 1024 ? 300 : 120);
    const onScroll = () => {
      const on = window.scrollY > trigger();
      header.classList.toggle('is-sticky', on);
      if (spacer) spacer.classList.toggle('on', on);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ------------------------------------------------------------ mobile drawer
  $$('[data-drawer-open]').forEach((b) => b.addEventListener('click', () => document.body.classList.add('drawer-open')));
  $$('[data-drawer-close], .drawer-overlay').forEach((b) => b.addEventListener('click', () => document.body.classList.remove('drawer-open')));
  $$('.drawer .toggle').forEach((b) => b.addEventListener('click', () => b.closest('li').classList.toggle('open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { document.body.classList.remove('drawer-open'); closeLightbox(); } });

  // ------------------------------------------------------------ back to top
  $$('[data-top]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));

  // ------------------------------------------------------------ footer rotating word
  $$('.tmz-ft__rot').forEach((el) => {
    const words = (el.dataset.words || '').split('|').filter(Boolean);
    if (words.length < 2) return;
    let i = 0;
    setInterval(() => {
      el.classList.add('is-out');
      setTimeout(() => { i = (i + 1) % words.length; el.textContent = words[i]; el.classList.remove('is-out'); }, 300);
    }, 2600);
  });

  // ------------------------------------------------------------ carousels
  $$('[data-carousel]').forEach((root) => {
    const track = $('.carousel-track', root);
    const slides = Array.from(track.children);
    const n = slides.length;
    if (n < 2) { $$('.carousel-arrow', root).forEach((a) => a.remove()); return; }
    const loop = root.dataset.loop !== 'false';
    const autoplay = +root.dataset.autoplay || 0;
    let i = 0, timer;
    const prev = $('.carousel-arrow.prev', root), next = $('.carousel-arrow.next', root);
    const dotsWrap = root.parentElement.querySelector(`[data-dots-for="${root.id}"]`) || $('.carousel-dots', root);
    let dots = [];
    if (dotsWrap) {
      dotsWrap.innerHTML = slides.map((_, k) => `<button aria-label="Slide ${k + 1}"></button>`).join('');
      dots = Array.from(dotsWrap.children);
      dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
    }
    function go(k) {
      i = loop ? (k + n) % n : Math.max(0, Math.min(n - 1, k));
      track.style.transform = `translateX(${-100 * i}%)`;
      dots.forEach((d, j) => d.classList.toggle('on', j === i));
      if (!loop) { if (prev) prev.disabled = i === 0; if (next) next.disabled = i === n - 1; }
      restart();
    }
    function restart() { if (!autoplay) return; clearTimeout(timer); timer = setTimeout(() => go(i + 1), autoplay); }
    if (prev) prev.addEventListener('click', () => go(i - 1));
    if (next) next.addEventListener('click', () => go(i + 1));
    // swipe
    let x0 = null;
    root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    root.addEventListener('mouseenter', () => clearTimeout(timer));
    root.addEventListener('mouseleave', restart);
    go(0);
  });

  // ------------------------------------------------------------ cart
  const CART_KEY = 'tmz_cart_v1';
  const getCart = () => store.get(CART_KEY, []);
  const saveCart = (c) => { store.set(CART_KEY, c); renderCartBadges(); };
  const cartCount = (c) => c.reduce((s, x) => s + x.qty, 0);
  const cartTotal = (c) => c.reduce((s, x) => s + x.qty * x.price, 0);
  function renderCartBadges() {
    const c = getCart();
    $$('[data-cart-count]').forEach((el) => (el.textContent = cartCount(c)));
    $$('[data-cart-amount]').forEach((el) => (el.textContent = money(cartTotal(c))));
  }
  function addToCart(item) {
    const c = getCart();
    const hit = c.find((x) => x.slug === item.slug && x.size === item.size);
    if (hit) hit.qty += item.qty; else c.push(item);
    saveCart(c);
  }
  renderCartBadges();

  // ------------------------------------------------------------ qty steppers
  $$('.qty').forEach((q) => {
    const input = $('input', q);
    const min = +(input.min || 1);
    $$('button', q).forEach((b) => b.addEventListener('click', () => {
      const v = Math.max(min, (+input.value || min) + (b.dataset.step === '-' ? -1 : 1));
      input.value = v; input.dispatchEvent(new Event('change', { bubbles: true }));
    }));
  });

  // ------------------------------------------------------------ product page
  const product = $('[data-product]');
  if (product) {
    const p = JSON.parse(product.dataset.product);
    // sizes
    let size = null;
    $$('.sizes button', product).forEach((b) => b.addEventListener('click', () => {
      $$('.sizes button', product).forEach((x) => x.classList.remove('on'));
      b.classList.add('on'); size = b.dataset.size;
    }));
    const needSize = () => {
      if ($$('.sizes button', product).length && !size) { toast('Please choose a size first.'); $('.sizes', product).scrollIntoView({ behavior: 'smooth', block: 'center' }); return true; }
      return false;
    };
    const qtyInput = $('.buy-row .qty input', product);
    const add = (go) => {
      if (needSize()) return;
      addToCart({ slug: p.slug, name: p.name, price: p.price, img: p.img, url: p.url, size: size || '-', qty: +(qtyInput ? qtyInput.value : 1) || 1 });
      if (go) location.href = CFG.root + 'checkout.html';
      else toast(`${p.name}${size ? ' (' + size + ')' : ''} added to bag`);
    };
    $$('[data-add]').forEach((b) => b.addEventListener('click', () => add(false)));
    $$('[data-buy]').forEach((b) => b.addEventListener('click', () => add(true)));
    $$('[data-choose]').forEach((b) => b.addEventListener('click', () => $('.summary').scrollIntoView({ behavior: 'smooth' })));

    // order request (teamwear)
    const form = $('#order-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(form).entries());
        if (+d.quantity < 5) { toast('Minimum order is 5 pieces.'); return; }
        const lines = [
          `Hi ${CFG.brand || 'TMZ'}, I would like to place an order request.`,
          `Design: ${p.name} (${p.category})`,
          `Name: ${d.name}`, `Email: ${d.email}`, `Phone: ${d.phone}`,
          d.team ? `Team: ${d.team}` : '', `Estimated quantity: ${d.quantity}`,
          d.date ? `Estimated delivery date: ${d.date}` : '', d.notes ? `Notes: ${d.notes}` : '',
          `Link: ${location.href}`,
        ].filter(Boolean).join('\n');
        sendWA(lines, $('#order-ok'));
        form.reset();
      });
    }

    // sticky add-to-cart bar
    const bar = $('.sticky-atc');
    const summary = $('.summary');
    if (bar && summary) {
      const onS = () => {
        const r = summary.getBoundingClientRect();
        bar.classList.toggle('on', r.bottom < 0);
      };
      window.addEventListener('scroll', onS, { passive: true }); onS();
    }
  }

  // ------------------------------------------------------------ tabs
  $$('.tabs').forEach((t) => {
    const btns = $$('.tabs-nav button', t), panels = $$('.tab-panel', t);
    btns.forEach((b, k) => b.addEventListener('click', () => {
      btns.forEach((x) => x.classList.remove('on')); panels.forEach((x) => x.classList.remove('on'));
      b.classList.add('on'); panels[k].classList.add('on');
    }));
  });

  // ------------------------------------------------------------ lightbox
  // Zoomable up to 3x. The image is resized (not CSS-scaled) so the vector artwork
  // re-renders sharply at every zoom level.
  let lb, lbImg, lbZoom = 1, lbX = 0, lbY = 0, lbBase = { w: 0, h: 0 };
  const LB_MAX = 3;
  function lbLayout() {
    const W = window.innerWidth, H = window.innerHeight;
    const w = lbBase.w * lbZoom, h = lbBase.h * lbZoom;
    const mxX = Math.max(0, (w - W) / 2 + 40), mxY = Math.max(0, (h - H) / 2 + 40);
    lbX = Math.max(-mxX, Math.min(mxX, lbX)); lbY = Math.max(-mxY, Math.min(mxY, lbY));
    lbImg.style.width = w + 'px'; lbImg.style.height = h + 'px';
    lbImg.style.transform = `translate(${-w / 2 + lbX}px, ${-h / 2 + lbY}px)`;
    lb.querySelector('output').textContent = lbZoom.toFixed(1) + '×';
    lb.classList.toggle('zoomed', lbZoom > 1);
  }
  function lbSetZoom(z, cx, cy) {
    z = Math.max(1, Math.min(LB_MAX, z));
    if (cx !== undefined) { // keep the point under the pointer still
      const ox = cx - window.innerWidth / 2 - lbX, oy = cy - window.innerHeight / 2 - lbY;
      lbX -= ox * (z / lbZoom - 1); lbY -= oy * (z / lbZoom - 1);
    }
    lbZoom = z; if (z === 1) { lbX = 0; lbY = 0; }
    lbLayout();
  }
  function lbFit() {
    const nw = lbImg.naturalWidth || 600, nh = lbImg.naturalHeight || 600;
    const s = Math.min((window.innerWidth * 0.9) / nw, (window.innerHeight * 0.86) / nh);
    lbBase = { w: nw * s, h: nh * s }; lbLayout();
  }
  function openLightbox(src) {
    if (!lb) {
      lb = document.createElement('div'); lb.className = 'lightbox';
      lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Product image');
      lb.innerHTML = '<img alt="" draggable="false"><button class="lb-x" aria-label="Close">&times;</button>' +
        '<div class="lb-bar"><button data-lz="-1" aria-label="Zoom out">&minus;</button><output>1.0×</output><button data-lz="1" aria-label="Zoom in">+</button></div>' +
        '<p class="lb-hint">Scroll, pinch or click to zoom · Drag to move</p>';
      document.body.appendChild(lb);
      lbImg = lb.querySelector('img');
      lbImg.addEventListener('load', lbFit);
      lb.querySelector('.lb-x').addEventListener('click', closeLightbox);
      lb.querySelectorAll('[data-lz]').forEach((b) => b.addEventListener('click', () => lbSetZoom(lbZoom * (b.dataset.lz > 0 ? 1.4 : 1 / 1.4))));
      lb.addEventListener('click', (e) => { if (e.target === lb && lbZoom === 1) closeLightbox(); });
      lb.addEventListener('wheel', (e) => { e.preventDefault(); lbSetZoom(lbZoom * Math.exp(-e.deltaY * 0.0018), e.clientX, e.clientY); }, { passive: false });
      const pts = new Map(); let moved = false, last = null, pinch = 0;
      lbImg.addEventListener('pointerdown', (e) => { lbImg.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = false; last = [e.clientX, e.clientY]; });
      lbImg.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pts.size === 2) {
          const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          if (pinch) lbSetZoom(lbZoom * (d / pinch), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
          pinch = d; moved = true; return;
        }
        const dx = e.clientX - last[0], dy = e.clientY - last[1]; last = [e.clientX, e.clientY];
        if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
        if (lbZoom > 1) { lbX += dx; lbY += dy; lbLayout(); }
      });
      const up = (e) => {
        pts.delete(e.pointerId); if (pts.size < 2) pinch = 0;
        if (!moved && !pts.size && e.type === 'pointerup') lbSetZoom(lbZoom > 1 ? 1 : 2.5, e.clientX, e.clientY);
      };
      lbImg.addEventListener('pointerup', up); lbImg.addEventListener('pointercancel', up);
      window.addEventListener('resize', () => { if (lb.classList.contains('on')) lbFit(); });
    }
    lbZoom = 1; lbX = 0; lbY = 0;
    lbImg.src = src; lb.classList.add('on');
    if (lbImg.complete) lbFit();
  }
  function closeLightbox() { if (lb) lb.classList.remove('on'); }
  $$('.gallery .shot').forEach((s) => s.addEventListener('click', () => openLightbox($('img', s).src)));
  $$('.gallery .zoom-btn').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); openLightbox($('.gallery .shot img').src); }));

  // ------------------------------------------------------------ cart page
  const cartRoot = $('#cart-root');
  if (cartRoot) {
    const render = () => {
      const c = getCart();
      if (!c.length) {
        cartRoot.innerHTML = `<div class="empty" style="grid-column:1/-1"><p style="font-size:18px;color:#333">Your cart is currently empty.</p><a class="btn btn-dark" href="${CFG.root}shop.html">Return to shop</a></div>`;
        return;
      }
      cartRoot.innerHTML = `<div><table class="cart-table"><thead><tr><th></th><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th></th></tr></thead><tbody>${c.map((x, k) => `
        <tr><td><a href="${CFG.root + x.url}"><img class="pimg" src="${CFG.root + x.img}" alt=""></a></td>
        <td><a href="${CFG.root + x.url}">${x.name}</a>${x.size && x.size !== '-' ? `<div style="font-size:12px;color:#999">Size: ${x.size}</div>` : ''}</td>
        <td>${money(x.price)}</td>
        <td><div class="qty small" data-k="${k}"><button data-step="-">-</button><input type="number" min="1" value="${x.qty}"><button data-step="+">+</button></div></td>
        <td><b>${money(x.price * x.qty)}</b></td>
        <td><button class="rm" data-rm="${k}" aria-label="Remove">&times;</button></td></tr>`).join('')}</tbody></table></div>
        <div class="totals"><h3>Cart totals</h3><div class="row"><span>Subtotal</span><span>${money(cartTotal(c))}</span></div><div class="row"><span>Shipping</span><span>Calculated at checkout</span></div><div class="row total"><span>Total</span><b>${money(cartTotal(c))}</b></div><a class="btn btn-dark btn-block" href="${CFG.root}checkout.html">Proceed to checkout</a></div>`;
      $$('[data-rm]', cartRoot).forEach((b) => b.addEventListener('click', () => { const cc = getCart(); cc.splice(+b.dataset.rm, 1); saveCart(cc); render(); }));
      $$('.qty', cartRoot).forEach((q) => {
        const k = +q.dataset.k, input = $('input', q);
        const set = (v) => { const cc = getCart(); cc[k].qty = Math.max(1, v); saveCart(cc); render(); };
        $$('button', q).forEach((b) => b.addEventListener('click', () => set((+input.value || 1) + (b.dataset.step === '-' ? -1 : 1))));
        input.addEventListener('change', () => set(+input.value || 1));
      });
    };
    render();
  }

  // ------------------------------------------------------------ checkout
  const co = $('#checkout-form');
  if (co) {
    const review = $('#review-lines');
    const c = getCart();
    review.innerHTML = c.length
      ? c.map((x) => `<div class="line"><span>${x.name}${x.size !== '-' ? ' (' + x.size + ')' : ''} × ${x.qty}</span><b>${money(x.price * x.qty)}</b></div>`).join('') + `<div class="line"><span>Subtotal</span><b>${money(cartTotal(c))}</b></div><div class="line"><span>Shipping</span><span>To be confirmed</span></div><div class="line" style="font-size:18px"><b>Total</b><b>${money(cartTotal(c))}</b></div>`
      : `<p>Your bag is empty. <a href="${CFG.root}shop.html">Continue shopping</a></p>`;
    co.addEventListener('submit', (e) => {
      e.preventDefault();
      const cc = getCart();
      if (!cc.length) { toast('Your bag is empty.'); return; }
      const d = Object.fromEntries(new FormData(co).entries());
      const msg = [`Hi ${CFG.brand || 'TMZ'}, I would like to place an order:`, ...cc.map((x) => `• ${x.name}${x.size !== '-' ? ' (' + x.size + ')' : ''} × ${x.qty} = ${money(x.price * x.qty)}`), `Total: ${money(cartTotal(cc))}`, '', `Name: ${d.first} ${d.last}`, `Phone: ${d.phone}`, `Email: ${d.email}`, `Address: ${d.address}, ${d.postcode} ${d.city}, ${d.state}`, `Payment: ${d.payment}`, d.notes ? `Notes: ${d.notes}` : ''].filter(Boolean).join('\n');
      sendWA(msg, $('#checkout-ok'));
      saveCart([]);
    });
  }

  // ------------------------------------------------------------ generic forms (track order / account / contact)
  $$('form[data-wa]').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f).entries());
    const msg = (f.dataset.wa || '') + '\n' + Object.entries(d).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');
    const next = f.nextElementSibling;
    sendWA(msg, next && next.matches('[data-wa-ok]') ? next : null);
  }));
  $$('form[data-soon]').forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); toast(f.dataset.soon); }));

  // ------------------------------------------------------------ shop filters
  const shop = $('.shop');
  if (shop) {
    const cards = $$('.products .product-card', shop);
    const countEl = $('[data-shop-count]');
    const state = { cat: 'all', prices: new Set(), color: null, sort: 'featured' };
    const slug = (c) => String(c).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fromHash = () => {
      const h = decodeURIComponent(location.hash.slice(1));
      const a = h && $$('.shop-cats a').find((x) => x.dataset.cat !== 'all' && slug(x.dataset.cat) === h);
      state.cat = a ? a.dataset.cat : 'all';
    };
    fromHash();
    window.addEventListener('hashchange', () => { fromHash(); apply(); });
    const grid = $('.products', shop);
    function apply() {
      let visible = cards.filter((c) => {
        const cats = (c.dataset.cats || '').split('|');
        if (state.cat !== 'all' && !cats.includes(state.cat)) return false;
        const pr = +c.dataset.price || 0;
        if (state.prices.size) {
          const ok = [...state.prices].some((r) => { const [a, b] = r.split('-').map(Number); return pr >= a && pr <= b; });
          if (!ok) return false;
        }
        if (state.color && c.dataset.color !== state.color) return false;
        return true;
      });
      const sorted = visible.slice();
      if (state.sort === 'price-asc') sorted.sort((a, b) => (+a.dataset.price || 1e9) - (+b.dataset.price || 1e9));
      if (state.sort === 'price-desc') sorted.sort((a, b) => (+b.dataset.price || 0) - (+a.dataset.price || 0));
      if (state.sort === 'name') sorted.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name));
      if (state.sort === 'featured') sorted.sort((a, b) => +a.dataset.order - +b.dataset.order);
      cards.forEach((c) => (c.style.display = 'none'));
      sorted.forEach((c) => { c.style.display = ''; grid.appendChild(c); });
      if (countEl) countEl.textContent = visible.length;
      $$('.shop-cats a').forEach((a) => a.classList.toggle('on', a.dataset.cat === state.cat));
      $('.empty', shop).hidden = visible.length > 0;
    }
    $$('.shop-cats a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); state.cat = a.dataset.cat; apply(); }));
    $$('[data-price-range]').forEach((i) => i.addEventListener('change', () => { i.checked ? state.prices.add(i.value) : state.prices.delete(i.value); apply(); }));
    $$('.swatches button').forEach((b) => b.addEventListener('click', () => {
      state.color = state.color === b.dataset.color ? null : b.dataset.color;
      $$('.swatches button').forEach((x) => x.classList.toggle('on', x.dataset.color === state.color)); apply();
    }));
    const sortSel = $('[data-sort]'); if (sortSel) sortSel.addEventListener('change', () => { state.sort = sortSel.value; apply(); });
    const hide = $('[data-hide-filters]');
    if (hide) {
      const mobile = () => window.innerWidth <= 1024;
      const label = () => { hide.querySelector('span').textContent = (mobile() ? !shop.classList.contains('filters-open') : shop.classList.contains('filters-hidden')) ? 'Show Filters' : 'Hide Filters'; };
      hide.addEventListener('click', () => { shop.classList.toggle(mobile() ? 'filters-open' : 'filters-hidden'); label(); });
      window.addEventListener('resize', label); label();
    }
    $$('.widget-h').forEach((h) => h.addEventListener('click', () => h.parentElement.classList.toggle('closed')));
    const more = $('[data-more-colors]');
    if (more) more.addEventListener('click', () => { $$('.swatches button[hidden]').forEach((b) => (b.hidden = false)); more.remove(); });
    apply();
  }

  // ------------------------------------------------------------ loyalty calculator
  const calc = $('.calc');
  if (calc) {
    const range = $('input[type=range]', calc), amt = $('.amt', calc);
    const rates = [0.02, 0.025, 0.03];
    const tiers = $$('.tier', calc);
    const upd = () => {
      const v = +range.value;
      amt.textContent = 'RM' + v;
      // "Bigger orders" bonus: +RM0.50 at RM100, +RM1 at RM150, +RM1.50 at RM200
      const bonus = v >= 200 ? 1.5 : v >= 150 ? 1 : v >= 100 ? 0.5 : 0;
      tiers.forEach((t, k) => { t.querySelector('span').textContent = 'RM' + (v * rates[k] + bonus).toFixed(2); });
    };
    range.addEventListener('input', upd); upd();
  }

  // ------------------------------------------------------------ 3D viewer (loaded on first use)
  let v3d = null;
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-3d]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    let data;
    try { data = JSON.parse(b.dataset['3d']); } catch (err) { return; }
    if (!v3d) {
      v3d = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = CFG.root + 'assets/js/viewer3d.js';
        s.onload = res;
        s.onerror = () => { v3d = null; rej(new Error('viewer')); };
        document.head.appendChild(s);
      });
    }
    v3d.then(() => window.TMZ3D.open(data, CFG.root)).catch(() => toast('Could not open the 3D view. Check your connection and try again.'));
  }, true);

  // ------------------------------------------------------------ year
  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
})();

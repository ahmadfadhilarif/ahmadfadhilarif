/*
 * TMZ 3D viewer
 * ---------------------------------------------------------------------------
 * Shows a product in an interactive WebGL popup, "ghost mannequin" style: only
 * the garment is visible, shaped as if worn by an athletic body.
 *  - The garment is built from the product's own front/back artwork: the flat
 *    silhouette is inflated into a 3D shell, then shaped to a fit build (V-taper
 *    waist, chest and shoulder-blade contours, snug sleeves / legs). The artwork
 *    is wrapped on at up to 4096 px with a woven-fabric surface and soft sheen.
 *  - Front and back panels meet on the real outline of the artwork, closed by a
 *    thin seam in the local fabric colour, so there are no gaps.
 *  - Drag rotates freely about any axis (arcball), Shift-drag / two-finger twist
 *    rolls about the view axis, wheel / pinch zooms 1x-3x toward the pointer,
 *    right-drag / two-finger drag pans.
 * Loaded on demand by main.js; three.js is fetched from a pinned CDN build.
 * The META table (garment landmarks per cut) is injected by src/build.js.
 */
(function () {
  'use strict';
  var META = /*__META__*/ {"tee":{"type":"top","nL":[250,104],"sL":[166,126],"aL":[194,224],"hL":[196,492],"hemY":499,"sleeve":{"top":[[166,126],[84,224]],"bot":[[194,224],[134,274]]},"vb":[66,78,468,468]},"long":{"type":"top","nL":[252,100],"sL":[170,120],"aL":[196,236],"hL":[198,496],"hemY":502,"sleeve":{"top":[[170,120],[80,456]],"bot":[[196,236],[128,466]]},"vb":[46,14,508,508]},"wide":{"type":"top","nL":[262,176],"sL":[204,190],"aL":[214,270],"hL":[218,440],"hemY":444,"sleeve":{"top":[[204,190],[36,236]],"bot":[[214,270],[40,290]]},"vb":[24,36,552,552]},"vest":{"type":"top","nL":[258,96],"sL":[220,98],"aL":[174,252],"hL":[180,496],"hemY":503,"sleeve":null,"armCtl":[214,214],"vb":[75,78,450,450]},"pants":{"type":"bottom","waistY":88,"bandY":116,"hipY":200,"crotch":[300,270],"ankleY":568,"ankleL":[[212,556],[270,556]],"waist":[200,400],"vb":[120,70,360,516]},"_logo":[413,715,1734,1131]};
  var THREE_SRC = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
  var MAX_ZOOM = 3;
  var GRID = 200; // garment analysis resolution (columns)

  // ------------------------------------------------------------------ helpers
  var promises = {};
  function loadScript(src) {
    if (window.THREE) return Promise.resolve();
    if (!promises[src]) {
      promises[src] = new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = src; s.async = true; s.crossOrigin = 'anonymous';
        s.onload = res;
        s.onerror = function () { promises[src] = null; rej(new Error('Could not load the 3D engine.')); };
        document.head.appendChild(s);
      });
    }
    return promises[src];
  }
  function loadImage(src) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error('Could not load the product artwork.')); };
      img.src = src;
    });
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } return null; }
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var g1 = function (d, s) { return Math.exp(-(d * d) / (2 * s * s)); };
  var mid = function (p, q) { return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
  var sub = function (p, q) { return [p[0] - q[0], p[1] - q[1]]; };
  var add = function (p, q, s) { s = s === undefined ? 1 : s; return [p[0] + q[0] * s, p[1] + q[1] * s]; };
  var dot = function (p, q) { return p[0] * q[0] + p[1] * q[1]; };
  var len = function (v) { return Math.hypot(v[0], v[1]); };
  var norm = function (v) { var l = len(v) || 1; return [v[0] / l, v[1] / l]; };
  var mx = function (p) { return [600 - p[0], p[1]]; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  // piecewise-smooth curve through [y, value] knots
  function curve(knots, y) {
    if (y <= knots[0][0]) return knots[0][1];
    for (var i = 1; i < knots.length; i++) {
      if (y <= knots[i][0]) { var t = (y - knots[i - 1][0]) / (knots[i][0] - knots[i - 1][0]); t = t * t * (3 - 2 * t); return lerp(knots[i - 1][1], knots[i][1], t); }
    }
    return knots[knots.length - 1][1];
  }

  // ------------------------------------------------------------------ artwork rasterising
  /*
   * Fetches the SVG, removes the painted inside-of-neck layer (so the neck is a real
   * opening) and rasterises it at texture resolution, so the print stays sharp up close.
   */
  function rasterize(url, vb, size, mode) {
    var W = vb[2] >= vb[3] ? size : Math.round((size * vb[2]) / vb[3]);
    var H = vb[2] >= vb[3] ? Math.round((size * vb[3]) / vb[2]) : size;
    var draw = function (img) {
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      c.getContext('2d').drawImage(img, 0, 0, W, H);
      return c;
    };
    return fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('fetch'); return r.text(); })
      .then(function (src) {
        // 3D uses real lighting and real openings: drop the flat drawing's outline,
        // baked shading, painted inside-of-neck and the back collar seen through it
        var txt = src.replace(/<path class="ol"[^>]*\/>/g, '').replace(/<rect class="fs"[^>]*\/>/g, '');
        if (mode === 'front') txt = txt.replace(/<g class="nk-in">[\s\S]*?<\/g>/, '').replace(/<path class="bt"[^>]*\/>/g, '');
        return svgCanvas(txt, W, H).then(function (c) { return { canvas: c, svg: src }; });
      })
      .catch(function () { return loadImage(url).then(function (img) { return { canvas: draw(img), svg: '' }; }); });
  }
  function svgCanvas(txt, W, H) {
    txt = txt.replace(/(<svg[^>]*?)width="\d+" height="\d+"/, '$1width="' + W + '" height="' + H + '"');
    var blobUrl = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml' }));
    return loadImage(blobUrl).then(function (img) {
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      c.getContext('2d').drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(blobUrl);
      return c;
    });
  }
  // extend edge colours outward so texture filtering never pulls in transparent black
  function bleed(c) {
    var W = c.width, H = c.height, k = 4;
    var sm = document.createElement('canvas'); sm.width = Math.ceil(W / k); sm.height = Math.ceil(H / k);
    var sx = sm.getContext('2d'); sx.drawImage(c, 0, 0, sm.width, sm.height);
    var tmp = document.createElement('canvas'); tmp.width = sm.width; tmp.height = sm.height;
    var tx = tmp.getContext('2d');
    for (var r = 1; r <= 7; r++) {
      tx.clearRect(0, 0, tmp.width, tmp.height); tx.drawImage(sm, 0, 0);
      sx.globalCompositeOperation = 'destination-over';
      [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]].forEach(function (d) { sx.drawImage(tmp, d[0], d[1]); });
      sx.globalCompositeOperation = 'source-over';
    }
    var cx = c.getContext('2d');
    cx.globalCompositeOperation = 'destination-over'; cx.drawImage(sm, 0, 0, W, H); cx.globalCompositeOperation = 'source-over';
    return c;
  }
  /*
   * Inside of the garment: black fabric, the collar / waistband continuing on the inside,
   * and the TMZ logo printed at the top centre of the inside back (drawn mirrored so it
   * reads correctly when you look in from the front).
   */
  function insideCanvas(meta, svgF, svgB, which, trim, size) {
    var vb = meta.vb, W = vb[2] >= vb[3] ? size : Math.round((size * vb[2]) / vb[3]), H = vb[2] >= vb[3] ? Math.round((size * vb[3]) / vb[2]) : size;
    var parts = ['<rect x="' + vb[0] + '" y="' + vb[1] + '" width="' + vb[2] + '" height="' + vb[3] + '" fill="#0d0d0e"/>'];
    var defs = '';
    if (meta.type === 'bottom') {
      var t = trim || '#151515';
      parts.push('<rect x="190" y="84" width="220" height="35" fill="' + t + '"/><path d="M190 101.5H410" stroke="#000" stroke-opacity=".22" stroke-width="35" stroke-dasharray=".55 .85"/>');
      parts.push('<path d="M190 122H410" stroke="#fff" stroke-opacity=".25" stroke-width=".6" stroke-dasharray="2 1.3"/>');
    } else {
      var cl = ((which === 'front' ? svgF : svgB).match(/<g class="cl">[\s\S]*?<\/g>/) || [''])[0];
      parts.push(cl);
    }
    if (which === 'back') {
      var lg = (svgB.match(/<path id="[^"]+lg"[^>]*\/>/) || [''])[0], id = (lg.match(/id="([^"]+)"/) || [])[1];
      if (id) {
        defs = lg;
        var L = META._logo, w = 26, sc = w / L[2], h = L[3] * sc;
        var cy = meta.type === 'bottom' ? 146 : meta.nL[1] + 42;
        parts.push('<g transform="translate(600 0) scale(-1 1)"><use href="#' + id + '" transform="translate(' + (300 - w / 2 - L[0] * sc).toFixed(2) + ' ' + (cy - h / 2 - L[1] * sc).toFixed(2) + ') scale(' + sc.toFixed(5) + ')" fill="#d6d6d6"/>' +
          '<text x="300" y="' + (cy + h / 2 + 8).toFixed(1) + '" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="4.4" letter-spacing="1.4" text-anchor="middle" fill="#a8a8a8">PREMIUM TEAMWEAR</text></g>');
      }
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.join(' ') + '" width="' + W + '" height="' + H + '"><defs>' + defs + '</defs>' + parts.join('') + '</svg>';
    return svgCanvas(svg, W, H).then(bleed);
  }

  // ------------------------------------------------------------------ garment analysis
  /*
   * Rasterises the front artwork's alpha into a grid, opens the neck / hem /
   * cuffs (so the shell stays full-depth there), then inflates the silhouette:
   * every cell gets a height from its distance to the edge and the radius of
   * the largest inscribed disc covering it, giving round sleeves and an oval body.
   */
  function analyse(meta, frontCanvas, backCanvas) {
    if (frontCanvas.canvas) { frontCanvas = frontCanvas.canvas; backCanvas = backCanvas.canvas; }
    var vb = meta.vb, cell = vb[2] / GRID, GX = GRID, GY = Math.round(vb[3] / cell), N = GX * GY;
    var cv = document.createElement('canvas'); cv.width = GX; cv.height = GY;
    var cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(frontCanvas, 0, 0, GX, GY);
    var a = cx.getImageData(0, 0, GX, GY).data;
    cx.clearRect(0, 0, GX, GY);
    cx.save(); cx.translate(GX, 0); cx.scale(-1, 1); cx.drawImage(backCanvas, 0, 0, GX, GY); cx.restore();
    var bk = cx.getImageData(0, 0, GX, GY).data;
    // union of front and (mirrored) back coverage: one outline shared by both panels
    var mask = new Uint8Array(N), aug = new Uint8Array(N), cov = new Float32Array(N), covF = new Float32Array(N), covB = new Float32Array(N);
    for (var i = 0; i < N; i++) { covF[i] = a[i * 4 + 3] / 255; covB[i] = bk[i * 4 + 3] / 255; cov[i] = Math.max(covF[i], covB[i]); mask[i] = cov[i] > 0.5 ? 1 : 0; }
    // neck region: each panel follows its own neckline there (front V / scoop, higher back neck)
    var neck = new Uint8Array(N);
    if (meta.type !== 'bottom') {
      cx.clearRect(0, 0, GX, GY); cx.fillStyle = '#000';
      var nx0 = (meta.nL[0] + 6 - vb[0]) / cell, nx1 = (594 - meta.nL[0] - vb[0]) / cell;
      cx.fillRect(nx0, 0, nx1 - nx0, (meta.nL[1] + 104 - vb[1]) / cell);
      var nd = cx.getImageData(0, 0, GX, GY).data;
      for (i = 0; i < N; i++) neck[i] = nd[i * 4 + 3] > 100 ? 1 : 0;
    }

    // open edges
    cx.clearRect(0, 0, GX, GY); cx.fillStyle = '#000';
    openPolys(meta).forEach(function (poly) {
      cx.beginPath();
      poly.forEach(function (p, k) { var gx = (p[0] - vb[0]) / cell, gy = (p[1] - vb[1]) / cell; if (k) cx.lineTo(gx, gy); else cx.moveTo(gx, gy); });
      cx.closePath(); cx.fill();
    });
    var o = cx.getImageData(0, 0, GX, GY).data;
    for (i = 0; i < N; i++) aug[i] = mask[i] || o[i * 4 + 3] > 100 ? 1 : 0;

    // chamfer distance transform (grid units); cells beyond the grid count as inside
    var INF = 1e9, d = new Float32Array(N), S2 = Math.SQRT2;
    for (i = 0; i < N; i++) d[i] = aug[i] ? INF : 0;
    var x, y, j, v;
    for (y = 0; y < GY; y++) for (x = 0; x < GX; x++) {
      j = y * GX + x; if (!d[j]) continue; v = d[j];
      if (x > 0) v = Math.min(v, d[j - 1] + 1);
      if (y > 0) { v = Math.min(v, d[j - GX] + 1); if (x > 0) v = Math.min(v, d[j - GX - 1] + S2); if (x < GX - 1) v = Math.min(v, d[j - GX + 1] + S2); }
      d[j] = v;
    }
    for (y = GY - 1; y >= 0; y--) for (x = GX - 1; x >= 0; x--) {
      j = y * GX + x; if (!d[j]) continue; v = d[j];
      if (x < GX - 1) v = Math.min(v, d[j + 1] + 1);
      if (y < GY - 1) { v = Math.min(v, d[j + GX] + 1); if (x < GX - 1) v = Math.min(v, d[j + GX + 1] + S2); if (x > 0) v = Math.min(v, d[j + GX - 1] + S2); }
      d[j] = v;
    }
    for (i = 0; i < N; i++) if (d[i] >= INF) d[i] = GX;

    // largest inscribed disc covering each cell (splat discs from ridge cells)
    var R = new Float32Array(d);
    for (y = 0; y < GY; y++) for (x = 0; x < GX; x++) {
      j = y * GX + x; var r = d[j]; if (r < 1.5) continue;
      if ((x > 0 && d[j - 1] > r) || (x < GX - 1 && d[j + 1] > r) || (y > 0 && d[j - GX] > r) || (y < GY - 1 && d[j + GX] > r)) continue;
      var ri = Math.ceil(r), r2 = r * r;
      for (var yy = Math.max(0, y - ri); yy <= Math.min(GY - 1, y + ri); yy++) {
        var dy = yy - y;
        for (var xx = Math.max(0, x - ri); xx <= Math.min(GX - 1, x + ri); xx++) {
          var dx = xx - x; if (dx * dx + dy * dy > r2) continue;
          var q = yy * GX + xx; if (aug[q] && R[q] < r) R[q] = r;
        }
      }
    }

    // inflate: circle profile for narrow parts, flatter oval for the body
    var h = new Float32Array(N);
    for (i = 0; i < N; i++) {
      if (!aug[i]) continue;
      var Rp = R[i] * cell, dp = Math.max(0, d[i] - 0.75) * cell;
      dp = Math.min(dp, Rp);
      var k = Rp <= 34 ? 1 : Math.pow(34 / Rp, 0.42);
      var e = clamp(dp / (2.6 * cell), 0, 1); e = e * e * (3 - 2 * e);
      h[i] = k * Math.sqrt(Math.max(0, 2 * Rp * dp - dp * dp)) * (0.25 + 0.75 * e) * (dp > 0 ? 1 : 0);
    }
    for (var pass = 0; pass < 2; pass++) {
      var h2 = new Float32Array(N);
      for (y = 0; y < GY; y++) for (x = 0; x < GX; x++) {
        j = y * GX + x; if (!aug[j]) continue;
        var sum = 0, cnt = 0;
        for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
          var X2 = x + ox, Y2 = y + oy; if (X2 < 0 || Y2 < 0 || X2 >= GX || Y2 >= GY) continue;
          sum += h[Y2 * GX + X2]; cnt++;
        }
        h2[j] = sum / cnt;
      }
      h = h2;
    }
    return { vb: vb, cell: cell, GX: GX, GY: GY, mask: mask, aug: aug, cov: cov, covF: covF, covB: covB, neck: neck, h: h, rgbF: a, rgbB: bk };
  }

  function openPolys(meta) {
    var P = [];
    if (meta.type === 'bottom') {
      var w0 = meta.waist[0], w1 = meta.waist[1], wy = meta.waistY;
      P.push([[w0 - 4, wy - 220], [w1 + 4, wy - 220], [w1 + 4, wy + 10], [w0 - 4, wy + 10]]);
      var a0 = meta.ankleL[0], a1 = meta.ankleL[1], ay = meta.ankleY;
      [[a0, a1], [mx(a1), mx(a0)]].forEach(function (pr) {
        P.push([[pr[0][0] - 2, pr[0][1] - 6], [pr[1][0] + 2, pr[1][1] - 6], [pr[1][0] + 2, ay + 220], [pr[0][0] - 2, ay + 220]]);
      });
      return P;
    }
    var nL = meta.nL, hL = meta.hL;
    P.push([[hL[0] - 4, hL[1] - 30], [604 - hL[0], hL[1] - 30], [604 - hL[0], meta.hemY + 220], [hL[0] - 4, meta.hemY + 220]]);
    P.push([[nL[0] + 6, nL[1] - 220], [594 - nL[0], nL[1] - 220], [594 - nL[0], nL[1] + 104], [nL[0] + 6, nL[1] + 104]]);
    if (!meta.sleeve && meta.armCtl) { // singlet: armholes are openings, not seams
      var bz = function (t) { var u = 1 - t, C = meta.armCtl; return [u * u * meta.sL[0] + 2 * u * t * C[0] + t * t * meta.aL[0] - 3, u * u * meta.sL[1] + 2 * u * t * C[1] + t * t * meta.aL[1]]; };
      var arm = [[meta.sL[0] - 3, meta.sL[1] - 60]].concat([0, 0.2, 0.4, 0.6, 0.8, 0.94].map(bz)).concat([[meta.aL[0] - 90, meta.aL[1] - 20], [meta.sL[0] - 160, meta.sL[1] - 60]]);
      P.push(arm, arm.map(mx));
    }
    if (meta.sleeve) {
      var s1 = meta.sleeve.top[1], b1 = meta.sleeve.bot[1];
      var dir = norm(sub(mid(s1, b1), mid(meta.sleeve.top[0], meta.sleeve.bot[0])));
      P.push([s1, b1, add(b1, dir, 220), add(s1, dir, 220)]);
      P.push([mx(s1), mx(b1), mx(add(b1, dir, 220)), mx(add(s1, dir, 220))]);
    }
    return P;
  }

  // ------------------------------------------------------------------ athletic body shaping
  /*
   * Returns warp(x, y) -> [x', y'] (V-taper, snug sleeves / legs) and depth(x, y, side)
   * -> multiplier for the shell height (chest, shoulder blades, biceps, glutes, calves).
   * Works in the artwork's flat coordinates; UVs are untouched, so the print follows.
   */
  function bodyShape(meta, female) {
    if (meta.type === 'bottom') return legShape(meta, female);
    var s = (300 - meta.aL[0]) / 106, nL = meta.nL, sL = meta.sL, aL = meta.aL, hL = meta.hL;
    var yA = aL[1], yH = meta.hemY, H = yH - yA;
    function edge(y) { // torso edge x (left side) of the flat artwork
      if (y <= sL[1]) return lerp(nL[0], sL[0], clamp((y - nL[1]) / Math.max(1, sL[1] - nL[1]), 0, 1));
      if (y <= yA) return lerp(sL[0], aL[0], (y - sL[1]) / Math.max(1, yA - sL[1]));
      return lerp(aL[0], hL[0], clamp((y - yA) / Math.max(1, hL[1] - yA), 0, 1));
    }
    var taper = female
      ? [[yA - 30 * s, 0.97], [yA + 0.15 * H, 0.92], [yA + 0.55 * H, 0.79], [yH, 0.93]]
      : [[yA, 1], [yA + 0.3 * H, 0.93], [yA + 0.62 * H, 0.85], [yH, 0.88]];
    var sl = null;
    if (meta.sleeve) {
      var A0 = mid(meta.sleeve.top[0], meta.sleeve.bot[0]), A1 = mid(meta.sleeve.top[1], meta.sleeve.bot[1]);
      var dir = norm(sub(A1, A0));
      sl = { A0: A0, dir: dir, n: [dir[1], -dir[0]], L: len(sub(A1, A0)),
        w0: len(sub(meta.sleeve.top[0], meta.sleeve.bot[0])) / 2, w1: len(sub(meta.sleeve.top[1], meta.sleeve.bot[1])) / 2 };
    }
    function sleeveCoords(x, y) { // left-side sleeve coordinates for a point (mirrored for the right)
      if (!sl) return null;
      var px = x < 300 ? x : 600 - x, rel = [px - sl.A0[0], y - sl.A0[1]];
      var t = dot(rel, sl.dir) / sl.L, sp = dot(rel, sl.n), hw = lerp(sl.w0, sl.w1, clamp(t, 0, 1)) * 0.9;
      var w = smooth(-0.04, 0.14, t) * (1 - smooth(1.15, 1.5, Math.abs(sp) / Math.max(hw, 1)));
      return { t: t, sp: sp, w: w, px: px };
    }
    function warp(x, y) {
      var f = y <= yA ? taper[0][1] : curve(taper, y);
      var sc = sleeveCoords(x, y), X = x;
      if (sc && sc.w > 0) { // snug sleeve: pull towards the sleeve axis
        var k = 1 - 0.17 * sc.w;
        var lx = sl.A0[0] + sl.dir[0] * sc.t * sl.L + sl.n[0] * sc.sp * k;
        X = x < 300 ? lx : 600 - lx;
        y = sl.A0[1] + sl.dir[1] * sc.t * sl.L + sl.n[1] * sc.sp * k;
      }
      var e = 300 - edge(y), dx = X - 300;
      if (Math.abs(dx) <= e) return [300 + dx * f, y];
      return [X - Math.sign(dx) * e * (1 - f), y];
    }
    function depth(x, y, side) {
      var sc = sleeveCoords(x, y), ws = sc ? sc.w : 0, wt = 1 - ws;
      var e = Math.max(1, 300 - edge(y)), u = (x - 300) / e, au = Math.abs(u);
      var f = y <= yA ? taper[0][1] : curve(taper, y);
      var m = Math.pow(f, 0.6);
      if (side > 0) {
        if (female) {
          m *= 1 + 0.3 * g1(au - 0.4, 0.21) * g1(y - (yA + 16 * s), 26 * s) - 0.04 * g1(y - (yA + 0.5 * H), 0.2 * H) * g1(u, 0.6);
        } else {
          m *= 1 + 0.15 * g1(au - 0.45, 0.27) * g1(y - (yA - 8 * s), 34 * s)
                 - 0.05 * g1(u, 0.06) * g1(y - (yA - 6 * s), 46 * s)
                 - 0.06 * g1(y - (yA + 0.45 * H), 0.25 * H) * g1(u, 0.7);
        }
      } else {
        m *= 1 + (female ? 0.06 : 0.11) * g1(au - 0.42, 0.24) * g1(y - (yA - 14 * s), 40 * s)
               - 0.05 * g1(u, 0.05) * g1(y - (yA + 0.2 * H), 0.45 * H)
               - (female ? 0.07 : 0.04) * g1(y - (yA + 0.58 * H), 0.2 * H);
      }
      var mSleeve = 0.86 * (1 + (side > 0 ? 0.14 : 0.1) * g1((sc ? sc.t : 0) - 0.33, 0.16));
      return wt * m + ws * mSleeve;
    }
    return { warp: warp, depth: depth };
  }

  function legShape(meta, female) {
    var Ak = mid(meta.ankleL[0], meta.ankleL[1]), Hj = [250, 236];
    var dir = norm(sub(Ak, Hj)), n = [dir[1], -dir[0]], L = len(sub(Ak, Hj));
    function legCoords(x, y) {
      var px = x < 300 ? x : 600 - x, rel = [px - Hj[0], y - Hj[1]];
      return { t: dot(rel, dir) / L, sp: dot(rel, n), w: smooth(236, 300, y), px: px };
    }
    function warp(x, y) {
      var lc = legCoords(x, y), k = 1 - 0.13 * lc.w;
      var lx = Hj[0] + dir[0] * lc.t * L + n[0] * lc.sp * k, ly = Hj[1] + dir[1] * lc.t * L + n[1] * lc.sp * k;
      var X = lc.w > 0 ? (x < 300 ? lx : 600 - lx) : x, Y = lc.w > 0 ? ly : y;
      if (female) X = 300 + (X - 300) * (1 + 0.035 * g1(Y - 210, 50));
      return [X, Y];
    }
    function depth(x, y, side) {
      var lc = legCoords(x, y), t = lc.t, wl = lc.w, u = (x - 300) / 114, au = Math.abs(u);
      var m = 1 - 0.12 * wl;
      if (side > 0) m *= 1 + wl * (0.14 * g1(t - 0.28, 0.13) + 0.03 * g1(t - 0.53, 0.04));
      else m *= 1 + (1 - wl) * (female ? 0.28 : 0.2) * g1(au - 0.45, 0.3) * g1(y - 215, 40) + wl * (0.06 * g1(t - 0.25, 0.12) + 0.16 * g1(t - 0.68, 0.1));
      return m;
    }
    return { warp: warp, depth: depth };
  }

  // ------------------------------------------------------------------ garment geometry (flat units; converted to world at the end)
  /*
   * Meshes one panel with marching squares on the shared outline: interior grid points
   * carry the shell height, and the outline points are interpolated on the cell edges.
   * Along seams the outline sits on the mid-plane (z = 0) and is shared exactly by the
   * front and back panels, so they meet edge to edge. Along open edges (neck, hem,
   * cuffs, waist, ankles) the outline keeps its height, leaving a real opening.
   */
  function panelGeometry(G, shape, sign) {
    var GX = G.GX, GY = G.GY, pos = [], uv = [], idx = [];
    var own = sign > 0 ? G.covF : G.covB, cov = new Float32Array(GX * GY);
    for (var c0 = 0; c0 < cov.length; c0++) cov[c0] = G.neck[c0] ? own[c0] : G.cov[c0];
    var vid = new Int32Array(GX * GY).fill(-1), eid = {};
    var fx = function (gi) { return G.vb[0] + (gi + 0.5) * G.cell; }, fy = function (gj) { return G.vb[1] + (gj + 0.5) * G.cell; };
    var N = GX * GY, Z = new Float32Array(N), WX = new Float32Array(N), WY = new Float32Array(N);
    for (var n0 = 0; n0 < N; n0++) {
      var i0 = n0 % GX, j0 = (n0 - i0) / GX, hv = G.h[n0];
      Z[n0] = hv > 0 && cov[n0] > 0.5 ? hv * shape.depth(fx(i0), fy(j0), sign) : 0;
      var w0 = shape.warp(fx(i0), fy(j0)); WX[n0] = w0[0]; WY[n0] = w0[1];
    }
    // Texture coordinates spread by surface distance near the outline, so the print wraps
    // round the sides like fabric instead of streaking (rows -> u, columns -> v).
    var TU = new Float32Array(N), TV = new Float32Array(N);
    for (n0 = 0; n0 < N; n0++) { TU[n0] = fx(n0 % GX); TV[n0] = fy((n0 - (n0 % GX)) / GX); }
    function gradAt(n) {
      var i = n % GX, j = (n - i) / GX;
      return [cov[j * GX + Math.min(GX - 1, i + 1)] - cov[j * GX + Math.max(0, i - 1)], cov[Math.min(GY - 1, j + 1) * GX + i] - cov[Math.max(0, j - 1) * GX + i]];
    }
    function spread(count, len_, at, coordArr, flatAt, posAt, axis) {
      for (var line = 0; line < count; line++) {
        var k = 0;
        while (k < len_) {
          while (k < len_ && cov[at(line, k)] <= 0.5) k++;
          var a = k; while (k < len_ && cov[at(line, k)] > 0.5) k++;
          var b = k - 1; if (b - a < 3) continue;
          var E = Math.min(9, Math.floor((b - a) / 2));
          [[a, 1, a - 1], [b, -1, b + 1]].forEach(function (side) {
            var s0 = side[0], dirn = side[1], outK = side[2];
            var nIn = at(line, s0), nOut = outK >= 0 && outK < len_ ? at(line, outK) : -1;
            if (nOut >= 0 && G.aug[nOut]) return; // open edge (hem, cuff, neck): no seam to wrap
            var gg = gradAt(nIn), wdir = Math.abs(gg[axis]) / (Math.abs(gg[0]) + Math.abs(gg[1]) + 1e-6);
            wdir = smooth(0.55, 0.85, wdir); // rows handle upright edges, columns handle flat ones
            if (wdir <= 0) return;
            var t = nOut < 0 ? 0.5 : clamp((0.5 - cov[nOut]) / ((cov[nIn] - cov[nOut]) || 1e-6), 0, 1);
            var bP = posAt(line, s0 - dirn * (1 - t)), bF = flatAt(s0 - dirn * (1 - t));
            var arc = [], acc = 0, prev = bP;
            for (var e = 0; e <= E; e++) {
              var nn = at(line, s0 + dirn * e), P = [posAt(line, s0 + dirn * e)[0], Z[nn]];
              acc += Math.hypot(P[0] - prev[0], P[1] - prev[1]); prev = P; arc.push(acc);
            }
            var target = Math.abs(flatAt(s0 + dirn * E) - bF), alpha = target / (arc[E] || 1);
            for (e = 0; e < E; e++) { var nE = at(line, s0 + dirn * e); coordArr[nE] = lerp(coordArr[nE], bF + dirn * arc[e] * alpha, wdir); }
          });
        }
      }
    }
    var sampleRow = function (arr, j, fi) { var i0 = clamp(Math.floor(fi), 0, GX - 1), i1 = clamp(i0 + 1, 0, GX - 1), t = clamp(fi - i0, 0, 1); return [lerp(arr[j * GX + i0], arr[j * GX + i1], t) + (fi < 0 ? fi : fi > GX - 1 ? fi - GX + 1 : 0) * G.cell, 0]; };
    var sampleCol = function (arr, i, fj) { var j0 = clamp(Math.floor(fj), 0, GY - 1), j1 = clamp(j0 + 1, 0, GY - 1), t = clamp(fj - j0, 0, 1); return [lerp(arr[j0 * GX + i], arr[j1 * GX + i], t) + (fj < 0 ? fj : fj > GY - 1 ? fj - GY + 1 : 0) * G.cell, 0]; };
    spread(GY, GX, function (j, i) { return j * GX + i; }, TU, fx, function (j, fi) { return sampleRow(WX, j, fi); }, 0);
    spread(GX, GY, function (i, j) { return j * GX + i; }, TV, fy, function (i, fj) { return sampleCol(WY, i, fj); }, 1);
    (function smoothWrap() {
      var K = [1, 3, 5, 3, 1];
      [[TU, function (n) { return fx(n % GX); }, GX], [TV, function (n) { return fy((n - (n % GX)) / GX); }, 1]].forEach(function (cfg) {
        var arr = cfg[0], base = cfg[1], step = cfg[2], D = new Float32Array(N);
        for (var n = 0; n < N; n++) D[n] = arr[n] - base(n);
        for (n = 0; n < N; n++) {
          if (cov[n] <= 0.5 || !D[n]) continue;
          var sum = 0, wsum = 0;
          for (var k = -2; k <= 2; k++) {
            var m = n + k * step;
            if (m < 0 || m >= N || cov[m] <= 0.5) continue;
            if (step === 1 && Math.floor(m / GX) !== Math.floor(n / GX)) continue;
            sum += D[m] * K[k + 2]; wsum += K[k + 2];
          }
          arr[n] = base(n) + sum / wsum;
        }
      });
    })();
    function push(x, y, z, tu, tv) {
      var w = shape.warp(x, y);
      pos.push((w[0] - 300) / 100, -w[1] / 100, (sign * z) / 100);
      var u = (tu - G.vb[0]) / G.vb[2];
      uv.push(sign > 0 ? u : 1 - u, 1 - (tv - G.vb[1]) / G.vb[3]);
      return pos.length / 3 - 1;
    }
    function zAt(n) { return Z[n]; }
    var seamV = []; // outline points on seams + their outward (horizontal) direction
    function grad(n) {
      var i = n % GX, j = (n - i) / GX;
      return [cov[j * GX + Math.min(GX - 1, i + 1)] - cov[j * GX + Math.max(0, i - 1)], cov[Math.min(GY - 1, j + 1) * GX + i] - cov[Math.max(0, j - 1) * GX + i]];
    }
    function corner(n) {
      if (vid[n] < 0) { var i = n % GX, j = (n - i) / GX; vid[n] = push(fx(i), fy(j), zAt(n), TU[n], TV[n]); }
      return vid[n];
    }
    function edge(n0, n1) {
      var k = n0 < n1 ? n0 + '_' + n1 : n1 + '_' + n0;
      if (eid[k] !== undefined) return eid[k];
      var v0 = cov[n0], v1 = cov[n1], t = clamp((0.5 - v0) / ((v1 - v0) || 1e-6), 0, 1);
      var i0 = n0 % GX, j0 = (n0 - i0) / GX, i1 = n1 % GX, j1 = (n1 - i1) / GX;
      var gi = i0 + (i1 - i0) * t, gj = j0 + (j1 - j0) * t;
      var inside = v0 > 0.5 ? n0 : n1, outside = inside === n0 ? n1 : n0;
      var z = G.aug[outside] ? lerp(G.h[n0] > 0 ? G.h[n0] * shape.depth(fx(i0), fy(j0), sign) : 0, G.h[n1] > 0 ? G.h[n1] * shape.depth(fx(i1), fy(j1), sign) : 0, t) : 0; // open edge keeps depth, seam closes
      eid[k] = push(fx(gi), fy(gj), z, G.aug[outside] ? lerp(TU[n0], TU[n1], t) : fx(gi), G.aug[outside] ? lerp(TV[n0], TV[n1], t) : fy(gj));
      if (!G.aug[outside]) {
        var g0 = grad(n0), g1_ = grad(n1), gx = -lerp(g0[0], g1_[0], t), gy = -lerp(g0[1], g1_[1], t), gl = Math.hypot(gx, gy) || 1;
        seamV.push(eid[k], gx / gl, -gy / gl);
      }
      return eid[k];
    }
    for (var j = 0; j < GY - 1; j++) for (var i = 0; i < GX - 1; i++) {
      var n = j * GX + i, C = [n, n + 1, n + GX + 1, n + GX];
      var ins = C.map(function (c) { return cov[c] > 0.5; });
      if (!ins[0] && !ins[1] && !ins[2] && !ins[3]) continue;
      var poly = [];
      for (var k = 0; k < 4; k++) {
        var c = C[k], nx = C[(k + 1) % 4];
        if (ins[k]) poly.push(corner(c));
        if (ins[k] !== ins[(k + 1) % 4]) poly.push(edge(c, nx));
      }
      for (var q = 1; q < poly.length - 1; q++) {
        // corners run TL→TR→BR→BL (clockwise seen from +z), so reverse for outward-facing fronts
        if (sign > 0) idx.push(poly[0], poly[q + 1], poly[q]); else idx.push(poly[0], poly[q], poly[q + 1]);
      }
    }
    return { pos: new Float32Array(pos), uv: new Float32Array(uv), idx: idx, seamV: seamV };
  }

  // marching squares on the artwork coverage: the real seam lines (open edges excluded)
  function seamLines(G) {
    var GX = G.GX, GY = G.GY, cov = G.cov, segs = [];
    var open = function (n) { return G.aug[n] && !G.mask[n]; };
    var ip = function (i0, j0, v0, i1, j1, v1) { var t = (0.5 - v0) / ((v1 - v0) || 1e-6); return [i0 + (i1 - i0) * t, j0 + (j1 - j0) * t]; };
    for (var j = 0; j < GY - 1; j++) for (var i = 0; i < GX - 1; i++) {
      var A = j * GX + i, B = A + 1, C = A + GX, D = C + 1;
      if (open(A) || open(B) || open(C) || open(D)) continue;
      var va = cov[A], vb = cov[B], vc = cov[C], vd = cov[D];
      var code = (va > 0.5 ? 8 : 0) | (vb > 0.5 ? 4 : 0) | (vd > 0.5 ? 2 : 0) | (vc > 0.5 ? 1 : 0);
      if (code === 0 || code === 15) continue;
      var T = function () { return ip(i, j, va, i + 1, j, vb); }, Rr = function () { return ip(i + 1, j, vb, i + 1, j + 1, vd); };
      var Bt = function () { return ip(i, j + 1, vc, i + 1, j + 1, vd); }, Lf = function () { return ip(i, j, va, i, j + 1, vc); };
      switch (code) {
        case 1: case 14: segs.push([Lf(), Bt()]); break;
        case 2: case 13: segs.push([Bt(), Rr()]); break;
        case 3: case 12: segs.push([Lf(), Rr()]); break;
        case 4: case 11: segs.push([T(), Rr()]); break;
        case 6: case 9: segs.push([T(), Bt()]); break;
        case 7: case 8: segs.push([Lf(), T()]); break;
        case 5: segs.push([Lf(), T()], [Bt(), Rr()]); break;
        case 10: segs.push([T(), Rr()], [Lf(), Bt()]); break;
      }
    }
    // chain segments into polylines
    var key = function (p) { return p[0].toFixed(4) + ',' + p[1].toFixed(4); };
    var at = {};
    segs.forEach(function (sg, k) { [0, 1].forEach(function (e) { var kk = key(sg[e]); (at[kk] = at[kk] || []).push(k); }); });
    var used = new Uint8Array(segs.length), lines = [];
    for (var s0 = 0; s0 < segs.length; s0++) {
      if (used[s0]) continue;
      used[s0] = 1;
      var line = [segs[s0][0], segs[s0][1]];
      [1, 0].forEach(function (dirn) {
        var guard = 0;
        while (guard++ < 100000) {
          var end = dirn ? line[line.length - 1] : line[0], cand = at[key(end)] || [], nx = -1;
          for (var c = 0; c < cand.length; c++) if (!used[cand[c]]) { nx = cand[c]; break; }
          if (nx < 0) break;
          used[nx] = 1;
          var sgm = segs[nx], other = key(sgm[0]) === key(end) ? sgm[1] : sgm[0];
          if (dirn) line.push(other); else line.unshift(other);
        }
      });
      if (line.length > 5) lines.push(line);
    }
    // smooth (Chaikin) and convert to flat units
    return lines.map(function (ln) {
      for (var it = 0; it < 2; it++) {
        var out = [ln[0]];
        for (var q = 0; q < ln.length - 1; q++) {
          var p0 = ln[q], p1 = ln[q + 1];
          out.push([p0[0] * 0.75 + p1[0] * 0.25, p0[1] * 0.75 + p1[1] * 0.25], [p0[0] * 0.25 + p1[0] * 0.75, p0[1] * 0.25 + p1[1] * 0.75]);
        }
        out.push(ln[ln.length - 1]);
        ln = out;
      }
      return ln.map(function (p) { return [G.vb[0] + (p[0] + 0.5) * G.cell, G.vb[1] + (p[1] + 0.5) * G.cell, p[0], p[1]]; });
    });
  }

  // thin seam strip along each line, coloured from the surrounding fabric
  function seamGeometry(G, lines, shape) {
    var pos = [], col = [], idx = [], SEG = 6, R = 0.0048;
    var srgb = function (v) { v /= 255; return Math.pow(v, 2.2); };
    function colourAt(gi, gj) {
      var r = 0, g = 0, b = 0, n = 0;
      for (var oy = -2; oy <= 2; oy++) for (var ox = -2; ox <= 2; ox++) {
        var i = Math.round(gi + ox), j = Math.round(gj + oy);
        if (i < 0 || j < 0 || i >= G.GX || j >= G.GY) continue;
        var k = (j * G.GX + i) * 4;
        [G.rgbF, G.rgbB].forEach(function (src) { if (src[k + 3] > 200) { r += src[k]; g += src[k + 1]; b += src[k + 2]; n++; } });
      }
      if (!n) return [0.2, 0.2, 0.2];
      return [srgb(r / n) * 0.95, srgb(g / n) * 0.95, srgb(b / n) * 0.95];
    }
    lines.forEach(function (ln) {
      var P = ln.map(function (p) { var w = shape.warp(p[0], p[1]); return [(w[0] - 300) / 100, -w[1] / 100, 0]; });
      var base = pos.length / 3;
      for (var k = 0; k < P.length; k++) {
        var a = P[Math.max(0, k - 1)], b = P[Math.min(P.length - 1, k + 1)];
        var tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        var nx = -ty, ny = tx, c = colourAt(ln[k][2], ln[k][3]);
        for (var s = 0; s < SEG; s++) {
          var th = (s / SEG) * Math.PI * 2, cz = Math.cos(th) * R, cn = Math.sin(th) * R * 0.75;
          pos.push(P[k][0] + nx * cn, P[k][1] + ny * cn, cz);
          col.push(c[0], c[1], c[2]);
        }
      }
      for (k = 0; k < P.length - 1; k++) for (var s2 = 0; s2 < SEG; s2++) {
        var i0 = base + k * SEG + s2, i1 = base + k * SEG + ((s2 + 1) % SEG), i2 = i0 + SEG, i3 = i1 + SEG;
        idx.push(i0, i2, i1, i1, i2, i3);
      }
    });
    return { pos: new Float32Array(pos), col: new Float32Array(col), idx: idx };
  }

  // ------------------------------------------------------------------ woven fabric surface (normal map)
  function fabricHeight(fabric, x, y) { // x, y in 0..1 (one repeat)
    var TAU = Math.PI * 2, fr = function (v) { return v - Math.floor(v); };
    switch (fabric) {
      case 'HEXA': {
        var best = 9; [[0.5, 0.25], [0, 0.75], [1, 0.75], [0.5, 1.25], [0.5, -0.25], [0, -0.25], [1, -0.25], [0, 1.25], [1, 1.25]].forEach(function (c) { best = Math.min(best, Math.hypot((x - c[0]) * 1.15, y - c[1])); });
        return smooth(0.1, 0.2, best);
      }
      case 'AGILIS': return 0.5 + 0.5 * Math.sin(TAU * (x + y));
      case 'QUADRA': { var ex = Math.abs(fr(x) - 0.5), ey = Math.abs(fr(y) - 0.5); return 0.35 + 0.65 * smooth(0.33, 0.45, Math.max(ex, ey)); }
      case 'MICROTEX': return 0.5 + 0.5 * Math.sin(TAU * 2 * (x + 0.6 * y));
      case 'TASLAN': return 0.5 + 0.4 * Math.sin(TAU * 2 * y) + 0.1 * Math.sin(TAU * x);
      case 'RIPSTOP': { var gx = Math.min(fr(x), 1 - fr(x)), gy = Math.min(fr(y), 1 - fr(y)); return 0.4 + 0.25 * Math.sin(TAU * 3 * (x + y)) + 0.6 * (1 - smooth(0.02, 0.07, Math.min(gx, gy))); }
      case 'MESH': return smooth(0.18, 0.3, Math.hypot(x - 0.5, y - 0.5));
      default: { // ARCTIX jersey knit: two leaning loops per repeat
        var l = function (cx, ang) { var dx = x - cx, dy = y - 0.5, c = Math.cos(ang), s = Math.sin(ang), u = dx * c - dy * s, v = dx * s + dy * c; return Math.max(0, 1 - (u * u) / 0.03 - (v * v) / 0.16); };
        return Math.max(l(0.25, 0.42), l(0.75, -0.42), l(-0.25, -0.42), l(1.25, 0.42));
      }
    }
  }
  function fabricNormalCanvas(fabric, size) {
    var T = 10, H = new Float32Array(T * T);
    for (var y = 0; y < T; y++) for (var x = 0; x < T; x++) H[y * T + x] = fabricHeight(fabric, (x + 0.5) / T, (y + 0.5) / T);
    var tile = document.createElement('canvas'); tile.width = tile.height = T;
    var tc = tile.getContext('2d'), img = tc.createImageData(T, T), S = 2.2;
    for (y = 0; y < T; y++) for (x = 0; x < T; x++) {
      var hx = H[y * T + ((x + 1) % T)] - H[y * T + ((x + T - 1) % T)], hy = H[((y + 1) % T) * T + x] - H[((y + T - 1) % T) * T + x];
      var nx = -hx * S, ny = hy * S, nz = 1, l = Math.hypot(nx, ny, nz), k = (y * T + x) * 4;
      img.data[k] = (nx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[k + 2] = (nz / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
    }
    tc.putImageData(img, 0, 0);
    var c = document.createElement('canvas'); c.width = c.height = size;
    var cx = c.getContext('2d'); cx.fillStyle = cx.createPattern(tile, 'repeat'); cx.fillRect(0, 0, size, size);
    return c;
  }

  // ------------------------------------------------------------------ three.js scene
  var T, ui, renderer, scene, camera, pivot, model, key;
  var st = { zoom: 1, panX: 0, panY: 0, dist: 10, auto: true, raf: 0, gender: store('tmz3d_gender') || 'male', data: null, assets: null, last: 0, hold: null, size: null };

  function studioEnvironment() {
    var pm = new T.PMREMGenerator(renderer), env = new T.Scene();
    env.add(new T.Mesh(new T.SphereGeometry(30, 32, 16), new T.MeshBasicMaterial({ color: 0x6f6f72, side: T.BackSide })));
    var box = function (w, h, p, v) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(v, v, v), side: T.DoubleSide }));
      m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); env.add(m);
    };
    box(14, 10, [10, 12, 14], 5.5);   // key softbox
    box(10, 14, [-16, 2, 8], 1.8);    // fill
    box(18, 5, [0, 14, -14], 3.2);    // rim
    box(40, 40, [0, -18, 0], 0.12);   // floor bounce
    var tex = pm.fromScene(env, 0.04).texture;
    pm.dispose();
    return tex;
  }

  function initScene() {
    if (renderer) return;
    T = window.THREE;
    renderer = new T.WebGLRenderer({ canvas: ui.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap; // filtered with a radius for soft, smooth edges
    scene = new T.Scene();
    scene.environment = studioEnvironment();
    camera = new T.PerspectiveCamera(26, 1, 0.1, 200);
    scene.add(camera);
    scene.add(new T.HemisphereLight(0xffffff, 0x8c8c8c, 0.12));
    key = new T.DirectionalLight(0xffffff, 0.95);
    key.position.set(5, 8, 7);
    key.castShadow = true;
    var big = renderer.capabilities.maxTextureSize >= 8192 && !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    key.shadow.mapSize.set(big ? 4096 : 2048, big ? 4096 : 2048);
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 7;
    scene.add(key); scene.add(key.target);
    pivot = new T.Group(); scene.add(pivot);
    new ResizeObserver(resize).observe(ui.stage);
    resize();
  }

  function resize() {
    if (!renderer) return;
    var w = ui.stage.clientWidth, h = ui.stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (st.size) fitDist();
    camera.updateProjectionMatrix();
  }
  // distance that fits the garment at 1x for the current aspect ratio, whatever its rotation
  function fitDist() {
    var r = Math.max(st.size.x, st.size.y, st.size.z) * 0.5 + 0.12;
    var v = T.MathUtils.degToRad(camera.fov / 2), hz = Math.atan(Math.tan(v) * camera.aspect);
    st.dist = Math.max(r / Math.tan(v), r / Math.tan(hz)) * 1.02;
    camera.near = st.dist / 50; camera.far = st.dist * 4;
    if (ui) applyCamera();
  }

  function geom(pos, idx, uv, col) {
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    if (uv) g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    if (col) g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function texture(canvas, isColour) {
    var t = new T.CanvasTexture(canvas);
    if (isColour) t.encoding = T.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  function materials(cv, fabric) {
    var normal = texture(fabricNormalCanvas(fabric, 2048), false);
    var outer = function (map) {
      return new T.MeshPhysicalMaterial({
        map: map, normalMap: normal, normalScale: new T.Vector2(0.55, 0.55), roughness: 0.72, metalness: 0,
        sheen: new T.Color(0.2, 0.2, 0.21), side: T.FrontSide, envMapIntensity: 0.95,
      });
    };
    var inner = function (map) {
      return new T.MeshStandardMaterial({ map: map, normalMap: normal, normalScale: new T.Vector2(0.45, 0.45), roughness: 0.88, metalness: 0, side: T.BackSide, envMapIntensity: 0.55 });
    };
    var mf = texture(cv.front, true), mb = texture(cv.back, true), inF = texture(cv.inFront, true), inB = texture(cv.inBack, true);
    return { outerF: outer(mf), outerB: outer(mb), innerF: inner(inF), innerB: inner(inB), seam: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, envMapIntensity: 0.8 }), maps: [mf, mb, inF, inB, normal] };
  }

  function disposeModel() {
    if (!model) return;
    model.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    pivot.remove(model); model = null;
  }

  function build() {
    var A = st.assets, meta = A.meta, female = st.gender === 'female', M = A.mats;
    disposeModel();
    model = new T.Group();
    var shape = bodyShape(meta, female);
    var front = panelGeometry(A.G, shape, 1), back = panelGeometry(A.G, shape, -1);
    var gf = geom(front.pos, front.idx, front.uv), gb = geom(back.pos, back.idx, back.uv);
    [[gf, front.seamV], [gb, back.seamV]].forEach(function (pr) { // smooth light across the seam
      var nrm = pr[0].attributes.normal, sv = pr[1];
      for (var q = 0; q < sv.length; q += 3) nrm.setXYZ(sv[q], sv[q + 1], sv[q + 2], 0);
      nrm.needsUpdate = true;
    });
    var add = function (g, mat, cast) { var m = new T.Mesh(g, mat); m.castShadow = !!cast; m.receiveShadow = !!cast; model.add(m); };
    add(gf, M.outerF, true); add(gf, M.innerF); add(gb, M.outerB, true); add(gb, M.innerB);
    var sg = seamGeometry(A.G, A.seams, shape);
    if (sg.idx.length) add(geom(sg.pos, sg.idx, null, sg.col), M.seam);
    // centre on the pivot
    var box = new T.Box3().setFromObject(model), c = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
    model.position.sub(c);
    pivot.add(model);
    st.size = size;
    var ext = Math.max(size.x, size.y, size.z);
    var sc = key.shadow.camera, half = ext * 0.6; sc.left = sc.bottom = -half; sc.right = sc.top = half; sc.near = 0.1; sc.far = 40; sc.updateProjectionMatrix();
    fitDist();
  }

  function applyCamera() {
    camera.zoom = st.zoom;
    camera.position.set(st.panX, st.panY, st.dist);
    camera.updateProjectionMatrix();
    ui.zoomRange.value = st.zoom.toFixed(1);
    ui.zoomOut.textContent = st.zoom.toFixed(1) + '×';
  }

  function resetView(keepAuto) {
    st.zoom = 1; st.panX = 0; st.panY = 0;
    if (pivot) pivot.quaternion.identity();
    st.auto = !!keepAuto;
    if (camera) applyCamera();
  }

  function loop(t) {
    st.raf = requestAnimationFrame(loop);
    var dt = st.last ? Math.min(0.05, (t - st.last) / 1000) : 0; st.last = t;
    if (!renderer || !model) return;
    if (st.auto) rotateAxis([0, 1, 0], dt * 0.45);
    if (st.hold) rotateAxis(st.hold.axis, st.hold.sign * dt * 1.6);
    renderer.render(scene, camera);
  }

  function rotateAxis(axis, angle) {
    var q = new T.Quaternion().setFromAxisAngle(new T.Vector3(axis[0], axis[1], axis[2]).normalize(), angle);
    pivot.quaternion.premultiply(q);
  }

  function setZoom(z, cx, cy) {
    z = clamp(z, 1, MAX_ZOOM);
    if (cx !== undefined && camera) {
      // keep the point under the pointer still while zooming
      var rect = ui.canvas.getBoundingClientRect();
      var nx = ((cx - rect.left) / rect.width) * 2 - 1, ny = -(((cy - rect.top) / rect.height) * 2 - 1);
      var halfH = st.dist * Math.tan(T.MathUtils.degToRad(camera.fov / 2)), halfW = halfH * camera.aspect;
      st.panX += nx * halfW * (1 / st.zoom - 1 / z);
      st.panY += ny * halfH * (1 / st.zoom - 1 / z);
    }
    st.zoom = z;
    if (z === 1) { st.panX = 0; st.panY = 0; }
    limitPan();
    applyCamera();
  }
  function limitPan() {
    var lim = st.dist * 0.35;
    st.panX = clamp(st.panX, -lim, lim); st.panY = clamp(st.panY, -lim, lim);
  }
  function panBy(dx, dy) {
    var h = ui.canvas.clientHeight || 1;
    var wpp = (2 * st.dist * Math.tan(T.MathUtils.degToRad(camera.fov / 2))) / h / st.zoom;
    st.panX -= dx * wpp; st.panY += dy * wpp;
    limitPan(); applyCamera();
  }

  // ------------------------------------------------------------------ pointer / touch / keys
  function bindControls() {
    var cv = ui.canvas, pointers = new Map(), mode = null, lastX = 0, lastY = 0, pinch = null;
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    cv.addEventListener('pointerdown', function (e) {
      if (!model) return;
      cv.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      st.auto = false;
      if (pointers.size === 2) { pinch = gesture(); mode = 'pinch'; return; }
      mode = e.button === 2 || e.button === 1 || e.ctrlKey || e.metaKey ? 'pan' : e.shiftKey || e.altKey ? 'roll' : 'rotate';
      lastX = e.clientX; lastY = e.clientY;
    });
    cv.addEventListener('pointermove', function (e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === 'pinch' && pointers.size === 2) {
        var g = gesture();
        setZoom(st.zoom * (g.dist / pinch.dist), g.cx, g.cy);
        var da = g.ang - pinch.ang;
        if (da > Math.PI) da -= 2 * Math.PI; else if (da < -Math.PI) da += 2 * Math.PI;
        rotateAxis([0, 0, 1], -da);
        panBy(g.cx - pinch.cx, g.cy - pinch.cy);
        pinch = g; return;
      }
      var dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      if (!dx && !dy) return;
      if (mode === 'pan') panBy(dx, dy);
      else if (mode === 'roll') rotateAxis([0, 0, 1], -dx * 0.01);
      else if (mode === 'rotate') rotateAxis([dy, dx, 0], Math.hypot(dx, dy) * 0.0085);
    });
    var up = function (e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 1) { var p = pointers.values().next().value; lastX = p.x; lastY = p.y; mode = 'rotate'; }
      if (!pointers.size) mode = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', function (e) {
      if (!model) return;
      e.preventDefault(); st.auto = false;
      setZoom(st.zoom * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0016)), e.clientX, e.clientY);
    }, { passive: false });
    cv.addEventListener('dblclick', function () { resetView(false); });
    function gesture() {
      var p = Array.from(pointers.values()), a = p[0], b = p[1];
      return { dist: Math.hypot(b.x - a.x, b.y - a.y) || 1, ang: Math.atan2(b.y - a.y, b.x - a.x), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    }
    document.addEventListener('keydown', function (e) {
      if (!ui || ui.root.hidden || !model) return;
      var k = e.key, step = 0.12;
      if (k === 'Escape') { close(); return; }
      var map = { ArrowLeft: [[0, 1, 0], -step], ArrowRight: [[0, 1, 0], step], ArrowUp: [[1, 0, 0], -step], ArrowDown: [[1, 0, 0], step], q: [[0, 0, 1], step], e: [[0, 0, 1], -step] };
      if (map[k]) { st.auto = false; rotateAxis(map[k][0], map[k][1]); e.preventDefault(); }
      else if (k === '+' || k === '=') setZoom(st.zoom * 1.2);
      else if (k === '-' || k === '_') setZoom(st.zoom / 1.2);
      else if (k === '0') resetView(false);
    });
  }

  // ------------------------------------------------------------------ UI
  function buildUI() {
    if (ui) return;
    var root = document.createElement('div');
    root.className = 'v3d'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'v3d-title');
    root.innerHTML =
      '<div class="v3d-panel">' +
        '<div class="v3d-head"><div><span class="v3d-k">3D VIEW</span><h2 id="v3d-title" class="v3d-name"></h2></div>' +
          '<button type="button" class="v3d-x" aria-label="Close 3D view">&times;</button></div>' +
        '<div class="v3d-stage"><canvas class="v3d-canvas" aria-label="3D model. Drag to rotate, scroll to zoom."></canvas>' +
          '<div class="v3d-load"><span class="v3d-spin"></span><b>Loading 3D model…</b></div>' +
          '<div class="v3d-err" hidden></div>' +
          '<div class="v3d-pad" aria-label="Rotate">' +
            '<div><span>X</span><button type="button" data-rot="x-1" aria-label="Tilt back">&#8634;</button><button type="button" data-rot="x1" aria-label="Tilt forward">&#8635;</button></div>' +
            '<div><span>Y</span><button type="button" data-rot="y-1" aria-label="Turn left">&#8634;</button><button type="button" data-rot="y1" aria-label="Turn right">&#8635;</button></div>' +
            '<div><span>Z</span><button type="button" data-rot="z1" aria-label="Roll left">&#8634;</button><button type="button" data-rot="z-1" aria-label="Roll right">&#8635;</button></div>' +
          '</div>' +
          '<div class="v3d-views"><button type="button" data-view="front">Front</button><button type="button" data-view="side">Side</button><button type="button" data-view="back">Back</button></div>' +
          '<p class="v3d-hint">Drag to rotate · Shift-drag or twist to roll · Scroll or pinch to zoom · Right-drag to pan · Double-click to reset</p>' +
        '</div>' +
        '<div class="v3d-bar">' +
          '<div class="v3d-seg" role="group" aria-label="Fit"><button type="button" data-g="male">Male fit</button><button type="button" data-g="female">Female fit</button></div>' +
          '<div class="v3d-zoom"><button type="button" data-z="-1" aria-label="Zoom out">&minus;</button>' +
            '<input id="v3d-zoom" type="range" min="1" max="' + MAX_ZOOM + '" step="0.1" value="1" aria-label="Zoom">' +
            '<button type="button" data-z="1" aria-label="Zoom in">+</button><output for="v3d-zoom">1.0×</output></div>' +
          '<button type="button" class="v3d-reset">Reset view</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
    ui = {
      root: root, canvas: root.querySelector('.v3d-canvas'), stage: root.querySelector('.v3d-stage'), name: root.querySelector('.v3d-name'),
      load: root.querySelector('.v3d-load'), err: root.querySelector('.v3d-err'), zoomRange: root.querySelector('#v3d-zoom'), zoomOut: root.querySelector('.v3d-zoom output'),
    };
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    root.querySelector('.v3d-x').addEventListener('click', close);
    root.querySelector('.v3d-reset').addEventListener('click', function () { resetView(false); });
    ui.zoomRange.addEventListener('input', function () { st.auto = false; setZoom(+ui.zoomRange.value); });
    root.querySelectorAll('[data-z]').forEach(function (b) { b.addEventListener('click', function () { setZoom(st.zoom * (b.dataset.z > 0 ? 1.2 : 1 / 1.2)); }); });
    root.querySelectorAll('[data-g]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (st.gender === b.dataset.g) return;
        st.gender = b.dataset.g; store('tmz3d_gender', st.gender); syncGender();
        if (st.assets) build();
      });
    });
    root.querySelectorAll('[data-rot]').forEach(function (b) {
      var v = b.dataset.rot, axis = v[0] === 'x' ? [1, 0, 0] : v[0] === 'y' ? [0, 1, 0] : [0, 0, 1], sign = +v.slice(1);
      var start = function (e) { e.preventDefault(); st.auto = false; st.hold = { axis: axis, sign: sign }; };
      var stop = function () { st.hold = null; };
      b.addEventListener('pointerdown', start); b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop);
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); st.auto = false; rotateAxis(axis, sign * 0.2); } });
    });
    root.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!pivot) return;
        st.auto = false; pivot.quaternion.identity();
        if (b.dataset.view === 'side') rotateAxis([0, 1, 0], -Math.PI / 2);
        if (b.dataset.view === 'back') rotateAxis([0, 1, 0], Math.PI);
      });
    });
    bindControls();
    syncGender();
  }
  function syncGender() {
    ui.root.querySelectorAll('[data-g]').forEach(function (b) { var on = b.dataset.g === st.gender; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  }

  var lastFocus = null;
  function open(data, root) {
    buildUI();
    lastFocus = document.activeElement;
    st.data = data;
    ui.name.textContent = data.n || '';
    ui.root.hidden = false;
    document.documentElement.classList.add('v3d-open');
    ui.load.hidden = false; ui.err.hidden = true;
    ui.root.querySelector('.v3d-x').focus();
    if (!st.raf) st.raf = requestAnimationFrame(loop);
    var meta = META[data.c];
    var key_ = data.f + '|' + data.b;
    loadScript(THREE_SRC)
      .then(function () {
        initScene();
        if (st.assets && st.assets.key === key_) return st.assets;
        var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        var size = !coarse && renderer.capabilities.maxTextureSize >= 8192 ? 4096 : 2048;
        return Promise.all([rasterize(root + data.f, meta.vb, size, 'front'), rasterize(root + data.b, meta.vb, size, 'back')]).then(function (cv) {
          var G = analyse(meta, cv[0].canvas, cv[1].canvas);
          return Promise.all([insideCanvas(meta, cv[0].svg, cv[1].svg, 'front', data.tr, 2048), insideCanvas(meta, cv[0].svg, cv[1].svg, 'back', data.tr, 2048)]).then(function (ins) {
            if (st.assets) st.assets.mats.maps.forEach(function (t) { t.dispose(); });
            var mats = materials({ front: bleed(cv[0].canvas), back: bleed(cv[1].canvas), inFront: ins[0], inBack: ins[1] }, data.fb || 'ARCTIX');
            return { key: key_, meta: meta, G: G, seams: seamLines(G), mats: mats };
          });
        });
      })
      .then(function (assets) {
        if (st.data !== data) return;
        st.assets = assets;
        resize();
        build();
        resetView(true);
        ui.load.hidden = true;
      })
      .catch(function (err) {
        ui.load.hidden = true;
        ui.err.hidden = false;
        ui.err.textContent = (err && err.message ? err.message : 'Something went wrong.') + ' Check your connection and try again.';
      });
  }

  function close() {
    if (!ui || ui.root.hidden) return;
    ui.root.hidden = true;
    document.documentElement.classList.remove('v3d-open');
    cancelAnimationFrame(st.raf); st.raf = 0; st.last = 0; st.hold = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  window.TMZ3D = { open: open, close: close, _state: st };
})();

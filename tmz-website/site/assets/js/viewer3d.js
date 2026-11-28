/*
 * TMZ 3D viewer
 * ---------------------------------------------------------------------------
 * Shows a product in an interactive WebGL popup, "ghost mannequin" style: only
 * the garment is visible, shaped as if worn by an athletic body.
 *  - The garment is built from the product's own front/back artwork: the flat
 *    silhouette is inflated into a 3D shell, then shaped to a fit build (V-taper
 *    waist, chest and shoulder-blade contours, snug sleeves / legs). The artwork
 *    is wrapped on at up to 4096 px; the surface uses a fine, irregular knit /
 *    weave (normal, roughness and fibre maps tiled at thread scale) with sheen.
 *    The fabric is smooth: no wrinkles.
 *  - Front and back panels meet on the real outline of the artwork, closed by a
 *    thin seam in the local fabric colour, so there are no gaps; open edges get
 *    a rolled hem.
 *  - Collars, plackets, zip collars, zip tape, pockets and waistbands are separate
 *    raised layers with real thickness; buttons, zip teeth and puller, cords,
 *    aglets and eyelets are modelled as 3D hardware.
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
  var COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  var GRID = COARSE ? 210 : 270; // garment mesh resolution (columns)
  // raised layers marked in the artwork with data-l: lift above the shirt in artwork units (1 unit ~ 1.2 mm)
  var LAYER = { c: { lift: 2.4 }, f: { lift: 3.0 }, p: { lift: 1.7 }, z: { lift: 2.8 }, t: { lift: 1.2 }, k: { lift: 1.3 }, w: { lift: 2.0 }, u: { lift: 1.6 } };

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
  function hash(i, j, s) { var h = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }
  function boxBlur(src, W, H, r, passes) {
    var a = new Float32Array(src), b = new Float32Array(W * H), x, y, k, s, c;
    for (var p = 0; p < passes; p++) {
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) { s = 0; c = 0; for (k = -r; k <= r; k++) { if (x + k < 0 || x + k >= W) continue; s += a[y * W + x + k]; c++; } b[y * W + x] = s / c; }
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) { s = 0; c = 0; for (k = -r; k <= r; k++) { if (y + k < 0 || y + k >= H) continue; s += b[(y + k) * W + x]; c++; } a[y * W + x] = s / c; }
    }
    return a;
  }
  // chamfer distance (cells) from each inside point (V > 0.5) to the outside
  function chamfer(V, W, H) {
    var D = new Float32Array(W * H), S2 = Math.SQRT2, x, y, j, v;
    for (j = 0; j < W * H; j++) D[j] = V[j] > 0.5 ? 1e6 : 0;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      j = y * W + x; if (!D[j]) continue; v = D[j];
      if (x > 0) v = Math.min(v, D[j - 1] + 1); else v = Math.min(v, 1);
      if (y > 0) { v = Math.min(v, D[j - W] + 1); if (x > 0) v = Math.min(v, D[j - W - 1] + S2); if (x < W - 1) v = Math.min(v, D[j - W + 1] + S2); } else v = Math.min(v, 1);
      D[j] = v;
    }
    for (y = H - 1; y >= 0; y--) for (x = W - 1; x >= 0; x--) {
      j = y * W + x; if (!D[j]) continue; v = D[j];
      if (x < W - 1) v = Math.min(v, D[j + 1] + 1); else v = Math.min(v, 1);
      if (y < H - 1) { v = Math.min(v, D[j + W] + 1); if (x < W - 1) v = Math.min(v, D[j + W + 1] + S2); if (x > 0) v = Math.min(v, D[j + W - 1] + S2); } else v = Math.min(v, 1);
      D[j] = v;
    }
    return D;
  }
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
        // and the hardware modelled in 3D
        var txt = src.replace(/<path class="ol"[^>]*\/>/g, '').replace(/<rect class="fs"[^>]*\/>/g, '')
          .replace(/<(?:path|rect|circle) class="(?:zp|ds|dt|ag)"[^>]*\/>/g, '');
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

  /*
   * Raised layers: every artwork element marked data-l="<type>" (collar band, polo collar,
   * placket, zip collar, zip tape, pocket, waistband, cuffs) is rasterised on its own into an
   * alpha mask, per type. The 3D layer is cut from the shirt where its mask covers it.
   */
  function layerMasks(svg, vb, cols) {
    var by = {}, W = cols, H = Math.round((cols * vb[3]) / vb[2]);
    (svg.match(/<(?:path|rect|circle)\b[^>]*\bdata-l="\w"[^>]*\/>/g) || []).forEach(function (e) { var t = e.match(/data-l="(\w)"/)[1]; (by[t] = by[t] || []).push(e); });
    return Promise.all(Object.keys(by).map(function (t) {
      var src = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.join(' ') + '" width="' + W + '" height="' + H + '"><style>*{opacity:1!important;fill-opacity:1!important;stroke-opacity:1!important}</style>' + by[t].join('') + '</svg>';
      return svgCanvas(src, W, H).then(function (c) {
        var d = c.getContext('2d').getImageData(0, 0, W, H).data, a = new Float32Array(W * H);
        for (var i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
        return { t: t, a: a };
      });
    })).then(function (list) { return { W: W, H: H, vb: vb, list: list }; });
  }
  function maskAt(M, a, x, y) { // bilinear, artwork coordinates
    var fx = ((x - M.vb[0]) / M.vb[2]) * M.W - 0.5, fy = ((y - M.vb[1]) / M.vb[3]) * M.H - 0.5;
    var i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
    var g = function (ii, jj) { return ii < 0 || jj < 0 || ii >= M.W || jj >= M.H ? 0 : a[jj * M.W + ii]; };
    return lerp(lerp(g(i, j), g(i + 1, j), tx), lerp(g(i, j + 1), g(i + 1, j + 1), tx), ty);
  }
  // buttons, zip puller + tape, cords and their tips, eyelets: positions and colours from the artwork
  function parseHardware(svg) {
    var H = { bn: [], zp: [], ds: [], dt: [], ey: [], ag: [], zt: [] };
    (svg.match(/<(?:circle|rect|path) class="(?:bn|zp|ds|dt|ey|ag)"[^>]*\/>/g) || []).forEach(function (e) {
      var k = e.match(/class="(\w+)"/)[1];
      var at = function (n) { var m = e.match(new RegExp('\\s' + n + '="([^"]*)"')); return m ? m[1] : null; };
      if (k === 'ds') {
        var re = /M([\d.-]+) ([\d.-]+)q([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)/g, m, d = at('d');
        while ((m = re.exec(d))) H.ds.push({ p0: [+m[1], +m[2]], c: [+m[1] + +m[3], +m[2] + +m[4]], p1: [+m[1] + +m[5], +m[2] + +m[6]], col: at('stroke'), w: +at('stroke-width') || 2.5 });
      } else if (e.indexOf('<circle') === 0) H[k].push({ x: +at('cx'), y: +at('cy'), r: +at('r'), col: at('fill') });
      else H[k].push({ x: +at('x') + +at('width') / 2, y: +at('y') + +at('height') / 2, w: +at('width'), h: +at('height'), col: at('fill') });
    });
    var zt = svg.match(/<path data-l="t" d="M([\d.]+) ([\d.]+)V([\d.]+)"/);
    if (zt) H.zt.push({ x: +zt[1], y0: +zt[2], y1: +zt[3] });
    return H;
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
    // halve step by step (a true area average), so the outline keeps sub-cell, anti-aliased coverage
    var shrink = function (src) {
      var c = src;
      while (c.width / 2 >= GX * 1.4) {
        var n2 = document.createElement('canvas'); n2.width = Math.ceil(c.width / 2); n2.height = Math.ceil(c.height / 2);
        var x2 = n2.getContext('2d'); x2.imageSmoothingQuality = 'high'; x2.drawImage(c, 0, 0, n2.width, n2.height); c = n2;
      }
      return c;
    };
    frontCanvas = shrink(frontCanvas); backCanvas = shrink(backCanvas);
    cx.imageSmoothingQuality = 'high';
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

    // chamfer distance transform (grid units); cells beyond the grid count as inside.
    // Cells on the outline are seeded with their sub-cell distance to the anti-aliased edge
    // (the same interpolation the mesh outline uses), so slanted edges stay smooth.
    var INF = 1e9, d = new Float32Array(N), S2 = Math.SQRT2, covA = new Float32Array(N);
    for (i = 0; i < N; i++) covA[i] = Math.max(cov[i], o[i * 4 + 3] / 255);
    var x, y, j, v;
    var frac = function (j, n) { return clamp((covA[j] - 0.5) / ((covA[j] - covA[n]) || 1e-6), 0.02, 1); };
    for (y = 0; y < GY; y++) for (x = 0; x < GX; x++) {
      j = y * GX + x;
      if (!aug[j]) { d[j] = 0; continue; }
      var tx = 0, ty = 0;
      if (x > 0 && !aug[j - 1]) tx = frac(j, j - 1);
      if (x < GX - 1 && !aug[j + 1]) tx = tx ? Math.min(tx, frac(j, j + 1)) : frac(j, j + 1);
      if (y > 0 && !aug[j - GX]) ty = frac(j, j - GX);
      if (y < GY - 1 && !aug[j + GX]) ty = ty ? Math.min(ty, frac(j, j + GX)) : frac(j, j + GX);
      d[j] = tx && ty ? (tx * ty) / Math.hypot(tx, ty) + 0.5 : tx || ty ? (tx || ty) + 0.5 : INF;
    }
    for (y = 0; y < GY; y++) for (x = 0; x < GX; x++) {
      j = y * GX + x; if (!aug[j]) continue; v = d[j];
      if (x > 0 && aug[j - 1]) v = Math.min(v, d[j - 1] + 1);
      if (y > 0) { if (aug[j - GX]) v = Math.min(v, d[j - GX] + 1); if (x > 0 && aug[j - GX - 1]) v = Math.min(v, d[j - GX - 1] + S2); if (x < GX - 1 && aug[j - GX + 1]) v = Math.min(v, d[j - GX + 1] + S2); }
      d[j] = v;
    }
    for (y = GY - 1; y >= 0; y--) for (x = GX - 1; x >= 0; x--) {
      j = y * GX + x; if (!aug[j]) continue; v = d[j];
      if (x < GX - 1 && aug[j + 1]) v = Math.min(v, d[j + 1] + 1);
      if (y < GY - 1) { if (aug[j + GX]) v = Math.min(v, d[j + GX] + 1); if (x < GX - 1 && aug[j + GX + 1]) v = Math.min(v, d[j + GX + 1] + S2); if (x > 0 && aug[j + GX - 1]) v = Math.min(v, d[j + GX - 1] + S2); }
      d[j] = v;
    }
    for (i = 0; i < N; i++) if (d[i] >= INF) d[i] = GX;

    // largest inscribed disc covering each cell (splat discs from ridge cells)
    var R = new Float32Array(d);
    for (y = 0; y < GY; y++) for (x = 0; x < GX; x++) {
      j = y * GX + x; var r = d[j]; if (r < 1.5) continue;
      var rt = r + 0.5; // ridge (near-local maximum): sub-cell distances rarely tie exactly along a sloped ridge
      if ((x > 0 && d[j - 1] > rt) || (x < GX - 1 && d[j + 1] > rt) || (y > 0 && d[j - GX] > rt) || (y < GY - 1 && d[j + GX] > rt)) continue;
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
    return { vb: vb, cell: cell, GX: GX, GY: GY, mask: mask, aug: aug, cov: cov, covF: covF, covB: covB, neck: neck, h: h, d: d, rgbF: a, rgbB: bk };
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
      var dir = norm(sub(A1, A0)), B0 = meta.sleeve.bot[0], B1 = meta.sleeve.bot[1], L_ = len(sub(A1, A0));
      var long = L_ > 200, ang = Math.atan2(-dir[0], dir[1]);
      sl = { A0: A0, dir: dir, n: [dir[1], -dir[0]], L: L_,
        w0: len(sub(meta.sleeve.top[0], meta.sleeve.bot[0])) / 2, w1: len(sub(meta.sleeve.top[1], meta.sleeve.bot[1])) / 2,
        B0: B0, bd: norm(sub(B1, B0)),
        snug: long ? 0.3 : 0.17, // slimmer long sleeves
        flare: long ? 0.26 : 0.22, fs: long ? 0.86 : 0.7, // wider cuff opening, right at the end of the sleeve
        // long sleeves hang straight down in the flat drawing: turn them out like a jersey sleeve (about 30 degrees)
        turn: long ? Math.max(0, (30 * Math.PI) / 180 - ang) : 0,
        pivot: [lerp(meta.sL[0], meta.aL[0], 0.32) + 4 * s, lerp(meta.sL[1], meta.aL[1], 0.32)] };
    }
    function sleeveCoords(x, y) { // left-side sleeve coordinates for a point (mirrored for the right)
      if (!sl) return null;
      var px = x < 300 ? x : 600 - x, rel = [px - sl.A0[0], y - sl.A0[1]];
      var t = dot(rel, sl.dir) / sl.L, sp = dot(rel, sl.n), hw = lerp(sl.w0, sl.w1, clamp(t, 0, 1)) * 0.9;
      // below the armpit, only points on the sleeve's side of its inner seam belong to the sleeve
      var di = (sl.bd[0] * (y - sl.B0[1]) - sl.bd[1] * (px - sl.B0[0]));
      var own = lerp(1, smooth(-14, -2, di), smooth(aL[1] - 20, aL[1] + 10, y));
      var w = smooth(-0.04, 0.14, t) * (1 - smooth(1.15, 1.5, Math.abs(sp) / Math.max(hw, 1))) * own;
      var wr = smooth(-0.15, 0.45, t) * (1 - smooth(1.15, 1.5, Math.abs(sp) / Math.max(hw, 1))) * own;
      return { t: t, sp: sp, w: w, wr: wr, px: px };
    }
    var fArm = curve(taper, yA); // sleeves follow the shoulders, not the waist taper
    function warp(x, y) {
      var sc = sleeveCoords(x, y), X = x, ws = 0;
      if (sc && (sc.w > 0 || sc.wr > 0)) {
        ws = Math.max(sc.w, sc.wr);
        // snug along the arm, opening out to the full width (and a little more) at the cuff
        var k = (1 - sl.snug * sc.w * (1 - smooth(0.55, 0.92, sc.t))) * (1 + sl.flare * sc.w * smooth(sl.fs, 1.0, sc.t));
        var lx = sl.A0[0] + sl.dir[0] * sc.t * sl.L + sl.n[0] * sc.sp * k;
        var ly = sl.A0[1] + sl.dir[1] * sc.t * sl.L + sl.n[1] * sc.sp * k;
        if (sl.turn) {
          var a = sl.turn * sc.wr, ca = Math.cos(a), sa = Math.sin(a), rx = lx - sl.pivot[0], ry = ly - sl.pivot[1];
          lx = sl.pivot[0] + ca * rx - sa * ry; ly = sl.pivot[1] + sa * rx + ca * ry;
        }
        X = x < 300 ? lx : 600 - lx; y = ly;
      }
      var f = lerp(y <= yA ? taper[0][1] : curve(taper, y), fArm, ws);
      var e = 300 - edge(y), dx = X - 300;
      if (Math.abs(dx) <= e) return [300 + dx * f, y];
      return [X - Math.sign(dx) * e * (1 - f), y];
    }
    // the hood (windbreakers) lies back behind the neck instead of standing up as a blob
    var hoodW = 300 - nL[0] + 34;
    function hoodAt(x, y) { return smooth(nL[1] - 12, nL[1] - 50, y) * smooth(hoodW + 30, hoodW, Math.abs(x - 300)); }
    function zoff(x, y) { return -18 * hoodAt(x, y); }
    function depth(x, y, side) {
      var sc = sleeveCoords(x, y), ws = sc ? sc.w : 0, wt = 1 - ws;
      var e = Math.max(1, 300 - edge(y)), u = (x - 300) / e, au = Math.abs(u);
      var f = y <= yA ? taper[0][1] : curve(taper, y);
      var m = Math.pow(f, 0.6);
      if (side > 0) {
        if (female) { // fuller bust: rounded on top, a clear underline, a soft cleavage
          var yb = yA + 14 * s, vb = y < yb ? g1(y - yb, 30 * s) : g1(y - yb, 15 * s);
          m *= 1 + 0.46 * g1(au - 0.4, 0.2) * vb - 0.06 * g1(u, 0.06) * vb - 0.05 * g1(y - (yA + 0.5 * H), 0.2 * H) * g1(u, 0.6);
        } else { // defined pecs: full upper chest, a crisp lower pec line, sternum groove
          var yc = yA - 14 * s, vp = y < yc ? g1(y - yc, 42 * s) : g1(y - yc, 14 * s);
          m *= 1 + 0.3 * g1(au - 0.42, 0.25) * vp - 0.08 * g1(u, 0.07) * vp
                 - 0.07 * g1(y - (yA + 0.45 * H), 0.25 * H) * g1(u, 0.7);
        }
      } else {
        m *= 1 + (female ? 0.06 : 0.11) * g1(au - 0.42, 0.24) * g1(y - (yA - 14 * s), 40 * s)
               - 0.05 * g1(u, 0.05) * g1(y - (yA + 0.2 * H), 0.45 * H)
               - (female ? 0.07 : 0.04) * g1(y - (yA + 0.58 * H), 0.2 * H);
      }
      m *= lerp(1, 0.38, hoodAt(x, y));
      var t = sc ? sc.t : 0, cuff = sl ? smooth(sl.fs, 1.0, t) : 0;
      var mSleeve = (sl && sl.L > 200 ? 0.8 : 0.86) * (1 + (side > 0 ? 0.14 : 0.1) * g1(t - 0.33, 0.16));
      mSleeve = lerp(mSleeve, 1, smooth(0.6, 1.0, t)) * (1 + (sl ? sl.flare : 0) * cuff);
      return wt * m + ws * mSleeve;
    }
    return { warp: warp, depth: depth, zoff: zoff };
  }

  function legShape(meta, female) {
    var Ak = mid(meta.ankleL[0], meta.ankleL[1]), Hj = [250, 236];
    var dir = norm(sub(Ak, Hj)), n = [dir[1], -dir[0]], L = len(sub(Ak, Hj));
    function legCoords(x, y) {
      var px = x < 300 ? x : 600 - x, rel = [px - Hj[0], y - Hj[1]];
      return { t: dot(rel, dir) / L, sp: dot(rel, n), w: smooth(236, 300, y), px: px };
    }
    // a trim, athletic fit: slim legs tapering to the ankle, neat hips and a flat front
    function warp(x, y) {
      var lc = legCoords(x, y), k = (1 - 0.2 * lc.w) * (1 - 0.08 * lc.w * smooth(0.45, 1, lc.t));
      var lx = Hj[0] + dir[0] * lc.t * L + n[0] * lc.sp * k, ly = Hj[1] + dir[1] * lc.t * L + n[1] * lc.sp * k;
      var X = lc.w > 0 ? (x < 300 ? lx : 600 - lx) : x, Y = lc.w > 0 ? ly : y;
      X = 300 + (X - 300) * (1 - (0.03 + 0.11 * smooth(110, 250, y)) * (1 - lc.w));
      if (female) X = 300 + (X - 300) * (1 + 0.035 * g1(Y - 210, 50));
      return [X, Y];
    }
    function depth(x, y, side) {
      var lc = legCoords(x, y), t = lc.t, wl = lc.w, u = (x - 300) / 114, au = Math.abs(u);
      var m = lerp(0.76, 0.8, wl);
      if (side > 0) m *= 1 - 0.2 * (1 - wl) * g1(u, 0.45) * smooth(120, 210, y) + wl * 0.06 * g1(t - 0.28, 0.13);
      else m *= 1 + (1 - wl) * (female ? 0.14 : 0.07) * g1(au - 0.45, 0.3) * g1(y - 215, 40) + wl * (0.03 * g1(t - 0.25, 0.12) + 0.07 * g1(t - 0.68, 0.1));
      return m;
    }
    return { warp: warp, depth: depth, zoff: function () { return 0; } };
  }

  // marching squares over a grid: corners inside get their own vertex, the outline gets
  // interpolated edge points; bseg receives each outline segment (in polygon order)
  function march(GX, GY, inside, corner, edge, tri, bseg) {
    var ins = [0, 0, 0, 0], C = [0, 0, 0, 0], poly = [], isE = [];
    for (var j = 0; j < GY - 1; j++) for (var i = 0; i < GX - 1; i++) {
      var n = j * GX + i; C[0] = n; C[1] = n + 1; C[2] = n + GX + 1; C[3] = n + GX;
      var any = false;
      for (var k = 0; k < 4; k++) { ins[k] = inside(C[k]); any = any || ins[k]; }
      if (!any) continue;
      poly.length = 0; isE.length = 0;
      for (k = 0; k < 4; k++) {
        if (ins[k]) { poly.push(corner(C[k])); isE.push(false); }
        if (ins[k] !== ins[(k + 1) % 4]) { poly.push(edge(C[k], C[(k + 1) % 4])); isE.push(true); }
      }
      for (var q = 1; q < poly.length - 1; q++) tri(poly[0], poly[q], poly[q + 1]);
      if (bseg) for (q = 0; q < poly.length; q++) { var r = (q + 1) % poly.length; if (isE[q] && isE[r]) bseg(poly[q], poly[r]); }
    }
  }
  // bilinear sampling of a panel grid field at artwork coordinates
  function sampler(G) {
    return function (arr, x, y) {
      var fi = (x - G.vb[0]) / G.cell - 0.5, fj = (y - G.vb[1]) / G.cell - 0.5;
      var i = clamp(Math.floor(fi), 0, G.GX - 2), j = clamp(Math.floor(fj), 0, G.GY - 2), tx = clamp(fi - i, 0, 1), ty = clamp(fj - j, 0, 1), n = j * G.GX + i;
      return lerp(lerp(arr[n], arr[n + 1], tx), lerp(arr[n + G.GX], arr[n + G.GX + 1], tx), ty);
    };
  }

  // ------------------------------------------------------------------ garment geometry (flat units; converted to world at the end)
  /*
   * Meshes one panel with marching squares on the shared outline: interior grid points
   * carry the shell height (body shape), and the outline points are
   * interpolated on the cell edges. Along seams the outline sits on the mid-plane (z = 0)
   * and is shared exactly by the front and back panels, so they meet edge to edge. Along
   * open edges (neck, hem, cuffs, waist, ankles) the outline keeps its height, leaving a
   * real opening. Vertex colours carry the soft shadow round raised layers.
   */
  function panelGeometry(G, shape, sign, LM) {
    var GX = G.GX, GY = G.GY, pos = [], uv = [], col = [], idx = [];
    var own = sign > 0 ? G.covF : G.covB, cov = new Float32Array(GX * GY);
    for (var c0 = 0; c0 < cov.length; c0++) cov[c0] = G.neck[c0] ? own[c0] : G.cov[c0];
    var vid = new Int32Array(GX * GY).fill(-1), eid = {};
    var fx = function (gi) { return G.vb[0] + (gi + 0.5) * G.cell; }, fy = function (gj) { return G.vb[1] + (gj + 0.5) * G.cell; };
    var artX = function (x) { return sign > 0 ? x : 2 * G.vb[0] + G.vb[2] - x; };
    var N = GX * GY, Z = new Float32Array(N), ZE = new Float32Array(N), WX = new Float32Array(N), WY = new Float32Array(N);
    for (var n0 = 0; n0 < N; n0++) {
      var i0 = n0 % GX, j0 = (n0 - i0) / GX, hv = G.h[n0], X0 = fx(i0), Y0 = fy(j0);
      if (hv > 0) ZE[n0] = hv * shape.depth(X0, Y0, sign);
      Z[n0] = cov[n0] > 0.5 ? ZE[n0] : 0;
      var w0 = shape.warp(X0, Y0); WX[n0] = w0[0]; WY[n0] = w0[1];
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
          var E = Math.min(Math.round(9 * GX / 200), Math.floor((b - a) / 2));
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

    // raised layers on this panel (sampled in texture space so they line up with the print)
    var LG = new Float32Array(N), LIFT = new Float32Array(N);
    if (LM) LM.list.forEach(function (L) {
      var lift = (LAYER[L.t] || LAYER.c).lift;
      for (var n = 0; n < N; n++) {
        if (cov[n] <= 0.2) continue;
        var m = maskAt(LM, L.a, artX(TU[n]), TV[n]);
        if (m * lift / 3 > LG[n]) LG[n] = m * lift / 3;
        if (m > 0.5 && lift > LIFT[n]) LIFT[n] = lift;
      }
    });
    // soft contact shadow round raised layers
    var AO = new Float32Array(N).fill(1), LGb = boxBlur(LG, GX, GY, Math.max(2, Math.round(3.2 / G.cell)), 2);
    for (n0 = 0; n0 < N; n0++) if (cov[n0] > 0.2) AO[n0] = clamp(1 - 0.3 * clamp(LGb[n0] - LG[n0], 0, 1), 0.7, 1);
    AO = boxBlur(AO, GX, GY, 1, 1);

    function push(x, y, z, tu, tv, a) {
      var w = shape.warp(x, y);
      pos.push((w[0] - 300) / 100, -w[1] / 100, (sign * z + shape.zoff(x, y)) / 100);
      var u = (tu - G.vb[0]) / G.vb[2];
      uv.push(sign > 0 ? u : 1 - u, 1 - (tv - G.vb[1]) / G.vb[3]);
      col.push(a, a, a);
      return pos.length / 3 - 1;
    }
    var seamV = [], openIn = {}, openSeg = []; // seam outline points + outward direction; open-edge points
    function grad(n) {
      var i = n % GX, j = (n - i) / GX;
      return [cov[j * GX + Math.min(GX - 1, i + 1)] - cov[j * GX + Math.max(0, i - 1)], cov[Math.min(GY - 1, j + 1) * GX + i] - cov[Math.max(0, j - 1) * GX + i]];
    }
    function corner(n) {
      if (vid[n] < 0) { var i = n % GX, j = (n - i) / GX; vid[n] = push(fx(i), fy(j), Z[n], TU[n], TV[n], AO[n]); }
      return vid[n];
    }
    function edge(n0, n1) {
      var k = n0 < n1 ? n0 + '_' + n1 : n1 + '_' + n0;
      if (eid[k] !== undefined) return eid[k];
      var v0 = cov[n0], v1 = cov[n1], t = clamp((0.5 - v0) / ((v1 - v0) || 1e-6), 0, 1);
      var i0 = n0 % GX, j0 = (n0 - i0) / GX, i1 = n1 % GX, j1 = (n1 - i1) / GX;
      var gi = i0 + (i1 - i0) * t, gj = j0 + (j1 - j0) * t;
      var inside = v0 > 0.5 ? n0 : n1, outside = inside === n0 ? n1 : n0, open = G.aug[outside];
      var z = open ? lerp(ZE[n0], ZE[n1], t) : 0; // open edge keeps depth, seam closes
      eid[k] = push(fx(gi), fy(gj), z, open ? lerp(TU[n0], TU[n1], t) : fx(gi), open ? lerp(TV[n0], TV[n1], t) : fy(gj), AO[inside]);
      if (open) openIn[eid[k]] = inside;
      else {
        var g0 = grad(n0), g1_ = grad(n1), gx = -lerp(g0[0], g1_[0], t), gy = -lerp(g0[1], g1_[1], t), gl = Math.hypot(gx, gy) || 1;
        seamV.push(eid[k], gx / gl, -gy / gl);
      }
      return eid[k];
    }
    // corners run TL→TR→BR→BL (clockwise seen from +z), so reverse for outward-facing fronts
    march(GX, GY, function (c) { return cov[c] > 0.5; }, corner, edge,
      function (a, b, c) { if (sign > 0) idx.push(a, c, b); else idx.push(a, b, c); },
      function (a, b) { if (openIn[a] !== undefined && openIn[b] !== undefined) openSeg.push(a, b); });
    return {
      pos: new Float32Array(pos), uv: new Float32Array(uv), col: new Float32Array(col), idx: idx, seamV: seamV,
      openIn: openIn, openSeg: openSeg, cov: cov, ZE: ZE, TU: TU, TV: TV, LIFT: LIFT, LIFTs: boxBlur(LIFT, GX, GY, 2, 2), at: sampler(G), sign: sign, artX: artX,
    };
  }

  // a point on the panel surface (world units) and its local frame: right, up, outward normal
  function surfAt(P, shape, x, y) {
    var w = shape.warp(x, y);
    return [(w[0] - 300) / 100, -w[1] / 100, (P.sign * P.at(P.ZE, x, y) + shape.zoff(x, y)) / 100];
  }
  function frameAt(G, P, shape, x, y) {
    var h = G.cell * 0.7, p = surfAt(P, shape, x, y);
    var ax = surfAt(P, shape, x + h, y), bx = surfAt(P, shape, x - h, y), ay = surfAt(P, shape, x, y - h), by = surfAt(P, shape, x, y + h);
    var tx = [ax[0] - bx[0], ax[1] - bx[1], ax[2] - bx[2]], ty = [ay[0] - by[0], ay[1] - by[1], ay[2] - by[2]];
    var cr = function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; };
    var nz = function (v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    var n = nz(P.sign > 0 ? cr(tx, ty) : cr(ty, tx)), r = nz(cr(ty, n)), u = cr(n, r);
    return { p: p, n: n, r: r, u: u };
  }

  /*
   * One raised layer (collar band, polo collar, placket, zip collar / tape, pocket,
   * waistband, cuff): its outline is cut by marching squares at twice the panel resolution,
   * the top follows the shirt surface lifted along the normal with a softly rounded edge,
   * and a wall drops from that edge to just below the shirt, so it reads as a separate,
   * stitched-on layer with real thickness.
   */
  function layerGeometry(G, P, shape, LM, L) {
    var lift = (LAYER[L.t] || LAYER.c).lift, cs = G.cell / 2, vb = G.vb, sign = P.sign;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (var j = 0; j < LM.H; j++) for (var i = 0; i < LM.W; i++) if (L.a[j * LM.W + i] > 0.05) {
      var ax = P.artX(vb[0] + ((i + 0.5) * vb[2]) / LM.W), ay = vb[1] + ((j + 0.5) * vb[3]) / LM.H;
      x0 = Math.min(x0, ax); x1 = Math.max(x1, ax); y0 = Math.min(y0, ay); y1 = Math.max(y1, ay);
    }
    if (x0 > x1) return null;
    var pad = 14, LX = 2 * G.GX, LY = 2 * G.GY;
    var i0 = Math.max(0, Math.floor((x0 - pad - vb[0]) / cs)), i1 = Math.min(LX - 1, Math.ceil((x1 + pad - vb[0]) / cs));
    var j0 = Math.max(0, Math.floor((y0 - pad - vb[1]) / cs)), j1 = Math.min(LY - 1, Math.ceil((y1 + pad - vb[1]) / cs));
    var W = i1 - i0 + 1, H = j1 - j0 + 1, V = new Float32Array(W * H);
    var gx = function (i) { return vb[0] + (i0 + i + 0.5) * cs; }, gy = function (j) { return vb[1] + (j0 + j + 0.5) * cs; };
    for (j = 0; j < H; j++) for (i = 0; i < W; i++) {
      var x = gx(i), y = gy(j), c = P.at(P.cov, x, y);
      if (c < 0.3) continue;
      V[j * W + i] = Math.min(c, maskAt(LM, L.a, P.artX(P.at(P.TU, x, y)), P.at(P.TV, x, y)));
    }
    var D = chamfer(V, W, H), R = Math.max(1.2, lift * 1.3);
    var pos = [], uv = [], col = [], idx = [], vid = {}, edgeXY = {}, segs = [];
    function vtx(x, y, h, a) {
      var F = frameAt(G, P, shape, x, y), tu = P.at(P.TU, x, y), tv = P.at(P.TV, x, y), u = (tu - vb[0]) / vb[2];
      pos.push(F.p[0] + (F.n[0] * h) / 100, F.p[1] + (F.n[1] * h) / 100, F.p[2] + (F.n[2] * h) / 100);
      uv.push(sign > 0 ? u : 1 - u, 1 - (tv - vb[1]) / vb[3]);
      col.push(a, a, a);
      return pos.length / 3 - 1;
    }
    var top = function (dist) { var e = clamp((dist * cs) / R, 0, 1); return lift * (0.5 + 0.5 * Math.sqrt(1 - (1 - e) * (1 - e))); };
    march(W, H, function (k) { return V[k] > 0.5; },
      function (k) { if (vid['c' + k] === undefined) { var i = k % W, j = (k - i) / W; vid['c' + k] = vtx(gx(i), gy(j), top(D[k]), 0.92 + 0.08 * clamp((D[k] * cs) / R, 0, 1)); } return vid['c' + k]; },
      function (k0, k1) {
        var key = k0 < k1 ? k0 + '_' + k1 : k1 + '_' + k0;
        if (vid[key] === undefined) {
          var v0 = V[k0], v1 = V[k1], t = clamp((0.5 - v0) / ((v1 - v0) || 1e-6), 0, 1);
          var ia = k0 % W, ja = (k0 - ia) / W, ib = k1 % W, jb = (k1 - ib) / W, x = gx(ia + (ib - ia) * t), y = gy(ja + (jb - ja) * t);
          vid[key] = vtx(x, y, top(0), 0.9); edgeXY[vid[key]] = [x, y];
        }
        return vid[key];
      },
      function (a, b, c) { if (sign > 0) idx.push(a, c, b); else idx.push(a, b, c); },
      function (a, b) { segs.push(a, b); });
    if (!idx.length) return null;
    var wall = {};
    function wallV(v) { // [base, top] of the wall under an outline point
      if (!wall[v]) { var e = edgeXY[v]; wall[v] = [vtx(e[0], e[1], -0.35, 0.62), vtx(e[0], e[1], top(0), 0.86)]; }
      return wall[v];
    }
    for (var q = 0; q < segs.length; q += 2) {
      var A = wallV(segs[q]), B = wallV(segs[q + 1]);
      idx.push(A[1], B[1], B[0], A[1], B[0], A[0]);
    }
    return { pos: new Float32Array(pos), uv: new Float32Array(uv), col: new Float32Array(col), idx: idx };
  }

  // rolled hem along the open edges (hem, cuffs, neck, waist, ankles): a thin round edge
  function edgeRoll(G, P) {
    var S = P.openSeg, at = {}, used = new Uint8Array(S.length / 2), lines = [];
    for (var q = 0; q < S.length / 2; q++) { (at[S[2 * q]] = at[S[2 * q]] || []).push(q); (at[S[2 * q + 1]] = at[S[2 * q + 1]] || []).push(q); }
    for (var s0 = 0; s0 < S.length / 2; s0++) {
      if (used[s0]) continue;
      used[s0] = 1;
      var line = [S[2 * s0], S[2 * s0 + 1]];
      [1, 0].forEach(function (dirn) {
        for (var guard = 0; guard < 100000; guard++) {
          var end = dirn ? line[line.length - 1] : line[0], cand = at[end] || [], nx = -1;
          for (var c = 0; c < cand.length; c++) if (!used[cand[c]]) { nx = cand[c]; break; }
          if (nx < 0) break;
          used[nx] = 1;
          var other = S[2 * nx] === end ? S[2 * nx + 1] : S[2 * nx];
          if (dirn) line.push(other); else line.unshift(other);
        }
      });
      if (line.length > 3) lines.push(line);
    }
    var pos = [], col = [], idx = [], SEG = 6, R = 0.0062, rgb = P.sign > 0 ? G.rgbF : G.rgbB;
    var lin = function (v) { return Math.pow(v / 255, 2.2) * 0.9; };
    lines.forEach(function (ln) {
      var base = pos.length / 3, Pp = P.pos;
      for (var k = 0; k < ln.length; k++) {
        var v = ln[k], a = ln[Math.max(0, k - 1)], b = ln[Math.min(ln.length - 1, k + 1)];
        var tx = Pp[b * 3] - Pp[a * 3], ty = Pp[b * 3 + 1] - Pp[a * 3 + 1], tz = Pp[b * 3 + 2] - Pp[a * 3 + 2], tl = Math.hypot(tx, ty, tz) || 1;
        tx /= tl; ty /= tl; tz /= tl;
        var ref = Math.abs(tz) < 0.9 ? [0, 0, 1] : [1, 0, 0];
        var n1 = [ty * ref[2] - tz * ref[1], tz * ref[0] - tx * ref[2], tx * ref[1] - ty * ref[0]], nl = Math.hypot(n1[0], n1[1], n1[2]) || 1;
        n1 = [n1[0] / nl, n1[1] / nl, n1[2] / nl];
        var n2 = [ty * n1[2] - tz * n1[1], tz * n1[0] - tx * n1[2], tx * n1[1] - ty * n1[0]];
        var ci = P.openIn[v] * 4, cc = rgb[ci + 3] > 100 ? [lin(rgb[ci]), lin(rgb[ci + 1]), lin(rgb[ci + 2])] : [0.05, 0.05, 0.05];
        for (var s = 0; s < SEG; s++) {
          var th = (s / SEG) * Math.PI * 2, cA = Math.cos(th) * R, sA = Math.sin(th) * R;
          pos.push(Pp[v * 3] + n1[0] * cA + n2[0] * sA, Pp[v * 3 + 1] + n1[1] * cA + n2[1] * sA, Pp[v * 3 + 2] + n1[2] * cA + n2[2] * sA);
          col.push(cc[0], cc[1], cc[2]);
        }
      }
      for (k = 0; k < ln.length - 1; k++) for (var s2 = 0; s2 < SEG; s2++) {
        var i0 = base + k * SEG + s2, i1 = base + k * SEG + ((s2 + 1) % SEG), i2 = i0 + SEG, i3 = i1 + SEG;
        idx.push(i0, i2, i1, i1, i2, i3);
      }
    });
    return { pos: new Float32Array(pos), col: new Float32Array(col), idx: idx };
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
      var P = ln.map(function (p) { var w = shape.warp(p[0], p[1]); return [(w[0] - 300) / 100, -w[1] / 100, shape.zoff(p[0], p[1]) / 100]; });
      var base = pos.length / 3;
      for (var k = 0; k < P.length; k++) {
        var a = P[Math.max(0, k - 1)], b = P[Math.min(P.length - 1, k + 1)];
        var tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        var nx = -ty, ny = tx, c = colourAt(ln[k][2], ln[k][3]);
        for (var s = 0; s < SEG; s++) {
          var th = (s / SEG) * Math.PI * 2, cz = Math.cos(th) * R, cn = Math.sin(th) * R * 0.75;
          pos.push(P[k][0] + nx * cn, P[k][1] + ny * cn, P[k][2] + cz);
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

  // ------------------------------------------------------------------ fabric micro-structure (normal, roughness and fibre maps)
  /*
   * Each fabric is drawn as a 512 px tile holding many knit / weave repeats, with irregular
   * yarns (jittered, slubbed), fibre fuzz and roughness that differs between yarn tops and
   * valleys. The tile repeats at thread scale (about 1.5 mm per repeat), so the cloth stays
   * crisp right up to 3x zoom; colour mottling is sampled at another scale to hide repeats.
   */
  var TILE = 512, tileCache = {};
  // [artwork units per weave repeat, repeats per tile, relief]
  var WEAVE = { ARCTIX: [1.5, 32, 1.5], HEXA: [3.2, 16, 1.9], AGILIS: [1.4, 32, 1.3], QUADRA: [2.6, 16, 1.7], MICROTEX: [1.1, 32, 1.1], TASLAN: [1.1, 32, 1.2], RIPSTOP: [5.6, 8, 1.5], MESH: [2.8, 16, 2.2] };
  function yarn(t) { var q = (t - 0.5) * 2; return Math.sqrt(Math.max(0, 1 - q * q)); }
  function plainWeave(x, y) { // one repeat = 2 x 2 yarn crossings
    var X = x * 2, Y = y * 2, i = Math.floor(X), j = Math.floor(Y), fx = X - i, fy = Y - j, over = ((i + j) & 1) === 0;
    var warp = yarn(fx) * (over ? 0.62 + 0.38 * Math.sin(Math.PI * fy) : 0.5), weft = yarn(fy) * (over ? 0.5 : 0.62 + 0.38 * Math.sin(Math.PI * fx));
    return Math.max(warp, weft);
  }
  function fabricHeight(fabric, x, y) { // x, y in 0..1 (one repeat)
    var TAU = Math.PI * 2, fr = function (v) { return v - Math.floor(v); };
    switch (fabric) {
      case 'HEXA': {
        var best = 9; [[0.5, 0.25], [0, 0.75], [1, 0.75], [0.5, 1.25], [0.5, -0.25], [0, -0.25], [1, -0.25], [0, 1.25], [1, 1.25]].forEach(function (c) { best = Math.min(best, Math.hypot((x - c[0]) * 1.15, y - c[1])); });
        return smooth(0.1, 0.22, best) * (0.88 + 0.12 * Math.sin(TAU * 4 * (x + y)));
      }
      case 'AGILIS': return (0.5 + 0.5 * Math.sin(TAU * (x + y))) * (0.8 + 0.2 * Math.cos(TAU * 3 * (x - y)));
      case 'QUADRA': { var ex = Math.abs(fr(x) - 0.5), ey = Math.abs(fr(y) - 0.5); return (0.35 + 0.65 * smooth(0.33, 0.45, Math.max(ex, ey))) * (0.9 + 0.1 * Math.sin(TAU * 6 * x)); }
      case 'MICROTEX': return (0.5 + 0.5 * Math.sin(TAU * 2 * (x + 0.5 * y))) * (0.85 + 0.15 * Math.cos(TAU * 4 * (x - y)));
      case 'TASLAN': return plainWeave(x, y);
      case 'RIPSTOP': { var gx = Math.min(fr(x), 1 - fr(x)), gy = Math.min(fr(y), 1 - fr(y)); return Math.max(plainWeave(fr(x * 4), fr(y * 4)) * 0.78, 1 - smooth(0.015, 0.05, Math.min(gx, gy))); }
      case 'MESH': return smooth(0.18, 0.3, Math.hypot(x - 0.5, y - 0.5)) * (0.86 + 0.14 * Math.sin(TAU * 5 * (x - y)));
      default: { // ARCTIX jersey knit: interlocking V loops, each a twisted multi-filament yarn
        var l = function (cx, ang) {
          var dx = x - cx, dy = y - 0.5, c = Math.cos(ang), s = Math.sin(ang), u = dx * c - dy * s, v = dx * s + dy * c;
          return Math.max(0, 1 - (u * u) / 0.03 - (v * v) / 0.16) * (0.84 + 0.16 * Math.sin(v * 40 + u * 18));
        };
        return Math.max(l(0.25, 0.42), l(0.75, -0.42), l(-0.25, -0.42), l(1.25, 0.42));
      }
    }
  }
  function fabricTiles(fabric) {
    if (tileCache[fabric]) return tileCache[fabric];
    var cfg = WEAVE[fabric] || WEAVE.ARCTIX, R = cfg[1], N = TILE, Hh = new Float32Array(N * N), Hb = new Float32Array(N * N), Fb = new Float32Array(N * N);
    var wrap = function (a, L) { return ((a % L) + L) % L; };
    function pn(u, v, L, s) { // periodic value noise, L cells per tile
      var X = u * L, Y = v * L, i = Math.floor(X), j = Math.floor(Y), fx = X - i, fy = Y - j; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var i0 = wrap(i, L), i1 = wrap(i + 1, L), j0 = wrap(j, L), j1 = wrap(j + 1, L);
      return lerp(lerp(hash(i0, j0, s), hash(i1, j0, s), fx), lerp(hash(i0, j1, s), hash(i1, j1, s), fx), fy);
    }
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var u = (x + 0.5) / N, v = (y + 0.5) / N, k = y * N + x;
      var X = u * R + (pn(u, v, 8, 1) - 0.5) * 0.35, Y = v * R + (pn(u, v, 8, 2) - 0.5) * 0.35, i = Math.floor(X), j = Math.floor(Y);
      var base = fabricHeight(fabric, X - i, Y - j);
      var slub = 0.84 + 0.32 * hash(wrap(i, R), wrap(j, R), 5); // uneven yarns
      var fib = pn(u, v, 128, 3) * 0.55 + pn(u, v, 256, 4) * 0.45; // fibre fuzz
      Hb[k] = base * slub; Hh[k] = Hb[k] + (fib - 0.5) * 0.2; Fb[k] = fib;
    }
    var mk = function () { var c = document.createElement('canvas'); c.width = c.height = N; return c; };
    var nc = mk(), rc = mk(), nx_ = nc.getContext('2d'), rx_ = rc.getContext('2d'), ni = nx_.createImageData(N, N), ri = rx_.createImageData(N, N), S = cfg[2];
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      k = y * N + x;
      var hx = Hh[y * N + ((x + 1) % N)] - Hh[y * N + ((x + N - 1) % N)], hy = Hh[((y + 1) % N) * N + x] - Hh[((y + N - 1) % N) * N + x];
      var nx = -hx * S, ny = hy * S, l = Math.hypot(nx, ny, 1), o = k * 4;
      ni.data[o] = (nx / l * 0.5 + 0.5) * 255; ni.data[o + 1] = (ny / l * 0.5 + 0.5) * 255; ni.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; ni.data[o + 3] = 255;
      ri.data[o] = pn((x + 0.5) / N, (y + 0.5) / N, 5, 9) * 255; // colour mottling (sampled at another scale)
      ri.data[o + 1] = clamp(0.72 + 0.28 * (1 - Hb[k]) + (Fb[k] - 0.5) * 0.14, 0, 1) * 255; // roughness: yarn tops a touch glossier
      ri.data[o + 2] = clamp(0.25 + 0.75 * Hb[k] + (Fb[k] - 0.5) * 0.2, 0, 1) * 255; // per-yarn brightness
      ri.data[o + 3] = 255;
    }
    nx_.putImageData(ni, 0, 0); rx_.putImageData(ri, 0, 0);
    return (tileCache[fabric] = { normal: nc, rough: rc, cfg: cfg });
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
    var big = renderer.capabilities.maxTextureSize >= 8192 && !COARSE;
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

  function geom(o) {
    var f32 = function (a) { return a instanceof Float32Array ? a : new Float32Array(a); };
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(f32(o.pos), 3));
    if (o.uv) g.setAttribute('uv', new T.BufferAttribute(f32(o.uv), 2));
    if (o.col) g.setAttribute('color', new T.BufferAttribute(f32(o.col), 3));
    g.setIndex(o.idx);
    g.computeVertexNormals();
    return g;
  }

  function texture(canvas, isColour, repeat) {
    var t = new T.CanvasTexture(canvas);
    if (isColour) t.encoding = T.sRGBEncoding;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  // fabric maps are sampled at thread scale (vUv * uWeave) instead of once across the garment
  function enhance(mat, weave) {
    if (!weave) return mat;
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uWeave = { value: weave };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec2 uWeave;')
        .replace('#include <normal_fragment_maps>', T.ShaderChunk.normal_fragment_maps.split('texture2D( normalMap, vUv )').join('texture2D( normalMap, vUv * uWeave )'))
        .replace('#include <roughnessmap_fragment>', T.ShaderChunk.roughnessmap_fragment.split('texture2D( roughnessMap, vUv )').join('texture2D( roughnessMap, vUv * uWeave )'))
        .replace('#include <map_fragment>', '#include <map_fragment>\n#ifdef USE_ROUGHNESSMAP\n{ vec4 fb = texture2D( roughnessMap, vUv * uWeave ); float mo = texture2D( roughnessMap, vUv * uWeave * 0.371 + 0.37 ).r; diffuseColor.rgb *= ( 0.88 + 0.2 * fb.b ) * ( 0.965 + 0.07 * mo ); }\n#endif');
    };
    mat.customProgramCacheKey = function () { return 'tmz-weave'; };
    return mat;
  }

  function materials(cv, fabric, vb) {
    var tl = fabricTiles(fabric), per = tl.cfg[0] * tl.cfg[1], weave = new T.Vector2(vb[2] / per, vb[3] / per);
    var nrm = texture(tl.normal, false, true), rgh = texture(tl.rough, false, true);
    var outer = function (map, side) {
      return enhance(new T.MeshPhysicalMaterial({
        map: map, normalMap: nrm, normalScale: new T.Vector2(0.7, 0.7), roughnessMap: rgh, roughness: 0.9, metalness: 0,
        sheen: new T.Color(0.26, 0.26, 0.27), side: side || T.FrontSide, envMapIntensity: 0.95, vertexColors: true,
      }), weave);
    };
    var inner = function (map) {
      return enhance(new T.MeshStandardMaterial({ map: map, normalMap: nrm, normalScale: new T.Vector2(0.5, 0.5), roughnessMap: rgh, roughness: 1, metalness: 0, side: T.BackSide, envMapIntensity: 0.55 }), weave);
    };
    var mf = texture(cv.front, true), mb = texture(cv.back, true), inF = texture(cv.inFront, true), inB = texture(cv.inBack, true);
    return {
      outerF: outer(mf), outerB: outer(mb), layerF: outer(mf, T.DoubleSide), layerB: outer(mb, T.DoubleSide), innerF: inner(inF), innerB: inner(inB),
      seam: enhance(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, envMapIntensity: 0.8 })),
      metal: enhance(new T.MeshPhysicalMaterial({ color: 0xc6c8cb, metalness: 1, roughness: 0.3, envMapIntensity: 1.15, clearcoat: 0.3, clearcoatRoughness: 0.2 })),
      maps: [mf, mb, inF, inB, nrm, rgh],
    };
  }

  function disposeModel() {
    if (!model) return;
    model.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.userData.own) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    });
    pivot.remove(model); model = null;
  }

  // ------------------------------------------------------------------ 3D hardware
  function bake(g, F, off) { // place a part built in a local frame (x right, y up, z out) on the garment
    var m = new T.Matrix4().makeBasis(new T.Vector3().fromArray(F.r), new T.Vector3().fromArray(F.u), new T.Vector3().fromArray(F.n));
    m.setPosition(F.p[0] + (F.n[0] * off) / 100, F.p[1] + (F.n[1] * off) / 100, F.p[2] + (F.n[2] * off) / 100);
    g.applyMatrix4(m);
    return g;
  }
  function merge(list) {
    var P = [], Nn = [], I = [], base = 0;
    list.forEach(function (g) {
      var p = g.attributes.position, nr = g.attributes.normal;
      for (var i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); Nn.push(nr.getX(i), nr.getY(i), nr.getZ(i)); }
      if (g.index) for (i = 0; i < g.index.count; i++) I.push(g.index.getX(i) + base); else for (i = 0; i < p.count; i++) I.push(i + base);
      base += p.count;
      g.dispose();
    });
    var out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(Nn, 3));
    out.setIndex(I);
    return out;
  }
  function roundRect(w, h, r, hole) {
    var s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    if (hole) { var p = new T.Path(); p.absellipse(hole[0], hole[1], hole[2], hole[3], 0, Math.PI * 2, true); s.holes.push(p); }
    return s;
  }
  function buttonTexture(colour) {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d'), base = new T.Color(colour || '#222'), dark = 0.2126 * base.r + 0.7152 * base.g + 0.0722 * base.b < 0.25;
    x.fillStyle = colour || '#222'; x.fillRect(0, 0, 128, 128);
    var g = x.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = dark ? '#d9d9d9' : '#f4f4f4'; x.lineWidth = 6; x.lineCap = 'round';
    x.beginPath(); x.moveTo(50, 50); x.lineTo(78, 78); x.moveTo(78, 50); x.lineTo(50, 78); x.stroke();
    x.fillStyle = 'rgba(0,0,0,.75)';
    [[50, 50], [78, 50], [50, 78], [78, 78]].forEach(function (h) { x.beginPath(); x.arc(h[0], h[1], 6, 0, Math.PI * 2); x.fill(); });
    var t = texture(c, true); return t;
  }
  function cordTexture() {
    var c = document.createElement('canvas'); c.width = 32; c.height = 32;
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 32, 32);
    x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 3;
    for (var k = -32; k < 64; k += 8) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 32, 32); x.stroke(); x.beginPath(); x.moveTo(k + 32, 0); x.lineTo(k, 32); x.stroke(); }
    return texture(c, true, true);
  }

  function hardware(G, panels, shape, HW, M) {
    var out = [];
    var plastic = function (col, opts) {
      var m = enhance(new T.MeshPhysicalMaterial(Object.assign({ color: new T.Color(col || '#f2f2f2'), roughness: 0.38, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.3, side: T.DoubleSide }, opts || {})));
      return m;
    };
    var addMesh = function (g, mat, own) { var m = new T.Mesh(g, mat); m.castShadow = m.receiveShadow = true; m.userData.own = !!own; out.push(m); };
    [['front', panels[0]], ['back', panels[1]]].forEach(function (pv) {
      var H = HW[pv[0]], P = pv[1];
      if (!H) return;
      var X = function (x) { return P.artX(x); };
      var frame = function (x, y) { return frameAt(G, P, shape, X(x), y); };
      var liftAt = function (x, y) { return P.at(P.LIFTs, X(x), y); };
      // buttons: dished, rimmed, four-hole, cross-stitched
      H.bn.forEach(function (b) {
        var R = b.r * 1.12, th = 1.6, pr = [[0.01, 0.78], [0.42, 0.8], [0.66, 0.93], [0.8, 1], [0.92, 0.94], [1, 0.62], [0.97, 0.2], [0.86, 0], [0.01, 0]];
        var g = new T.LatheGeometry(pr.map(function (q) { return new T.Vector2(q[0] * R, q[1] * th); }), 32);
        var p = g.attributes.position, uvA = new Float32Array(p.count * 2);
        for (var i = 0; i < p.count; i++) { uvA[i * 2] = p.getX(i) / (2 * R) + 0.5; uvA[i * 2 + 1] = 0.5 - p.getZ(i) / (2 * R); }
        g.setAttribute('uv', new T.BufferAttribute(uvA, 2));
        g.rotateX(Math.PI / 2); g.scale(0.01, 0.01, 0.01);
        var F = frame(b.x, b.y);
        addMesh(bake(g, F, P.at(P.LIFT, X(b.x), b.y) + 0.05), plastic('#ffffff', { map: buttonTexture(b.col), roughness: 0.3, clearcoat: 0.6 }), true);
      });
      // zip: interlocking teeth along the tape, slider and pull tab
      H.zt.forEach(function (z) {
        var teeth = [], slider = H.zp[0], top = slider ? slider.y - slider.h / 2 + 2 : z.y0;
        for (var y = Math.max(z.y0 + 1, top), k = 0; y < z.y1 - 0.5; y += 1.05, k++) {
          var side = k % 2 ? 1 : -1, g = new T.BoxGeometry(2.5, 1.0, 1.0);
          g.translate(side * 0.6, 0, 0); g.scale(0.01, 0.01, 0.01);
          var F = frame(z.x, y);
          teeth.push(bake(g, F, (P.at(P.LIFT, X(z.x), y) || 1.2) + 0.45));
        }
        if (teeth.length) addMesh(merge(teeth), M.metal);
      });
      H.zp.forEach(function (zp) {
        var y0 = zp.y - zp.h / 2 + 4.5, F = frame(zp.x, y0), lift = Math.max(liftAt(zp.x, y0), 1.2);
        var body = new T.ExtrudeGeometry(roundRect(8.4, 7.4, 2.2), { depth: 1.6, bevelEnabled: true, bevelThickness: 0.55, bevelSize: 0.55, bevelSegments: 2, curveSegments: 6 });
        body.scale(0.01, 0.01, 0.01);
        var tab = new T.ExtrudeGeometry(roundRect(5.6, 13, 2.4, [0, 4.2, 1.5, 2.1]), { depth: 0.7, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.3, bevelSegments: 2, curveSegments: 8 });
        tab.translate(0, -6.5, 0); tab.rotateX(-0.28); tab.translate(0, 0.5, 2.0); tab.scale(0.01, 0.01, 0.01);
        addMesh(merge([bake(body, F, lift + 0.3), bake(tab, F, lift + 0.3)]), M.metal);
      });
      // cords with braided texture, and their tips (plastic toggles / metal aglets)
      H.ds.forEach(function (cd) {
        var K = 30, pts = [], flat = [], r = cd.w / 2 + 0.1;
        for (var k = 0; k <= K; k++) {
          var t = k / K, u = 1 - t, x = u * u * cd.p0[0] + 2 * u * t * cd.c[0] + t * t * cd.p1[0], y = u * u * cd.p0[1] + 2 * u * t * cd.c[1] + t * t * cd.p1[1];
          var F = frame(x, y), off = liftAt(x, y) + r + 0.2 + 1.6 * Math.pow(t, 1.6);
          pts.push(new T.Vector3(F.p[0] + (F.n[0] * off) / 100, F.p[1] + (F.n[1] * off) / 100, F.p[2] + (F.n[2] * off) / 100)); flat.push([X(x), y, t]);
        }
        var curve = new T.CatmullRomCurve3(pts), TS = 60, RS = 8, tube = new T.TubeGeometry(curve, TS, r / 100, RS, false);
        var len = 0; for (k = 1; k < pts.length; k++) len += pts[k].distanceTo(pts[k - 1]);
        var tex = cordTexture(); tex.repeat.set((len * 100) / 2.4, 1);
        addMesh(tube, enhance(new T.MeshPhysicalMaterial({ color: new T.Color(cd.col || '#ffffff'), map: tex, roughness: 0.62, sheen: new T.Color(0.3, 0.3, 0.3), metalness: 0 })), true);
        // tip at the cord end
        var end = pts[pts.length - 1], dir = new T.Vector3().subVectors(end, pts[pts.length - 3]).normalize();
        var best = null, bd = 1e9;
        H.dt.concat(H.ag).forEach(function (tp) { var d = Math.hypot(tp.x - cd.p1[0], tp.y - cd.p1[1]); if (d < bd) { bd = d; best = tp; } });
        if (!best || bd > 14) return;
        var metal = H.ag.indexOf(best) >= 0, L = metal ? 10 : 7.5, R = metal ? r * 1.35 : r * 1.9;
        var prof = metal ? [[0.01, -0.5], [0.8, -0.5], [1, -0.42], [1, 0.42], [0.86, 0.5], [0.01, 0.5]] : [[0.01, -0.5], [0.7, -0.5], [0.97, -0.36], [1, 0.1], [0.82, 0.44], [0.55, 0.5], [0.01, 0.5]];
        var g = new T.LatheGeometry(prof.map(function (q) { return new T.Vector2(q[0] * R, q[1] * L); }), 20);
        g.scale(0.01, 0.01, 0.01);
        g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir)));
        g.translate(end.x + (dir.x * (L / 2 - 1)) / 100, end.y + (dir.y * (L / 2 - 1)) / 100, end.z + (dir.z * (L / 2 - 1)) / 100);
        if (metal) addMesh(g, M.metal); else addMesh(g, plastic(best.col), true);
      });
      // metal eyelets round the cord exits
      H.ey.forEach(function (e) {
        var g = new T.TorusGeometry(e.r * 0.92, 0.75, 10, 28); g.scale(0.01, 0.01, 0.01);
        addMesh(bake(g, frame(e.x, e.y), P.at(P.LIFT, X(e.x), e.y) + 0.3), M.metal);
      });
    });
    return out;
  }

  function build() {
    var A = st.assets, meta = A.meta, female = st.gender === 'female', M = A.mats, G = A.G;
    disposeModel();
    model = new T.Group();
    var shape = bodyShape(meta, female);
    var front = panelGeometry(G, shape, 1, A.LM.front), back = panelGeometry(G, shape, -1, A.LM.back);
    var gf = geom(front), gb = geom(back);
    [[gf, front.seamV], [gb, back.seamV]].forEach(function (pr) { // smooth light across the seam
      var nrm = pr[0].attributes.normal, sv = pr[1];
      for (var q = 0; q < sv.length; q += 3) nrm.setXYZ(sv[q], sv[q + 1], sv[q + 2], 0);
      nrm.needsUpdate = true;
    });
    var add = function (g, mat, cast, receive) { var m = new T.Mesh(g, mat); m.castShadow = !!cast; m.receiveShadow = !!receive; model.add(m); return m; };
    add(gf, M.outerF, true, true); add(gf, M.innerF); add(gb, M.outerB, true, true); add(gb, M.innerB);
    var sg = seamGeometry(G, A.seams, shape);
    if (sg.idx.length) add(geom(sg), M.seam);
    [front, back].forEach(function (P) { var er = edgeRoll(G, P); if (er.idx.length) add(geom(er), M.seam, false, true); });
    // raised layers
    [[front, A.LM.front, M.layerF], [back, A.LM.back, M.layerB]].forEach(function (pl) {
      if (!pl[1]) return;
      pl[1].list.forEach(function (L) { var lg = layerGeometry(G, pl[0], shape, pl[1], L); if (lg) add(geom(lg), pl[2], true, true); });
    });
    hardware(G, [front, back], shape, A.HW, M).forEach(function (m) { model.add(m); });
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
        var size = !COARSE && renderer.capabilities.maxTextureSize >= 8192 ? 4096 : 2048;
        return Promise.all([rasterize(root + data.f, meta.vb, size, 'front'), rasterize(root + data.b, meta.vb, size, 'back')]).then(function (cv) {
          var G = analyse(meta, cv[0].canvas, cv[1].canvas);
          return Promise.all([
            insideCanvas(meta, cv[0].svg, cv[1].svg, 'front', data.tr, 2048), insideCanvas(meta, cv[0].svg, cv[1].svg, 'back', data.tr, 2048),
            layerMasks(cv[0].svg, meta.vb, G.GX * 4), layerMasks(cv[1].svg, meta.vb, G.GX * 4),
          ]).then(function (r) {
            if (st.assets) st.assets.mats.maps.forEach(function (t) { t.dispose(); });
            var mats = materials({ front: bleed(cv[0].canvas), back: bleed(cv[1].canvas), inFront: r[0], inBack: r[1] }, data.fb || 'ARCTIX', meta.vb);
            return { key: key_, meta: meta, G: G, seams: seamLines(G), mats: mats, LM: { front: r[2], back: r[3] }, HW: { front: parseHardware(cv[0].svg), back: parseHardware(cv[1].svg) } };
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

  window.TMZ3D = { open: open, close: close, _state: st, _debug: function () { return { T: T, renderer: renderer, scene: scene, model: model, key: key }; } };
})();

/*
 * TMZ 3D viewer
 * ---------------------------------------------------------------------------
 * Shows a product on a mannequin in an interactive WebGL popup.
 *  - The garment is built from the product's own front/back artwork: the flat
 *    silhouette is "inflated" into a 3D shell (round sleeves, oval body, open
 *    neck, hem and cuffs) and the artwork is wrapped on as a texture.
 *  - A procedural male or female mannequin is posed inside it: torso + arms for
 *    tops, waist + legs for pants. Mannequin vertices are kept inside the shell.
 *  - Drag rotates freely about any axis (arcball), Shift-drag / two-finger twist
 *    rolls about the view axis, wheel / pinch zooms 1x-10x toward the pointer,
 *    right-drag / two-finger drag pans.
 * Loaded on demand by main.js; three.js is fetched from a pinned CDN build.
 * The META table (garment landmarks per cut) is injected by src/build.js.
 */
(function () {
  'use strict';
  var META = /*__META__*/ {"tee":{"type":"top","nL":[250,104],"sL":[166,126],"aL":[194,224],"hL":[196,492],"hemY":499,"sleeve":{"top":[[166,126],[84,224]],"bot":[[194,224],[134,274]]},"vb":[66,78,468,468]},"long":{"type":"top","nL":[252,100],"sL":[170,120],"aL":[196,236],"hL":[198,496],"hemY":502,"sleeve":{"top":[[170,120],[80,456]],"bot":[[196,236],[128,466]]},"vb":[46,14,508,508]},"wide":{"type":"top","nL":[262,176],"sL":[204,190],"aL":[214,270],"hL":[218,440],"hemY":444,"sleeve":{"top":[[204,190],[36,236]],"bot":[[214,270],[40,290]]},"vb":[24,36,552,552]},"vest":{"type":"top","nL":[258,96],"sL":[220,98],"aL":[174,252],"hL":[180,496],"hemY":503,"sleeve":null,"vb":[75,78,450,450]},"pants":{"type":"bottom","waistY":88,"bandY":116,"hipY":200,"crotch":[300,270],"ankleY":568,"ankleL":[[212,556],[270,556]],"waist":[200,400],"vb":[120,70,360,516]}};
  var THREE_SRC = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
  var MAX_ZOOM = 10;
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
      img.onerror = function () { rej(new Error('Could not load ' + src)); };
      img.src = src;
    });
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } return null; }
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var mid = function (p, q) { return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
  var sub = function (p, q) { return [p[0] - q[0], p[1] - q[1]]; };
  var add = function (p, q, s) { s = s === undefined ? 1 : s; return [p[0] + q[0] * s, p[1] + q[1] * s]; };
  var len = function (v) { return Math.hypot(v[0], v[1]); };
  var norm = function (v) { var l = len(v) || 1; return [v[0] / l, v[1] / l]; };
  var mx = function (p) { return [600 - p[0], p[1]]; };

  // Catmull-Rom style interpolation of keyed numeric records
  function interpKeys(keys, perSeg) {
    var out = [];
    var props = Object.keys(keys[0]).filter(function (k) { return typeof keys[0][k] === 'number'; });
    for (var i = 0; i < keys.length - 1; i++) {
      var k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
      for (var s = 0; s < perSeg; s++) {
        var t = s / perSeg, t2 = t * t, t3 = t2 * t, r = {};
        props.forEach(function (p) {
          var p0 = k0[p], p1 = k1[p], p2 = k2[p], p3 = k3[p];
          var v = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
          // keep radii monotone between keys to avoid overshoot bumps
          if (p !== 't' && p !== 'y' && p !== 'z') v = clamp(v, Math.min(p1, p2) * 0.97, Math.max(p1, p2) * 1.03);
          r[p] = v;
        });
        out.push(r);
      }
    }
    out.push(Object.assign({}, keys[keys.length - 1]));
    return out;
  }

  // ------------------------------------------------------------------ garment analysis
  /*
   * Rasterises the front artwork's alpha into a grid, opens the neck / hem /
   * cuffs (so the shell stays full-depth there), then inflates the silhouette:
   * every cell gets a height from its distance to the edge and the radius of
   * the largest inscribed disc covering it, giving round sleeves and an oval
   * body.
   */
  function analyse(meta, img) {
    var vb = meta.vb, cell = vb[2] / GRID, GX = GRID, GY = Math.round(vb[3] / cell), N = GX * GY;
    var cv = document.createElement('canvas'); cv.width = GX; cv.height = GY;
    var cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, GX, GY);
    var a = cx.getImageData(0, 0, GX, GY).data;
    var mask = new Uint8Array(N), aug = new Uint8Array(N), cov = new Float32Array(N);
    for (var i = 0; i < N; i++) { cov[i] = a[i * 4 + 3] / 255; mask[i] = cov[i] > 0.43 ? 1 : 0; }

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
    for (i = 0; i < N; i++) if (d[i] >= INF) d[i] = GX; // whole rows open to the grid edge

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
      // ease the last few cells so front and back panels close at the seams
      var e = clamp(dp / (2.6 * cell), 0, 1); e = e * e * (3 - 2 * e);
      h[i] = k * Math.sqrt(Math.max(0, 2 * Rp * dp - dp * dp)) * (0.25 + 0.75 * e) * (dp > 0 ? 1 : 0);
    }
    // two light blur passes inside the shape
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
    // along real seams the panels cross the mid-plane exactly where the artwork's
    // antialiased edge is (just inside coverage 0.5), so front and back overlap without gaps or steps
    for (i = 0; i < N; i++) if (!aug[i] || d[i] < 1.6) h[i] = (cov[i] - 0.72) * 9;
    return { vb: vb, cell: cell, GX: GX, GY: GY, mask: mask, aug: aug, h: h };
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
    var s = sigma(meta), nL = meta.nL, hL = meta.hL;
    P.push([[hL[0] - 4, hL[1] - 30], [604 - hL[0], hL[1] - 30], [604 - hL[0], meta.hemY + 220], [hL[0] - 4, meta.hemY + 220]]);
    P.push([[300 - 30 * s, nL[1] - 220], [300 + 30 * s, nL[1] - 220], [300 + 30 * s, nL[1] + 30 * s], [300 - 30 * s, nL[1] + 30 * s]]);
    if (meta.sleeve) {
      var s1 = meta.sleeve.top[1], b1 = meta.sleeve.bot[1];
      var dir = norm(sub(mid(s1, b1), mid(meta.sleeve.top[0], meta.sleeve.bot[0])));
      P.push([s1, b1, add(b1, dir, 220), add(s1, dir, 220)]);
      P.push([mx(s1), mx(b1), mx(add(b1, dir, 220)), mx(add(s1, dir, 220))]);
    }
    return P;
  }
  function sigma(meta) { return meta.type === 'bottom' ? 1 : (300 - meta.aL[0]) / 106; }

  function sampleH(G, arr, x, y) {
    var gx = (x - G.vb[0]) / G.cell - 0.5, gy = (y - G.vb[1]) / G.cell - 0.5;
    if (gx < 0 || gy < 0 || gx > G.GX - 1 || gy > G.GY - 1) return null;
    var x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    var x1 = Math.min(G.GX - 1, x0 + 1), y1 = Math.min(G.GY - 1, y0 + 1);
    var n = Math.round(gy) * G.GX + Math.round(gx);
    if (!G.mask[n]) return null;
    var v00 = arr[y0 * G.GX + x0], v10 = arr[y0 * G.GX + x1], v01 = arr[y1 * G.GX + x0], v11 = arr[y1 * G.GX + x1];
    return (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;
  }

  // ------------------------------------------------------------------ geometry builders (flat 600-unit space: x right, y down, z toward viewer)
  function bustBump(meta, x, y, amp) {
    var s = sigma(meta), cy = meta.aL[1] + 24 * s, sx = 26 * s, sy = 24 * s, v = 0;
    [300 - 40 * s, 300 + 40 * s].forEach(function (cxp) {
      v += Math.exp(-(((x - cxp) * (x - cxp)) / (2 * sx * sx) + ((y - cy) * (y - cy)) / (2 * sy * sy)));
    });
    return amp * s * v;
  }

  function garmentHeights(meta, G, female) {
    var hF = new Float32Array(G.h), hB = G.h;
    if (female && meta.type === 'top') {
      for (var j = 0; j < G.GY; j++) for (var i = 0; i < G.GX; i++) {
        var n = j * G.GX + i; if (!G.aug[n]) continue;
        hF[n] += bustBump(meta, G.vb[0] + (i + 0.5) * G.cell, G.vb[1] + (j + 0.5) * G.cell, 18);
      }
    }
    return { front: hF, back: hB };
  }

  function panelGeometry(G, heights, sign) {
    var GX = G.GX, GY = G.GY, N = GX * GY;
    var pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), idx = [];
    for (var j = 0; j < GY; j++) for (var i = 0; i < GX; i++) {
      var n = j * GX + i;
      pos[n * 3] = G.vb[0] + (i + 0.5) * G.cell;
      pos[n * 3 + 1] = G.vb[1] + (j + 0.5) * G.cell;
      pos[n * 3 + 2] = sign * heights[n];
      var u = (i + 0.5) / GX;
      uv[n * 2] = sign > 0 ? u : 1 - u;
      uv[n * 2 + 1] = 1 - (j + 0.5) / GY;
    }
    var keep = function (i, j) {
      for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
        var X = i + ox, Y = j + oy; if (X >= 0 && Y >= 0 && X < GX && Y < GY && G.mask[Y * GX + X]) return true;
      }
      return false;
    };
    for (j = 0; j < GY - 1; j++) for (i = 0; i < GX - 1; i++) {
      if (!keep(i, j) && !keep(i + 1, j + 1)) continue;
      var a = j * GX + i, b = a + 1, c = a + GX, d = c + 1;
      if (sign > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
    return { pos: pos, uv: uv, idx: idx };
  }

  // tube made of rings; each ring {c:[x,y,z], e1:[x,y,z], e2:[x,y,z], a, b}
  function ringTube(rings, seg) {
    seg = seg || 44;
    var pos = [], idx = [], caps = [];
    rings.forEach(function (r) {
      for (var k = 0; k < seg; k++) {
        var t = (k / seg) * Math.PI * 2, ca = Math.cos(t) * r.a, sb = Math.sin(t) * r.b;
        pos.push(r.c[0] + r.e1[0] * ca + r.e2[0] * sb, r.c[1] + r.e1[1] * ca + r.e2[1] * sb, r.c[2] + r.e1[2] * ca + r.e2[2] * sb);
      }
    });
    for (var i = 0; i < rings.length - 1; i++) for (var k = 0; k < seg; k++) {
      var a = i * seg + k, b = i * seg + ((k + 1) % seg), c = a + seg, d = b + seg;
      idx.push(a, b, c, b, d, c);
    }
    // caps (separate so they can use a different material)
    [0, rings.length - 1].forEach(function (ri, which) {
      var r = rings[ri], base = ri * seg, cp = [], ci = [];
      cp.push(r.c[0], r.c[1], r.c[2]);
      for (var k = 0; k < seg; k++) cp.push(pos[(base + k) * 3], pos[(base + k) * 3 + 1], pos[(base + k) * 3 + 2]);
      for (k = 0; k < seg; k++) { var p1 = 1 + k, p2 = 1 + ((k + 1) % seg); if (which === 0) ci.push(0, p2, p1); else ci.push(0, p1, p2); }
      caps.push({ pos: cp, idx: ci });
    });
    return { pos: pos, idx: idx, caps: caps };
  }

  function mirrorMesh(m) {
    var p = m.pos.slice();
    for (var i = 0; i < p.length; i += 3) p[i] = 600 - p[i];
    var idx = [];
    for (var j = 0; j < m.idx.length; j += 3) idx.push(m.idx[j], m.idx[j + 2], m.idx[j + 1]);
    return { pos: p, idx: idx };
  }

  // a limb along an in-plane axis; keys: [{t, a, b}] with t in 0..1 along length L
  function limb(start, dir, L, keys, z0) {
    var rings = interpKeys(keys, 5).map(function (k) {
      var c = add(start, dir, k.t * L);
      return { c: [c[0], c[1], z0 || 0], e1: [-dir[1], dir[0], 0], e2: [0, 0, 1], a: k.a, b: k.b };
    });
    return ringTube(rings, 36);
  }

  function mannequinTop(meta, female) {
    var s = sigma(meta), nL = meta.nL, yN = nL[1], yA = meta.aL[1], yH = meta.hemY;
    var J, dir, L;
    if (meta.sleeve) {
      var A0 = mid(meta.sleeve.top[0], meta.sleeve.bot[0]), A1 = mid(meta.sleeve.top[1], meta.sleeve.bot[1]);
      dir = norm(sub(A1, A0));
      J = add(A0, dir, -22 * s);
      L = Math.max(330 * s, len(sub(A1, J)) / 0.84);
    } else {
      J = [300 - 104 * s, yN + 46 * s];
      dir = norm([-0.32, 0.95]);
      L = 330 * s;
    }
    var Ws = 300 - J[0] + 8 * s, f = female;
    var keys = [
      { y: yN - 46 * s, a: 22 * s, b: 22 * s },
      { y: yN - 12 * s, a: (f ? 22 : 24) * s, b: (f ? 23 : 25) * s },
      { y: yN + 6 * s, a: 35 * s, b: 31 * s },
      { y: yN + 24 * s, a: Ws * 0.9, b: 40 * s },
      { y: yN + 24 * s + 0.45 * (yA - yN - 24 * s), a: Ws * (f ? 0.9 : 0.97), b: 47 * s },
      { y: yA + 12 * s, a: (f ? 84 : 92) * s, b: (f ? 47 : 54) * s },
      { y: yA + 0.5 * (yH - yA), a: (f ? 66 : 78) * s, b: (f ? 40 : 45) * s },
      { y: yH - 4 * s, a: (f ? 90 : 84) * s, b: (f ? 52 : 48) * s },
      { y: yH + 64 * s, a: (f ? 93 : 86) * s, b: (f ? 54 : 50) * s },
    ];
    var torso = ringTube(interpKeys(keys, 6).map(function (k) {
      return { c: [300, k.y, 0], e1: [1, 0, 0], e2: [0, 0, 1], a: k.a, b: k.b };
    }), 56);
    if (f) for (var i = 0; i < torso.pos.length; i += 3) if (torso.pos[i + 2] > 0) torso.pos[i + 2] += bustBump(meta, torso.pos[i], torso.pos[i + 1], 21);
    var g = f ? 0.88 : 1;
    var arm = limb(J, dir, L, [
      { t: 0, a: 29 * s * g, b: 29 * s * g }, { t: 0.07, a: 27 * s * g, b: 27 * s * g }, { t: 0.3, a: 23 * s * g, b: 23 * s * g },
      { t: 0.47, a: 17 * s * g, b: 17 * s * g }, { t: 0.56, a: 18.5 * s * g, b: 19 * s * g }, { t: 0.82, a: 12.5 * s * g, b: 13.5 * s * g },
      { t: 0.86, a: 9 * s * g, b: 14 * s * g }, { t: 0.92, a: 8 * s * g, b: 18 * s * g }, { t: 0.97, a: 7 * s * g, b: 15 * s * g }, { t: 1, a: 3 * s, b: 5 * s },
    ]);
    return { body: [torso, arm, mirrorMesh(arm), arm.caps[1], mirrorMesh(arm.caps[1])], caps: [torso.caps[0], torso.caps[1]] };
  }

  function mannequinBottom(meta, female) {
    var f = female, wy = meta.waistY;
    var keys = [
      { y: wy - 16, a: f ? 80 : 86, b: f ? 54 : 56 },
      { y: wy + 22, a: f ? 85 : 90, b: f ? 56 : 58 },
      { y: 170, a: f ? 106 : 98, b: f ? 64 : 62 },
      { y: 215, a: f ? 110 : 100, b: f ? 64 : 62 },
      { y: 252, a: f ? 98 : 90, b: f ? 58 : 56 },
      { y: 276, a: f ? 62 : 58, b: f ? 42 : 40 },
      { y: 288, a: 20, b: 16 },
    ];
    var pelvis = ringTube(interpKeys(keys, 6).map(function (k) { return { c: [300, k.y, 0], e1: [1, 0, 0], e2: [0, 0, 1], a: k.a, b: k.b }; }), 56);
    var Ak = mid(meta.ankleL[0], meta.ankleL[1]);
    var Hj = [300 - (f ? 54 : 50), 236];
    var dir = norm(sub(Ak, Hj)), L = len(sub(Ak, Hj));
    var leg = limb(Hj, dir, L, [
      { t: 0, a: f ? 52 : 50, b: f ? 52 : 50 }, { t: 0.1, a: f ? 50 : 49, b: f ? 50 : 49 }, { t: 0.3, a: 43, b: 43 },
      { t: 0.48, a: 33, b: 33 }, { t: 0.55, a: 31, b: 31 }, { t: 0.66, a: f ? 31 : 33, b: f ? 32 : 34 },
      { t: 0.85, a: 24, b: 24 }, { t: 0.95, a: 19, b: 19 }, { t: 1.04, a: 17, b: 17 }, { t: 1.08, a: 10, b: 10 },
    ]);
    // foot pointing toward the viewer (+z)
    var fy = Ak[1] + 18, fk = [
      { z: -18, a: 11, b: 10 }, { z: -12, a: 17, b: 17 }, { z: 6, a: 19, b: 18 }, { z: 36, a: 21, b: 12 },
      { z: 58, a: 17, b: 8 }, { z: 68, a: 6, b: 4 },
    ];
    var foot = ringTube(interpKeys(fk, 4).map(function (k) {
      return { c: [Ak[0] + (k.z > 0 ? -k.z * 0.06 : 0), fy + (k.z > 10 ? (k.z - 10) * 0.08 : 0), k.z], e1: [1, 0, 0], e2: [0, 1, 0], a: k.a, b: k.b };
    }), 28);
    return { body: [pelvis, leg, mirrorMesh(leg), leg.caps[1], mirrorMesh(leg.caps[1]), foot, mirrorMesh(foot), foot.caps[0], mirrorMesh(foot.caps[0]), foot.caps[1], mirrorMesh(foot.caps[1])], caps: [pelvis.caps[0]] };
  }

  // keep mannequin inside the garment shell where the garment covers it
  function conform(pos, G, H) {
    for (var i = 0; i < pos.length; i += 3) {
      var z = pos[i + 2];
      var h = sampleH(G, z >= 0 ? H.front : H.back, pos[i], pos[i + 1]);
      if (h === null) continue;
      var lim = Math.max(0, h * 0.92 - 1.5);
      if (Math.abs(z) > lim) pos[i + 2] = z >= 0 ? lim : -lim;
    }
  }

  // ------------------------------------------------------------------ three.js scene
  var T, ui, renderer, scene, camera, pivot, model, mats = {};
  var st = { zoom: 1, panX: 0, panY: 0, dist: 10, auto: true, raf: 0, gender: store('tmz3d_gender') || 'male', data: null, assets: null, last: 0, hold: null };

  function initScene() {
    if (renderer) return;
    T = window.THREE;
    renderer = new T.WebGLRenderer({ canvas: ui.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(26, 1, 0.1, 200);
    scene.add(new T.HemisphereLight(0xffffff, 0x8c8c8c, 0.5));
    var key = new T.DirectionalLight(0xffffff, 0.9); key.position.set(6, 7, 6); camera.add(key);
    var fill = new T.DirectionalLight(0xffffff, 0.26); fill.position.set(-8, 0, 5); camera.add(fill);
    var rim = new T.DirectionalLight(0xffffff, 0.45); rim.position.set(0, 5, -9); scene.add(rim);
    scene.add(camera);
    pivot = new T.Group(); scene.add(pivot);
    mats.skin = new T.MeshStandardMaterial({ color: 0xd8d2ca, roughness: 0.42, metalness: 0, side: T.DoubleSide });
    mats.cap = new T.MeshStandardMaterial({ color: 0x8a6a50, roughness: 0.55, metalness: 0, side: T.DoubleSide });
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
  // distance that fits the model at 1x for the current aspect ratio, whatever its rotation
  function fitDist() {
    var r = Math.max(st.size.x, st.size.y, st.size.z) * 0.5 + 0.15;
    var v = T.MathUtils.degToRad(camera.fov / 2), hz = Math.atan(Math.tan(v) * camera.aspect);
    st.dist = Math.max(r / Math.tan(v), r / Math.tan(hz)) * 1.02;
    camera.near = st.dist / 50; camera.far = st.dist * 4;
    if (ui) applyCamera();
  }

  function toWorld(pos) {
    var out = new Float32Array(pos.length);
    for (var i = 0; i < pos.length; i += 3) { out[i] = (pos[i] - 300) / 100; out[i + 1] = -pos[i + 1] / 100; out[i + 2] = pos[i + 2] / 100; }
    return out;
  }
  function meshFrom(m, mat, uv) {
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(toWorld(m.pos), 3));
    if (uv) g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    g.setIndex(m.idx);
    g.computeVertexNormals();
    return new T.Mesh(g, mat);
  }

  function makeTexture(img, vb) {
    var big = Math.min(2048, renderer.capabilities.maxTextureSize || 2048);
    var W = vb[2] >= vb[3] ? big : Math.round((big * vb[2]) / vb[3]), H = vb[2] >= vb[3] ? Math.round((big * vb[3]) / vb[2]) : big;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(img, 0, 0, W, H);
    var t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  function disposeModel() {
    if (!model) return;
    model.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    pivot.remove(model); model = null;
  }

  function build() {
    var A = st.assets, meta = A.meta, female = st.gender === 'female';
    disposeModel();
    model = new T.Group();
    var H = garmentHeights(meta, A.G, female);
    // garment
    var front = panelGeometry(A.G, H.front, 1), back = panelGeometry(A.G, H.back, -1);
    model.add(meshFrom(front, A.matF, front.uv));
    model.add(meshFrom(back, A.matB, back.uv));
    // mannequin
    var man = meta.type === 'bottom' ? mannequinBottom(meta, female) : mannequinTop(meta, female);
    man.body.forEach(function (m) { conform(m.pos, A.G, H); model.add(meshFrom(m, mats.skin)); });
    man.caps.forEach(function (c) { model.add(meshFrom(c, mats.cap)); });
    // centre the model on the pivot
    var box = new T.Box3().setFromObject(model), c = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
    model.position.sub(c);
    pivot.add(model);
    st.size = size;
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
    var lim = st.dist * 0.45;
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
      else if (mode === 'rotate') {
        var ang = Math.hypot(dx, dy) * 0.0085;
        rotateAxis([dy, dx, 0], ang);
      }
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
      else if (k === '+' || k === '=') setZoom(st.zoom * 1.25);
      else if (k === '-' || k === '_') setZoom(st.zoom / 1.25);
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
          '<div class="v3d-seg" role="group" aria-label="Mannequin"><button type="button" data-g="male">Male</button><button type="button" data-g="female">Female</button></div>' +
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
    root.querySelectorAll('[data-z]').forEach(function (b) { b.addEventListener('click', function () { setZoom(st.zoom * (b.dataset.z > 0 ? 1.25 : 0.8)); }); });
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
    var key = data.f + '|' + data.b;
    loadScript(THREE_SRC)
      .then(function () {
        initScene();
        if (st.assets && st.assets.key === key) return st.assets;
        return Promise.all([loadImage(root + data.f), loadImage(root + data.b)]).then(function (imgs) {
          if (st.assets) { st.assets.matF.map.dispose(); st.assets.matB.map.dispose(); }
          var G = analyse(meta, imgs[0]);
          var mk = function (img) { return new T.MeshStandardMaterial({ map: makeTexture(img, meta.vb), alphaTest: 0.5, side: T.DoubleSide, roughness: 0.82, metalness: 0 }); };
          return { key: key, meta: meta, G: G, matF: mk(imgs[0]), matB: mk(imgs[1]) };
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

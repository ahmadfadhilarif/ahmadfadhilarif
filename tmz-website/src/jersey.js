'use strict';
/*
 * TMZ jersey generator.
 * Produces flat "technical drawing" style jersey mockups (front + back) as
 * standalone SVG strings. Every design is procedural and seeded, so the same
 * spec always produces the same artwork.
 */
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- logo
const LOGO_SVG = fs.readFileSync(path.join(__dirname, '..', 'site', 'assets', 'img', 'logo', 'tmz-logo.svg'), 'utf8');
const LOGO_D = LOGO_SVG.match(/ d="([^"]+)"/)[1];
const [LVX, LVY, LVW, LVH] = LOGO_SVG.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);

/** TMZ mark centred at (cx, cy) with width w. */
function logo(cx, cy, w, fill, extra = '') {
  const s = w / LVW;
  const h = LVH * s;
  const tx = cx - w / 2 - LVX * s;
  const ty = cy - h / 2 - LVY * s;
  return `<g transform="translate(${r(tx)} ${r(ty)}) scale(${s.toFixed(5)})" fill="${fill}"${extra}><path transform="translate(0,2560) scale(0.1,-0.1)" d="${LOGO_D}"/></g>`;
}

// ---------------------------------------------------------------- utils
const r = (n) => Math.round(n * 10) / 10;
function rng(seed) {
  let a = 0;
  for (const ch of String(seed)) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) + 0x9e3779b9) | 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r_, g, b]) {
  return '#' + [r_, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}
const shade = (c, t) => (t < 0 ? mix(c, '#000000', -t) : mix(c, '#ffffff', t));
function lum(c) {
  const [R, G, B] = hexToRgb(c).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
const isDark = (c) => lum(c) < 0.33;
const X = (x) => 600 - x; // mirror helper

// ---------------------------------------------------------------- cuts
/*
 * Each cut returns the garment geometry in a 600x600 box:
 *  outline(view)  full silhouette (neck hole cut by the neckline)
 *  sleeves        [left, right] sleeve panel regions (for colour blocking)
 *  cuffs          cuff band polygons
 *  sides          side panel regions
 *  hem            hem band
 *  neck           neckline anchor points
 *  seams          decorative stitch lines
 *  chest          logo placement (front), nape (back)
 */
/** Same strip as band(), returned as its two edge points and the inward offset. */
function bandInfo(p1, p2, toward, width) {
  const mx_ = (p1[0] + p2[0]) / 2, my_ = (p1[1] + p2[1]) / 2;
  let dx = toward[0] - mx_, dy = toward[1] - my_;
  const L = Math.hypot(dx, dy);
  return { a: p1, b: p2, d: [(dx / L) * width, (dy / L) * width] };
}
/** Mirror an absolute path made of x,y pairs around the centre line. */
const mirrorPath = (d) => d.replace(/(-?[\d.]+)[ ,](-?[\d.]+)/g, (m, x, y) => `${r(600 - +x)} ${y}`);

function band(p1, p2, toward, width) {
  // polygon strip along segment p1-p2 offset toward point `toward`
  const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
  let dx = toward[0] - mx, dy = toward[1] - my;
  const L = Math.hypot(dx, dy); dx = (dx / L) * width; dy = (dy / L) * width;
  return `M${r(p1[0])} ${r(p1[1])}L${r(p2[0])} ${r(p2[1])}L${r(p2[0] + dx)} ${r(p2[1] + dy)}L${r(p1[0] + dx)} ${r(p1[1] + dy)}Z`;
}

const CUTS = {
  // short sleeve jersey (set-in or raglan)
  tee(o = {}) {
    const nL = [250, 104], sL = [166, 126], stL = [84, 224], sbL = [134, 274], aL = [194, 224], hL = [196, 492];
    const hemY = 506;
    const side = `Q186 352 ${hL[0]} ${hL[1]}`;
    const sideR = `Q${X(186)} 352 ${X(aL[0])} ${aL[1]}`;
    const shape = (neck) => `M${nL}L${sL}L${stL}L${sbL}L${aL}${side}Q300 ${hemY} ${X(hL[0])} ${hL[1]}${sideR}L${X(sbL[0])} ${sbL[1]}L${X(stL[0])} ${stL[1]}L${X(sL[0])} ${sL[1]}L${X(nL[0])} ${nL[1]}${neck}Z`;
    const raglan = o.raglan;
    const sleeveL = raglan
      ? `M268 112L${nL}L${sL}L${stL}L${sbL}L${aL}Q218 150 268 112Z`
      : `M${sL}L${stL}L${sbL}L${aL}Q182 168 ${sL}Z`;
    const sleeveR = raglan
      ? `M${X(268)} 112L${X(nL[0])} ${nL[1]}L${X(sL[0])} ${sL[1]}L${X(stL[0])} ${stL[1]}L${X(sbL[0])} ${sbL[1]}L${X(aL[0])} ${aL[1]}Q${X(218)} 150 ${X(268)} 112Z`
      : `M${X(sL[0])} ${sL[1]}L${X(stL[0])} ${stL[1]}L${X(sbL[0])} ${sbL[1]}L${X(aL[0])} ${aL[1]}Q${X(182)} 168 ${X(sL[0])} ${sL[1]}Z`;
    const seamL = raglan ? `M268 112Q218 150 ${aL}` : `M${sL}Q182 168 ${aL}`;
    const seamR = raglan ? `M${X(268)} 112Q${X(218)} 150 ${X(aL[0])} ${aL[1]}` : `M${X(sL[0])} ${sL[1]}Q${X(182)} 168 ${X(aL[0])} ${aL[1]}`;
    const toward = [(sL[0] + aL[0]) / 2, (sL[1] + aL[1]) / 2];
    return {
      shape, nL, nR: [X(nL[0]), nL[1]], hemY: hL[1], hemCtl: hemY,
      sleeves: [sleeveL, sleeveR],
      cuffs: [band(stL, sbL, toward, 13), band([X(stL[0]), stL[1]], [X(sbL[0]), sbL[1]], [X(toward[0]), toward[1]], 13)],
      cuffInfo: [bandInfo(stL, sbL, toward, 13), bandInfo([X(stL[0]), stL[1]], [X(sbL[0]), sbL[1]], [X(toward[0]), toward[1]], 13)],
      cuffLines: [[stL, sbL], [[X(stL[0]), stL[1]], [X(sbL[0]), sbL[1]]]],
      sides: [`M${aL}L236 236Q230 360 236 500L${hL}Q186 352 ${aL}Z`, `M${X(aL[0])} ${aL[1]}L${X(236)} 236Q${X(230)} 360 ${X(236)} 500L${X(hL[0])} ${hL[1]}Q${X(186)} 352 ${X(aL[0])} ${aL[1]}Z`],
      hem: `M${hL}Q300 ${hemY} ${X(hL[0])} ${hL[1]}L${X(hL[0])} ${hL[1] - 11}Q300 ${hemY - 11} ${hL[0]} ${hL[1] - 11}Z`,
      seams: [seamL, seamR],
      chest: { x: 236, y: 168, w: 34 }, nape: { x: 300, y: 138, w: 38 }, centre: { x: 300, y: 300 },
      backNum: { y: 300, size: 120 },
      bbox: [80, 90, 440, 430],
      meta: { type: 'top', nL, sL, aL, hL, hemY: hL[1] + 7, sleeve: { top: [sL, stL], bot: [aL, sbL] } },
    };
  },
  // long sleeves hanging down (jackets, windbreakers, e-sport long sleeve)
  long(o = {}) {
    const nL = [252, 100], sL = [170, 120], cO = [80, 456], cI = [128, 466], aL = [196, 236], hL = [198, 496];
    const hemY = 508;
    const shape = (neck) => `M${nL}L${sL}Q110 250 ${cO}L${cI}Q156 330 ${aL}Q190 360 ${hL}Q300 ${hemY} ${X(hL[0])} ${hL[1]}Q${X(190)} 360 ${X(aL[0])} ${aL[1]}Q${X(156)} 330 ${X(cI[0])} ${cI[1]}L${X(cO[0])} ${cO[1]}Q${X(110)} 250 ${X(sL[0])} ${sL[1]}L${X(nL[0])} ${nL[1]}${neck}Z`;
    const raglan = o.raglan;
    const sleeveL = raglan
      ? `M266 108L${nL}L${sL}Q110 250 ${cO}L${cI}Q156 330 ${aL}Q218 150 266 108Z`
      : `M${sL}Q110 250 ${cO}L${cI}Q156 330 ${aL}Q184 170 ${sL}Z`;
    const sleeveR = raglan
      ? `M${X(266)} 108L${X(nL[0])} ${nL[1]}L${X(sL[0])} ${sL[1]}Q${X(110)} 250 ${X(cO[0])} ${cO[1]}L${X(cI[0])} ${cI[1]}Q${X(156)} 330 ${X(aL[0])} ${aL[1]}Q${X(218)} 150 ${X(266)} 108Z`
      : `M${X(sL[0])} ${sL[1]}Q${X(110)} 250 ${X(cO[0])} ${cO[1]}L${X(cI[0])} ${cI[1]}Q${X(156)} 330 ${X(aL[0])} ${aL[1]}Q${X(184)} 170 ${X(sL[0])} ${sL[1]}Z`;
    const seamL = raglan ? `M266 108Q218 150 ${aL}` : `M${sL}Q184 170 ${aL}`;
    const seamR = raglan ? `M${X(266)} 108Q${X(218)} 150 ${X(aL[0])} ${aL[1]}` : `M${X(sL[0])} ${sL[1]}Q${X(184)} 170 ${X(aL[0])} ${aL[1]}`;
    return {
      shape, nL, nR: [X(nL[0]), nL[1]], hemY: hL[1], hemCtl: hemY,
      sleeves: [sleeveL, sleeveR],
      cuffs: [band(cO, cI, [120, 380], 18), band([X(cO[0]), cO[1]], [X(cI[0]), cI[1]], [X(120), 380], 18)],
      cuffInfo: [bandInfo(cO, cI, [120, 380], 18), bandInfo([X(cO[0]), cO[1]], [X(cI[0]), cI[1]], [X(120), 380], 18)],
      cuffLines: [[cO, cI], [[X(cO[0]), cO[1]], [X(cI[0]), cI[1]]]],
      sides: [`M${aL}L238 248Q232 370 238 504L${hL}Q190 360 ${aL}Z`, `M${X(aL[0])} ${aL[1]}L${X(238)} 248Q${X(232)} 370 ${X(238)} 504L${X(hL[0])} ${hL[1]}Q${X(190)} 360 ${X(aL[0])} ${aL[1]}Z`],
      hem: `M${hL}Q300 ${hemY} ${X(hL[0])} ${hL[1]}L${X(hL[0])} ${hL[1] - 16}Q300 ${hemY - 16} ${hL[0]} ${hL[1] - 16}Z`,
      seams: [seamL, seamR],
      chest: { x: 238, y: 168, w: 34 }, nape: { x: 300, y: 136, w: 38 }, centre: { x: 300, y: 300 },
      backNum: { y: 300, size: 120 },
      bbox: [70, 90, 460, 430],
      meta: { type: 'top', nL, sL, aL, hL, hemY: hL[1] + 6, sleeve: { top: [sL, cO], bot: [aL, cI] } },
    };
  },
  // oversized long sleeve, arms spread (motorsport collection)
  wide() {
    const nL = [262, 176], sL = [204, 190], cT = [36, 236], cB = [40, 290], aL = [214, 270], hL = [218, 440];
    const hemY = 448;
    const shape = (neck) => `M${nL}L${sL}Q120 206 ${cT}L${cB}Q130 268 ${aL}Q214 360 ${hL}Q300 ${hemY} ${X(hL[0])} ${hL[1]}Q${X(214)} 360 ${X(aL[0])} ${aL[1]}Q${X(130)} 268 ${X(cB[0])} ${cB[1]}L${X(cT[0])} ${cT[1]}Q${X(120)} 206 ${X(sL[0])} ${sL[1]}L${X(nL[0])} ${nL[1]}${neck}Z`;
    const sleeveL = `M${sL}Q120 206 ${cT}L${cB}Q130 268 ${aL}Q206 230 ${sL}Z`;
    const sleeveR = `M${X(sL[0])} ${sL[1]}Q${X(120)} 206 ${X(cT[0])} ${cT[1]}L${X(cB[0])} ${cB[1]}Q${X(130)} 268 ${X(aL[0])} ${aL[1]}Q${X(206)} 230 ${X(sL[0])} ${sL[1]}Z`;
    return {
      shape, nL, nR: [X(nL[0]), nL[1]], hemY: hL[1], hemCtl: hemY,
      sleeves: [sleeveL, sleeveR],
      cuffs: [band(cT, cB, [130, 250], 14), band([X(cT[0]), cT[1]], [X(cB[0]), cB[1]], [X(130), 250], 14)],
      cuffInfo: [bandInfo(cT, cB, [130, 250], 14), bandInfo([X(cT[0]), cT[1]], [X(cB[0]), cB[1]], [X(130), 250], 14)],
      cuffLines: [[cT, cB], [[X(cT[0]), cT[1]], [X(cB[0]), cB[1]]]],
      sides: [`M${aL}L250 276Q246 360 250 446L${hL}Q214 360 ${aL}Z`, `M${X(aL[0])} ${aL[1]}L${X(250)} 276Q${X(246)} 360 ${X(250)} 446L${X(hL[0])} ${hL[1]}Q${X(214)} 360 ${X(aL[0])} ${aL[1]}Z`],
      hem: `M${hL}Q300 ${hemY} ${X(hL[0])} ${hL[1]}L${X(hL[0])} ${hL[1] - 12}Q300 ${hemY - 12} ${hL[0]} ${hL[1] - 12}Z`,
      seams: [`M${sL}Q206 230 ${aL}`, `M${X(sL[0])} ${sL[1]}Q${X(206)} 230 ${X(aL[0])} ${aL[1]}`],
      chest: { x: 300, y: 222, w: 30 }, nape: { x: 300, y: 204, w: 32 }, centre: { x: 300, y: 310 },
      backNum: { y: 330, size: 90 },
      bbox: [30, 170, 540, 290],
      meta: { type: 'top', nL, sL, aL, hL, hemY: hL[1] + 4, sleeve: { top: [sL, cT], bot: [aL, cB] } },
    };
  },
  // sleeveless (basketball / running singlet / training bib)
  vest() {
    const nL = [258, 96], sL = [220, 98], aL = [174, 252], hL = [180, 496];
    const hemY = 510;
    const shape = (neck) => `M${nL}L${sL}Q214 214 ${aL}Q172 370 ${hL}Q300 ${hemY} ${X(hL[0])} ${hL[1]}Q${X(172)} 370 ${X(aL[0])} ${aL[1]}Q${X(214)} 214 ${X(sL[0])} ${sL[1]}L${X(nL[0])} ${nL[1]}${neck}Z`;
    return {
      shape, nL, nR: [X(nL[0]), nL[1]], vest: true, hemY: hL[1], hemCtl: hemY,
      sleeves: [],
      cuffs: [],
      armholes: [`M${sL}Q214 214 ${aL}`, `M${X(sL[0])} ${sL[1]}Q${X(214)} 214 ${X(aL[0])} ${aL[1]}`],
      sides: [`M${aL}L218 262Q214 380 220 504L${hL}Q172 370 ${aL}Z`, `M${X(aL[0])} ${aL[1]}L${X(218)} 262Q${X(214)} 380 ${X(220)} 504L${X(hL[0])} ${hL[1]}Q${X(172)} 370 ${X(aL[0])} ${aL[1]}Z`],
      hem: `M${hL}Q300 ${hemY} ${X(hL[0])} ${hL[1]}L${X(hL[0])} ${hL[1] - 12}Q300 ${hemY - 12} ${hL[0]} ${hL[1] - 12}Z`,
      seams: [],
      chest: { x: 246, y: 196, w: 32 }, nape: { x: 300, y: 130, w: 34 }, centre: { x: 300, y: 320 },
      backNum: { y: 320, size: 130 },
      bbox: [160, 90, 280, 430],
      meta: { type: 'top', nL, sL, aL, hL, hemY: hL[1] + 7, sleeve: null, armCtl: [214, 214] },
    };
  },
};

// track pants: waistband, two tapered legs, ankle cuffs
CUTS.pants = function () {
  const shape = 'M200 88L400 88L402 116Q414 158 414 200Q412 380 388 556L390 570L328 570L330 556Q318 400 304 272Q300 264 296 272Q282 400 270 556L272 570L210 570L212 556Q188 380 186 200Q186 158 198 116Z';
  return {
    shape,
    meta: { type: 'bottom', waistY: 88, bandY: 116, hipY: 200, crotch: [300, 270], ankleY: 568, ankleL: [[212, 556], [270, 556]], waist: [200, 400] },
  };
};

// ---------------------------------------------------------------- necklines
/* Returns { front: path-suffix, back: path-suffix, inner: path (visible back-of-neck), trim: [paths] } */
function neckline(kind, g) {
  const [nL, nR] = [g.nL, g.nR];
  const yb = nL[1] + 16; // back neck dip
  const back = `Q300 ${yb} ${nL[0]} ${nL[1]}`;
  const out = { back, backTrim: `M${nL}Q300 ${yb} ${nR}` };
  if (kind === 'v') {
    const vy = nL[1] + 74;
    out.front = `L300 ${vy}L${nL[0]} ${nL[1]}`;
    out.inner = `M${nL}Q300 ${yb} ${nR}L300 ${vy}Z`;
    out.trim = `M${nR}L300 ${vy}L${nL[0]} ${nL[1]}`;
    out.trimW = 13;
    out.chestShift = 0;
  } else if (kind === 'polo') {
    const vy = nL[1] + 46;
    out.front = `Q300 ${vy} ${nL[0]} ${nL[1]}`;
    out.inner = `M${nL}Q300 ${yb} ${nR}Q300 ${vy} ${nL[0]} ${nL[1]}Z`;
    out.trim = null;
    out.polo = true;
    out.vy = vy;
  } else if (kind === 'zip' || kind === 'hood') {
    const vy = nL[1] + 22;
    out.front = `Q300 ${vy} ${nL[0]} ${nL[1]}`;
    out.inner = `M${nL}Q300 ${yb} ${nR}Q300 ${vy} ${nL[0]} ${nL[1]}Z`;
    out.trim = null;
    out.zip = true;
    out.hood = kind === 'hood';
    out.vy = vy;
  } else if (kind === 'scoop') {
    const vy = nL[1] + 70;
    out.front = `Q300 ${vy + 26} ${nL[0]} ${nL[1]}`;
    out.inner = `M${nL}Q300 ${yb} ${nR}Q300 ${vy + 26} ${nL[0]} ${nL[1]}Z`;
    out.trim = `M${nR}Q300 ${vy + 26} ${nL[0]} ${nL[1]}`;
    out.trimW = 12;
  } else {
    // crew
    const vy = nL[1] + 40;
    out.front = `Q300 ${vy + 8} ${nL[0]} ${nL[1]}`;
    out.inner = `M${nL}Q300 ${yb} ${nR}Q300 ${vy + 8} ${nL[0]} ${nL[1]}Z`;
    out.trim = `M${nR}Q300 ${vy + 8} ${nL[0]} ${nL[1]}`;
    out.trimW = 12;
  }
  return out;
}

// ---------------------------------------------------------------- patterns
/*
 * Patterns draw artwork inside the garment clip. They receive a context:
 *  { id, rand, c: {base,p1,p2,p3,trim}, defs: [] }
 * and return SVG markup.
 */
const P = {
  // horizontal bands of halftone dots (glitch scanline look)
  halftone(ctx) {
    const { id, rand, c, defs } = ctx;
    const out = [];
    const dotSize = 2 + rand() * 1.5;
    [c.p1, c.p2, c.p3].forEach((col, i) => {
      defs.push(`<pattern id="${id}d${i}" width="${dotSize * 3}" height="${dotSize * 3}" patternUnits="userSpaceOnUse"><circle cx="${dotSize * 1.5}" cy="${dotSize * 1.5}" r="${dotSize * (0.55 + i * 0.12)}" fill="${col}"/></pattern>`);
    });
    let y = 80;
    while (y < 540) {
      const h = 6 + Math.floor(rand() * 22);
      const i = Math.floor(rand() * 3);
      const op = (0.35 + rand() * 0.65).toFixed(2);
      out.push(`<rect x="0" y="${y}" width="600" height="${h}" fill="url(#${id}d${i})" opacity="${op}"/>`);
      if (rand() < 0.25) out.push(`<rect x="0" y="${y + h}" width="600" height="2" fill="${c.p2}" opacity=".5"/>`);
      y += h + 4 + Math.floor(rand() * 14);
    }
    return out.join('');
  },
  // organic marbled two-tone (turbulence)
  marble(ctx) {
    const { id, rand, c, defs } = ctx;
    const f = (0.006 + rand() * 0.006).toFixed(4);
    const seed = Math.floor(rand() * 999);
    const [r1, g1, b1] = hexToRgb(c.p1).map((v) => (v / 255).toFixed(3));
    defs.push(`<filter id="${id}m" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency="${f} ${(f * 2.4).toFixed(4)}" numOctaves="3" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 ${r1} 0 0 0 0 ${g1} 0 0 0 0 ${b1} 3 0 0 0 -.25"/><feComponentTransfer><feFuncA type="discrete" tableValues="0 1 1 0 1"/></feComponentTransfer><feGaussianBlur stdDeviation=".7"/></filter>`);
    return `<rect width="600" height="600" filter="url(#${id}m)"/>` + (c.p2 ? P._accentLines(ctx, 0.35) : '');
  },
  // layered camouflage blobs
  camo(ctx) {
    const { id, rand, c, defs } = ctx;
    const f = (0.008 + rand() * 0.008).toFixed(4);
    const out = [];
    [c.p1, c.p2, c.p3].forEach((col, i) => {
      const [r1, g1, b1] = hexToRgb(col).map((v) => (v / 255).toFixed(3));
      const seed = Math.floor(rand() * 999);
      const thr = [0.52, 0.56, 0.6][i];
      defs.push(`<filter id="${id}c${i}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="3" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 ${r1} 0 0 0 0 ${g1} 0 0 0 0 ${b1} 0 0 0 0 0"/><feComponentTransfer><feFuncA type="discrete" tableValues="${[...Array(20)].map((_, k) => (k / 20 > thr ? 1 : 0)).join(' ')}"/></feComponentTransfer><feGaussianBlur stdDeviation=".8"/><feComponentTransfer><feFuncA type="linear" slope="2" intercept="-.5"/></feComponentTransfer></filter>`);
      // alpha comes from the noise's red channel via matrix row; rebuild with alpha row
      defs[defs.length - 1] = defs[defs.length - 1].replace('0 0 0 0 0"/>', '1 0 0 0 0"/>');
      out.push(`<rect width="600" height="600" filter="url(#${id}c${i})"/>`);
    });
    return out.join('');
  },
  // liquid swirl (smooth high-contrast turbulence)
  liquid(ctx) {
    const { id, rand, c, defs } = ctx;
    const f = (0.004 + rand() * 0.004).toFixed(4);
    const seed = Math.floor(rand() * 999);
    const [r1, g1, b1] = hexToRgb(c.p1).map((v) => (v / 255).toFixed(3));
    const [r2, g2, b2] = hexToRgb(c.p2).map((v) => (v / 255).toFixed(3));
    defs.push(`<filter id="${id}l" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="2" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 ${r1} 0 0 0 0 ${g1} 0 0 0 0 ${b1} 0 0 0 0 0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0 1 0 0 1 0 0 1 0"/></feComponentTransfer></filter>`);
    defs[defs.length - 1] = defs[defs.length - 1].replace('0 0 0 0 0"/>', '1 0 0 0 0"/>');
    defs.push(`<filter id="${id}l2" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="2" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 ${r2} 0 0 0 0 ${g2} 0 0 0 0 ${b2} 1 0 0 0 0"/><feComponentTransfer><feFuncA type="table" tableValues="0 1 0 0 1 0 0 1 0 0"/></feComponentTransfer></filter>`);
    return `<rect width="600" height="600" filter="url(#${id}l)"/><rect width="600" height="600" filter="url(#${id}l2)" opacity=".85"/>`;
  },
  // diagonal speed shards with gradients
  shards(ctx) {
    const { id, rand, c, defs } = ctx;
    const out = [];
    const ang = rand() < 0.5 ? -1 : 1;
    defs.push(`<linearGradient id="${id}g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.p1}"/><stop offset="1" stop-color="${c.p1}" stop-opacity="0"/></linearGradient>`);
    defs.push(`<linearGradient id="${id}g2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.p2}"/><stop offset="1" stop-color="${c.p2}" stop-opacity="0"/></linearGradient>`);
    defs.push(`<linearGradient id="${id}g3" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${c.p3}"/><stop offset="1" stop-color="${c.p3}" stop-opacity="0"/></linearGradient>`);
    out.push(`<rect width="600" height="600" fill="url(#${id}g${ang > 0 ? 1 : 2})" opacity=".25"/>`);
    for (let i = 0; i < 44; i++) {
      const x = -260 + rand() * 900, y = 160 + rand() * 520;
      const len = 260 + rand() * 420, w = 10 + rand() * 56;
      const dx = len * 0.62 * ang, dy = -len * 0.78;
      const g = ['g1', 'g2', 'g3'][Math.floor(rand() * 3)];
      out.push(`<path d="M${r(x)} ${r(y)}l${r(dx)} ${r(dy)}l${r(w)} ${r(w * 0.25)}l${r(-dx * 0.9)} ${r(-dy * 0.9)}Z" fill="url(#${id}${g})" opacity="${(0.35 + rand() * 0.65).toFixed(2)}"/>`);
    }
    return out.join('');
  },
  // chevron arrows
  chevron(ctx) {
    const { id, rand, c, defs } = ctx;
    const s = 26 + Math.floor(rand() * 18);
    defs.push(`<pattern id="${id}cv" width="${s}" height="${s * 1.4}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rand() < 0.5 ? 0 : 90})"><path d="M0 ${s * 0.5}L${s / 2} 0L${s} ${s * 0.5}L${s} ${s * 0.85}L${s / 2} ${s * 0.35}L0 ${s * 0.85}Z" fill="${c.p1}"/></pattern>`);
    defs.push(`<linearGradient id="${id}cf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".55" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity=".15"/></linearGradient><mask id="${id}cm"><rect width="600" height="600" fill="url(#${id}cf)"/></mask>`);
    return `<rect width="600" height="600" fill="url(#${id}cv)" mask="url(#${id}cm)"/>`;
  },
  // argyle / diamond lattice with gradient fill
  diamond(ctx) {
    const { id, rand, c, defs } = ctx;
    const s = 46 + Math.floor(rand() * 30);
    defs.push(`<linearGradient id="${id}dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.p1}"/><stop offset="1" stop-color="${c.p2}"/></linearGradient>`);
    defs.push(`<pattern id="${id}dm" width="${s}" height="${s * 1.6}" patternUnits="userSpaceOnUse"><path d="M${s / 2} 0L${s} ${s * 0.8}L${s / 2} ${s * 1.6}L0 ${s * 0.8}Z" fill="url(#${id}dg)" opacity=".55"/><path d="M0 0L${s} ${s * 1.6}M${s} 0L0 ${s * 1.6}" stroke="${c.p3}" stroke-width="1.4" opacity=".6"/></pattern>`);
    return `<rect width="600" height="600" fill="url(#${id}dm)"/>`;
  },
  // fine vertical pinstripes
  pinstripe(ctx) {
    const { id, rand, c, defs } = ctx;
    const s = 9 + Math.floor(rand() * 10);
    defs.push(`<pattern id="${id}ps" width="${s}" height="10" patternUnits="userSpaceOnUse"><rect width="${Math.max(1.2, s / 7)}" height="10" fill="${c.p1}"/></pattern>`);
    return `<rect width="600" height="600" fill="url(#${id}ps)" opacity=".9"/>` + P._accentLines(ctx, 0.2);
  },
  // bold vertical stripes (classic football)
  stripes(ctx) {
    const { c, rand } = ctx;
    const w = 34 + Math.floor(rand() * 14);
    const out = [];
    for (let x = 300 - w / 2 - w * 2 * 6; x < 640; x += w * 2) out.push(`<rect x="${x}" y="0" width="${w}" height="600" fill="${c.p1}"/>`);
    out.push(P.pinstripe({ ...ctx, c: { ...c, p1: c.p2 } }).replace(/opacity="\.9"/, 'opacity=".25"'));
    return out.join('');
  },
  // tonal flowers
  floral(ctx) {
    const { rand, c } = ctx;
    const out = [];
    for (let i = 0; i < 30; i++) {
      const x = rand() * 600, y = 60 + rand() * 500, R = 22 + rand() * 50;
      const petals = 5;
      const col = [c.p1, c.p2, c.p3][Math.floor(rand() * 3)];
      const rot = rand() * 360;
      let d = '';
      for (let k = 0; k < petals; k++) {
        const a = ((k / petals) * 360 + rot) * (Math.PI / 180);
        const px = x + Math.cos(a) * R * 0.55, py = y + Math.sin(a) * R * 0.55;
        d += `<ellipse cx="${r(px)}" cy="${r(py)}" rx="${r(R * 0.42)}" ry="${r(R * 0.26)}" transform="rotate(${r((a * 180) / Math.PI)} ${r(px)} ${r(py)})"/>`;
      }
      out.push(`<g fill="${col}" opacity="${(0.35 + rand() * 0.5).toFixed(2)}">${d}<circle cx="${r(x)}" cy="${r(y)}" r="${r(R * 0.16)}" fill="${c.base}" opacity=".6"/></g>`);
      if (rand() < 0.4) {
        out.push(`<path d="M${r(x)} ${r(y)}q${r(R)} ${r(R * 0.4)} ${r(R * 1.4)} ${r(R * 1.6)}" stroke="${col}" stroke-width="3" fill="none" opacity=".35"/>`);
      }
    }
    return out.join('');
  },
  // vertical gradient fade with halftone transition
  fade(ctx) {
    const { id, c, defs } = ctx;
    defs.push(`<linearGradient id="${id}fg" x1="0" y1="0" x2="0" y2="1"><stop offset=".25" stop-color="${c.p1}" stop-opacity="0"/><stop offset=".85" stop-color="${c.p1}"/></linearGradient>`);
    defs.push(`<pattern id="${id}fd" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2.6" fill="${c.p2}"/></pattern><linearGradient id="${id}fm" x1="0" y1="0" x2="0" y2="1"><stop offset=".1" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="${id}fk"><rect width="600" height="600" fill="url(#${id}fm)"/></mask>`);
    return `<rect width="600" height="600" fill="url(#${id}fg)"/><rect width="600" height="600" fill="url(#${id}fd)" mask="url(#${id}fk)" opacity=".7"/>`;
  },
  // honeycomb
  hex(ctx) {
    const { id, rand, c, defs } = ctx;
    const s = 16 + Math.floor(rand() * 14);
    const h = s * Math.sqrt(3);
    defs.push(`<pattern id="${id}hx" width="${r(s * 3)}" height="${r(h)}" patternUnits="userSpaceOnUse"><path d="M0 ${r(h / 2)}L${r(s / 2)} 0L${r(s * 1.5)} 0L${s * 2} ${r(h / 2)}L${r(s * 1.5)} ${r(h)}L${r(s / 2)} ${r(h)}ZM${s * 2} ${r(h / 2)}L${s * 3} ${r(h / 2)}" fill="none" stroke="${c.p1}" stroke-width="2"/></pattern>`);
    defs.push(`<radialGradient id="${id}hr" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></radialGradient><mask id="${id}hm"><rect width="600" height="600" fill="url(#${id}hr)"/></mask>`);
    return `<rect width="600" height="600" fill="url(#${id}hx)" mask="url(#${id}hm)"/>` + P._accentLines(ctx, 0.4);
  },
  // flowing waves
  waves(ctx) {
    const { rand, c } = ctx;
    const out = [];
    const amp = 14 + rand() * 26, freq = 0.012 + rand() * 0.01;
    for (let k = 0; k < 34; k++) {
      const y0 = 60 + k * 15;
      let d = `M-10 ${y0}`;
      for (let x = -10; x <= 610; x += 20) d += `L${x} ${r(y0 + Math.sin(x * freq + k * 0.35) * amp + Math.sin(x * freq * 2.3 + k) * amp * 0.3)}`;
      const col = k % 3 === 0 ? c.p2 : c.p1;
      out.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="${(1.5 + (k % 4)).toFixed(1)}" opacity="${(0.4 + rand() * 0.5).toFixed(2)}"/>`);
    }
    return out.join('');
  },
  // contour / topographic lines
  topo(ctx) {
    const { id, rand, c, defs } = ctx;
    const f = (0.005 + rand() * 0.004).toFixed(4);
    const seed = Math.floor(rand() * 999);
    const [r1, g1, b1] = hexToRgb(c.p1).map((v) => (v / 255).toFixed(3));
    const tv = [...Array(24)].map((_, i) => (i % 3 === 0 ? 1 : 0)).join(' ');
    defs.push(`<filter id="${id}t" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="2" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 ${r1} 0 0 0 0 ${g1} 0 0 0 0 ${b1} 1 0 0 0 0"/><feComponentTransfer><feFuncA type="discrete" tableValues="${tv}"/></feComponentTransfer><feGaussianBlur stdDeviation=".6"/></filter>`);
    return `<rect width="600" height="600" filter="url(#${id}t)" opacity=".85"/>`;
  },
  // big diagonal sash
  sash(ctx) {
    const { c, rand } = ctx;
    const dir = rand() < 0.5;
    const pts = dir ? 'M120 60L230 60L520 560L410 560Z' : 'M480 60L370 60L80 560L190 560Z';
    return `<path d="${pts}" fill="${c.p1}"/><path d="${pts}" fill="none" stroke="${c.p2}" stroke-width="10"/>` + P.pinstripe({ ...ctx, c: { ...c, p1: c.p3 } }).replace(/opacity="\.9"/, 'opacity=".18"');
  },
  // triangle mosaic
  mosaic(ctx) {
    const { rand, c } = ctx;
    const out = [];
    const s = 44;
    for (let y = 40; y < 580; y += s) {
      for (let x = -s; x < 640; x += s) {
        const col = [c.p1, c.p2, c.p3, c.base][Math.floor(rand() * 4)];
        const op = (0.15 + rand() * 0.75).toFixed(2);
        const flip = rand() < 0.5;
        out.push(flip ? `<path d="M${x} ${y}h${s}l-${s} ${s}Z" fill="${col}" opacity="${op}"/>` : `<path d="M${x + s} ${y}v${s}h-${s}Z" fill="${col}" opacity="${op}"/>`);
      }
    }
    return out.join('');
  },
  // expressive brush strokes
  brush(ctx) {
    const { rand, c } = ctx;
    const out = [];
    for (let i = 0; i < 22; i++) {
      const x = rand() * 600, y = 60 + rand() * 500;
      const col = [c.p1, c.p2, c.p3][Math.floor(rand() * 3)];
      const w = 10 + rand() * 34;
      out.push(`<path d="M${r(x)} ${r(y)}c${r(40 + rand() * 80)} ${r(-30 + rand() * 60)} ${r(90 + rand() * 120)} ${r(-60 + rand() * 120)} ${r(160 + rand() * 160)} ${r(-40 + rand() * 80)}" stroke="${col}" stroke-width="${r(w)}" stroke-linecap="round" fill="none" opacity="${(0.5 + rand() * 0.5).toFixed(2)}"/>`);
    }
    return out.join('');
  },
  // electric zig-zag bolts
  bolt(ctx) {
    const { rand, c } = ctx;
    const out = [];
    for (let i = 0; i < 9; i++) {
      let x = rand() * 600, y = 70;
      let d = `M${r(x)} ${y}`;
      while (y < 560) { x += -50 + rand() * 100; y += 30 + rand() * 50; d += `L${r(x)} ${r(y)}`; }
      const col = i % 2 ? c.p1 : c.p2;
      out.push(`<path d="${d}" stroke="${col}" stroke-width="${r(3 + rand() * 9)}" fill="none" stroke-linejoin="miter" opacity="${(0.5 + rand() * 0.5).toFixed(2)}"/>`);
    }
    return out.join('');
  },
  // plain with chest band
  band(ctx) {
    const { c } = ctx;
    return `<rect x="0" y="210" width="600" height="70" fill="${c.p1}"/><rect x="0" y="286" width="600" height="10" fill="${c.p2}"/><rect x="0" y="200" width="600" height="5" fill="${c.p2}"/>`;
  },
  // grid / tech checks
  grid(ctx) {
    const { id, rand, c, defs } = ctx;
    const s = 20 + Math.floor(rand() * 20);
    defs.push(`<pattern id="${id}gr" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><path d="M${s} 0V${s}H0" fill="none" stroke="${c.p1}" stroke-width="1.5"/><rect width="${s / 2}" height="${s / 2}" fill="${c.p2}" opacity=".35"/></pattern>`);
    return `<rect width="600" height="600" fill="url(#${id}gr)" opacity=".8"/>`;
  },
  // helper: a few long accent lines across the body
  _accentLines(ctx, op) {
    const { rand, c } = ctx;
    let s = '';
    for (let i = 0; i < 3; i++) {
      const y = 180 + rand() * 300;
      s += `<path d="M0 ${r(y)}L600 ${r(y - 120 + rand() * 240)}" stroke="${c.p2}" stroke-width="${r(2 + rand() * 6)}" opacity="${op}"/>`;
    }
    return s;
  },
};

// ---------------------------------------------------------------- premium fabric + finishing details
/*
 * Fabric weaves are vector micro-patterns (highlight + shadow strokes), so they stay
 * crisp at any zoom and read on both light and dark colours.
 */
const FABRIC = {
  ARCTIX: { w: 2.4, h: 2, body: '<path d="M0 .2L1.2 1.7L2.4 .2" stroke="#fff" stroke-opacity=".17" stroke-width=".5" fill="none"/><path d="M0 .78L1.2 2.28L2.4 .78" stroke="#000" stroke-opacity=".22" stroke-width=".45" fill="none"/>' },
  HEXA: { w: 2.77, h: 4.8, body: '<g fill="#000" fill-opacity=".3"><circle cx="1.385" cy="1.2" r=".52"/><circle cx="0" cy="3.6" r=".52"/><circle cx="2.77" cy="3.6" r=".52"/></g><g fill="#fff" fill-opacity=".1"><circle cx="1.2" cy="1.0" r=".28"/><circle cx="-.18" cy="3.4" r=".28"/><circle cx="2.59" cy="3.4" r=".28"/></g>' },
  AGILIS: { w: 2, h: 2, rot: -35, body: '<rect width="2" height=".75" fill="#fff" fill-opacity=".1"/><rect y="1" width="2" height=".6" fill="#000" fill-opacity=".16"/>' },
  QUADRA: { w: 2.8, h: 2.8, body: '<rect x=".4" y=".4" width="2" height="2" fill="#000" fill-opacity=".13"/><path d="M0 .15H2.8M.15 0V2.8" stroke="#fff" stroke-opacity=".16" stroke-width=".3"/>' },
  MICROTEX: { w: 1.4, h: 1.4, rot: 30, body: '<rect width="1.4" height=".5" fill="#fff" fill-opacity=".08"/><rect y=".72" width="1.4" height=".42" fill="#000" fill-opacity=".12"/>' },
  TASLAN: { w: 3, h: 1.3, body: '<rect width="3" height=".5" fill="#fff" fill-opacity=".09"/><rect y=".66" width="3" height=".38" fill="#000" fill-opacity=".14"/><rect x="1.4" width=".18" height="1.3" fill="#000" fill-opacity=".06"/>' },
  RIPSTOP: { w: 6, h: 6, body: '<path d="M0 .3H6M.3 0V6" stroke="#000" stroke-opacity=".24" stroke-width=".55"/><path d="M0 .85H6M.85 0V6" stroke="#fff" stroke-opacity=".12" stroke-width=".3"/><path d="M2 2l2 2M4 2l-2 2" stroke="#000" stroke-opacity=".05" stroke-width=".3"/>' },
  MESH: { w: 2.6, h: 2.6, body: '<circle cx="1.3" cy="1.3" r=".74" fill="#000" fill-opacity=".34"/><circle cx="1.06" cy="1.06" r=".38" fill="#fff" fill-opacity=".07"/>' },
};
function fabricDefs(id, fabric) {
  const f = FABRIC[fabric] || FABRIC.ARCTIX;
  return `<pattern id="${id}fb" width="${f.w}" height="${f.h}" patternUnits="userSpaceOnUse"${f.rot ? ` patternTransform="rotate(${f.rot})"` : ''}>${f.body}</pattern>`;
}
// coverstitch: dark thread shadow + light thread, tone-on-tone on any colour
const stitch = (d, o = 1, tf = '') => `<path d="${d}" fill="none" stroke="#000" stroke-opacity="${(0.34 * o).toFixed(2)}" stroke-width=".7" stroke-dasharray="2 1.3" transform="${tf} translate(.3 .35)"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity="${(0.42 * o).toFixed(2)}" stroke-width=".55" stroke-dasharray="2 1.3"${tf ? ` transform="${tf}"` : ''}/>`;
// knitted rib: fine lines across a band
const rib = (d, w) => `<path d="${d}" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="${w}" stroke-dasharray=".55 .85"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="${w}" stroke-dasharray=".3 1.1" stroke-dashoffset=".7"/>`;
const pt = (p) => `${r(p[0])} ${r(p[1])}`;
/** TMZ mark drawn through a shared <use>, so it can repeat cheaply. */
function logoDef(id) { return `<path id="${id}lg" transform="translate(0,2560) scale(0.1,-0.1)" d="${LOGO_D}"/>`; }
function logoUse(id, cx, cy, w, fill, extra = '') {
  const s = w / LVW, h = LVH * s;
  return `<use href="#${id}lg" transform="translate(${r(cx - w / 2 - LVX * s)} ${r(cy - h / 2 - LVY * s)}) scale(${s.toFixed(5)})" fill="${fill}"${extra}/>`;
}
// raised heat-transfer print: soft shadow under the logo
const raisedLogo = (id, cx, cy, w, fill) => logoUse(id, cx + 0.55, cy + 0.7, w, '#000', ' fill-opacity=".32"') + logoUse(id, cx, cy, w, fill);

// ---------------------------------------------------------------- render
/**
 * spec: {
 *   id, cut: tee|long|wide|vest, raglan, neck: v|crew|polo|zip|hood|scoop,
 *   pattern, colors: {base,p1,p2,p3,trim,sleeve?,side?}, number?, name?, flag?
 * }
 */
const VB = { tee: '66 78 468 468', long: '46 14 508 508', wide: '24 36 552 552', vest: '75 78 450 450', pants: '120 70 360 516' };
function svgOpen(cut) {
  const vb = (VB[cut] || '0 0 600 600').split(' ').map(Number);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="600" height="${Math.round((600 * vb[3]) / vb[2])}">`;
}

function render(spec, view = 'front') {
  if (spec.cut === 'pants') return renderPants(spec, view);
  const g = CUTS[spec.cut](spec);
  const nk = neckline(spec.neck || 'crew', g);
  const c = spec.colors;
  const id = 'j' + String(spec.id).replace(/[^a-z0-9]/gi, '') + (view === 'back' ? 'b' : 'f');
  const rand = rng(spec.id + (spec.pattern || '') + view.slice(0, 0));
  const defs = [];
  const shapeD = g.shape(view === 'front' ? nk.front : nk.back);
  const logoFill = spec.logoColor || (isDark(c.base) ? '#ffffff' : '#111111');
  const outlineCol = spec.outline || 'rgba(0,0,0,.28)';
  const parts = [];

  defs.push(`<clipPath id="${id}k"><path d="${shapeD}"/></clipPath>`, logoDef(id), fabricDefs(id, spec.fabric));
  const M = g.meta, hemC = g.hemCtl, aL = M.aL, hL = M.hL;
  const tone = isDark(c.base) ? '#ffffff' : '#111111';

  // inner back of neck (visible through front neckline) + printed neck label
  if (view === 'front') {
    const label = ['crew', 'v', 'scoop', 'polo'].includes(spec.neck || 'crew') && !spec.template
      ? logoUse(id, 300, g.nL[1] + 26, 11, 'rgba(255,255,255,.55)') + `<text x="300" y="${g.nL[1] + 35}" font-family="Arial, Helvetica, sans-serif" font-size="3.4" letter-spacing=".5" text-anchor="middle" fill="rgba(255,255,255,.5)">M · 100% POLYESTER</text>`
      : '';
    parts.push(`<g class="nk-in"><path d="${nk.inner}" fill="${shade(c.inner || c.base, -0.45)}" stroke="${outlineCol}" stroke-width="1.2"/>${label}</g>`);
  }
  // hood behind (windbreaker)
  if (nk.hood) {
    const hb = `M${g.nL[0] - 30} ${g.nL[1] + 10}Q${g.nL[0] - 40} ${g.nL[1] - 70} 300 ${g.nL[1] - 78}Q${X(g.nL[0] - 40)} ${g.nL[1] - 70} ${X(g.nL[0] - 30)} ${g.nL[1] + 10}Z`;
    parts.push(`<path d="${hb}" fill="${shade(c.sleeve || c.base, view === 'front' ? -0.12 : 0)}" stroke="${outlineCol}" stroke-width="1.2"/>`);
    if (view === 'front') parts.push(`<path d="M${g.nL[0] - 12} ${g.nL[1] + 6}Q300 ${g.nL[1] - 40} ${X(g.nL[0] - 12)} ${g.nL[1] + 6}" fill="${shade(c.base, -0.5)}"/>`);
  }

  // garment body
  const art = [];
  art.push(`<rect width="600" height="600" fill="${c.base}"/>`);
  if (spec.pattern && P[spec.pattern]) {
    const ctx = { id, rand, c, defs };
    art.push(`<g>${P[spec.pattern](ctx)}</g>`);
  }
  if (c.side) g.sides.forEach((d) => art.push(`<path d="${d}" fill="${c.side}"/>`));
  if (c.sleeve) {
    g.sleeves.forEach((d) => art.push(`<path d="${d}" fill="${c.sleeve}"/>`));
    if (spec.sleevePattern && P[spec.sleevePattern]) {
      defs.push(`<clipPath id="${id}sl">${g.sleeves.map((d) => `<path d="${d}"/>`).join('')}</clipPath>`);
      art.push(`<g clip-path="url(#${id}sl)">${P[spec.sleevePattern]({ id: id + 's', rand, c: { ...c, base: c.sleeve }, defs })}</g>`);
    }
  }
  if (spec.yoke) {
    art.push(`<path d="M0 0H600V${spec.yoke}Q300 ${spec.yoke + 30} 0 ${spec.yoke}Z" fill="${c.trim}"/>`);
  }
  // cuffs + hem
  g.cuffs.forEach((d) => art.push(`<path d="${d}" fill="${c.trim}"/>`));
  if (spec.cuffStripe !== false) g.cuffs.forEach((d, i) => {
    const [a, b] = g.cuffLines[i];
    art.push(`<path d="M${a}L${b}" stroke="${c.p2 || c.trim}" stroke-width="3" transform="translate(${i ? -1 : 1} 0)" opacity=".9"/>`);
  });
  if (spec.hemBand) art.push(`<path d="${g.hem}" fill="${c.trim}"/>`);
  // laser-cut side vents
  if (!spec.template && (spec.cut === 'tee' || spec.cut === 'vest' || spec.cut === 'wide')) {
    const y0 = aL[1] + 24, y1 = aL[1] + 0.55 * (hL[1] - aL[1]);
    defs.push(`<pattern id="${id}pf" width="2.6" height="2.6" patternUnits="userSpaceOnUse"><circle cx="1.3" cy="1.3" r=".55" fill="#000" fill-opacity=".42"/><circle cx="1.12" cy="1.12" r=".25" fill="#fff" fill-opacity=".1"/></pattern><linearGradient id="${id}pg" x1="0" y1="${y0}" x2="0" y2="${y1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".2" stop-color="#fff"/><stop offset=".8" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="${id}pm"><rect x="0" y="${y0}" width="600" height="${y1 - y0}" fill="url(#${id}pg)"/></mask>`);
    art.push(`<g mask="url(#${id}pm)" fill="url(#${id}pf)"><rect x="${hL[0] + 7}" y="${y0}" width="17" height="${y1 - y0}"/><rect x="${X(hL[0] + 24)}" y="${y0}" width="17" height="${y1 - y0}"/></g>`);
  }
  // tonal monogram print across the lower body
  if (!spec.template) {
    const t0 = hL[1] - 96;
    defs.push(`<pattern id="${id}mg" width="30" height="26" patternUnits="userSpaceOnUse">${logoUse(id, 7.5, 6.5, 8, tone)}${logoUse(id, 22.5, 19.5, 8, tone)}</pattern><linearGradient id="${id}mgg" x1="0" y1="${t0}" x2="0" y2="${hemC}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".09"/></linearGradient><mask id="${id}mgm"><rect y="${t0}" width="600" height="${hemC - t0 + 6}" fill="url(#${id}mgg)"/></mask>`);
    art.push(`<rect y="${t0}" width="600" height="${hemC - t0 + 6}" fill="url(#${id}mg)" mask="url(#${id}mgm)"/>`);
  }
  // fabric weave
  art.push(`<rect width="600" height="620" fill="url(#${id}fb)"/>`);
  // drape: soft folds under the arms, at the waist and on the sleeves
  defs.push(`<filter id="${id}bl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4.5"/></filter>`);
  {
    const f = [];
    const yW = aL[1] + 0.6 * (hL[1] - aL[1]);
    [1, -1].forEach((sg) => {
      const P = (dx, dy) => pt([sg > 0 ? aL[0] + dx : X(aL[0] + dx), aL[1] + dy]);
      f.push(`<path d="M${P(8, 6)}Q${P(46, 34)} ${P(80, 80)}" stroke="#000" stroke-opacity=".17" stroke-width="7"/>`);
      f.push(`<path d="M${P(18, 0)}Q${P(56, 26)} ${P(90, 70)}" stroke="#fff" stroke-opacity=".1" stroke-width="6"/>`);
      f.push(`<path d="M${P(10, 20)}Q${P(38, 44)} ${P(58, 74)}" stroke="#000" stroke-opacity=".1" stroke-width="5"/>`);
      if (M.sleeve) {
        const b0 = M.sleeve.bot[0], b1 = M.sleeve.bot[1];
        const q = (p) => (sg > 0 ? p : [X(p[0]), p[1]]);
        const m1 = q([b0[0] + (b1[0] - b0[0]) * 0.15, b0[1] + (b1[1] - b0[1]) * 0.15 - 8]);
        const m2 = q([b0[0] + (b1[0] - b0[0]) * 0.55, b0[1] + (b1[1] - b0[1]) * 0.55 - 14]);
        f.push(`<path d="M${pt(m1)}L${pt(m2)}" stroke="#000" stroke-opacity=".13" stroke-width="5"/>`);
      }
    });
    f.push(`<path d="M${hL[0] + 20} ${r(yW)}Q300 ${r(yW + 14)} ${X(hL[0] + 20)} ${r(yW)}" stroke="#000" stroke-opacity=".08" stroke-width="9"/><path d="M${hL[0] + 24} ${r(yW - 9)}Q300 ${r(yW + 4)} ${X(hL[0] + 24)} ${r(yW - 9)}" stroke="#fff" stroke-opacity=".06" stroke-width="7"/>`);
    f.push(`<path d="M240 ${hL[1] - 46}L236 ${hL[1] + 4}M360 ${hL[1] - 46}L364 ${hL[1] + 4}" stroke="#000" stroke-opacity=".07" stroke-width="10"/>`);
    f.push(`<ellipse cx="300" cy="${aL[1] + 8}" rx="74" ry="42" fill="#fff" fill-opacity=".07"/>`);
    f.push(`<path d="M${g.nL[0] - 6} ${g.nL[1] + 34}Q300 ${g.nL[1] + 52} ${X(g.nL[0] - 6)} ${g.nL[1] + 34}" stroke="#000" stroke-opacity=".06" stroke-width="7"/>`);
    art.push(`<g fill="none" stroke-linecap="round" filter="url(#${id}bl)">${f.join('')}</g>`);
  }
  // fabric shading: soft vertical highlight + edges
  defs.push(`<linearGradient id="${id}sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".07"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>`);
  defs.push(`<linearGradient id="${id}sv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>`);
  art.push(`<rect class="fs" width="600" height="600" fill="url(#${id}sh)"/><rect class="fs" width="600" height="600" fill="url(#${id}sv)"/>`);
  const fin = [];
  (g.cuffInfo || []).forEach((cf) => {
    const A = (k) => [cf.a[0] + cf.d[0] * k, cf.a[1] + cf.d[1] * k], B = (k) => [cf.b[0] + cf.d[0] * k, cf.b[1] + cf.d[1] * k];
    fin.push(rib(`M${pt(A(0.5))}L${pt(B(0.5))}`, r(Math.hypot(cf.d[0], cf.d[1]))));
    fin.push(stitch(`M${pt(A(1.2))}L${pt(B(1.2))}`));
  });
  if (spec.hemBand) fin.push(rib(`M${hL[0]} ${hL[1] - 8}Q300 ${hemC - 8} ${X(hL[0])} ${hL[1] - 8}`, 16));
  fin.push(stitch(`M${hL[0]} ${hL[1] - (spec.hemBand ? 18 : 6)}Q300 ${hemC - (spec.hemBand ? 18 : 6)} ${X(hL[0])} ${hL[1] - (spec.hemBand ? 18 : 6)}`));
  fin.push(stitch(`M${hL[0]} ${hL[1] - (spec.hemBand ? 21 : 9)}Q300 ${hemC - (spec.hemBand ? 21 : 9)} ${X(hL[0])} ${hL[1] - (spec.hemBand ? 21 : 9)}`));
  if (c.side) {
    const m = g.sides[0].match(/L([\d.]+ [\d.]+Q[\d.]+ [\d.]+ [\d.]+ [\d.]+)/);
    if (m) { const e = 'M' + m[1]; fin.push(stitch(e), stitch(mirrorPath(e))); }
  }
  parts.push(`<g clip-path="url(#${id}k)">${art.join('')}${fin.join('')}</g>`);

  // seams
  const seamCol = spec.outline || 'rgba(0,0,0,.25)';
  g.seams.forEach((d) => parts.push(`<path d="${d}" fill="none" stroke="${seamCol}" stroke-width="1.2"/><g transform="translate(2.2 .8)">${stitch(d, 0.9)}</g><g transform="translate(-2 -.6)">${stitch(d, 0.6)}</g>`));
  if (g.armholes) g.armholes.forEach((d) => parts.push(`<path d="${d}" fill="none" stroke="${c.trim}" stroke-width="12"/><path d="${d}" fill="none" stroke="${c.p2 || c.trim}" stroke-width="2.5" transform="translate(${d.includes('M220') ? 4 : -4} 0)"/>`));

  // collar
  if (view === 'front') {
    if (nk.trim) {
      parts.push(`<g class="cl"><path d="${nk.trim}" fill="none" stroke="${c.trim}" stroke-width="${nk.trimW}" stroke-linejoin="miter"/>${rib(nk.trim, nk.trimW)}<path d="${nk.trim}" fill="none" stroke="${c.p2 || c.trim}" stroke-width="2.4" transform="translate(0 ${nk.trimW / 2 + 1})" opacity=".9"/>${stitch(nk.trim, 1, `translate(0 ${nk.trimW / 2 + 3.6})`)}</g>`);
    }
    parts.push(`<path class="bt" d="${nk.backTrim}" fill="none" stroke="${shade(c.trim, -0.25)}" stroke-width="5"/>`);
  } else {
    // printed neck tape
    const tape = spec.template ? '' : `<path d="M${g.nL[0] + 8} ${g.nL[1] + 14}Q300 ${g.nL[1] + 28} ${X(g.nL[0] + 8)} ${g.nL[1] + 14}" fill="none" stroke="${shade(c.trim, 0.12)}" stroke-width="3" stroke-opacity=".6"/>`;
    parts.push(`<g class="cl"><path d="${nk.backTrim}" fill="none" stroke="${c.trim}" stroke-width="10"/>${rib(nk.backTrim, 10)}${stitch(nk.backTrim, 1, 'translate(0 7)')}${tape}</g>`);
  }
  if (nk.polo) {
    const [nL, nR] = [g.nL, g.nR];
    const vy = nk.vy;
    if (view === 'front') {
      parts.push(`<path d="M286 ${vy - 4}h28v64h-28Z" fill="${shade(c.base, -0.08)}" stroke="${outlineCol}"/><circle cx="300" cy="${vy + 14}" r="3" fill="${c.trim}"/><circle cx="300" cy="${vy + 38}" r="3" fill="${c.trim}"/>`);
      parts.push(`<path d="M${nL[0] - 6} ${nL[1] - 4}L${nL[0] - 18} ${nL[1] + 40}L292 ${vy + 4}L300 ${vy - 2}Q280 ${nL[1] + 10} ${nL[0] + 4} ${nL[1] - 8}Z" fill="${c.trim}" stroke="${outlineCol}"/>`);
      parts.push(`<path d="M${nR[0] + 6} ${nR[1] - 4}L${nR[0] + 18} ${nR[1] + 40}L308 ${vy + 4}L300 ${vy - 2}Q320 ${nR[1] + 10} ${nR[0] - 4} ${nR[1] - 8}Z" fill="${c.trim}" stroke="${outlineCol}"/>`);
      parts.push(`<path d="M${nL[0] - 14} ${nL[1] + 30}L292 ${vy}" stroke="${c.p2 || c.base}" stroke-width="2.5" opacity=".8"/><path d="M${nR[0] + 14} ${nR[1] + 30}L308 ${vy}" stroke="${c.p2 || c.base}" stroke-width="2.5" opacity=".8"/>`);
    } else {
      parts.push(`<path d="M${nL[0] - 6} ${nL[1] - 6}Q300 ${nL[1] + 2} ${nR[0] + 6} ${nR[1] - 6}L${nR[0] + 8} ${nR[1] + 14}Q300 ${nL[1] + 26} ${nL[0] - 8} ${nL[1] + 14}Z" fill="${c.trim}" stroke="${outlineCol}"/>`);
    }
  }
  if (nk.zip) {
    const [nL, nR] = [g.nL, g.nR];
    parts.push(`<path d="M${nL[0] - 4} ${nL[1] - 10}Q300 ${nL[1] + (view === 'front' ? 14 : 4)} ${nR[0] + 4} ${nR[1] - 10}L${nR[0] + 4} ${nR[1] + 12}Q300 ${nL[1] + (view === 'front' ? 34 : 24)} ${nL[0] - 4} ${nL[1] + 12}Z" fill="${c.trim}" stroke="${outlineCol}"/>`);
    if (view === 'front') {
      const zEnd = spec.halfZip ? 240 : g.hemY - 10;
      parts.push(`<path d="M300 ${nk.vy + 6}V${zEnd}" stroke="${shade(c.trim, -0.3)}" stroke-width="5"/><path d="M300 ${nk.vy + 6}V${zEnd}" stroke="#cfcfcf" stroke-width="1.6" stroke-dasharray="2 2"/><rect x="295" y="${nk.vy + 10}" width="10" height="18" rx="2" fill="#bdbdbd" stroke="#666" stroke-width=".8"/>`);
      if (nk.hood) parts.push(`<path d="M286 ${nk.vy + 6}q-6 40 -2 70M314 ${nk.vy + 6}q6 40 2 70" stroke="${c.p2 || '#fff'}" stroke-width="2.5" fill="none"/><circle cx="284" cy="${nk.vy + 78}" r="3.5" fill="${c.p2 || '#fff'}"/><circle cx="316" cy="${nk.vy + 78}" r="3.5" fill="${c.p2 || '#fff'}"/>`);
      if (spec.pocket) parts.push(`<path d="M228 400L372 400L392 470L208 470Z" fill="none" stroke="${outlineCol}" stroke-width="1.6"/><path d="M228 400L208 470M372 400L392 470" stroke="${shade(c.base, -0.3)}" stroke-width="4"/>`);
    }
  }

  // branding
  if (view === 'front') {
    const ch = { ...g.chest };
    if (spec.centreLogo) { ch.x = 300; ch.w *= 1.2; }
    parts.push(raisedLogo(id, ch.x, ch.y, ch.w, logoFill));
    if (!spec.template) {
      const tx = X(hL[0]) - 34, ty = hL[1] - 26, dark = isDark(c.base);
      parts.push(`<rect x="${tx}" y="${ty}" width="15" height="9" rx="1.2" fill="${dark ? '#f2f2f2' : '#151515'}"/><rect x="${tx + 0.8}" y="${ty + 0.8}" width="13.4" height="7.4" rx=".8" fill="none" stroke="${dark ? '#000' : '#fff'}" stroke-opacity=".35" stroke-width=".35" stroke-dasharray="1 .6"/>${logoUse(id, tx + 7.5, ty + 4.5, 8, dark ? '#111' : '#fff')}`);
      parts.push(`<text transform="translate(${X(hL[0]) - 40} ${hL[1] - 36}) rotate(-90)" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="5.2" letter-spacing="1.1" fill="${tone}" fill-opacity=".6">TMZ · ENGINEERED FOR PERFORMANCE</text>`);
    }
    if (spec.flag) parts.push(flag(X(ch.x) - 4, ch.y, 32));
    if (spec.chestNumber) parts.push(`<text x="${X(ch.x)}" y="${ch.y + 14}" font-family="Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" font-size="40" text-anchor="middle" fill="${logoFill}" opacity=".92">${spec.chestNumber}</text>`);
    if (spec.bigFront) parts.push(logoUse(id, 300, g.centre.y + 10, 150, logoFill, ' opacity=".9"'));
  } else {
    parts.push(raisedLogo(id, g.nape.x, g.nape.y, g.nape.w, logoFill));
    if (!spec.template) parts.push(`<text x="300" y="${hL[1] - 20}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="4.8" letter-spacing="1.1" text-anchor="middle" fill="${tone}" fill-opacity=".58">TMZ PERFORMANCE TEAMWEAR · MALAYSIA</text>`);
    if (spec.number) {
      parts.push(`<text x="300" y="${g.backNum.y + g.backNum.size * 0.36}" font-family="Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" font-size="${g.backNum.size}" text-anchor="middle" fill="${logoFill}" stroke="${shade(c.base, isDark(c.base) ? 0.25 : -0.25)}" stroke-width="1.2" paint-order="stroke">${spec.number}</text>`);
    }
    if (spec.name) parts.push(`<text x="300" y="${g.backNum.y - g.backNum.size * 0.5}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="22" letter-spacing="2" text-anchor="middle" fill="${logoFill}">${spec.name}</text>`);
  }

  // silhouette outline on top
  parts.push(`<path class="ol" d="${shapeD}" fill="none" stroke="${outlineCol}" stroke-width="${spec.outlineWidth || 1.6}" stroke-linejoin="round"/>`);

  return `${svgOpen(spec.cut)}<defs>${defs.join('')}</defs>${parts.join('')}</svg>`;
}

/** Track pants, front or back view. */
function renderPants(spec, view = 'front') {
  const g = CUTS.pants();
  const c = spec.colors;
  const id = 'p' + String(spec.id).replace(/[^a-z0-9]/gi, '') + (view === 'back' ? 'b' : 'f');
  const rand = rng(spec.id + (spec.pattern || ''));
  const defs = [];
  const logoFill = spec.logoColor || (isDark(c.base) ? '#ffffff' : '#111111');
  const outlineCol = spec.outline || 'rgba(0,0,0,.28)';
  const seamCol = spec.outline || 'rgba(0,0,0,.25)';
  const parts = [];
  defs.push(`<clipPath id="${id}k"><path d="${g.shape}"/></clipPath>`, logoDef(id), fabricDefs(id, spec.fabric || 'MICROTEX'));
  const tone = isDark(c.base) ? '#ffffff' : '#111111';
  const art = [`<rect width="600" height="600" fill="${c.base}"/><rect y="600" width="600" height="20" fill="${c.base}"/>`];
  if (spec.pattern && P[spec.pattern]) art.push(`<g>${P[spec.pattern]({ id, rand, c, defs })}</g>`);
  // side panels / stripes along the outer seams
  if (spec.stripe !== false) {
    const col = c.side || c.p2 || c.trim;
    art.push(`<path d="M186 118Q185 380 211 560L229 560Q204 380 204 118Z" fill="${col}"/><path d="M414 118Q415 380 389 560L371 560Q396 380 396 118Z" fill="${col}"/>`);
    art.push(`<path d="M208 118Q208 380 232 560M392 118Q392 380 368 560" stroke="${c.trim}" stroke-width="3" fill="none" opacity=".9"/>`);
  }
  // waistband + ankle cuffs
  art.push(`<path d="M196 86H404V118H196Z" fill="${c.trim}"/>`);
  art.push(`<path d="M206 554L276 554L278 572L204 572Z" fill="${c.trim}"/><path d="M324 554L394 554L396 572L322 572Z" fill="${c.trim}"/>`);
  art.push(rib('M196 102H404', 32), rib('M205 563L277 563', 18), rib('M323 563L395 563', 18));
  if (view === 'back') art.push(`<path d="M196 94H404M196 101H404M196 108H404" stroke="${shade(c.trim, -0.25)}" stroke-width="1.2"/>`);
  art.push(`<rect width="600" height="620" fill="url(#${id}fb)"/>`);
  // drape: crotch pulls, knee breaks, stacked ankles
  defs.push(`<filter id="${id}bl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>`);
  {
    const f = [];
    f.push('<path d="M300 272L262 232M300 272L338 232M296 284L280 330M304 284L320 330" stroke="#000" stroke-opacity=".14" stroke-width="6"/>');
    [[241, 1], [359, -1]].forEach(([cx]) => {
      f.push(`<path d="M${cx - 30} 392Q${cx} 404 ${cx + 30} 392" stroke="#000" stroke-opacity=".13" stroke-width="7"/><path d="M${cx - 28} 382Q${cx} 392 ${cx + 28} 382" stroke="#fff" stroke-opacity=".09" stroke-width="6"/>`);
      [516, 530, 544].forEach((y, k) => f.push(`<path d="M${cx - 28} ${y}Q${cx} ${y + 8} ${cx + 28} ${y}" stroke="${k % 2 ? '#fff' : '#000'}" stroke-opacity="${k % 2 ? '.08' : '.14'}" stroke-width="5"/>`));
      f.push(`<ellipse cx="${cx + (cx < 300 ? 8 : -8)}" cy="210" rx="34" ry="46" fill="#fff" fill-opacity=".07"/>`);
    });
    art.push(`<g fill="none" stroke-linecap="round" filter="url(#${id}bl)">${f.join('')}</g>`);
  }
  // stitching: waistband, cuffs, stripe edges
  art.push(stitch('M197 121H403'), stitch('M206 551L276 551'), stitch('M324 551L394 551'));
  if (spec.stripe !== false) art.push(stitch('M206 118Q206 380 230 554'), stitch('M394 118Q394 380 370 554'), stitch('M187 120Q186 380 212 554', 0.6), stitch('M413 120Q414 380 388 554', 0.6));
  // shading: per-leg roundness, crotch shadow
  defs.push(`<linearGradient id="${id}sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".16" stop-color="#000" stop-opacity="0"/><stop offset=".28" stop-color="#fff" stop-opacity=".07"/><stop offset=".42" stop-color="#000" stop-opacity=".02"/><stop offset=".5" stop-color="#000" stop-opacity=".16"/><stop offset=".58" stop-color="#000" stop-opacity=".02"/><stop offset=".72" stop-color="#fff" stop-opacity=".07"/><stop offset=".84" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>`);
  defs.push(`<radialGradient id="${id}cr" cx="300" cy="300" r="70" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`);
  art.push(`<rect class="fs" x="186" y="80" width="228" height="500" fill="url(#${id}sh)"/><rect class="fs" width="600" height="600" fill="url(#${id}cr)"/>`);
  parts.push(`<g clip-path="url(#${id}k)">${art.join('')}</g>`);
  // construction lines
  if (view === 'front') {
    parts.push(`<path d="M300 118V256M300 122Q318 170 300 214" stroke="${seamCol}" stroke-width="1.4" fill="none"/>`);
    parts.push(`<path d="M210 122Q236 150 242 200M390 122Q364 150 358 200" stroke="${seamCol}" stroke-width="1.6" fill="none"/>`, `<g transform="translate(3 0)">${stitch('M210 122Q236 150 242 200')}</g><g transform="translate(-3 0)">${stitch('M390 122Q364 150 358 200')}</g>`);
    // drawstrings
    const cord = c.p2 && c.p2 !== c.trim ? c.p2 : '#ffffff';
    parts.push(`<circle cx="290" cy="104" r="3" fill="${shade(c.trim, -0.4)}"/><circle cx="310" cy="104" r="3" fill="${shade(c.trim, -0.4)}"/><path d="M290 104q-6 30 -10 60M310 104q6 30 10 60" stroke="${cord}" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="276" y="160" width="7" height="12" rx="2" fill="#bdbdbd"/><rect x="317" y="160" width="7" height="12" rx="2" fill="#bdbdbd"/>`);
    parts.push(raisedLogo(id, 238, 240, 34, logoFill));
    parts.push(`<text transform="translate(366 470) rotate(-86)" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="5" letter-spacing="1.1" fill="${tone}" fill-opacity=".6">TMZ TRACK · PERFORMANCE</text>`);
  } else {
    parts.push(`<path d="M300 118V262" stroke="${seamCol}" stroke-width="1.4"/><path d="M326 150h56v50h-56z" fill="none" stroke="${seamCol}" stroke-width="1.6"/><path d="M326 150h56v14h-56z" fill="${shade(c.base, -0.1)}" stroke="${seamCol}" stroke-width="1.2"/>`);
    parts.push(`<g transform="translate(3 0)">${stitch('M326 164h56M326 150v50h56v-50')}</g>`);
    parts.push(raisedLogo(id, 300, 102, 26, isDark(c.trim) ? '#ffffff' : '#111111'));
  }
  parts.push(`<path class="ol" d="${g.shape}" fill="none" stroke="${outlineCol}" stroke-width="${spec.outlineWidth || 1.6}" stroke-linejoin="round"/>`);
  return `${svgOpen('pants')}<defs>${defs.join('')}</defs>${parts.join('')}</svg>`;
}

/** Simplified Malaysian flag. */
function flag(cx, cy, w) {
  const h = w / 2, x = cx - w / 2, y = cy - h / 2;
  let s = `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>`;
  for (let i = 0; i < 14; i += 2) s += `<rect x="${x}" y="${r(y + (h / 14) * i)}" width="${w}" height="${r(h / 14)}" fill="#cc0001"/>`;
  s += `<rect x="${x}" y="${y}" width="${w / 2}" height="${r((h / 14) * 8)}" fill="#010066"/><circle cx="${r(x + w * 0.17)}" cy="${r(y + h * 0.29)}" r="${r(h * 0.2)}" fill="#fc0"/><circle cx="${r(x + w * 0.2)}" cy="${r(y + h * 0.29)}" r="${r(h * 0.17)}" fill="#010066"/><circle cx="${r(x + w * 0.36)}" cy="${r(y + h * 0.29)}" r="${r(h * 0.11)}" fill="#fc0"/></g>`;
  return s;
}

const META = Object.fromEntries(Object.keys(CUTS).map((k) => [k, { ...CUTS[k]({}).meta, vb: VB[k].split(' ').map(Number) }]));

module.exports = { render, logo, shade, mix, isDark, rng, VB, META, PATTERNS: Object.keys(P).filter((k) => !k.startsWith('_')), LOGO_D, LOGO_VIEWBOX: [LVX, LVY, LVW, LVH] };

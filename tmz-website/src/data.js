'use strict';
/*
 * TMZ site content.
 * ---------------------------------------------------------------------------
 * Everything brand-specific lives here: contact details, social links,
 * collections, products, prices. Edit this file and run `node src/build.js`
 * to regenerate the website in /site.
 *
 * Values marked  // TODO  are placeholders that must be replaced with your
 * real business details before going live.
 */

const site = {
  brand: 'TMZ',
  company: 'TMZ Sdn Bhd', // TODO legal company name
  regNo: '0000000-X', // TODO SSM registration number
  title: 'TMZ - Sublimation Sportswear Customize Expert',
  description:
    'TMZ brings custom sublimation sportswear and active lifestyle apparel to the next level. Designed and manufactured in Malaysia.',
  tagline: 'Custom teamwear, made in Malaysia.',
  rotatingWords: ['PRIDE.', 'YOUR TEAM.', 'SPEED.', 'VICTORY.'],
  phone: '+60 12-345 6789', // TODO
  phoneDisplay: '(+6)012-345 6789', // TODO
  office: '(+6)03-0000 0000', // TODO
  whatsapp: '60123456789', // TODO number used for wa.me links (no +, no spaces)
  email: 'support@tmz.example', // TODO
  address: {
    city: 'Kuala Lumpur, Malaysia', // TODO
    lines: ['No. 1, Jalan Contoh 1/1', '50000 Kuala Lumpur', 'Wilayah Persekutuan, Malaysia'], // TODO
  },
  hours: [
    ['Monday to Friday', '10 AM – 6 PM'],
    ['Saturday', '10 AM – 6 PM'],
    ['Sunday', 'Close'],
  ],
  mapQuery: 'Kuala Lumpur, Malaysia', // TODO used for the Google Maps embed on the contact page
  social: {
    facebook: 'https://www.facebook.com/', // TODO
    x: 'https://x.com/', // TODO
    instagram: 'https://www.instagram.com/', // TODO
  },
  payments: ['Billplz', 'FPX', 'Mastercard', 'VISA'],
  year: 2026,
};

// --------------------------------------------------------------------------
// Colour palettes used for colourways: [base, p1, p2, p3, trim, accent]
// --------------------------------------------------------------------------
const PAL = {
  midnightMint: ['#101214', '#3ecf8e', '#7b4dd8', '#e0c341', '#0c0c0c', '#4b2d8f'],
  mono: ['#0f0f10', '#5c5c5c', '#9a9a9a', '#2a2a2a', '#0a0a0a', '#1d1d1d'],
  steel: ['#16191d', '#d7dbe0', '#ffffff', '#5d6670', '#0d0f12', '#c4cad1'],
  pearl: ['#f4f3ef', '#cfe6dc', '#f7d9e4', '#d7e3f5', '#e8e6df', '#a6d9c7'],
  teal: ['#0c2226', '#1c8f8a', '#f2c94c', '#0f4f52', '#081315', '#f2c94c'],
  forest: ['#0b1a0e', '#2fa84f', '#e8f74a', '#163d1f', '#0b0b0b', '#e8f74a'],
  snow: ['#f2f2ee', '#1a1a1a', '#bdbdbd', '#666666', '#111111', '#2b2b2b'],
  graphite: ['#2a2b2e', '#c9c9c9', '#ffffff', '#6d6e72', '#141414', '#8a8b8f'],
  navyWave: ['#f3f5f9', '#14244f', '#4f78c4', '#9bb3e0', '#14244f', '#14244f'],
  rust: ['#1b0f09', '#c4521c', '#f08a3c', '#5a2410', '#120905', '#e0e0e0'],
  icePanel: ['#0d0d0f', '#8fc8ff', '#ffffff', '#2f6db5', '#0d0d0f', '#121418'],
  greySlate: ['#cfd2d4', '#7c8389', '#f5f5f5', '#40464c', '#3a3f44', '#40464c'],
  aqua: ['#0a2a33', '#28d1c4', '#0f6f8a', '#b7fff6', '#071a20', '#ffffff'],
  sunset: ['#2b1f5c', '#ff5a36', '#ffb03a', '#7d3cff', '#1a1238', '#ffb03a'],
  blush: ['#1a1418', '#d63a6e', '#3a1f2c', '#ff8fb3', '#100b0e', '#3a1f2c'],
  lime: ['#0b1a0e', '#7bd14a', '#e8f74a', '#1b3a12', '#0b0b0b', '#e8f74a'],
  cream: ['#f1ece0', '#d9d2c0', '#ffffff', '#c9bea3', '#1b2236', '#1b2236'],
  black: ['#111111', '#2e2e2e', '#3c3c3c', '#1c1c1c', '#000000', '#4a4a4a'],
  sky: ['#57c4e5', '#a6e6f7', '#ffffff', '#2b9fc4', '#ff9b8e', '#ffffff'],
  limePearl: ['#eef0e6', '#d6f04a', '#ffffff', '#c3c9b4', '#bfc5ad', '#d6f04a'],
  ivory: ['#f3efe6', '#e1d7c3', '#ffffff', '#cbbf9f', '#1b2236', '#1b2236'],
  limeShock: ['#f4f7ee', '#c6f43e', '#ffffff', '#9fd31f', '#183f23', '#183f23'],
  violet: ['#6d3fa6', '#f08a4b', '#ffb36b', '#3b1f61', '#3b1f61', '#3b1f61'],
  carbon: ['#1a1a1a', '#3a3a3a', '#5a5a5a', '#262626', '#0e0e0e', '#d0d0d0'],
  royal: ['#efece2', '#1b2236', '#c9a24a', '#d8d3c4', '#1b2236', '#1b2236'],
  crimson: ['#a3121f', '#d4243a', '#ffffff', '#5c0912', '#14090a', '#ffffff'],
  ocean: ['#0f2a5c', '#1f63d8', '#7fd4ff', '#0a1a3b', '#0a1a3b', '#ffffff'],
  emerald: ['#0a5c2e', '#062b16', '#35d07f', '#ffffff', '#08160e', '#35d07f'],
  sand: ['#e7e3d6', '#8b8572', '#333333', '#666666', '#2b2b2b', '#8b8572'],
  magenta: ['#16245a', '#ff3ea5', '#2de2c2', '#0e1638', '#0e1638', '#ff3ea5'],
  tangerine: ['#ff6a00', '#ff8a3d', '#ffd2b0', '#ffffff', '#222222', '#222222'],
  gold: ['#151515', '#f5c518', '#ffe27a', '#6b5408', '#0a0a0a', '#f5c518'],
  neon: ['#0f1b2d', '#1d3557', '#ff2e88', '#ffffff', '#ff2e88', '#ffffff'],
  cyber: ['#120a2a', '#7a2cff', '#00e5ff', '#ff2e88', '#0a0518', '#00e5ff'],
  olive: ['#2f3a1f', '#56663a', '#c9b458', '#1d2414', '#141a0d', '#c9b458'],
  maroon: ['#4a0f1f', '#7a1d35', '#e8b04a', '#2b0812', '#1f050c', '#e8b04a'],
  white: ['#f7f7f7', '#e3e3e3', '#c7c7c7', '#ffffff', '#1b1b1b', '#1b1b1b'],
};
const pal = (k, extra = {}) => {
  const [base, p1, p2, p3, trim, accent] = PAL[k];
  return { base, p1, p2, p3, trim, accent, ...extra };
};

// --------------------------------------------------------------------------
// Teamwear series. Each design ships in five colourways (A–E).
// layout.sleeve: 'accent' | 'trim' | 'pattern' | null
// --------------------------------------------------------------------------
const series = [
  {
    slug: 'court',
    name: 'COURT',
    code: 'C',
    isNew: true,
    sports: ['PICKLEBALL', 'BADMINTON', 'TENNIS'],
    theme: { bg: '#d6ef3b', bg2: '#c3e027', ink: '#111111', motif: 'court' },
    description:
      'Raise your game with the Court series. A fresh line-up of modern, high-performance designs built for racket sports, giving you full freedom to customise your team jersey with unique patterns, custom colours, logos and neck styles. Engineered for maximum breathability and durability, it keeps your squad looking sharp and playing at its peak, rally after rally.',
    blurb:
      'The Court Series is our new edition made for racket sports like pickleball, badminton and tennis. Choose from 5 designs, each in 5 colourways, and make it your team’s own with names, numbers and logos. Built to move, rally after rally.',
    fabrics: ['ARCTIX', 'HEXA', 'AGILIS', 'QUADRA'],
    designs: [
      { cut: 'tee', raglan: true, neck: 'v', pattern: 'halftone', layout: { sleeve: 'pattern' }, pals: ['midnightMint', 'mono', 'steel', 'pearl', 'teal'] },
      { cut: 'tee', raglan: true, neck: 'crew', pattern: 'marble', layout: {}, pals: ['forest', 'snow', 'graphite', 'navyWave', 'rust'] },
      { cut: 'tee', raglan: true, neck: 'v', pattern: 'shards', layout: { sleeve: 'pattern' }, pals: ['icePanel', 'greySlate', 'aqua', 'sunset', 'blush'] },
      { cut: 'tee', neck: 'crew', pattern: 'chevron', layout: { side: true }, pals: ['lime', 'cream', 'black', 'sky', 'limePearl'] },
      { cut: 'tee', raglan: true, neck: 'polo', pattern: 'diamond', layout: { sleeve: 'accent' }, pals: ['ivory', 'limeShock', 'violet', 'carbon', 'royal'] },
    ],
  },
  {
    slug: 'vertex',
    name: 'VERTEX',
    code: 'VX',
    sports: ['FOOTBALL', 'FUTSAL', 'VOLLEYBALL'],
    theme: { bg: '#141414', bg2: '#ff4d2e', ink: '#ffffff', motif: 'stripes' },
    description:
      'Sharp angles, bold geometry. VERTEX is built for squads that want to stand out from kick-off, with aggressive cuts and contrast panels that you can recolour, rename and number any way you like.',
    blurb: 'Angular, aggressive and fully customisable. VERTEX gives every squad a look that hits as hard as they play.',
    fabrics: ['ARCTIX', 'HEXA', 'AGILIS', 'QUADRA'],
    designs: [
      { cut: 'tee', neck: 'v', pattern: 'mosaic', layout: { sleeve: 'trim' }, pals: ['crimson', 'ocean', 'black', 'gold', 'emerald'] },
      { cut: 'tee', raglan: true, neck: 'crew', pattern: 'sash', layout: {}, pals: ['white', 'maroon', 'navyWave', 'tangerine', 'olive'] },
      { cut: 'tee', neck: 'v', pattern: 'bolt', layout: { side: true }, pals: ['cyber', 'carbon', 'ocean', 'forest', 'sunset'] },
    ],
  },
  {
    slug: 'prism',
    name: 'PRISM',
    code: 'PR',
    sports: ['FOOTBALL', 'FUTSAL', 'RUNNING'],
    theme: { bg: '#2b1f5c', bg2: '#ff5a36', ink: '#ffffff', motif: 'glow' },
    description:
      'Light, colour and motion. PRISM uses layered gradients and refracted shapes that come alive on the pitch. Pick a colourway, then add your crest, sponsors and numbers.',
    blurb: 'Layered gradients and refracted shapes that come alive under the lights.',
    fabrics: ['ARCTIX', 'HEXA', 'AGILIS', 'QUADRA'],
    designs: [
      { cut: 'tee', raglan: true, neck: 'v', pattern: 'fade', layout: { sleeve: 'trim' }, pals: ['sunset', 'aqua', 'blush', 'ocean', 'gold'] },
      { cut: 'tee', neck: 'crew', pattern: 'waves', layout: {}, pals: ['neon', 'teal', 'magenta', 'crimson', 'graphite'] },
      { cut: 'tee', raglan: true, neck: 'v', pattern: 'shards', layout: { sleeve: 'pattern' }, pals: ['cyber', 'steel', 'violet', 'rust', 'emerald'] },
    ],
  },
  {
    slug: 'orbit',
    name: 'ORBIT',
    code: 'OR',
    sports: ['FOOTBALL', 'FUTSAL', 'LIFESTYLE'],
    theme: { bg: '#e9e4da', bg2: '#d14a2b', ink: '#111111', motif: 'rings' },
    description:
      'ORBIT blends retro football shirts with modern sublimation. Classic collars, heritage stripes and graphic crests, made to be worn on the pitch and off it.',
    blurb: 'Retro football heritage meets modern sublimation. On the pitch and off it.',
    fabrics: ['ARCTIX', 'HEXA', 'AGILIS', 'QUADRA'],
    designs: [
      { cut: 'tee', neck: 'polo', pattern: 'stripes', layout: {}, pals: ['white', 'crimson', 'emerald', 'ocean', 'gold'] },
      { cut: 'tee', neck: 'v', pattern: 'pinstripe', layout: { sleeve: 'accent' }, pals: ['blush', 'carbon', 'royal', 'teal', 'sky'] },
      { cut: 'tee', neck: 'crew', pattern: 'band', layout: { sleeve: 'trim' }, pals: ['snow', 'maroon', 'navyWave', 'olive', 'tangerine'] },
    ],
  },
  {
    slug: 'on-field',
    name: 'ON-FIELD',
    code: 'OF',
    sports: ['FOOTBALL', 'RUGBY', 'HOCKEY'],
    theme: { bg: '#123a1c', bg2: '#2a7a3b', ink: '#ffffff', motif: 'pitch' },
    description:
      'Made for match day. ON-FIELD jerseys combine lightweight performance fabric with loud, high-energy graphics so your team is impossible to miss from the stands.',
    blurb: 'Lightweight, loud and made for match day.',
    fabrics: ['ARCTIX', 'HEXA', 'AGILIS', 'QUADRA'],
    designs: [
      { cut: 'tee', neck: 'v', pattern: 'brush', layout: {}, pals: ['magenta', 'gold', 'crimson', 'ocean', 'forest'] },
      { cut: 'tee', raglan: true, neck: 'crew', pattern: 'camo', layout: { sleeve: 'trim' }, pals: ['olive', 'carbon', 'navyWave', 'sand', 'maroon'] },
      { cut: 'tee', neck: 'v', pattern: 'liquid', layout: {}, pals: ['emerald', 'cyber', 'sunset', 'aqua', 'blush'] },
    ],
  },
  {
    slug: 'volt',
    name: 'VOLT',
    code: 'VT',
    sports: ['FUTSAL', 'BASKETBALL', 'NETBALL'],
    theme: { bg: '#0e1638', bg2: '#ffe14d', ink: '#ffffff', motif: 'bolt' },
    description: 'High voltage graphics for indoor courts. VOLT pairs electric line work with breathable mesh panels for fast, sweaty games.',
    blurb: 'Electric line work for fast indoor games.',
    fabrics: ['ARCTIX', 'HEXA', 'AGILIS', 'QUADRA'],
    designs: [
      { cut: 'vest', neck: 'v', pattern: 'bolt', layout: {}, pals: ['ocean', 'gold', 'crimson', 'black', 'emerald'] },
      { cut: 'tee', neck: 'crew', pattern: 'grid', layout: { side: true }, pals: ['tangerine', 'neon', 'lime', 'carbon', 'sky'] },
      { cut: 'vest', neck: 'scoop', pattern: 'liquid', layout: {}, pals: ['emerald', 'violet', 'teal', 'blush', 'steel'] },
    ],
  },
  {
    slug: 'esport',
    name: 'E-SPORT',
    code: 'ES',
    sports: ['MOBA', 'FPS', 'SIM RACING'],
    theme: { bg: '#120a2a', bg2: '#7a2cff', ink: '#ffffff', motif: 'neon' },
    description:
      'Gear up for the stage. E-SPORT jerseys are cut for long sessions and designed to look good on camera, with space for gamer tags, sponsor logos and team crests.',
    blurb: 'Cut for long sessions, designed for the camera.',
    fabrics: ['ARCTIX', 'HEXA', 'AGILIS', 'QUADRA'],
    designs: [
      { cut: 'long', raglan: true, neck: 'v', pattern: 'hex', layout: { sleeve: 'pattern' }, sleevePattern: 'waves', pals: ['neon', 'cyber', 'gold', 'emerald', 'crimson'] },
      { cut: 'tee', raglan: true, neck: 'v', pattern: 'topo', layout: { sleeve: 'accent' }, pals: ['cyber', 'steel', 'magenta', 'teal', 'black'] },
      { cut: 'tee', neck: 'crew', pattern: 'shards', layout: {}, pals: ['sunset', 'icePanel', 'blush', 'ocean', 'lime'] },
    ],
  },
  {
    slug: 'windbreaker',
    name: 'WINDBREAKER',
    code: 'WB',
    isNew: true,
    sports: ['TRAINING', 'TRAVEL', 'SUPPORTERS'],
    theme: { bg: '#1d3fb8', bg2: '#7fd4ff', ink: '#ffffff', motif: 'wind' },
    description: 'Lightweight, water-resistant and fully sublimated. Our windbreakers keep your team dry on the way to the game and looking united on the sidelines.',
    blurb: 'Lightweight, water-resistant and fully sublimated.',
    fabrics: ['MICROTEX', 'TASLAN', 'RIPSTOP', 'MESH'],
    designs: [
      { cut: 'long', neck: 'hood', halfZip: true, pocket: true, pattern: 'bolt', layout: { sleeve: 'trim' }, pals: ['ocean', 'black', 'crimson', 'emerald', 'tangerine'] },
      { cut: 'long', neck: 'hood', halfZip: true, pocket: true, pattern: 'waves', layout: { sleeve: 'accent' }, pals: ['carbon', 'navyWave', 'olive', 'sand', 'violet'] },
      { cut: 'long', neck: 'hood', halfZip: true, pocket: true, pattern: 'camo', layout: {}, pals: ['olive', 'graphite', 'ocean', 'maroon', 'snow'] },
    ],
  },
  {
    slug: 'training-jacket',
    name: 'JACKET',
    code: 'JK',
    sports: ['TRAINING', 'WARM-UP', 'TRAVEL'],
    theme: { bg: '#20252b', bg2: '#3d4955', ink: '#ffffff', motif: 'stripes' },
    description: 'Full-zip training jackets with stand collars, built for warm-ups and travel days. Add your crest, initials and sponsors.',
    blurb: 'Full-zip training jackets for warm-ups and travel days.',
    fabrics: ['MICROTEX', 'TASLAN', 'RIPSTOP', 'MESH'],
    designs: [
      { cut: 'long', neck: 'zip', pattern: 'camo', layout: { sleeve: 'trim' }, pals: ['graphite', 'olive', 'ocean', 'maroon', 'carbon'] },
      { cut: 'long', neck: 'zip', pattern: 'sash', layout: { sleeve: 'trim' }, pals: ['black', 'crimson', 'royal', 'emerald', 'neon'] },
      { cut: 'long', raglan: true, neck: 'zip', pattern: 'fade', layout: { sleeve: 'accent' }, pals: ['sunset', 'teal', 'carbon', 'gold', 'blush'] },
    ],
  },
  {
    slug: 'bib',
    name: 'BIB',
    code: 'BB',
    sports: ['TRAINING', 'SCRIMMAGE', 'EVENTS'],
    theme: { bg: '#ff6a00', bg2: '#ffd2b0', ink: '#111111', motif: 'grid' },
    description: 'Training bibs and singlets that tell your squads apart. Breathable mesh, bright colourways and big, readable numbers.',
    blurb: 'Breathable training bibs with big, readable numbers.',
    fabrics: ['MESH', 'HEXA', 'AGILIS', 'QUADRA'],
    designs: [
      { cut: 'vest', neck: 'scoop', pattern: 'grid', layout: {}, number: true, pals: ['tangerine', 'lime', 'ocean', 'crimson', 'gold'] },
      { cut: 'vest', neck: 'v', pattern: 'hex', layout: {}, number: true, pals: ['emerald', 'cyber', 'sky', 'black', 'magenta'] },
      { cut: 'vest', neck: 'scoop', pattern: 'pinstripe', layout: {}, number: true, pals: ['white', 'neon', 'olive', 'violet', 'teal'] },
    ],
  },
];

// Menu structure (mirrors the reference layout)
const menu = [
  { label: 'HOME', href: 'index.html', key: 'home' },
  {
    label: 'TEAMWEAR',
    key: 'teamwear',
    children: [
      {
        label: 'JERSEY',
        children: ['court', 'vertex', 'prism', 'orbit', 'on-field', 'volt', 'esport'],
      },
      { series: 'windbreaker' },
      { series: 'training-jacket' },
      { series: 'bib' },
    ],
  },
  { label: 'COLLABORATION', key: 'collab', children: [{ label: 'CLUB', href: 'club.html' }] },
  {
    label: 'SOLO',
    key: 'solo',
    children: [
      { label: 'SOLO', href: 'solo.html' },
      { label: 'RUNNING', href: 'running.html', isNew: true },
    ],
  },
  { label: 'TMZ LOYALTY', href: 'tmz-loyalty.html', key: 'loyalty' },
];

// --------------------------------------------------------------------------
// Solo (retail) products — fixed designs with a price.
// --------------------------------------------------------------------------
const solo = [
  // Pit Lane Heritage (motorsport-inspired oversized long sleeves)
  ...[
    ['strada', 'STRADA', { base: '#111111', p1: '#1e1e1e', p2: '#18c3a6', p3: '#ffffff', trim: '#18c3a6', sleeve: '#18c3a6', side: '#ffffff' }, 'pinstripe'],
    ['rosso', 'ROSSO', { base: '#d1121c', p1: '#b00d16', p2: '#ffd200', p3: '#ffffff', trim: '#ffffff', sleeve: '#ffffff', side: '#111111' }, 'shards'],
    ['nightfall', 'NIGHTFALL', { base: '#0f1838', p1: '#16224d', p2: '#e2242c', p3: '#ffd200', trim: '#e2242c', sleeve: '#e2242c', side: '#16224d' }, 'pinstripe'],
    ['ember', 'EMBER', { base: '#121212', p1: '#262626', p2: '#ff7a1a', p3: '#ffffff', trim: '#ff7a1a', sleeve: '#3a3a3a', side: '#ff7a1a' }, 'pinstripe'],
    ['verde', 'VERDE', { base: '#0f4a3c', p1: '#0a2e26', p2: '#d6f04a', p3: '#ffffff', trim: '#d6f04a' }, 'fade'],
  ].map(([slug, name, colors, pattern]) => ({
    slug, name, group: 'PIT LANE', cats: ['PIT LANE'], price: 109, isNew: true,
    spec: { cut: 'wide', neck: 'crew', pattern, colors },
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    details: ['TYPE OF COLLAR: Round Neck', 'TYPE OF SLEEVE: Long Sleeves', 'CUTTING: Oversize Cut'],
    sizeChart: { cols: ['SIZE', 'X', 'Y', 'Z'], rows: [['S', 22, 26, 27.5], ['M', 23, 27, 28.5], ['L', 24, 28, 29.5], ['XL', 25, 29, 30.5], ['2XL', 26, 30, 31.5]] },
    story: 'Inspired by the speed, precision and legacy of motorsport. Pit Lane Heritage brings the energy of race day straight to your wardrobe, whether you live for the grid or just love high-performance fashion.',
  })),
  // Unity
  ...[
    ['unity-black-2026', 'UNITY BLACK 2026', { base: '#111111', p1: '#1c1c1c', p2: '#f5cf0d', p3: '#2b2b2b', trim: '#f5cf0d', side: '#f5cf0d' }, 'pinstripe'],
    ['unity-yellow-2026', 'UNITY YELLOW 2026', { base: '#f5cf0d', p1: '#111111', p2: '#111111', p3: '#111111', trim: '#111111' }, 'stripes'],
  ].map(([slug, name, colors, pattern]) => ({
    slug, name, group: 'UNITY', cats: ['SOLO', 'UNITY'], price: 35,
    spec: { cut: 'tee', neck: 'v', pattern, colors, flag: true },
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    details: ['TYPE OF COLLAR: V-Neck', 'TYPE OF SLEEVE: Short Sleeves', 'CUTTING: Regular Fit'],
    story: 'One nation, one colour. The Unity jersey celebrates the spirit of Malaysian sport.',
  })),
  // Floral
  ...[
    ['floral-men-1a', 'Floral Men – 1A', '#f2f2f2', '#dedede', '#e8e8e8', '#cfcfcf', '#8c8c8c', '25'],
    ['floral-men-1b', 'Floral Men – 1B', '#2c3e5c', '#38507a', '#435f8f', '#22324c', '#1a2638', '25'],
    ['floral-men-2a', 'Floral Men – 2A', '#bfe3f2', '#f6c9d6', '#ffffff', '#9fd0e6', '#f3a5bb', '3'],
    ['floral-men-2b', 'Floral Men – 2B', '#1c1020', '#6e1f3a', '#3e1426', '#8e2a4c', '#7c8bb5', '18'],
    ['floral-men-3a', 'Floral Men – 3A', '#6f7b62', '#7e8b70', '#879579', '#5f6a54', '#3f473a', '13'],
    ['floral-men-3b', 'Floral Men – 3B', '#3c3f3c', '#4b4f4b', '#565a55', '#2f322f', '#222222', '13'],
    ['floral-women-1a', 'Floral Women – 1A', '#f7e9ee', '#f2c3d2', '#ffffff', '#e8a9bd', '#d9849f', '7'],
    ['floral-women-1b', 'Floral Women – 1B', '#2b2d42', '#4a4e75', '#5c6190', '#1f2133', '#8d99ae', '7'],
    ['floral-women-2a', 'Floral Women – 2A', '#bfe3f2', '#f6c9d6', '#ffffff', '#9fd0e6', '#f3a5bb', '3'],
    ['floral-women-2b', 'Floral Women – 2B', '#efe6d8', '#d8c3a5', '#ffffff', '#c7ad86', '#8a6d48', '9'],
  ].map(([slug, name, base, p1, p2, p3, trim, num], i) => ({
    slug, name, group: 'FLORAL', cats: i === 4 ? ['SOLO', 'Floral'] : ['Floral'], price: name.includes('Women') ? 65 : 70,
    isHot: slug === 'floral-men-2a' || slug === 'floral-women-2a',
    spec: { cut: 'tee', neck: 'crew', pattern: 'floral', colors: { base, p1, p2, p3, trim }, chestNumber: num },
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    details: ['TYPE OF COLLAR: Round Neck', 'TYPE OF SLEEVE: Short Sleeves', 'CUTTING: Regular Fit'],
    story: 'Soft tonal florals on a performance jersey. Made for game day, good enough for every day.',
  })),
];

// Running collection
const running = [
  ['stride-001', 'STRIDE 001', 'vest', 'scoop', 'fade', pal('aqua')],
  ['stride-002', 'STRIDE 002', 'vest', 'scoop', 'fade', pal('sunset')],
  ['stride-003', 'STRIDE 003', 'vest', 'scoop', 'fade', pal('lime')],
  ['pace-001', 'PACE 001', 'tee', 'crew', 'topo', pal('sand')],
  ['pace-002', 'PACE 002', 'tee', 'crew', 'topo', pal('carbon')],
  ['pace-003', 'PACE 003', 'tee', 'crew', 'topo', pal('ocean')],
  ['drift-001', 'DRIFT 001', 'tee', 'crew', 'camo', pal('snow')],
  ['drift-002', 'DRIFT 002', 'tee', 'crew', 'camo', pal('forest')],
  ['drift-003', 'DRIFT 003', 'tee', 'crew', 'camo', pal('blush')],
].map(([slug, name, cut, neck, pattern, colors]) => ({
  slug, name, group: name.split(' ')[0], cats: ['Running'], price: cut === 'vest' ? 59 : 69, isNew: true,
  spec: { cut, neck, pattern, colors: { ...colors } },
  sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
  details: [`TYPE OF COLLAR: ${neck === 'scoop' ? 'Scoop Neck' : 'Round Neck'}`, `TYPE OF SLEEVE: ${cut === 'vest' ? 'Sleeveless' : 'Short Sleeves'}`, 'CUTTING: Athletic Fit', 'FABRIC: AGILIS 160 GSM'],
  story: 'Built for the long run. Featherlight fabric, flatlock seams and colours you can see from the next kilometre.',
}));

// Collaboration clubs (sample content — replace with your real partner clubs)
const clubs = [
  {
    slug: 'iron-fit-society',
    name: 'IRON FIT SOCIETY',
    panel: { bg: 'linear-gradient(135deg,#0f3d28,#3fcf8e)', mark: 'IRON FIT' },
    products: [
      { slug: 'iron-fit-society', name: 'IRON FIT SOCIETY', price: 50, was: 58, isNew: true, spec: { cut: 'tee', neck: 'crew', pattern: 'liquid', colors: pal('emerald') } },
    ],
  },
  {
    slug: 'strikers-fc',
    name: 'STRIKERS FC',
    panel: { bg: '#2f8f4a', mark: 'STRIKERS FC', badge: true },
    products: [
      { slug: 'strikers-fc-home', name: 'Strikers FC Home', price: 89, isNew: true, spec: { cut: 'tee', neck: 'polo', pattern: 'pinstripe', colors: { base: '#f7f7f2', p1: '#2f8f4a', p2: '#f2b233', p3: '#2f8f4a', trim: '#1f6b35', sleeve: '#f7f7f2' } } },
      { slug: 'strikers-fc-away', name: 'Strikers FC Away', price: 89, spec: { cut: 'tee', neck: 'polo', pattern: 'pinstripe', colors: { base: '#1f6b35', p1: '#2f8f4a', p2: '#f2b233', p3: '#f2b233', trim: '#f2b233' } } },
      { slug: 'strikers-fc-windbreaker', name: 'Strikers FC Windbreaker', price: 129, spec: { cut: 'long', neck: 'hood', halfZip: true, pocket: true, pattern: 'band', colors: { base: '#1f6b35', p1: '#f2b233', p2: '#ffffff', p3: '#fff', trim: '#143f21', sleeve: '#143f21' } } },
    ],
  },
  {
    slug: 'pacesetters-run-club',
    name: 'PACESETTERS RUN CLUB',
    panel: { bg: 'linear-gradient(135deg,#111,#3a3a3a)', mark: 'PACESETTERS' },
    products: [
      { slug: 'pacesetters-run-club-clan', name: 'Pacesetters Run Club – Clan', price: 69, spec: { cut: 'tee', neck: 'crew', pattern: 'camo', colors: pal('carbon') } },
    ],
  },
];

module.exports = { site, series, menu, solo, running, clubs, pal, PAL };

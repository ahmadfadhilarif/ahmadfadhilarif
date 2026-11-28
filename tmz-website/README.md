# TMZ — custom sportswear storefront

A static storefront for **TMZ**, laid out like a WordPress/WooCommerce (WoodMart theme) teamwear shop:
top bar, mega dropdown, hero carousel, category tiles, series pages with design/colourway grids,
product pages with an order-request form, a loyalty page, and the gradient "Built for PRIDE." footer.

All artwork is original. The jersey designs are generated SVGs carrying the TMZ mark, and the
banners are HTML/CSS compositions, so there are no third-party photos or logos.

## What's inside

```
tmz-website/
├── site/                  ← the finished website (deploy this folder)
│   ├── index.html         home
│   ├── court.html …       11 teamwear series pages (court, vertex, prism, orbit, on-field,
│   │                      volt, esport, windbreaker, training-jacket, bib, track-pants)
│   ├── product/*.html     201 product pages
│   ├── solo.html, running.html, shop.html, club.html, tmz-loyalty.html
│   ├── contact-us.html, about-us.html, track-order.html
│   ├── shopping-cart.html, checkout.html, my-account.html
│   ├── terms-and-conditions.html, privacy.html, payment-flow.html,
│   │   shipping-and-return-policy.html, refund-policy.html, 404.html
│   └── assets/            css, js, logo SVGs, generated jersey SVGs
└── src/                   ← generator
    ├── data.js            ★ brand details, collections, products, prices
    ├── jersey.js          procedural jersey artwork (front + back SVG)
    ├── layout.js          header / menu / footer
    ├── components.js      cards, banners, product detail panels
    ├── pages.js           page templates
    ├── catalog.js         products, lookups and page helpers (also bundled for the browser)
    ├── viewer3d.js        3D mannequin viewer (copied to site/assets/js with garment landmarks)
    ├── build.js           writes everything into /site (or --artifact <dir>)
    └── tmz-logo-original.jpg
```

## Preview locally

```bash
cd tmz-website/site
python3 -m http.server 8000
```

Then open http://localhost:8000. You can also open `site/index.html` directly in a browser.

## Edit content and rebuild

1. Edit `src/data.js` (Node 18+ is the only requirement; there are no npm packages).
2. Rebuild:

```bash
node tmz-website/src/build.js
```

The build regenerates every HTML page and every jersey SVG. `site/assets/css/style.css` and
`site/assets/js/main.js` are hand-written; edit them directly.

### ⚠️ Replace these placeholders before going live (`src/data.js` → `site`)

| Field | Current placeholder |
|---|---|
| `company`, `regNo` | TMZ Sdn Bhd (0000000-X) |
| `phone`, `phoneDisplay`, `office` | +60 12-345 6789 … |
| `whatsapp` | 60123456789 (all WhatsApp buttons and order forms send here) |
| `email` | support@tmz.example |
| `address`, `mapQuery` | Kuala Lumpur sample address |
| `social.*` | generic facebook / x / instagram URLs |

The three clubs on the Club page (Iron Fit Society, Strikers FC, Pacesetters Run Club) are
**sample content**. Replace them with your real partner clubs in `clubs`.

## Fabric and detail

Every product image is generated with premium finishing, drawn as vector detail so it stays
sharp at any zoom:

* **Fabric weave** per series, taken from the series' fabric list in `data.js`: ARCTIX jersey
  knit, HEXA honeycomb mesh, AGILIS twill, QUADRA waffle, MICROTEX/TASLAN for jackets and
  pants, and MESH for running singlets.
* **Construction:** soft drape folds, coverstitched hems, ribbed collars and cuffs, stitched
  seams and panels, a printed neck label, a woven hem tag, laser-cut side vents, micro-text, a
  tonal monogram print, and raised-print logos.

On product pages, click a photo to open the lightbox. Scroll, pinch or click to zoom up to 3×,
and drag to move around.

## 3D view

Every product card has a **3D** button, and every product page has a **3D VIEW** button. Each
opens a popup showing the garment as if worn, "ghost mannequin" style, with no mannequin visible:

* **Tops** show the upper-body garment; **pants** show the waist down. The neck, hem, cuffs,
  armholes and waist are real openings. The inside is black fabric, with the collar band (or
  waistband) continuing on the inside and the TMZ logo printed top-centre on the inside back.
* The garment is shaped for an **athletic build**: V-taper waist, chest and shoulder-blade
  contours, snug sleeves over the biceps, and fitted legs on the pants. The **Male fit / Female
  fit** switch changes the body shape, and the choice is remembered.
* **Fabric:** the artwork is wrapped on at up to 4096 px. On top of it sits a thread-scale knit or
  weave for each fabric (irregular yarns, fibre fuzz, glossier yarn tops, subtle colour
  mottling), with velvety sheen, studio lighting and soft self-shadows. It stays crisp at 3×.
* **Folds:** real geometric drape is modelled: underarm folds, waist ripples, elbow and cuff
  bunching, a hem wave, crotch pulls, knee breaks, stacked ankles and a gathered elastic waist.
  Ambient occlusion darkens the creases.
* **Seams and edges:** front and back panels are meshed on one shared outline, so they meet edge
  to edge with no gaps, finished with a fine tone-on-tone seam. Open edges have a rolled hem.
* **Raised layers:** collar bands, polo collars and plackets, zip collars, zip tape, kangaroo
  pockets, armhole bindings, sleeve cuffs, waistbands and ankle cuffs are separate layers. Each
  sits on top of the shirt with real thickness, a rounded edge and a contact shadow.
* **Hardware:** 3D buttons (dished, four-hole, cross-stitched), interlocking zip teeth, a metal
  zip slider with pull tab, braided drawcords with toggles or metal aglets, and eyelets.
* **Physics:** turning the garment makes it lag slightly, spring back and ripple, anchored at
  the shoulders or waistband. The hem, sleeve ends, legs and cords move most.
* **Drag** rotates freely around any axis. **Shift-drag** or a two-finger twist rolls around the
  view axis, and the X / Y / Z buttons rotate step by step. **Scroll** or **pinch** zooms from
  1× to 3× toward the pointer, **right-drag** pans, and **double-click** resets.

The 3D garment is built in the browser from the product's own front and back SVGs, so any new
design you add gets a 3D view automatically. Raised layers are the artwork elements marked
`data-l="…"` in `src/jersey.js`; the lift height for each type is set in `LAYER` in
`src/viewer3d.js`. Hardware is read from elements with the classes `bn`, `zp`, `ds`, `dt`,
`ey` and `ag`. The viewer loads three.js 0.128.0 from jsDelivr the
first time someone opens it, so it needs an internet connection.

## How ordering works (no backend)

* **Teamwear** product pages have an order-request form. On submit, it opens WhatsApp with the
  design code, quantity and the customer's details pre-filled.
* **Solo / Running / Club** products have sizes, an "Add to bag" button and a cart. The cart lives
  in the visitor's browser (`localStorage`). Checkout sends the order summary to WhatsApp so
  your team can confirm it and send a payment link.
* Login, register and track-order are front-end only. Track order sends a WhatsApp message.

To take card or FPX payments directly on the site, connect a payment provider (for example a
Billplz payment form), or move the design onto WooCommerce or Shopify.

## Hosted preview (Claude artifact)

A private hosted copy lives at **https://claude.ai/artifact/S55BEK65j5yqeZjbR2AjUY**. Only you can open
it until you share it from the page's Share menu.

Artifacts allow at most 511 files, so the hosted copy is built in a compact variant. Every
product renders from a single `product.html#<slug>` page, the contact map becomes an "Open in
Google Maps" link, and WhatsApp hand-offs show a tappable link. Build it with:

```bash
node tmz-website/src/build.js --artifact /path/to/output
```

## Deploy

`site/` is plain static HTML, so any static host works:

* **GitHub Pages:** publish the `tmz-website/site` folder (for example, with a Pages workflow
  that uploads that folder).
* **Netlify / Vercel / Cloudflare Pages:** set the publish directory to `tmz-website/site`.
  There's no build command, unless you want the host to run `node tmz-website/src/build.js`.

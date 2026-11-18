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
│   ├── court.html …       10 teamwear series pages (court, vertex, prism, orbit,
│   │                      on-field, volt, esport, windbreaker, training-jacket, bib)
│   ├── product/*.html     191 product pages
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

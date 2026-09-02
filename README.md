# Clutch Clicks — internal pages

Static, dependency-free landing pages. No build step, no framework, no package manager.

## `index.html` — auto shop offer page

Modeled on the Titans Media Group `/more-jobs` layout: hero + 3-step qualifying
form, video testimonial wall, sticky CTA, compliance footer.

**Performance:** CSS and JS are inlined and there are no web fonts, so the page
itself is one ~26 KB request (7 KB brotli). Wistia's player (~150 KB of JS) is
fetched *only after someone clicks a testimonial* — scrolling past the videos
costs nothing but three tiny lazy-loaded swatch images.

## Dynamic trade — `?service=`

The trade named in the headline and the form title comes from a URL parameter,
so one page serves every campaign:

| URL | Headline reads |
| --- | --- |
| `/` | We Help **Automotive** Shops… |
| `/?service=plumbing` | We Help **Plumbing** Shops… |
| `/?service=hvac` | We Help **HVAC** Shops… |
| `/?service=auto body` | We Help **Auto Body** Shops… |

Handled for you:

- **Casing** — `hvac` renders as `HVAC`, `ROOFING` as `Roofing`. Trades that should
  always read as acronyms live in the `ACRONYMS` array; add to it as needed.
- **Article** — "Check If We Already Work With **An** HVAC Shop" vs "**A** Roofing Shop".
- **No flash** — the swap runs in a parser-blocking inline script next to the
  headline, so the right trade paints on the first frame. With JS off, the page
  falls back to "Automotive" rather than breaking.
- **Safety** — the value is character-filtered, capped at 28 chars, and written
  with `textContent`, so a crafted `?service=` cannot inject markup.
- The value rides along with the lead as a `service` field, so you can see which
  campaign produced it.

### Wiring up leads

Set the endpoint near the top of the `<script>` block:

```js
var FORM_ENDPOINT = '/api/leads'; // <-- change me
```

It receives a JSON `POST`:

```json
{
  "service": "Diesel",
  "city": "Miami",
  "shop": "Miami Auto Care",
  "name": "Andres",
  "email": "andres@miamiautocare.com",
  "phone": "(305) 555-1234",
  "page": "/",
  "submittedAt": "2026-09-02T12:04:05.902Z"
}
```

Any non-2xx response shows an inline retry message rather than a false success.

### Testimonials

Three Wistia videos, each behind a click-to-load facade:

| Card | Wistia media ID |
| --- | --- |
| Andrea from Bonafide Trucking | `n86r5cqxqh` |
| Rick from Smart Prep Auto | `ej7z3e8y1b` |
| Jesus from Midwest Auto | `b1az1gc7z2` |

To add or swap one, change `data-media` on the `.facade` button and the swatch
`src` next to it, then update the `.quote` and `.who` text.

Posters default to Wistia's swatch image, which is a small blur-up placeholder —
deliberately blurred here so it reads as intentional rather than low-res. For a
crisp frame, drop a JPG in `assets/` and add `data-poster="assets/andrea.jpg"` to
that card's button; the blur is dropped automatically.

### Still to fill in

- **`assets/logo.png`** — until it exists the header falls back to a
  navy/red `ClutchClicks` wordmark. A ~460×120 PNG or an SVG (update the `src`) works.
- `/privacy` and `/terms` pages — the footer links to them
- `hello@clutchclicks.com` in the `<noscript>` fallback, if that isn't the right inbox

### Local preview

```sh
python3 -m http.server 8000
```

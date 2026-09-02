# Clutch Clicks — internal pages

Static, dependency-free landing pages. No build step, no framework, no package manager.

## `index.html` — auto shop offer page

Modeled on the Titans Media Group `/more-jobs` layout: hero + 3-step qualifying
form, video testimonial wall, sticky CTA, compliance footer.

**Performance:** CSS and JS are inlined, so the page itself is one ~27 KB request
(7.6 KB brotli) plus 23.5 KB of self-hosted font. Wistia's player (~150 KB of JS)
loads asynchronously as the testimonials come into view, so it never blocks the
headline from painting.

## Type

Poppins, self-hosted from `assets/fonts/` in weights 400 / 700 / 800. Self-hosting
rather than linking Google Fonts avoids a third-party DNS lookup and TLS handshake
on the critical path. The 800 weight is `<link rel="preload">`ed because the
headline paints in it, so it downloads in parallel with the HTML rather than
after the CSS is parsed.

Each weight ships as two files with a `unicode-range`, so `latin-ext` is fetched
only if an accented character actually appears — a first load pulls just the three
Latin files (~7.9 KB each). Verified: no duplicate fetches, no unused preload.

Headline is 45px and holds **three lines at every width from 1024px up**, including
the longest trade a `?service=` value can produce (the parameter is capped at 28
characters). Below 1024px it scales down via `clamp()` and wraps naturally — three
lines on a phone would mean ~16px text.

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

Three Wistia videos, embedded normally so their poster frames show as previews —
no click needed to see who is on screen:

| Card | Wistia media ID |
| --- | --- |
| Andrea from Bonafide Trucking | `n86r5cqxqh` |
| Rick from Smart Prep Auto | `ej7z3e8y1b` |
| Jesus from Midwest Auto | `b1az1gc7z2` |

To add or swap one, change the `media-id` on the `<wistia-player>`, add a matching
`wistia-player[media-id='…']:not(:defined)` swatch rule in the CSS, add the id to
the `MEDIA` array in the script, then update the `.quote` and `.who` text.

The player script is fetched as the testimonial section comes into view rather
than on page load, so it stays off the critical path. Until the custom element is
defined, Wistia's blurred swatch fills the slot — the same placeholder their own
embed snippet uses. The stage reserves 9:16 up front, so the real poster frame
swaps in without shifting the layout.

### Still to fill in

- **`assets/logo.png`** — until it exists the header falls back to a
  navy/red `ClutchClicks` wordmark. A ~460×120 PNG or an SVG (update the `src`) works.
- `/privacy` and `/terms` pages — the footer links to them
- `hello@clutchclicks.com` in the `<noscript>` fallback, if that isn't the right inbox

### Local preview

```sh
python3 -m http.server 8000
```

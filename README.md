# Clutch Clicks — internal pages

Static, dependency-free landing pages. No build step, no framework, no package manager.

## The funnel

Three static pages. Cloudflare Pages serves `/book` and `/thanks` from the `.html`
files automatically; `_redirects` also keeps `/booking` and `/typ` working.

| Page | File | Role |
| --- | --- | --- |
| Opt-in | `index.html` | Headline, 3-step qualifying form, testimonials |
| Booking | `book.html` | Same shell, GoHighLevel calendar instead of the form |
| Thank you | `thanks.html` | Pre-call video, next steps, what-to-do checklist |

**Flow:** a qualifying lead submits the opt-in form → POSTed to GoHighLevel →
redirected to `book.html` (any `?service=` carries over). A lead under $10K/mo is
*not* sent and is *not* given a booking link — they stop on the opt-in page with
the "not a fit" message. Set the calendar's post-booking redirect in GoHighLevel to
`/thanks`.

The calendar prefills from what the visitor already typed. The opt-in page stashes
the answers in `sessionStorage` and `book.html` appends `first_name`, `last_name`,
`email` and `phone` to the iframe URL — deliberately not via query string on the
page URL, so a name, email and phone don't land in browser history or referrer
headers. Loading `book.html` directly just skips the prefill.

### Placeholders on the thank-you page

Anything wearing a dashed amber **FILL THIS IN** badge is not real content:

- **Two video slots** — the pre-call video and the call-agenda video. Add
  `<wistia-player media-id="…">` and put the id in that file's `MEDIA` array.
- **Proof block** — the reference page has a founder line and two stat tiles
  (companies served, revenue generated). Those are left out rather than invented;
  the tile markup is commented out ready for your real figures.

Two step cards also make operational promises — a calendar invite by email, and a
confirmation text — so check your GoHighLevel automations actually send those
before publishing.

### A note on the CSS

The shared block is inlined in all three pages rather than linked from one
stylesheet, which keeps every page a single request. The cost is that a change to
the shared styling has to be made in all three files. Worth revisiting if the funnel
grows past a handful of pages.

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

## The form

Three steps, `33% / 66% / 98%` — the bar deliberately stops short of 100.

1. **City** — free text, Continue.
2. **Monthly revenue** — four choices. Picking one *is* the continue; there is no
   second click.
3. **Contact** — Full Name, Business Name, Email, Phone, Submit.

Back sits at the top of the card from step 2 on, and going back keeps whatever was
already entered or picked.

### Conditional logic — the revenue gate

**Only qualified leads are sent to GoHighLevel.** Qualification is an attribute on
each choice, so changing the threshold means editing one word of markup:

```html
<button class="opt" data-value="Less than $10K/mo" data-qualified="false">
<button class="opt" data-value="$10K – $25K/mo"    data-qualified="true">
```

A lead under $10K/mo completes the form and is then **never POSTed** — no request
is made at all. They see a different closing message that does *not* promise a
callback, since one isn't coming:

> Thanks — we've got your answers. We work with shops already doing at least $10K
> a month, so we won't be reaching out just yet.

If you would rather stop those visitors at step 2 instead of collecting contact
details you won't use, that's a change to `finish()` — say so and it's a few lines.

### Wiring up GoHighLevel

The LeadConnector inbound webhook is already wired into `GHL_WEBHOOK_URL` near the
top of the `<script>` block. It ships in the page source, so anyone can post to it —
lean on GoHighLevel's own duplicate/spam handling, or proxy through your own
endpoint if that becomes a problem.

The POST is sent as `Content-Type: text/plain` rather than `application/json`, on
purpose: that makes it a "simple" request, so the browser sends no CORS preflight
and a missing preflight response can never stop a lead being delivered. GoHighLevel
parses the JSON body either way. If it returns CORS headers, a real rejection shows
the inline retry; if it does not, the response is unreadable and the submission is
treated as delivered — which it is — rather than prompting a duplicate resubmit.

Qualified leads arrive as a JSON `POST`:

```json
{
  "service": "HVAC",
  "revenue": "$100K+/mo",
  "city": "Miami",
  "name": "Andres Perez",
  "business": "Miami HVAC Co",
  "email": "andres@miamihvac.com",
  "phone": "(305) 555-1234",
  "qualified": true,
  "page": "/?service=hvac",
  "submittedAt": "2026-09-02T12:57:11.814Z"
}
```

Any non-2xx response shows an inline retry rather than a false success.

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

### The logo

`assets/logo.webp` (21 KB) with `assets/logo.png` (44 KB) as the fallback, both
465×124 — 2× the display height. Both were resized from
`assets/Clutch Clicks Site Logo.png`, the 1158×309 / 173 KB master, which is kept
for future exports but never served. If the image ever fails to load the header
falls back to a navy/red `ClutchClicks` wordmark, so it never renders broken.

### Still to fill in

- `/privacy` and `/terms` pages — the footer links to them
- `hello@clutchclicks.com` in the `<noscript>` fallback, if that isn't the right inbox

### Running it locally

```sh
./serve.sh          # http://localhost:8000
./serve.sh 3000     # or any other port
```

Use this rather than opening `index.html` by double-clicking it. A `file://` URL
gives the page the `null` origin, which changes how the browser treats the
GoHighLevel POST — so a form test from `file://` tells you nothing useful about
what will happen on a real domain. `http://localhost` is a normal origin and
behaves the same way your live domain will.

To check the webhook end to end: submit the form with a qualifying revenue, then
open DevTools → Network → filter `webhook-trigger`. A `200` means CORS is fine. A
CORS error there still means the POST went out — check GoHighLevel, and if the lead
landed, the page is behaving correctly.

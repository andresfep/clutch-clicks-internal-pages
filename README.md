# Clutch Clicks — internal pages

Static, dependency-free landing pages. No build step, no framework, no package manager.

## The funnel

Three static pages. Cloudflare Pages serves `/book` and `/thanks` from the `.html`
files automatically; `_redirects` also keeps `/booking` and `/typ` working.

| Page | File | Role |
| --- | --- | --- |
| Opt-in | `index.html` | Headline, 3-step qualifying form, testimonials |
| Booking | `book.html` | Same shell, GoHighLevel calendar instead of the form |
| Thank you | `thanks.html` | Pre-call video, next steps, what-to-do checklist (no testimonials) |

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

### The thank-you page

The testimonial wall is deliberately not here — by the time someone books they are
already sold, and this page's job is getting them to show up.

The pre-call video is a **Vidalytics** embed, inline in the markup because the
loader script has to sit next to its own div. It is the only external resource on
the page; everything else ships with it. `fast.vidalytics.com` gets a `preconnect`
so the player starts fetching as early as possible.

The reference layout has a second video inside the "before we talk" panel. With one
video available that slot is removed rather than left empty, so the panel is now the
background card plus the checklist. Adding a second video means a second Vidalytics
snippet with its own embed id — the ids are unique per video, so the same snippet
cannot be reused twice on one page.

Two things to check before publishing:

- **Operational promises.** Two step cards say a calendar invite arrives by email
  and a confirmation text follows. Make sure your GoHighLevel automations send both.
- **Proof.** The reference page has a founder line and two stat tiles (companies
  served, revenue generated). Those are left out rather than invented; the tile
  markup is commented out in the background card, ready for real figures.

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
  "first_name": "Andres",
  "last_name": "Perez",
  "qualified": true,
  "page": "/?service=hvac",
  "submittedAt": "2026-09-02T12:57:11.814Z"
}
```

`first_name` / `last_name` are split from `name` in the page so the GoHighLevel
workflow doesn't have to. A single-word name leaves `last_name` empty.

### Mapping it in GoHighLevel

The webhook URL is only the trigger. Receiving a payload does not create a contact
on its own — the workflow needs a **Create/Update Contact** action with the fields
mapped, or leads arrive and vanish.

1. Automation → Workflows → the workflow holding this Inbound Webhook trigger.
2. Open the trigger and use its sample-payload capture, then send one submission so
   GoHighLevel learns the field names.
3. Add **Create/Update Contact** and map `first_name`, `last_name`, `email`,
   `phone`, and `business` → Company Name.
4. `city`, `revenue`, `service` and `page` need custom fields; create them first,
   then map. `service` and `page` tell you which campaign produced the lead.
5. Publish the workflow. A saved-but-unpublished workflow silently drops everything.

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

`assets/logo.png` — 231×62, 3.9 KB. Served as PNG with no WebP alternative because
for this artwork (flat colour, hard edges) the PNG is *smaller* than its own WebP
(3.9 KB vs 5.7 KB). `assets/Clutch Clicks Site Logo.png` is the 1158×309 master,
kept for future exports but never served.

One trade-off: at 231×62 the file is 1× the display size, so on a 2× screen it is
upscaled — about 1.35× on mobile and 1.9× at the desktop maximum, which reads
slightly soft. A 462×124 export would be pixel-perfect and, given how well this
artwork compresses, should still land well under the old 21 KB.

If the image ever fails to load the header falls back to a navy/red `ClutchClicks`
wordmark, so it never renders broken.

## Performance notes

Three things were fixed after a PageSpeed run scored 60 on mobile:

- **Layout shift (CLS 0.31 → measured 0.003).** Only the 800 weight was preloaded,
  so Poppins 400 and 700 were discovered at layout and arrived ~300 ms late; the
  swap reflowed the form card. All three weights are now preloaded, and a
  `@font-face` named `Poppins Fallback` gives Arial `size-adjust: 114.26%` plus
  ascent/descent/line-gap overrides computed from the shipped Poppins metrics, so
  fallback text occupies the same space as the real thing and a late swap moves
  nothing.
- **Wistia on the critical path.** The testimonials sit within the observer's
  400 px margin, so the player scripts fetched during load and competed with the
  fonts. Loading now waits for `load` plus an idle callback. The posters are still
  there long before anyone scrolls.
- **Font caching.** `_headers` had `/assets/fonts/*` before `/assets/*`. Cloudflare
  Pages applies every matching rule and the *last* one wins, so the general rule
  was overriding the font rule and pinning fonts to 7 days. The order is reversed
  and fonts are `immutable` for a year.

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

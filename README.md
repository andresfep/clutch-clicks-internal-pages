# Clutch Clicks — internal pages

Static, dependency-free landing pages. No build step, no framework, no package manager.

## `index.html` — auto shop offer page

Modeled on the Titans Media Group `/more-jobs` layout: hero + 3-step qualifying
form, video testimonial wall, sticky CTA, compliance footer.

**Performance:** the whole page is one ~22 KB HTML request. CSS and JS are inlined,
there are no web fonts, and testimonial videos load only after a click, so a first
visit downloads exactly one file.

### Wiring up leads

Set the endpoint near the top of the `<script>` block:

```js
var FORM_ENDPOINT = '/api/leads'; // <-- change me
```

It receives a JSON `POST`:

```json
{
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

### Adding testimonials

Each card is a click-to-load facade. Drop the clip and a poster frame in `assets/`,
then fill in the two data attributes:

```html
<button class="facade" data-src="assets/t1.mp4" data-poster="assets/t1.jpg" ...>
```

Replace the placeholder `.quote` and `.who` text with the real quote and attribution.
Empty slots are inert — they render the play button but do nothing on click.

### Still to fill in

- Real testimonial quotes, clips and posters (currently placeholders)
- `/privacy` and `/terms` pages — the footer links to them
- `hello@clutchclicks.com` in the `<noscript>` fallback, if that isn't the right inbox

### Local preview

```sh
python3 -m http.server 8000
```

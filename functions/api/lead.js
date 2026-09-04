/**
 * POST /api/lead — Cloudflare Pages Function.
 *
 * The opt-in form posts here, same-origin, and this forwards the lead to the
 * GoHighLevel inbound webhook from the server side. Doing it here rather than
 * straight from the browser removes three unknowns at once:
 *
 *   - no CORS: the browser never talks to LeadConnector directly;
 *   - Content-Type is application/json on the hop GoHighLevel sees, so there is
 *     no question of the body going unparsed;
 *   - GoHighLevel's actual response status and body come back to the browser,
 *     so a failure is visible instead of guessed at.
 *
 * It also keeps the webhook URL out of the page source and enforces the
 * revenue gate server-side, so a crafted request can't bypass it.
 *
 * Set GHL_WEBHOOK_URL as a Pages environment variable to override the default.
 */

const DEFAULT_WEBHOOK =
  'https://services.leadconnectorhq.com/hooks/W6A6ortd1jFsrR7CsHLH/webhook-trigger/0a39617e-286a-4db0-845c-b018d7eced51';

const REQUIRED = ['name', 'email', 'phone', 'business', 'city', 'revenue'];

export async function onRequestPost({ request, env }) {
  let lead;
  try {
    lead = await request.json();
  } catch (e) {
    return reply({ ok: false, error: 'Body must be JSON' }, 400);
  }

  if (!lead || typeof lead !== 'object') {
    return reply({ ok: false, error: 'Body must be a JSON object' }, 400);
  }
  if (lead.qualified !== true) {
    // The page never sends these, but don't rely on the page.
    return reply({ ok: false, error: 'Lead does not meet the revenue threshold' }, 422);
  }
  const missing = REQUIRED.filter((k) => !String(lead[k] || '').trim());
  if (missing.length) {
    return reply({ ok: false, error: 'Missing: ' + missing.join(', ') }, 422);
  }

  const url = (env && env.GHL_WEBHOOK_URL) || DEFAULT_WEBHOOK;

  let upstream;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
  } catch (e) {
    return reply({ ok: false, error: 'Could not reach GoHighLevel', detail: String(e) }, 502);
  }

  const text = await upstream.text();
  return reply(
    { ok: upstream.ok, status: upstream.status, upstream: text.slice(0, 500) },
    upstream.ok ? 200 : 502
  );
}

export function onRequest() {
  return reply({ ok: false, error: 'POST only' }, 405);
}

function reply(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

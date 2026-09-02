#!/bin/sh
# Serve this folder over http:// so the page runs on a real origin.
#
# Opening index.html directly as a file:// URL is NOT equivalent: that gives the
# page the "null" origin, which changes how the browser treats the GoHighLevel
# POST. Use this instead when testing the form.
#
#   ./serve.sh          -> http://localhost:8000
#   ./serve.sh 3000     -> http://localhost:3000

PORT="${1:-8000}"
cd "$(dirname "$0")" || exit 1

echo "Clutch Clicks offer page  ->  http://localhost:$PORT"
echo "Try a trade with          ->  http://localhost:$PORT/?service=hvac"
echo "Ctrl+C to stop."
echo

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  exec python -m SimpleHTTPServer "$PORT"
elif command -v npx >/dev/null 2>&1; then
  exec npx --yes serve -l "$PORT" .
else
  echo "Needs python3 or node installed." >&2
  exit 1
fi

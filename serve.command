#!/bin/bash
# Flight Deck — double-click this file to launch.
cd "$(dirname "$0")"
PORT=8420
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Flight Deck already running on port $PORT."
else
  python3 -m http.server $PORT >/dev/null 2>&1 &
  sleep 1
fi
open "http://localhost:$PORT/index.html"
echo ""
echo "  ✈  FLIGHT DECK is running at http://localhost:$PORT"
echo ""
echo "  Leave this window open while you use it."
echo "  Close it (or press Ctrl-C) to stop the server."
echo ""
wait

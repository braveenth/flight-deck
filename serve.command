#!/bin/bash
# Flight Deck — double-click this file to launch.
cd "$(dirname "$0")"
PORT=8420

# If something already holds the port, work out whether it is our own server
# (including the older `python3 -m http.server` launcher) and restart it, so a
# relaunch always picks up the latest code. Anything else is left alone.
HOLDER=$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t 2>/dev/null | head -1)
if [ -n "$HOLDER" ]; then
  if ps -o command= -p "$HOLDER" 2>/dev/null | grep -qE "serve\.py|http\.server"; then
    echo "  Restarting Flight Deck to pick up the latest changes…"
    kill "$HOLDER" 2>/dev/null
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      lsof -nP -iTCP:$PORT -sTCP:LISTEN -t >/dev/null 2>&1 || break
      sleep 0.3
    done
  else
    echo ""
    echo "  ⚠  Port $PORT is in use by another program (PID $HOLDER):"
    echo "     $(ps -o command= -p "$HOLDER" 2>/dev/null | cut -c1-70)"
    echo "     Close it, or change PORT at the top of this file."
    echo ""
    exit 1
  fi
fi

python3 ./serve.py $PORT &
SERVER_PID=$!
sleep 1

if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "  ⚠  Server failed to start. Run  python3 ./serve.py  to see the error."
  exit 1
fi

open "http://localhost:$PORT/index.html"
echo ""
echo "  ✈  FLIGHT DECK is running at http://localhost:$PORT"
echo ""
echo "  Leave this window open while you use it."
echo "  Close it (or press Ctrl-C) to stop the server."
echo ""
trap 'kill $SERVER_PID 2>/dev/null' EXIT
wait $SERVER_PID

#!/bin/bash
set -e

# Config is baked into the image at /root/.openclaw/openclaw.json
# Only OPENROUTER_API_KEY needs to be passed as env var at runtime

# Start sidecars
WORKSPACE_DIR="/root/.openclaw/workspace" node /file-watcher.mjs &
PREVIEW_PORT=18792 node /preview-proxy.mjs &
PROXY_PORT=18790 node /ws-proxy.mjs &

# Start gateway
export NODE_OPTIONS="--max-old-space-size=2048"
exec openclaw gateway run --force --port 18789 --token ruhclaw-local

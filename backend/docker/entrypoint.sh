#!/bin/bash
set -e

PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
TOKEN="${OPENCLAW_GATEWAY_TOKEN:-changeme}"
OPENROUTER_KEY="${OPENROUTER_API_KEY:-}"
REMOTE_MODEL="${OPENCLAW_MODEL:-anthropic/claude-sonnet-4}"

WORKSPACE="/root/.openclaw/workspace"
mkdir -p "$WORKSPACE"
mkdir -p /root/.openclaw/agents/main/sessions

# Write OpenClaw config with proper agents.list entry
cat > /root/.openclaw/openclaw.json << ENDOFCONFIG
{
  "models": {
    "mode": "merge",
    "providers": {
      "openrouter": {
        "baseUrl": "https://openrouter.ai/api/v1",
        "apiKey": "${OPENROUTER_KEY}",
        "api": "openai-completions",
        "models": [
          {
            "id": "${REMOTE_MODEL}",
            "name": "claude-sonnet",
            "contextWindow": 200000,
            "maxTokens": 16000
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "workspace": "${WORKSPACE}",
      "model": "openrouter/${REMOTE_MODEL}",
      "verboseDefault": "full"
    },
    "list": [
      {
        "id": "main",
        "default": true,
        "name": "ruhclaw",
        "workspace": "${WORKSPACE}"
      }
    ]
  },
  "gateway": {
    "mode": "local",
    "port": ${PORT},
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "${TOKEN}"
    },
    "controlUi": {
      "enabled": false
    },
    "http": {
      "endpoints": {
        "chatCompletions": {
          "enabled": true
        },
        "responses": {
          "enabled": true
        }
      }
    }
  },
  "session": {
    "dmScope": "main"
  },
  "tools": {
    "profile": "coding"
  }
}
ENDOFCONFIG

# Write agent identity
cat > "$WORKSPACE/AGENTS.md" << 'EOF'
You are ruhclaw, a helpful AI assistant. Be concise, helpful, and friendly.
EOF

# Mark onboarding as complete
cat > "$WORKSPACE/workspace-state.json" << 'EOF'
{"bootstrapSeededAt":"2026-01-01T00:00:00.000Z","onboardingCompletedAt":"2026-01-01T00:00:00.000Z"}
EOF

echo "[entrypoint] Starting OpenClaw gateway on port ${PORT}..."

# Start file watcher sidecar
WORKSPACE_DIR="${WORKSPACE}" node /file-watcher.mjs &

# Run gateway on loopback + WS proxy on lan
export NODE_OPTIONS="--max-old-space-size=2048"

# Start the WS/HTTP proxy in background (forwards 0.0.0.0:18790 → 127.0.0.1:18789)
PROXY_PORT=18790 node /ws-proxy.mjs &

# Start gateway on loopback (auto-pairs local connections)
exec openclaw gateway run --force --token "${TOKEN}" --port "${PORT}"

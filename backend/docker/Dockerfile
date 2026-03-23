FROM node:22-bookworm-slim

RUN apt-get update && \
    apt-get install -y curl git lsof psmisc && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw

# Bake config + workspace into image
RUN mkdir -p /root/.openclaw/workspace /root/.openclaw/agents/main/sessions
COPY openclaw.json /root/.openclaw/openclaw.json
RUN echo 'You are ruhclaw, a helpful AI assistant. Be concise, helpful, and friendly.' > /root/.openclaw/workspace/AGENTS.md && \
    echo '{"bootstrapSeededAt":"2026-01-01T00:00:00.000Z","onboardingCompletedAt":"2026-01-01T00:00:00.000Z"}' > /root/.openclaw/workspace/workspace-state.json

COPY entrypoint.sh /entrypoint.sh
COPY ws-proxy.mjs /ws-proxy.mjs
COPY file-watcher.mjs /file-watcher.mjs
COPY preview-proxy.mjs /preview-proxy.mjs
RUN chmod +x /entrypoint.sh

EXPOSE 18789 18790 18791 18792

ENTRYPOINT ["/entrypoint.sh"]

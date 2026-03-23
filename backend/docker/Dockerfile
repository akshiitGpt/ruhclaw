FROM node:22-bookworm-slim

RUN apt-get update && \
    apt-get install -y curl git lsof psmisc && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw

COPY entrypoint.sh /entrypoint.sh
COPY ws-proxy.mjs /ws-proxy.mjs
COPY file-watcher.mjs /file-watcher.mjs
COPY preview-proxy.mjs /preview-proxy.mjs
RUN chmod +x /entrypoint.sh

EXPOSE 18789 18790 18791 18792

ENV OPENCLAW_GATEWAY_PORT=18789
ENV OPENCLAW_MODEL=anthropic/claude-sonnet-4

ENTRYPOINT ["/entrypoint.sh"]

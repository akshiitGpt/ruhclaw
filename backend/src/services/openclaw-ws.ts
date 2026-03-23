/**
 * OpenClaw Gateway WebSocket client.
 * Connects via loopback TCP proxy — no auth needed (gateway runs with auth: "none").
 */

import WebSocket from "ws";
import { randomUUID } from "crypto";

export interface OpenClawEvents {
  onTextDelta: (text: string) => void;
  onToolStart: (name: string, id: string, input: string) => void;
  onToolUpdate: (id: string, partialResult: string) => void;
  onToolResult: (id: string, result: string, isError: boolean) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}

export class OpenClawClient {
  private ws: WebSocket | null = null;
  private url: string;
  private connected = false;

  constructor(gatewayUrl: string) {
    this.url = gatewayUrl.replace(/^http/, "ws") + "/ws";
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Connection timeout")), 30000);
      this.ws = new WebSocket(this.url);

      this.ws.on("error", (err) => { clearTimeout(timeout); reject(err); });

      this.ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());

        if (msg.type === "event" && msg.event === "connect.challenge") {
          // No auth — just connect with caps
          this.ws!.send(JSON.stringify({
            type: "req",
            id: randomUUID(),
            method: "connect",
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: { id: "cli", displayName: "ruhclaw", version: "1.0.0", platform: "linux", deviceFamily: "server", mode: "cli" },
              role: "operator",
              scopes: ["operator.read", "operator.write", "operator.admin", "operator.approvals"],
              caps: ["tool-events"],
            },
          }));
          return;
        }

        if (msg.type === "res" && msg.payload?.type === "hello-ok") {
          this.connected = true;
          clearTimeout(timeout);
          resolve();
          return;
        }

        if (msg.type === "res" && msg.ok === false && !this.connected) {
          clearTimeout(timeout);
          reject(new Error(`Connect rejected: ${msg.error?.message || "unknown"}`));
        }
      });
    });
  }

  async sendMessage(message: string, sessionKey: string, events: OpenClawEvents): Promise<void> {
    if (!this.ws || !this.connected) { events.onError("Not connected"); return; }

    const reqId = randomUUID();
    let lastFullText = "";

    const handler = (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "res" && msg.id === reqId && !msg.ok) {
          events.onError(msg.error?.message || "chat.send failed");
          this.ws?.off("message", handler);
          return;
        }

        if (msg.type === "event" && msg.event === "agent") {
          const p = msg.payload;

          // Text
          if (p?.stream === "assistant" && p?.data) {
            const delta = typeof p.data.delta === "string" ? p.data.delta : "";
            const fullText = typeof p.data.text === "string" ? p.data.text : "";
            if (delta) {
              events.onTextDelta(delta);
              lastFullText = fullText || (lastFullText + delta);
            } else if (fullText && fullText.length > lastFullText.length) {
              events.onTextDelta(fullText.slice(lastFullText.length));
              lastFullText = fullText;
            } else if (fullText && fullText.length < lastFullText.length) {
              events.onTextDelta(fullText);
              lastFullText = fullText;
            }
          }

          // Tools
          if (p?.stream === "tool" && p?.data) {
            const d = p.data;
            const toolId = d.toolCallId || String(p.seq);
            lastFullText = "";

            if (d.phase === "start") {
              events.onToolStart(d.name || "unknown", toolId, JSON.stringify(d.args ?? {}));
            }
            if (d.phase === "update" && d.partialResult != null) {
              events.onToolUpdate(toolId, typeof d.partialResult === "string" ? d.partialResult : JSON.stringify(d.partialResult));
            }
            if (d.phase === "result") {
              const result = d.result != null ? (typeof d.result === "string" ? d.result : JSON.stringify(d.result)) : "";
              events.onToolResult(toolId, result, !!d.isError);
            }
          }

          // Lifecycle end — only for main session
          if (p?.stream === "lifecycle" && p?.data?.phase === "end") {
            const s = typeof p.sessionKey === "string" ? p.sessionKey : "";
            if (!s || s === sessionKey) {
              events.onDone();
              this.ws?.off("message", handler);
            }
          }
        }

        if (msg.type === "event" && msg.event === "chat") {
          const p = msg.payload;
          if (p?.state === "final") { events.onDone(); this.ws?.off("message", handler); }
          if (p?.state === "error") { events.onError(p.errorMessage || "Agent error"); this.ws?.off("message", handler); }
        }
      } catch {}
    };

    this.ws.on("message", handler);
    this.ws.send(JSON.stringify({ type: "req", id: reqId, method: "chat.send", params: { sessionKey, message, idempotencyKey: randomUUID() } }));

    return new Promise((resolve) => {
      const origDone = events.onDone;
      const origError = events.onError;
      const t = setTimeout(() => { this.ws?.off("message", handler); events.onError("Chat timeout (120s)"); resolve(); }, 120000);
      events.onDone = () => { clearTimeout(t); origDone(); resolve(); };
      events.onError = (m) => { clearTimeout(t); origError(m); resolve(); };
    });
  }

  close() { this.connected = false; this.ws?.close(); this.ws = null; }
  get isConnected() { return this.connected; }
}

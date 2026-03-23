/**
 * OpenClaw Gateway WebSocket client.
 * Uses Ed25519 device signing + loopback TCP proxy for auto-pairing with write scopes.
 * Handles parallel tool calls and subagent text relay.
 */

import WebSocket from "ws";
import { createHash, randomUUID } from "crypto";
import * as ed from "@noble/ed25519";

// Configure sha512 for noble/ed25519
(ed as any).hashes.sha512 = (...m: Uint8Array[]) => {
  const h = createHash("sha512");
  for (const buf of m) h.update(buf);
  return new Uint8Array(h.digest());
};

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
  private token: string;
  private url: string;
  private privateKey: Uint8Array;
  private publicKey: Uint8Array;
  private deviceId: string;
  private connected = false;

  constructor(gatewayUrl: string, token: string) {
    this.url = gatewayUrl.replace(/^http/, "ws") + "/ws";
    this.token = token;
    this.privateKey = ed.utils.randomSecretKey();
    this.publicKey = ed.getPublicKey(this.privateKey);
    this.deviceId = createHash("sha256").update(this.publicKey).digest("hex");
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Connection timeout")), 30000);
      this.ws = new WebSocket(this.url);

      this.ws.on("error", (err) => { clearTimeout(timeout); reject(err); });

      this.ws.on("message", async (data) => {
        const msg = JSON.parse(data.toString());

        if (msg.type === "event" && msg.event === "connect.challenge") {
          try { this.sendConnect(msg.payload.nonce); }
          catch (err) { clearTimeout(timeout); reject(err); }
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

  private sendConnect(nonce: string) {
    const signedAt = Date.now();
    const scopes = ["operator.read", "operator.write", "operator.admin", "operator.approvals"];

    const payload = [
      "v3", this.deviceId, "cli", "cli", "operator",
      scopes.join(","), String(signedAt), this.token, nonce,
      "linux", "server",
    ].join("|");

    const signature = ed.sign(new TextEncoder().encode(payload), this.privateKey);

    this.ws!.send(JSON.stringify({
      type: "req",
      id: randomUUID(),
      method: "connect",
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "cli",
          displayName: "ruhclaw-backend",
          version: "1.0.0",
          platform: "linux",
          deviceFamily: "server",
          mode: "cli",
        },
        role: "operator",
        scopes,
        caps: ["tool-events"],
        auth: { token: this.token },
        device: {
          id: this.deviceId,
          publicKey: Buffer.from(this.publicKey).toString("base64"),
          signature: Buffer.from(signature).toString("base64"),
          signedAt,
          nonce,
        },
      },
    }));
  }

  async sendMessage(
    message: string,
    sessionKey: string,
    events: OpenClawEvents
  ): Promise<void> {
    if (!this.ws || !this.connected) {
      events.onError("Not connected");
      return;
    }

    const reqId = randomUUID();

    // Track text per-segment (resets between tool calls)
    // Use both delta and full text tracking for robustness
    let lastFullText = "";

    const handler = (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "res" && msg.id === reqId && !msg.ok) {
          events.onError(msg.error?.message || "chat.send failed");
          this.ws?.off("message", handler);
          return;
        }

        // Agent events
        if (msg.type === "event" && msg.event === "agent") {
          const p = msg.payload;

          // Text deltas — prefer delta, fall back to diff from full text
          if (p?.stream === "assistant" && p?.data) {
            const delta = typeof p.data.delta === "string" ? p.data.delta : "";
            const fullText = typeof p.data.text === "string" ? p.data.text : "";

            if (delta) {
              events.onTextDelta(delta);
              lastFullText = fullText || (lastFullText + delta);
            } else if (fullText && fullText.length > lastFullText.length) {
              // Fallback: compute diff from accumulated text
              events.onTextDelta(fullText.slice(lastFullText.length));
              lastFullText = fullText;
            } else if (fullText && fullText.length < lastFullText.length) {
              // Text reset (new segment after tool call)
              events.onTextDelta(fullText);
              lastFullText = fullText;
            }
          }

          // Tool events (phases: start → update → result)
          if (p?.stream === "tool" && p?.data) {
            const d = p.data;
            const toolId = d.toolCallId || String(p.seq);

            // Reset text tracking — new text after this is a new segment
            lastFullText = "";

            if (d.phase === "start") {
              events.onToolStart(
                d.name || "unknown",
                toolId,
                JSON.stringify(d.args ?? {})
              );
            }
            if (d.phase === "update" && d.partialResult != null) {
              events.onToolUpdate(
                toolId,
                typeof d.partialResult === "string" ? d.partialResult : JSON.stringify(d.partialResult)
              );
            }
            if (d.phase === "result") {
              const result = d.result != null
                ? (typeof d.result === "string" ? d.result : JSON.stringify(d.result))
                : "";
              events.onToolResult(toolId, result, !!d.isError);
            }
          }

          // Lifecycle end — only for our session's main run
          // Subagent lifecycle ends should NOT trigger onDone
          if (p?.stream === "lifecycle" && p?.data?.phase === "end") {
            const evtSession = typeof p.sessionKey === "string" ? p.sessionKey : "";
            // Only finish if it's the main session or no session specified
            if (!evtSession || evtSession === sessionKey) {
              events.onDone();
              this.ws?.off("message", handler);
            }
          }
        }

        // Chat final/error — authoritative end signal
        if (msg.type === "event" && msg.event === "chat") {
          const p = msg.payload;
          if (p?.state === "final") {
            events.onDone();
            this.ws?.off("message", handler);
          }
          if (p?.state === "error") {
            events.onError(p.errorMessage || "Agent error");
            this.ws?.off("message", handler);
          }
        }
      } catch {}
    };

    this.ws.on("message", handler);

    this.ws.send(JSON.stringify({
      type: "req",
      id: reqId,
      method: "chat.send",
      params: { sessionKey, message, idempotencyKey: randomUUID() },
    }));

    return new Promise((resolve) => {
      const origDone = events.onDone;
      const origError = events.onError;
      const timeout = setTimeout(() => {
        this.ws?.off("message", handler);
        events.onError("Chat timeout (120s)");
        resolve();
      }, 120000);

      events.onDone = () => { clearTimeout(timeout); origDone(); resolve(); };
      events.onError = (msg) => { clearTimeout(timeout); origError(msg); resolve(); };
    });
  }

  close() {
    this.connected = false;
    this.ws?.close();
    this.ws = null;
  }

  get isConnected() { return this.connected; }
}

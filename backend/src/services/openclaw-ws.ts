/**
 * OpenClaw Gateway WebSocket client.
 * Uses Ed25519 device signing via loopback TCP proxy for auto-pairing.
 */

import WebSocket from "ws";
import { createHash, randomUUID } from "crypto";
import * as ed from "@noble/ed25519";

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

const TOKEN = "ruhclaw-local";

export class OpenClawClient {
  private ws: WebSocket | null = null;
  private url: string;
  private pk: Uint8Array;
  private sk: Uint8Array;
  private devId: string;
  private connected = false;

  constructor(gatewayUrl: string) {
    this.url = gatewayUrl.replace(/^http/, "ws") + "/ws";
    this.sk = ed.utils.randomSecretKey();
    this.pk = ed.getPublicKey(this.sk);
    this.devId = createHash("sha256").update(this.pk).digest("hex");
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("WS timeout")), 30000);
      this.ws = new WebSocket(this.url);
      this.ws.on("error", (e) => { clearTimeout(timeout); reject(e); });
      this.ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "event" && msg.event === "connect.challenge") {
          this.sign(msg.payload.nonce);
          return;
        }
        if (msg.type === "res" && msg.payload?.type === "hello-ok") {
          this.connected = true; clearTimeout(timeout); resolve();
          return;
        }
        if (msg.type === "res" && msg.ok === false && !this.connected) {
          clearTimeout(timeout); reject(new Error(msg.error?.message || "rejected"));
        }
      });
    });
  }

  private sign(nonce: string) {
    const now = Date.now();
    const scopes = ["operator.read", "operator.write", "operator.admin", "operator.approvals"];
    const payload = ["v3", this.devId, "cli", "cli", "operator", scopes.join(","), String(now), TOKEN, nonce, "linux", "server"].join("|");
    const sig = ed.sign(new TextEncoder().encode(payload), this.sk);
    this.ws!.send(JSON.stringify({
      type: "req", id: randomUUID(), method: "connect",
      params: {
        minProtocol: 3, maxProtocol: 3,
        client: { id: "cli", displayName: "ruhclaw", version: "1.0.0", platform: "linux", deviceFamily: "server", mode: "cli" },
        role: "operator", scopes, caps: ["tool-events"],
        auth: { token: TOKEN },
        device: { id: this.devId, publicKey: Buffer.from(this.pk).toString("base64"), signature: Buffer.from(sig).toString("base64"), signedAt: now, nonce },
      },
    }));
  }

  async sendMessage(message: string, sessionKey: string, events: OpenClawEvents): Promise<void> {
    if (!this.ws || !this.connected) { events.onError("Not connected"); return; }
    const reqId = randomUUID();
    let lastFull = "";

    const handler = (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "res" && msg.id === reqId && !msg.ok) { events.onError(msg.error?.message || "failed"); this.ws?.off("message", handler); return; }

        if (msg.type === "event" && msg.event === "agent") {
          const p = msg.payload;
          if (p?.stream === "assistant" && p?.data) {
            const d = typeof p.data.delta === "string" ? p.data.delta : "";
            const f = typeof p.data.text === "string" ? p.data.text : "";
            if (d) { events.onTextDelta(d); lastFull = f || (lastFull + d); }
            else if (f && f.length > lastFull.length) { events.onTextDelta(f.slice(lastFull.length)); lastFull = f; }
            else if (f && f.length < lastFull.length) { events.onTextDelta(f); lastFull = f; }
          }
          if (p?.stream === "tool" && p?.data) {
            const d = p.data; const tid = d.toolCallId || String(p.seq); lastFull = "";
            if (d.phase === "start") events.onToolStart(d.name || "unknown", tid, JSON.stringify(d.args ?? {}));
            if (d.phase === "update" && d.partialResult != null) events.onToolUpdate(tid, typeof d.partialResult === "string" ? d.partialResult : JSON.stringify(d.partialResult));
            if (d.phase === "result") events.onToolResult(tid, d.result != null ? (typeof d.result === "string" ? d.result : JSON.stringify(d.result)) : "", !!d.isError);
          }
          if (p?.stream === "lifecycle" && p?.data?.phase === "end") {
            const s = typeof p.sessionKey === "string" ? p.sessionKey : "";
            if (!s || s === sessionKey) { events.onDone(); this.ws?.off("message", handler); }
          }
        }
        if (msg.type === "event" && msg.event === "chat") {
          const p = msg.payload;
          if (p?.state === "final") { events.onDone(); this.ws?.off("message", handler); }
          if (p?.state === "error") { events.onError(p.errorMessage || "error"); this.ws?.off("message", handler); }
        }
      } catch {}
    };

    this.ws.on("message", handler);
    this.ws.send(JSON.stringify({ type: "req", id: reqId, method: "chat.send", params: { sessionKey, message, idempotencyKey: randomUUID() } }));

    return new Promise((resolve) => {
      const od = events.onDone, oe = events.onError;
      const t = setTimeout(() => { this.ws?.off("message", handler); events.onError("timeout"); resolve(); }, 120000);
      events.onDone = () => { clearTimeout(t); od(); resolve(); };
      events.onError = (m) => { clearTimeout(t); oe(m); resolve(); };
    });
  }

  close() { this.connected = false; this.ws?.close(); this.ws = null; }
  get isConnected() { return this.connected; }
}

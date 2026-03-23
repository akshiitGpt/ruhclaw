/**
 * TCP client that connects to the file-watcher sidecar inside a Docker container.
 * Receives newline-delimited JSON events and forwards them via callbacks.
 */

import net from "net";

export interface FileChangeEvent {
  event: "create" | "modify" | "delete";
  path: string;
  ts: number;
}

type Listener = (evt: FileChangeEvent) => void;

export class FileWatcherClient {
  private socket: net.Socket | null = null;
  private port: number;
  private buffer = "";
  private listeners: Listener[] = [];
  private connected = false;
  private retries = 0;
  private maxRetries = 10;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(port: number) {
    this.port = port;
  }

  async connect(): Promise<void> {
    return new Promise((resolve) => {
      this.tryConnect(resolve);
    });
  }

  private tryConnect(onFirstConnect?: () => void) {
    const socket = net.connect(this.port, "localhost");

    socket.on("connect", () => {
      this.socket = socket;
      this.connected = true;
      this.retries = 0;
      console.log(`[file-watcher] Connected to port ${this.port}`);
      onFirstConnect?.();
      onFirstConnect = undefined;
    });

    socket.on("data", (chunk) => {
      this.buffer += chunk.toString();
      const lines = this.buffer.split("\n");
      this.buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const evt = JSON.parse(line) as FileChangeEvent;
          for (const listener of this.listeners) {
            listener(evt);
          }
        } catch {}
      }
    });

    socket.on("close", () => {
      this.connected = false;
      this.socket = null;
      if (this.retries < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, this.retries), 10000);
        this.retries++;
        this.retryTimer = setTimeout(() => this.tryConnect(), delay);
      }
    });

    socket.on("error", () => {
      // Will trigger close event
      if (!this.connected && onFirstConnect) {
        // First connect failed — retry silently
        const delay = Math.min(1000 * Math.pow(2, this.retries), 5000);
        this.retries++;
        if (this.retries < this.maxRetries) {
          this.retryTimer = setTimeout(() => this.tryConnect(onFirstConnect), delay);
        } else {
          console.log(`[file-watcher] Gave up connecting to port ${this.port}`);
          onFirstConnect?.();
        }
      }
    });
  }

  addListener(fn: Listener) {
    this.listeners.push(fn);
  }

  removeListener(fn: Listener) {
    this.listeners = this.listeners.filter((l) => l !== fn);
  }

  close() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.socket?.destroy();
    this.socket = null;
    this.connected = false;
    this.listeners = [];
  }

  get isConnected() {
    return this.connected;
  }
}

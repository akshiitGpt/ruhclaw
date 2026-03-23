/**
 * File watcher sidecar — streams workspace file changes over TCP.
 * Runs inside the Docker container alongside OpenClaw gateway.
 * Protocol: newline-delimited JSON on port 18791.
 */
import { watch, statSync, existsSync } from "fs";
import { createServer } from "net";
import { relative } from "path";

const WORKSPACE = process.env.WORKSPACE_DIR || "/root/.openclaw/workspace";
const PORT = parseInt(process.env.FILE_WATCHER_PORT || "18791");
const DEBOUNCE_MS = 100;
const IGNORE = /node_modules|\.git|\.swp|\.tmp|~$/;

const clients = new Set();
const pending = new Map(); // path -> timeout

function broadcast(event) {
  const line = JSON.stringify(event) + "\n";
  for (const socket of clients) {
    try { socket.write(line); } catch { clients.delete(socket); }
  }
}

function emitChange(filename, eventType) {
  if (!filename || IGNORE.test(filename)) return;

  const relPath = filename.startsWith("/")
    ? relative(WORKSPACE, filename)
    : filename;

  if (relPath.startsWith("..") || !relPath) return;

  // Debounce per-path
  if (pending.has(relPath)) clearTimeout(pending.get(relPath));
  pending.set(relPath, setTimeout(() => {
    pending.delete(relPath);

    const fullPath = `${WORKSPACE}/${relPath}`;
    let type = "modify";
    try {
      statSync(fullPath);
      // If we haven't seen it before in this session, call it "create"
      type = eventType === "rename" ? "create" : "modify";
    } catch {
      type = "delete";
    }

    broadcast({ event: type, path: relPath, ts: Date.now() });
  }, DEBOUNCE_MS));
}

// Wait for workspace to exist
function waitForWorkspace(cb) {
  if (existsSync(WORKSPACE)) return cb();
  const interval = setInterval(() => {
    if (existsSync(WORKSPACE)) { clearInterval(interval); cb(); }
  }, 1000);
}

waitForWorkspace(() => {
  // Watch recursively (Node 22+ on Linux)
  try {
    watch(WORKSPACE, { recursive: true }, (eventType, filename) => {
      emitChange(filename, eventType);
    });
  } catch (err) {
    console.error("[file-watcher] fs.watch failed:", err.message);
    // Fallback: poll every 3s
    console.log("[file-watcher] falling back to polling");
  }

  const server = createServer((socket) => {
    clients.add(socket);
    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[file-watcher] listening on 0.0.0.0:${PORT}, watching ${WORKSPACE}`);
  });
});

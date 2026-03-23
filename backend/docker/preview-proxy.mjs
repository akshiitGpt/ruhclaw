/**
 * Preview reverse proxy — forwards requests from 0.0.0.0:18792 to
 * whatever port the agent's app is running on inside the container.
 * Target port is configurable via POST /__preview_target__.
 */
import http from "http";

const PORT = parseInt(process.env.PREVIEW_PORT || "18792");
let targetPort = 3000;

const server = http.createServer((req, res) => {
  // Control: set target port
  if (req.url === "/__preview_target__" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const { port } = JSON.parse(body);
        if (port && Number.isFinite(port)) targetPort = port;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ targetPort }));
      } catch {
        res.writeHead(400);
        res.end("Invalid JSON");
      }
    });
    return;
  }

  // Control: get status
  if (req.url === "/__preview_status__") {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ targetPort }));
    return;
  }

  // Proxy to target
  const proxyReq = http.request(
    {
      hostname: "127.0.0.1",
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
    },
    (proxyRes) => {
      // Inject CORS + allow iframe embedding
      const headers = { ...proxyRes.headers };
      headers["access-control-allow-origin"] = "*";
      headers["x-frame-options"] = "ALLOWALL";
      delete headers["content-security-policy"];
      delete headers["x-content-type-options"];
      res.writeHead(proxyRes.statusCode || 502, headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", () => {
    res.writeHead(503, { "Content-Type": "text/html", "Access-Control-Allow-Origin": "*" });
    res.end(`<!DOCTYPE html>
<html><head><style>
  body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa; color: #888; }
  .box { text-align: center; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
</style></head><body>
<div class="box">
  <p style="font-size:14px">No app running on port <code>${targetPort}</code></p>
  <p style="font-size:12px;margin-top:8px;color:#bbb">Start a server inside the sandbox to preview it here</p>
</div>
</body></html>`);
  });

  req.pipe(proxyReq);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[preview-proxy] 0.0.0.0:${PORT} → 127.0.0.1:${targetPort}`);
});

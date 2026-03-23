/**
 * TCP proxy: forwards all connections from 0.0.0.0:PROXY_PORT to 127.0.0.1:GATEWAY_PORT.
 * This makes external clients appear as loopback connections to the gateway.
 * Works for both HTTP and WebSocket (they're both TCP).
 */
import net from "net";

const PROXY_PORT = parseInt(process.env.PROXY_PORT || "18790");
const GATEWAY_PORT = parseInt(process.env.OPENCLAW_GATEWAY_PORT || "18789");

const server = net.createServer((clientSocket) => {
  const gatewaySocket = net.connect(GATEWAY_PORT, "127.0.0.1", () => {
    clientSocket.pipe(gatewaySocket);
    gatewaySocket.pipe(clientSocket);
  });

  gatewaySocket.on("error", () => clientSocket.destroy());
  clientSocket.on("error", () => gatewaySocket.destroy());
  gatewaySocket.on("close", () => clientSocket.destroy());
  clientSocket.on("close", () => gatewaySocket.destroy());
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`[tcp-proxy] 0.0.0.0:${PROXY_PORT} → 127.0.0.1:${GATEWAY_PORT}`);
});

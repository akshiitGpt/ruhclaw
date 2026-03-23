import { Elysia, t } from "elysia";
import { createContainer } from "../services/docker";
import { OpenClawClient } from "../services/openclaw-ws";
import { FileWatcherClient } from "../services/file-watcher";

interface AgentRecord {
  id: string;
  name: string;
  status: "creating" | "running" | "stopped" | "error";
  containerId: string;
  gatewayUrl: string;
  gatewayToken: string;
  previewPort: number;
  openclawClient: OpenClawClient | null;
  fileWatcher: FileWatcherClient | null;
  createdAt: string;
}

export const agents = new Map<string, AgentRecord>();

export const agentRoutes = new Elysia({ prefix: "/api/agents" })
  .get("/", () => {
    const list = Array.from(agents.values()).map(
      ({ containerId, gatewayUrl, gatewayToken, openclawClient, fileWatcher, ...rest }) => rest
    );
    return { agents: list };
  })

  .post("/", async () => {
    const id = crypto.randomUUID();
    const record: AgentRecord = {
      id,
      name: `Agent ${id.slice(0, 6)}`,
      status: "creating",
      containerId: "",
      gatewayUrl: "",
      gatewayToken: "",
      previewPort: 0,
      openclawClient: null,
      fileWatcher: null,
      createdAt: new Date().toISOString(),
    };
    agents.set(id, record);

    (async () => {
      const info = await createContainer();
      record.containerId = info.containerId;
      record.gatewayUrl = info.gatewayUrl;
      record.gatewayToken = info.gatewayToken;
      record.previewPort = info.previewPort;

      const client = new OpenClawClient(info.gatewayUrl, info.gatewayToken);
      await client.connect();
      record.openclawClient = client;

      const watcher = new FileWatcherClient(info.fileWatcherPort);
      await watcher.connect();
      record.fileWatcher = watcher;

      record.status = "running";
      console.log(`[agents] Agent ${id} ready (preview port: ${info.previewPort})`);
    })().catch((err) => {
      console.error(`[agents] Agent ${id} failed:`, err);
      record.status = "error";
    });

    return { id: record.id, status: record.status, name: record.name, createdAt: record.createdAt };
  })

  .get(
    "/:id",
    async ({ params }) => {
      const agent = agents.get(params.id);
      if (!agent) throw new Error("Agent not found");
      const { containerId, gatewayUrl, gatewayToken, openclawClient, fileWatcher, ...rest } = agent;
      return rest;
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Set preview target port
  .post(
    "/:id/preview-target",
    async ({ params, body }) => {
      const agent = agents.get(params.id);
      if (!agent || !agent.previewPort) throw new Error("Agent not found");

      const res = await fetch(`http://localhost:${agent.previewPort}/__preview_target__`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port: (body as any).port }),
      });
      return res.json();
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ port: t.Number() }),
    }
  );

export function setupChatWebSocket(app: any) {
  return app.ws("/ws/chat/:agentId", {
    params: t.Object({ agentId: t.String() }),
    body: t.Object({ type: t.Literal("message"), content: t.String() }),

    open(ws: any) {
      const agentId = ws.data.params.agentId;
      const agent = agents.get(agentId);
      console.log(`[ws] Connected: ${agentId}`);

      if (agent?.fileWatcher) {
        const listener = (evt: any) => {
          ws.send(JSON.stringify({ type: "file_change", ...evt }));
        };
        agent.fileWatcher.addListener(listener);
        (ws as any)._fwl = listener;
      }
    },

    async message(ws: any, body: any) {
      const agent = agents.get(ws.data.params.agentId);
      if (!agent) { ws.send(JSON.stringify({ type: "error", message: "Agent not found" })); return; }
      if (agent.status !== "running" || !agent.openclawClient?.isConnected) {
        ws.send(JSON.stringify({ type: "error", message: `Agent is ${agent.status}. Wait for it to be ready.` }));
        return;
      }

      try {
        await agent.openclawClient.sendMessage(body.content, "agent:main:main", {
          onTextDelta: (text) => ws.send(JSON.stringify({ type: "chunk", content: text })),
          onToolStart: (name, id, input) => ws.send(JSON.stringify({ type: "tool_call_start", id, name, arguments: input })),
          onToolUpdate: (id, out) => ws.send(JSON.stringify({ type: "tool_call_update", id, output: out })),
          onToolResult: (id, out, err) => ws.send(JSON.stringify({ type: "tool_call_result", id, output: out, isError: err })),
          onDone: () => ws.send(JSON.stringify({ type: "done" })),
          onError: (error) => ws.send(JSON.stringify({ type: "error", message: error })),
        });
      } catch (err) {
        ws.send(JSON.stringify({ type: "error", message: err instanceof Error ? err.message : "Unknown error" }));
      }
    },

    close(ws: any) {
      const agent = agents.get(ws.data.params.agentId);
      if (agent?.fileWatcher && (ws as any)._fwl) agent.fileWatcher.removeListener((ws as any)._fwl);
    },
  });
}

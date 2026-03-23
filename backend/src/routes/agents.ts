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
  openclawClient: OpenClawClient | null;
  fileWatcher: FileWatcherClient | null;
  createdAt: string;
}

// Exported so file routes can access agent records
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

      // Connect OpenClaw WebSocket
      const client = new OpenClawClient(info.gatewayUrl, info.gatewayToken);
      await client.connect();
      record.openclawClient = client;

      // Connect file watcher
      const watcher = new FileWatcherClient(info.fileWatcherPort);
      await watcher.connect();
      record.fileWatcher = watcher;

      record.status = "running";
      console.log(`[agents] Agent ${id} ready (gateway + file watcher connected)`);
    })().catch((err) => {
      console.error(`[agents] Agent ${id} failed:`, err);
      record.status = "error";
    });

    return {
      id: record.id,
      status: record.status,
      name: record.name,
      createdAt: record.createdAt,
    };
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
  );

export function setupChatWebSocket(app: any) {
  return app.ws("/ws/chat/:agentId", {
    params: t.Object({ agentId: t.String() }),
    body: t.Object({
      type: t.Literal("message"),
      content: t.String(),
    }),

    open(ws: any) {
      const agentId = ws.data.params.agentId;
      const agent = agents.get(agentId);
      console.log(`[ws] Connected: ${agentId}`);

      // Register file watcher listener for this WS client
      if (agent?.fileWatcher) {
        const listener = (evt: any) => {
          ws.send(JSON.stringify({ type: "file_change", ...evt }));
        };
        agent.fileWatcher.addListener(listener);
        // Store listener ref for cleanup
        (ws as any)._fileWatcherListener = listener;
      }
    },

    async message(ws: any, body: any) {
      const agentId = ws.data.params.agentId;
      const agent = agents.get(agentId);

      if (!agent) {
        ws.send(JSON.stringify({ type: "error", message: "Agent not found" }));
        return;
      }

      if (agent.status !== "running" || !agent.openclawClient?.isConnected) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: `Agent is ${agent.status}. Please wait for it to be ready.`,
          })
        );
        return;
      }

      try {
        await agent.openclawClient.sendMessage(
          body.content,
          "agent:main:main",
          {
            onTextDelta: (text) => {
              ws.send(JSON.stringify({ type: "chunk", content: text }));
            },
            onToolStart: (name, id, input) => {
              ws.send(JSON.stringify({ type: "tool_call_start", id, name, arguments: input }));
            },
            onToolUpdate: (id, partialResult) => {
              ws.send(JSON.stringify({ type: "tool_call_update", id, output: partialResult }));
            },
            onToolResult: (id, result, isError) => {
              ws.send(JSON.stringify({ type: "tool_call_result", id, output: result, isError }));
            },
            onDone: () => {
              ws.send(JSON.stringify({ type: "done" }));
            },
            onError: (error) => {
              ws.send(JSON.stringify({ type: "error", message: error }));
            },
          }
        );
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: err instanceof Error ? err.message : "Unknown error",
          })
        );
      }
    },

    close(ws: any) {
      const agentId = ws.data.params.agentId;
      const agent = agents.get(agentId);
      console.log(`[ws] Disconnected: ${agentId}`);

      // Cleanup file watcher listener
      if (agent?.fileWatcher && (ws as any)._fileWatcherListener) {
        agent.fileWatcher.removeListener((ws as any)._fileWatcherListener);
      }
    },
  });
}

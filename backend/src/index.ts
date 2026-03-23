import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { agentRoutes, setupChatWebSocket } from "./routes/agents";

const app = new Elysia()
  .use(
    cors({
      origin: true,
    }),
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: "ruhclaw API",
          version: "1.0.0",
          description:
            "API for creating AI agent sandboxes powered by Daytona & OpenClaw",
        },
        tags: [{ name: "Agents", description: "Agent lifecycle management" }],
      },
      path: "/docs",
    }),
  )
  .use(agentRoutes);

// Register WebSocket handler
setupChatWebSocket(app);

app.listen(3000);

console.log(`
  ┌──────────────────────────────────────┐
  │  ruhclaw backend running             │
  │  http://localhost:3000               │
  │  Swagger: http://localhost:3000/docs │
  └──────────────────────────────────────┘
`);

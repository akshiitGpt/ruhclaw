import { Elysia, t } from "elysia";
import { agents } from "./agents";
import { execInContainer } from "../services/docker";

const WORKSPACE = "/root/.openclaw/workspace";
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
}

function buildTree(paths: string[]): FileNode[] {
  const root: FileNode[] = [];

  for (const filePath of paths) {
    const parts = filePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      const existingPath = parts.slice(0, i + 1).join("/");

      let node = current.find((n) => n.name === name);
      if (!node) {
        node = {
          name,
          path: existingPath,
          type: isFile ? "file" : "dir",
          ...(isFile ? {} : { children: [] }),
        };
        current.push(node);
      }
      if (!isFile) {
        current = node.children!;
      }
    }
  }

  function sortTree(nodes: FileNode[]) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) {
      if (n.children) sortTree(n.children);
    }
  }
  sortTree(root);
  return root;
}

export const fileRoutes = new Elysia({ prefix: "/api/agents" })
  // List files
  .get(
    "/:id/files",
    async ({ params }) => {
      const agent = agents.get(params.id);
      if (!agent) throw new Error("Agent not found");
      if (!agent.containerId) throw new Error("Agent not ready");

      const output = await execInContainer(
        agent.containerId,
        `find ${WORKSPACE} -type f -not -path '*/.git/*' -not -path '*/node_modules/*' -not -name 'workspace-state.json' -not -name 'AGENTS.md' -not -name 'BOOTSTRAP.md' -not -name 'SOUL.md' -not -name 'IDENTITY.md' -not -name 'USER.md' -not -name 'HEARTBEAT.md' -not -name 'TOOLS.md' -not -name 'MEMORY.md' -printf '%P\\n' 2>/dev/null | sort | head -500`
      );

      const paths = output.trim().split("\n").filter(Boolean);
      return { tree: buildTree(paths) };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Read file content — use query param ?path=foo/bar.ts
  .get(
    "/:id/file",
    async ({ params, query }) => {
      const agent = agents.get(params.id);
      if (!agent) throw new Error("Agent not found");
      if (!agent.containerId) throw new Error("Agent not ready");

      const filePath = query.path;
      if (!filePath || filePath.includes("..")) throw new Error("Invalid path");

      const sizeOutput = await execInContainer(
        agent.containerId,
        `stat -c '%s' '${WORKSPACE}/${filePath}' 2>/dev/null || echo '-1'`
      );
      const size = parseInt(sizeOutput.trim());
      if (size < 0) throw new Error("File not found");
      if (size > MAX_FILE_SIZE) {
        return { path: filePath, content: `[File too large: ${(size / 1024).toFixed(0)}KB]`, truncated: true };
      }

      const content = await execInContainer(
        agent.containerId,
        `cat '${WORKSPACE}/${filePath}' 2>/dev/null`
      );

      return { path: filePath, content };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({ path: t.String() }),
    }
  );

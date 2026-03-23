export interface Agent {
  id: string;
  name: string;
  status: "creating" | "running" | "stopped" | "error";
  gatewayUrl?: string;
  previewPort?: number;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  output: string;
  status: "calling" | "done" | "error";
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool"; toolCall: ToolCall };

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  blocks: ContentBlock[];
  timestamp: number;
  streaming?: boolean;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
  status?: "new" | "modified";
}

export type WSIncoming =
  | { type: "chunk"; content: string }
  | { type: "tool_call_start"; id: string; name: string; arguments: string }
  | { type: "tool_call_update"; id: string; output: string }
  | { type: "tool_call_result"; id: string; output: string; isError: boolean }
  | { type: "file_change"; event: "create" | "modify" | "delete"; path: string; ts: number }
  | { type: "done" }
  | { type: "error"; message: string };

export type WSOutgoing = { type: "message"; content: string };

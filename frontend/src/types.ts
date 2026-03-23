export interface Agent {
  id: string;
  name: string;
  status: "creating" | "running" | "stopped" | "error";
  gatewayUrl?: string;
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
  content: string; // plain text for user messages
  blocks: ContentBlock[]; // ordered blocks for assistant
  timestamp: number;
  streaming?: boolean;
}

export type WSIncoming =
  | { type: "chunk"; content: string }
  | { type: "tool_call_start"; id: string; name: string; arguments: string }
  | { type: "tool_call_update"; id: string; output: string }
  | { type: "tool_call_result"; id: string; output: string; isError: boolean }
  | { type: "done" }
  | { type: "error"; message: string };

export type WSOutgoing = { type: "message"; content: string };

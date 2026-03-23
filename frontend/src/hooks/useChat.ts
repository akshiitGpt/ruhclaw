import { useCallback, useEffect, useRef, useState } from "react";
import type { Message, ContentBlock, WSIncoming } from "@/types";
import { chatWsUrl, getAgent } from "@/lib/api";

export function useChat(agentId: string | undefined, onRawEvent?: (data: WSIncoming) => void) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>("creating");
  const wsRef = useRef<WebSocket | null>(null);
  const streamingIdRef = useRef<string | null>(null);
  // Track current blocks for the streaming message
  const blocksRef = useRef<ContentBlock[]>([]);

  useEffect(() => {
    if (!agentId) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;
    let ws: WebSocket | null = null;

    async function pollAndConnect() {
      while (!cancelled) {
        try {
          const agent = await getAgent(agentId!);
          setAgentStatus(agent.status);
          if (agent.status === "running") break;
          if (agent.status === "error") return;
        } catch {}
        await new Promise((r) => (pollTimer = setTimeout(r, 2000)));
      }
      if (cancelled) return;

      ws = new WebSocket(chatWsUrl(agentId!));
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => { setConnected(false); wsRef.current = null; };

      ws.onmessage = (evt) => {
        const data: WSIncoming = JSON.parse(evt.data);

        // Forward all events to external listeners (file explorer, etc.)
        onRawEvent?.(data);

        if (data.type === "chunk") {
          setIsTyping(true);
          ensureStreamingMessage();

          // Append text to last text block, or create new one
          const blocks = blocksRef.current;
          const last = blocks[blocks.length - 1];
          if (last && last.type === "text") {
            last.text += data.content;
          } else {
            blocks.push({ type: "text", text: data.content });
          }
          syncBlocks();
        }

        if (data.type === "tool_call_start") {
          setIsTyping(true);
          ensureStreamingMessage();

          // Add a new tool block — this creates separation from text
          blocksRef.current.push({
            type: "tool",
            toolCall: {
              id: data.id,
              name: data.name,
              arguments: data.arguments,
              output: "",
              status: "calling",
            },
          });
          syncBlocks();
        }

        if (data.type === "tool_call_update") {
          const toolBlock = findToolBlock(data.id);
          if (toolBlock) {
            toolBlock.toolCall.output += data.output;
            syncBlocks();
          }
        }

        if (data.type === "tool_call_result") {
          const toolBlock = findToolBlock(data.id);
          if (toolBlock) {
            toolBlock.toolCall.output = data.output || toolBlock.toolCall.output;
            toolBlock.toolCall.status = data.isError ? "error" : "done";
            syncBlocks();
          }
        }

        if (data.type === "done") {
          // Mark remaining calling tools as done
          for (const block of blocksRef.current) {
            if (block.type === "tool" && block.toolCall.status === "calling") {
              block.toolCall.status = "done";
            }
          }
          syncBlocks();

          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current ? { ...m, streaming: false } : m
            )
          );
          streamingIdRef.current = null;
          blocksRef.current = [];
          setIsTyping(false);
        }

        if (data.type === "error") {
          streamingIdRef.current = null;
          blocksRef.current = [];
          setIsTyping(false);
        }
      };
    }

    function ensureStreamingMessage() {
      if (!streamingIdRef.current) {
        const id = crypto.randomUUID();
        streamingIdRef.current = id;
        blocksRef.current = [];
        setMessages((prev) => [
          ...prev,
          { id, role: "assistant", content: "", blocks: [], timestamp: Date.now(), streaming: true },
        ]);
      }
    }

    function findToolBlock(toolId: string) {
      for (const b of blocksRef.current) {
        if (b.type === "tool" && b.toolCall.id === toolId) return b;
      }
      return null;
    }

    function syncBlocks() {
      const snapshot = blocksRef.current.map((b) =>
        b.type === "text"
          ? { ...b }
          : { ...b, toolCall: { ...b.toolCall } }
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingIdRef.current ? { ...m, blocks: snapshot } : m
        )
      );
    }

    pollAndConnect();
    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      if (ws) ws.close();
      wsRef.current = null;
    };
  }, [agentId]);

  const send = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content, blocks: [], timestamp: Date.now() },
    ]);
    wsRef.current.send(JSON.stringify({ type: "message", content }));
  }, []);

  return { messages, send, connected, isTyping, agentStatus };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Zap, Loader2 } from "lucide-react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { useChat } from "@/hooks/useChat";
import { createAgent, listAgents } from "@/lib/api";
import type { Agent } from "@/types";

export default function Chat() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, send, connected, isTyping, agentStatus } = useChat(agentId);

  useEffect(() => {
    listAgents()
      .then(setAgents)
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleCreateAgent = useCallback(async () => {
    setCreating(true);
    try {
      const agent = await createAgent();
      setAgents((prev) => [agent, ...prev]);
      navigate(`/chat/${agent.id}`);
    } finally {
      setCreating(false);
    }
  }, [navigate]);

  const isReady = agentStatus === "running" && connected;
  const isProvisioning = agentStatus === "creating";
  const isError = agentStatus === "error";

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        agents={agents}
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        onCreateAgent={handleCreateAgent}
        creating={creating}
      />

      <div className="flex flex-1 flex-col">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border/50 px-5 py-2.5">
          <div className="flex size-6 items-center justify-center rounded-md bg-foreground">
            <Zap className="size-3 text-background" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-medium text-foreground">
              {agentId ? `Agent ${agentId.slice(0, 8)}` : "ruhclaw"}
            </span>
            {agentId && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  isReady
                    ? "bg-emerald-50 text-emerald-600"
                    : isProvisioning
                      ? "bg-amber-50 text-amber-600"
                      : isError
                        ? "bg-red-50 text-red-600"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {isProvisioning && <Loader2 className="size-2.5 animate-spin" />}
                {isReady
                  ? "Connected"
                  : isProvisioning
                    ? "Provisioning sandbox..."
                    : isError
                      ? "Error"
                      : "Connecting..."}
              </span>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {/* Provisioning state */}
          {isProvisioning && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="relative flex size-14 items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-foreground/20" />
                <Zap className="size-5 text-muted-foreground/60" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-foreground/80">
                  Setting up your agent
                </p>
                <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-muted-foreground/50">
                  Creating a sandboxed environment with OpenClaw.
                  <br />
                  This usually takes 30–60 seconds.
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {isError && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-red-50">
                <Zap className="size-5 text-red-400" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-foreground/80">
                  Failed to create agent
                </p>
                <p className="mt-0.5 text-[13px] text-muted-foreground/50">
                  The sandbox could not be provisioned. Try creating a new agent.
                </p>
              </div>
            </div>
          )}

          {/* Empty ready state */}
          {isReady && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60">
                <Zap className="size-5 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-foreground/80">
                  Start a conversation
                </p>
                <p className="mt-0.5 text-[13px] text-muted-foreground/50">
                  Send a message to begin chatting with the agent
                </p>
              </div>
            </div>
          )}

          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isTyping && !messages.some((m) => m.streaming) && (
              <div className="flex items-center gap-3 py-2 pl-9 animate-fade-up">
                <span className="thinking-shimmer text-[13px] font-medium">Thinking...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput onSend={send} disabled={!isReady} />
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Sparkles, Loader2, PanelRight } from "lucide-react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { FileExplorer } from "@/components/FileExplorer";
import { useChat } from "@/hooks/useChat";
import { useFileExplorer } from "@/hooks/useFileExplorer";
import { createAgent, listAgents } from "@/lib/api";
import type { Agent, WSIncoming } from "@/types";

export default function Chat() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [explorerW, setExplorerW] = useState(440);
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const rawRef = useRef<((d: WSIncoming) => void) | null>(null);
  const fwd = useCallback((d: WSIncoming) => { rawRef.current?.(d); }, []);
  const { messages, send, connected, isTyping, agentStatus } = useChat(agentId, fwd);
  const fe = useFileExplorer(agentId, agentStatus);

  useEffect(() => { rawRef.current = (d) => { fe.handleFileEvent(d); fe.handleToolEvent(d); }; }, [fe.handleFileEvent, fe.handleToolEvent]);
  useEffect(() => { if (agentStatus === "running" && agentId) setExplorerOpen(true); }, [agentStatus, agentId]);
  useEffect(() => { listAgents().then(setAgents).catch(() => {}); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try { const a = await createAgent(); setAgents((p) => [a, ...p]); navigate(`/chat/${a.id}`); }
    finally { setCreating(false); }
  }, [navigate]);

  // Resize
  const dragging = useRef(false);
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const x0 = e.clientX, w0 = explorerW;
    const move = (ev: MouseEvent) => { if (dragging.current) setExplorerW(Math.max(300, Math.min(w0 + (x0 - ev.clientX), 720))); };
    const up = () => { dragging.current = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, [explorerW]);

  const ready = agentStatus === "running" && connected;
  const prov = agentStatus === "creating";
  const err = agentStatus === "error";

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar agents={agents} collapsed={!sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} onCreateAgent={handleCreate} creating={creating} />

      {/* Chat */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex h-10 items-center gap-2 border-b border-border/30 px-4 shrink-0">
          <div className="flex size-5 items-center justify-center rounded bg-foreground">
            <Sparkles className="size-2.5 text-background" />
          </div>
          <span className="text-[12px] font-medium text-foreground/70">
            {agentId ? `Agent ${agentId.slice(0, 8)}` : "ruhclaw"}
          </span>
          {agentId && (
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-[1px] text-[9px] font-medium ${
              ready ? "bg-emerald-50 text-emerald-600" :
              prov ? "bg-amber-50 text-amber-600" :
              err ? "bg-red-50 text-red-500" :
              "bg-muted text-muted-foreground/60"
            }`}>
              {prov && <Loader2 className="size-2 animate-spin" />}
              {ready ? "Live" : prov ? "Starting..." : err ? "Error" : "..."}
            </span>
          )}
          {ready && (
            <button
              onClick={() => setExplorerOpen((o) => !o)}
              className={`ml-auto rounded-md p-1 transition-colors ${explorerOpen ? "bg-foreground/[0.05] text-foreground/50" : "text-muted-foreground/25 hover:text-foreground/40"}`}
            >
              <PanelRight className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {prov && !messages.length && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="relative size-9">
                <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-foreground/10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="size-3.5 text-muted-foreground/30" />
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground/40">Creating sandbox...</p>
            </div>
          )}
          {err && !messages.length && (
            <div className="flex h-full items-center justify-center">
              <p className="text-[12px] text-red-400/60">Agent failed to start</p>
            </div>
          )}
          {ready && !messages.length && (
            <div className="flex h-full items-center justify-center">
              <p className="text-[12px] text-muted-foreground/25">Send a message to start</p>
            </div>
          )}
          <div className="mx-auto max-w-3xl px-5 py-3">
            {messages.map((m) => <ChatMessage key={m.id} message={m} />)}
            {isTyping && !messages.some((m) => m.streaming) && (
              <div className="flex items-center gap-2.5 py-1.5 animate-fade-up">
                <div className="flex size-[18px] items-center justify-center rounded-full bg-foreground/[0.04]">
                  <span className="text-[7px] font-bold text-foreground/25">R</span>
                </div>
                <span className="thinking-shimmer text-[12px] font-medium">Thinking...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <ChatInput onSend={send} disabled={!ready} />
      </div>

      {explorerOpen && ready && <div className="resize-handle" onMouseDown={startResize} />}
      {explorerOpen && ready && (
        <div style={{ width: explorerW }} className="shrink-0 overflow-hidden">
          <FileExplorer tree={fe.tree} selectedPath={fe.selectedPath} fileContent={fe.fileContent} loading={fe.loading} onSelectFile={fe.selectFile} onRefresh={fe.refreshTree} onClose={() => setExplorerOpen(false)} />
        </div>
      )}
    </div>
  );
}

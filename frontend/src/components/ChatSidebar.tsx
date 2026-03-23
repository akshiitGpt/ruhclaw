import { useNavigate, useParams } from "react-router";
import { Plus, MessageSquare, PanelLeftClose, PanelLeft, Sparkles } from "lucide-react";
import type { Agent } from "@/types";

interface ChatSidebarProps {
  agents: Agent[];
  collapsed: boolean;
  onToggle: () => void;
  onCreateAgent: () => void;
  creating: boolean;
}

export function ChatSidebar({ agents, collapsed, onToggle, onCreateAgent, creating }: ChatSidebarProps) {
  const navigate = useNavigate();
  const { agentId } = useParams();

  if (collapsed) {
    return (
      <div className="flex w-11 flex-col items-center border-r border-border/30 py-3 gap-3">
        <button onClick={onToggle} className="rounded-md p-1.5 text-muted-foreground/40 transition-colors hover:bg-muted/40 hover:text-foreground/60">
          <PanelLeft className="size-3.5" />
        </button>
        <button onClick={onCreateAgent} disabled={creating} className="rounded-md p-1.5 text-muted-foreground/40 transition-colors hover:bg-muted/40 hover:text-foreground/60 disabled:opacity-40">
          <Plus className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-56 flex-col border-r border-border/30">
      {/* Brand */}
      <div className="flex h-10 items-center justify-between px-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded bg-foreground">
            <Sparkles className="size-2.5 text-background" />
          </div>
          <span className="text-[12.5px] font-semibold tracking-tight text-foreground/80">ruhclaw</span>
        </div>
        <button onClick={onToggle} className="rounded p-1 text-muted-foreground/30 transition-colors hover:text-muted-foreground/60">
          <PanelLeftClose className="size-3.5" />
        </button>
      </div>

      {/* New agent */}
      <div className="p-2">
        <button
          onClick={onCreateAgent}
          disabled={creating}
          className="flex w-full items-center gap-2 rounded-lg border border-border/40 px-2.5 py-1.5 text-[12px] text-muted-foreground/60 transition-colors hover:bg-muted/30 hover:text-foreground/70 disabled:opacity-40"
        >
          <Plus className="size-3" />
          {creating ? "Creating..." : "New agent"}
        </button>
      </div>

      {/* Agent list */}
      <nav className="flex-1 overflow-y-auto px-2">
        {agents.map((agent) => {
          const active = agent.id === agentId;
          return (
            <button
              key={agent.id}
              onClick={() => navigate(`/chat/${agent.id}`)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors mb-0.5 ${
                active
                  ? "bg-foreground/[0.05] text-foreground font-medium"
                  : "text-muted-foreground/60 hover:bg-muted/25 hover:text-foreground/70"
              }`}
            >
              <MessageSquare className="size-3 shrink-0 opacity-40" />
              <span className="truncate flex-1">{agent.name || `Agent ${agent.id.slice(0, 6)}`}</span>
              {agent.status === "creating" && <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />}
              {agent.status === "running" && <span className="size-1.5 rounded-full bg-emerald-400" />}
            </button>
          );
        })}
        {agents.length === 0 && (
          <p className="py-8 text-center text-[11px] text-muted-foreground/25">No agents yet</p>
        )}
      </nav>
    </div>
  );
}

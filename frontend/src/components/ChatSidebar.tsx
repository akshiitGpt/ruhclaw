import { useNavigate, useParams } from "react-router";
import { Plus, MessageSquare, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Agent } from "@/types";

interface ChatSidebarProps {
  agents: Agent[];
  collapsed: boolean;
  onToggle: () => void;
  onCreateAgent: () => void;
  creating: boolean;
}

export function ChatSidebar({
  agents,
  collapsed,
  onToggle,
  onCreateAgent,
  creating,
}: ChatSidebarProps) {
  const navigate = useNavigate();
  const { agentId } = useParams();

  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center border-r border-border/50 bg-muted/20 py-3 gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-muted-foreground"
        >
          <PanelLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCreateAgent}
          disabled={creating}
          className="text-muted-foreground"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-60 flex-col border-r border-border/50 bg-muted/20">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2.5">
        <span className="text-[13px] font-semibold tracking-tight text-foreground">
          ruhclaw
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-muted-foreground"
        >
          <PanelLeftClose className="size-4" />
        </Button>
      </div>

      <div className="px-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={onCreateAgent}
          disabled={creating}
        >
          <Plus className="size-3.5" />
          {creating ? "Creating..." : "New agent"}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pt-3">
        <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
          Agents
        </p>
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => navigate(`/chat/${agent.id}`)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${
              agent.id === agentId
                ? "bg-foreground/[0.06] text-foreground font-medium"
                : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
            }`}
          >
            <MessageSquare className="size-3.5 shrink-0" />
            <span className="truncate">{agent.name || `Agent ${agent.id.slice(0, 6)}`}</span>
            {agent.status === "creating" && (
              <span className="ml-auto size-1.5 animate-pulse rounded-full bg-amber-400" />
            )}
            {agent.status === "running" && (
              <span className="ml-auto size-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        ))}

        {agents.length === 0 && (
          <p className="px-2 py-4 text-center text-[12px] text-muted-foreground/40">
            No agents yet
          </p>
        )}
      </nav>
    </div>
  );
}

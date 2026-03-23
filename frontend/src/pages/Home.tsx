import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAgent, listAgents } from "@/lib/api";
import type { Agent } from "@/types";

export default function Home() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => { listAgents().then(setAgents).catch(() => {}); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try { const agent = await createAgent(); navigate(`/chat/${agent.id}`); }
    catch { setCreating(false); }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center border-b border-border/30 px-6 h-12">
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 items-center justify-center rounded-md bg-foreground">
            <Sparkles className="size-3 text-background" />
          </div>
          <span className="text-sm font-semibold tracking-tight">ruhclaw</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="animate-fade-up text-center" style={{ animationDelay: "0ms" }}>
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-b from-foreground/[0.04] to-foreground/[0.08]">
            <Sparkles className="size-6 text-foreground/40" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Create an agent
          </h1>
          <p className="mx-auto mt-2.5 max-w-sm text-[14px] leading-relaxed text-muted-foreground/70">
            Each agent runs in an isolated sandbox with its own filesystem, tools, and AI model.
          </p>
          <Button
            size="lg"
            onClick={handleCreate}
            disabled={creating}
            className="mt-7 gap-2 rounded-xl px-6 text-[13px] font-medium"
          >
            <Plus className="size-3.5" />
            {creating ? "Creating..." : "New agent"}
          </Button>
        </div>

        {agents.length > 0 && (
          <div className="mt-14 w-full max-w-md animate-fade-up" style={{ animationDelay: "80ms" }}>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
              Recent
            </p>
            <div className="divide-y divide-border/30 rounded-xl border border-border/40">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => navigate(`/chat/${agent.id}`)}
                  className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/30 first:rounded-t-xl last:rounded-b-xl"
                >
                  <span className={`size-1.5 rounded-full ${
                    agent.status === "running" ? "bg-emerald-400" :
                    agent.status === "creating" ? "bg-amber-400 animate-pulse" :
                    "bg-muted-foreground/20"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground/80 truncate">
                      {agent.name || `Agent ${agent.id.slice(0, 8)}`}
                    </p>
                  </div>
                  <ArrowRight className="size-3 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground/50" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="flex h-10 items-center justify-center">
        <p className="text-[10.5px] text-muted-foreground/30">Powered by OpenClaw</p>
      </footer>
    </div>
  );
}

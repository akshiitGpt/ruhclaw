import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAgent, listAgents } from "@/lib/api";
import type { Agent } from "@/types";

export default function Home() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listAgents()
      .then(setAgents)
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const agent = await createAgent();
      navigate(`/chat/${agent.id}`);
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/50 px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-foreground">
            <Zap className="size-3.5 text-background" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">ruhclaw</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="animate-fade-up text-center" style={{ animationDelay: "0ms" }}>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Spin up an agent
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Create a sandboxed AI agent powered by OpenClaw.
            <br />
            Each agent runs in its own isolated environment.
          </p>

          <Button
            size="lg"
            onClick={handleCreate}
            disabled={creating}
            className="mt-8 gap-2 rounded-xl px-5 text-[14px]"
          >
            <Plus className="size-4" />
            {creating ? "Creating agent..." : "Create agent"}
          </Button>
        </div>

        {/* Existing agents */}
        {agents.length > 0 && (
          <div
            className="mt-16 w-full max-w-lg animate-fade-up"
            style={{ animationDelay: "100ms" }}
          >
            <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-muted-foreground/50">
              Recent agents
            </p>
            <div className="divide-y divide-border/40 rounded-xl border border-border/60">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => navigate(`/chat/${agent.id}`)}
                  className="group flex w-full items-center justify-between px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`size-2 rounded-full ${
                        agent.status === "running"
                          ? "bg-emerald-400"
                          : agent.status === "creating"
                            ? "animate-pulse bg-amber-400"
                            : "bg-muted-foreground/30"
                      }`}
                    />
                    <div>
                      <p className="text-[13.5px] font-medium text-foreground">
                        {agent.name || `Agent ${agent.id.slice(0, 8)}`}
                      </p>
                      <p className="text-[12px] text-muted-foreground/60">
                        {new Date(agent.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="size-3.5 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 px-6 py-3">
        <p className="text-center text-[11px] text-muted-foreground/40">
          Powered by Daytona sandboxes & OpenClaw
        </p>
      </footer>
    </div>
  );
}

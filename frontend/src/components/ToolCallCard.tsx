import { useState } from "react";
import {
  Terminal, FileText, Pencil, Eye, Globe, Search,
  ChevronRight, Check, Loader2, AlertCircle, GitBranch,
} from "lucide-react";
import type { ToolCall } from "@/types";

const META: Record<string, { icon: typeof Terminal; verb: string }> = {
  exec: { icon: Terminal, verb: "Ran" },
  write: { icon: FileText, verb: "Wrote" },
  read: { icon: Eye, verb: "Read" },
  edit: { icon: Pencil, verb: "Edited" },
  apply_patch: { icon: Pencil, verb: "Patched" },
  web_search: { icon: Search, verb: "Searched" },
  web_fetch: { icon: Globe, verb: "Fetched" },
  sessions_spawn: { icon: GitBranch, verb: "Spawned" },
  sessions_yield: { icon: GitBranch, verb: "Yielded" },
};

function describe(tc: ToolCall) {
  const m = META[tc.name] || { icon: Terminal, verb: tc.name };
  try {
    const a = JSON.parse(tc.arguments);
    if (tc.name === "exec") return { ...m, detail: a.command };
    if (["write", "read", "edit"].includes(tc.name)) return { ...m, detail: a.file_path || a.path };
    if (tc.name === "sessions_spawn") return { ...m, detail: a.label || a.task };
    if (tc.name === "web_search") return { ...m, detail: a.query };
    return m;
  } catch { return m; }
}

function fmt(raw: string) {
  try { return JSON.stringify(JSON.parse(raw), null, 2); }
  catch { return raw || ""; }
}

export function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [open, setOpen] = useState(false);
  const { icon: Icon, verb, detail } = describe(toolCall) as ReturnType<typeof describe> & { detail?: string };
  const calling = toolCall.status === "calling";
  const err = toolCall.status === "error";

  return (
    <div className="my-0.5 animate-fade-up">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-1.5 py-0.5 text-left"
      >
        <span className={`flex size-3.5 shrink-0 items-center justify-center rounded-full ${
          calling ? "text-amber-500" : err ? "text-red-400" : "text-emerald-500"
        }`}>
          {calling ? <Loader2 className="size-2.5 animate-spin" /> :
           err ? <AlertCircle className="size-2.5" /> :
           <Check className="size-2.5" strokeWidth={3} />}
        </span>
        <Icon className="size-3 text-muted-foreground/30" />
        <span className="flex-1 min-w-0 truncate text-[12px] text-muted-foreground/60">
          {verb}
          {detail && <code className="ml-1 text-[11px] text-foreground/40">{detail.length > 48 ? detail.slice(0, 48) + "..." : detail}</code>}
        </span>
        {(toolCall.arguments !== "{}" || toolCall.output) && (
          <ChevronRight className={`size-2.5 text-muted-foreground/20 transition-transform duration-100 group-hover:text-muted-foreground/40 ${open ? "rotate-90" : ""}`} />
        )}
      </button>

      {open && (
        <div className="ml-5 mt-0.5 mb-1.5 border-l border-border/30 pl-3 space-y-1.5 animate-fade-up">
          {toolCall.arguments && toolCall.arguments !== "{}" && (
            <pre className="overflow-x-auto rounded-md bg-muted/20 px-2.5 py-1.5 font-mono text-[10.5px] leading-relaxed text-foreground/40">
              {fmt(toolCall.arguments)}
            </pre>
          )}
          {toolCall.output && (
            <pre className="max-h-40 overflow-auto rounded-md bg-muted/20 px-2.5 py-1.5 font-mono text-[10.5px] leading-relaxed text-foreground/35">
              {toolCall.output.slice(0, 4000)}{toolCall.output.length > 4000 ? "\n..." : ""}
            </pre>
          )}
          {calling && !toolCall.output && (
            <p className="flex items-center gap-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground/30">
              <Loader2 className="size-2.5 animate-spin" /> running
            </p>
          )}
        </div>
      )}
    </div>
  );
}

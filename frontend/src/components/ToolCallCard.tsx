import { useState } from "react";
import {
  Terminal,
  FileText,
  Pencil,
  Eye,
  Globe,
  Search,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { ToolCall } from "@/types";

const TOOL_META: Record<string, { icon: typeof Terminal; label: string; color: string }> = {
  exec: { icon: Terminal, label: "Ran command", color: "text-orange-600" },
  write: { icon: FileText, label: "Created file", color: "text-blue-600" },
  read: { icon: Eye, label: "Read file", color: "text-violet-600" },
  edit: { icon: Pencil, label: "Edited file", color: "text-teal-600" },
  apply_patch: { icon: Pencil, label: "Applied patch", color: "text-teal-600" },
  web_search: { icon: Search, label: "Searched web", color: "text-pink-600" },
  web_fetch: { icon: Globe, label: "Fetched URL", color: "text-cyan-600" },
  browser: { icon: Globe, label: "Used browser", color: "text-cyan-600" },
  message: { icon: FileText, label: "Sent message", color: "text-blue-600" },
};

function getMeta(name: string) {
  return TOOL_META[name] || { icon: Terminal, label: name, color: "text-muted-foreground" };
}

function getPreview(tc: ToolCall): string {
  try {
    const a = JSON.parse(tc.arguments);
    if (tc.name === "exec") return a.command || "";
    if (tc.name === "write" || tc.name === "read" || tc.name === "edit") return a.file_path || a.path || "";
    if (tc.name === "web_search") return a.query || "";
    if (tc.name === "web_fetch") return a.url || "";
    return "";
  } catch { return ""; }
}

function formatArgs(raw: string): string {
  try { return JSON.stringify(JSON.parse(raw), null, 2); }
  catch { return raw || ""; }
}

export function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const meta = getMeta(toolCall.name);
  const Icon = meta.icon;
  const isCalling = toolCall.status === "calling";
  const isError = toolCall.status === "error";
  const preview = getPreview(toolCall);
  const hasOutput = toolCall.output.length > 0;
  const formattedArgs = formatArgs(toolCall.arguments);

  return (
    <div className="tool-card-enter my-1.5 overflow-hidden rounded-xl border border-border/50 bg-background shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/30"
      >
        {/* Status indicator */}
        <div className={`flex size-[18px] shrink-0 items-center justify-center rounded-full ${
          isCalling ? "bg-amber-50 ring-1 ring-amber-200" :
          isError ? "bg-red-50 ring-1 ring-red-200" :
          "bg-emerald-50 ring-1 ring-emerald-200"
        }`}>
          {isCalling ? <Loader2 className="size-2.5 animate-spin text-amber-500" /> :
           isError ? <AlertCircle className="size-2.5 text-red-500" /> :
           <Check className="size-2.5 text-emerald-500" strokeWidth={3} />}
        </div>

        <Icon className={`size-3.5 ${meta.color} opacity-60`} />

        <span className="flex-1 min-w-0 text-[12.5px]">
          <span className="font-medium text-foreground/70">{meta.label}</span>
          {preview && (
            <span className="ml-1.5 font-mono text-[11.5px] text-muted-foreground/50 truncate">
              {preview.length > 50 ? preview.slice(0, 50) + "…" : preview}
            </span>
          )}
        </span>

        <ChevronDown className={`size-3 text-muted-foreground/30 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border/30">
          {/* Input */}
          {formattedArgs && formattedArgs !== "{}" && (
            <div className="px-3 py-2 bg-muted/[0.03]">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/30">
                Input
              </p>
              <pre className="overflow-x-auto rounded-md bg-muted/30 px-2.5 py-1.5 text-[11px] leading-relaxed text-foreground/60 font-mono">
                {formattedArgs}
              </pre>
            </div>
          )}

          {/* Output */}
          {hasOutput && (
            <div className="border-t border-border/20 px-3 py-2 bg-muted/[0.02]">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/30">
                Output
              </p>
              <pre className="overflow-x-auto max-h-48 overflow-y-auto rounded-md bg-muted/30 px-2.5 py-1.5 text-[11px] leading-relaxed text-foreground/50 font-mono">
                {toolCall.output.slice(0, 3000)}{toolCall.output.length > 3000 ? "\n…" : ""}
              </pre>
            </div>
          )}

          {/* Loading state for output */}
          {isCalling && !hasOutput && (
            <div className="border-t border-border/20 px-3 py-2.5">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground/40">
                <Loader2 className="size-3 animate-spin" />
                Running...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

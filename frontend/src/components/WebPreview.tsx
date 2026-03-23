import { useState, useCallback } from "react";
import { RotateCw, ExternalLink } from "lucide-react";
import { setPreviewTarget } from "@/lib/api";

export function WebPreview({ agentId, previewPort }: {
  agentId: string;
  previewPort: number;
}) {
  const [port, setPort] = useState(3000);
  const [iframeKey, setIframeKey] = useState(0);
  const [setting, setSetting] = useState(false);

  const previewUrl = `http://localhost:${previewPort}`;

  const applyPort = useCallback(async () => {
    setSetting(true);
    try {
      await setPreviewTarget(agentId, port);
      setIframeKey((k) => k + 1);
    } finally {
      setSetting(false);
    }
  }, [agentId, port]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex h-8 items-center gap-1.5 border-b border-border/20 px-2 shrink-0">
        <div className="flex items-center gap-1 rounded-md border border-border/30 px-1.5 py-0.5">
          <span className="text-[10px] text-muted-foreground/40">Port</span>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value) || 3000)}
            onKeyDown={(e) => { if (e.key === "Enter") applyPort(); }}
            className="w-12 bg-transparent text-center font-mono text-[11px] text-foreground/60 outline-none"
          />
          <button
            onClick={applyPort}
            disabled={setting}
            className="rounded px-1 py-0.5 text-[9px] font-medium text-foreground/40 transition-colors hover:bg-muted/40 hover:text-foreground/70 disabled:opacity-30"
          >
            {setting ? "..." : "Go"}
          </button>
        </div>

        <button
          onClick={() => setIframeKey((k) => k + 1)}
          className="rounded p-1 text-muted-foreground/25 transition-colors hover:text-muted-foreground/60 hover:bg-muted/30"
        >
          <RotateCw className="size-2.5" />
        </button>

        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded p-1 text-muted-foreground/25 transition-colors hover:text-muted-foreground/60 hover:bg-muted/30"
        >
          <ExternalLink className="size-2.5" />
        </a>
      </div>

      {/* iframe */}
      <iframe
        key={iframeKey}
        src={previewUrl}
        className="flex-1 w-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        title="App Preview"
      />
    </div>
  );
}

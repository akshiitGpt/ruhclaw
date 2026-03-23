import { FileCode, Loader2 } from "lucide-react";

export function CodeViewer({ path, content, loading }: {
  path: string | null; content: string; loading: boolean;
}) {
  if (!path) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FileCode className="mx-auto size-5 text-muted-foreground/10" />
          <p className="mt-1.5 text-[10.5px] text-muted-foreground/20">Select a file to view</p>
        </div>
      </div>
    );
  }

  const lines = content.split("\n");
  const w = String(lines.length).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-7 items-center gap-1.5 border-b border-border/20 px-3 shrink-0">
        <FileCode className="size-2.5 text-muted-foreground/25" />
        <span className="truncate font-mono text-[10px] text-muted-foreground/40">{path}</span>
        {loading && <Loader2 className="ml-auto size-2.5 animate-spin text-muted-foreground/20" />}
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="font-mono text-[11px] leading-[1.7]">
          {lines.map((line, i) => (
            <div key={i} className="cv-line flex">
              <span className="cv-gutter shrink-0 px-2.5 text-right" style={{ width: `${w + 3.5}ch` }}>{i + 1}</span>
              <span className="flex-1 whitespace-pre-wrap break-all pr-3 text-foreground/55">{line || "\u00A0"}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

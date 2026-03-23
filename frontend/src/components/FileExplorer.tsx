import { useState } from "react";
import { FolderTree, Globe, RotateCw, X } from "lucide-react";
import { FileTree } from "./FileTree";
import { CodeViewer } from "./CodeViewer";
import { WebPreview } from "./WebPreview";
import type { FileNode } from "@/types";

type Tab = "files" | "preview";

export function FileExplorer({ tree, selectedPath, fileContent, loading, onSelectFile, onRefresh, onClose, agentId, previewPort }: {
  tree: FileNode[]; selectedPath: string | null; fileContent: string; loading: boolean;
  onSelectFile: (p: string) => void; onRefresh: () => void; onClose: () => void;
  agentId: string; previewPort: number;
}) {
  const [tab, setTab] = useState<Tab>("files");

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header with tabs */}
      <div className="flex h-10 items-center border-b border-border/30 px-1 shrink-0">
        <div className="flex items-center gap-0.5 flex-1">
          <button
            onClick={() => setTab("files")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              tab === "files" ? "bg-foreground/[0.05] text-foreground/70" : "text-muted-foreground/35 hover:text-muted-foreground/60"
            }`}
          >
            <FolderTree className="size-3" />
            Files
          </button>
          <button
            onClick={() => setTab("preview")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              tab === "preview" ? "bg-foreground/[0.05] text-foreground/70" : "text-muted-foreground/35 hover:text-muted-foreground/60"
            }`}
          >
            <Globe className="size-3" />
            Preview
          </button>
        </div>
        <div className="flex items-center gap-0.5 pr-1">
          {tab === "files" && (
            <button onClick={onRefresh} className="rounded p-1 text-muted-foreground/25 transition-colors hover:text-muted-foreground/60 hover:bg-muted/30">
              <RotateCw className="size-2.5" />
            </button>
          )}
          <button onClick={onClose} className="rounded p-1 text-muted-foreground/25 transition-colors hover:text-muted-foreground/60 hover:bg-muted/30">
            <X className="size-2.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {tab === "files" ? (
          <div className="flex h-full">
            <div className="w-40 shrink-0 overflow-y-auto border-r border-border/15">
              <FileTree tree={tree} selectedPath={selectedPath} onSelect={onSelectFile} />
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeViewer path={selectedPath} content={fileContent} loading={loading} />
            </div>
          </div>
        ) : (
          <WebPreview agentId={agentId} previewPort={previewPort} />
        )}
      </div>
    </div>
  );
}

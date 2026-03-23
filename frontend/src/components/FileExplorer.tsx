import { FolderTree, RotateCw, X } from "lucide-react";
import { FileTree } from "./FileTree";
import { CodeViewer } from "./CodeViewer";
import type { FileNode } from "@/types";

export function FileExplorer({ tree, selectedPath, fileContent, loading, onSelectFile, onRefresh, onClose }: {
  tree: FileNode[]; selectedPath: string | null; fileContent: string; loading: boolean;
  onSelectFile: (p: string) => void; onRefresh: () => void; onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-10 items-center justify-between border-b border-border/30 px-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <FolderTree className="size-3 text-muted-foreground/30" />
          <span className="text-[11.5px] font-semibold text-foreground/55">Files</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={onRefresh} className="rounded p-1 text-muted-foreground/25 transition-colors hover:text-muted-foreground/60 hover:bg-muted/30">
            <RotateCw className="size-2.5" />
          </button>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground/25 transition-colors hover:text-muted-foreground/60 hover:bg-muted/30">
            <X className="size-2.5" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-40 shrink-0 overflow-y-auto border-r border-border/15">
          <FileTree tree={tree} selectedPath={selectedPath} onSelect={onSelectFile} />
        </div>
        <div className="flex-1 overflow-hidden">
          <CodeViewer path={selectedPath} content={fileContent} loading={loading} />
        </div>
      </div>
    </div>
  );
}

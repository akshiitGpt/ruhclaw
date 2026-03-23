import { useState } from "react";
import { ChevronRight, File, FileCode, FileJson, FileText, Folder, FolderOpen, Image } from "lucide-react";
import type { FileNode } from "@/types";

const EXT: Record<string, typeof File> = {
  ts: FileCode, tsx: FileCode, js: FileCode, jsx: FileCode, mjs: FileCode,
  css: FileCode, html: FileCode, json: FileJson, md: FileText, txt: FileText,
  png: Image, jpg: Image, svg: Image,
};

function Node({ node, depth, sel, onSelect }: {
  node: FileNode; depth: number; sel: string | null; onSelect: (p: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const dir = node.type === "dir";
  const active = node.path === sel;
  const Icon = dir ? (open ? FolderOpen : Folder) : (EXT[node.name.split(".").pop()?.toLowerCase() || ""] || File);

  return (
    <>
      <button
        onClick={() => dir ? setOpen((o) => !o) : onSelect(node.path)}
        className={`flex w-full items-center gap-1 rounded-md py-[3px] pr-1 text-[11.5px] transition-colors ${
          active ? "bg-foreground/[0.06] text-foreground font-medium" : "text-muted-foreground/55 hover:bg-muted/30 hover:text-foreground/70"
        }`}
        style={{ paddingLeft: depth * 14 + 6 }}
      >
        {dir ? <ChevronRight className={`size-2.5 shrink-0 opacity-30 transition-transform duration-100 ${open ? "rotate-90" : ""}`} /> : <span className="w-2.5 shrink-0" />}
        <Icon className={`size-3 shrink-0 ${dir ? "text-amber-500/40" : "opacity-25"}`} />
        <span className="truncate">{node.name}</span>
        {node.status === "new" && <span className="ml-auto size-[5px] shrink-0 rounded-full bg-emerald-400/70" />}
        {node.status === "modified" && <span className="ml-auto size-[5px] shrink-0 rounded-full bg-blue-400/70" />}
      </button>
      {dir && open && node.children?.map((c) => (
        <Node key={c.path} node={c} depth={depth + 1} sel={sel} onSelect={onSelect} />
      ))}
    </>
  );
}

export function FileTree({ tree, selectedPath, onSelect }: {
  tree: FileNode[]; selectedPath: string | null; onSelect: (p: string) => void;
}) {
  if (!tree.length) return <p className="py-10 text-center text-[10.5px] text-muted-foreground/20">Empty workspace</p>;
  return (
    <div className="py-1 px-0.5">
      {tree.map((n) => <Node key={n.path} node={n} depth={0} sel={selectedPath} onSelect={onSelect} />)}
    </div>
  );
}

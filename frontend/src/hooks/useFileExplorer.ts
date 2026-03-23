import { useCallback, useEffect, useRef, useState } from "react";
import type { FileNode, WSIncoming } from "@/types";
import { getFileTree, getFileContent } from "@/lib/api";

export function useFileExplorer(agentId: string | undefined, agentStatus: string) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const treeLoaded = useRef(false);

  // Load tree once when agent is ready
  useEffect(() => {
    if (!agentId || agentStatus !== "running") return;
    if (!treeLoaded.current) {
      treeLoaded.current = true;
      refreshTreeNow();
    }
  }, [agentId, agentStatus]);

  const refreshTreeNow = useCallback(async () => {
    if (!agentId) return;
    try {
      const t = await getFileTree(agentId);
      setTree((prev) => {
        // Preserve status indicators from previous tree
        return mergeTreeStatus(t, prev);
      });
    } catch {}
  }, [agentId]);

  // Debounced refresh — batches rapid file changes
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      refreshTreeNow();
    }, 1000);
  }, [refreshTreeNow]);

  // Handle file_change events from the watcher sidecar
  const handleFileEvent = useCallback((data: WSIncoming) => {
    if (data.type !== "file_change") return;

    setTree((prev) => {
      if (data.event === "create") {
        return addFileToTree(prev, data.path, "new");
      }
      if (data.event === "modify") {
        return markFileInTree(prev, data.path, "modified");
      }
      if (data.event === "delete") {
        return removeFileFromTree(prev, data.path);
      }
      return prev;
    });

    // Reload selected file if it changed
    if (data.path === selectedPath && agentId) {
      getFileContent(agentId, data.path).then(setFileContent).catch(() => {});
    }
  }, [selectedPath, agentId]);

  // Handle tool events — trigger refresh for write/edit/exec
  const handleToolEvent = useCallback((data: WSIncoming) => {
    if (data.type === "tool_call_result") {
      // Tool finished — good time to refresh tree
      scheduleRefresh();
      return;
    }
    if (data.type === "tool_call_start") {
      if (data.name === "write" || data.name === "edit") {
        try {
          const args = JSON.parse(data.arguments);
          const filePath = args.file_path || args.path;
          if (filePath) {
            // Optimistically add the file to tree
            setTree((prev) => addFileToTree(prev, filePath, "new"));
          }
        } catch {}
      }
    }
    if (data.type === "done") {
      // Full refresh when agent turn ends
      scheduleRefresh();
    }
  }, [scheduleRefresh]);

  const selectFile = useCallback(async (path: string) => {
    if (!agentId) return;
    setSelectedPath(path);
    setLoading(true);
    try {
      const content = await getFileContent(agentId, path);
      setFileContent(content);
    } catch {
      setFileContent("// Failed to load file");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  return {
    tree,
    selectedPath,
    fileContent,
    loading,
    selectFile,
    handleFileEvent,
    handleToolEvent,
    refreshTree: refreshTreeNow,
  };
}

// ── Tree manipulation helpers ──

function mergeTreeStatus(newTree: FileNode[], oldTree: FileNode[]): FileNode[] {
  return newTree.map((node) => {
    const old = oldTree.find((o) => o.path === node.path);
    if (node.type === "dir" && old?.type === "dir" && node.children && old.children) {
      return { ...node, children: mergeTreeStatus(node.children, old.children) };
    }
    if (old?.status) {
      return { ...node, status: old.status };
    }
    // New file that wasn't in old tree
    if (!old) {
      return { ...node, status: "new" as const };
    }
    return node;
  });
}

function addFileToTree(tree: FileNode[], path: string, status: "new" | "modified"): FileNode[] {
  const parts = path.split("/");
  if (parts.length === 1) {
    // File in root
    if (tree.find((n) => n.path === path)) {
      return markFileInTree(tree, path, status);
    }
    return [...tree, { name: parts[0], path, type: "file", status }];
  }

  // Need to create/traverse directories
  const dirName = parts[0];
  const restPath = parts.slice(1).join("/");
  let dir = tree.find((n) => n.name === dirName && n.type === "dir");

  if (!dir) {
    dir = { name: dirName, path: dirName, type: "dir", children: [] };
    tree = [...tree, dir];
  }

  return tree.map((n) =>
    n === dir
      ? { ...n, children: addFileToTree(n.children || [], restPath, status) }
      : n
  );
}

function markFileInTree(tree: FileNode[], path: string, status: "new" | "modified"): FileNode[] {
  return tree.map((node) => {
    if (node.type === "file" && node.path === path) {
      return { ...node, status };
    }
    if (node.type === "dir" && path.startsWith(node.path + "/") && node.children) {
      return { ...node, children: markFileInTree(node.children, path, status) };
    }
    return node;
  });
}

function removeFileFromTree(tree: FileNode[], path: string): FileNode[] {
  return tree
    .filter((n) => !(n.type === "file" && n.path === path))
    .map((n) => {
      if (n.type === "dir" && n.children) {
        return { ...n, children: removeFileFromTree(n.children, path) };
      }
      return n;
    });
}

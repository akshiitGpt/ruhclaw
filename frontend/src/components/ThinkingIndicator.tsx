export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 px-1 py-3 animate-fade-up">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.04] ring-1 ring-border/60">
        <span className="text-[10px] font-semibold tracking-tight text-foreground/50">
          R
        </span>
      </div>
      <span className="thinking-shimmer text-[13px] font-medium tracking-tight">
        Thinking...
      </span>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 px-5 py-4 animate-fade-up">
      <div className="flex size-7 items-center justify-center rounded-full bg-foreground/5">
        <span className="text-xs font-medium text-muted-foreground">R</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="typing-dot block size-1.5 rounded-full bg-muted-foreground/60" />
        <span className="typing-dot block size-1.5 rounded-full bg-muted-foreground/60" />
        <span className="typing-dot block size-1.5 rounded-full bg-muted-foreground/60" />
      </div>
    </div>
  );
}

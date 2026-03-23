import { useState, useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = Math.min(ref.current.scrollHeight, 150) + "px";
    }
  }, [value]);

  const submit = () => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  return (
    <div className="border-t border-border/30 px-4 pb-4 pt-2.5">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-border/50 bg-white px-3.5 py-2 shadow-[0_1px_4px_rgba(0,0,0,0.03)] transition-all focus-within:border-foreground/15 focus-within:shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Message the agent..."
          disabled={disabled}
          className="min-h-[22px] max-h-[150px] flex-1 resize-none bg-transparent text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/35 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <button
          onClick={submit}
          disabled={!value.trim() || disabled}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-all hover:bg-foreground/85 active:scale-95 disabled:opacity-20 disabled:hover:bg-foreground"
        >
          <ArrowUp className="size-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

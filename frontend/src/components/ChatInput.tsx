import { useState, useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="border-t border-border/60 bg-background px-4 pb-5 pt-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border/80 bg-muted/30 px-4 py-2.5 transition-colors focus-within:border-foreground/20 focus-within:bg-muted/50">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Send a message..."
          disabled={disabled}
          className="min-h-[24px] max-h-[160px] flex-1 resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button
          size="icon-sm"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className="shrink-0 rounded-lg transition-transform active:scale-95"
        >
          <ArrowUp className="size-4" />
        </Button>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground/50">
        ruhclaw may produce inaccurate responses
      </p>
    </div>
  );
}

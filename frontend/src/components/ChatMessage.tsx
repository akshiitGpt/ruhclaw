import { Streamdown } from "streamdown";
import { ToolCallCard } from "./ToolCallCard";
import type { Message } from "@/types";

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex w-full animate-fade-up justify-end py-1">
        <div className="max-w-[72%]">
          <div className="rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-[14px] leading-relaxed text-background">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  const blocks = message.blocks;
  const hasBlocks = blocks && blocks.length > 0;
  const isStreaming = !!message.streaming;
  const lastBlockIsText = hasBlocks && blocks[blocks.length - 1].type === "text";

  return (
    <div className="flex w-full animate-fade-up justify-start py-1">
      <div className="flex max-w-[85%] gap-3">
        {/* Avatar */}
        <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/[0.05] ring-1 ring-border/50">
          <span className="text-[9px] font-bold tracking-tight text-foreground/40">
            R
          </span>
        </div>

        {/* Content blocks in order */}
        <div className="min-w-0 flex-1 space-y-2">
          {hasBlocks ? (
            blocks.map((block, i) => {
              if (block.type === "text" && block.text) {
                const isLast = i === blocks.length - 1;
                return (
                  <div key={i} className="text-[14px] leading-[1.7] text-foreground">
                    <Streamdown
                      animated={{ animation: "fadeIn", duration: 100, sep: "word" }}
                      isAnimating={isStreaming && isLast}
                      caret={isStreaming && isLast ? "block" : undefined}
                    >
                      {block.text}
                    </Streamdown>
                  </div>
                );
              }
              if (block.type === "tool") {
                return (
                  <ToolCallCard key={block.toolCall.id} toolCall={block.toolCall} />
                );
              }
              return null;
            })
          ) : isStreaming ? (
            <div className="flex items-center gap-2 py-1">
              <span className="thinking-shimmer text-[13px] font-medium">
                Thinking...
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

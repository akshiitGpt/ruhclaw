import { Streamdown } from "streamdown";
import { ToolCallCard } from "./ToolCallCard";
import type { Message } from "@/types";

export function ChatMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end py-1 animate-fade-up">
        <div className="max-w-[65%] rounded-2xl rounded-br-sm bg-foreground px-3.5 py-2 text-[13.5px] leading-relaxed text-background">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  }

  const { blocks, streaming } = message;
  const hasBlocks = blocks?.length > 0;

  return (
    <div className="py-1 animate-fade-up">
      <div className="flex gap-2.5 max-w-[85%]">
        <div className="mt-1 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-foreground/[0.06] to-foreground/[0.03]">
          <span className="text-[7px] font-bold text-foreground/25">R</span>
        </div>
        <div className="min-w-0 flex-1">
          {hasBlocks ? blocks.map((block, i) => {
            if (block.type === "text" && block.text) {
              const last = i === blocks.length - 1;
              return (
                <div key={i}>
                  <Streamdown
                    animated={{ animation: "fadeIn", duration: 70, sep: "word" }}
                    isAnimating={!!streaming && last}
                    caret={streaming && last ? "block" : undefined}
                  >
                    {block.text}
                  </Streamdown>
                </div>
              );
            }
            if (block.type === "tool") {
              return <ToolCallCard key={block.toolCall.id} toolCall={block.toolCall} />;
            }
            return null;
          }) : streaming ? (
            <span className="thinking-shimmer text-[12px] font-medium">Thinking...</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

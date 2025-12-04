import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Bot, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: Message;
  index: number;
}

export function ChatMessage({ message, index }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn("flex gap-4 w-full", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
      )}

      <div className={cn("max-w-[75%]", isUser ? "order-first" : "")}>
        {isUser ? (
          <div className="px-5 py-3 rounded-2xl rounded-br-md bg-muted/50 border border-border/50">
            <p className="text-foreground/90 text-sm leading-relaxed">
              {message.content}
            </p>
          </div>
        ) : (
          <GlassPanel
            variant="prominent"
            tiltEnabled={false}
            className="px-5 py-4"
          >
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-primary cursor-blink" />
              )}
            </p>
          </GlassPanel>
        )}
        <p className={cn(
          "text-xs text-muted-foreground mt-1.5",
          isUser ? "text-right" : "text-left"
        )}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-secondary border border-border/50 flex items-center justify-center">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
}

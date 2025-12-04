import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Slash, Workflow, Bot, Quote, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/ui/GlassPanel";

interface Command {
  name: string;
  description: string;
  icon: React.ElementType;
}

const commands: Command[] = [
  { name: "workflow", description: "Open workflow builder", icon: Workflow },
  { name: "model", description: "Select AI model", icon: Bot },
  { name: "quote", description: "Quote a message", icon: Quote },
  { name: "settings", description: "Open settings", icon: Settings },
];

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredCommands = input.startsWith("/")
    ? commands.filter((cmd) =>
        cmd.name.toLowerCase().startsWith(input.slice(1).toLowerCase())
      )
    : [];

  useEffect(() => {
    if (input.startsWith("/") && filteredCommands.length > 0) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }
    setSelectedCommand(0);
  }, [input, filteredCommands.length]);

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
    setShowCommands(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showCommands) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCommand((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCommand((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (filteredCommands[selectedCommand]) {
          setInput(`/${filteredCommands[selectedCommand].name} `);
          setShowCommands(false);
        }
      } else if (e.key === "Escape") {
        setShowCommands(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Command Autocomplete Menu */}
      <AnimatePresence>
        {showCommands && filteredCommands.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 right-0 mb-2 z-50"
          >
            <GlassPanel className="p-2 overflow-hidden">
              {filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.name}
                    onClick={() => {
                      setInput(`/${cmd.name} `);
                      setShowCommands(false);
                      textareaRef.current?.focus();
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                      index === selectedCommand
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded-md",
                      index === selectedCommand ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-medium text-sm">/{cmd.name}</span>
                      <p className="text-xs text-muted-foreground">{cmd.description}</p>
                    </div>
                  </button>
                );
              })}
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <GlassPanel className="flex items-end gap-3 p-3 pr-3">
        <div className="flex-shrink-0 p-2 text-muted-foreground">
          <Slash className="w-5 h-5" />
        </div>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message UAOL or type / for commands..."
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground",
            "text-sm leading-relaxed py-2",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
          className={cn(
            "flex-shrink-0 p-3 rounded-xl transition-all duration-200",
            input.trim()
              ? "bg-primary text-primary-foreground shadow-aurora"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </GlassPanel>

      {/* Hint */}
      <p className="text-center text-xs text-muted-foreground mt-3">
        Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">/</kbd> for commands
        <span className="mx-2">•</span>
        <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">Enter</kbd> to send
      </p>
    </div>
  );
}

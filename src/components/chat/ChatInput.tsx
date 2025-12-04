import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Slash, Workflow, Bot, Quote, Settings, Mic, MicOff, Volume2, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";

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
  onSend: (message: string, files?: File[]) => void;
  onVoiceTranscribe?: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onVoiceTranscribe, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isRecording, startRecording, stopRecording, error: recorderError } = useVoiceRecorder();

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
    if ((!input.trim() && selectedFiles.length === 0) || disabled) return;
    onSend(input.trim(), selectedFiles.length > 0 ? selectedFiles : undefined);
    setInput("");
    setSelectedFiles([]);
    setShowCommands(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
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

  const handleVoiceRecord = async () => {
    if (isRecording) {
      // Stop recording and transcribe
      setIsTranscribing(true);
      const audioBlob = await stopRecording();
      
      if (audioBlob && onVoiceTranscribe) {
        try {
          const { apiClient } = await import('@/lib/api/client');
          const response = await apiClient.transcribeAudio(audioBlob);
          
          if (response.success && response.data?.text) {
            const transcribedText = response.data.text;
            onVoiceTranscribe(transcribedText);
            setInput(transcribedText);
          } else {
            console.error('Transcription failed:', response.error);
            alert('Failed to transcribe audio. Please try again.');
          }
        } catch (error) {
          console.error('Transcription error:', error);
          alert('Failed to transcribe audio. Please try again.');
        }
      }
      setIsTranscribing(false);
    } else {
      // Start recording
      await startRecording();
    }
  };

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

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm"
            >
              <Paperclip className="w-3.5 h-3.5 text-primary" />
              <span className="text-foreground truncate max-w-[200px]">{file.name}</span>
              <span className="text-muted-foreground text-xs">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
              <button
                onClick={() => removeFile(index)}
                className="ml-1 p-0.5 hover:bg-primary/20 rounded transition-colors"
                title="Remove file"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <GlassPanel className="flex items-end gap-3 p-3 pr-3">
        <div className="flex-shrink-0 p-2 text-muted-foreground">
          <Slash className="w-5 h-5" />
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls,.json,.xml,.jpg,.jpeg,.png,.gif,.webp"
        />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedFiles.length > 0 ? "Add a message (optional)..." : "Message UAOL or type / for commands..."}
          disabled={disabled || isTranscribing}
          rows={1}
          className={cn(
            "flex-1 bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground",
            "text-sm leading-relaxed py-2",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />

        {/* Upload Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleUploadClick}
          disabled={disabled || isTranscribing}
          className={cn(
            "flex-shrink-0 p-3 rounded-xl transition-all duration-200",
            selectedFiles.length > 0
              ? "bg-primary/20 text-primary"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
          title="Upload files"
        >
          <Paperclip className="w-5 h-5" />
        </motion.button>

        {/* Voice Record Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleVoiceRecord}
          disabled={disabled || isTranscribing}
          className={cn(
            "flex-shrink-0 p-3 rounded-xl transition-all duration-200",
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : isTranscribing
              ? "bg-muted text-muted-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
          title={isRecording ? "Stop recording" : "Start voice recording"}
        >
          {isRecording ? (
            <MicOff className="w-5 h-5" />
          ) : isTranscribing ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={(!input.trim() && selectedFiles.length === 0) || disabled || isTranscribing}
          className={cn(
            "flex-shrink-0 p-3 rounded-xl transition-all duration-200",
            (input.trim() || selectedFiles.length > 0) && !isTranscribing
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
        <span className="mx-2">•</span>
        Click <Paperclip className="w-3 h-3 inline" /> to upload files
      </p>
    </div>
  );
}

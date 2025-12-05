import { motion, AnimatePresence } from "framer-motion";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Bot, User, FileText, Eye, MessageSquare, X, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { useState } from "react";

export interface UploadedFile {
  fileId: string;
  filename: string;
  size: number;
  url: string;
  extractedText?: string;
  metadata?: {
    pages?: number;
    rowCount?: number;
    type?: string;
    [key: string]: any;
  };
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  files?: UploadedFile[]; // Files attached to this message
}

interface ChatMessageProps {
  message: Message;
  index: number;
  onAskAboutDocument?: (file: UploadedFile) => void;
}

export function ChatMessage({ message, index, onAskAboutDocument }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn("flex gap-4 w-full", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="flex-shrink-0 flex items-center justify-center">
          <img src={logo} alt="UAOL Logo" className="w-10 h-10 object-contain" />
        </div>
      )}

      <div className={cn("max-w-[75%]", isUser ? "order-first" : "")}>
        {isUser ? (
          <div className="space-y-2">
            {/* File thumbnails */}
            {message.files && message.files.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.files.map((file) => {
                  const isPDF = file.filename.toLowerCase().endsWith('.pdf');
                  const isExpanded = expandedFile === file.fileId;
                  
                  return (
                    <div key={file.fileId} className="relative group">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "relative overflow-hidden rounded-lg border-2 transition-all cursor-pointer",
                          isPDF 
                            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                            : "bg-muted/50 border-primary/20",
                          isExpanded && "ring-2 ring-primary"
                        )}
                        onClick={() => setExpandedFile(isExpanded ? null : file.fileId)}
                      >
                        {/* Thumbnail */}
                        <div className="w-16 h-16 flex flex-col items-center justify-center p-2">
                          {isPDF ? (
                            <FileText className="w-6 h-6 text-red-500" />
                          ) : (
                            <Paperclip className="w-6 h-6 text-primary" />
                          )}
                          <span className="text-[10px] font-medium text-foreground text-center line-clamp-1 mt-1">
                            {file.filename}
                          </span>
                        </div>
                        
                        {/* File info overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1">
                          <p className="text-[10px] text-white truncate leading-tight">{file.filename}</p>
                          <p className="text-[10px] text-white/80 leading-tight">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </motion.div>
                      
                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="absolute top-full left-0 mt-2 z-50 w-80"
                          >
                            <GlassPanel className="p-4 space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-sm text-foreground">{file.filename}</h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {(file.size / 1024).toFixed(1)} KB
                                    {file.metadata?.pages && ` • ${file.metadata.pages} pages`}
                                    {file.metadata?.rowCount && ` • ${file.metadata.rowCount} rows`}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedFile(null);
                                  }}
                                  className="p-1 hover:bg-muted rounded"
                                >
                                  <X className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </div>
                              
                              {file.extractedText && (
                                <div className="space-y-2">
                                  <div className="text-xs text-muted-foreground line-clamp-3">
                                    {file.extractedText.substring(0, 200)}
                                    {file.extractedText.length > 200 && '...'}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onAskAboutDocument) {
                                          onAskAboutDocument(file);
                                        }
                                        setExpandedFile(null);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      Ask about this
                                    </button>
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center justify-center gap-2 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      View
                                    </a>
                                  </div>
                                </div>
                              )}
                            </GlassPanel>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Message content */}
            {message.content && (
              <div className="px-5 py-3 rounded-2xl rounded-br-md bg-muted/50 border border-border/50">
                <p className="text-foreground/90 text-sm leading-relaxed">
                  {message.content}
                </p>
              </div>
            )}
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

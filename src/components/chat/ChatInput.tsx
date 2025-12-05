import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Slash, Workflow, Bot, Quote, Settings, Mic, MicOff, Volume2, Paperclip, X, Key, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { generatePDFThumbnail } from "@/lib/pdf-thumbnail";

interface Command {
  name: string;
  description: string;
  icon: React.ElementType;
}

const commands: Command[] = [
  { name: "workflow", description: "Open workflow builder", icon: Workflow },
  { name: "model", description: "Select AI model", icon: Bot },
  { name: "quote", description: "Quote a message", icon: Quote },
  { name: "settings", description: "Open API key settings", icon: Settings },
  { name: "register", description: "Register with email", icon: User },
  { name: "login", description: "Login with email", icon: User },
  { name: "setkey", description: "Set API key", icon: Key },
  { name: "keys", description: "View API keys", icon: Key },
  { name: "default", description: "Set default provider", icon: Bot },
  { name: "provider", description: "Use provider for next message", icon: Bot },
];

interface ChatInputProps {
  onSend: (message: string, files?: File[], provider?: 'openai' | 'gemini' | 'claude') => void;
  onVoiceTranscribe?: (text: string) => void;
  disabled?: boolean;
  onOpenSettings?: () => void;
}

interface FileWithPreview {
  file: File;
  preview?: string; // Base64 thumbnail for PDFs/images
  type: 'pdf' | 'image' | 'other';
  loading?: boolean; // Loading state for thumbnail generation
}

export function ChatInput({ onSend, onVoiceTranscribe, disabled, onOpenSettings }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filesWithPreview, setFilesWithPreview] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
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
    
    // Handle authentication commands
    const trimmed = input.trim();
    if (trimmed.startsWith('/register ')) {
      const email = trimmed.substring('/register '.length).trim();
      if (email) {
        handleRegister(email);
        setInput('');
        return;
      } else {
        alert('Usage: /register your@email.com');
        return;
      }
    } else if (trimmed.startsWith('/login ')) {
      const parts = trimmed.substring('/login '.length).trim().split(' ');
      const email = parts[0];
      if (email) {
        handleLogin(email);
        setInput('');
        return;
      } else {
        alert('Usage: /login your@email.com');
        return;
      }
    }
    
    // Handle API key commands
    if (trimmed.startsWith('/setkey ')) {
      const parts = trimmed.split(' ');
      if (parts.length >= 3) {
        const provider = parts[1] as 'openai' | 'gemini' | 'claude';
        const apiKey = parts.slice(2).join(' ');
        if (['openai', 'gemini', 'claude'].includes(provider)) {
          handleSetKey(provider, apiKey);
          setInput('');
          return;
        }
      }
    } else if (trimmed === '/keys') {
      handleListKeys();
      setInput('');
      return;
    } else if (trimmed.startsWith('/default ')) {
      const parts = trimmed.split(' ');
      if (parts.length === 2 && ['openai', 'gemini', 'claude'].includes(parts[1])) {
        handleSetDefault(parts[1] as 'openai' | 'gemini' | 'claude');
        setInput('');
        return;
      }
    }
    
    // Extract provider from /provider command
    let provider: 'openai' | 'gemini' | 'claude' | undefined;
    let message = trimmed;
    if (trimmed.startsWith('/provider ')) {
      const parts = trimmed.split(' ');
      if (parts.length >= 2 && ['openai', 'gemini', 'claude'].includes(parts[1])) {
        provider = parts[1] as 'openai' | 'gemini' | 'claude';
        message = parts.slice(2).join(' ');
      }
    }
    
    onSend(message, selectedFiles.length > 0 ? selectedFiles : undefined, provider);
    setInput("");
    setSelectedFiles([]);
    setFilesWithPreview([]);
    setShowCommands(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRegister = async (email: string) => {
    try {
      const { apiClient } = await import('@/lib/api/client');
      const response = await apiClient.register(email);
      if (response.success && response.data) {
        apiClient.setToken(response.data.token);
        alert(`✅ Registration successful!\n\nYour API key: ${response.data.apiKey}\n\nYou can now set your AI provider API keys using /settings or /setkey commands.`);
        // Refresh the page to update auth state
        window.location.reload();
      } else {
        alert(`Failed to register: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to register'}`);
    }
  };

  const handleLogin = async (email: string) => {
    try {
      const { apiClient } = await import('@/lib/api/client');
      const response = await apiClient.login(email);
      if (response.success && response.data?.token) {
        apiClient.setToken(response.data.token);
        alert('✅ Login successful! You can now manage your API keys.');
        // Refresh the page to update auth state
        window.location.reload();
      } else {
        alert(`Failed to login: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to login'}`);
    }
  };

  const handleSetKey = async (provider: 'openai' | 'gemini' | 'claude', apiKey: string) => {
    try {
      const { apiClient } = await import('@/lib/api/client');
      const response = await apiClient.setApiKey(provider, apiKey);
      if (response.success) {
        alert(`${provider} API key saved successfully!`);
      } else {
        if (response.error?.message?.includes('UNAUTHORIZED') || response.error?.message?.includes('Authentication required')) {
          alert(`❌ You need to register/login first!\n\nUse:\n/register your@email.com\nor\n/login your@email.com\n\nThen you can set your API keys.`);
        } else {
          alert(`Failed to save API key: ${response.error?.message || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to save API key'}`);
    }
  };

  const handleListKeys = async () => {
    try {
      const { apiClient } = await import('@/lib/api/client');
      const response = await apiClient.getApiKeys();
      if (response.success && response.data) {
        const keysList = response.data.map(k => 
          `${k.provider}${k.isDefault ? ' (default)' : ''}: ${k.maskedKey || '***'}`
        ).join('\n');
        alert(keysList || 'No API keys set. Use /setkey <provider> <key> to set one.');
      }
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to load API keys'}`);
    }
  };

  const handleSetDefault = async (provider: 'openai' | 'gemini' | 'claude') => {
    try {
      const { apiClient } = await import('@/lib/api/client');
      const response = await apiClient.setDefaultProvider(provider);
      if (response.success) {
        alert(`${provider} set as default provider!`);
      } else {
        alert(`Failed to set default: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to set default provider'}`);
    }
  };

  // Generate preview for files (PDFs and images)
  const generatePreview = async (file: File): Promise<FileWithPreview> => {
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    
    if (isPDF) {
      // Generate PDF thumbnail using pdf.js
      try {
        const thumbnail = await generatePDFThumbnail(file);
        return {
          file,
          type: 'pdf',
          preview: thumbnail || undefined,
          loading: false
        };
      } catch (error) {
        console.error('Failed to generate PDF thumbnail:', error);
        return {
          file,
          type: 'pdf',
          loading: false
        };
      }
    } else if (isImage) {
      // For images, create a thumbnail
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            file,
            type: 'image',
            preview: e.target?.result as string,
            loading: false
          });
        };
        reader.onerror = () => {
          resolve({ file, type: 'image', loading: false });
        };
        reader.readAsDataURL(file);
      });
    } else {
      return { file, type: 'other', loading: false };
    }
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    // Add files immediately
    setSelectedFiles((prev) => [...prev, ...files]);
    
    // Generate previews for all files
    const previews: FileWithPreview[] = [];
    for (const file of files) {
      const preview = await generatePreview(file);
      previews.push(preview);
    }
    
    // Update all previews at once
    setFilesWithPreview((prev) => [...prev, ...previews]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilesWithPreview((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
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
          const cmd = filteredCommands[selectedCommand].name;
          if (cmd === 'settings' && onOpenSettings) {
            onOpenSettings();
            setInput('');
            setShowCommands(false);
          } else {
            setInput(`/${cmd} `);
            setShowCommands(false);
          }
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
    <div 
      ref={dropZoneRef}
      className={cn(
        "relative w-full max-w-4xl mx-auto",
        isDragging && "ring-2 ring-primary ring-offset-2 rounded-xl"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
                      if (cmd.name === 'settings' && onOpenSettings) {
                        onOpenSettings();
                        setInput('');
                        setShowCommands(false);
                      } else {
                        setInput(`/${cmd.name} `);
                        setShowCommands(false);
                        textareaRef.current?.focus();
                      }
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

      {/* Drag Overlay */}
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm rounded-xl border-2 border-dashed border-primary flex items-center justify-center"
        >
          <div className="text-center">
            <Paperclip className="w-12 h-12 text-primary mx-auto mb-2" />
            <p className="text-lg font-medium text-foreground">Drop files here to upload</p>
            <p className="text-sm text-muted-foreground mt-1">PDFs, images, documents</p>
          </div>
        </motion.div>
      )}

      {/* Selected Files Preview with Thumbnails */}
      {filesWithPreview.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-3">
            {filesWithPreview.map((fileWithPreview, index) => {
              const { file, preview, type, loading = false } = fileWithPreview;
              const isPDF = type === 'pdf';
              const isImage = type === 'image';
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group"
                >
                  <div className={cn(
                    "relative overflow-hidden rounded-lg border-2 transition-all",
                    isPDF 
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                      : isImage
                      ? "bg-muted/50 border-primary/20"
                      : "bg-muted/30 border-muted"
                  )}>
                    {/* Thumbnail */}
                    {isImage && preview ? (
                      <div className="w-16 h-16 flex items-center justify-center">
                        <img 
                          src={preview} 
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : isPDF ? (
                      loading ? (
                        <div className="w-16 h-20 flex flex-col items-center justify-center p-2 bg-muted/30">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mb-1" />
                          <span className="text-[10px] text-muted-foreground">Loading...</span>
                        </div>
                      ) : preview ? (
                        <div className="w-16 h-20 flex items-center justify-center bg-white dark:bg-gray-900">
                          <img 
                            src={preview} 
                            alt={file.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 flex flex-col items-center justify-center p-2">
                          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mb-1">
                            <FileText className="w-4 h-4 text-red-500" />
                          </div>
                          <span className="text-[10px] font-medium text-foreground text-center line-clamp-2">
                            {file.name}
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="w-16 h-16 flex flex-col items-center justify-center p-2">
                        <Paperclip className="w-4 h-4 text-muted-foreground mb-1" />
                        <span className="text-[10px] font-medium text-foreground text-center line-clamp-2">
                          {file.name}
                        </span>
                      </div>
                    )}
                    
                    {/* File info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1">
                      <p className="text-[10px] text-white truncate leading-tight">{file.name}</p>
                      <p className="text-[10px] text-white/80 leading-tight">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    
                    {/* Remove button */}
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 hover:bg-red-500 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove file"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
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
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChatMessage, Message } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { WorkflowResultCard, WorkflowResult } from "./WorkflowResultCard";
import { Sparkles, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";

const welcomeMessages: Message[] = [
  {
    id: "welcome-1",
    role: "assistant",
    content: `Welcome to UAOL — your Universal AI Orchestration Layer.

I can help you:
• Execute complex AI workflows with multiple models
• Analyze documents, code, and data
• Build and manage automated pipelines
• Connect to various AI services seamlessly

Type a message or use /workflow to open the Visual Workflow Builder.`,
    timestamp: new Date(),
  },
];

const sampleWorkflowResult: WorkflowResult = {
  id: "wf-1",
  name: "Document Analysis Pipeline",
  status: "success",
  duration: "2.3s",
  nodesExecuted: 4,
  totalNodes: 4,
  output: '{ "sentiment": "positive", "confidence": 0.94, "entities": [...] }',
};

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>(welcomeMessages);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isSpeaking, speak, stop: stopTTS } = useTextToSpeech();

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (content: string, files?: File[]) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: files && files.length > 0 
        ? `${content || ''}${content ? '\n\n' : ''}[${files.length} file(s) attached: ${files.map(f => f.name).join(', ')}]`
        : content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Handle file uploads if present
      if (files && files.length > 0) {
        try {
          const uploadResponse = await apiClient.uploadFiles(files);
          
          if (uploadResponse.success && uploadResponse.data) {
            const fileInfo = uploadResponse.data.files
              .map(f => `${f.filename} (${(f.size / 1024).toFixed(1)} KB)`)
              .join(', ');
            
            // Add file info to message content if not already included
            if (!content.includes('[file')) {
              content = `${content}\n\n[${files.length} file(s) uploaded: ${fileInfo}]`;
            }
            
            // If files have extracted text, include it in the AI context
            const extractedTexts = uploadResponse.data.files
              .filter(f => f.extractedText)
              .map(f => {
                const metadata = f.metadata || {};
                const metadataInfo = metadata.pages 
                  ? ` (${metadata.pages} pages)`
                  : metadata.rowCount 
                  ? ` (${metadata.rowCount} rows)`
                  : '';
                return `\n\n--- Document: ${f.filename}${metadataInfo} ---\n${f.extractedText}`;
              })
              .join('\n\n');
            
            if (extractedTexts) {
              content = `${content}\n\n[Document Content Extracted]${extractedTexts}`;
            } else {
              // If no text extracted, still mention the files
              const fileList = uploadResponse.data.files
                .map(f => `${f.filename} (${(f.size / 1024).toFixed(1)} KB)`)
                .join(', ');
              content = `${content}\n\n[Files attached: ${fileList} - content extraction not available for this file type]`;
            }
            
            console.log('Files uploaded successfully', { 
              fileCount: files.length,
              summary: uploadResponse.data.summary 
            });
          } else {
            console.error('File upload failed', uploadResponse.error);
            // Show error to user
            const errorMessage: Message = {
              id: `msg-${Date.now()}-upload-error`,
              role: "assistant",
              content: `Failed to upload files: ${uploadResponse.error?.message || 'Unknown error'}. Please try again.`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
            setIsProcessing(false);
            return; // Don't continue with chat if upload fails
          }
        } catch (error: any) {
          console.error('File upload error', error);
          // Show error to user
          const errorMessage: Message = {
            id: `msg-${Date.now()}-upload-error`,
            role: "assistant",
            content: `Failed to upload files: ${error.message || 'Network error'}. Please check your connection and try again.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsProcessing(false);
          return; // Don't continue with chat if upload fails
        }
      }

      // Check if it's a workflow command
      const isWorkflowCommand = content.toLowerCase().includes("/workflow") || content.toLowerCase().includes("workflow");
      
      if (isWorkflowCommand) {
        // TODO: Implement workflow creation via backend
        setShowWorkflow(true);
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: "I've prepared a workflow based on your request. Here's the execution result:",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Connect to backend chat API
        const response = await apiClient.sendChatMessage(content);
        
        if (response.success && response.data) {
          // Check if it's a placeholder response
          const messageText = response.data.message || response.data.response || "";
          const isPlaceholder = messageText.includes("To enable AI responses") || 
                                messageText.includes("I received your message");
          
          if (isPlaceholder) {
            console.warn("⚠️ Received placeholder response - API key may not be loaded");
          }
          
          const assistantMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: messageText,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          
          // Speak the response if TTS is enabled
          if (ttsEnabled && messageText) {
            speak(messageText);
          }
        } else {
          // Fallback response if API fails or returns error
          const errorMsg = response.error?.message || "Unable to process your message. Please check your connection.";
          const assistantMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: errorMsg,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message, index) => (
            <ChatMessage key={message.id} message={message} index={index} />
          ))}

          {showWorkflow && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 max-w-[75%]">
                <WorkflowResultCard
                  result={sampleWorkflowResult}
                  onViewDetails={() => console.log("Open VWB")}
                />
              </div>
            </motion.div>
          )}

          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div className="glass-panel px-5 py-4">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 pb-6 border-t border-border/30 bg-background/50 backdrop-blur-lg">
        <div className="relative">
          <ChatInput 
            onSend={handleSend} 
            onVoiceTranscribe={(text) => {
              // Auto-send transcribed text
              handleSend(text);
            }}
            disabled={isProcessing} 
          />
          
          {/* TTS Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (isSpeaking) {
                stopTTS();
              }
              setTtsEnabled(!ttsEnabled);
            }}
            className={cn(
              "absolute top-2 right-2 p-2 rounded-lg transition-all",
              ttsEnabled
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
            title={ttsEnabled ? "Disable text-to-speech" : "Enable text-to-speech"}
          >
            {isSpeaking ? (
              <Volume2 className="w-4 h-4 animate-pulse" />
            ) : ttsEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChatMessage, Message, UploadedFile } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { WorkflowResultCard, WorkflowResult } from "./WorkflowResultCard";
import { ApiKeySettings } from "./ApiKeySettings";
import { Volume2, VolumeX } from "lucide-react";
import logo from "@/assets/logo.png";

// Fallback if logo fails to load
const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.style.display = 'none';
};
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
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'gemini' | 'claude' | undefined>(undefined);
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

  const handleSend = async (content: string, files?: File[], provider?: 'openai' | 'gemini' | 'claude') => {
    let uploadedFiles: UploadedFile[] = [];
    
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: files && files.length > 0 
        ? `${content || ''}${content ? '\n\n' : ''}[${files.length} file(s) attached: ${files.map(f => f.name).join(', ')}]`
        : content,
      timestamp: new Date(),
      files: uploadedFiles,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Handle file uploads if present
      if (files && files.length > 0) {
        try {
          const uploadResponse = await apiClient.uploadFiles(files);
          
          if (uploadResponse.success && uploadResponse.data) {
            // Store uploaded file info
            uploadedFiles = uploadResponse.data.files.map(f => ({
              fileId: f.fileId,
              filename: f.filename,
              size: f.size,
              url: f.url,
              extractedText: f.extractedText,
              metadata: f.metadata,
            }));
            
            // Update user message with file info
            setMessages((prev) => prev.map(msg => 
              msg.id === userMessage.id 
                ? { ...msg, files: uploadedFiles }
                : msg
            ));
            
            const fileInfo = uploadResponse.data.files
              .map(f => `${f.filename} (${(f.size / 1024).toFixed(1)} KB)`)
              .join(', ');
            
            // If no user message, automatically request summary for PDFs
            const hasPDFs = uploadedFiles.some(f => f.filename.toLowerCase().endsWith('.pdf'));
            const hasExtractedText = uploadedFiles.some(f => f.extractedText && f.extractedText.length > 0);
            
            if (!content.trim() && hasPDFs && hasExtractedText) {
              // Auto-generate summary for PDFs
              content = "Please provide a summary of the uploaded document(s), including key points, main topics, and any important details.";
            }
            
            // Add file info to message content if not already included
            if (!content.includes('[file')) {
              content = `${content}${content ? '\n\n' : ''}[${files.length} file(s) uploaded: ${fileInfo}]`;
            }
            
            // If files have extracted text, include it in the AI context
            const filesWithText = uploadResponse.data.files.filter(f => f.extractedText && f.extractedText.length > 0);
            const filesWithoutText = uploadResponse.data.files.filter(f => !f.extractedText || f.extractedText.length === 0);
            
            if (filesWithText.length > 0) {
              const extractedTexts = filesWithText
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
              
              content = `${content}\n\n[Document Content Extracted]${extractedTexts}`;
            }
            
            // Handle files without extracted text
            if (filesWithoutText.length > 0) {
              const pdfFiles = filesWithoutText.filter(f => f.filename.toLowerCase().endsWith('.pdf'));
              const otherFiles = filesWithoutText.filter(f => !f.filename.toLowerCase().endsWith('.pdf'));
              
              if (pdfFiles.length > 0) {
                // Check if extraction failed due to error
                const hasExtractionError = pdfFiles.some(f => f.metadata?.extractionFailed);
                const errorMessage = hasExtractionError 
                  ? "Text extraction failed due to a processing error. This may be a scanned PDF requiring OCR, an encrypted PDF, or an unsupported format."
                  : "Text extraction was not successful. This PDF may be image-based (scanned) and require OCR processing.";
                
                const fileList = pdfFiles.map(f => `${f.filename} (${(f.size / 1024).toFixed(1)} KB)`).join(', ');
                content = `${content}\n\n[PDF files uploaded but text extraction failed: ${fileList}]\n\n${errorMessage}\n\nYou can:\n- Try OCR processing if enabled (for scanned PDFs)\n- Ask me to analyze the file if OCR is available\n- Provide the text content manually if needed`;
              }
              
              if (otherFiles.length > 0) {
                const fileList = otherFiles.map(f => `${f.filename} (${(f.size / 1024).toFixed(1)} KB)`).join(', ');
                content = `${content}\n\n[Files attached: ${fileList} - content extraction not available for this file type]`;
              }
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
        const response = await apiClient.sendChatMessage(content, undefined, provider || selectedProvider);
        
        if (response.success && response.data) {
          // Check if it's a placeholder response
          const messageText = response.data.message || response.data.response || "";
          const isPlaceholder = messageText.includes("To enable AI responses") || 
                                (messageText.includes("I received your message") && 
                                 !messageText.includes("However, there was an error"));
          
          if (isPlaceholder) {
            console.warn("⚠️ Received placeholder response - API key may not be loaded", {
              message: messageText.substring(0, 200),
              fullResponse: response.data
            });
            
            // Show a helpful message to guide users to set their API key
            const assistantMessage: Message = {
              id: `msg-${Date.now()}-assistant`,
              role: "assistant",
              content: `${messageText}\n\n💡 **Tip:** To use AI features, please configure your API key:\n1. Click the Settings icon (⚙️) in the top right\n2. Go to "API Keys" section\n3. Add your OpenAI API key\n4. Set it as default\n\nYou can get an API key from https://platform.openai.com/api-keys`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsProcessing(false);
            return;
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
            <ChatMessage 
              key={message.id} 
              message={message} 
              index={index}
              onAskAboutDocument={async (file) => {
                // Create a question prompt about the document
                const questionContent = `Please provide a detailed summary and analysis of the document "${file.filename}". Include key points, main topics, and important details.\n\n--- Document: ${file.filename}${file.metadata?.pages ? ` (${file.metadata.pages} pages)` : ''} ---\n${file.extractedText || 'No text extracted from this document.'}`;
                
                // Add user message
                const questionMessage: Message = {
                  id: `msg-${Date.now()}`,
                  role: "user",
                  content: `Ask about: ${file.filename}`,
                  timestamp: new Date(),
                  files: [file],
                };
                setMessages((prev) => [...prev, questionMessage]);
                setIsProcessing(true);
                
                try {
                  // Send to AI with document context
                  const response = await apiClient.sendChatMessage(questionContent, undefined, selectedProvider);
                  
                  if (response.success && response.data) {
                    const assistantMessage: Message = {
                      id: `msg-${Date.now()}-assistant`,
                      role: "assistant",
                      content: response.data.response || response.data.message || "I've analyzed the document. How can I help you with it?",
                      timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                  }
                } catch (error: any) {
                  console.error('Error asking about document:', error);
                } finally {
                  setIsProcessing(false);
                }
              }}
            />
          ))}

          {showWorkflow && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0 flex items-center justify-center">
                <img 
                  src={logo} 
                  alt="UAOL Logo" 
                  className="w-10 h-10 object-contain"
                  onError={handleLogoError}
                />
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
              <div className="flex-shrink-0 flex items-center justify-center">
                <img 
                  src={logo} 
                  alt="UAOL Logo" 
                  className="w-10 h-10 object-contain animate-pulse"
                  onError={handleLogoError}
                />
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

      {/* Provider Selector */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 border-t border-border/10 bg-transparent">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Provider:</span>
          <div className="flex gap-1">
            {(['openai', 'gemini', 'claude'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedProvider(selectedProvider === p ? undefined : p)}
                className={cn(
                  "px-3 py-1 text-xs rounded-md transition-colors",
                  selectedProvider === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
            {selectedProvider && (
              <button
                onClick={() => setSelectedProvider(undefined)}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 pb-6 border-t border-border/10 bg-transparent">
        <div className="relative">
          <ChatInput 
            onSend={handleSend} 
            onVoiceTranscribe={(text) => {
              // Auto-send transcribed text
              handleSend(text);
            }}
            disabled={isProcessing}
            onOpenSettings={() => setShowSettings(true)}
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

      {/* API Key Settings Modal */}
      <ApiKeySettings open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}

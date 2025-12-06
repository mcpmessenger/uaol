import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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

**Get Started:**
• Click "Workflows" in the navigation bar to open the Visual Workflow Builder
• Or type \`/workflow\` here to navigate to the builder
• Upload documents to analyze them with AI
• Ask me anything about your data or workflows`,
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
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(welcomeMessages);
  const [isProcessing, setIsProcessing] = useState(false);
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
            
            // If no user message, automatically request summary and next steps for documents
            const hasPDFs = uploadedFiles.some(f => f.filename.toLowerCase().endsWith('.pdf'));
            const hasDocuments = uploadedFiles.some(f => {
              const ext = f.filename.toLowerCase();
              return ext.endsWith('.pdf') || ext.endsWith('.docx') || ext.endsWith('.doc') || 
                     ext.endsWith('.txt') || ext.endsWith('.md');
            });
            const hasExtractedText = uploadedFiles.some(f => f.extractedText && f.extractedText.length > 0);
            
            if (!content.trim() && hasDocuments && hasExtractedText) {
              // Auto-generate comprehensive prompt for document analysis
              const fileNames = uploadedFiles.map(f => f.filename).join(', ');
              content = `I've uploaded the following document(s): ${fileNames}

Please:
1. Provide a comprehensive summary of the document(s), including:
   - Key points and main topics
   - Important details and findings
   - Any notable patterns or insights

2. After the summary, suggest what I can do next with this document, such as:
   - Analyzing specific sections
   - Extracting particular information
   - Creating workflows based on the content
   - Answering questions about the document

The document content has been extracted and is included below.`;
            } else if (!content.trim() && hasDocuments && !hasExtractedText) {
              // Document uploaded but text extraction failed
              const fileNames = uploadedFiles.map(f => f.filename).join(', ');
              content = `I've uploaded the following document(s): ${fileNames}, but text extraction was not successful.

Please help me understand:
1. Why the text extraction might have failed
2. What I can do to work with this document
3. Alternative approaches to analyze the document`;
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
                const failedFiles = pdfFiles.filter(f => f.metadata?.extractionFailed);
                const errorDetails = failedFiles.map(f => {
                  const error = f.metadata?.extractionError || 'Unknown error';
                  const errorType = f.metadata?.errorType || 'Unknown';
                  const details = f.metadata?.errorDetails || {};
                  
                  let specificMessage = '';
                  if (details.isCorrupted) {
                    specificMessage = 'The PDF file appears to be corrupted or invalid.';
                  } else if (details.isTimeout) {
                    specificMessage = 'PDF parsing timed out (file may be too complex).';
                  } else if (details.isTooLarge) {
                    specificMessage = 'PDF file is too large (max 50MB).';
                  } else if (details.isDOMMatrixError) {
                    specificMessage = 'PDF parsing library initialization error.';
                  } else if (details.isImportError) {
                    specificMessage = 'PDF parsing library not available.';
                  } else if (error.includes('OCR') || error.includes('scanned')) {
                    specificMessage = 'This appears to be a scanned PDF (image-based). OCR may be needed.';
                  } else {
                    specificMessage = `Extraction error: ${error.substring(0, 100)}`;
                  }
                  
                  return `${f.filename}: ${specificMessage}`;
                }).join('\n');
                
                const fileList = pdfFiles.map(f => `${f.filename} (${(f.size / 1024).toFixed(1)} KB)`).join(', ');
                const generalMessage = failedFiles.length > 0
                  ? `\n\n[PDF files uploaded but text extraction failed: ${fileList}]\n\n${errorDetails}\n\nPossible solutions:\n- If this is a scanned PDF, OCR processing may help (if enabled)\n- Check if the PDF is encrypted or password-protected\n- Verify the PDF file is not corrupted\n- Try a different PDF file or provide the text content manually`
                  : `\n\n[PDF files uploaded: ${fileList} - text extraction was not successful. This may be a scanned PDF requiring OCR processing.]`;
                
                content = `${content}${generalMessage}`;
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

      // Check if it's a workflow command (but don't navigate if files were just uploaded)
      // Only navigate to workflow if it's an explicit command without file uploads
      const isWorkflowCommand = content.toLowerCase().includes("/workflow") || 
                               (content.toLowerCase().includes("workflow") && !content.toLowerCase().includes("uploaded"));
      
      if (isWorkflowCommand && (!files || files.length === 0)) {
        navigate('/workflow');
        setIsProcessing(false);
        return;
      }
      
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

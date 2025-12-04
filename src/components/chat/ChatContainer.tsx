import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChatMessage, Message } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { WorkflowResultCard, WorkflowResult } from "./WorkflowResultCard";
import { Sparkles } from "lucide-react";

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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    // Simulate AI response
    setTimeout(() => {
      const isWorkflowCommand = content.toLowerCase().includes("/workflow") || content.toLowerCase().includes("workflow");
      
      if (isWorkflowCommand) {
        setShowWorkflow(true);
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: isWorkflowCommand
          ? "I've prepared a workflow based on your request. Here's the execution result:"
          : `I understand you're asking about "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}". Let me help you with that.

This is a demonstration of the UAOL chat interface. In the full implementation, this would connect to your configured AI models and execute complex orchestration workflows.`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsProcessing(false);
    }, 1500);
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
        <ChatInput onSend={handleSend} disabled={isProcessing} />
      </div>
    </div>
  );
}

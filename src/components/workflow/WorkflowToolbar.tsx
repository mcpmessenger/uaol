import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileUp,
  FileText,
  Database,
  Search,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Plug,
  Loader2,
  GitBranch,
  Repeat,
} from 'lucide-react';
import { WorkflowNode } from './WorkflowBuilder';
import { apiClient } from '@/lib/api/client';

interface WorkflowToolbarProps {
  onAddNode: (type: WorkflowNode['type'], position: { x: number; y: number }) => void;
  onAddMCPTool?: (toolId: string, method: string, toolName: string) => void;
}

interface MCPTool {
  tool_id: string;
  name: string;
  gateway_url: string;
  protocol: 'json-rpc' | 'rest';
  status: string;
}

interface MCPToolMethod {
  name: string;
  description?: string;
  inputSchema?: any;
}

const nodeTypes: Array<{ type: WorkflowNode['type']; label: string; icon: any; description: string }> = [
  {
    type: 'file-upload',
    label: 'Upload Document',
    icon: FileUp,
    description: 'Upload PDF, DOCX, or text files',
  },
  {
    type: 'text-extraction',
    label: 'Extract Text',
    icon: FileText,
    description: 'Extract text from documents',
  },
  {
    type: 'rag-indexing',
    label: 'Index for RAG',
    icon: Database,
    description: 'Index document chunks for RAG',
  },
  {
    type: 'rag-query',
    label: 'Query RAG',
    icon: Search,
    description: 'Query indexed documents',
  },
  {
    type: 'ai-generation',
    label: 'AI Generation',
    icon: Sparkles,
    description: 'Generate content with AI',
  },
  {
    type: 'condition',
    label: 'Conditional (if/else)',
    icon: GitBranch,
    description: 'Evaluate a boolean and route later steps',
  },
  {
    type: 'loop',
    label: 'Loop (for-each)',
    icon: Repeat,
    description: 'Iterate over a list and pass items forward',
  },
];

export function WorkflowToolbar({ onAddNode, onAddMCPTool }: WorkflowToolbarProps) {
  const [open, setOpen] = useState(false);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [toolMethods, setToolMethods] = useState<Record<string, MCPToolMethod[]>>({});
  const [loadingMethods, setLoadingMethods] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      // Always reload when opening to get latest tools
      loadMCPTools();
    }
  }, [open]);

  const loadMCPTools = async () => {
    try {
      setLoadingTools(true);
      setError(null);
      console.log('[WorkflowToolbar] Loading MCP tools...');
      const response = await apiClient.listTools();
      console.log('[WorkflowToolbar] Tools response:', response);
      
      if (response.success && response.data) {
        const approvedTools = response.data.filter((tool: MCPTool) => tool.status === 'Approved');
        console.log('[WorkflowToolbar] Approved tools:', approvedTools);
        setMcpTools(approvedTools);
      } else {
        console.warn('[WorkflowToolbar] Failed to load tools:', response.error);
        setError(response.error?.message || 'Failed to load tools');
      }
    } catch (error: any) {
      console.error('[WorkflowToolbar] Failed to load MCP tools:', error);
      let errorMessage = 'Failed to load MCP tools';
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage = 'Cannot connect to backend. Make sure the API Gateway is running on http://localhost:3000';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoadingTools(false);
    }
  };

  const loadToolMethods = async (toolId: string) => {
    if (toolMethods[toolId]) {
      return;
    }

    try {
      setLoadingMethods(prev => ({ ...prev, [toolId]: true }));
      const response = await apiClient.getToolMethods(toolId);
      if (response.success && response.data) {
        setToolMethods(prev => ({ ...prev, [toolId]: response.data }));
      }
    } catch (error) {
      console.error(`Failed to load methods for tool ${toolId}:`, error);
      setToolMethods(prev => ({ ...prev, [toolId]: [] }));
    } finally {
      setLoadingMethods(prev => ({ ...prev, [toolId]: false }));
    }
  };

  const handleAddNode = (type: WorkflowNode['type']) => {
    const position = { x: Math.random() * 400 + 200, y: Math.random() * 300 + 100 };
    console.log(`[WorkflowToolbar] Adding node of type: ${type}`, { type, position });
    onAddNode(type, position);
    setOpen(false);
  };

  const handleToolToggle = (toolId: string) => {
    if (expandedTool === toolId) {
      setExpandedTool(null);
    } else {
      setExpandedTool(toolId);
      loadToolMethods(toolId);
    }
  };

  const handleMethodSelect = (toolId: string, method: string, toolName: string) => {
    if (onAddMCPTool) {
      onAddMCPTool(toolId, method, toolName);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-card hover:border-primary/50 shadow-lg transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="start" 
        side="right"
        className="w-72 p-2 bg-card/95 backdrop-blur-md border-border/50"
      >
        <ScrollArea className="max-h-[calc(100vh-8rem)]">
          <div className="space-y-1.5">
            {/* MCP Tools Section - First Priority */}
            <div className="px-2 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Plug className="w-3 h-3" />
                MCP Tools
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMCPTools}
                disabled={loadingTools}
                className="h-6 px-2 text-xs"
              >
                {loadingTools ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>
            
            {loadingTools ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Loading tools...</span>
              </div>
            ) : error ? (
              <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="font-medium mb-1">Error loading tools</div>
                <div className="text-muted-foreground">{error}</div>
              </div>
            ) : mcpTools.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground text-center bg-background/30 rounded-lg border border-border/50">
                <div className="mb-1">No MCP tools registered</div>
                <div className="text-[10px] mt-1">
                  Register tools via API to see them here
                </div>
              </div>
            ) : (
              mcpTools.map((tool) => (
                <div key={tool.tool_id} className="border border-border/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => handleToolToggle(tool.tool_id)}
                    className="w-full p-3 text-left hover:bg-background/50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Plug className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{tool.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {tool.protocol === 'rest' ? 'REST' : 'JSON-RPC'}
                        </div>
                      </div>
                    </div>
                    {expandedTool === tool.tool_id ? (
                      <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronRight className="w-4 h-4 flex-shrink-0 ml-2" />
                    )}
                  </button>

                  {expandedTool === tool.tool_id && (
                    <div className="border-t border-border/50 bg-background/30">
                      {loadingMethods[tool.tool_id] ? (
                        <div className="p-3 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : toolMethods[tool.tool_id]?.length > 0 ? (
                        <div className="p-2 space-y-1">
                          {toolMethods[tool.tool_id].map((method) => (
                            <button
                              key={method.name}
                              onClick={() => handleMethodSelect(tool.tool_id, method.name, tool.name)}
                              className="w-full p-2 text-left text-sm rounded hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              <div className="font-medium">{method.name}</div>
                              {method.description && (
                                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {method.description}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-xs text-muted-foreground text-center">
                          No methods available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Built-in Node Types - Secondary */}
            <Separator className="my-2" />
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Built-in Nodes
            </div>
            {nodeTypes.map((nodeType) => {
              const Icon = nodeType.icon;
              return (
                <button
                  key={nodeType.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow', nodeType.type);
                    e.dataTransfer.effectAllowed = 'move';
                    if (e.currentTarget) {
                      e.currentTarget.style.opacity = '0.5';
                    }
                  }}
                  onDragEnd={(e) => {
                    if (e.currentTarget) {
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                  onClick={() => {
                    console.log(`[WorkflowToolbar] Button clicked for: ${nodeType.type}`);
                    handleAddNode(nodeType.type);
                  }}
                  className="w-full p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-background hover:border-primary/50 transition-all text-left group cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{nodeType.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {nodeType.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

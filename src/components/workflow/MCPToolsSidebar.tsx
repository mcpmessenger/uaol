import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight, Plug, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

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

interface MCPToolsSidebarProps {
  onSelectTool: (toolId: string, method: string, toolName: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function MCPToolsSidebar({ onSelectTool, isOpen, onToggle }: MCPToolsSidebarProps) {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [toolMethods, setToolMethods] = useState<Record<string, MCPToolMethod[]>>({});
  const [loadingMethods, setLoadingMethods] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      const response = await apiClient.listTools();
      if (response.success && response.data) {
        // Filter to only show approved tools
        const approvedTools = response.data.filter((tool: MCPTool) => tool.status === 'Approved');
        setTools(approvedTools);
      }
    } catch (error) {
      console.error('Failed to load MCP tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadToolMethods = async (toolId: string) => {
    if (toolMethods[toolId]) {
      // Methods already loaded
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

  const handleToolToggle = (toolId: string) => {
    if (expandedTool === toolId) {
      setExpandedTool(null);
    } else {
      setExpandedTool(toolId);
      loadToolMethods(toolId);
    }
  };

  const handleMethodSelect = (toolId: string, method: string, toolName: string) => {
    onSelectTool(toolId, method, toolName);
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute top-24 left-4 z-10 h-9 w-9 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-card hover:border-primary/50 shadow-lg transition-all"
      >
        <Plug className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="absolute top-16 left-4 z-10 w-80 bg-card/95 backdrop-blur-md border border-border/50 rounded-lg shadow-xl">
      <div className="p-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">MCP Tools</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-6 w-6 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="p-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : tools.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 text-center">
              No MCP tools available. Register tools via the API.
            </div>
          ) : (
            <div className="space-y-1">
              {tools.map((tool) => (
                <div key={tool.tool_id} className="border border-border/50 rounded-md overflow-hidden">
                  <button
                    onClick={() => handleToolToggle(tool.tool_id)}
                    className="w-full p-3 text-left hover:bg-background/50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{tool.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {tool.protocol === 'rest' ? 'REST' : 'JSON-RPC'}
                      </div>
                    </div>
                    {expandedTool === tool.tool_id ? (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
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
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

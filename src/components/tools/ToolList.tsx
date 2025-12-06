import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, ExternalLink, Trash2, Edit, CheckCircle, Clock, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Tool {
  tool_id: string;
  name: string;
  gateway_url: string;
  credit_cost_per_call: number;
  protocol: 'json-rpc' | 'rest';
  status: 'Pending' | 'Approved' | 'Disabled';
  created_at: string;
  developer_id: string;
}

interface ToolListProps {
  showActions?: boolean;
  onToolSelect?: (tool: Tool) => void;
}

export function ToolList({ showActions = false, onToolSelect }: ToolListProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toolToDelete, setToolToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const response = await apiClient.listTools();
      if (response.success && response.data) {
        setTools(response.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load tools',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load tools',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (toolId: string) => {
    try {
      const response = await apiClient.approveTool(toolId);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Tool approved successfully',
        });
        loadTools();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error?.message || 'Failed to approve tool',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to approve tool',
      });
    }
  };

  const handleDelete = async () => {
    if (!toolToDelete) return;

    // TODO: Implement delete API endpoint
    toast({
      variant: 'destructive',
      title: 'Not Implemented',
      description: 'Tool deletion is not yet implemented',
    });
    setDeleteDialogOpen(false);
    setToolToDelete(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Disabled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'Approved':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Disabled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No tools registered yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Card key={tool.tool_id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(tool.status)} className="text-xs">
                      {getStatusIcon(tool.status)}
                      <span className="ml-1">{tool.status}</span>
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {tool.protocol}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Gateway URL</p>
                <a
                  href={tool.gateway_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {tool.gateway_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Credit Cost</p>
                <p className="text-sm font-medium">{tool.credit_cost_per_call} credits/call</p>
              </div>

              {showActions && (
                <div className="flex gap-2 pt-2">
                  {tool.status === 'Pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(tool.tool_id)}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToolSelect?.(tool)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setToolToDelete(tool.tool_id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {onToolSelect && !showActions && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => onToolSelect(tool)}
                >
                  Select Tool
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tool</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tool? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


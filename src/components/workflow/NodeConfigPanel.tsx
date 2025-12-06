import { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import { WorkflowNode } from './WorkflowBuilder';

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onNodeChange: (nodeId: string, data: Partial<WorkflowNode['data']>) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onNodeChange, onClose }: NodeConfigPanelProps) {
  const [localData, setLocalData] = useState(node.data);

  useEffect(() => {
    setLocalData(node.data);
  }, [node.id, node.data]);

  const handleChange = (key: string, value: any) => {
    const updated = { ...localData, [key]: value };
    setLocalData(updated);
    onNodeChange(node.id, updated);
  };

  const renderConfigFields = () => {
    switch (node.type) {
      case 'file-upload':
        return (
          <div className="space-y-4">
            <div>
              <Label>File Types</Label>
              <Input
                value={localData.fileTypes?.join(', ') || ''}
                onChange={(e) => handleChange('fileTypes', e.target.value.split(',').map(s => s.trim()))}
                placeholder="pdf, docx, txt"
              />
            </div>
            <div>
              <Label>Max File Size (MB)</Label>
              <Input
                type="number"
                value={localData.maxSize || 50}
                onChange={(e) => handleChange('maxSize', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 'text-extraction':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable OCR</Label>
              <Switch
                checked={localData.useOCR !== false}
                onCheckedChange={(checked) => handleChange('useOCR', checked)}
              />
            </div>
            <div>
              <Label>Language Hints</Label>
              <Input
                value={localData.languageHints?.join(', ') || ''}
                onChange={(e) => handleChange('languageHints', e.target.value.split(',').map(s => s.trim()))}
                placeholder="en, es, fr"
              />
            </div>
          </div>
        );

      case 'rag-indexing':
        return (
          <div className="space-y-4">
            <div>
              <Label>Chunk Size</Label>
              <Input
                type="number"
                value={localData.chunkSize || 1000}
                onChange={(e) => handleChange('chunkSize', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Chunk Overlap</Label>
              <Input
                type="number"
                value={localData.chunkOverlap || 200}
                onChange={(e) => handleChange('chunkOverlap', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 'rag-query':
        return (
          <div className="space-y-4">
            <div>
              <Label>Query</Label>
              <Textarea
                value={localData.query || ''}
                onChange={(e) => handleChange('query', e.target.value)}
                placeholder="Enter your query..."
                rows={3}
              />
            </div>
            <div>
              <Label>Top K Results</Label>
              <Input
                type="number"
                value={localData.topK || 5}
                onChange={(e) => handleChange('topK', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 'ai-generation':
        return (
          <div className="space-y-4">
            <div>
              <Label>Model</Label>
              <Input
                value={localData.model || 'gpt-4o'}
                onChange={(e) => handleChange('model', e.target.value)}
              />
            </div>
            <div>
              <Label>Prompt</Label>
              <Textarea
                value={localData.prompt || ''}
                onChange={(e) => handleChange('prompt', e.target.value)}
                placeholder="Enter your prompt..."
                rows={4}
              />
            </div>
            <div>
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={localData.maxTokens || 2000}
                onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 'mcp-tool':
        return (
          <div className="space-y-4">
            <div>
              <Label>Tool Name</Label>
              <Input
                value={localData.tool_name || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Input
                value={localData.method || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Parameters (JSON)</Label>
              <Textarea
                value={typeof localData.parameters === 'string' 
                  ? localData.parameters 
                  : JSON.stringify(localData.parameters || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleChange('parameters', parsed);
                  } catch {
                    // Invalid JSON, store as string for now
                    handleChange('parameters', e.target.value);
                  }
                }}
                placeholder='{"query": "your query here", "image": "base64..."}'
                rows={8}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter parameters as JSON. For images, use base64 encoding or file references.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            No configuration options available for this node type.
          </div>
        );
    }
  };

  return (
    <GlassPanel
      variant="subtle"
      className="w-80 border-l border-border/50 flex flex-col"
    >
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{node.data.label}</h3>
          <p className="text-xs text-muted-foreground capitalize">{node.type.replace('-', ' ')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <Label>Node Label</Label>
            <Input
              value={localData.label || ''}
              onChange={(e) => handleChange('label', e.target.value)}
            />
          </div>
          {renderConfigFields()}
        </div>
      </div>
    </GlassPanel>
  );
}

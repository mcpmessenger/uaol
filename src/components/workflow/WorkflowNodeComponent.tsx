import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  FileUp, 
  Search, 
  Database, 
  Sparkles, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2 
} from 'lucide-react';

interface CustomNodeData {
  label: string;
  nodeType: string;
  isSelected?: boolean;
  status?: 'pending' | 'running' | 'success' | 'error';
  onSelect?: () => void;
  onDelete?: () => void;
  [key: string]: any;
}

const nodeIcons: Record<string, any> = {
  'start': Play,
  'file-upload': FileUp,
  'text-extraction': FileText,
  'rag-indexing': Database,
  'rag-query': Search,
  'ai-generation': Sparkles,
  'end': CheckCircle2,
};

const nodeColors: Record<string, string> = {
  'start': 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  'file-upload': 'bg-purple-500/20 border-purple-500/50 text-purple-400',
  'text-extraction': 'bg-green-500/20 border-green-500/50 text-green-400',
  'rag-indexing': 'bg-orange-500/20 border-orange-500/50 text-orange-400',
  'rag-query': 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  'ai-generation': 'bg-pink-500/20 border-pink-500/50 text-pink-400',
  'end': 'bg-gray-500/20 border-gray-500/50 text-gray-400',
};

const statusIcons: Record<string, any> = {
  'running': Loader2,
  'success': CheckCircle2,
  'error': XCircle,
};

export const WorkflowNodeComponent = memo(({ data, selected }: NodeProps<CustomNodeData>) => {
  const Icon = nodeIcons[data.nodeType] || FileText;
  const StatusIcon = data.status ? statusIcons[data.status] : null;
  const colorClass = nodeColors[data.nodeType] || nodeColors['start'];
  const isSelected = selected || data.isSelected;

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 min-w-[180px] transition-all',
        colorClass,
        isSelected && 'ring-2 ring-primary ring-offset-2',
        data.status === 'running' && 'animate-pulse',
        data.status === 'error' && 'border-red-500',
        data.status === 'success' && 'border-green-500'
      )}
    >
      {/* Input Handle */}
      {data.nodeType !== 'start' && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-primary border-2 border-background"
        />
      )}

      {/* Node Content */}
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{data.label}</div>
          {data.status && StatusIcon && (
            <div className="flex items-center gap-1 mt-1">
              <StatusIcon
                className={cn(
                  'w-3 h-3',
                  data.status === 'running' && 'animate-spin',
                  data.status === 'success' && 'text-green-400',
                  data.status === 'error' && 'text-red-400'
                )}
              />
              <span className="text-xs text-muted-foreground capitalize">{data.status}</span>
            </div>
          )}
        </div>
      </div>

      {/* Output Handle */}
      {data.nodeType !== 'end' && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-primary border-2 border-background"
        />
      )}
    </div>
  );
});

WorkflowNodeComponent.displayName = 'WorkflowNodeComponent';

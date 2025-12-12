import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus, FileText, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowDefinition } from './WorkflowBuilder';

interface WorkflowTab {
  id: string;
  name: string;
  workflow?: WorkflowDefinition;
  workflowId?: string; // If loaded from server
  isDirty?: boolean; // Has unsaved changes
  isNew?: boolean; // New unsaved workflow
  shareableLinkId?: string;
  shareToken?: string;
  sharePermission?: 'read' | 'editor';
}

interface WorkflowTabsProps {
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabDelete?: (tabId: string, workflowId?: string) => void;
  onWorkflowUpdate: (tabId: string, workflow: WorkflowDefinition, name: string) => void;
  onTabRename?: (tabId: string, newName: string) => void;
  activeTabId: string;
  tabs: WorkflowTab[];
  onTabsChange: (tabs: WorkflowTab[]) => void;
}

export function WorkflowTabs({
  onTabChange,
  onTabClose,
  onTabDelete,
  onWorkflowUpdate,
  onTabRename,
  activeTabId,
  tabs,
  onTabsChange,
}: WorkflowTabsProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const handleTabDoubleClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setEditingTabId(tabId);
      setEditingName(tab.name);
    }
  };

  const handleNameSubmit = (tabId: string) => {
    if (editingName.trim() && onTabRename) {
      onTabRename(tabId, editingName.trim());
    }
    setEditingTabId(null);
    setEditingName('');
  };

  const handleNameKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSubmit(tabId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingTabId(null);
      setEditingName('');
    }
  };
  const handleNewWorkflow = () => {
    const newTab: WorkflowTab = {
      id: `workflow-${Date.now()}`,
      name: 'New Workflow',
      workflow: {
        name: 'New Workflow',
        nodes: [
          {
            id: 'start',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Start' },
          },
          {
            id: 'end',
            type: 'end',
            position: { x: 300, y: 100 },
            data: { label: 'End' },
          },
        ],
        edges: [],
      },
      isNew: true,
      isDirty: false,
    };
    onTabsChange([...tabs, newTab]);
    onTabChange(newTab.id);
  };

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
  };

  const handleTabCloseClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose(tabId);
  };

  return (
    <div className="flex items-center gap-1 border-b border-border/50 bg-card/50 backdrop-blur-sm px-2 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            'group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg transition-all relative min-w-[120px] flex-shrink-0',
            activeTabId === tab.id
              ? 'bg-background border-t border-l border-r border-border/50 text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          )}
        >
          <button
            onClick={() => handleTabClick(tab.id)}
            onDoubleClick={(e) => handleTabDoubleClick(e, tab.id)}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <FileText className="w-3 h-3 flex-shrink-0" />
            {editingTabId === tab.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleNameSubmit(tab.id)}
                onKeyDown={(e) => handleNameKeyDown(e, tab.id)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-transparent border-b border-primary/50 focus:outline-none focus:border-primary text-sm px-1"
                autoFocus
              />
            ) : (
              <span className="flex-1 text-left whitespace-nowrap">{tab.name}</span>
            )}
          </button>
          {tab.isDirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            {tab.workflowId && onTabDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabDelete(tab.id, tab.workflowId);
                }}
                className={cn(
                  'p-0.5 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity',
                  activeTabId === tab.id && 'opacity-100'
                )}
                title="Delete workflow"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            )}
            <button
              onClick={(e) => handleTabCloseClick(e, tab.id)}
              className={cn(
                'p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity',
                activeTabId === tab.id && 'opacity-100'
              )}
              title="Close tab"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNewWorkflow}
        className="h-8 px-2 ml-1 flex-shrink-0"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WorkflowBuilder, WorkflowDefinition } from "@/components/workflow/WorkflowBuilder";
import { WorkflowTabs } from "@/components/workflow/WorkflowTabs";
import { convertFromBackendFormat, convertToBackendFormat } from "@/components/workflow/workflowConverter";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api/client";

const COLLAB_WS_URL = import.meta.env.VITE_COLLAB_WS_URL || 'ws://localhost:3007';

interface WorkflowTab {
  id: string;
  name: string;
  workflow?: WorkflowDefinition;
  workflowId?: string;
  isDirty?: boolean;
  isNew?: boolean;
  shareableLinkId?: string;
  shareToken?: string;
  sharePermission?: 'read' | 'editor';
}

const WorkflowBuilderPage = () => {
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<WorkflowTab[]>([
    {
      id: 'default',
      name: 'Document Analysis & RAG',
      workflow: {
        name: 'Document Analysis & RAG',
        nodes: [
          {
            id: 'start',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Start' },
          },
          {
            id: 'upload',
            type: 'file-upload',
            position: { x: 300, y: 100 },
            data: { label: 'Upload Document', fileTypes: ['pdf', 'docx', 'txt'] },
          },
          {
            id: 'extract',
            type: 'text-extraction',
            position: { x: 500, y: 100 },
            data: { label: 'Extract Text', useOCR: true },
          },
          {
            id: 'index',
            type: 'rag-indexing',
            position: { x: 700, y: 100 },
            data: { label: 'Index for RAG', chunkSize: 1000 },
          },
          {
            id: 'end',
            type: 'end',
            position: { x: 900, y: 100 },
            data: { label: 'End' },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'upload' },
          { id: 'e2', source: 'upload', target: 'extract' },
          { id: 'e3', source: 'extract', target: 'index' },
          { id: 'e4', source: 'index', target: 'end' },
        ],
      },
      isDirty: false,
      isNew: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('default');
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoadingWorkflows(true);
      const response = await apiClient.getWorkflows();
      if (response.success && response.data?.workflows) {
        // Load full workflow definitions for each workflow
        const loadedTabsPromises = response.data.workflows.map(async (wf: any) => {
          try {
            const workflowResponse = await apiClient.getWorkflow(wf.workflowId);
            if (workflowResponse.success && workflowResponse.data) {
              const backendDef = workflowResponse.data.workflowDefinition;
              
              // Convert from backend format (steps) to frontend format (nodes/edges)
              let frontendWorkflow: WorkflowDefinition;
              if (backendDef.steps) {
                // Backend format - convert it
                frontendWorkflow = convertFromBackendFormat(backendDef, wf.name);
                // Validate conversion - ensure we have nodes
                if (!frontendWorkflow.nodes || frontendWorkflow.nodes.length === 0) {
                  console.warn(`[WorkflowBuilderPage] Converted workflow has no nodes, using fallback`, { workflowId: wf.workflowId });
                  frontendWorkflow = {
                    name: wf.name,
                    nodes: [
                      { id: 'start', type: 'start', position: { x: 100, y: 100 }, data: { label: 'Start' } },
                      { id: 'end', type: 'end', position: { x: 300, y: 100 }, data: { label: 'End' } },
                    ],
                    edges: [],
                  };
                }
              } else if (backendDef.nodes && backendDef.edges) {
                // Already in frontend format
                frontendWorkflow = {
                  name: wf.name,
                  nodes: backendDef.nodes || [],
                  edges: backendDef.edges || [],
                };
                // Ensure we have at least start and end nodes
                if (frontendWorkflow.nodes.length === 0) {
                  frontendWorkflow.nodes = [
                    { id: 'start', type: 'start', position: { x: 100, y: 100 }, data: { label: 'Start' } },
                    { id: 'end', type: 'end', position: { x: 300, y: 100 }, data: { label: 'End' } },
                  ];
                }
              } else {
                // Fallback - create empty workflow
                console.warn(`[WorkflowBuilderPage] No valid workflow definition, using fallback`, { workflowId: wf.workflowId });
                frontendWorkflow = {
                  name: wf.name,
                  nodes: [
                    { id: 'start', type: 'start', position: { x: 100, y: 100 }, data: { label: 'Start' } },
                    { id: 'end', type: 'end', position: { x: 300, y: 100 }, data: { label: 'End' } },
                  ],
                  edges: [],
                };
              }

              let shareableLinkId: string | undefined;
              let shareToken: string | undefined;
              let sharePermission: 'read' | 'editor' = 'editor';

              try {
                const shareLinks = await apiClient.listShareLinks(wf.workflowId);
                if (shareLinks.success && shareLinks.data?.links?.length) {
                  const link = shareLinks.data.links.find((l: any) => l.permission === 'editor') || shareLinks.data.links[0];
                  shareableLinkId = link?.shareableLinkId;
                  shareToken = link?.token;
                  sharePermission = link?.permission || 'editor';
                } else {
                  const created = await apiClient.createShareLink(wf.workflowId, 'editor');
                  if (created.success && created.data) {
                    shareableLinkId = created.data.shareableLinkId;
                    shareToken = created.data.token;
                    sharePermission = created.data.permission || 'editor';
                  }
                }
              } catch (shareError) {
                console.warn(`[WorkflowBuilderPage] Failed to load share link for workflow ${wf.workflowId}`, shareError);
              }

              return {
                id: wf.workflowId,
                name: wf.name,
                workflowId: wf.workflowId,
                workflow: frontendWorkflow,
                isDirty: false,
                isNew: false,
                shareableLinkId,
                shareToken,
                sharePermission,
              } as WorkflowTab;
            }
          } catch (error) {
            console.error(`Failed to load workflow ${wf.workflowId}:`, error);
          }
          return null;
        });

        const loadedTabs = (await Promise.all(loadedTabsPromises)).filter((tab): tab is WorkflowTab => tab !== null);
        
        // Keep the default tab and add loaded workflows
        setTabs(prev => {
          const defaultTab = prev.find(t => t.id === 'default');
          return defaultTab ? [defaultTab, ...loadedTabs] : loadedTabs;
        });
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleTabClose = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    
    // Warn if there are unsaved changes
    if (tab?.isDirty) {
      if (!confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) {
        return;
      }
    }

    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    // If we closed the active tab, switch to another
    if (tabId === activeTabId && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    } else if (newTabs.length === 0) {
      // If no tabs left, navigate away or create a new one
      navigate('/');
    }
  };

  const handleWorkflowUpdate = (tabId: string, workflow: WorkflowDefinition, name: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, workflow, name, isDirty: true }
        : tab
    ));
  };

  const handleTabRename = (tabId: string, newName: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, name: newName, isDirty: true }
        : tab
    ));
    // Also update the workflow name in the workflow definition
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.workflow) {
      handleWorkflowUpdate(tabId, { ...tab.workflow, name: newName }, newName);
    }
  };

  const handleSave = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !tab.workflow) return;

    try {
      const backendDefinition = convertToBackendFormat(tab.workflow.nodes, tab.workflow.edges, tab.name);
      const response = await apiClient.createWorkflow({
        name: tab.name,
        description: `Workflow: ${tab.name}`,
        workflowDefinition: backendDefinition,
      });

      if (response.success && response.data?.workflowId) {
        let shareableLinkId: string | undefined;
        let shareToken: string | undefined;
        let sharePermission: 'read' | 'editor' = 'editor';

        try {
          const created = await apiClient.createShareLink(response.data.workflowId, 'editor');
          if (created.success && created.data) {
            shareableLinkId = created.data.shareableLinkId;
            shareToken = created.data.token;
            sharePermission = created.data.permission || 'editor';
          }
        } catch (error) {
          console.warn('Failed to create share link for saved workflow', error);
        }

        setTabs(prev => prev.map(t => 
          t.id === tabId 
            ? { ...t, workflowId: response.data.workflowId, isDirty: false, isNew: false, shareableLinkId, shareToken, sharePermission }
            : t
        ));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save workflow:', error);
      return false;
    }
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ duration: 2 }}
          className="absolute top-0 left-1/4 w-96 h-96 bg-primary rounded-full blur-[128px]"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary/50 rounded-full blur-[150px]"
        />
      </div>

      {/* Main Layout */}
      <div className="relative z-10 flex flex-col h-full">
        <Header />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Workflow Tabs */}
          <WorkflowTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={handleTabChange}
            onTabClose={handleTabClose}
            onWorkflowUpdate={handleWorkflowUpdate}
            onTabRename={handleTabRename}
            onTabsChange={setTabs}
          />
          
          {/* Active Workflow Builder */}
          {activeTab && (
            <div className="flex-1 overflow-hidden">
              <WorkflowBuilder
                key={activeTab.id}
                onClose={() => navigate('/')}
                initialWorkflow={activeTab.workflow}
                tabId={activeTab.id}
                workflowName={activeTab.name}
                isDirty={activeTab.isDirty}
                onSave={handleSave}
                workflowId={activeTab.workflowId}
                collabConfig={
                  activeTab.shareableLinkId && activeTab.shareToken
                    ? {
                        shareableLinkId: activeTab.shareableLinkId,
                        token: activeTab.shareToken,
                        permission: activeTab.sharePermission,
                      }
                    : undefined
                }
                onNameChange={(name) => {
                  setTabs(prev => prev.map(t => 
                    t.id === activeTab.id ? { ...t, name, isDirty: true } : t
                  ));
                }}
                onWorkflowChange={(workflow) => {
                  handleWorkflowUpdate(activeTab.id, workflow, activeTab.name);
                }}
              />
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default WorkflowBuilderPage;

# Product Requirements Document: Visual Workflow Builder

## Executive Summary

The Visual Workflow Builder is a drag-and-drop interface that enables users to create, visualize, and execute complex AI workflows without writing code. It transforms UAOL from a programmatic API into an accessible, visual orchestration platform.

**Status**: 🟡 In Planning  
**Priority**: High  
**Target Release**: Q2 2025

---

## 1. Current State Analysis

### 1.1 What Exists Today

**Backend Infrastructure:**
- ✅ Workflow execution engine (`job-orchestration-service`)
- ✅ Workflow definition schema (`WorkflowDefinition`, `WorkflowStep`)
- ✅ Job queue and processing system
- ✅ MCP tool integration
- ✅ Credit system integration
- ✅ Workflow result display (`WorkflowResultCard`)

**Frontend:**
- ✅ Basic workflow result visualization
- ✅ `/workflow` command placeholder
- ⚠️ No visual builder UI
- ⚠️ No workflow creation interface
- ⚠️ No workflow templates

### 1.2 Current Workflow Definition Structure

```typescript
interface WorkflowDefinition {
  steps: WorkflowStep[];
  metadata?: Record<string, any>;
}

interface WorkflowStep {
  id: string;
  tool_id: string;
  action: string;
  parameters: Record<string, any>;
  depends_on?: string[];
}
```

### 1.3 Gaps Identified

1. **No Visual Builder**: Users must manually construct JSON workflow definitions
2. **No Workflow Templates**: No pre-built workflows for common use cases
3. **No Workflow Library**: Can't save, share, or reuse workflows
4. **Limited Error Handling UI**: Errors shown but not actionable
5. **No Real-time Execution View**: Can't see workflow progress visually
6. **No Workflow Validation**: No pre-execution validation of workflow logic

---

## 2. Product Vision

### 2.1 User Personas

**Primary Persona: "AI Workflow Creator"**
- Technical but non-developer
- Needs to automate multi-step AI tasks
- Wants visual feedback and control
- Values ease of use over advanced features

**Secondary Persona: "Power User"**
- Developer or technical user
- Needs complex workflows with conditionals
- Wants to save and share workflows
- Values flexibility and extensibility

### 2.2 Core Value Propositions

1. **Visual Clarity**: See workflow logic at a glance
2. **No-Code Creation**: Build workflows without JSON knowledge
3. **Instant Feedback**: Test workflows immediately
4. **Reusability**: Save and share workflow templates
5. **Error Prevention**: Validate workflows before execution

---

## 3. Feature Requirements

### 3.1 Phase 1: Core Builder (MVP)

#### 3.1.1 Visual Canvas
- **Drag-and-Drop Interface**
  - Canvas with zoom/pan capabilities
  - Grid or snap-to-grid layout
  - Node-based workflow representation
  
- **Node Types**
  - **Tool Nodes**: Represent MCP tools
    - Display tool name, icon, status
    - Show input/output ports
    - Color-coded by tool category
  - **Data Nodes**: Input/output data
    - File upload nodes
    - Text input nodes
    - Variable nodes
  - **Control Nodes**: Flow control
    - Start/End nodes
    - Conditional branches (Phase 2)
    - Loops (Phase 2)

- **Connections**
  - Visual edges between nodes
  - Represent data flow and dependencies
  - Animated during execution
  - Color-coded by status (pending, running, success, error)

#### 3.1.2 Node Configuration Panel
- **Side Panel** that opens when node is selected
- **Tool Selection**
  - Searchable list of available MCP tools
  - Tool descriptions and documentation
  - Credit cost display
  - Preview of tool capabilities

- **Parameter Configuration**
  - Dynamic form based on tool schema
  - Input validation
  - Variable references (e.g., `{{step1.output}}`)
  - File upload for file parameters
  - JSON editor for complex parameters

- **Dependency Management**
  - Visual dependency selector
  - Automatic dependency detection
  - Circular dependency prevention

#### 3.1.3 Workflow Execution
- **One-Click Execution**
  - "Run Workflow" button
  - Pre-execution validation
  - Credit cost preview
  - Confirmation dialog

- **Real-Time Execution View**
  - Live status updates on nodes
  - Progress indicators
  - Execution logs per node
  - Error highlighting
  - Cancel execution option

- **Result Display**
  - Enhanced `WorkflowResultCard` integration
  - Node-by-node results
  - Output data visualization
  - Download results option

#### 3.1.4 Workflow Management
- **Save Workflow**
  - Name and description
  - Tags/categories
  - Save to user's workflow library

- **Load Workflow**
  - Browse saved workflows
  - Search and filter
  - Recent workflows

- **Workflow Templates**
  - Pre-built templates for common tasks:
    - Document Analysis Pipeline
    - Multi-Model Comparison
    - Content Generation Chain
    - Data Extraction Workflow
  - One-click template instantiation

### 3.2 Phase 2: Advanced Features

#### 3.2.1 Conditional Logic
- **If/Else Nodes**
  - Condition builder UI
  - Branch visualization
  - Merge nodes

- **Switch/Case Nodes**
  - Multi-branch conditions
  - Default case handling

#### 3.2.2 Loops and Iteration
- **For Each Node**
  - Iterate over arrays
  - Loop variable access

- **While Loop Node**
  - Condition-based iteration
  - Break conditions

#### 3.2.3 Data Transformation
- **Transform Nodes**
  - JSON path expressions
  - Data mapping UI
  - Format conversion

- **Filter Nodes**
  - Data filtering UI
  - Conditional filtering

#### 3.2.4 Collaboration Features
- **Share Workflows**
  - Public/private sharing
  - Shareable links
  - Workflow marketplace

- **Version Control**
  - Workflow versioning
  - Change history
  - Rollback capability

#### 3.2.5 Advanced Execution
- **Parallel Execution**
  - Parallel node groups
  - Resource management
  - Concurrency limits

- **Error Handling**
  - Retry nodes
  - Error handlers
  - Fallback workflows

- **Scheduling**
  - Schedule workflows
  - Cron expressions
  - Event triggers

### 3.3 Phase 3: Enterprise Features

- **Workflow Analytics**
  - Execution metrics
  - Performance monitoring
  - Cost tracking

- **Permissions & Access Control**
  - Team workflows
  - Role-based access
  - Workflow approval workflows

- **API Integration**
  - Export workflows as API endpoints
  - Webhook triggers
  - REST API for workflow management

---

## 4. Technical Requirements

### 4.1 Frontend Architecture

**Technology Stack:**
- **React Flow** or **React DnD** for drag-and-drop
- **React** + **TypeScript** (existing)
- **Zustand** or **Redux** for state management
- **React Query** for data fetching
- **Framer Motion** for animations (existing)

**Key Components:**
```
src/components/workflow/
├── WorkflowBuilder.tsx          # Main builder component
├── WorkflowCanvas.tsx            # Canvas with nodes
├── WorkflowNode.tsx              # Individual node component
├── WorkflowEdge.tsx               # Connection between nodes
├── NodeConfigPanel.tsx           # Side panel for node config
├── ToolSelector.tsx              # Tool selection UI
├── ParameterForm.tsx             # Dynamic parameter forms
├── ExecutionView.tsx             # Real-time execution display
├── WorkflowLibrary.tsx           # Saved workflows browser
└── WorkflowTemplates.tsx         # Template gallery
```

### 4.2 Backend Enhancements

**New Endpoints Needed:**
```
POST   /api/workflows              # Create workflow
GET    /api/workflows              # List user workflows
GET    /api/workflows/:id          # Get workflow
PUT    /api/workflows/:id          # Update workflow
DELETE /api/workflows/:id          # Delete workflow
GET    /api/workflows/templates    # Get workflow templates
POST   /api/workflows/:id/execute # Execute workflow
GET    /api/workflows/:id/status   # Get execution status
```

**Database Schema Updates:**
```sql
CREATE TABLE IF NOT EXISTS workflows (
    workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    workflow_definition JSONB NOT NULL,
    is_template BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_public ON workflows(is_public) WHERE is_public = TRUE;
```

### 4.3 State Management

**Workflow Builder State:**
```typescript
interface WorkflowBuilderState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNode: string | null;
  isExecuting: boolean;
  executionStatus: Record<string, NodeExecutionStatus>;
  workflowName: string;
  workflowDescription: string;
  isDirty: boolean;
}
```

### 4.4 Validation & Error Handling

**Pre-Execution Validation:**
- All nodes have required parameters
- All dependencies are valid
- No circular dependencies
- All tool IDs are valid
- Credit balance sufficient
- Required inputs provided

**Runtime Error Handling:**
- Node-level error capture
- Error propagation visualization
- Retry mechanisms
- Partial execution recovery

---

## 5. User Experience Design

### 5.1 User Flows

#### Flow 1: Create New Workflow
1. User clicks "New Workflow" or `/workflow` command
2. Blank canvas appears
3. User drags "Start" node onto canvas
4. User drags tool nodes from palette
5. User connects nodes (drag from output to input)
6. User configures each node via side panel
7. User clicks "Run" to test
8. User clicks "Save" to persist

#### Flow 2: Use Template
1. User clicks "Templates" tab
2. User browses template gallery
3. User clicks "Use Template"
4. Template loads onto canvas
5. User customizes nodes as needed
6. User runs and saves

#### Flow 3: Execute Workflow
1. User opens saved workflow
2. User reviews workflow structure
3. User clicks "Run Workflow"
4. System validates workflow
5. User confirms credit cost
6. Execution begins with live updates
7. Results displayed in execution view
8. User can download or share results

### 5.2 UI/UX Principles

- **Progressive Disclosure**: Show complexity only when needed
- **Visual Feedback**: Immediate feedback on all actions
- **Error Prevention**: Validate before allowing invalid actions
- **Accessibility**: Keyboard navigation, screen reader support
- **Responsive**: Works on desktop and tablet (mobile Phase 3)

### 5.3 Design System Integration

- Use existing **shadcn/ui** components
- Follow existing **GlassPanel** design language
- Maintain **Tailwind CSS** styling consistency
- Use existing color scheme and typography

---

## 6. Success Metrics

### 6.1 Adoption Metrics
- % of users who create workflows
- Average workflows created per user
- Template usage rate
- Workflow execution frequency

### 6.2 Engagement Metrics
- Time spent in workflow builder
- Workflows saved vs. discarded
- Workflow execution success rate
- Workflow sharing frequency

### 6.3 Quality Metrics
- Workflow validation error rate
- Execution error rate
- User support tickets related to workflows
- Feature usage analytics

---

## 7. Implementation Roadmap

### Phase 1: MVP (Weeks 1-8)
- [ ] Basic canvas with drag-and-drop
- [ ] Node creation and configuration
- [ ] Connection system
- [ ] Tool selector integration
- [ ] Parameter forms
- [ ] Workflow execution
- [ ] Basic result display
- [ ] Save/load workflows

### Phase 2: Enhanced Features (Weeks 9-16)
- [ ] Workflow templates
- [ ] Real-time execution view
- [ ] Advanced validation
- [ ] Error handling UI
- [ ] Workflow library UI
- [ ] Search and filtering

### Phase 3: Advanced Features (Weeks 17-24)
- [ ] Conditional logic
- [ ] Loops and iteration
- [ ] Data transformation
- [ ] Collaboration features
- [ ] Analytics dashboard

---

## 8. Open Questions & Decisions Needed

1. **Library Choice**: React Flow vs. React DnD vs. Custom solution?
2. **State Management**: Zustand vs. Redux vs. Context API?
3. **Workflow Storage**: Separate table vs. extend processing_jobs?
4. **Template System**: Built-in vs. user-generated?
5. **Mobile Support**: Include in MVP or defer?
6. **Workflow Versioning**: How to handle updates to saved workflows?
7. **Export Format**: JSON, YAML, or visual format?
8. **Import/Export**: Allow importing workflows from other platforms?

---

## 9. Dependencies & Prerequisites

- ✅ Backend workflow execution engine (exists)
- ✅ MCP tool registry (exists)
- ✅ Credit system (exists)
- ⚠️ Tool schema definitions (may need enhancement)
- ⚠️ Workflow validation service (needs implementation)
- ⚠️ Workflow storage API (needs implementation)

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex UI implementation | High | Use proven library (React Flow), start simple |
| Performance with large workflows | Medium | Implement virtualization, limit node count initially |
| State management complexity | Medium | Use established patterns, thorough testing |
| User confusion | Medium | Comprehensive onboarding, tooltips, examples |
| Backend API changes needed | Low | Design API first, coordinate with backend team |

---

## 11. Appendix

### 11.1 Related Documents
- [Workflow Execution Engine Documentation](./WORKFLOW_EXECUTION.md) (to be created)
- [MCP Tool Integration Guide](./MCP_TOOL_INTEGRATION.md) (to be created)
- [API Documentation](./API_DOCUMENTATION.md) (to be created)

### 11.2 References
- React Flow: https://reactflow.dev/
- React DnD: https://react-dnd.github.io/react-dnd/
- Similar Products: Zapier, n8n, Make.com

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-05  
**Author**: UAOL Product Team  
**Status**: Draft for Review

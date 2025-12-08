# Developer Instructions: Collaborative Workflow Builder

This document outlines the technical plan and implementation steps to transform the existing Workflow Builder into a real-time collaborative and shareable workspace, as requested.

## 1. High-Level Architecture Overview

The core of this transformation involves introducing a new microservice and leveraging a **Conflict-free Replicated Data Type (CRDT)** library for real-time synchronization.

| Component | Role in Collaboration | Existing Service Interaction |
| :--- | :--- | :--- |
| **New: Collaboration Service** | Manages WebSocket connections, hosts the CRDT document (workflow state), and handles real-time synchronization between connected clients. Persists the final state to the database. | Communicates with the **Auth Service** for user authentication and authorization on shared workflows. |
| **Frontend (React)** | Implements the real-time UI, connects to the **Collaboration Service** via WebSocket, and uses the CRDT library (e.g., Yjs) to apply and observe changes. | Uses the **API Gateway** for initial workflow data fetch and the **Collaboration Service** for real-time updates. |
| **Database (CockroachDB/PostgreSQL)** | Stores the persistent state of the workflow, including the new `shareable_link_id` and the CRDT-compatible workflow document. | Accessed by the **Collaboration Service** for persistence and retrieval. |
| **Auth Service** | Extends to manage permissions for shared workflows (e.g., read-only, edit access). | Provides user authentication and authorization tokens to the **Collaboration Service**. |

## 2. Core Real-Time Collaboration Implementation

We recommend using **Yjs** (a high-performance CRDT implementation) combined with a WebSocket server for the real-time layer.

### 2.1. Introduce the Collaboration Service

1.  **Create a new microservice** (e.g., `collaboration-service`) within the `backend/services` directory.
2.  **Setup WebSocket Server**: Implement a WebSocket server (e.g., using `ws` or integrating with the existing HTTP server via `socket.io` if preferred) to handle client connections.
3.  **Integrate Yjs**:
    *   Install Yjs dependencies: `npm install yjs @y-websocket/server` (or similar Yjs binding for your chosen WebSocket library).
    *   For each active workflow, the service will maintain a **Y.Doc** instance in memory.
    *   When a client connects to a specific workflow ID, the service loads the workflow's state from the database, initializes the Y.Doc, and sends the initial state to the client.
    *   The service will listen for `update` events from the Y.Doc and broadcast them to all other connected clients for that workflow.
    *   The service must also persist the Y.Doc's state (e.g., every 5 seconds or on a significant event like a client disconnect) back to the database.

### 2.2. Frontend Integration (Workflow Builder)

1.  **Install Yjs on the Frontend**: `npm install yjs y-websocket` (and the appropriate React binding, e.g., `y-react`).
2.  **Connect to Collaboration Service**: Establish a WebSocket connection to the new `collaboration-service` when the user opens a Workflow Builder tab. The connection URL should include the workflow ID.
3.  **Implement Real-Time Editing**:
    *   Bind the Workflow Builder's state (nodes, connections, configuration) to the Y.Doc.
    *   Use the Yjs data structures (e.g., `Y.Map`, `Y.Array`) to represent the workflow data.
    *   Any change made by the local user is applied to the local Y.Doc, which automatically generates a CRDT update and sends it via the WebSocket.
    *   Incoming updates from the WebSocket are applied to the local Y.Doc, which in turn updates the React component state, reflecting changes from collaborators in real-time.

## 3. Workflow Sharing Mechanism

The sharing requirement is to make a **particular workflow** shareable without sharing all workflows.

### 3.1. Database Schema Update

Update the workflow table schema to include a unique, unguessable identifier for sharing:

| Field | Type | Description |
| :--- | :--- | :--- |
| `shareable_link_id` | `UUID` (Unique, non-sequential) | A unique ID used in the URL for sharing. Generated upon creation or first share. |
| `owner_user_id` | `UUID` | The ID of the user who created the workflow. |
| `collaboration_permissions` | `JSONB` | Stores a list of user IDs and their access level (`read-only`, `editor`). |

### 3.2. Shareable Link Generation

1.  **API Gateway Endpoint**: Create a new endpoint in the **API Gateway** that proxies to the **Collaboration Service** to generate or retrieve the `shareable_link_id` for a given workflow.
2.  **Frontend Link Construction**: The frontend will construct the shareable URL:
    ```
    https://[your-app-domain]/workflow/share/[shareable_link_id]
    ```

### 3.3. Access Control and Authorization

1.  **Auth Service Extension**: The **Auth Service** must provide an endpoint to validate a user's access to a `shareable_link_id`.
2.  **Collaboration Service Logic**:
    *   When a user attempts to connect to a workflow via the shareable link, the **Collaboration Service** must first authenticate the user via the **Auth Service**.
    *   It then checks the `collaboration_permissions` field in the database for the corresponding workflow.
    *   If the user is the `owner_user_id` or is listed in `collaboration_permissions`, access is granted. Otherwise, access is denied.

## 4. Cross-Platform Sharing

The most effective way to share a URL across platforms (Gmail, Outlook, iCloud, etc.) is to leverage the native sharing capabilities of the user's device or operating system.

### 4.1. Web Share API Implementation

1.  **Frontend "Share" Button**: Implement a "Share" button in the Workflow Builder UI.
2.  **Use `navigator.share()`**: On click, use the [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) to trigger the native sharing dialog.

```javascript
const shareWorkflow = (workflowTitle, shareableLink) => {
  if (navigator.share) {
    navigator.share({
      title: `Collaborate on: ${workflowTitle}`,
      text: `Join me to edit this workflow in real-time.`,
      url: shareableLink,
    })
    .then(() => console.log('Successful share'))
    .catch((error) => console.log('Error sharing', error));
  } else {
    // Fallback for browsers that do not support the Web Share API
    // e.g., copy the link to the clipboard
    navigator.clipboard.writeText(shareableLink);
    alert('Share link copied to clipboard!');
  }
};
```

This approach is platform-agnostic and will use the user's installed applications (including native mail clients like Gmail, Outlook, and potentially iCloud-related apps) to handle the sharing of the URL.

## 5. Future Considerations

| Feature | Description | Implementation Note |
| :--- | :--- | :--- |
| **Presence Indicators** | Show which collaborators are currently viewing/editing the workflow (e.g., a colored cursor or avatar). | Yjs supports a **"Awareness"** protocol which is specifically designed for this purpose and integrates seamlessly with the Yjs core. |
| **Version History** | Allow users to view and revert to previous versions of the workflow. | The **Collaboration Service** can periodically save a snapshot of the Y.Doc state to a separate history table, or use Yjs's built-in persistence features. |
| **Explicit Invitations** | Move from simple link sharing to an explicit invitation system with email notifications. | Integrate with the existing **Auth Service** and potentially a new **Notification Service** to send email invitations to specific users. |
| **Read-Only Mode** | Implement the `read-only` permission from the `collaboration_permissions` field to disable editing controls on the frontend for non-editors. | The frontend should check the user's permission level upon connection and disable all interactive elements in the Workflow Builder if the mode is `read-only`. |

# UAOL - Product Manager's "Wiring Up" Checklist

This checklist is designed to guide the development team in moving the UAOL platform from its current scaffolding state to a production-ready application. The focus is on the "little things" that connect the core microservices and frontend components to external services and ensure a robust user experience.

## I. Infrastructure & Backend Wiring (The Foundation)

The microservices architecture is in place, but the connections to external services and the internal message bus need to be established and secured.

| Area | Task | Details & Rationale | Priority | Service Impacted |
| :--- | :--- | :--- | :--- | :--- |
| **Database** | **1. Finalize Production Database Setup** | Ensure the `DATABASE_URL` in `backend/.env` points to a production-grade, highly-available instance (e.g., CockroachDB Cloud). Run and verify all migrations. | **High** | All Services |
| **Message Queue** | **2. Configure & Deploy Message Queue** | The Job Orchestration Service relies on a message queue (Kafka/SQS). This needs to be deployed, configured, and tested for inter-service communication. | **High** | Job Orchestration, Tool Proxy |
| **Cloud Storage** | **3. Wire Up S3/Cloud Storage** | Configure `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `S3_BUCKET_NAME` for the Storage Service. This is critical for file uploads, PDF parsing, and job result storage. | **High** | Storage Service, Job Orchestration |
| **Secrets Management** | **4. Implement Secrets Manager Integration** | The `env.example` suggests integration with AWS Secrets Manager or Vault. This must be fully implemented to avoid storing sensitive keys (Stripe, OpenAI, OAuth) in plain environment files. | **High** | All Services |
| **Logging & Monitoring** | **5. Centralized Logging and Metrics** | Implement a centralized logging solution (e.g., ELK stack, Datadog) across all microservices to enable quick debugging and performance monitoring. | **Medium** | All Services |
| **Rate Limiting** | **6. Review and Enforce API Rate Limits** | The API Gateway has a rate limit setting (`RATE_LIMIT_PER_MINUTE`). This needs to be tested and configured to prevent abuse and ensure service stability. | **Medium** | API Gateway |

## II. Authentication & User Experience (The Frontend/Backend Link)

The user flow for authentication and initial setup is the most critical part of the user experience.

| Area | Task | Details & Rationale | Priority | Service Impacted |
| :--- | :--- | :--- | :--- | :--- |
| **OAuth** | **7. Configure Google/Microsoft OAuth** | Obtain and configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (and similar for Outlook/iCloud) in `backend/.env`. The frontend components are ready, but the backend handshake needs the credentials. | **High** | Auth Service |
| **Frontend API Client** | **8. Finalize API Client Error Handling** | Review `src/lib/api/client.ts` to ensure all API calls handle network errors, 401 (unauthorized), and 500 (server) errors gracefully with user-friendly toast notifications. | **High** | Frontend |
| **Initial Setup** | **9. Implement First-Run Setup Wizard** | A user's first login should guide them to set their `OPENAI_API_KEY` (or other model keys) and perhaps register their first MCP tool. This prevents a "blank screen" experience. | **Medium** | Frontend, Auth Service |
| **User Profile** | **10. Wire Up User Profile Editing** | The user profile page (name, email, password change) is likely scaffolded but needs the API endpoints in the Auth Service to be fully implemented and connected. | **Medium** | Frontend, Auth Service |

## III. Core AI & Workflow Wiring (The Product Value)

These tasks ensure the core value proposition of the platform—AI orchestration—is functional and extensible.

| Area | Task | Details & Rationale | Priority | Service Impacted |
| :--- | :--- | :--- | :--- | :--- |
| **AI Model Keys** | **11. Securely Store and Use AI Keys** | The system needs a mechanism to securely store user-provided `OPENAI_API_KEY`s (and others) and retrieve them for the Tool Proxy Service to use in API calls. | **High** | Tool Proxy, Auth Service |
| **PDF Parsing** | **12. Resolve Critical PDF Parsing Issue** | The README explicitly mentions a **critical bug bounty** for PDF parsing. This must be resolved to enable document analysis workflows. | **Critical** | Job Orchestration, Storage Service |
| **Tool Registration** | **13. Implement Tool Registration UI/API** | The Tool Registry Service has API endpoints (`POST /tools`), but the frontend needs a robust UI for users to register, edit, and manage their custom MCP tools. | **High** | Frontend, Tool Registry |
| **Workflow Definition** | **14. Define and Test Initial Workflows** | Create a set of 3-5 example, pre-defined workflows (e.g., "Summarize Document," "Analyze Codebase") to demonstrate the Job Orchestration Service's capabilities. | **Medium** | Job Orchestration |

## IV. Billing & Monetization Wiring (The Business Layer)

The Billing Service is a key component for a commercial product and requires careful integration.

| Area | Task | Details & Rationale | Priority | Service Impacted |
| :--- | :--- | :--- | :--- | :--- |
| **Stripe Integration** | **15. Complete Stripe Webhook Integration** | Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. The Billing Service must reliably process payment events (e.g., subscription created, payment failed) from Stripe. | **High** | Billing Service |
| **Credit System UI** | **16. Wire Up Credit Balance Display** | The frontend needs a prominent, real-time display of the user's current credit balance, fetched from the Billing Service. | **High** | Frontend, Billing Service |
| **Usage Tracking** | **17. Implement Job-to-Credit Deduction Logic** | The Job Orchestration Service must communicate with the Billing Service to deduct credits based on the complexity/cost of a completed job. This is the core monetization logic. | **High** | Job Orchestration, Billing Service |

## V. Documentation & Developer Experience

These tasks improve the onboarding experience for new developers and contributors.

| Area | Task | Details & Rationale | Priority | Service Impacted |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Quick Start** | **18. Verify and Update All Documentation** | The README links to several internal Markdown files (e.g., `OAUTH_SETUP_GUIDE.md`). These documents must be reviewed for accuracy and completeness, especially regarding the new infrastructure setup. | **Medium** | Documentation |
| **Testing** | **19. Implement Comprehensive Unit/Integration Tests** | The `package.json` has `npm test` scripts, but the test coverage needs to be verified and expanded, especially for the critical Billing and Job Orchestration services. | **Medium** | All Services |
| **Docker Compose** | **20. Finalize Local Development Environment** | The `docker-compose.yml` needs to be verified to ensure it correctly spins up all 6 microservices, the database, and the message queue for a one-command local setup. | **Medium** | Developer Experience |

---

**Summary of Critical Next Steps:**

1.  **Resolve the Critical PDF Parsing Bug** (Task 12).
2.  **Establish Core Infrastructure Connections**: Database, Message Queue, and S3 (Tasks 1, 2, 3).
3.  **Secure the Platform**: Implement Secrets Management and OAuth credentials (Tasks 4, 7).
4.  **Wire Up Monetization**: Complete Stripe integration and usage tracking (Tasks 15, 17).

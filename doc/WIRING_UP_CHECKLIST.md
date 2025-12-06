# UAOL Wiring Up Checklist

Simple checklist for solo development. Work through items in order, checking them off as you complete.

## Infrastructure & Backend

- [ ] **Database Setup**
  - [ ] Set `DATABASE_URL` in `backend/.env` to production database (CockroachDB/Supabase)
  - [ ] Run migrations: `cd backend && npm run migrate`
  - [ ] Verify connection: `node test-db-connection.js`
  - [ ] All services can connect to database

- [x] **Message Queue Setup**
  - [ ] Start Kafka: `docker-compose up -d zookeeper kafka` (needs manual setup)
  - [x] Implement Kafka producer in `backend/shared/mq/queue.ts`
  - [x] Implement Kafka consumer in Job Orchestration Service
  - [x] Implement SQS producer/consumer (alternative to Kafka)
  - [ ] Test message flow between services (needs Kafka running)

- [x] **S3 Storage Setup**
  - [x] Create AWS S3 bucket: `uaol-storage-20251206154239` (created)
  - [x] Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` in `backend/.env` (bucket name set, secret key needs manual setup)
  - [x] Install AWS SDK: `npm install @aws-sdk/client-s3` (already installed)
  - [x] Implement S3 upload in `backend/services/storage-service/src/services/s3-client.ts`
  - [x] Implement presigned URL generation
  - [x] Implement file list and delete operations
  - [ ] Test file upload and retrieval (needs AWS_SECRET_ACCESS_KEY in .env)

- [ ] **Secrets Manager**
  - [ ] Choose secrets manager (AWS Secrets Manager or Vault)
  - [ ] Implement secrets retrieval in `backend/shared/config/index.ts`
  - [ ] Move Stripe keys to secrets manager
  - [ ] Move OpenAI keys to secrets manager
  - [ ] Move OAuth secrets to secrets manager
  - [ ] Keep env vars as fallback for local dev

- [ ] **Logging Setup**
  - [ ] Choose logging solution (ELK/Datadog/CloudWatch)
  - [ ] Configure centralized logging across all services
  - [ ] Test log aggregation

- [x] **Rate Limiting**
  - [x] Add rate limit headers to responses (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
  - [ ] Test `RATE_LIMIT_PER_MINUTE` in API Gateway (manual testing needed)
  - [ ] Configure appropriate limits (already configured, may need adjustment)

## Authentication & User Experience

- [ ] **OAuth Configuration**
  - [ ] Get Google OAuth credentials from Google Cloud Console
  - [ ] Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`
  - [ ] Get Microsoft OAuth credentials from Azure Portal
  - [ ] Set `OUTLOOK_CLIENT_ID` and `OUTLOOK_CLIENT_SECRET` in `backend/.env`
  - [ ] Test Google OAuth flow: sign in works
  - [ ] Test Microsoft OAuth flow: sign in works

- [x] **API Error Handling**
  - [x] Enhance error handling in `src/lib/api/client.ts`
  - [x] Add 401 error handling: redirect to login
  - [x] Add 500 error handling: show retry option
  - [x] Add network error handling: show offline message
  - [x] Add user-friendly toast notifications for all errors
  - [x] Add rate limit error handling (429)
  - [ ] Test error scenarios (manual testing needed)

- [ ] **First-Run Setup Wizard**
  - [ ] Detect first-time user (check `created_at` timestamp)
  - [ ] Create wizard component in frontend
  - [ ] Guide user to set OpenAI API key
  - [ ] Guide user to register first tool (optional)
  - [ ] Add skip option
  - [ ] Store completion status

- [x] **User Profile**
  - [x] Create profile page: `src/pages/Profile.tsx`
  - [x] Add API endpoint: `PUT /users/profile` (update email/avatarUrl)
  - [x] Add API endpoint: `PUT /users/password` (change password - placeholder)
  - [x] Implement frontend form with validation
  - [ ] Test profile updates (manual testing needed)

## Core AI & Workflows

- [x] **PDF Parsing Fix (CRITICAL)**
  - [x] Simplified pdf-parse import strategy (CommonJS require as primary)
  - [x] Added PDF buffer validation (magic bytes check)
  - [x] Added file size limit (50MB) with clear error messages
  - [x] Improved error handling for corrupted/timeout/too-large PDFs
  - [x] Enhanced timeout protection (60 seconds)
  - [x] Added result validation after parsing
  - [x] Improved OCR fallback logic (skips corrupted/too-large files)
  - [x] Created test script: `backend/test-pdf-parsing-improved.js`
  - [ ] Test PDF parsing with text-based PDF (manual testing needed)
  - [ ] Test PDF parsing with scanned PDF (manual testing needed)
  - [ ] Test PDF parsing with embedded images (manual testing needed)
  - [ ] Test with large PDFs (>10MB) (manual testing needed)

- [ ] **AI Key Storage**
  - [ ] Review `user_api_keys` table structure
  - [ ] Implement encryption for API keys at rest
  - [ ] Add API endpoint: `POST /api-keys` (store user key)
  - [ ] Add API endpoint: `GET /api-keys` (list user keys)
  - [ ] Add API endpoint: `DELETE /api-keys/:provider` (delete key)
  - [ ] Update Tool Proxy Service to use user keys
  - [ ] Add fallback to global keys if user key missing
  - [ ] Test key storage and retrieval
  - [ ] Verify keys never logged

- [x] **Tool Registration UI**
  - [x] Create tool registration form: `src/components/tools/ToolRegistrationForm.tsx`
  - [x] Create tool list component: `src/components/tools/ToolList.tsx`
  - [x] Create tool management page: `src/pages/Tools.tsx`
  - [x] Connect to existing `POST /tools` API
  - [x] Add tool approval functionality
  - [ ] Add tool editing functionality (API exists, UI needs connection)
  - [ ] Add tool deletion functionality (API needs to be created)
  - [ ] Test end-to-end: register → list → approve

- [ ] **Example Workflows**
  - [ ] Create "Summarize Document" workflow (PDF → extract → summarize)
  - [ ] Create "Analyze Codebase" workflow (code → analyze → report)
  - [ ] Create "Email Analysis" workflow (email → sentiment → summary)
  - [ ] Test each workflow end-to-end
  - [ ] Store workflows in database or JSON files
  - [ ] Make workflows available in UI

## Billing & Monetization

- [x] **Stripe Integration**
  - [ ] Create Stripe account (needs manual setup)
  - [ ] Get `STRIPE_SECRET_KEY` from Stripe dashboard (needs manual setup)
  - [ ] Set `STRIPE_SECRET_KEY` in `backend/.env` (needs manual setup)
  - [x] Install Stripe SDK: `npm install stripe` (already installed)
  - [x] Implement webhook handler in `backend/services/billing-service/src/controllers/billing-controller.ts`
  - [x] Handle `customer.subscription.created` event
  - [x] Handle `customer.subscription.updated` event
  - [x] Handle `customer.subscription.deleted` event
  - [x] Handle `invoice.payment_succeeded` event
  - [x] Handle `invoice.payment_failed` event
  - [x] Update user subscription status in database
  - [x] Verify webhook signature validation
  - [ ] Test with Stripe CLI: `stripe listen --forward-to localhost:3000/billing/webhook/stripe` (needs Stripe keys)

- [x] **Credit Balance Display**
  - [x] Add API endpoint: `GET /billing/credits` (get current balance)
  - [x] Create credit balance component: `src/components/billing/CreditBalance.tsx`
  - [x] Add credit balance to navigation/header
  - [x] Add real-time updates (polling every 30 seconds)
  - [x] Add low credit warning (< 100 credits)
  - [ ] Test credit display updates (manual testing needed)

- [x] **Credit Deduction**
  - [x] Connect Job Orchestration Service to Billing Service
  - [x] Calculate credit cost based on job complexity (sum of tool costs per step)
  - [x] Deduct credits after job completion
  - [x] Handle insufficient credits (check before deduction, log warning)
  - [x] Document credit cost calculation (in code comments)
  - [ ] Add credit refund for failed jobs (optional - credits only deducted on success)
  - [ ] Test credit deduction flow (manual testing needed)

## Documentation & Developer Experience

- [ ] **Documentation Update**
  - [ ] Review `README.md` for accuracy
  - [ ] Review `backend/README.md` for accuracy
  - [ ] Update all setup guides in `backend/` directory
  - [ ] Verify all code examples work
  - [ ] Check all links are working
  - [ ] Add troubleshooting section
  - [ ] Document all environment variables in `env.example`
  - [ ] Update API documentation if needed

- [ ] **Docker Compose**
  - [ ] Test `docker-compose up` starts all services
  - [ ] Verify all health checks pass
  - [ ] Test service-to-service communication
  - [ ] Document local development setup
  - [ ] Add development scripts to `package.json`
  - [ ] Test one-command setup works

- [ ] **Testing**
  - [ ] Add unit tests for Billing Service
  - [ ] Add unit tests for Job Orchestration Service
  - [ ] Add integration tests for critical flows
  - [ ] Test authentication flow end-to-end
  - [ ] Test file upload flow end-to-end
  - [ ] Test job processing flow end-to-end
  - [ ] Verify test coverage > 60%

## Completion Checklist

- [ ] All infrastructure services running
- [ ] All authentication methods working
- [ ] PDF parsing works for all PDF types
- [ ] Users can register and use tools
- [ ] Stripe integration complete
- [ ] Credit system functional
- [ ] Documentation complete
- [ ] Local development environment works
- [ ] All critical bugs fixed


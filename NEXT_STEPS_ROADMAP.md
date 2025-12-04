# UAOL Next Steps Roadmap

## 🎯 Priority 1: Guest Mode + Core User Experience (Week 1)

### 1.0 Guest Mode ⚠️ **HIGHEST PRIORITY**
**Status**: Planning phase

**Strategy**: Allow users to use UAOL without registration
- Generous free tier: 1,000 credits per session
- All core features available (chat, workflows, tools)
- "Sign up to save" prompts for conversion
- No OAuth needed for MVP

**Why First**: Lowest barrier to entry, faster MVP launch

**Tasks**:
- [ ] Create optional authentication middleware
- [ ] Add guest user support to database
- [ ] Update services to support guest mode
- [ ] Add guest rate limiting
- [ ] Frontend guest session management
- [ ] "Sign up" prompts in UI

**See**: `GUEST_MODE_IMPLEMENTATION.md` for detailed plan

---

### 1.1 Authentication Flow (Optional Registration)
**Status**: Backend ready, Frontend missing

**Note**: OAuth (Google, Outlook, iCloud) is **NOT needed for MVP**. It's only for accessing user's data (Drive, Calendar) - an enhancement, not core functionality.

**Strategy**: 
- Guest mode = default (no registration)
- Email/API key registration = optional upgrade
- OAuth = deferred (not blocking MVP)

**Tasks**:
- [ ] Create login page (`src/pages/Login.tsx`)
  - Email + API key login (backend already supports this)
  - Simple email-only login for MVP
- [ ] Create registration page (`src/pages/Register.tsx`)
  - Email + password registration
  - Generate API key on registration
- [ ] Add user registration endpoint to auth service
- [ ] Implement protected routes (redirect to login if not authenticated)
- [ ] Add auth context/provider for global auth state
- [ ] Wire up login/logout in Header component

**Files to Create**:
- `src/pages/Login.tsx`
- `src/pages/Register.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`

**Backend Work**:
- ✅ Add `POST /auth/register` endpoint (email only - passwordless for MVP)
- ✅ Generate API key on user creation (automatic)
- ⏸️ Add email verification (optional for MVP - can add later)
- ⏸️ Add password support (optional - can add later if needed)

**Deferred**:
- ⏸️ OAuth integration (Google, Outlook, iCloud) - Will be added later
- ⏸️ Password-based authentication - Can add if needed

---

### 1.2 User Dashboard ⚠️ **HIGH PRIORITY**
**Status**: Backend ready, Frontend missing

**Tasks**:
- [ ] Create dashboard page showing:
  - Current credits balance
  - Subscription tier
  - Recent jobs/workflows
  - API key management
- [ ] Add credit purchase/management UI
- [ ] Display user profile information

**Files to Create**:
- `src/pages/Dashboard.tsx`
- `src/components/dashboard/CreditBalance.tsx`
- `src/components/dashboard/JobHistory.tsx`
- `src/components/dashboard/ApiKeyManager.tsx`

---

## 🎯 Priority 2: Tool & Workflow Management (Week 2)

### 2.1 Tool Registry UI ⚠️ **HIGH PRIORITY**
**Status**: Backend ready, Frontend missing

**Tasks**:
- [ ] Create tools listing page
- [ ] Add tool registration form
- [ ] Display tool details (methods, costs, status)
- [ ] Add tool search/filter functionality
- [ ] Implement tool approval workflow (for admins)

**Files to Create**:
- `src/pages/Tools.tsx`
- `src/components/tools/ToolList.tsx`
- `src/components/tools/ToolCard.tsx`
- `src/components/tools/RegisterToolForm.tsx`
- `src/components/tools/ToolDetails.tsx`

**API Endpoints** (already exist):
- `GET /tools` - List tools
- `POST /tools` - Register tool
- `GET /tools/:id` - Get tool details

---

### 2.2 Workflow Builder UI ⚠️ **HIGH PRIORITY**
**Status**: Backend ready, Frontend missing

**Tasks**:
- [ ] Create visual workflow builder page
- [ ] Add drag-and-drop workflow creation
- [ ] Implement workflow step configuration
- [ ] Add workflow templates
- [ ] Connect `/workflow` command to open builder
- [ ] Wire up workflow execution from chat

**Files to Create**:
- `src/pages/WorkflowBuilder.tsx`
- `src/components/workflow/WorkflowCanvas.tsx`
- `src/components/workflow/NodePalette.tsx`
- `src/components/workflow/StepConfig.tsx`
- `src/components/workflow/WorkflowTemplates.tsx`

**Integration**:
- Connect to `POST /jobs` endpoint
- Show job status in real-time
- Display workflow execution results

---

## 🎯 Priority 3: Enhanced Chat & AI (Week 3)

### 3.1 Chat-to-Workflow Integration ⚠️ **MEDIUM PRIORITY**
**Status**: Partially implemented

**Tasks**:
- [ ] Implement natural language to workflow conversion
- [ ] Add workflow suggestions based on chat context
- [ ] Allow chat to execute workflows directly
- [ ] Show workflow execution progress in chat
- [ ] Display workflow results inline in chat

**Enhancements**:
- Use OpenAI to parse workflow requests from chat
- Generate workflow definitions from user descriptions
- Execute workflows and stream results back to chat

---

### 3.2 Chat History & Context ⚠️ **MEDIUM PRIORITY**
**Status**: Not implemented

**Tasks**:
- [ ] Add chat history persistence (database)
- [ ] Implement conversation context
- [ ] Add chat export functionality
- [ ] Create chat sessions/threads

**Backend Work**:
- Create `chat_messages` table
- Add `POST /chat/history` endpoint
- Store chat context for workflow suggestions

---

## 🎯 Priority 4: Advanced Features (Week 4+)

### 4.1 Job Management UI ⚠️ **MEDIUM PRIORITY**
**Status**: Backend ready, Frontend missing

**Tasks**:
- [ ] Create jobs listing page
- [ ] Add job status monitoring
- [ ] Implement job cancellation
- [ ] Show job execution logs
- [ ] Add job retry functionality

**Files to Create**:
- `src/pages/Jobs.tsx`
- `src/components/jobs/JobList.tsx`
- `src/components/jobs/JobCard.tsx`
- `src/components/jobs/JobLogs.tsx`

---

### 4.2 Billing & Credits UI ⚠️ **MEDIUM PRIORITY**
**Status**: Backend ready, Frontend missing

**Tasks**:
- [ ] Create billing dashboard
- [ ] Add Stripe payment integration UI
- [ ] Show credit purchase options
- [ ] Display usage analytics
- [ ] Add subscription management

**Files to Create**:
- `src/pages/Billing.tsx`
- `src/components/billing/CreditPurchase.tsx`
- `src/components/billing/UsageChart.tsx`
- `src/components/billing/SubscriptionPlan.tsx`

---

### 4.3 Storage & File Management ⚠️ **LOW PRIORITY**
**Status**: Backend ready, Frontend missing

**Tasks**:
- [ ] Create file upload interface
- [ ] Add file browser/manager
- [ ] Implement file sharing
- [ ] Add file preview functionality

---

## 🔧 Technical Improvements

### Infrastructure
- [ ] Set up Redis for caching (optional)
- [ ] Configure Kafka/SQS for message queue (currently using mock)
- [ ] Add rate limiting UI feedback
- [ ] Implement request retry logic
- [ ] Add error boundary components

### Testing
- [ ] Add E2E tests for critical flows
- [ ] Add unit tests for API client
- [ ] Add integration tests for workflows

### Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] User guide
- [ ] Developer setup guide
- [ ] Deployment guide

---

## 📋 Recommended Implementation Order

### **Phase 1: Foundation (Do First)**
1. ✅ Chat with OpenAI (DONE)
2. ⚠️ Authentication UI (Login/Register)
3. ⚠️ Protected Routes
4. ⚠️ User Dashboard

### **Phase 2: Core Features**
5. ⚠️ Tool Registry UI
6. ⚠️ Workflow Builder UI
7. ⚠️ Job Management UI

### **Phase 3: Integration**
8. ⚠️ Chat-to-Workflow conversion
9. ⚠️ Workflow execution from chat
10. ⚠️ Real-time job status updates

### **Phase 4: Polish**
11. ⚠️ Billing UI
12. ⚠️ Storage UI
13. ⚠️ Advanced features

---

## 🚀 Quick Wins (Can Do Now)

1. **Add `/auth/me` endpoint** - Already in API client, just needs backend route
2. **Create simple login page** - Use existing auth service
3. **Add protected route wrapper** - Simple React component
4. **Display user credits in header** - Use existing API
5. **Add tool listing page** - Use existing `/tools` endpoint

---

## 💡 Next Immediate Steps

1. **Create authentication pages** (2-3 hours)
   - Login form
   - Register form
   - Auth context

2. **Add protected routes** (1 hour)
   - Route guard component
   - Redirect logic

3. **Create user dashboard** (3-4 hours)
   - Credit display
   - Job history
   - Profile info

**Total: ~6-8 hours for MVP authentication and dashboard**

---

## 📝 Notes

- All backend APIs are ready and working
- Frontend API client is set up
- Database schema is complete
- Focus on UI/UX integration first
- Add advanced features incrementally


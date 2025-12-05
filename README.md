# UAOL - Universal AI Orchestration Layer

A comprehensive microservices platform for orchestrating AI workflows, managing MCP (Model Context Protocol) tools, and executing complex multi-step AI tasks.

## 🚀 Features

- **Microservices Architecture**: Decoupled, scalable backend services
- **AI Chat Interface**: Interactive chat with OpenAI integration
- **Workflow Orchestration**: Execute complex multi-step AI workflows
- **MCP Tool Management**: Register and manage Model Context Protocol tools
- **Credit System**: Built-in billing and credit management
- **Modern Frontend**: React + TypeScript + Tailwind CSS UI

## 🐛 Help Wanted: Critical Bug Bounty

We're looking for help fixing a **critical PDF parsing issue** that blocks document analysis. See [`doc/PDF_PARSING_BUG_BOUNTY.md`](doc/PDF_PARSING_BUG_BOUNTY.md) for details.

**Status**: 🔴 Open for contribution  
**Impact**: Blocks PDF text extraction for all users  
**Bounty**: Community recognition + future collaboration opportunities

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **npm** 9.x or higher
- **Database**: CockroachDB (recommended for production), Supabase, or PostgreSQL
- **OpenAI API Key** (for AI chat functionality)

## 🏗️ Architecture

### Backend Services

- **API Gateway** (Port 3000): Main entry point, routes requests to services
- **Auth Service** (Port 3001): User authentication and API key management
- **Tool Registry Service** (Port 3002): MCP tool registration and management
- **Job Orchestration Service** (Port 3003): Workflow execution engine
- **Tool Proxy Service** (Port 3004): Proxies requests to MCP tools
- **Billing Service** (Port 3005): Credit management and billing
- **Storage Service** (Port 3006): File storage and management

### Frontend

- **React** + **TypeScript**
- **Vite** for fast development
- **Tailwind CSS** for styling
- **shadcn/ui** component library

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/mcpmessenger/uaol.git
cd uaol
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Edit .env and set your configuration:
# - DATABASE_URL (CockroachDB, Supabase, or PostgreSQL connection string)
# - OPENAI_API_KEY (your OpenAI API key)
# - JWT_SECRET (generate a secure random string)
```

#### Database Setup

**Option A: CockroachDB (Primary Recommendation for Production)**

CockroachDB is a cloud-native, distributed SQL database built for global scale and resilience. It is the **recommended database** for UAOL production deployments.

**Why CockroachDB?**
- ✅ **Operational Simplicity**: Self-healing and requires minimal operational overhead, allowing the team to focus on feature development
- ✅ **Strong Consistency**: Serializable isolation - the highest level of transactional consistency, critical for the Billing Service
- ✅ **High Availability**: Automatic replication across nodes and zones with built-in fault tolerance and instant recovery from node failures
- ✅ **PostgreSQL Wire-Protocol Compatibility**: Compatible with PostgreSQL wire protocol and most SQL syntax, making migration from Supabase straightforward

1. Create a CockroachDB Cloud account at https://cockroachlabs.cloud (free tier available)
2. Create a cluster and get your connection string from the **Connect** button
3. Add to `backend/.env`: `DATABASE_URL=postgresql://[user]:[password]@[host]:26257/[database]?sslmode=require`

**Note**: `DATABASE_URL` goes in the **backend** `.env` file, not the frontend. The frontend never connects directly to the database.

See [COCKROACHDB_SETUP.md](backend/COCKROACHDB_SETUP.md) for detailed setup instructions.
See [GET_COCKROACHDB_CREDENTIALS.md](backend/GET_COCKROACHDB_CREDENTIALS.md) for help getting your username and password.

**Option B: Supabase (Recommended for Development)**

1. Create a Supabase project at https://supabase.com
2. Get your connection string from Settings → Database → Connection string
3. Use the "Session Pooler" connection string (IPv4 compatible)
4. Add to `backend/.env`: `DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`

**Option C: Local PostgreSQL**

1. Install PostgreSQL locally
2. Create database: `createdb uaol`
3. Add to `backend/.env`: `DATABASE_URL=postgresql://user:password@localhost:5432/uaol`

#### Run Database Migrations

```bash
npm run migrate
```

#### Start Backend Services

```bash
npm run dev
```

All services will start concurrently. You should see:
```
[api-gateway] API Gateway listening on port 3000
[auth] Auth Service listening on port 3001
...
```

### 3. Frontend Setup

```bash
# From project root
npm install

# Create .env file
echo "VITE_API_BASE_URL=http://localhost:3000" > .env

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:8080`

## 📁 Project Structure

```
uaol/
├── backend/                 # Backend microservices
│   ├── services/           # Individual microservices
│   │   ├── api-gateway/   # API Gateway service
│   │   ├── auth-service/  # Authentication service
│   │   ├── tool-registry-service/
│   │   ├── job-orchestration-service/
│   │   ├── tool-proxy-service/
│   │   ├── billing-service/
│   │   └── storage-service/
│   ├── shared/            # Shared libraries
│   │   ├── database/      # Database models and connection
│   │   ├── mcp/           # MCP client implementation
│   │   ├── auth/          # JWT utilities
│   │   ├── logger/        # Logging utilities
│   │   └── errors/         # Custom error classes
│   ├── env.example        # Environment variables template
│   └── package.json       # Root package.json with workspaces
├── src/                    # Frontend React application
│   ├── components/        # React components
│   ├── lib/               # Utilities and API client
│   └── pages/             # Page components
├── .env                   # Frontend environment variables
└── README.md             # This file
```

## 🔧 Configuration

### Backend Environment Variables

See `backend/env.example` for all available options. Key variables:

- `DATABASE_URL`: Database connection string (CockroachDB, Supabase, or PostgreSQL)
- `OPENAI_API_KEY`: OpenAI API key for chat functionality
- `JWT_SECRET`: Secret for JWT token signing
- `API_GATEWAY_PORT`: Port for API Gateway (default: 3000)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID (optional, for OAuth login)
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret (optional, for OAuth login)
- `OUTLOOK_CLIENT_ID`: Microsoft Outlook OAuth client ID (optional, for OAuth login)
- `OUTLOOK_CLIENT_SECRET`: Microsoft Outlook OAuth client secret (optional, for OAuth login)
- `OUTLOOK_TENANT`: Microsoft tenant (default: "common" for both personal and work accounts)
- `ICLOUD_CLIENT_ID`: Apple Service ID (optional, for Sign in with Apple)
- `ICLOUD_CLIENT_SECRET`: Apple JWT client secret (optional, for Sign in with Apple)

### Frontend Environment Variables

- `VITE_API_BASE_URL`: Backend API Gateway URL (default: http://localhost:3000)

## 🔐 Authentication

UAOL supports multiple authentication methods:

- **Email/API Key**: Simple email-based login with auto-generated API keys
- **OAuth Login**: Sign in with Google, Microsoft Outlook, or Apple (Sign in with Apple)
  - See [OAUTH_SETUP_GUIDE.md](OAUTH_SETUP_GUIDE.md) for setup instructions
  - See [OUTLOOK_OAUTH_SETUP.md](OUTLOOK_OAUTH_SETUP.md) for detailed Outlook setup
  - See [ICLOUD_OAUTH_SETUP.md](ICLOUD_OAUTH_SETUP.md) for Apple Sign In setup
  - Requires OAuth credentials in `backend/.env`

## 📚 Documentation

- [Backend Quick Start](backend/QUICKSTART.md) - Detailed backend setup guide
- [Database Setup](backend/DATABASE_SETUP.md) - Database configuration guide
- [OAuth Setup Guide](OAUTH_SETUP_GUIDE.md) - Complete OAuth authentication setup (Google, Outlook, iCloud)
- [Outlook OAuth Setup](OUTLOOK_OAUTH_SETUP.md) - Detailed Microsoft Outlook setup guide
- [Apple Sign In Setup](ICLOUD_OAUTH_SETUP.md) - Apple Sign In (iCloud) setup guide
- [Frontend Setup](FRONTEND_SETUP.md) - Frontend configuration
- [Troubleshooting](backend/TROUBLESHOOTING.md) - Common issues and solutions

## 🧪 Testing

```bash
# Test backend services
cd backend
npm test

# Test frontend
npm test
```

## 🐳 Docker Support

```bash
cd backend
docker-compose up -d
```

## 📝 API Endpoints

### Authentication
- `POST /auth/login` - User login (email or API key)
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user
- `GET /auth/google` - Initiate Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/outlook` - Initiate Outlook/Microsoft OAuth login
- `GET /auth/outlook/callback` - Outlook OAuth callback
- `GET /auth/icloud` - Initiate Apple Sign In (iCloud OAuth)
- `GET /auth/icloud/callback` - Apple Sign In callback

### Tools
- `GET /tools` - List registered tools
- `POST /tools` - Register a new tool
- `GET /tools/:id` - Get tool details

### Jobs
- `POST /jobs` - Create a workflow job
- `GET /jobs/:id` - Get job status
- `GET /jobs` - List user's jobs

### Chat
- `POST /chat` - Send chat message (returns AI response)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Lovable](https://lovable.dev)
- **Database**: Supports CockroachDB (recommended for production), Supabase, and PostgreSQL
- [OpenAI](https://openai.com) for AI capabilities

## 📞 Support

**Need Help?**
- 🆘 **General Help**: See [GET_HELP.md](GET_HELP.md) for support options
- 🗄️ **CockroachDB Issues**: See [COCKROACHDB_HELP.md](COCKROACHDB_HELP.md) for quick fixes
- 🐛 **Report Bugs**: Open an issue on [GitHub Issues](https://github.com/mcpmessenger/uaol/issues)
- 📚 **Troubleshooting**: See [backend/TROUBLESHOOTING.md](backend/TROUBLESHOOTING.md) for common issues

---

**Note**: This is an active development project. Some features may be in progress or experimental.

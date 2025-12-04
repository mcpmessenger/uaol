# UAOL Backend - Quick Start Guide

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 15+ (or Docker)
- Redis (or Docker)
- Docker & Docker Compose (optional, for full stack)

## Local Development Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration values.

### 3. Set Up Database

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be healthy, then run migrations
npm run migrate
```

#### Option B: Using Local Services

1. Start PostgreSQL and Redis locally
2. Update `DATABASE_URL` and `REDIS_URL` in `.env`
3. Run migrations:
```bash
npm run migrate
```

### 4. Start Services

#### Option A: Start All Services (Development)

```bash
npm run dev
```

This will start all services concurrently using `concurrently`.

#### Option B: Start Services Individually

```bash
# Terminal 1 - Auth Service
cd services/auth-service
npm run dev

# Terminal 2 - Tool Registry Service
cd services/tool-registry-service
npm run dev

# Terminal 3 - Job Orchestration Service
cd services/job-orchestration-service
npm run dev

# Terminal 4 - Tool Proxy Service
cd services/tool-proxy-service
npm run dev

# Terminal 5 - Billing Service
cd services/billing-service
npm run dev

# Terminal 6 - Storage Service
cd services/storage-service
npm run dev

# Terminal 7 - API Gateway (Optional)
cd services/api-gateway
npm run dev
```

### 5. Using Docker Compose (Full Stack)

```bash
# Build and start all services
docker-compose up --build

# Or in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Service Endpoints

Once running, services will be available at:

- **API Gateway**: http://localhost:3000
- **Auth Service**: http://localhost:3001
- **Tool Registry Service**: http://localhost:3002
- **Job Orchestration Service**: http://localhost:3003
- **Tool Proxy Service**: http://localhost:3004
- **Billing Service**: http://localhost:3005
- **Storage Service**: http://localhost:3006

## Testing the API

### 1. Create a User (via Auth Service)

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 2. Register a Tool (via Tool Registry Service)

```bash
curl -X POST http://localhost:3002/tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Tool",
    "gateway_url": "https://api.example.com/mcp",
    "credit_cost_per_call": 1
  }'
```

### 3. Create a Job (via Job Orchestration Service)

```bash
curl -X POST http://localhost:3003/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "workflow_definition": {
      "steps": [
        {
          "id": "step1",
          "tool_id": "TOOL_ID",
          "action": "method_name",
          "parameters": {}
        }
      ]
    }
  }'
```

## Project Structure

```
backend/
├── shared/                 # Shared libraries
│   ├── database/          # Database models and connection
│   ├── mcp/               # MCP client implementation
│   ├── mq/                # Message queue abstraction
│   ├── auth/              # JWT utilities
│   ├── logger/            # Logging utilities
│   └── errors/            # Custom error classes
├── services/              # Microservices
│   ├── auth-service/
│   ├── tool-registry-service/
│   ├── job-orchestration-service/
│   ├── tool-proxy-service/
│   ├── billing-service/
│   ├── storage-service/
│   └── api-gateway/
├── docker-compose.yml     # Docker setup
└── package.json          # Root package.json
```

## Next Steps

1. **Implement External Integrations**:
   - Complete Google OAuth flow
   - Integrate Stripe for billing
   - Implement AWS S3 for storage
   - Set up Kafka/SQS message queue

2. **Add Monitoring**:
   - Set up logging aggregation
   - Add metrics collection
   - Implement health checks

3. **Security Hardening**:
   - Implement secrets management
   - Add input validation
   - Set up rate limiting with Redis

4. **Testing**:
   - Add unit tests
   - Add integration tests
   - Set up CI/CD pipeline

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Verify database exists: `psql -U uaol -d uaol`

### Port Already in Use

- Change port in `.env` for the conflicting service
- Or stop the service using that port

### Module Not Found Errors

- Run `npm install` in the root `backend` directory
- Ensure all workspace dependencies are installed

## Additional Resources

- See `README.md` for detailed architecture documentation
- Check individual service directories for service-specific documentation


# UAOL Backend

Microservices backend for the Universal AI Orchestration Layer.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Run database migrations:**
   ```bash
   npm run migrate
   ```

4. **Start all services:**
   ```bash
   npm run dev
   ```

## Services

- **API Gateway** (3000): Main entry point
- **Auth Service** (3001): Authentication
- **Tool Registry** (3002): MCP tool management
- **Job Orchestration** (3003): Workflow execution
- **Tool Proxy** (3004): MCP tool proxying
- **Billing** (3005): Credit management
- **Storage** (3006): File storage

## Documentation

- [Quick Start Guide](QUICKSTART.md)
- [Database Setup](DATABASE_SETUP.md)
- [Troubleshooting](TROUBLESHOOTING.md)

## Scripts

- `npm run dev` - Start all services in development mode
- `npm run build` - Build all services
- `npm run migrate` - Run database migrations
- `npm test` - Run tests
- `npm run lint` - Lint code

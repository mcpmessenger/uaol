FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared and service files
COPY shared/ ./shared/
COPY services/collaboration-service/ ./services/collaboration-service/
COPY package.json tsconfig.json ./

# Install dependencies
RUN npm install

# Build
WORKDIR /app/services/collaboration-service
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/services/collaboration-service/dist ./dist
COPY --from=builder /app/services/collaboration-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3007

CMD ["node", "dist/index.js"]

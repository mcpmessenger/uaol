FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared and service files
COPY shared/ ./shared/
COPY services/auth-service/ ./services/auth-service/
COPY package.json tsconfig.json ./

# Install dependencies
RUN npm install

# Build
WORKDIR /app/services/auth-service
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/services/auth-service/dist ./dist
COPY --from=builder /app/services/auth-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/index.js"]


FROM node:20-alpine AS builder

WORKDIR /app

COPY shared/ ./shared/
COPY services/job-orchestration-service/ ./services/job-orchestration-service/
COPY package.json tsconfig.json ./

RUN npm install

WORKDIR /app/services/job-orchestration-service
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/shared ./shared
COPY --from=builder /app/services/job-orchestration-service/dist ./dist
COPY --from=builder /app/services/job-orchestration-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3003

CMD ["node", "dist/index.js"]


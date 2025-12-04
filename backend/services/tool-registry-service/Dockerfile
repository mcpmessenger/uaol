FROM node:20-alpine AS builder

WORKDIR /app

COPY shared/ ./shared/
COPY services/tool-registry-service/ ./services/tool-registry-service/
COPY package.json tsconfig.json ./

RUN npm install

WORKDIR /app/services/tool-registry-service
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/shared ./shared
COPY --from=builder /app/services/tool-registry-service/dist ./dist
COPY --from=builder /app/services/tool-registry-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3002

CMD ["node", "dist/index.js"]


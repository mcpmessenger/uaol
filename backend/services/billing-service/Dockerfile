FROM node:20-alpine AS builder

WORKDIR /app

COPY shared/ ./shared/
COPY services/billing-service/ ./services/billing-service/
COPY package.json tsconfig.json ./

RUN npm install

WORKDIR /app/services/billing-service
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/shared ./shared
COPY --from=builder /app/services/billing-service/dist ./dist
COPY --from=builder /app/services/billing-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3005

CMD ["node", "dist/index.js"]


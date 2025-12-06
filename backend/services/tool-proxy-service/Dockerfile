FROM node:20-alpine AS builder

WORKDIR /app

COPY shared/ ./shared/
COPY services/tool-proxy-service/ ./services/tool-proxy-service/
COPY package.json tsconfig.json ./

RUN npm install

WORKDIR /app/services/tool-proxy-service
RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Install Chromium and dependencies for Playwright
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

# Set environment variables for Playwright to use system Chromium
# In Alpine, chromium is typically at /usr/bin/chromium-browser or /usr/bin/chromium
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY --from=builder /app/shared ./shared
COPY --from=builder /app/services/tool-proxy-service/dist ./dist
COPY --from=builder /app/services/tool-proxy-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3004

CMD ["node", "dist/index.js"]


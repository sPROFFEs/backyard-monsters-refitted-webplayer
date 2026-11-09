# Dockerfile for Backyard Monsters Refitted - Web Launcher
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json ./
RUN npm install --omit=dev

# Copy application code and public web assets (including SWF and Ruffle)
COPY server.js ./
COPY public/ ./public/

# Default Environment Configuration
ENV PORT=8080
ENV NODE_ENV=production
ENV DEFAULT_SERVER_URL=https://server.bymrefitted.com/
ENV DEFAULT_CDN_URL=https://cdn.bymrefitted.com/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/launcher/config || exit 1

CMD ["node", "server.js"]

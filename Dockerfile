# EarthSonic Backend Service Dockerfile (/server + /shared)
FROM node:22-alpine AS base

WORKDIR /app

# Copy root and workspace package manifests
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY web/package.json ./web/

# Install dependencies across workspaces
RUN npm ci

# Copy shared and server source + committed snapshots
COPY shared ./shared
COPY server ./server

# Typecheck shared and server before running
RUN npm run build --workspace=shared && npm run build --workspace=server

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
EXPOSE 3001

# Start the Fastify API server via tsx
CMD ["npm", "run", "start", "--workspace=server"]

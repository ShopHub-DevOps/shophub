# syntax=docker/dockerfile:1

# Build stage: install all dependencies and compile TypeScript to JavaScript.
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage: production-only dependencies and the compiled output.
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

# 127.0.0.1, not localhost: the server binds 0.0.0.0 (IPv4 only), while
# localhost resolves to ::1 first, so the probe would be refused.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "dist/main"]

# ===========================================
# Study Teddy Backend Dockerfile (NestJS)
# ===========================================

# Base image with Node.js and Bun
FROM oven/bun:1.2.22-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    ca-certificates \
    curl \
    dumb-init \
    git \
    openssl \
    postgresql-client \
    tzdata

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# ===========================================
# Dependencies Stage
# ===========================================
FROM base AS deps

# Copy package files
COPY package.json bun.lockb ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/validators/package.json ./packages/validators/

# Install dependencies
RUN bun install --frozen-lockfile --production=false

# ===========================================
# Builder Stage
# ===========================================
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy source code
COPY . .

# Build shared packages
RUN bun run build:packages

# Build backend application
WORKDIR /app/apps/backend
RUN bun run build

# Clean up dev dependencies
RUN bun install --frozen-lockfile --production

# ===========================================
# Production Stage
# ===========================================
FROM base AS production

# Set NODE_ENV
ENV NODE_ENV=production

# Set timezone
ENV TZ=UTC

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package.json ./package.json

# Copy shared packages
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

# Copy necessary files
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/.env.example ./.env.example

# Create uploads directory
RUN mkdir -p uploads && chown nestjs:nodejs uploads

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["dumb-init", "bun", "run", "start:prod"]
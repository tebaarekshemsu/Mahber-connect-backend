# ---- Build Stage ----
FROM node:18-alpine AS builder
WORKDIR /app

# Install pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
COPY package.json ./
COPY prisma ./prisma
RUN pnpm install --no-frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm prisma generate --schema prisma/schema.prisma
RUN pnpm run build

# ---- Production Stage ----
FROM node:18-alpine
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copy built artifacts and dependencies from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs package.json ./
COPY --chown=nestjs:nodejs prisma ./prisma
COPY --chown=nestjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]

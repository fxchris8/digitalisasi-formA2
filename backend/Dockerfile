# Stage 1: Build
FROM node:22-alpine AS build

RUN apk upgrade --no-cache

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests (layer cache-friendly)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json  ./backend/
COPY frontend/package.json ./frontend/

# Install semua deps (termasuk devDeps untuk TypeScript compiler)
RUN pnpm install --frozen-lockfile

# Copy source backend
COPY backend/ ./backend/

# Compile TypeScript → dist/
WORKDIR /app/backend
RUN pnpm run build

# Rewrite @/ path aliases di compiled output (tsc tidak melakukan ini otomatis)
RUN npx --yes tsc-alias -p tsconfig.json

# Buat isolated production deployment — hanya prod deps, siap di-copy ke runner
# pnpm deploy menangani ekstraksi deps dari workspace secara otomatis
WORKDIR /app
RUN pnpm deploy --filter backend --prod /deploy

# Stage 2: Production
FROM node:22-alpine AS runner

# Update alpine packages untuk mitigasi known vulnerabilities
RUN apk upgrade --no-cache

WORKDIR /app

# Production node_modules dari pnpm deploy (sudah terisolasi, tanpa devDeps)
COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /deploy/package.json ./package.json

# Compiled output dari stage build
COPY --from=build /app/backend/dist ./dist

# Buat direktori storage untuk upload file
RUN mkdir -p storage

EXPOSE 3000

CMD ["node", "dist/index.js"]

# Stage 1: Build
FROM node:22-alpine AS build

RUN apk upgrade --no-cache

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests (layer cache-friendly)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json  ./backend/
COPY frontend/package.json ./frontend/

# Install semua deps
RUN pnpm install --frozen-lockfile

# Copy source frontend
COPY frontend/ ./frontend/

WORKDIR /app/frontend

# VITE_API_URL: kosongkan agar request ke /api/* ke origin yang sama
# (nginx akan meneruskan ke container backend).
# Override via --build-arg jika backend ada di domain terpisah.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm run build


# Stage 2: Production (Nginx)
FROM nginx:stable-alpine AS runner

RUN apk upgrade --no-cache

# Salin hasil build ke direktori default nginx
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Salin konfigurasi nginx custom
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

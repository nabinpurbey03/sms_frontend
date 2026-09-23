# ==============================================================================
# PBAC Frontend — Production Multi-Stage Dockerfile
# ==============================================================================
# Stage 1: Dependency resolution with layer caching
# Stage 2: Application compilation & TypeScript check (Vite build)
# Stage 3: Minimal unprivileged Nginx web server (~23MB total image)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependencies Cache Layer
# ------------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Check package files and install production + dev dependencies for build
COPY package.json package-lock.json ./

# Install cleanly from lockfile with cached downloads
RUN npm ci --prefer-offline --no-audit

# ------------------------------------------------------------------------------
# Stage 2: Application Builder
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy cached dependencies from Stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Vite build arguments with sensible defaults
# Leaving VITE_API_BASE_URL empty instructs the client to use relative URLs,
# allowing Nginx to reverse proxy /api/v1 and /uploads directly with zero CORS.
ARG VITE_API_BASE_URL=""
ARG VITE_API_VERSION="/api/v1"
ARG VITE_TENANT_HEADER_NAME="X-Tenant-ID"
ARG VITE_APP_NAME="Schools Up Pro"

# Inject build arguments into environment for Vite compilation
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_VERSION=$VITE_API_VERSION \
    VITE_TENANT_HEADER_NAME=$VITE_TENANT_HEADER_NAME \
    VITE_APP_NAME=$VITE_APP_NAME \
    NODE_ENV=production

# Compile TypeScript and build production bundle into /app/dist
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Minimal Production Web Server (Unprivileged Nginx)
# ------------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# Metadata labels
LABEL maintainer="PBAC Team" \
      description="PBAC Multi-Tenant School Management Frontend" \
      version="1.0.0"

# Remove default Nginx virtual host configurations
RUN rm -rf /etc/nginx/conf.d/*

# Copy hardened custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Expose unprivileged standard port
EXPOSE 8080

# Built-in healthcheck probe
HEALTHCHECK --interval=15s --timeout=3s --retries=3 --start-period=5s \
    CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

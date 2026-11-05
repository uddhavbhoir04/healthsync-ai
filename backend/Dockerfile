# ==============================================================================
# HealthSync AI — Backend Production Dockerfile (Node.js 22 LTS Alpine)
# ==============================================================================

FROM node:22-alpine AS runner

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Install dependencies (only production packages)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy application source code
COPY src/ ./src/
COPY server.js ./server.js

# Create non-root system user for security
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose HTTP port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/health || exit 1

# Start production server
CMD ["npm", "start"]


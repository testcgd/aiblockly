# Multi-stage Dockerfile for AIBlockly with MCP Integration
# This builds both the API and UI in a single optimized container

# Stage 1: Build UI
FROM node:18-alpine AS ui-builder

WORKDIR /app/ui

# Copy UI package files
COPY ui/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy UI source
COPY ui/ ./

# Build the UI
RUN npm run build

# Stage 2: Build final image
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy API package files
COPY api/package*.json ./api/

# Install API dependencies
WORKDIR /app/api
RUN npm ci --only=production

# Copy API source
COPY api/src ./src

# Copy built UI from builder stage
WORKDIR /app
COPY --from=ui-builder /app/ui/build ./ui/build

# Copy test MCP server (optional, for development)
COPY test-mcp-server ./test-mcp-server
WORKDIR /app/test-mcp-server
RUN npm ci --only=production

# Set working directory back to API
WORKDIR /app/api

# Create a startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting AIBlockly..."' >> /app/start.sh && \
    echo 'echo "API will be available on port 3001"' >> /app/start.sh && \
    echo 'exec node src/index.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["/app/start.sh"]

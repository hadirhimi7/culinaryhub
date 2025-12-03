# Production Dockerfile for CulinaryHub Backend
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build 2>/dev/null || npx tsc

# Create directories for uploads and logs
RUN mkdir -p uploads/posts uploads/files logs data

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start server
CMD ["node", "dist/server.js"]


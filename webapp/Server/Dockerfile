FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Debug: Show what we're trying to install
RUN echo "=== Package.json contents ===" && \
    cat package.json && \
    echo "=== Installing dependencies ===" && \
    npm install && \
    echo "=== Checking if tweetnacl is installed ===" && \
    npm ls tweetnacl && \
    echo "=== Listing all installed packages ===" && \
    ls -la node_modules/ | grep tweet && \
    npm cache clean --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S voidlink -u 1001

# Change ownership
RUN chown -R voidlink:nodejs /app
USER voidlink

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]
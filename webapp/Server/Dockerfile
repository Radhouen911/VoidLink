FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN echo "=== Installing dependencies ===" && \
    npm install && \
    echo "=== Dependencies installed successfully ===" && \
    npm cache clean --force

# Copy all source code including database files
COPY . .

# Verify that init.sql is copied correctly
RUN echo "=== Verifying init.sql file ===" && \
    ls -la src/database/ && \
    echo "=== init.sql file size ===" && \
    wc -c src/database/init.sql && \
    echo "=== init.sql first few lines ===" && \
    head -5 src/database/init.sql

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S voidlink -u 1001

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
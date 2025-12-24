#!/bin/bash

echo "🛑 Stopping VoidLink development environment..."

# Stop and remove containers
docker-compose down

# Optional: Remove volumes (uncomment if you want to reset database)
# docker-compose down -v

echo "🧹 Cleaning up unused Docker resources..."
docker system prune -f

echo "✅ VoidLink development environment stopped."
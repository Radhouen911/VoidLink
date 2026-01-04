#!/bin/bash

echo "🔐 Setting up VoidLink development environment..."

# Create environment file if it doesn't exist
if [ ! -f Server/.env ]; then
    echo "📝 Creating server environment file..."
    cp Server/.env.example Server/.env
fi

# Build and start containers
echo "🐳 Building Docker containers..."
docker compose build

echo "🚀 Starting VoidLink services..."
docker compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 15

# Check if services are running
echo "🔍 Checking service status..."
docker compose ps

echo "✅ VoidLink is ready!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000"
echo "🗄️ Database: localhost:5432"
echo ""
echo "🧪 Run tests:"
echo "   cd Server && node test/test-complete-flow.js"
echo "   cd Server && node test/test-enhanced-contacts.js"
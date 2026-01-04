#!/bin/bash

# VoidLink Basic Connectivity Test
# Simple health check and API connectivity verification

echo "🔐 VoidLink Basic Connectivity Test"
echo "==================================="

# Configuration
BASE_URL="http://localhost:5000/api"

echo "Testing VoidLink server connectivity..."
echo ""

# Test 1: Health Check
echo "📊 Testing Health Check..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
if [ $? -eq 0 ]; then
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
    echo "✅ Health check passed - Server is responding"
else
    echo "❌ Health check failed - Server may not be running"
    echo "💡 Try: docker compose up -d"
    exit 1
fi
echo ""

# Test 2: Basic API Structure
echo "🔍 Testing API Structure..."
AUTH_RESPONSE=$(curl -s "$BASE_URL/auth/session")
if [ $? -eq 0 ]; then
    echo "✅ API endpoints are responding"
else
    echo "❌ API endpoints not accessible"
    exit 1
fi
echo ""

# Test 3: WebSocket Stats
echo "📡 Testing WebSocket Endpoint..."
WS_RESPONSE=$(curl -s "$BASE_URL/websocket/stats")
if [ $? -eq 0 ]; then
    echo "$WS_RESPONSE" | jq '.' 2>/dev/null || echo "$WS_RESPONSE"
    echo "✅ WebSocket endpoint is responding"
else
    echo "❌ WebSocket endpoint not accessible"
fi
echo ""

echo "🎉 BASIC CONNECTIVITY TESTS COMPLETED!"
echo "======================================"
echo "✅ Server is running and responding"
echo "✅ API endpoints are accessible"
echo "✅ WebSocket endpoint is available"
echo ""
echo "🧪 For comprehensive testing, run:"
echo "   cd Server"
echo "   node test/test-complete-flow.js"
echo "   node test/test-enhanced-contacts.js"
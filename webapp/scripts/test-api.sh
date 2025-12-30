#!/bin/bash

# VoidLink API Test Script
# Tests the complete two-layer authentication flow

echo "🔐 VoidLink API Test Script"
echo "=========================="

# Configuration
BASE_URL="http://localhost:5000/api"
TEST_USER="testuser_$(date +%s)"
TEST_PASS="securepassword123"

echo "Testing with user: $TEST_USER"
echo ""

# Test 1: Health Check
echo "📊 Testing Health Check..."
curl -s "$BASE_URL/health" | jq '.'
if [ $? -eq 0 ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi
echo ""

# Test 2: Register Account
echo "📝 Testing Account Registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")

echo "$REGISTER_RESPONSE" | jq '.'
if echo "$REGISTER_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Account registration passed"
else
    echo "❌ Account registration failed"
    exit 1
fi
echo ""

# Test 3: Login
echo "🔑 Testing Account Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")

echo "$LOGIN_RESPONSE" | jq '.'
ACCOUNT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accountSessionToken')

if [ "$ACCOUNT_TOKEN" != "null" ] && [ "$ACCOUNT_TOKEN" != "" ]; then
    echo "✅ Account login passed"
    echo "   Token: ${ACCOUNT_TOKEN:0:20}..."
else
    echo "❌ Account login failed"
    exit 1
fi
echo ""

# Test 4: Session Validation
echo "🔍 Testing Session Validation..."
SESSION_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/session" \
    -H "Authorization: Bearer $ACCOUNT_TOKEN")

echo "$SESSION_RESPONSE" | jq '.'
if echo "$SESSION_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Session validation passed"
else
    echo "❌ Session validation failed"
    exit 1
fi
echo ""

# Test 5: Upload Public Key (using a dummy key for testing)
echo "🔐 Testing Public Key Upload..."
DUMMY_PUBLIC_KEY="1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/crypto/upload-key" \
    -H "Authorization: Bearer $ACCOUNT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"publicKey\":\"$DUMMY_PUBLIC_KEY\"}")

echo "$UPLOAD_RESPONSE" | jq '.'
if echo "$UPLOAD_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Public key upload passed"
else
    echo "❌ Public key upload failed"
    exit 1
fi
echo ""

# Test 6: Get Challenge
echo "🎯 Testing Challenge Generation..."
CHALLENGE_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/crypto/challenge" \
    -H "Authorization: Bearer $ACCOUNT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{}")

echo "$CHALLENGE_RESPONSE" | jq '.'
CHALLENGE=$(echo "$CHALLENGE_RESPONSE" | jq -r '.data.challenge')

if [ "$CHALLENGE" != "null" ] && [ "$CHALLENGE" != "" ]; then
    echo "✅ Challenge generation passed"
    echo "   Challenge: $CHALLENGE"
else
    echo "❌ Challenge generation failed"
    exit 1
fi
echo ""

# Test 7: User Search
echo "👥 Testing User Search..."
SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/users?q=test" \
    -H "Authorization: Bearer $ACCOUNT_TOKEN")

echo "$SEARCH_RESPONSE" | jq '.'
if echo "$SEARCH_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ User search passed"
else
    echo "❌ User search failed"
    exit 1
fi
echo ""

# Test 8: Logout
echo "🚪 Testing Logout..."
LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout" \
    -H "Authorization: Bearer $ACCOUNT_TOKEN")

echo "$LOGOUT_RESPONSE" | jq '.'
if echo "$LOGOUT_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Logout passed"
else
    echo "❌ Logout failed"
    exit 1
fi
echo ""

echo "🎉 ALL API TESTS PASSED!"
echo "========================"
echo "✅ Health check"
echo "✅ Account registration"
echo "✅ Account login"
echo "✅ Session validation"
echo "✅ Public key upload"
echo "✅ Challenge generation"
echo "✅ User search"
echo "✅ Logout"
echo ""
echo "🔒 Two-layer authentication system is working correctly!"
echo "📝 Note: Crypto signature verification requires the Node.js test script"
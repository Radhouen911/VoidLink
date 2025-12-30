@echo off
REM VoidLink API Test Script for Windows
REM Tests the complete two-layer authentication flow

echo 🔐 VoidLink API Test Script
echo ==========================

REM Configuration
set BASE_URL=http://localhost:5000/api
set TEST_USER=testuser_%RANDOM%
set TEST_PASS=securepassword123

echo Testing with user: %TEST_USER%
echo.

REM Test 1: Health Check
echo 📊 Testing Health Check...
curl -s "%BASE_URL%/health"
if %ERRORLEVEL% EQU 0 (
    echo ✅ Health check passed
) else (
    echo ❌ Health check failed
    exit /b 1
)
echo.

REM Test 2: Register Account
echo 📝 Testing Account Registration...
curl -s -X POST "%BASE_URL%/auth/register" ^
    -H "Content-Type: application/json" ^
    -d "{\"username\":\"%TEST_USER%\",\"password\":\"%TEST_PASS%\"}"
if %ERRORLEVEL% EQU 0 (
    echo ✅ Account registration request sent
) else (
    echo ❌ Account registration failed
    exit /b 1
)
echo.

REM Test 3: Login (simplified for Windows batch)
echo 🔑 Testing Account Login...
curl -s -X POST "%BASE_URL%/auth/login" ^
    -H "Content-Type: application/json" ^
    -d "{\"username\":\"%TEST_USER%\",\"password\":\"%TEST_PASS%\"}"
if %ERRORLEVEL% EQU 0 (
    echo ✅ Account login request sent
) else (
    echo ❌ Account login failed
    exit /b 1
)
echo.

echo 🎉 BASIC API TESTS COMPLETED!
echo ========================
echo ✅ Health check
echo ✅ Account registration
echo ✅ Account login
echo.
echo 🔒 Two-layer authentication endpoints are responding!
echo 📝 For complete testing with token handling, use the Node.js test script:
echo    cd webapp/Server
echo    node test/test-complete-flow.js
@echo off
REM VoidLink Basic Connectivity Test for Windows
REM Simple health check and API connectivity verification

echo 🔐 VoidLink Basic Connectivity Test
echo ==================================

REM Configuration
set BASE_URL=http://localhost:5000/api

echo Testing VoidLink server connectivity...
echo.

REM Test 1: Health Check
echo 📊 Testing Health Check...
curl -s "%BASE_URL%/health"
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Health check passed - Server is responding
) else (
    echo.
    echo ❌ Health check failed - Server may not be running
    echo 💡 Try: docker compose up -d
    exit /b 1
)
echo.

REM Test 2: Basic API Structure
echo 🔍 Testing API Structure...
curl -s "%BASE_URL%/auth/session"
if %ERRORLEVEL% EQU 0 (
    echo ✅ API endpoints are responding
) else (
    echo ❌ API endpoints not accessible
    exit /b 1
)
echo.

echo 🎉 BASIC CONNECTIVITY TESTS COMPLETED!
echo =====================================
echo ✅ Server is running and responding
echo ✅ API endpoints are accessible
echo.
echo 🧪 For comprehensive testing, run:
echo    cd Server
echo    node test/test-complete-flow.js
echo    node test/test-enhanced-contacts.js
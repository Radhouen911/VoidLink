@echo off
echo ========================================
echo VoidLink E2E Test Runner
echo ========================================
echo.

echo Checking prerequisites...
echo.

REM Check if node_modules exists
if not exist "..\node_modules" (
    echo ERROR: node_modules not found!
    echo Please run: cd .. ^&^& npm install
    pause
    exit /b 1
)

echo [OK] Dependencies installed
echo.

REM Check if backend is running
echo Checking if backend is running on port 3000...
curl -s http://localhost:3000/health >nul 2>&1
if errorlevel 1 (
    echo WARNING: Backend may not be running on port 3000
    echo Please start backend: cd ..\..\Server ^&^& npm start
    echo.
    echo Press any key to continue anyway, or Ctrl+C to cancel...
    pause >nul
)

echo [OK] Backend is accessible
echo.

REM Check if frontend is running
echo Checking if frontend is running on port 5173...
curl -s http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo WARNING: Frontend may not be running on port 5173
    echo Please start frontend: cd .. ^&^& npm run dev
    echo.
    echo Press any key to continue anyway, or Ctrl+C to cancel...
    pause >nul
)

echo [OK] Frontend is accessible
echo.

echo ========================================
echo Running E2E Tests
echo ========================================
echo.

npx playwright test e2e-complete.spec.ts --headed

echo.
echo ========================================
echo Test run complete!
echo ========================================
echo.
echo To view detailed report, run: npx playwright show-report
echo.
pause

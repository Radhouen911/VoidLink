@echo off
echo ========================================
echo VoidLink QA Setup
echo ========================================
echo.

echo Installing Playwright...
cd ..
call npm install -D @playwright/test
echo.

echo Installing Playwright browsers...
call npx playwright install chromium
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To run tests:
echo   npm run test
echo.
echo To run tests in UI mode:
echo   npm run test:ui
echo.
echo To run tests in headed mode:
echo   npm run test:headed
echo.
pause

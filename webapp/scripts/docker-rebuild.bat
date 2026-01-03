@echo off
echo Stopping and removing containers...
docker compose down

echo Removing old images...
docker rmi voidlink-frontend voidlink-backend 2>nul

echo Building and starting containers...
docker compose up --build -d

echo Waiting for services to start...
timeout /t 10

echo Checking container status...
docker compose ps

echo.
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000
echo Database: localhost:5432
echo.
echo To view logs:
echo   docker compose logs -f frontend
echo   docker compose logs -f backend

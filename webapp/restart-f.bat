@echo off
echo Building frontend image...
docker compose build frontend

echo Stopping and removing frontend container...
docker compose down frontend

echo Starting frontend container...
docker compose up -d frontend

echo Done! Frontend has been rebuilt and restarted.
pause
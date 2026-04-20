@echo off
echo Starting AttendAI Microservices...

echo Starting Node.js Backend...
start "AttendAI - Node Server" cmd /c "cd server && npm run dev"

echo Starting React Frontend...
start "AttendAI - React Client" cmd /c "cd client && npm run dev"

echo Starting Python CV Service...
pause 
start "AttendAI - Python CV" cmd /k "cd python-cv && call venv\Scripts\activate.bat && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo.
echo ========================================================
echo All services have been launched in separate windows!
echo It may take a few seconds for them to fully boot.
echo Run 'node test_system.js' here to check system health.
echo ========================================================
pause

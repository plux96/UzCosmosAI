@echo off
echo ========================================
echo   UzCosmos AI - Mission Control
echo   Starting all systems...
echo ========================================

echo [1/2] Starting backend (10 agents)...
start "UzCosmos Backend" cmd /c "cd /d %~dp0 && python main.py"

timeout /t 3 /nobreak > nul

echo [2/2] Starting frontend...
start "UzCosmos Frontend" cmd /c "cd /d %~dp0\frontend && npm run dev"

echo.
echo ========================================
echo   UzCosmos AI is ONLINE!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo ========================================
echo.
pause

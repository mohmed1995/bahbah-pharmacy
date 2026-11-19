@echo off
chcp 65001 >nul
cd /d %~dp0
echo ============================================
echo   Bahbah warehouse sync - Simple Assistant to Supabase
echo ============================================
if "%BAHBAH_SERVICE_KEY%"=="" (
  echo [ERROR] BAHBAH_SERVICE_KEY is not set.
  echo Set it once from an admin CMD:  setx BAHBAH_SERVICE_KEY "YOUR_SERVICE_ROLE_KEY"
  echo Then close this window and run again.
  pause
  exit /b 2
)
where py >nul 2>nul && (py -3 sync_inventory.py %*) || (python sync_inventory.py %*)
if errorlevel 1 (
  echo.
  echo [FAILED] See sync.log for details.
  pause
  exit /b 1
)
echo.
echo [OK] Sync finished. Details in sync.log
pause

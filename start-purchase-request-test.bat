:: Start script for testing purchase request functionality
@echo off
echo Starting dealer loyalty platform for testing...

echo Running MongoDB (make sure it's installed)
start "MongoDB" mongod

echo Starting backend server...
cd /d "%~dp0"
start "Backend" cmd /c "npm run server"

echo Starting frontend...
timeout /t 5
start "Frontend" cmd /c "npm run dev"

echo.
echo ==============================================
echo Purchase Request Testing Environment Started!
echo ==============================================
echo.
echo To test the purchase request functionality:
echo 1. Open two different browsers or incognito windows
echo 2. Log in as a client in one window
echo 3. Log in as an admin in the other window
echo 4. Follow the steps in scripts/purchase-request-test-guide.js
echo.
echo Press any key to open the test guide...
pause > nul

:: Open the test guide in the default text editor
start "" "%~dp0scripts\purchase-request-test-guide.js"

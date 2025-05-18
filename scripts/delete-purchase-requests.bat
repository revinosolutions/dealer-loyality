@echo off
echo WARNING: This will delete ALL purchase requests from the database
echo.
echo Press Ctrl+C to cancel or any key to continue...
pause > nul
echo.
echo Running deletion script...
node --experimental-modules scripts/delete-purchase-requests.js
echo.
echo Script completed. Press any key to exit.
pause > nul 
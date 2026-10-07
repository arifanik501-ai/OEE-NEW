@echo off
title OEE Report Portal
echo ========================================================
echo           Starting OEE Report Web Portal
echo ========================================================
echo.
echo Launching server at http://localhost:3000 ...
start http://localhost:3000
node server.js
pause

@echo off
title Create GitHub Ready ZIP
echo ========================================================
echo        Packaging OEE Report for GitHub Upload
echo ========================================================
echo.
echo Packaging files: index.html, style.css, app.js, data.json, favicon.svg, README.md ...

powershell -Command "Compress-Archive -Path 'index.html', 'style.css', 'app.js', 'data.json', 'favicon.svg', 'README.md' -DestinationPath 'oee-report-github.zip' -Force"

if exist "oee-report-github.zip" (
    echo.
    echo [SUCCESS] 'oee-report-github.zip' created successfully!
    echo You can now upload this directly to GitHub, or extract its files!
) else (
    echo.
    echo [ERROR] Could not create zip file.
)

echo.
pause

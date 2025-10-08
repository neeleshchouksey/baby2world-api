@echo off
echo Starting Baby Names Application Server...
echo.

REM Load environment variables from .env file
REM These are fallback values if .env is not found
if not defined DB_NAME set DB_NAME=babynames_db1
if not defined DB_HOST set DB_HOST=localhost
if not defined DB_PORT set DB_PORT=5432
if not defined DB_USER set DB_USER=postgres

echo Environment variables loaded from .env file
echo   DB_NAME=%DB_NAME%
echo   DB_HOST=%DB_HOST%
echo   DB_PORT=%DB_PORT%
echo   DB_USER=%DB_USER%
echo   DB_PASSWORD=[HIDDEN]
echo.

REM Start the server
node start-server.js

pause

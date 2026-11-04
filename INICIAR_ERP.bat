@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || goto node_error
node -e "process.exit(Number(process.versions.node.split('.')[0])>=24?0:1)"
if errorlevel 1 goto node_error
if not exist "node_modules\vite\package.json" (
  echo Instalando dependencias del proyecto, solo es necesario la primera vez...
  call npm ci
  if errorlevel 1 goto install_error
)
echo.
echo ERP COMERCIAL PERU - MODO DESARROLLO
 echo Abre http://localhost:5173 en tu navegador.
 echo Mantenga la terminal abierta. Ctrl+C para terminar.
call npm run dev
if errorlevel 1 pause
exit /b 0
:install_error
echo Fallo la instalacion. Revisa tu conexion a internet y ejecuta npm ci.
pause
exit /b 1
:node_error
echo Instala Node.js 24 LTS o posterior desde https://nodejs.org/
pause
exit /b 1

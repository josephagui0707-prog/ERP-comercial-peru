@echo off
setlocal
 title ERP Comercial Peru - Iniciar sistema
cd /d "%~dp0"
echo ======================================================
echo           ERP COMERCIAL PERU - INICIO LOCAL
echo ======================================================
echo.
if not exist "package.json" goto missing_project
where node >nul 2>&1
if errorlevel 1 goto missing_node
where npm >nul 2>&1
if errorlevel 1 goto missing_node
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit((a===20&&b>=19)||(a===22&&b>=12)||a>22?0:1)"
if errorlevel 1 goto old_node
if not exist "node_modules\pdfjs-dist\package.json" goto install_dependencies
if exist "node_modules\.bin\vite.cmd" goto launch
:install_dependencies
echo Preparando el proyecto por primera vez...
echo Se necesita conexion a Internet. Espera a que termine.
echo.
call npm ci --no-audit --no-fund
if errorlevel 1 goto install_failed
:launch
echo.
echo Iniciando el sistema y abriendo el navegador...
echo Direccion: http://localhost:5173/
echo Manten esta ventana abierta mientras uses el sistema.
echo Para detenerlo, presiona Ctrl+C o cierra esta ventana.
echo.
call npm run dev -- --host localhost --port 5173 --strictPort --open
if errorlevel 1 goto start_failed
goto end
:missing_project
echo ERROR: No se encontro package.json.
echo Extrae todo el ZIP antes de ejecutar este archivo.
goto failed
:missing_node
echo ERROR: Debes instalar Node.js LTS con npm.
echo Descargalo desde https://nodejs.org/
echo Despues de instalarlo, vuelve a abrir este script.
goto failed
:old_node
echo ERROR: La version de Node.js instalada no es compatible.
echo Instala Node.js LTS 22.12 o superior desde https://nodejs.org/
goto failed
:install_failed
echo.
echo ERROR: No se pudieron instalar las dependencias.
echo Revisa tu conexion a Internet y el error mostrado arriba.
echo Luego vuelve a ejecutar este script.
goto failed
:start_failed
echo.
echo ERROR: No se pudo iniciar el sistema.
echo Si el puerto 5173 esta ocupado por este ERP, abre:
echo http://localhost:5173/
echo En otro caso, cierra el programa que ocupa ese puerto y reintenta.
goto failed
:failed
echo.
pause
:end
endlocal

@echo off
setlocal

echo ============================================
echo  BarberFlow - Setup de Dependencias
echo ============================================
echo.

:: Tenta encontrar node em caminhos comuns
set NODE_CMD=
for %%P in (
  "C:\Program Files\nodejs\node.exe"
  "C:\Program Files (x86)\nodejs\node.exe"
  "%APPDATA%\nvm\current\node.exe"
  "%LOCALAPPDATA%\Programs\nodejs\node.exe"
) do (
  if exist %%P (
    set NODE_CMD=%%~P
    goto :found
  )
)

:: Tenta via PATH do PowerShell (que pode ter mais entradas)
for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source" 2^>nul') do (
  set NODE_CMD=%%i
  goto :found
)

echo [ERRO] Node.js nao encontrado.
echo.
echo Instale o Node.js LTS em: https://nodejs.org
echo Apos instalar, feche e reabra o terminal e rode este script novamente.
echo.
pause
exit /b 1

:found
echo [OK] Node encontrado em: %NODE_CMD%

:: Deriva npm do mesmo diretorio do node
for %%F in ("%NODE_CMD%") do set NODE_DIR=%%~dpF
set NPM_CMD="%NODE_DIR%npm.cmd"

echo [OK] npm: %NPM_CMD%
echo.

echo --- Instalando dependencias do backend ---
cd /d "%~dp0backend"
%NPM_CMD% install pino pino-pretty swagger-jsdoc swagger-ui-express
%NPM_CMD% install --save-dev @types/swagger-jsdoc @types/swagger-ui-express vitest @vitest/coverage-v8 supertest @types/supertest
echo.

echo --- Instalando dependencias do frontend ---
cd /d "%~dp0frontend"
%NPM_CMD% install @tanstack/react-query
echo.

echo ============================================
echo  Tudo instalado com sucesso!
echo ============================================
echo.
echo  Proximos passos:
echo  1. cd backend ^&^& npm run dev     (porta 3001)
echo  2. cd frontend ^&^& npm run dev    (porta 3000)
echo  3. Swagger: http://localhost:3001/api-docs
echo  4. Testes:  cd backend ^&^& npm test
echo.
pause

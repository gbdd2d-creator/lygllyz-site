@echo off
cd /d "%~dp0"
git add .
set /p msg="Mensagem do commit: "
if "%msg%"=="" set msg="atualiza produtos"
git commit -m "%msg%"
git push
echo.
echo Deploy iniciado no Vercel! Acesse https://vercel.com/dashboard para ver o status.
pause
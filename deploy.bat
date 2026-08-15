@echo off
cd /d "%~dp0"
echo ==========================================
echo   DEPLOY LYGLLYZ - push + Vercel
echo ==========================================
git add .
set /p msg="Mensagem do commit: "
if "%msg%"=="" set msg="atualiza produtos"
git commit -m "%msg%"
echo Sincronizando com o GitHub (para evitar conflitos)...
git pull --rebase origin main
git push
echo.
echo Deployando no Vercel...
call vercel --prod --yes
echo.
echo ==========================================
echo   DEPLOY CONCLUÍDO!
echo   Site: https://lygllyz-tabacaria.vercel.app
echo ==========================================
pause
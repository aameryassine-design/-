@echo off
chcp 65001 > nul
echo ===================================================
echo   Synchronisation du projet (Mohammed ^& Yassine)
echo ===================================================
echo.

echo [1/3] Récupération des dernières modifications (git pull)...
git pull origin main
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERREUR] Impossible de récupérer les modifications.
    echo Résolvez les conflits potentiels avant de continuer.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Préparation du commit...
set /p commit_msg="Entrez votre message de commit : "
if "%commit_msg%"=="" (
    echo Le message de commit ne peut pas être vide.
    pause
    exit /b 1
)

git add .
git commit -m "%commit_msg%"
if %ERRORLEVEL% neq 0 (
    echo [INFO] Aucun nouveau fichier à committer ou commit déjà à jour.
)

echo.
echo [3/3] Envoi vers GitHub (git push origin main)...
git push origin main
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERREUR] Échec de l'envoi vers GitHub.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo   Succès ! Modifications envoyées avec succès.
echo   Netlify met à jour le site : https://jalessa.netlify.app
echo ===================================================
echo.
pause

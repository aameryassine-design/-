#!/usr/bin/env bash
set -e

echo "==================================================="
echo "  Synchronisation du projet (Mohammed & Yassine)"
echo "==================================================="
echo ""

echo "[1/3] Récupération des dernières modifications (git pull)..."
git pull origin main

echo ""
echo "[2/3] Préparation du commit..."
read -r -p "Entrez votre message de commit : " commit_msg

if [ -z "$commit_msg" ]; then
    echo "Le message de commit ne peut pas être vide."
    exit 1
fi

git add .
if git diff-index --quiet HEAD --; then
    echo "[INFO] Aucun nouveau changement à committer."
else
    git commit -m "$commit_msg"
fi

echo ""
echo "[3/3] Envoi vers GitHub (git push origin main)..."
git push origin main

echo ""
echo "==================================================="
echo "  Succès ! Modifications envoyées avec succès."
echo "  Netlify met à jour le site : https://jalessa.netlify.app"
echo "==================================================="
echo ""

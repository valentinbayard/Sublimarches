#!/bin/bash
echo "🚀 Déploiement de l'optimiseur..."

# Vérifier qu'on est dans le bon dossier
if [ ! -d "optimiseur" ]; then
    echo "❌ Erreur: Dossier optimiseur introuvable!"
    echo "Assurez-vous d'être dans le dossier Sublimarches"
    exit 1
fi

# Aller dans le projet optimiseur
cd optimiseur

# Build
echo "📦 Build en cours..."
npm run build

# Vérifier que le build a réussi
if [ ! -d "build" ]; then
    echo "❌ Erreur: Le build a échoué!"
    exit 1
fi

# Copier les fichiers (écraser les anciens)
echo "📂 Copie des fichiers..."
cp -r build/* ./

# Retourner à la racine
cd ..

# Git
echo "📡 Push vers GitHub..."
git add .
git commit -m "Mise à jour optimiseur - $(date '+%Y-%m-%d %H:%M')"
git push origin main

echo "✅ Déploiement terminé!"
echo ""
echo "🌐 Votre site sera mis à jour dans 1-2 minutes sur:"
echo "https://valentinbayard.github.io/Sublimarches/optimiseur/"
echo ""
echo "📱 Pour vérifier le déploiement:"
echo "https://github.com/valentinbayard/Sublimarches/actions"
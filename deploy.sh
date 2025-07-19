#!/bin/bash
echo "🚀 Déploiement SubliMarches..."

# Vérifier qu'on est dans le bon dossier
if [ ! -d ".git" ]; then
    echo "❌ Erreur: Pas dans un dépôt Git!"
    echo "Assurez-vous d'être dans le dossier Sublimarches"
    exit 1
fi

echo "📂 Structure détectée:"

# Gestion de l'ancien optimiseur (si présent)
if [ -d "optimiseur" ]; then
    echo "📦 Build de l'optimiseur legacy..."
    cd optimiseur
    
    # Vérifier si c'est un projet npm
    if [ -f "package.json" ]; then
        npm run build
        if [ ! -d "build" ]; then
            echo "❌ Erreur: Le build optimiseur a échoué!"
            exit 1
        fi
        echo "📁 Copie des fichiers optimiseur..."
        cp -r build/* ./
    fi
    
    cd ..
    echo "✅ Optimiseur legacy traité"
fi

# Gestion des nouvelles apps
apps_found=0

if [ -d "app1-mesures" ]; then
    echo "✅ App 1 (Mesures) - OK"
    apps_found=$((apps_found + 1))
fi

if [ -d "app2-contremarches" ]; then
    echo "✅ App 2 (Contremarches) - OK"
    apps_found=$((apps_found + 1))
fi

if [ -d "app3-dessus" ]; then
    echo "✅ App 3 (Dessus Marches) - OK"
    apps_found=$((apps_found + 1))
fi

# Vérifier la page d'accueil
if [ -f "index.html" ]; then
    echo "✅ Page d'accueil - OK"
else
    echo "⚠️  Page d'accueil manquante - création recommandée"
fi

echo ""
echo "📊 Résumé: $apps_found app(s) trouvée(s)"

# Git add et commit
echo "📡 Préparation du commit..."
git add .

# Message de commit intelligent
if [ $apps_found -eq 0 ] && [ -d "optimiseur" ]; then
    commit_msg="Update optimiseur legacy - $(date '+%Y-%m-%d %H:%M')"
elif [ $apps_found -eq 1 ]; then
    commit_msg="Deploy: App 1 (Mesures) - $(date '+%Y-%m-%d %H:%M')"
elif [ $apps_found -eq 2 ]; then
    commit_msg="Deploy: Apps 1-2 (Mesures + Contremarches) - $(date '+%Y-%m-%d %H:%M')"
elif [ $apps_found -eq 3 ]; then
    commit_msg="Deploy: Suite complète (3 apps) - $(date '+%Y-%m-%d %H:%M')"
else
    commit_msg="Update SubliMarches - $(date '+%Y-%m-%d %H:%M')"
fi

git commit -m "$commit_msg"

# Push vers GitHub
echo "🚀 Push vers GitHub..."
git push origin main

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "🌐 URLs disponibles:"
echo "├── Accueil: https://valentinbayard.github.io/Sublimarches/"

if [ -d "optimiseur" ]; then
    echo "├── Optimiseur legacy: https://valentinbayard.github.io/Sublimarches/optimiseur/"
fi

if [ -d "app1-mesures" ]; then
    echo "├── App 1 (Mesures): https://valentinbayard.github.io/Sublimarches/app1-mesures/"
fi

if [ -d "app2-contremarches" ]; then
    echo "├── App 2 (Contremarches): https://valentinbayard.github.io/Sublimarches/app2-contremarches/"
fi

if [ -d "app3-dessus" ]; then
    echo "└── App 3 (Dessus): https://valentinbayard.github.io/Sublimarches/app3-dessus/"
fi

echo ""
echo "⏱️  Le site sera mis à jour dans 1-2 minutes"
echo "📱 Vérifier le déploiement: https://github.com/valentinbayard/Sublimarches/actions"

# Optionnel: ouvrir automatiquement dans le navigateur
if command -v open &> /dev/null; then
    read -p "🌐 Ouvrir le site dans le navigateur? (o/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        open https://valentinbayard.github.io/Sublimarches/
    fi
fi
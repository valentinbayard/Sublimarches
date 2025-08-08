#!/bin/bash

# Deploy script for Sublimarches GitHub Pages
# This script builds and deploys all apps in the correct structure

set -e

echo "🚀 Starting deployment of Sublimarches..."

# Create a temporary directory for the deployment
TEMP_DIR=$(mktemp -d)
echo "📁 Created temporary directory: $TEMP_DIR"

# Function to build and copy app
build_app() {
    local app_name=$1
    local app_path=$2
    local target_path=$3
    
    echo "🔨 Building $app_name..."
    cd "$app_path"
    npm run build
    
    echo "📋 Copying $app_name to $target_path..."
    mkdir -p "$TEMP_DIR/$target_path"
    cp -r build/* "$TEMP_DIR/$target_path/"
    
    cd - > /dev/null
}

# Build all apps
build_app "Mesures" "optimiseur/mesures" "optimiseur/mesures"
build_app "Contremarches" "optimiseur/contremarches" "optimiseur/contremarches"
build_app "Dessus-marches" "optimiseur/dessus-marches" "optimiseur/dessus-marches"
build_app "Main Optimiseur" "optimiseur" "optimiseur"

# Copy the landing page
echo "📄 Copying landing page..."
cp index.html "$TEMP_DIR/"

# Deploy to gh-pages
echo "🚀 Deploying to GitHub Pages..."
cd "$TEMP_DIR"
git init
git add .
git commit -m "🚀 Deploy Sublimarches - $(date)"

# Force push to gh-pages branch
git push --force https://github.com/valentinbayard/Sublimarches.git HEAD:gh-pages

# Cleanup
cd - > /dev/null
rm -rf "$TEMP_DIR"

echo "✅ Deployment complete!"
echo "🌐 Your apps are now available at:"
echo "   - Main: https://valentinbayard.github.io/Sublimarches/"
echo "   - Mesures: https://valentinbayard.github.io/Sublimarches/optimiseur/mesures/"
echo "   - Contremarches: https://valentinbayard.github.io/Sublimarches/optimiseur/contremarches/"
echo "   - Dessus-marches: https://valentinbayard.github.io/Sublimarches/optimiseur/dessus-marches/"
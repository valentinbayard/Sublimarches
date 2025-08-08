#!/bin/bash

# Deploy script for Sublimarches GitHub Pages
# This script builds all apps and prepares them for deployment

set -e

echo "🚀 Starting build process for Sublimarches..."

# Store the root directory
ROOT_DIR=$(pwd)

# Function to build app
build_app() {
    local app_name=$1
    local app_path=$2
    
    echo "🔨 Building $app_name..."
    cd "$ROOT_DIR/$app_path"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies for $app_name..."
        npm ci
    fi
    
    npm run build
    
    cd "$ROOT_DIR"
}

# Build all apps
build_app "Mesures" "optimiseur/mesures"
build_app "Contremarches" "optimiseur/contremarches"
build_app "Dessus-marches" "optimiseur/dessus-marches"
build_app "Main Optimiseur" "optimiseur"

# Prepare deployment directory
echo "📁 Preparing deployment directory..."
rm -rf deployment
mkdir -p deployment

# Copy landing page and .nojekyll
echo "📄 Copying landing page and .nojekyll..."
cp index.html deployment/
cp .nojekyll deployment/

# Create directory structure and copy built apps
echo "📋 Copying built applications..."
mkdir -p deployment/optimiseur

# Copy main optimiseur app (to root of optimiseur/)
cp -r optimiseur/build/* deployment/optimiseur/

# Copy sub-apps to their respective directories
cp -r optimiseur/mesures/build deployment/optimiseur/mesures
cp -r optimiseur/contremarches/build deployment/optimiseur/contremarches
cp -r optimiseur/dessus-marches/build deployment/optimiseur/dessus-marches

echo "✅ Build complete! Deployment directory is ready."
echo "📁 Deployment structure:"
find deployment -type d -maxdepth 3 | sort
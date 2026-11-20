#!/usr/bin/env bash
set -e

echo "Compilando aplicación..."
npm run build

echo "Publicando en rama gh-pages..."
git add -f dist
TREE=$(git write-tree --prefix=dist)
COMMIT=$(git commit-tree $TREE -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')")
git update-ref refs/heads/gh-pages $COMMIT
git reset HEAD dist

git push origin gh-pages --force
echo "Despliegue completado con éxito en GitHub Pages."

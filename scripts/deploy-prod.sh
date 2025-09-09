#!/usr/bin/env bash
set -euo pipefail

PROD_HOST=${PROD_HOST:-"192.168.1.211"}
PROD_USER=${PROD_USER:-"root"}
PROD_PATH=${PROD_PATH:-"/root/hairstyleportal"}
BRANCH=${BRANCH:-"main"}

echo "Deploying branch '$BRANCH' to $PROD_USER@$PROD_HOST:$PROD_PATH"
ssh -o StrictHostKeyChecking=no "$PROD_USER@$PROD_HOST" bash <<EOF
  set -e
  if [ ! -d "$PROD_PATH/.git" ]; then
    echo "Directory not a git repo. Cloning fresh..."
    rm -rf "$PROD_PATH"
    git clone https://github.com/ortiq01/hairstyleportal.git "$PROD_PATH"
  fi
  cd "$PROD_PATH"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
  npm install --production
  if command -v pm2 >/dev/null 2>&1; then
    pm2 start ecosystem.config.js || pm2 restart ecosystem.config.js
    pm2 save || true
  else
    echo "pm2 not installed on server. Please install pm2 globally."
  fi
EOF

echo "Deployment complete."

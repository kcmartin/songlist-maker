#!/usr/bin/env bash
set -euo pipefail

# Configure git for backup pushes via deploy key
if [ -n "${GIT_SSH_KEY:-}" ]; then
  mkdir -p /root/.ssh
  echo "$GIT_SSH_KEY" > /root/.ssh/id_ed25519
  chmod 600 /root/.ssh/id_ed25519
  ssh-keyscan github.com >> /root/.ssh/known_hosts 2>/dev/null
fi

# Git identity for backup commits
git config --global user.name "Kristin Martin"
git config --global user.email "kcmartin@users.noreply.github.com"

# Clone or update the backup repo on the persistent volume
export BACKUP_REPO_PATH="/data/songlist-backups"
BACKUP_REPO="$BACKUP_REPO_PATH"
if [ ! -d "$BACKUP_REPO/.git" ]; then
  git clone git@github.com:kcmartin/songlist-backups.git "$BACKUP_REPO" || echo "Backup repo clone failed, will retry on next backup"
else
  cd "$BACKUP_REPO" && git pull --ff-only || true
fi

# Start backup scheduler in background
bash /app/server/backup-scheduler.sh &

# Start the Node.js server
cd /app/server
exec node index.js

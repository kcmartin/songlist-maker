#!/usr/bin/env bash
set -euo pipefail

BACKUP_SCRIPT="/home/sprite/songlist-maker/server/backup-db.sh"
INTERVAL=$((6 * 60 * 60))  # 6 hours in seconds

echo "Backup scheduler started. Running every 6 hours."

while true; do
  echo "--- Running backup at $(date -u '+%Y-%m-%d %H:%M:%S UTC') ---"
  if bash "$BACKUP_SCRIPT"; then
    echo "Backup completed successfully."
  else
    echo "Backup failed with exit code $?."
  fi
  sleep "$INTERVAL"
done

#!/usr/bin/env bash
set -euo pipefail

DB_PATH="/home/sprite/songlist-maker/server/songlist.db"
BACKUP_REPO="/home/sprite/songlist-backups"
DUMP_FILE="$BACKUP_REPO/songlist.sql"

# Ensure the database exists
if [ ! -f "$DB_PATH" ]; then
  echo "Error: database not found at $DB_PATH"
  exit 1
fi

# Dump the database to a .sql text file
sqlite3 "$DB_PATH" .dump > "$DUMP_FILE"

cd "$BACKUP_REPO"

# Only commit and push if there are changes
if git diff --quiet -- songlist.sql 2>/dev/null && git diff --cached --quiet -- songlist.sql 2>/dev/null; then
  # Check if the file is untracked (first backup)
  if git ls-files --error-unmatch songlist.sql >/dev/null 2>&1; then
    echo "No changes to back up."
    exit 0
  fi
fi

TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
git add songlist.sql
git commit -m "Backup: $TIMESTAMP"
git push

echo "Backup pushed at $TIMESTAMP"

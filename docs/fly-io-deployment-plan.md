# Fly.io Deployment Plan

## Overview

Deploy the songlist-maker app (Node.js Express + React + SQLite) to Fly.io with persistent storage and automated backups.

### Key Constraint

SQLite requires a **persistent volume** and **single machine** (no horizontal scaling).

## Steps

### 1. Install Fly CLI & Authenticate

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Initialize the App

```bash
cd /home/sprite/songlist-maker
fly launch --no-deploy
```

Choose a region (e.g., `iad` for US East). The app name becomes `<app-name>.fly.dev`.

### 3. Configure `fly.toml`

```toml
app = "songlist-maker"
primary_region = "iad"

[build]

[env]
  NODE_ENV = "production"
  PORT = "8080"
  DATABASE_PATH = "/data/songlist.db"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1

[mounts]
  source = "songlist_data"
  destination = "/data"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

- `min_machines_running = 1` keeps the machine on so the backup scheduler stays alive.
- Volume mounted at `/data` for SQLite persistence.

### 4. Create Persistent Volume

```bash
fly volumes create songlist_data --region iad --size 1 --snapshot-retention 60
```

1 GB is plenty for the SQLite database. `--snapshot-retention 60` extends the default 5-day snapshot retention to 60 days. Fly takes automatic daily snapshots of every volume at no extra cost, giving us a 24-hour-RPO recovery path on the Fly side — complementing the off-platform GitHub backup.

To list snapshots later:

```bash
fly volumes snapshots list <volume-id>
```

To restore from a snapshot, create a new volume from it:

```bash
fly volumes create songlist_data --snapshot-id <snapshot-id> --region iad
```

### 5. Modify `server/db.js`

Make the database path configurable via environment variable:

```javascript
// Change this:
const db = new Database(join(__dirname, 'songlist.db'));

// To this:
const dbPath = process.env.DATABASE_PATH || join(__dirname, 'songlist.db');
const db = new Database(dbPath);
```

### 6. Create `Dockerfile`

```dockerfile
FROM node:22-slim

# Install sqlite3 CLI (for backup dumps) and git (for pushing backups)
RUN apt-get update && apt-get install -y sqlite3 git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install root dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

# Install and build client
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Remove client dev dependencies after build
RUN cd client && rm -rf node_modules && npm ci --production 2>/dev/null || true

# Install server dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --production

# Copy server source
COPY server/ ./server/

# Copy entrypoint
COPY start-fly.sh ./start-fly.sh
RUN chmod +x start-fly.sh server/backup-db.sh server/backup-scheduler.sh

EXPOSE 8080

CMD ["./start-fly.sh"]
```

### 7. Create `start-fly.sh` (Entrypoint)

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configure git for backup pushes via deploy key
if [ -n "${GIT_SSH_KEY:-}" ]; then
  mkdir -p /root/.ssh
  echo "$GIT_SSH_KEY" > /root/.ssh/id_ed25519
  chmod 600 /root/.ssh/id_ed25519
  ssh-keyscan github.com >> /root/.ssh/known_hosts 2>/dev/null
fi

# Clone or update the backup repo on the persistent volume
BACKUP_REPO="/data/songlist-backups"
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
```

### 8. Create `.dockerignore`

```
node_modules
server/node_modules
client/node_modules
server/songlist.db
server/.env
.git
```

### 9. Update `server/backup-db.sh`

Use environment variables instead of hard-coded Sprite paths:

```bash
DB_PATH="${DATABASE_PATH:-/data/songlist.db}"
BACKUP_REPO="${BACKUP_REPO_PATH:-/data/songlist-backups}"
DUMP_FILE="$BACKUP_REPO/songlist.sql"
```

### 10. Set Secrets on Fly.io

```bash
fly secrets set \
  SESSION_SECRET="<generate-a-strong-random-string>" \
  APP_URL="https://songlist-maker.fly.dev" \
  GOOGLE_CLIENT_ID="<your-google-client-id>" \
  GOOGLE_CLIENT_SECRET="<your-google-client-secret>" \
  GITHUB_CLIENT_ID="<your-github-client-id>" \
  GITHUB_CLIENT_SECRET="<your-github-client-secret>" \
  GIT_SSH_KEY="$(cat /path/to/deploy-key)"
```

For `GIT_SSH_KEY`, generate a dedicated SSH deploy key:

```bash
ssh-keygen -t ed25519 -C "songlist-fly-backup" -f songlist-backup-key -N ""
```

Add the public key as a deploy key on `kcmartin/songlist-backups` (Settings > Deploy keys) with **write access**.

### 11. Update OAuth Callback URLs

Once `APP_URL` is set, callbacks will be:
- Google: `https://songlist-maker.fly.dev/api/auth/google/callback`
- GitHub: `https://songlist-maker.fly.dev/api/auth/github/callback`

Update in:
1. **Google Cloud Console**: APIs & Services > Credentials > Authorized redirect URIs
2. **GitHub Developer Settings**: OAuth Apps > Authorization callback URL

### 12. Deploy

```bash
fly deploy
```

### 13. Migrate Existing Data

Copy the existing SQLite database to the Fly.io volume:

```bash
# Copy DB file into the running machine
fly ssh console -C "cat > /data/songlist.db" < /home/sprite/songlist-maker/server/songlist.db

# Restart to pick up the data
fly apps restart songlist-maker
```

### 14. Verify

```bash
fly status
fly logs
curl https://songlist-maker.fly.dev/api/health
fly ssh console
  ls -la /data/songlist.db
  ls -la /data/songlist-backups/
```

### 15. Custom Domain (Optional)

```bash
fly certs create songlist.yourdomain.com
```

Then update:
1. DNS: CNAME to `songlist-maker.fly.dev`
2. `fly secrets set APP_URL="https://songlist.yourdomain.com"`
3. OAuth callback URLs in Google/GitHub consoles

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `fly.toml` | Create | Fly.io app configuration |
| `Dockerfile` | Create | Container build instructions |
| `start-fly.sh` | Create | Entrypoint: backup scheduler + server |
| `.dockerignore` | Create | Exclude build artifacts |
| `server/db.js` | Modify | Configurable DB path via env var |
| `server/backup-db.sh` | Modify | Configurable paths via env vars |

## Backup & Recovery Strategy

Two independent layers protect the data:

1. **Fly volume snapshots** (on-platform, 24-hour RPO)
   - Automatic daily snapshots, free, retained 60 days (configured in step 4).
   - Restore path: `fly volumes create songlist_data --snapshot-id <id> --region iad`.
   - Protects against: volume corruption, accidental deletion of app data.
2. **GitHub backup** (off-platform, 12-hour RPO)
   - The existing twice-daily `backup-db.sh` continues to run as a background process inside the machine, pushing a SQL dump to `kcmartin/songlist-backups`.
   - Restore path: clone the backup repo and `sqlite3 songlist.db < songlist.sql`.
   - Protects against: Fly account/region issues, and gives a human-readable, version-controlled archive.

Litestream (continuous WAL replication to object storage) was considered and skipped — the data is small, edits are bursty, and 12-hour-off-platform + 24-hour-on-platform recovery windows are acceptable. Revisit if usage grows to the point where losing half a day of edits becomes painful.

## Risks & Considerations

- **Volume durability**: Fly.io volumes are local NVMe, NOT replicated. If the host fails between snapshots, up to 24 hours of edits could be lost on the Fly side (the GitHub backup is the off-platform safety net).
- **Single machine only**: SQLite can't handle multiple writers. Do not scale horizontally.
- **`trust proxy`**: Already set in `server/index.js`, so secure cookies work behind Fly's TLS proxy.
- **`better-sqlite3`**: Native bindings must be compiled inside the Docker build (handled by `npm ci` in the Dockerfile).
- **Backup scheduler**: Runs as a background process. If the main process dies, Fly restarts the machine and the scheduler restarts too.

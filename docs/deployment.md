# Deployment

This app runs on Fly.io as a single machine with a persistent volume for SQLite.

- **App**: `songlist-maker` (https://songlist-maker.fly.dev)
- **Region**: `sjc` (primary)
- **Volume**: `songlist_data` mounted at `/data`
- **Constraint**: SQLite — do not scale horizontally.

## Deploying changes

```bash
fly deploy
```

CI also deploys on push to `main` via `.github/workflows/fly-deploy.yml`
(requires `FLY_API_TOKEN` repo secret).

## Secrets

Managed via `fly secrets set KEY=value` / `fly secrets list`. Includes the
session signing key, OAuth client credentials for Google and GitHub, the
public app URL, and the SSH deploy key used to push backups to
`kcmartin/songlist-backups`.

OAuth callback URLs (set in Google Cloud Console + GitHub Developer Settings):
- `https://songlist-maker.fly.dev/api/auth/google/callback`
- `https://songlist-maker.fly.dev/api/auth/github/callback`

## Backups

Two independent layers:

1. **Fly volume snapshots** — automatic daily, 60-day retention, 24-hour RPO.
   - List: `fly volumes snapshots list <volume-id>`
2. **GitHub repo** — `server/backup-scheduler.sh` runs in the container and
   pushes a SQL dump to `kcmartin/songlist-backups` every 12 hours.

## Restoring from backup

### From a Fly volume snapshot (preferred for recent data loss)

```bash
# 1. Find the snapshot you want
fly volumes list                            # get the current volume id
fly volumes snapshots list <volume-id>      # pick a snapshot id

# 2. Create a new volume from the snapshot
fly volumes create songlist_data_restore \
  --snapshot-id <snapshot-id> --region sjc

# 3. Swap the mount in fly.toml to the new volume name, then redeploy
#    [mounts]
#      source = "songlist_data_restore"
#      destination = "/data"
fly deploy
```

Once verified, the old volume can be deleted with `fly volumes destroy <id>`.

### From the GitHub backup repo (off-platform recovery)

Use this if the Fly volume / snapshots are unavailable, or you need a
specific point-in-time dump from history.

```bash
# 1. Grab the dump
git clone git@github.com:kcmartin/songlist-backups.git
cd songlist-backups
# Optional: check out a specific commit for an older point-in-time
# git checkout <commit-sha>

# 2. Rebuild the SQLite file from the dump
sqlite3 songlist.db < songlist.sql

# 3. Push it onto the Fly volume (machine must be running)
fly ssh console -a songlist-maker -C "bash -c 'cat > /data/songlist.db'" \
  < songlist.db
fly apps restart songlist-maker
```

## Inspecting the running app

```bash
fly status
fly logs
fly ssh console
  ls -la /data/songlist.db
  ls -la /data/songlist-backups/
```

## Local database path

`server/db.js` reads `DATABASE_PATH` (set to `/data/songlist.db` in `fly.toml`).
Falls back to `server/songlist.db` for local dev.

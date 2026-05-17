FROM node:22-slim

# sqlite3 CLI for backup dumps; git + openssh for pushing backups; build tools for native modules
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        sqlite3 git openssh-client \
        build-essential python3 pkg-config && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Root package files (orchestration scripts)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build the React client (needs dev deps for vite)
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build && rm -rf node_modules

# Install server deps (better-sqlite3 native bindings compile here)
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Entrypoint
COPY start-fly.sh ./start-fly.sh
RUN chmod +x start-fly.sh server/backup-db.sh server/backup-scheduler.sh

EXPOSE 8080

CMD ["./start-fly.sh"]

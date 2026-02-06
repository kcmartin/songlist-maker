import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'songlist.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    notes TEXT,
    youtube_url TEXT,
    recording_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS songlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('gig', 'practice')),
    date TEXT,
    notes TEXT,
    share_token TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS songlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    songlist_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (songlist_id) REFERENCES songlists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_songlist_items_songlist ON songlist_items(songlist_id);
  CREATE INDEX IF NOT EXISTS idx_songlist_items_song ON songlist_items(song_id);
`);

// Migration: Add share_token column if it doesn't exist
const songlistColumns = db.prepare("PRAGMA table_info(songlists)").all();
const hasShareToken = songlistColumns.some(col => col.name === 'share_token');
if (!hasShareToken) {
  db.exec(`
    ALTER TABLE songlists ADD COLUMN share_token TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_share_token ON songlists(share_token);
  `);
}

// Migration: Add lyrics_url column if it doesn't exist
const songColumns = db.prepare("PRAGMA table_info(songs)").all();
const hasLyricsUrl = songColumns.some(col => col.name === 'lyrics_url');
if (!hasLyricsUrl) {
  db.exec(`ALTER TABLE songs ADD COLUMN lyrics_url TEXT;`);
}

// Create tags tables
db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6b7280'
  );

  CREATE TABLE IF NOT EXISTS song_tags (
    song_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (song_id, tag_id),
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_song_tags_song ON song_tags(song_id);
  CREATE INDEX IF NOT EXISTS idx_song_tags_tag ON song_tags(tag_id);
`);

// Insert default tags if they don't exist
const defaultTags = [
  { name: 'needs work', color: '#ef4444' },
  { name: 'learning', color: '#f59e0b' },
  { name: 'ready', color: '#22c55e' },
];

const insertTag = db.prepare(`INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)`);
for (const tag of defaultTags) {
  insertTag.run(tag.name, tag.color);
}

export default db;

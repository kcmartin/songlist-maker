import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Helper to get tags for a song
const getSongTags = (songId) => {
  return db.prepare(`
    SELECT t.id, t.name, t.color
    FROM tags t
    JOIN song_tags st ON t.id = st.tag_id
    WHERE st.song_id = ?
  `).all(songId);
};

// Get all songs with their tags
router.get('/', (req, res) => {
  try {
    const songs = db.prepare('SELECT * FROM songs ORDER BY artist, title').all();
    const songsWithTags = songs.map(song => ({
      ...song,
      tags: getSongTags(song.id)
    }));
    res.json(songsWithTags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single song with tags
router.get('/:id', (req, res) => {
  try {
    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    res.json({ ...song, tags: getSongTags(song.id) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create song
router.post('/', (req, res) => {
  try {
    const { title, artist, notes, youtube_url, recording_url, lyrics_url, duration } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }

    const result = db.prepare(`
      INSERT INTO songs (title, artist, notes, youtube_url, recording_url, lyrics_url, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, artist, notes || null, youtube_url || null, recording_url || null, lyrics_url || null, duration || null);

    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...song, tags: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update song
router.put('/:id', (req, res) => {
  try {
    const { title, artist, notes, youtube_url, recording_url, lyrics_url, duration } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }

    const result = db.prepare(`
      UPDATE songs
      SET title = ?, artist = ?, notes = ?, youtube_url = ?, recording_url = ?, lyrics_url = ?, duration = ?
      WHERE id = ?
    `).run(title, artist, notes || null, youtube_url || null, recording_url || null, lyrics_url || null, duration || null, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
    res.json({ ...song, tags: getSongTags(song.id) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete song
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM songs WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add tag to song
router.post('/:id/tags', (req, res) => {
  try {
    const { tagId } = req.body;
    const songId = req.params.id;

    // Verify song exists
    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(songId);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Verify tag exists
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Add tag (ignore if already exists)
    db.prepare('INSERT OR IGNORE INTO song_tags (song_id, tag_id) VALUES (?, ?)').run(songId, tagId);

    res.json({ ...song, tags: getSongTags(songId) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove tag from song
router.delete('/:id/tags/:tagId', (req, res) => {
  try {
    const { id: songId, tagId } = req.params;

    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(songId);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    db.prepare('DELETE FROM song_tags WHERE song_id = ? AND tag_id = ?').run(songId, tagId);

    res.json({ ...song, tags: getSongTags(songId) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

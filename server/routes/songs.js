import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Get all songs
router.get('/', (req, res) => {
  try {
    const songs = db.prepare('SELECT * FROM songs ORDER BY artist, title').all();
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single song
router.get('/:id', (req, res) => {
  try {
    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    res.json(song);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create song
router.post('/', (req, res) => {
  try {
    const { title, artist, notes, youtube_url, recording_url } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }

    const result = db.prepare(`
      INSERT INTO songs (title, artist, notes, youtube_url, recording_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, artist, notes || null, youtube_url || null, recording_url || null);

    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(song);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update song
router.put('/:id', (req, res) => {
  try {
    const { title, artist, notes, youtube_url, recording_url } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }

    const result = db.prepare(`
      UPDATE songs
      SET title = ?, artist = ?, notes = ?, youtube_url = ?, recording_url = ?
      WHERE id = ?
    `).run(title, artist, notes || null, youtube_url || null, recording_url || null, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
    res.json(song);
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

export default router;

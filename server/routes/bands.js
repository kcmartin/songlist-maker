import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Get all bands
router.get('/', (req, res) => {
  try {
    const bands = db.prepare(`
      SELECT b.*, COUNT(bs.id) as song_count
      FROM bands b
      LEFT JOIN band_songs bs ON b.id = bs.band_id
      GROUP BY b.id
      ORDER BY b.name
    `).all();
    res.json(bands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create band
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = db.prepare('INSERT INTO bands (name) VALUES (?)').run(name);
    const band = db.prepare('SELECT * FROM bands WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...band, song_count: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update band
router.put('/:id', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = db.prepare('UPDATE bands SET name = ? WHERE id = ?').run(name, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const band = db.prepare('SELECT * FROM bands WHERE id = ?').get(req.params.id);
    res.json(band);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete band
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM bands WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Band not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get band repertoire (songs with overrides merged)
router.get('/:id/songs', (req, res) => {
  try {
    const band = db.prepare('SELECT * FROM bands WHERE id = ?').get(req.params.id);
    if (!band) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const songs = db.prepare(`
      SELECT
        s.id, s.title, s.artist, s.youtube_url, s.recording_url, s.lyrics_url, s.created_at,
        bs.id as band_song_id,
        COALESCE(bs.notes, s.notes) as notes,
        COALESCE(bs.duration, s.duration) as duration,
        s.notes as global_notes,
        s.duration as global_duration,
        bs.notes as band_notes,
        bs.duration as band_duration
      FROM band_songs bs
      JOIN songs s ON s.id = bs.song_id
      WHERE bs.band_id = ?
      ORDER BY s.artist, s.title
    `).all(req.params.id);

    // Attach tags for each band_song
    const tagStmt = db.prepare(`
      SELECT t.id, t.name, t.color
      FROM band_song_tags bst
      JOIN tags t ON t.id = bst.tag_id
      WHERE bst.band_song_id = ?
    `);

    for (const song of songs) {
      song.tags = tagStmt.all(song.band_song_id);
    }

    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add song to band repertoire
router.post('/:id/songs', (req, res) => {
  try {
    const { songId, notes, duration } = req.body;
    if (!songId) {
      return res.status(400).json({ error: 'songId is required' });
    }

    const band = db.prepare('SELECT * FROM bands WHERE id = ?').get(req.params.id);
    if (!band) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(songId);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    db.prepare(`
      INSERT INTO band_songs (band_id, song_id, notes, duration)
      VALUES (?, ?, ?, ?)
    `).run(req.params.id, songId, notes || null, duration || null);

    res.status(201).json({ success: true });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Song is already in this band\'s repertoire' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update band-specific overrides for a song
router.put('/:id/songs/:songId', (req, res) => {
  try {
    const { notes, duration } = req.body;

    const result = db.prepare(`
      UPDATE band_songs SET notes = ?, duration = ?
      WHERE band_id = ? AND song_id = ?
    `).run(notes ?? null, duration ?? null, req.params.id, req.params.songId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Song not found in band repertoire' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove song from band repertoire
router.delete('/:id/songs/:songId', (req, res) => {
  try {
    const result = db.prepare(`
      DELETE FROM band_songs WHERE band_id = ? AND song_id = ?
    `).run(req.params.id, req.params.songId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Song not found in band repertoire' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add tag to band-song
router.post('/:id/songs/:songId/tags', (req, res) => {
  try {
    const { tagId } = req.body;
    if (!tagId) {
      return res.status(400).json({ error: 'tagId is required' });
    }

    const bandSong = db.prepare(`
      SELECT id FROM band_songs WHERE band_id = ? AND song_id = ?
    `).get(req.params.id, req.params.songId);

    if (!bandSong) {
      return res.status(404).json({ error: 'Song not found in band repertoire' });
    }

    db.prepare(`
      INSERT OR IGNORE INTO band_song_tags (band_song_id, tag_id) VALUES (?, ?)
    `).run(bandSong.id, tagId);

    const tags = db.prepare(`
      SELECT t.id, t.name, t.color
      FROM band_song_tags bst
      JOIN tags t ON t.id = bst.tag_id
      WHERE bst.band_song_id = ?
    `).all(bandSong.id);

    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove tag from band-song
router.delete('/:id/songs/:songId/tags/:tagId', (req, res) => {
  try {
    const bandSong = db.prepare(`
      SELECT id FROM band_songs WHERE band_id = ? AND song_id = ?
    `).get(req.params.id, req.params.songId);

    if (!bandSong) {
      return res.status(404).json({ error: 'Song not found in band repertoire' });
    }

    db.prepare(`
      DELETE FROM band_song_tags WHERE band_song_id = ? AND tag_id = ?
    `).run(bandSong.id, req.params.tagId);

    const tags = db.prepare(`
      SELECT t.id, t.name, t.color
      FROM band_song_tags bst
      JOIN tags t ON t.id = bst.tag_id
      WHERE bst.band_song_id = ?
    `).all(bandSong.id);

    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

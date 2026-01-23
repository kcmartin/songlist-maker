import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Get all songlists with song counts
router.get('/', (req, res) => {
  try {
    const songlists = db.prepare(`
      SELECT
        s.*,
        COUNT(si.id) as song_count
      FROM songlists s
      LEFT JOIN songlist_items si ON s.id = si.songlist_id
      GROUP BY s.id
      ORDER BY s.date DESC, s.created_at DESC
    `).all();
    res.json(songlists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single songlist with songs
router.get('/:id', (req, res) => {
  try {
    const songlist = db.prepare('SELECT * FROM songlists WHERE id = ?').get(req.params.id);

    if (!songlist) {
      return res.status(404).json({ error: 'Songlist not found' });
    }

    const songs = db.prepare(`
      SELECT s.*, si.position
      FROM songs s
      JOIN songlist_items si ON s.id = si.song_id
      WHERE si.songlist_id = ?
      ORDER BY si.position
    `).all(req.params.id);

    res.json({ ...songlist, songs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create songlist
router.post('/', (req, res) => {
  try {
    const { name, type, date, notes } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    if (!['gig', 'practice'].includes(type)) {
      return res.status(400).json({ error: 'Type must be gig or practice' });
    }

    const result = db.prepare(`
      INSERT INTO songlists (name, type, date, notes)
      VALUES (?, ?, ?, ?)
    `).run(name, type, date || null, notes || null);

    const songlist = db.prepare('SELECT * FROM songlists WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...songlist, songs: [], song_count: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update songlist
router.put('/:id', (req, res) => {
  try {
    const { name, type, date, notes } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    if (!['gig', 'practice'].includes(type)) {
      return res.status(400).json({ error: 'Type must be gig or practice' });
    }

    const result = db.prepare(`
      UPDATE songlists
      SET name = ?, type = ?, date = ?, notes = ?
      WHERE id = ?
    `).run(name, type, date || null, notes || null, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Songlist not found' });
    }

    const songlist = db.prepare('SELECT * FROM songlists WHERE id = ?').get(req.params.id);
    res.json(songlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete songlist
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM songlists WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Songlist not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update songs in songlist (reorder, add, remove)
router.put('/:id/songs', (req, res) => {
  try {
    const { songIds } = req.body;
    const songlistId = req.params.id;

    // Verify songlist exists
    const songlist = db.prepare('SELECT * FROM songlists WHERE id = ?').get(songlistId);
    if (!songlist) {
      return res.status(404).json({ error: 'Songlist not found' });
    }

    // Use transaction for atomic update
    const updateSongs = db.transaction((ids) => {
      // Remove all existing items
      db.prepare('DELETE FROM songlist_items WHERE songlist_id = ?').run(songlistId);

      // Add new items with positions
      const insert = db.prepare(`
        INSERT INTO songlist_items (songlist_id, song_id, position)
        VALUES (?, ?, ?)
      `);

      ids.forEach((songId, index) => {
        insert.run(songlistId, songId, index);
      });
    });

    updateSongs(songIds || []);

    // Return updated songlist with songs
    const songs = db.prepare(`
      SELECT s.*, si.position
      FROM songs s
      JOIN songlist_items si ON s.id = si.song_id
      WHERE si.songlist_id = ?
      ORDER BY si.position
    `).all(songlistId);

    res.json({ ...songlist, songs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';

const router = Router();

// Get songlist by share token (public) - must be before /:id to avoid matching
router.get('/share/:token', (req, res) => {
  try {
    const songlist = db.prepare(`
      SELECT s.*, b.name as band_name
      FROM songlists s
      LEFT JOIN bands b ON s.band_id = b.id
      WHERE s.share_token = ?
    `).get(req.params.token);

    if (!songlist) {
      return res.status(404).json({ error: 'Songlist not found' });
    }

    let songs;
    if (songlist.band_id) {
      // Merge band-specific overrides
      songs = db.prepare(`
        SELECT s.*, si.position,
          COALESCE(bs.notes, s.notes) as notes,
          COALESCE(bs.duration, s.duration) as duration
        FROM songs s
        JOIN songlist_items si ON s.id = si.song_id
        LEFT JOIN band_songs bs ON bs.song_id = s.id AND bs.band_id = ?
        WHERE si.songlist_id = ?
        ORDER BY si.position
      `).all(songlist.band_id, songlist.id);
    } else {
      songs = db.prepare(`
        SELECT s.*, si.position
        FROM songs s
        JOIN songlist_items si ON s.id = si.song_id
        WHERE si.songlist_id = ?
        ORDER BY si.position
      `).all(songlist.id);
    }

    res.json({ ...songlist, songs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all songlists with song counts
router.get('/', (req, res) => {
  try {
    const { band_id } = req.query;
    let query = `
      SELECT
        s.*,
        b.name as band_name,
        COUNT(si.id) as song_count
      FROM songlists s
      LEFT JOIN songlist_items si ON s.id = si.songlist_id
      LEFT JOIN bands b ON s.band_id = b.id
    `;
    const params = [];
    if (band_id) {
      query += ` WHERE s.band_id = ?`;
      params.push(band_id);
    }
    query += ` GROUP BY s.id ORDER BY s.date DESC, s.created_at DESC`;

    const songlists = db.prepare(query).all(...params);
    res.json(songlists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single songlist with songs
router.get('/:id', (req, res) => {
  try {
    const songlist = db.prepare(`
      SELECT s.*, b.name as band_name
      FROM songlists s
      LEFT JOIN bands b ON s.band_id = b.id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!songlist) {
      return res.status(404).json({ error: 'Songlist not found' });
    }

    let songs;
    if (songlist.band_id) {
      songs = db.prepare(`
        SELECT s.*, si.position,
          COALESCE(bs.notes, s.notes) as notes,
          COALESCE(bs.duration, s.duration) as duration
        FROM songs s
        JOIN songlist_items si ON s.id = si.song_id
        LEFT JOIN band_songs bs ON bs.song_id = s.id AND bs.band_id = ?
        WHERE si.songlist_id = ?
        ORDER BY si.position
      `).all(songlist.band_id, songlist.id);
    } else {
      songs = db.prepare(`
        SELECT s.*, si.position
        FROM songs s
        JOIN songlist_items si ON s.id = si.song_id
        WHERE si.songlist_id = ?
        ORDER BY si.position
      `).all(req.params.id);
    }

    res.json({ ...songlist, songs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create songlist
router.post('/', (req, res) => {
  try {
    const { name, type, date, notes, band_id } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    if (!['gig', 'practice'].includes(type)) {
      return res.status(400).json({ error: 'Type must be gig or practice' });
    }

    const result = db.prepare(`
      INSERT INTO songlists (name, type, date, notes, band_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, type, date || null, notes || null, band_id || null);

    const songlist = db.prepare(`
      SELECT s.*, b.name as band_name
      FROM songlists s
      LEFT JOIN bands b ON s.band_id = b.id
      WHERE s.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json({ ...songlist, songs: [], song_count: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update songlist
router.put('/:id', (req, res) => {
  try {
    const { name, type, date, notes, band_id } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    if (!['gig', 'practice'].includes(type)) {
      return res.status(400).json({ error: 'Type must be gig or practice' });
    }

    const result = db.prepare(`
      UPDATE songlists
      SET name = ?, type = ?, date = ?, notes = ?, band_id = ?
      WHERE id = ?
    `).run(name, type, date || null, notes || null, band_id ?? null, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Songlist not found' });
    }

    const songlist = db.prepare(`
      SELECT s.*, b.name as band_name
      FROM songlists s
      LEFT JOIN bands b ON s.band_id = b.id
      WHERE s.id = ?
    `).get(req.params.id);
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

// Generate share token for songlist
router.post('/:id/share', (req, res) => {
  try {
    const songlist = db.prepare('SELECT * FROM songlists WHERE id = ?').get(req.params.id);
    if (!songlist) {
      return res.status(404).json({ error: 'Songlist not found' });
    }

    // If already has a token, return it
    if (songlist.share_token) {
      return res.json({ share_token: songlist.share_token });
    }

    // Generate new token
    const token = crypto.randomBytes(16).toString('hex');
    db.prepare('UPDATE songlists SET share_token = ? WHERE id = ?').run(token, req.params.id);

    res.json({ share_token: token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove share token from songlist
router.delete('/:id/share', (req, res) => {
  try {
    const result = db.prepare('UPDATE songlists SET share_token = NULL WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Songlist not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

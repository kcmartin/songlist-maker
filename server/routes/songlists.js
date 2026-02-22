import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

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

// All remaining routes require auth
router.use(requireAuth);

// Helper: check if user can access a songlist
function canAccessSonglist(songlist, userId) {
  if (!songlist) return false;
  // Bandless songlist: only creator
  if (!songlist.band_id) {
    return songlist.created_by === userId || songlist.created_by === null;
  }
  // Band songlist: must be a member
  return db.prepare('SELECT 1 FROM band_members WHERE band_id = ? AND user_id = ?').get(songlist.band_id, userId);
}

// Get all songlists (user's bands + user's bandless songlists)
router.get('/', (req, res) => {
  try {
    const { band_id } = req.query;
    const userId = req.user.id;

    if (band_id) {
      // Check membership
      const member = db.prepare('SELECT 1 FROM band_members WHERE band_id = ? AND user_id = ?').get(band_id, userId);
      if (!member) {
        return res.json([]);
      }
      const songlists = db.prepare(`
        SELECT s.*, b.name as band_name, COUNT(si.id) as song_count
        FROM songlists s
        LEFT JOIN songlist_items si ON s.id = si.songlist_id
        LEFT JOIN bands b ON s.band_id = b.id
        WHERE s.band_id = ?
        GROUP BY s.id ORDER BY s.date DESC, s.created_at DESC
      `).all(band_id);
      return res.json(songlists);
    }

    // All songlists: user's bands + user's bandless songlists
    const songlists = db.prepare(`
      SELECT s.*, b.name as band_name, COUNT(si.id) as song_count
      FROM songlists s
      LEFT JOIN songlist_items si ON s.id = si.songlist_id
      LEFT JOIN bands b ON s.band_id = b.id
      WHERE
        (s.band_id IS NOT NULL AND s.band_id IN (SELECT band_id FROM band_members WHERE user_id = ?))
        OR (s.band_id IS NULL AND (s.created_by = ? OR s.created_by IS NULL))
      GROUP BY s.id ORDER BY s.date DESC, s.created_at DESC
    `).all(userId, userId);
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

    if (!canAccessSonglist(songlist, req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
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

    // If band_id provided, check membership
    if (band_id) {
      const member = db.prepare('SELECT 1 FROM band_members WHERE band_id = ? AND user_id = ?').get(band_id, req.user.id);
      if (!member) {
        return res.status(403).json({ error: 'Not a member of this band' });
      }
    }

    const result = db.prepare(`
      INSERT INTO songlists (name, type, date, notes, band_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, type, date || null, notes || null, band_id || null, req.user.id);

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

    const songlist = db.prepare('SELECT * FROM songlists WHERE id = ?').get(req.params.id);
    if (!songlist) {
      return res.status(404).json({ error: 'Songlist not found' });
    }
    if (!canAccessSonglist(songlist, req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = db.prepare(`
      UPDATE songlists
      SET name = ?, type = ?, date = ?, notes = ?, band_id = ?
      WHERE id = ?
    `).run(name, type, date || null, notes || null, band_id ?? null, req.params.id);

    const updated = db.prepare(`
      SELECT s.*, b.name as band_name
      FROM songlists s
      LEFT JOIN bands b ON s.band_id = b.id
      WHERE s.id = ?
    `).get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete songlist
router.delete('/:id', (req, res) => {
  try {
    const songlist = db.prepare('SELECT * FROM songlists WHERE id = ?').get(req.params.id);
    if (!songlist) {
      return res.status(404).json({ error: 'Songlist not found' });
    }
    if (!canAccessSonglist(songlist, req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare('DELETE FROM songlists WHERE id = ?').run(req.params.id);
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

    const songlist = db.prepare('SELECT * FROM songlists WHERE id = ?').get(songlistId);
    if (!songlist) {
      return res.status(404).json({ error: 'Songlist not found' });
    }
    if (!canAccessSonglist(songlist, req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateSongs = db.transaction((ids) => {
      db.prepare('DELETE FROM songlist_items WHERE songlist_id = ?').run(songlistId);

      const insert = db.prepare(`
        INSERT INTO songlist_items (songlist_id, song_id, position)
        VALUES (?, ?, ?)
      `);

      ids.forEach((songId, index) => {
        insert.run(songlistId, songId, index);
      });
    });

    updateSongs(songIds || []);

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
    if (!canAccessSonglist(songlist, req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (songlist.share_token) {
      return res.json({ share_token: songlist.share_token });
    }

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
    const songlist = db.prepare('SELECT * FROM songlists WHERE id = ?').get(req.params.id);
    if (!songlist) {
      return res.status(404).json({ error: 'Songlist not found' });
    }
    if (!canAccessSonglist(songlist, req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare('UPDATE songlists SET share_token = NULL WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

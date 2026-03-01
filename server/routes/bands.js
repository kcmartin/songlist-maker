import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';

const router = Router();

// Helper: check if user is a member of a band
function isMember(bandId, userId) {
  return db.prepare('SELECT 1 FROM band_members WHERE band_id = ? AND user_id = ?').get(bandId, userId);
}

// Helper: check if user is the owner of a band
function isOwner(bandId, userId) {
  return db.prepare("SELECT 1 FROM band_members WHERE band_id = ? AND user_id = ? AND role = 'owner'").get(bandId, userId);
}

// Middleware: require band membership
function requireMember(req, res, next) {
  const bandId = req.params.id;
  if (!isMember(bandId, req.user.id)) {
    return res.status(403).json({ error: 'Not a member of this band' });
  }
  next();
}

// Get all bands (user is a member of)
router.get('/', (req, res) => {
  try {
    const bands = db.prepare(`
      SELECT b.*, COUNT(bs.id) as song_count,
        bm.role as user_role,
        (SELECT COUNT(*) FROM band_members WHERE band_id = b.id) as member_count
      FROM bands b
      JOIN band_members bm ON b.id = bm.band_id AND bm.user_id = ?
      LEFT JOIN band_songs bs ON b.id = bs.band_id
      GROUP BY b.id
      ORDER BY b.name
    `).all(req.user.id);
    res.json(bands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create band (auto-add creator as owner)
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const createBand = db.transaction(() => {
      const result = db.prepare('INSERT INTO bands (name, created_by) VALUES (?, ?)').run(name, req.user.id);
      const bandId = result.lastInsertRowid;
      db.prepare("INSERT INTO band_members (band_id, user_id, role) VALUES (?, ?, 'owner')").run(bandId, req.user.id);
      return db.prepare(`
        SELECT b.*, 0 as song_count, 'owner' as user_role, 1 as member_count
        FROM bands b WHERE b.id = ?
      `).get(bandId);
    });

    const band = createBand();
    res.status(201).json(band);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update band (any member)
router.put('/:id', requireMember, (req, res) => {
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

// Delete band (owner only)
router.delete('/:id', (req, res) => {
  try {
    if (!isOwner(req.params.id, req.user.id)) {
      return res.status(403).json({ error: 'Only the band owner can delete this band' });
    }

    const result = db.prepare('DELETE FROM bands WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Band not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get band members
router.get('/:id/members', requireMember, (req, res) => {
  try {
    const members = db.prepare(`
      SELECT u.id, u.name, u.avatar_url, bm.role, bm.created_at
      FROM band_members bm
      JOIN users u ON u.id = bm.user_id
      WHERE bm.band_id = ?
      ORDER BY bm.role DESC, u.name
    `).all(req.params.id);
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave band (members only, owners cannot leave)
router.post('/:id/leave', requireMember, (req, res) => {
  try {
    if (isOwner(req.params.id, req.user.id)) {
      return res.status(400).json({ error: 'Band owner cannot leave. Delete the band or transfer ownership first.' });
    }

    db.prepare('DELETE FROM band_members WHERE band_id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create invite link (any member)
router.post('/:id/invites', requireMember, (req, res) => {
  try {
    const token = crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO band_invites (band_id, token, created_by) VALUES (?, ?, ?)').run(
      req.params.id, token, req.user.id
    );
    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invite info (any authenticated user)
router.get('/invite/:token', (req, res) => {
  try {
    const invite = db.prepare(`
      SELECT bi.*, b.name as band_name
      FROM band_invites bi
      JOIN bands b ON bi.band_id = b.id
      WHERE bi.token = ?
    `).get(req.params.token);

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    const alreadyMember = isMember(invite.band_id, req.user.id);
    res.json({
      band_name: invite.band_name,
      band_id: invite.band_id,
      already_member: !!alreadyMember,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept invite (join band as member)
router.post('/invite/:token/accept', (req, res) => {
  try {
    const invite = db.prepare(`
      SELECT bi.*, b.name as band_name
      FROM band_invites bi
      JOIN bands b ON bi.band_id = b.id
      WHERE bi.token = ?
    `).get(req.params.token);

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    // Check if already a member
    if (isMember(invite.band_id, req.user.id)) {
      return res.json({ success: true, already_member: true, band_id: invite.band_id });
    }

    db.prepare("INSERT INTO band_members (band_id, user_id, role) VALUES (?, ?, 'member')").run(
      invite.band_id, req.user.id
    );

    res.json({ success: true, band_id: invite.band_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get band repertoire (songs with overrides merged)
router.get('/:id/songs', requireMember, (req, res) => {
  try {
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
router.post('/:id/songs', requireMember, (req, res) => {
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
router.put('/:id/songs/:songId', requireMember, (req, res) => {
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
router.delete('/:id/songs/:songId', requireMember, (req, res) => {
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
router.post('/:id/songs/:songId/tags', requireMember, (req, res) => {
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
router.delete('/:id/songs/:songId/tags/:tagId', requireMember, (req, res) => {
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

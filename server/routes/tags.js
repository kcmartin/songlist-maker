import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Get all tags
router.get('/', (req, res) => {
  try {
    const tags = db.prepare('SELECT * FROM tags ORDER BY name').all();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

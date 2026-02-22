import session from 'express-session';
import db from './db.js';

export default class SQLiteStore extends session.Store {
  constructor() {
    super();
    // Clean expired sessions on startup
    db.prepare('DELETE FROM sessions WHERE expired < ?').run(Date.now());
  }

  get(sid, callback) {
    try {
      const row = db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired > ?').get(sid, Date.now());
      callback(null, row ? JSON.parse(row.sess) : null);
    } catch (err) {
      callback(err);
    }
  }

  set(sid, sess, callback) {
    try {
      const maxAge = sess.cookie?.maxAge || 86400000;
      const expired = Date.now() + maxAge;
      db.prepare(
        'INSERT OR REPLACE INTO sessions (sid, sess, expired) VALUES (?, ?, ?)'
      ).run(sid, JSON.stringify(sess), expired);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  touch(sid, sess, callback) {
    try {
      const maxAge = sess.cookie?.maxAge || 86400000;
      const expired = Date.now() + maxAge;
      db.prepare('UPDATE sessions SET expired = ? WHERE sid = ?').run(expired, sid);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import SQLiteStore from './session-store.js';
import passport from './passport.js';
import { requireAuth } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import songsRouter from './routes/songs.js';
import songlistsRouter from './routes/songlists.js';
import tagsRouter from './routes/tags.js';
import backupRouter from './routes/backup.js';
import bandsRouter from './routes/bands.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

app.use(cors({
  origin: APP_URL,
  credentials: true,
}));
app.use(express.json());

// Session middleware
app.use(session({
  store: new SQLiteStore(),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
  },
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Auth routes (public)
app.use('/api/auth', authRouter);

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protected API routes
app.use('/api/songs', requireAuth, songsRouter);
app.use('/api/songlists', songlistsRouter); // has its own public/protected handling
app.use('/api/tags', requireAuth, tagsRouter);
app.use('/api/backup', requireAuth, backupRouter);
app.use('/api/bands', requireAuth, bandsRouter);

// Serve static files from client build
const clientDist = join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

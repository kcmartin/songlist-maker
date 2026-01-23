import express from 'express';
import cors from 'cors';
import songsRouter from './routes/songs.js';
import songlistsRouter from './routes/songlists.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/songs', songsRouter);
app.use('/api/songlists', songlistsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

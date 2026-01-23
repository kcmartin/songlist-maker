const API_BASE = '/api';

// Songs API
export async function getSongs() {
  const res = await fetch(`${API_BASE}/songs`);
  if (!res.ok) throw new Error('Failed to fetch songs');
  return res.json();
}

export async function createSong(song) {
  const res = await fetch(`${API_BASE}/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(song),
  });
  if (!res.ok) throw new Error('Failed to create song');
  return res.json();
}

export async function updateSong(id, song) {
  const res = await fetch(`${API_BASE}/songs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(song),
  });
  if (!res.ok) throw new Error('Failed to update song');
  return res.json();
}

export async function deleteSong(id) {
  const res = await fetch(`${API_BASE}/songs/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete song');
  return res.json();
}

// Songlists API
export async function getSonglists() {
  const res = await fetch(`${API_BASE}/songlists`);
  if (!res.ok) throw new Error('Failed to fetch songlists');
  return res.json();
}

export async function getSonglist(id) {
  const res = await fetch(`${API_BASE}/songlists/${id}`);
  if (!res.ok) throw new Error('Failed to fetch songlist');
  return res.json();
}

export async function createSonglist(songlist) {
  const res = await fetch(`${API_BASE}/songlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(songlist),
  });
  if (!res.ok) throw new Error('Failed to create songlist');
  return res.json();
}

export async function updateSonglist(id, songlist) {
  const res = await fetch(`${API_BASE}/songlists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(songlist),
  });
  if (!res.ok) throw new Error('Failed to update songlist');
  return res.json();
}

export async function deleteSonglist(id) {
  const res = await fetch(`${API_BASE}/songlists/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete songlist');
  return res.json();
}

export async function updateSonglistSongs(id, songIds) {
  const res = await fetch(`${API_BASE}/songlists/${id}/songs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songIds }),
  });
  if (!res.ok) throw new Error('Failed to update songlist songs');
  return res.json();
}

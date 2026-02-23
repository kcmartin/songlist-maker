const API_BASE = '/api';

const fetchOpts = { credentials: 'include' };

let onAuthExpired = null;

export function setAuthExpiredHandler(handler) {
  onAuthExpired = handler;
}

async function authFetch(url, opts = {}) {
  const res = await fetch(url, { ...fetchOpts, ...opts });
  if (res.status === 401 && onAuthExpired && !url.includes('/auth/')) {
    onAuthExpired();
  }
  return res;
}

// Auth API
export async function getCurrentUser() {
  const res = await authFetch(`${API_BASE}/auth/me`);
  if (!res.ok) return null;
  return res.json();
}

export async function logout() {
  const res = await authFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  if (!res.ok) throw new Error('Logout failed');
  return res.json();
}

// Songs API
export async function getSongs() {
  const res = await authFetch(`${API_BASE}/songs`);
  if (!res.ok) throw new Error('Failed to fetch songs');
  return res.json();
}

export async function createSong(song) {
  const res = await authFetch(`${API_BASE}/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(song),
  });
  if (!res.ok) throw new Error('Failed to create song');
  return res.json();
}

export async function updateSong(id, song) {
  const res = await authFetch(`${API_BASE}/songs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(song),
  });
  if (!res.ok) throw new Error('Failed to update song');
  return res.json();
}

export async function deleteSong(id) {
  const res = await authFetch(`${API_BASE}/songs/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete song');
  return res.json();
}

// Songlists API
export async function getSonglists(bandId) {
  const url = bandId
    ? `${API_BASE}/songlists?band_id=${bandId}`
    : `${API_BASE}/songlists`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error('Failed to fetch songlists');
  return res.json();
}

export async function getSonglist(id) {
  const res = await authFetch(`${API_BASE}/songlists/${id}`);
  if (!res.ok) throw new Error('Failed to fetch songlist');
  return res.json();
}

export async function createSonglist(songlist) {
  const res = await authFetch(`${API_BASE}/songlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(songlist),
  });
  if (!res.ok) throw new Error('Failed to create songlist');
  return res.json();
}

export async function updateSonglist(id, songlist) {
  const res = await authFetch(`${API_BASE}/songlists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(songlist),
  });
  if (!res.ok) throw new Error('Failed to update songlist');
  return res.json();
}

export async function deleteSonglist(id) {
  const res = await authFetch(`${API_BASE}/songlists/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete songlist');
  return res.json();
}

export async function updateSonglistSongs(id, songIds) {
  const res = await authFetch(`${API_BASE}/songlists/${id}/songs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songIds }),
  });
  if (!res.ok) throw new Error('Failed to update songlist songs');
  return res.json();
}

// Share API
export async function generateShareLink(id) {
  const res = await authFetch(`${API_BASE}/songlists/${id}/share`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to generate share link');
  return res.json();
}

export async function removeShareLink(id) {
  const res = await authFetch(`${API_BASE}/songlists/${id}/share`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove share link');
  return res.json();
}

export async function getSharedSonglist(token) {
  const res = await fetch(`${API_BASE}/songlists/share/${token}`);
  if (!res.ok) throw new Error('Songlist not found');
  return res.json();
}

// Tags API
export async function getTags() {
  const res = await authFetch(`${API_BASE}/tags`);
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

export async function addTagToSong(songId, tagId) {
  const res = await authFetch(`${API_BASE}/songs/${songId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagId }),
  });
  if (!res.ok) throw new Error('Failed to add tag');
  return res.json();
}

export async function removeTagFromSong(songId, tagId) {
  const res = await authFetch(`${API_BASE}/songs/${songId}/tags/${tagId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove tag');
  return res.json();
}

// Bands API
export async function getBands() {
  const res = await authFetch(`${API_BASE}/bands`);
  if (!res.ok) throw new Error('Failed to fetch bands');
  return res.json();
}

export async function createBand(data) {
  const res = await authFetch(`${API_BASE}/bands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create band');
  return res.json();
}

export async function updateBand(id, data) {
  const res = await authFetch(`${API_BASE}/bands/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update band');
  return res.json();
}

export async function deleteBand(id) {
  const res = await authFetch(`${API_BASE}/bands/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete band');
  return res.json();
}

// Band Repertoire API
export async function getBandSongs(bandId) {
  const res = await authFetch(`${API_BASE}/bands/${bandId}/songs`);
  if (!res.ok) throw new Error('Failed to fetch band songs');
  return res.json();
}

export async function addSongToBand(bandId, data) {
  const res = await authFetch(`${API_BASE}/bands/${bandId}/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add song to band');
  return res.json();
}

export async function updateBandSong(bandId, songId, data) {
  const res = await authFetch(`${API_BASE}/bands/${bandId}/songs/${songId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update band song');
  return res.json();
}

export async function removeSongFromBand(bandId, songId) {
  const res = await authFetch(`${API_BASE}/bands/${bandId}/songs/${songId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove song from band');
  return res.json();
}

export async function addTagToBandSong(bandId, songId, data) {
  const res = await authFetch(`${API_BASE}/bands/${bandId}/songs/${songId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add tag to band song');
  return res.json();
}

export async function removeTagFromBandSong(bandId, songId, tagId) {
  const res = await authFetch(`${API_BASE}/bands/${bandId}/songs/${songId}/tags/${tagId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove tag from band song');
  return res.json();
}

// Band Invites API
export async function createBandInvite(bandId) {
  const res = await authFetch(`${API_BASE}/bands/${bandId}/invites`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to create invite');
  return res.json();
}

export async function getInviteInfo(token) {
  const res = await authFetch(`${API_BASE}/bands/invite/${token}`);
  if (!res.ok) throw new Error('Invite not found');
  return res.json();
}

export async function acceptInvite(token) {
  const res = await authFetch(`${API_BASE}/bands/invite/${token}/accept`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to accept invite');
  return res.json();
}

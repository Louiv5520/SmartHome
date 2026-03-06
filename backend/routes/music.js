const express = require('express');
const router = express.Router();
const db = require('../database/db');
const axios = require('axios');

const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

// Hent access token via Client Credentials (til søgning, charts, track info)
async function getAppAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Spotify Client ID og Secret ikke konfigureret');
  }
  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({ grant_type: 'client_credentials' }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      }
    }
  );
  return response.data.access_token;
}

// Hent brugerens OAuth token fra database (til playback - bruges af frontend)
async function getUserSpotifyToken(userId) {
  return new Promise((resolve, reject) => {
    const database = db.getDb();
    database.get(
      'SELECT access_token, expires_at FROM app_integrations WHERE user_id = ? AND service = ? AND connected = 1',
      [userId, 'spotify'],
      (err, row) => {
        if (err) return reject(err);
        if (!row || !row.access_token) return resolve(null);
        const expiresAt = new Date(row.expires_at);
        if (expiresAt <= new Date()) return resolve(null); // Udløbet
        resolve(row.access_token);
      }
    );
  });
}

let appTokenCache = null;
let appTokenExpiry = 0;

async function getCachedAppToken() {
  if (appTokenCache && Date.now() < appTokenExpiry) {
    return appTokenCache;
  }
  appTokenCache = await getAppAccessToken();
  appTokenExpiry = Date.now() + 55 * 60 * 1000; // 55 min
  return appTokenCache;
}

function deleteCacheKey(cacheKey) {
  const database = db.getDb();
  database.run(
    'DELETE FROM music_cache WHERE cache_key = ?',
    [cacheKey],
    (err) => {
      if (err) console.error('Cache delete error:', err);
    }
  );
}

async function makeSpotifyRequest(endpoint, options = {}) {
  const token = await getCachedAppToken();
  const url = endpoint.startsWith('http') ? endpoint : `${SPOTIFY_API_BASE_URL}${endpoint}`;
  const response = await axios({
    url,
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  return response.data;
}

function getCachedData(cacheKey) {
  return new Promise((resolve, reject) => {
    const database = db.getDb();
    database.get(
      'SELECT * FROM music_cache WHERE cache_key = ? AND expires_at > datetime("now")',
      [cacheKey],
      (err, cached) => {
        if (err) return reject(err);
        if (!cached) {
          resolve(null);
          return;
        }

        try {
          resolve(JSON.parse(cached.data));
        } catch (parseError) {
          console.error(`Invalid cached music data for ${cacheKey}:`, parseError);
          deleteCacheKey(cacheKey);
          resolve(null);
        }
      }
    );
  });
}

function saveCache(cacheKey, data, expiresInMinutes = 5) {
  const database = db.getDb();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
  database.run(
    'INSERT OR REPLACE INTO music_cache (cache_key, data, expires_at) VALUES (?, ?, ?)',
    [cacheKey, JSON.stringify(data), expiresAt.toISOString()],
    (err) => { if (err) console.error('Cache save error:', err); }
  );
}

function formatSpotifyTrack(track) {
  if (!track) return null;
  return {
    id: track.id,
    title: track.name,
    title_short: track.name,
    duration: track.duration_ms ? Math.floor(track.duration_ms / 1000) : 0,
    preview: track.preview_url || null,
    uri: track.uri,
    artist: {
      id: track.artists?.[0]?.id,
      name: track.artists?.[0]?.name || 'Ukendt kunstner',
      picture: track.artists?.[0]?.images?.[0]?.url || null
    },
    album: {
      id: track.album?.id,
      title: track.album?.name || 'Ukendt album',
      cover: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || null,
      cover_big: track.album?.images?.[0]?.url || track.album?.images?.[1]?.url || null
    }
  };
}

router.get('/search', async (req, res) => {
  try {
    const { q, type } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });

    const cacheKey = `search:${q}:${type || 'track'}`;
    const cached = await getCachedData(cacheKey);
    if (cached) return res.json(cached);

    const searchType = (type || 'track') === 'artist' ? 'artist' : (type === 'album' ? 'album' : 'track');
    const data = await makeSpotifyRequest(`/search?q=${encodeURIComponent(q)}&type=${searchType}&limit=25`);

    let results = [];
    if (data.tracks?.items) results = data.tracks.items.map(formatSpotifyTrack);
    else if (data.artists?.items) {
      results = data.artists.items.map(a => ({
        id: a.id,
        name: a.name,
        picture: a.images?.[0]?.url || null
      }));
    } else if (data.albums?.items) {
      results = data.albums.items.map(a => ({
        id: a.id,
        title: a.name,
        cover: a.images?.[1]?.url || a.images?.[0]?.url || null,
        cover_big: a.images?.[0]?.url || null,
        artist: { id: a.artists?.[0]?.id, name: a.artists?.[0]?.name },
        release_date: a.release_date || null
      }));
    }

    const formattedData = { query: q, type: searchType, results, total: results.length };
    saveCache(cacheKey, formattedData, 5);
    res.json(formattedData);
  } catch (error) {
    console.error('Search error:', error);
    res.status(error.response?.status || 500).json({
      error: 'Failed to search music',
      details: error.response?.data?.error?.message || error.response?.data?.error_description || error.message
    });
  }
});

router.get('/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `track:${id}`;
    const cached = await getCachedData(cacheKey);
    if (cached) return res.json(cached);

    const data = await makeSpotifyRequest(`/tracks/${id}`);
    const trackData = formatSpotifyTrack(data);
    saveCache(cacheKey, trackData, 60);
    res.json(trackData);
  } catch (error) {
    console.error('Track error:', error);
    res.status(error.response?.status === 404 ? 404 : 500).json({ error: 'Failed to fetch track' });
  }
});

router.get('/charts', async (req, res) => {
  try {
    const cacheKey = 'charts';
    const cached = await getCachedData(cacheKey);
    if (cached) return res.json(cached);

    let tracks = [];
    try {
      const playlists = await makeSpotifyRequest('/browse/featured-playlists?limit=5');
      const playlistId = playlists.playlists?.items?.[0]?.id;
      if (playlistId) {
        const pl = await makeSpotifyRequest(`/playlists/${playlistId}/tracks?limit=50`);
        if (pl.items) {
          tracks = pl.items
            .filter(i => i.track && i.track.uri)
            .map(i => formatSpotifyTrack(i.track));
        }
      }
    } catch (e) {
      console.error('Charts error:', e);
    }

    const chartsData = { tracks: tracks.slice(0, 50), total: tracks.length };
    saveCache(cacheKey, chartsData, 60);
    res.json(chartsData);
  } catch (error) {
    console.error('Charts error:', error);
    res.status(500).json({ error: 'Failed to fetch charts' });
  }
});

router.get('/artist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `artist:${id}`;
    const cached = await getCachedData(cacheKey);
    if (cached) return res.json(cached);

    const [artistData, topTracksData] = await Promise.all([
      makeSpotifyRequest(`/artists/${id}`),
      makeSpotifyRequest(`/artists/${id}/top-tracks?market=DK`)
    ]);

    const artistInfo = {
      id: artistData.id,
      name: artistData.name,
      picture: artistData.images?.[0]?.url || null,
      picture_big: artistData.images?.[0]?.url || null,
      nb_fan: artistData.followers?.total || 0,
      topTracks: (topTracksData.tracks || []).slice(0, 10).map(formatSpotifyTrack)
    };
    saveCache(cacheKey, artistInfo, 30);
    res.json(artistInfo);
  } catch (error) {
    console.error('Artist error:', error);
    res.status(error.response?.status === 404 ? 404 : 500).json({ error: 'Failed to fetch artist' });
  }
});

router.get('/album/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `album:${id}`;
    const cached = await getCachedData(cacheKey);
    if (cached) return res.json(cached);

    const [albumData, albumTracks] = await Promise.all([
      makeSpotifyRequest(`/albums/${id}`),
      makeSpotifyRequest(`/albums/${id}/tracks`)
    ]);

    const albumInfo = {
      id: albumData.id,
      title: albumData.name,
      cover: albumData.images?.[1]?.url || albumData.images?.[0]?.url || null,
      cover_big: albumData.images?.[0]?.url || null,
      release_date: albumData.release_date || null,
      artist: {
        id: albumData.artists?.[0]?.id,
        name: albumData.artists?.[0]?.name,
        picture: albumData.artists?.[0]?.images?.[0]?.url || null
      },
      tracks: (albumTracks.items || []).map(t => formatSpotifyTrack({ ...t, album: albumData }))
    };
    saveCache(cacheKey, albumInfo, 30);
    res.json(albumInfo);
  } catch (error) {
    console.error('Album error:', error);
    res.status(error.response?.status === 404 ? 404 : 500).json({ error: 'Failed to fetch album' });
  }
});

module.exports = router;

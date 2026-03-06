const express = require('express');
const router = express.Router();
const db = require('../database/db');
const axios = require('axios');
const fs = require('fs');
const DEBUG_LOG = require('path').join(__dirname, '../../.cursor/debug.log');

// Get Spotify access token for user (til playback) - skal være før /:userId
router.get('/:userId/spotify/token', (req, res) => {
  try {
    const { userId } = req.params;
    const database = db.getDb();
    database.get(
      'SELECT access_token, expires_at FROM app_integrations WHERE user_id = ? AND service = ? AND connected = 1',
      [userId, 'spotify'],
      (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row || !row.access_token) return res.json({ connected: false });
        const expiresAt = new Date(row.expires_at);
        if (expiresAt <= new Date()) return res.json({ connected: false });
        res.json({ connected: true, accessToken: row.access_token });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all integrations for a user
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const database = db.getDb();

    database.all(
      'SELECT * FROM app_integrations WHERE user_id = ?',
      [userId],
      (err, integrations) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const formattedIntegrations = integrations.map(integration => ({
          service: integration.service,
          connected: Boolean(integration.connected),
          expiresAt: integration.expires_at,
          config: integration.config ? JSON.parse(integration.config) : null
        }));

        res.json({ integrations: formattedIntegrations });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initiate Spotify OAuth
router.post('/:userId/spotify', (req, res) => {
  try {
    const { userId } = req.params;
    const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
    const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `https://127.0.0.1:3000/opsætning?callback=spotify`;

    if (!SPOTIFY_CLIENT_ID) {
      return res.status(400).json({ error: 'Spotify Client ID not configured' });
    }

    const scopes = 'user-read-playback-state user-modify-playback-state user-read-currently-playing';
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${SPOTIFY_CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${userId}`;

    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Spotify OAuth callback handler
router.post('/:userId/spotify/callback', async (req, res) => {
  try {
    const { userId } = req.params;
    const { code } = req.body;
    // #region agent log
    try { fs.appendFileSync(DEBUG_LOG, JSON.stringify({location:'integrations.js:callbackEntry',message:'Spotify callback received',data:{userId,hasCode:!!code,codeLength:code?.length},timestamp:Date.now(),hypothesisId:'H2,H5'})+'\n'); } catch(_){}
    // #endregion
    const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
    const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `https://127.0.0.1:3000/opsætning?callback=spotify`;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    // Exchange code for access token
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
    // #region agent log
    try { fs.appendFileSync(DEBUG_LOG, JSON.stringify({location:'integrations.js:tokenExchange',message:'Spotify token exchange success',data:{userId},timestamp:Date.now(),hypothesisId:'H3'})+'\n'); } catch(_){}
    // #endregion

    const database = db.getDb();

    // Check if integration exists
    database.get(
      'SELECT * FROM app_integrations WHERE user_id = ? AND service = ?',
      [userId, 'spotify'],
      (err, existing) => {
        if (err) {
          console.error('Error checking Spotify integration:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (existing) {
          // Update existing
          database.run(
            `UPDATE app_integrations 
             SET access_token = ?, refresh_token = ?, expires_at = ?, connected = 1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ? AND service = ?`,
            [access_token, refresh_token, expiresAt, userId, 'spotify'],
            (err) => {
              if (err) {
                console.error('Error updating Spotify integration:', err);
                try { fs.appendFileSync(DEBUG_LOG, JSON.stringify({location:'integrations.js:dbUpdateError',message:'DB update failed',data:{userId,err:err.message},timestamp:Date.now(),hypothesisId:'H4'})+'\n'); } catch(_){}
                return res.status(500).json({ error: 'Failed to update integration' });
              }
              try { fs.appendFileSync(DEBUG_LOG, JSON.stringify({location:'integrations.js:dbSaveSuccess',message:'Spotify integration saved (update)',data:{userId},timestamp:Date.now(),hypothesisId:'H4'})+'\n'); } catch(_){}
              res.json({ success: true, message: 'Spotify connected successfully', accessToken: access_token });
            }
          );
        } else {
          // Create new
          database.run(
            `INSERT INTO app_integrations (user_id, service, access_token, refresh_token, expires_at, connected)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [userId, 'spotify', access_token, refresh_token, expiresAt],
            (err) => {
              if (err) {
                console.error('Error saving Spotify integration:', err);
                try { fs.appendFileSync(DEBUG_LOG, JSON.stringify({location:'integrations.js:dbInsertError',message:'DB insert failed',data:{userId,err:err.message},timestamp:Date.now(),hypothesisId:'H4'})+'\n'); } catch(_){}
                return res.status(500).json({ error: 'Failed to save integration' });
              }
              try { fs.appendFileSync(DEBUG_LOG, JSON.stringify({location:'integrations.js:dbSaveSuccess',message:'Spotify integration saved (insert)',data:{userId},timestamp:Date.now(),hypothesisId:'H4'})+'\n'); } catch(_){}
              res.json({ success: true, message: 'Spotify connected successfully', accessToken: access_token });
            }
          );
        }
      }
    );
  } catch (error) {
    try { fs.appendFileSync(DEBUG_LOG, JSON.stringify({location:'integrations.js:callbackError',message:'Spotify callback exception',data:{errorMessage:error.message,responseStatus:error.response?.status},timestamp:Date.now(),hypothesisId:'H2,H3'})+'\n'); } catch(_){}
    console.error('Spotify OAuth error:', error);
    res.status(500).json({ error: 'Failed to connect Spotify' });
  }
});

// Initiate Google Calendar OAuth
router.post('/:userId/google-calendar', (req, res) => {
  try {
    const { userId } = req.params;
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://127.0.0.1:3000/opsætning?callback=google-calendar`;

    if (!GOOGLE_CLIENT_ID) {
      return res.status(400).json({ error: 'Google Client ID not configured' });
    }

    const scopes = 'https://www.googleapis.com/auth/calendar.readonly';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${userId}`;

    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Google Calendar OAuth callback handler
router.post('/:userId/google-calendar/callback', async (req, res) => {
  try {
    const { userId } = req.params;
    const { code } = req.body;
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://127.0.0.1:3000/opsætning?callback=google-calendar`;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    // Exchange code for access token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token',
      {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const database = db.getDb();

    // Check if integration exists
    database.get(
      'SELECT * FROM app_integrations WHERE user_id = ? AND service = ?',
      [userId, 'google-calendar'],
      (err, existing) => {
        if (err) {
          console.error('Error checking Google Calendar integration:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (existing) {
          // Update existing
          database.run(
            `UPDATE app_integrations 
             SET access_token = ?, refresh_token = ?, expires_at = ?, connected = 1, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = ? AND service = ?`,
            [access_token, refresh_token, expiresAt, userId, 'google-calendar'],
            (err) => {
              if (err) {
                console.error('Error updating Google Calendar integration:', err);
                return res.status(500).json({ error: 'Failed to update integration' });
              }
              res.json({ success: true, message: 'Google Calendar connected successfully' });
            }
          );
        } else {
          // Create new
          database.run(
            `INSERT INTO app_integrations (user_id, service, access_token, refresh_token, expires_at, connected)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [userId, 'google-calendar', access_token, refresh_token, expiresAt],
            (err) => {
              if (err) {
                console.error('Error saving Google Calendar integration:', err);
                return res.status(500).json({ error: 'Failed to save integration' });
              }
              res.json({ success: true, message: 'Google Calendar connected successfully' });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('Google Calendar OAuth error:', error);
    res.status(500).json({ error: 'Failed to connect Google Calendar' });
  }
});

// Initiate Smart Home connection (placeholder - implementer specifik protokol senere)
router.post('/:userId/smart-home', (req, res) => {
  try {
    const { userId } = req.params;
    const { provider } = req.body; // 'homekit', 'philips-hue', etc.

    // Placeholder - implementer specifik OAuth flow baseret på provider
    res.json({ 
      message: 'Smart Home integration not yet implemented',
      provider: provider 
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disconnect an integration
router.delete('/:userId/:service', (req, res) => {
  try {
    const { userId, service } = req.params;
    const database = db.getDb();

    database.run(
      'DELETE FROM app_integrations WHERE user_id = ? AND service = ?',
      [userId, service],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, message: `${service} disconnected` });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

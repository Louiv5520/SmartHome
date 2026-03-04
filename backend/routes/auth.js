const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Google OAuth callback - verify and create/update user
router.post('/google', async (req, res) => {
  try {
    const { googleId, email, name, picture } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ error: 'Google ID and email are required' });
    }

    const database = db.getDb();

    // Check if user exists
    database.get(
      'SELECT * FROM users WHERE google_id = ? OR email = ?',
      [googleId, email],
      (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (user) {
          // Update existing user
          database.run(
            'UPDATE users SET name = ?, picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, picture, user.id],
            (err) => {
              if (err) {
                console.error('Update error:', err);
                return res.status(500).json({ error: 'Failed to update user' });
              }
              res.json({ user: { ...user, name, picture } });
            }
          );
        } else {
          // Create new user
          database.run(
            'INSERT INTO users (google_id, email, name, picture) VALUES (?, ?, ?, ?)',
            [googleId, email, name, picture],
            function(err) {
              if (err) {
                console.error('Insert error:', err);
                return res.status(500).json({ error: 'Failed to create user' });
              }
              res.json({
                user: {
                  id: this.lastID,
                  googleId,
                  email,
                  name,
                  picture
                }
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/user/:id', (req, res) => {
  try {
    const { id } = req.params;
    const database = db.getDb();

    database.get(
      'SELECT * FROM users WHERE id = ?',
      [id],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

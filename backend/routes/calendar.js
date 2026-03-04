const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get all calendar events for a user
router.get('/:userId/events', (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query; // Optional: filter by date
    const database = db.getDb();

    let query = 'SELECT * FROM calendar_events WHERE user_id = ?';
    const params = [userId];

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    query += ' ORDER BY date, time';

    database.all(query, params, (err, events) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ events });
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's events
router.get('/:userId/events/today', (req, res) => {
  try {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const database = db.getDb();

    database.all(
      'SELECT * FROM calendar_events WHERE user_id = ? AND date = ? ORDER BY time',
      [userId, today],
      (err, events) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ events });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new calendar event
router.post('/:userId/events', (req, res) => {
  try {
    const { userId } = req.params;
    const { title, description, date, time, type } = req.body;

    if (!title || !date || !time || !type) {
      return res.status(400).json({ error: 'Title, date, time, and type are required' });
    }

    const database = db.getDb();

    database.run(
      'INSERT INTO calendar_events (user_id, title, description, date, time, type) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, title, description || null, date, time, type],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create event' });
        }
        res.status(201).json({
          event: {
            id: this.lastID,
            userId,
            title,
            description,
            date,
            time,
            type
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a calendar event
router.put('/:userId/events/:eventId', (req, res) => {
  try {
    const { userId, eventId } = req.params;
    const { title, description, date, time, type } = req.body;
    const database = db.getDb();

    database.run(
      `UPDATE calendar_events 
       SET title = ?, description = ?, date = ?, time = ?, type = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [title, description, date, time, type, eventId, userId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update event' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Event not found' });
        }
        res.json({ success: true, message: 'Event updated' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a calendar event
router.delete('/:userId/events/:eventId', (req, res) => {
  try {
    const { userId, eventId } = req.params;
    const database = db.getDb();

    database.run(
      'DELETE FROM calendar_events WHERE id = ? AND user_id = ?',
      [eventId, userId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete event' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Event not found' });
        }
        res.json({ success: true, message: 'Event deleted' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

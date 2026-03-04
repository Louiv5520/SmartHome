const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Admin route to clear all user sessions (requires admin key)
// This doesn't delete users from database, just clears their session data
router.post('/logout-all', (req, res) => {
  try {
    const { adminKey } = req.body;
    const ADMIN_KEY = process.env.ADMIN_KEY || 'change-this-in-production';

    if (adminKey !== ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Note: This only clears server-side sessions if we had them
    // For localStorage-based auth, clients need to clear their own storage
    // This endpoint can be used to notify clients or clear server-side cache
    
    res.json({ 
      success: true, 
      message: 'All users should clear their localStorage. Call window.logoutAllUsers() in browser console or refresh after clearing storage.' 
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// This route is handled by users.js, but kept for consistency
router.get('/:userId', (req, res) => {
  res.redirect(`/api/users/${req.params.userId}/settings`);
});

module.exports = router;

const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  return res.json({ users: [] });
});

router.get('/me', auth, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;

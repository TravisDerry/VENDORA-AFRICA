const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, role = 'customer' } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!['customer', 'business'].includes(role)) {
    return res.status(400).json({ error: 'Choose a valid account type' });
  }

  const token = jwt.sign({ email, role }, process.env.JWT_SECRET || 'vendora-africa-secret', {
    expiresIn: '7d'
  });

  return res.json({
    message: 'Login successful',
    token,
    role
  });
});

router.post('/register', (req, res) => {
  return res.status(201).json({
    message: 'Registration handled through the business form.'
  });
});

module.exports = router;

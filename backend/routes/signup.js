const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, department, role, password } = req.body;
    
    if (!firstName || !lastName || !email || !department || !role || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (password.length < 3) {
      return res.status(400).json({ error: 'Password must be at least 3 characters' });
    }
    
    const id = `PU-${Date.now()}`;
    
    await db.query(
      'INSERT INTO pending_users (id, first_name, last_name, email, department, role, password) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, firstName, lastName, email, department, role, password]
    );
    
    res.json({ success: true, message: 'Registration submitted for approval' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

module.exports = router;
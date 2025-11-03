const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Get all users
    const [users] = await db.query('SELECT * FROM users');

    // Find user by email
    const user = users.find(u => u.email === username.toLowerCase().trim());

    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if account is active
    if (user.account_status !== 'Active') {
      return res.status(403).json({ error: 'Account pending approval' });
    }

    // Check password - direct comparison (no hashing for simplicity)
    if (password !== user.password) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Log system event
    await db.query(
      'INSERT INTO system_logs (id, category, action, detail, actor, severity) VALUES (?, ?, ?, ?, ?, ?)',
      [`LOG-${Date.now()}`, 'System', 'User Login', `${user.name} signed in.`, user.name, 'Info']
    );

    res.json({ success: true, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get all users (for dropdowns, etc.)
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.query('SELECT * FROM users ORDER BY name');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, dept } = req.body;
    
    await db.query(
      'UPDATE users SET name = ?, role = ?, dept = ? WHERE id = ?',
      [name, role, dept, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});
// Create new user (Admin only)
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, dept, rfidCard } = req.body;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate user ID
    const rolePrefix = {
      'Student': 'S',
      'Professor': 'P',
      'Department Head': 'DH',
      'Counselor': 'C',
      'System Admin': 'SA',
      'Super Admin': 'SU'
    };
    const prefix = rolePrefix[role] || 'U';
    const userId = `${prefix}${Date.now()}`;

    // Insert user
    await db.query(
      'INSERT INTO users (id, name, email, password, role, dept, account_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, name, email, password, role, dept || null, 'Active']
    );

    // If student and RFID provided, register RFID card
    if (role === 'Student' && rfidCard) {
      // Check if RFID already exists
      const [existingRFID] = await db.query('SELECT card_number FROM rfid_cards WHERE card_number = ?', [rfidCard]);
      if (existingRFID.length > 0) {
        // Delete the user we just created
        await db.query('DELETE FROM users WHERE id = ?', [userId]);
        return res.status(400).json({ error: 'RFID card already registered to another student' });
      }

      await db.query(
        'INSERT INTO rfid_cards (card_number, student_id) VALUES (?, ?)',
        [rfidCard, userId]
      );
    }

    // Log system event
    await db.query(
      'INSERT INTO system_logs (id, category, action, detail, actor, severity) VALUES (?, ?, ?, ?, ?, ?)',
      [
        `LOG-${Date.now()}`,
        'System',
        'User Created',
        `${name} (${role}) created by admin`,
        'Super Admin',
        'Info'
      ]
    );

    res.json({ success: true, userId, message: 'User created successfully' });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

module.exports = router;
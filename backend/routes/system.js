const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get system logs
router.get('/logs', async (req, res) => {
  try {
    const { category, severity, limit } = req.query;
    
    let query = 'SELECT * FROM system_logs WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    query += ' ORDER BY timestamp DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    } else {
      query += ' LIMIT 500';
    }

    const [rows] = await db.query(query, params);
    
    // Parse JSON meta field
    const parsed = rows.map(row => ({
      ...row,
      meta: row.meta ? JSON.parse(row.meta) : {}
    }));
    
    res.json(parsed);
  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
});

// Create system log
router.post('/logs', async (req, res) => {
  try {
    const { id, category, severity, action, detail, actor, meta } = req.body;

    await db.query(
      'INSERT INTO system_logs (id, category, severity, action, detail, actor, meta) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        id || `LOG-${Date.now()}`,
        category || 'System',
        severity || 'Info',
        action || '-',
        detail || '',
        actor || 'System',
        JSON.stringify(meta || {})
      ]
    );

    res.json({ success: true, message: 'Log created' });
  } catch (error) {
    console.error('Create system log error:', error);
    res.status(500).json({ error: 'Failed to create log' });
  }
});

// Get approvals
router.get('/approvals', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = 'SELECT * FROM approvals WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY requested_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

// Create approval
router.post('/approvals', async (req, res) => {
  try {
    const { id, type, submittedBy, detail } = req.body;

    await db.query(
      'INSERT INTO approvals (id, type, submitted_by, detail, status) VALUES (?, ?, ?, ?, ?)',
      [id, type, submittedBy, detail || '', 'Pending']
    );

    res.json({ success: true, message: 'Approval created' });
  } catch (error) {
    console.error('Create approval error:', error);
    res.status(500).json({ error: 'Failed to create approval' });
  }
});

// Update approval status
router.put('/approvals/:approvalId', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { status, decidedBy } = req.body;

    await db.query(
      'UPDATE approvals SET status = ?, decided_at = ?, decided_by = ? WHERE id = ?',
      [status, new Date().toISOString(), decidedBy || 'Super Admin', approvalId]
    );

    // Log system event
    await db.query(
      'INSERT INTO system_logs (id, category, action, detail, actor, severity) VALUES (?, ?, ?, ?, ?, ?)',
      [
        `LOG-${Date.now()}`,
        'System',
        'Approval Decision',
        `${approvalId} → ${status}`,
        decidedBy || 'Super Admin',
        status === 'Rejected' ? 'Warning' : 'Info'
      ]
    );

    res.json({ success: true, message: 'Approval updated' });
  } catch (error) {
    console.error('Update approval error:', error);
    res.status(500).json({ error: 'Failed to update approval' });
  }
});

// Get pending users
router.get('/pending-users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pending_users WHERE status = "Pending" ORDER BY requested_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// Approve user endpoint - FIXED VERSION
// Approve user - UPDATED VERSION
router.post('/approve-user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { decidedBy } = req.body;
    
    // Get pending user
    const [pending] = await db.query('SELECT * FROM pending_users WHERE id = ?', [id]);
    if (pending.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = pending[0];
    const userId = `U${Date.now()}`;
    const fullName = `${user.first_name} ${user.last_name}`;
    
    // FIRST: Update pending_users status to Approved
    await db.query(
      'UPDATE pending_users SET status = "Approved", decided_by = ?, decided_at = ? WHERE id = ?',
      [decidedBy, new Date().toISOString(), id]
    );
    
    // THEN: Insert into users table WITH PASSWORD
    await db.query(
      'INSERT INTO users (id, name, email, role, dept, password, account_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, fullName, user.email, user.role, user.department, user.password, 'Active']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Approval failed' });
  }
});

// Reject user
router.post('/reject-user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { decidedBy } = req.body;
    
    await db.query(
      'UPDATE pending_users SET status = "Rejected", decided_by = ?, decided_at = ? WHERE id = ?',
      [decidedBy, new Date().toISOString(), id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Rejection failed' });
  }
});

module.exports = router;
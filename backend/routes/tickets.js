const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all tickets
router.get('/', async (req, res) => {
  try {
    const { status, priority, requestorId } = req.query;
    
    let query = 'SELECT * FROM tickets WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }
    if (requestorId) {
      query += ' AND requestor_id = ?';
      params.push(requestorId);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Create ticket
router.post('/', async (req, res) => {
  try {
    const { id, subject, category, priority, details, ownerId, requestorId } = req.body;

    await db.query(
      'INSERT INTO tickets (id, subject, category, priority, details, owner_id, requestor_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, subject, category || 'Other', priority || 'Medium', details || '', ownerId || 'SU1', requestorId, 'Open']
    );

    // Log system event
    await db.query(
      'INSERT INTO system_logs (id, category, action, detail, actor, severity) VALUES (?, ?, ?, ?, ?, ?)',
      [
        `LOG-${Date.now()}`,
        'Tickets',
        'Ticket Created',
        `${id} · ${subject} · ${priority || 'Medium'}`,
        requestorId || 'System',
        priority === 'Critical' ? 'Critical' : 'Info'
      ]
    );

    res.json({ success: true, message: 'Ticket created', ticketId: id });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Update ticket status
router.put('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, resolvedBy } = req.body;

    const resolvedAt = status === 'Resolved' ? new Date().toISOString() : null;

    await db.query(
      'UPDATE tickets SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?',
      [status, resolvedAt, resolvedBy || null, ticketId]
    );

    // Log system event
    await db.query(
      'INSERT INTO system_logs (id, category, action, detail, actor, severity) VALUES (?, ?, ?, ?, ?, ?)',
      [
        `LOG-${Date.now()}`,
        'Tickets',
        `Ticket ${status}`,
        `Ticket ${ticketId} marked ${status}`,
        resolvedBy || 'System',
        status === 'Resolved' ? 'Info' : 'Warning'
      ]
    );

    res.json({ success: true, message: 'Ticket updated' });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

module.exports = router;
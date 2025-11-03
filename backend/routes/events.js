const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get events (counseling appointments)
router.get('/', async (req, res) => {
  try {
    const { studentId, counselorId, status } = req.query;
    
    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];

    if (studentId) {
      query += ' AND student_id = ?';
      params.push(studentId);
    }
    if (counselorId) {
      query += ' AND counselor_id = ?';
      params.push(counselorId);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY requested_at DESC';

    const [rows] = await db.query(query, params);
    
    // Parse JSON fields
    const parsed = rows.map(row => ({
      ...row,
      history: row.history ? JSON.parse(row.history) : []
    }));
    
    res.json(parsed);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create event (counseling appointment request)
router.post('/', async (req, res) => {
  try {
    const { id, studentId, counselorId, mood, meetingDate, slot, note } = req.body;

    const [requester] = await db.query('SELECT role FROM users WHERE id = ?', [studentId]);
    if (requester.length === 0 || requester[0].role !== 'Student') {
      return res.status(403).json({ error: 'Only students can request appointments' });
    }

    const history = JSON.stringify([{
      Action: 'Requested',
      Timestamp: new Date().toISOString()
    }]);

    await db.query(
      'INSERT INTO events (id, student_id, counselor_id, mood, meeting_date, slot, note, status, history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, studentId, counselorId, mood, meetingDate || null, slot || null, note || null, 'Pending', history]
    );

    // Log system event
    const [student] = await db.query('SELECT name FROM users WHERE id = ?', [studentId]);
    await db.query(
      'INSERT INTO system_logs (id, category, action, detail, actor, severity) VALUES (?, ?, ?, ?, ?, ?)',
      [
        `LOG-${Date.now()}`,
        'Wellness',
        'Appointment Requested',
        `${student[0]?.name} requested counseling meeting`,
        student[0]?.name || 'System',
        'Info'
      ]
    );

    res.json({ success: true, message: 'Event created' });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event status
router.put('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, responseNote, meetingDate, slot } = req.body;

    // Get existing event
    const [existing] = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = existing[0];

    if (counselorId && event.counselor_id !== counselorId) {
      return res.status(403).json({ error: 'You can only update your own appointments' });}
    const history = event.history ? JSON.parse(event.history) : [];
    
    // Add history entry
    history.push({
      Action: status,
      Detail: responseNote || '',
      Timestamp: new Date().toISOString()
    });

    // Build update query
    let query = 'UPDATE events SET status = ?, history = ?';
    const params = [status, JSON.stringify(history)];

    if (responseNote !== undefined) {
      query += ', response_note = ?';
      params.push(responseNote);
    }
    if (meetingDate !== undefined) {
      query += ', meeting_date = ?';
      params.push(meetingDate);
    }
    if (slot !== undefined) {
      query += ', slot = ?';
      params.push(slot);
    }

    query += ' WHERE id = ?';
    params.push(eventId);

    await db.query(query, params);

    // Log system event
    await db.query(
      'INSERT INTO system_logs (id, category, action, detail, actor, severity) VALUES (?, ?, ?, ?, ?, ?)',
      [
        `LOG-${Date.now()}`,
        'Wellness',
        `Appointment ${status}`,
        `Event ${eventId} marked ${status}`,
        'Counselor',
        'Info'
      ]
    );

    res.json({ success: true, message: 'Event updated' });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

module.exports = router;
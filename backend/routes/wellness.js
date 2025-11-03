const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all wellness logs
router.get('/', async (req, res) => {
  try {
    const { studentId, date, mood } = req.query;
    
    let query = 'SELECT * FROM wellness_logs WHERE 1=1';
    const params = [];

    if (studentId) {
      query += ' AND student_id = ?';
      params.push(studentId);
    }
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    if (mood) {
      query += ' AND mood = ?';
      params.push(mood);
    }

    query += ' ORDER BY date DESC, logged_at DESC';

    const [rows] = await db.query(query, params);
    
    // Parse JSON fields
    const parsed = rows.map(row => ({
      ...row,
      factors: row.factors ? JSON.parse(row.factors) : []
    }));
    
    res.json(parsed);
  } catch (error) {
    console.error('Get wellness logs error:', error);
    res.status(500).json({ error: 'Failed to fetch wellness logs' });
  }
});

// Create wellness log
router.post('/', async (req, res) => {
  try {
    const { studentId, date, mood, factors, wantsMeeting, slot, note } = req.body;

    await db.query(
      'INSERT INTO wellness_logs (student_id, date, mood, factors, wants_meeting, slot, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [studentId, date, mood, JSON.stringify(factors || []), wantsMeeting || false, slot || null, note || null]
    );

    // Log system event
    const [student] = await db.query('SELECT name FROM users WHERE id = ?', [studentId]);
    await db.query(
      'INSERT INTO system_logs (id, category, action, detail, actor, severity) VALUES (?, ?, ?, ?, ?, ?)',
      [
        `LOG-${Date.now()}`,
        'Wellness',
        'Mood Logged',
        `${student[0]?.name} → ${mood}${wantsMeeting ? ' (wants meeting)' : ''}`,
        student[0]?.name || 'System',
        'Info'
      ]
    );

    res.json({ success: true, message: 'Wellness log created' });
  } catch (error) {
    console.error('Create wellness log error:', error);
    res.status(500).json({ error: 'Failed to create wellness log' });
  }
});

// Get wellness summary (for counselor dashboard)
router.get('/summary', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const [summary] = await db.query(
      'SELECT mood, COUNT(*) as count FROM wellness_logs WHERE date = ? GROUP BY mood',
      [targetDate]
    );

    const [flags] = await db.query(
      'SELECT COUNT(*) as count FROM wellness_logs WHERE date = ? AND (mood = "Not Okay" OR wants_meeting = TRUE)',
      [targetDate]
    );

    res.json({
      summary,
      flags: flags[0].count,
      date: targetDate
    });
  } catch (error) {
    console.error('Get wellness summary error:', error);
    res.status(500).json({ error: 'Failed to fetch wellness summary' });
  }
});

module.exports = router;
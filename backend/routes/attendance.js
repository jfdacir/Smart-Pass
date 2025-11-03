const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all attendance records
router.get('/', async (req, res) => {
  try {
    const { studentId, courseId, date } = req.query;
    
    let query = 'SELECT * FROM attendance WHERE 1=1';
    const params = [];

    if (studentId) {
      query += ' AND student_id = ?';
      params.push(studentId);
    }
    if (courseId) {
      query += ' AND course_id = ?';
      params.push(courseId);
    }
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    query += ' ORDER BY date DESC, logged_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Log attendance (RFID scan)
router.post('/', async (req, res) => {
  try {
    const { studentId, courseId, date, status } = req.body;

    // Check if record exists
    const [existing] = await db.query(
      'SELECT id FROM attendance WHERE student_id = ? AND course_id = ? AND date = ?',
      [studentId, courseId, date]
    );

    if (existing.length > 0) {
      // Update existing
      await db.query(
        'UPDATE attendance SET status = ? WHERE id = ?',
        [status, existing[0].id]
      );
    } else {
      // Insert new
      await db.query(
        'INSERT INTO attendance (student_id, course_id, date, status) VALUES (?, ?, ?, ?)',
        [studentId, courseId, date, status]
      );
    }

    // Log system event
    const [student] = await db.query('SELECT name FROM users WHERE id = ?', [studentId]);
    await db.query(
      'INSERT INTO system_logs (id, category, action, detail, actor, severity) VALUES (?, ?, ?, ?, ?, ?)',
      [
        `LOG-${Date.now()}`,
        'Attendance',
        'RFID Log',
        `${student[0]?.name} marked ${status} for ${courseId} on ${date}`,
        student[0]?.name || 'System',
        status === 'Absent' ? 'Warning' : 'Info'
      ]
    );

    res.json({ success: true, message: 'Attendance logged' });
  } catch (error) {
    console.error('Log attendance error:', error);
    res.status(500).json({ error: 'Failed to log attendance' });
  }
});

// Get RFID card mapping
router.get('/rfid/:cardNumber', async (req, res) => {
  try {
    const { cardNumber } = req.params;
    const [rows] = await db.query('SELECT student_id FROM rfid_cards WHERE card_number = ?', [cardNumber]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ studentId: rows[0].student_id });
  } catch (error) {
    console.error('RFID lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup card' });
  }
});

module.exports = router;
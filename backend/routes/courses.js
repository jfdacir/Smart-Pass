const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all courses
router.get('/', async (req, res) => {
  try {
    const { professorId, dept } = req.query;
    
    let query = 'SELECT * FROM courses WHERE 1=1';
    const params = [];

    if (professorId) {
      query += ' AND professor_id = ?';
      params.push(professorId);
    }
    if (dept) {
      query += ' AND dept = ?';
      params.push(dept);
    }

    query += ' ORDER BY course_id';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get course enrollments
router.get('/enrollments', async (req, res) => {
  try {
    const { courseId, studentId } = req.query;
    
    let query = 'SELECT * FROM course_students WHERE 1=1';
    const params = [];

    if (courseId) {
      query += ' AND course_id = ?';
      params.push(courseId);
    }
    if (studentId) {
      query += ' AND student_id = ?';
      params.push(studentId);
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Get RFID cards
router.get('/rfid-cards', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM rfid_cards');
    res.json(rows);
  } catch (error) {
    console.error('Get RFID cards error:', error);
    res.status(500).json({ error: 'Failed to fetch RFID cards' });
  }
});

module.exports = router;
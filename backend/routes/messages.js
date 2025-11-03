const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get messages for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [messages] = await db.query(
      'SELECT * FROM messages WHERE recipient_id = ? ORDER BY sent_at DESC',
      [userId]
    );
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/', async (req, res) => {
  try {
    const { senderId, recipientId, subject, message, date } = req.body;

    await db.query(
      'INSERT INTO messages (sender_id, recipient_id, subject, message, date) VALUES (?, ?, ?, ?, ?)',
      [senderId, recipientId, subject, message, date]
    );

    res.json({ success: true, message: 'Message sent' });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.put('/read/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await db.query('UPDATE messages SET is_read = TRUE WHERE recipient_id = ?', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Get unread count
router.get('/unread/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND is_read = FALSE',
      [userId]
    );
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

module.exports = router;
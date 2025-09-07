const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const db = require('../config/db');

// @route   GET api/users
// @desc    すべてのユーザーを取得する (for admin shift board)
// @access  Private (Admin)
router.get('/', [auth, admin], async (req, res) => {
  try {
    // 管理画面で使うため、役割(role)も取得するように変更
    const users = await db.query('SELECT id, name, role FROM users ORDER BY created_at ASC');
    res.json(users.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

module.exports = router;

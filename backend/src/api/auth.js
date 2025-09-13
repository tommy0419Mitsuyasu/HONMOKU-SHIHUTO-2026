const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

// POST /api/auth/register
// ユーザー新規登録
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'すべての項目を入力してください。' });
  }

  const allowedRoles = ['admin', 'staff', 'staff_hs'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: '無効な役割が指定されました。' });
  }

  try {
    // パスワードをハッシュ化
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // データベースにユーザーを保存
    const newUser = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, passwordHash, role]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    console.error(error);
    // emailの重複エラーなど
    if (error.code === '23505') {
        return res.status(409).json({ message: 'このメールアドレスは既に使用されています。' });
    }
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

// POST /api/auth/login
// ログイン
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'メールアドレスとパスワードを入力してください。' });
  }

  try {
    // ユーザーを検索
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: '認証情報が無効です。' });
    }

    // パスワードを比較
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: '認証情報が無効です。' });
    }

    // JWTを生成
    const payload = {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

module.exports = router;

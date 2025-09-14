const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { sendPasswordResetEmail } = require('../config/mailer');

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

// @route   POST /api/auth/forgot-password
// @desc    パスワードリセットを要求する
// @access  Public
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'メールアドレスを入力してください。' });
  }

  try {
    // ユーザーが存在するか確認
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      // ユーザーが存在しない場合でも、セキュリティのため成功したかのように見せかける
      return res.json({ message: 'パスワードリセット用のメールを送信しました。' });
    }

    // 既存のトークンを削除
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

    // 新しいリセットトークンを生成
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1時間後に失効

    // トークンをDBに保存
    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    // パスワードリセットメールを送信
    await sendPasswordResetEmail(user.email, token);

    res.json({ message: 'パスワードリセット用のメールを送信しました。' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '処理中にエラーが発生しました。' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    新しいパスワードを設定する
// @access  Public
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: 'トークンと新しいパスワードを入力してください。' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // トークンを検証
    const tokenResult = await db.query(
      'SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );
    const resetToken = tokenResult.rows[0];

    if (!resetToken) {
      return res.status(400).json({ message: '無効なトークンか、有効期限が切れています。' });
    }

    // 新しいパスワードをハッシュ化
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // ユーザーのパスワードを更新
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      passwordHash,
      resetToken.user_id,
    ]);

    // 使用済みトークンを削除
    await db.query('DELETE FROM password_reset_tokens WHERE id = $1', [resetToken.id]);

    res.json({ message: 'パスワードが正常に更新されました。' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '処理中にエラーが発生しました。' });
  }
});

module.exports = router;

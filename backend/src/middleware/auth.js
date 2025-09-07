const jwt = require('jsonwebtoken');

// リクエストヘッダーからトークンを検証するミドルウェア
module.exports = function (req, res, next) {
  // ヘッダーからトークンを取得
  const token = req.header('x-auth-token');

  // トークンがない場合
  if (!token) {
    return res.status(401).json({ message: 'トークンがありません。認証が拒否されました。' });
  }

  // トークンを検証
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user; // リクエストオブジェクトにユーザー情報を格納
    next(); // 次のミドルウェアへ
  } catch (err) {
    res.status(401).json({ message: 'トークンが無効です。' });
  }
};

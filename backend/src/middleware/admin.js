// ログインユーザーが管理者(admin)かどうかをチェックするミドルウェア
module.exports = function (req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'アクセス権がありません。管理者権限が必要です。' });
  }
  next();
};

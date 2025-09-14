const nodemailer = require('nodemailer');

// メール送信クライアントの設定
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * パスワードリセットメールを送信する
 * @param {string} to 送信先メールアドレス
 * @param {string} token パスワードリセットトークン
 */
const sendPasswordResetEmail = async (to, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"シフト管理システム" <${process.env.SMTP_FROM_EMAIL}>`,
    to: to,
    subject: 'パスワードリセットのご案内',
    html: `
      <p>パスワードリセットのリクエストを受け付けました。</p>
      <p>以下のリンクをクリックして、新しいパスワードを設定してください。このリンクは1時間のみ有効です。</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>このリクエストに心当たりがない場合は、このメールを無視してください。</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${to}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('メールの送信に失敗しました。');
  }
};

module.exports = { sendPasswordResetEmail };

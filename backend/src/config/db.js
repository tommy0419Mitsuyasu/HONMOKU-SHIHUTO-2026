require('dotenv').config();
const { Pool } = require('pg');

// .envファイルからデータベース接続情報を読み込みます
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// アプリケーション全体でクエリを実行するためにプールをエクスポートします
module.exports = {
  query: (text, params) => pool.query(text, params),
};

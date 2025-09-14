-- ユーザーテーブル
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff', 'staff_hs')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 希望シフトテーブル
CREATE TABLE shift_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 確定シフトテーブル
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- サンプルデータの挿入 (任意)
-- 管理者ユーザー
INSERT INTO users (name, email, password_hash, role) VALUES ('管理者 太郎', 'admin@example.com', 'ここにハッシュ化されたパスワード', 'admin');
-- スタッフユーザー
INSERT INTO users (name, email, password_hash, role) VALUES ('スタッフ 次郎', 'staff@example.com', 'ここにハッシュ化されたパスワード', 'staff');

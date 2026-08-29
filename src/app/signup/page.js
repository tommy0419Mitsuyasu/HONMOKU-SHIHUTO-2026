'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './signup.css';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    staff_type: 'general',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const isMinor = formData.staff_type === 'high_school';
      const hourlyWage = 1300; // Default wages, can be changed by admin later

      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role: 'staff',
          is_minor: isMinor,
          hourly_wage: hourlyWage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登録に失敗しました');
      }

      // Success, redirect to login
      alert('アカウントが作成されました。ログインしてください。');
      router.push('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-header">
          <h1 className="signup-title">🏊 本牧市民プール</h1>
          <p className="signup-subtitle">スタッフ新規登録</p>
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">氏名</label>
            <input
              type="text"
              name="full_name"
              className="form-input"
              value={formData.full_name}
              onChange={handleChange}
              required
              placeholder="本牧 太郎"
            />
          </div>

          <div className="form-group">
            <label className="form-label">メールアドレス</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="email@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">パスワード</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              placeholder="6文字以上"
            />
          </div>

          <div className="form-group">
            <label className="form-label">属性</label>
            <select
              name="staff_type"
              className="form-input"
              value={formData.staff_type}
              onChange={handleChange}
              required
            >
              <option value="general">一般 (大学生以上)</option>
              <option value="high_school">高校生</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? '登録中...' : 'アカウントを作成'}
          </button>
        </form>

        <div className="signup-footer">
          すでにアカウントをお持ちですか？ <Link href="/login">ログイン</Link>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const { email, password } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', formData);
      // トークンをlocalStorageに保存
      localStorage.setItem('token', res.data.token);
      alert('ログインしました。');
      navigate('/');
      window.location.reload(); // ページをリロードしてナビゲーションバーの状態を更新
    } catch (err) {
      console.error(err.response.data);
      setError(err.response.data.message || 'ログインに失敗しました。');
    }
  };

  return (
    <div>
      <h1>ログイン</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={onSubmit}>
        <div>
          <input
            type="email"
            placeholder="メールアドレス"
            name="email"
            value={email}
            onChange={onChange}
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="パスワード"
            name="password"
            value={password}
            onChange={onChange}
            required
          />
        </div>
        <input type="submit" value="ログイン" />
      </form>
    </div>
  );
};

export default LoginPage;

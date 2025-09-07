import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff', // Default role
  });
  const [error, setError] = useState('');

  const { name, email, password, role } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', formData);
      alert('登録が完了しました。ログインページに移動します。');
      navigate('/login');
    } catch (err) {
      console.error(err.response.data);
      setError(err.response.data.message || '登録に失敗しました。');
    }
  };

  return (
    <div>
      <h1>ユーザー登録</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={onSubmit}>
        <div>
          <input
            type="text"
            placeholder="名前"
            name="name"
            value={name}
            onChange={onChange}
            required
          />
        </div>
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
        <div>
          <select name="role" value={role} onChange={onChange}>
            <option value="staff">スタッフ</option>
            <option value="admin">管理者</option>
          </select>
        </div>
        <input type="submit" value="登録" />
      </form>
    </div>
  );
};

export default RegisterPage;

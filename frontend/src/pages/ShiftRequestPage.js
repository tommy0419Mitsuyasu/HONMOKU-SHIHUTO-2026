import React, { useState } from 'react';
import api from '../services/api';

const ShiftRequestPage = () => {
  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { start_time, end_time } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'x-auth-token': token,
        },
      };
      await api.post('/shifts/requests', formData, config);
      setMessage('希望シフトを提出しました。');
      setFormData({ start_time: '', end_time: '' }); // フォームをリセット
    } catch (err) {
      console.error(err.response.data);
      setError(err.response.data.message || '提出に失敗しました。');
    }
  };

  return (
    <div>
      <h2>希望シフト提出</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={onSubmit}>
        <div>
          <label>開始日時:</label>
          <input
            type="datetime-local"
            name="start_time"
            value={start_time}
            onChange={onChange}
            required
          />
        </div>
        <div>
          <label>終了日時:</label>
          <input
            type="datetime-local"
            name="end_time"
            value={end_time}
            onChange={onChange}
            required
          />
        </div>
        <input type="submit" value="提出" />
      </form>
    </div>
  );
};

export default ShiftRequestPage;

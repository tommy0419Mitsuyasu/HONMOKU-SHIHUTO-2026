import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ShiftManagementPage = () => {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const res = await api.get('/shifts/requests', config);
      setRequests(res.data);
    } catch (err) {
      console.error(err.response.data);
      setError(err.response.data.message || 'データの取得に失敗しました。');
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      await api.put(`/shifts/requests/${id}`, { status }, config);
      // 一覧を再取得して画面を更新
      fetchRequests();
    } catch (err) {
      console.error(err.response.data);
      alert('ステータスの更新に失敗しました。');
    }
  };

  return (
    <div>
      <h2>希望シフト管理</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>スタッフ名</th>
            <th>開始日時</th>
            <th>終了日時</th>
            <th>ステータス</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id}>
              <td>{req.user_name}</td>
              <td>{new Date(req.start_time).toLocaleString('ja-JP')}</td>
              <td>{new Date(req.end_time).toLocaleString('ja-JP')}</td>
              <td>{req.status}</td>
              <td>
                {req.status === 'pending' && (
                  <>
                    <button onClick={() => handleStatusUpdate(req.id, 'approved')}>承認</button>
                    <button onClick={() => handleStatusUpdate(req.id, 'rejected')}>却下</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ShiftManagementPage;

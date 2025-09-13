import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserFromToken } from '../utils/authUtils';

const AdminRoute = ({ children }) => {
  const user = getUserFromToken();

  if (!user) {
    // ログインしていない場合はログインページへ
    return <Navigate to="/login" />;
  }

  if (user.role !== 'admin') {
    // 管理者でない場合はホームページへ
    alert('このページにアクセスする権限がありません。');
    return <Navigate to="/" />;
  }

  return children;
};

export default AdminRoute;

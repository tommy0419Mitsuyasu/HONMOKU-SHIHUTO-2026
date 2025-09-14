import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container, Box, Badge } from '@mui/material';
import { getUserFromToken } from '../utils/authUtils';
import api from '../services/api'; // 追加

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const user = getUserFromToken();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // 管理者の場合のみ未承認件数を取得
    if (user?.role === 'admin') {
      const fetchPendingCount = async () => {
        try {
          const token = localStorage.getItem('token');
          const config = { headers: { 'x-auth-token': token } };
          const res = await api.get('/shifts/requests', config);
          const pending = res.data.filter(r => r.status === 'pending');
          setPendingCount(pending.length);
        } catch (error) {
          console.error('Failed to fetch pending requests count', error);
        }
      };
      fetchPendingCount();
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    alert('ログアウトしました。');
    navigate('/login');
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}>
            シフト管理
          </Typography>
          {user ? (
            <>
              {user.role === 'admin' ? (
                <>
                  <Button color="inherit" component={RouterLink} to="/shift-board">シフトボード</Button>
                  <Button color="inherit" component={RouterLink} to="/manage-shifts">
                    <Badge badgeContent={pendingCount} color="error">
                      希望シフト管理
                    </Badge>
                  </Button>
                  <Button color="inherit" component={RouterLink} to="/all-shifts">全シフト確認</Button>
                  <Button color="inherit" component={RouterLink} to="/member-management">メンバー管理</Button>
                </>
              ) : (
                <>
                  <Button color="inherit" component={RouterLink} to="/request-shift">希望シフト提出</Button>
                  <Button color="inherit" component={RouterLink} to="/my-shifts">確定シフト確認</Button>
                </>
              )}
              <Button color="inherit" onClick={handleLogout}>ログアウト</Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">ログイン</Button>
              <Button color="inherit" component={RouterLink} to="/register">登録</Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          {children}
        </Box>
      </Container>
    </>
  );
};

export default Layout;

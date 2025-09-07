import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import jwt_decode from 'jwt-decode';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  let user = null;
  if (token) {
    try {
      user = jwt_decode(token);
    } catch (e) {
      console.error('Invalid token:', e);
      localStorage.removeItem('token');
    }
  }

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
          {token && user ? (
            <>
              {user.user.role === 'admin' ? (
                <>
                  <Button color="inherit" component={RouterLink} to="/shift-board">シフトボード</Button>
                  <Button color="inherit" component={RouterLink} to="/manage-shifts">希望シフト管理</Button>
                  <Button color="inherit" component={RouterLink} to="/all-shifts">全シフト確認</Button>
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

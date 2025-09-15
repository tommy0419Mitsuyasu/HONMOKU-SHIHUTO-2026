import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { TextField, Button, Typography, Container, Box, Alert, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { toHalfWidth } from '../utils/stringUtils';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
  });
  const [error, setError] = useState('');

  const { name, email, password, role } = formData;

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') {
      setFormData({ ...formData, [name]: toHalfWidth(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', formData);
      alert('登録が完了しました。ログインページに移動します。');
      navigate('/login');
    } catch (err) {
      console.error(err.response?.data);
      setError(err.response?.data?.message || '登録に失敗しました。');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          ユーザー登録
        </Typography>
        <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 3 }}>
          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="名前"
            name="name"
            autoComplete="name"
            autoFocus
            value={name}
            onChange={onChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="メールアドレス"
            name="email"
            autoComplete="email"
            value={email}
            onChange={onChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="パスワード"
            type="password"
            id="password"
            value={password}
            onChange={onChange}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="role-select-label">役割</InputLabel>
            <Select
              labelId="role-select-label"
              id="role"
              name="role"
              value={role}
              label="役割"
              onChange={onChange}
            >
              <MenuItem value="staff">スタッフ</MenuItem>
              <MenuItem value="staff_hs">スタッフ（高校生）</MenuItem>
              <MenuItem value="admin">管理者</MenuItem>
            </Select>
          </FormControl>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            登録
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default RegisterPage;

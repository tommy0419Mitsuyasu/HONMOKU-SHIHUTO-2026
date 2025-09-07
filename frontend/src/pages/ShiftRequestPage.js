import React, { useState } from 'react';
import api from '../services/api';
import { TextField, Button, Typography, Box, Alert, Paper } from '@mui/material';

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
      const config = { headers: { 'x-auth-token': token } };
      await api.post('/shifts/requests', formData, config);
      setMessage('希望シフトを提出しました。');
      setFormData({ start_time: '', end_time: '' });
    } catch (err) {
      console.error(err.response?.data);
      setError(err.response?.data?.message || '提出に失敗しました。');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        希望シフト提出
      </Typography>
      <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 1 }}>
        {message && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
        <TextField
          margin="normal"
          required
          fullWidth
          id="start_time"
          label="開始日時"
          name="start_time"
          type="datetime-local"
          InputLabelProps={{ shrink: true }}
          value={start_time}
          onChange={onChange}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="end_time"
          label="終了日時"
          name="end_time"
          type="datetime-local"
          InputLabelProps={{ shrink: true }}
          value={end_time}
          onChange={onChange}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          提出
        </Button>
      </Box>
    </Paper>
  );
};

export default ShiftRequestPage;

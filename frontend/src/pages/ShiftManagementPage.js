import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Typography, 
  Alert, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Button, 
  ButtonGroup, 
  Chip 
} from '@mui/material';

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
      console.error(err.response?.data);
      setError(err.response?.data?.message || 'データの取得に失敗しました。');
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
      fetchRequests();
    } catch (err) {
      console.error(err.response?.data);
      alert('ステータスの更新に失敗しました。');
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'approved':
        return <Chip label="承認済み" color="success" />;
      case 'rejected':
        return <Chip label="却下" color="error" />;
      default:
        return <Chip label="保留中" color="warning" />;
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        希望シフト管理
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="shift requests table">
          <TableHead>
            <TableRow>
              <TableCell>スタッフ名</TableCell>
              <TableCell>開始日時</TableCell>
              <TableCell>終了日時</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id}>
                <TableCell>{req.user_name}</TableCell>
                <TableCell>{new Date(req.start_time).toLocaleString('ja-JP')}</TableCell>
                <TableCell>{new Date(req.end_time).toLocaleString('ja-JP')}</TableCell>
                <TableCell>{getStatusChip(req.status)}</TableCell>
                <TableCell align="center">
                  {req.status === 'pending' && (
                    <ButtonGroup variant="outlined" size="small">
                      <Button color="success" onClick={() => handleStatusUpdate(req.id, 'approved')}>承認</Button>
                      <Button color="error" onClick={() => handleStatusUpdate(req.id, 'rejected')}>却下</Button>
                    </ButtonGroup>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ShiftManagementPage;

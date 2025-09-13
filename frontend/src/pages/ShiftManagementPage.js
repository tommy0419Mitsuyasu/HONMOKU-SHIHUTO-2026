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
  Chip, 
  Checkbox, 
  Box 
} from '@mui/material';

const ShiftManagementPage = () => {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const res = await api.get('/shifts/requests', config);
      setRequests(res.data);
      setSelected([]); // データ再取得時に選択をリセット
    } catch (err) {
      console.error(err.response?.data);
      setError(err.response?.data?.message || 'データの取得に失敗しました。');
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = requests.filter(r => r.status === 'pending').map((n) => n.id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

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

  const handleBulkApprove = async () => {
    if (selected.length === 0) return;
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      await api.post('/shifts/requests/bulk-approve', { requestIds: selected }, config);
      alert(`${selected.length}件の希望シフトを承認しました。`);
      fetchRequests();
    } catch (err) {
      console.error(err.response?.data);
      alert('一括承認に失敗しました。');
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'approved':
        return <Chip label="承認済み" color="success" size="small" />;
      case 'rejected':
        return <Chip label="却下" color="error" size="small" />;
      default:
        return <Chip label="未承認" color="warning" size="small" />;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          希望シフト管理
        </Typography>
        <Button 
          variant="contained"
          color="primary"
          disabled={selected.length === 0}
          onClick={handleBulkApprove}
        >
          選択した{selected.length}件を一括承認
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="shift requests table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={selected.length > 0 && selected.length < pendingRequests.length}
                  checked={pendingRequests.length > 0 && selected.length === pendingRequests.length}
                  onChange={handleSelectAllClick}
                  inputProps={{ 'aria-label': 'select all pending requests' }}
                />
              </TableCell>
              <TableCell>スタッフ名</TableCell>
              <TableCell>開始日時</TableCell>
              <TableCell>終了日時</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell align="center">個別操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((req) => {
              const isItemSelected = isSelected(req.id);
              return (
                <TableRow 
                  key={req.id}
                  hover
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  selected={isItemSelected}
                >
                  <TableCell padding="checkbox">
                    {req.status === 'pending' && (
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        onChange={(event) => handleClick(event, req.id)}
                        inputProps={{ 'aria-labelledby': `checkbox-list-label-${req.id}` }}
                      />
                    )}
                  </TableCell>
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
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ShiftManagementPage;

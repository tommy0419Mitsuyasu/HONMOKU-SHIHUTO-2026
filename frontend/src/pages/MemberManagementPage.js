import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { 
  Container, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Alert, 
  Box, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Button,
  Snackbar,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const MemberManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    const fetchWorkSummary = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const res = await api.get('/users/work-summary', config);
        setUsers(res.data);
      } catch (err) {
        console.error(err);
        setError('メンバー情報の取得に失敗しました。');
      }
    };
    fetchWorkSummary();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const nameMatch = user.name.toLowerCase().includes(nameFilter.toLowerCase());
      const roleMatch = roleFilter === 'all' || user.role === roleFilter;
      return nameMatch && roleMatch;
    });
  }, [users, nameFilter, roleFilter]);

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin': return '管理者';
      case 'staff': return 'スタッフ';
      case 'staff_hs': return 'スタッフ（高校生）';
      default: return role;
    }
  };

  const handlePasswordReset = async (userId, name) => {
    if (window.confirm(`${name}さんにパスワードリセットメールを送信しますか？`)) {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const res = await api.post(`/users/${userId}/forgot-password`, {}, config);
        setSnackbarMessage(res.data.message);
        setSnackbarOpen(true);
      } catch (err) {
        setError(err.response?.data?.message || '処理中にエラーが発生しました。');
      }
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (window.confirm(`${name}さんの情報を完全に削除します。この操作は元に戻せません。よろしいですか？`)) {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const res = await api.delete(`/users/${id}`, config);
        setSnackbarMessage(res.data.message);
        setSnackbarOpen(true);
        // 削除されたユーザーを一覧から取り除く
        setUsers(users.filter(user => user.id !== id));
      } catch (err) {
        setError(err.response?.data?.message || 'ユーザーの削除に失敗しました。');
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        メンバー管理
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="名前で検索"
            variant="outlined"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="role-filter-label">役割で絞り込み</InputLabel>
            <Select
              labelId="role-filter-label"
              value={roleFilter}
              label="役割で絞り込み"
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <MenuItem value="all">すべて</MenuItem>
              <MenuItem value="admin">管理者</MenuItem>
              <MenuItem value="staff">スタッフ</MenuItem>
              <MenuItem value="staff_hs">スタッフ（高校生）</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>名前</TableCell>
              <TableCell>役割</TableCell>
              <TableCell>総労働時間（当月）</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow 
                key={user.id}
                sx={{ backgroundColor: user.isOvertime ? 'rgba(255, 0, 0, 0.1)' : 'inherit' }}
              >
                <TableCell>{user.name}</TableCell>
                <TableCell>{getRoleDisplayName(user.role)}</TableCell>
                <TableCell>{user.totalWorkHours} 時間</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => handlePasswordReset(user.id, user.name)}
                      sx={{ mr: 1 }}
                    >
                      パスワードリセット
                    </Button>
                    <IconButton 
                      aria-label="delete"
                      color="error"
                      onClick={() => handleDeleteUser(user.id, user.name)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default MemberManagementPage;

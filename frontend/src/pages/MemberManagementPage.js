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
  InputLabel 
} from '@mui/material';

const MemberManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default MemberManagementPage;

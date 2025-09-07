import React from 'react';
import { Typography, Paper, Box } from '@mui/material';

const HomePage = () => {
  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Box textAlign="center">
        <Typography variant="h4" component="h1" gutterBottom>
          ようこそ！
        </Typography>
        <Typography variant="body1">
          シフト管理アプリケーションへようこそ。ナビゲーションバーから各機能をご利用ください。
        </Typography>
      </Box>
    </Paper>
  );
};

export default HomePage;

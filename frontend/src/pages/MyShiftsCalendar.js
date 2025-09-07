import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';
import { Paper, Typography, Alert, Box } from '@mui/material';

// momentのロケールを日本語に設定
moment.locale('ja');
const localizer = momentLocalizer(moment);

const MyShiftsCalendar = () => {
  const [myShifts, setMyShifts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyShifts = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const res = await api.get('/shifts/my-shifts', config);

        const formattedShifts = res.data.map(shift => ({
          title: '確定シフト',
          start: new Date(shift.start_time),
          end: new Date(shift.end_time),
          allDay: false,
        }));

        setMyShifts(formattedShifts);
      } catch (err) {
        console.error(err.response?.data);
        setError(err.response?.data?.message || 'シフトの取得に失敗しました。');
      }
    };

    fetchMyShifts();
  }, []);

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        自分の確定シフト
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ height: '70vh', mt: 2 }}>
        <Calendar
          localizer={localizer}
          events={myShifts}
          startAccessor="start"
          endAccessor="end"
          messages={{
            next: "次",
            previous: "前",
            today: "今日",
            month: "月",
            week: "週",
            day: "日",
            agenda: "予定",
            date: "日付",
            time: "時間",
            event: "イベント",
          }}
        />
      </Box>
    </Paper>
  );
};

export default MyShiftsCalendar;

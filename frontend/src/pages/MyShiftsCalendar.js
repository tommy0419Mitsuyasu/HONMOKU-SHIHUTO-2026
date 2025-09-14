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
  const [workSummary, setWorkSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        
        const [shiftsRes, summaryRes] = await Promise.all([
          api.get('/shifts/my-shifts', config),
          api.get('/shifts/my-work-summary', config)
        ]);

        const formattedShifts = shiftsRes.data.map(shift => ({
          title: '確定シフト',
          start: new Date(shift.start_time),
          end: new Date(shift.end_time),
          allDay: false,
        }));

        setMyShifts(formattedShifts);
        setWorkSummary(summaryRes.data);

      } catch (err) {
        console.error(err.response?.data);
        setError(err.response?.data?.message || 'データの取得に失敗しました。');
      }
    };

    fetchData();
  }, []);

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        自分の確定シフト
      </Typography>
      {workSummary && (
        <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: 'primary.light' }}>
          <Typography variant="h6" color="primary.contrastText">
            今月の総労働時間 (集計期間: {workSummary.startDate} ~ {workSummary.endDate})
          </Typography>
          <Typography variant="h4" color="primary.contrastText" sx={{ fontWeight: 'bold' }}>
            {workSummary.totalWorkHours} 時間
          </Typography>
        </Paper>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ height: '70vh', mt: 2 }}>
        <Calendar
          localizer={localizer}
          events={myShifts}
          startAccessor="start"
          endAccessor="end"
          defaultView="month"
          views={['month', 'week', 'day']}
          onDrillDown={(date, view) => {
            // ここでビューの変更を制御できますが、デフォルトの動作で十分です
            console.log('Drilling down to', date, view);
          }}
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
            showMore: total => `他 ${total} 件`
          }}
        />
      </Box>
    </Paper>
  );
};

export default MyShiftsCalendar;

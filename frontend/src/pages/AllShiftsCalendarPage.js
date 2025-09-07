import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';

moment.locale('ja');
const localizer = momentLocalizer(moment);

const AllShiftsCalendarPage = () => {
  const [allShifts, setAllShifts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAllShifts = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const res = await api.get('/shifts/all', config);

        // カレンダーで表示できる形式にデータを変換
        // イベントのタイトルにスタッフ名を表示
        const formattedShifts = res.data.map(shift => ({
          title: shift.user_name,
          start: new Date(shift.start_time),
          end: new Date(shift.end_time),
          allDay: false,
        }));

        setAllShifts(formattedShifts);
      } catch (err) {
        console.error(err.response.data);
        setError(err.response.data.message || '全シフトの取得に失敗しました。');
      }
    };

    fetchAllShifts();
  }, []);

  return (
    <div>
      <h2>全スタッフの確定シフト</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ height: '70vh' }}>
        <Calendar
          localizer={localizer}
          events={allShifts}
          startAccessor="start"
          endAccessor="end"
          style={{ margin: '20px' }}
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
      </div>
    </div>
  );
};

export default AllShiftsCalendarPage;

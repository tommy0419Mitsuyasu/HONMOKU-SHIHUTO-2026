import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import api from '../services/api';
import { Paper, Typography, Alert, Box, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

const ShiftBoardPage = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const [usersRes, shiftsRes, requestsRes] = await Promise.all([
        api.get('/users', config),
        api.get('/shifts/all', config),
        api.get('/shifts/requests', config),
      ]);

      setAllUsers(usersRes.data.filter(u => u.role.startsWith('staff'))); // スタッフと高校生スタッフのみ対象

      const confirmedEvents = shiftsRes.data
        .filter((shift) => shift.user_id)
        .map((shift) => ({
          id: shift.id.toString(),
          resourceId: shift.user_id.toString(),
          title: '勤務',
          start: new Date(shift.start_time),
          end: new Date(shift.end_time),
          extendedProps: { isRequest: false },
        }));

      const pendingEvents = requestsRes.data
        .filter((req) => req.status === 'pending' && req.user_id)
        .map((req) => ({
          id: `req-${req.id.toString()}`,
          resourceId: req.user_id.toString(),
          title: '希望',
          start: new Date(req.start_time),
          end: new Date(req.end_time),
          backgroundColor: '#f5a623',
          borderColor: '#f5a623',
          extendedProps: { isRequest: true, originalId: req.id },
        }));

      setEvents([...confirmedEvents, ...pendingEvents]);
    } catch (err) {
      console.error(err);
      setError('データの取得に失敗しました。');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelect = async (selectionInfo) => {
    const { start, end, resource } = selectionInfo;
    if (!resource) {
      alert('スタッフを選択してください。');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      await api.post('/shifts', { user_id: resource.id, start_time: start.toISOString(), end_time: end.toISOString() }, config);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('シフトの作成に失敗しました。');
    }
  };

  const handleEventClick = async (clickInfo) => {
    const { event } = clickInfo;
    const isRequest = event.extendedProps.isRequest;
    const originalId = event.extendedProps.originalId;
    const shiftId = isRequest ? originalId : event.id;
    const endpoint = isRequest ? `/shifts/requests/${shiftId}` : `/shifts/${shiftId}`;
    const shiftTypeText = isRequest ? 'この希望シフト' : 'この確定シフト';

    if (window.confirm(`${shiftTypeText}を削除しますか？`)) {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        await api.delete(endpoint, config);
        alert('シフトを削除しました。');
        fetchData();
      } catch (err) {
        console.error(err);
        alert('シフトの削除に失敗しました。');
      }
    }
  };

  const handleEventResize = async (eventResizeInfo) => {
    const { event } = eventResizeInfo;
    const token = localStorage.getItem('token');
    const config = { headers: { 'x-auth-token': token } };
    const updatedShift = { 
      user_id: event.getResources()[0].id, 
      start_time: event.start.toISOString(), 
      end_time: event.end.toISOString() 
    };

    // 希望シフトのリサイズは「承認」として扱う
    if (event.extendedProps.isRequest) {
      try {
        await api.put(
          `/shifts/requests/${event.extendedProps.originalId}`,
          {
            status: 'approved',
            ...updatedShift
          },
          config
        );
        fetchData();
      } catch (err) {
        console.error(err);
        alert('希望シフトの更新・承認に失敗しました。');
        eventResizeInfo.revert();
      }
      return;
    }

    // 確定シフトのリサイズ
    try {
      await api.put(`/shifts/${event.id}`, updatedShift, config);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('シフトの更新に失敗しました。');
      eventResizeInfo.revert();
    }
  };

  const handleEventDrop = async (eventDropInfo) => {
    const { event } = eventDropInfo;
    const token = localStorage.getItem('token');
    const config = { headers: { 'x-auth-token': token } };
    const newUserId = event.getResources()[0].id;
    const newStartTime = event.start.toISOString();
    const newEndTime = event.end.toISOString();

    if (event.extendedProps.isRequest) {
      // 希望シフトのドラッグ＆ドロップは「承認」として扱う
      try {
        await api.put(
          `/shifts/requests/${event.extendedProps.originalId}`,
          {
            status: 'approved',
            user_id: newUserId,
            start_time: newStartTime,
            end_time: newEndTime,
          },
          config
        );
        fetchData();
      } catch (err) {
        console.error(err);
        alert('希望シフトの更新・承認に失敗しました。');
        eventDropInfo.revert();
      }
      return;
    }
    try {
      const updatedShift = { user_id: newUserId, start_time: newStartTime, end_time: newEndTime };
      await api.put(`/shifts/${event.id}`, updatedShift, config);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('シフトの更新に失敗しました。');
      eventDropInfo.revert();
    }
  };

  const handleEventClick = async (clickInfo) => {
    const { event } = clickInfo;
    const token = localStorage.getItem('token');
    const config = { headers: { 'x-auth-token': token } };

    if (event.extendedProps.isRequest) {
      const action = window.prompt("'approve' または 'reject' を入力してください:");
      if (action === 'approve' || action === 'reject') {
        try {
          await api.put(`/shifts/requests/${event.extendedProps.originalId}`, { status: action }, config);
          fetchData();
        } catch (err) {
          console.error(err);
          alert('希望シフトの更新に失敗しました。');
        }
      }
    } else {
      if (window.confirm(`'${event.start.toLocaleString()}' のシフトを削除しますか？`)) {
        try {
          await api.delete(`/shifts/${event.id}`, config);
          fetchData();
        } catch (err) {
          console.error(err);
          alert('シフトの削除に失敗しました。');
        }
      }
    }
  };

  const filteredResources = useMemo(() => {
    return allUsers
      .filter(user => {
        const nameMatch = user.name.toLowerCase().includes(nameFilter.toLowerCase());
        const roleMatch = roleFilter === 'all' || user.role === roleFilter;
        return nameMatch && roleMatch;
      })
      .map(user => ({ id: user.id.toString(), title: user.name }));
  }, [allUsers, nameFilter, roleFilter]);

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        シフトボード
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
              <MenuItem value="staff">スタッフ</MenuItem>
              <MenuItem value="staff_hs">スタッフ（高校生）</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Box sx={{ mt: 2, '.fc-license-message': { display: 'none' } }}>
        <style>{`
          .slot-staff-count {
            font-size: 0.8em;
            font-weight: bold;
            color: #1976d2;
            text-align: center;
            margin-top: 2px;
          }
        `}</style>
        <FullCalendar
          plugins={[resourceTimelinePlugin, interactionPlugin]}
          initialView="resourceTimelineWeek"
          schedulerLicenseKey='GPL-My-Project-Is-Open-Source'
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth',
          }}
          resources={filteredResources}
          events={events}
          editable={true}
          eventResizableFromStart={true}
          eventResize={handleEventResize}
          selectable={true}
          locale='ja'
          select={handleSelect}
          eventDrop={handleEventDrop}
          eventClick={handleEventClick}
          slotLabelContent={(arg) => {
            const slotDate = arg.date;
            const confirmedEvents = events.filter((event) => !event.extendedProps.isRequest);
            const count = confirmedEvents.reduce((acc, event) => {
              const eventStart = new Date(event.start);
              const eventEnd = new Date(event.end);
              if (slotDate >= eventStart && slotDate < eventEnd) {
                return acc + 1;
              }
              return acc;
            }, 0);

            return (
              <div>
                {arg.text}
                {count > 0 && <div className='slot-staff-count'>{count}人</div>}
              </div>
            );
          }}
        />
      </Box>
    </Paper>
  );
};

export default ShiftBoardPage;

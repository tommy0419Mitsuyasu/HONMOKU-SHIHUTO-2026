import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Paper, Typography, Alert, Box, Button, Stack } from '@mui/material';
import ShiftTemplateModal from '../components/ShiftTemplateModal';
import EditShiftRequestModal from '../components/EditShiftRequestModal';

const ShiftRequestPage = () => {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  const fetchShiftData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      // 自分の希望シフトと確定シフトを取得
      const [requestsRes, confirmedRes] = await Promise.all([
        api.get('/shifts/my-requests', config), // Note: This endpoint needs to be created
        api.get('/shifts/my-shifts', config)
      ]);

      const requestEvents = requestsRes.data.map(req => ({
        id: `req-${req.id}`,
        title: `申請中 (${req.status})`,
        start: new Date(req.start_time),
        end: new Date(req.end_time),
        backgroundColor: req.status === 'approved' ? '#2e7d32' : (req.status === 'rejected' ? '#d32f2f' : '#ed6c02'),
        borderColor: req.status === 'approved' ? '#2e7d32' : (req.status === 'rejected' ? '#d32f2f' : '#ed6c02'),
        extendedProps: { 
          isRequest: true, 
          status: req.status,
          originalId: req.id
        },
      }));

      const confirmedEvents = confirmedRes.data.map(shift => ({
        id: `conf-${shift.id}`,
        title: '確定シフト',
        start: new Date(shift.start_time),
        end: new Date(shift.end_time),
        backgroundColor: '#1976d2',
        borderColor: '#1976d2',
        extendedProps: { isConfirmed: true },
      }));

      setEvents([...requestEvents, ...confirmedEvents]);
    } catch (err) {
      console.error(err);
      setError('シフト情報の取得に失敗しました。');
    }
  }, []);

  useEffect(() => {
    fetchShiftData();
  }, [fetchShiftData]);

  const handleSelect = async (selectInfo) => {
    const title = '新規希望シフト';
    if (window.confirm(`'${selectInfo.startStr}' から '${selectInfo.endStr}' で希望シフトを提出しますか？`)) {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        await api.post('/shifts/requests', { 
          start_time: selectInfo.startStr, 
          end_time: selectInfo.endStr 
        }, config);
        alert('希望シフトを提出しました。');
        fetchShiftData();
      } catch (err) {
        console.error(err.response?.data);
        setError(err.response?.data?.message || '希望シフトの提出に失敗しました。');
      }
    }
  };

  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedTemplate(null);
  };

  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    // 確定シフトや却下されたシフトは操作不可
    if (event.extendedProps.isConfirmed || event.extendedProps.status === 'rejected') {
      alert(`このシフトは編集できません。\nステータス: ${event.title}`);
      return;
    }
    // 自分の未承認シフトのみ編集可能
    if (event.extendedProps.isRequest && event.extendedProps.status === 'pending') {
      setSelectedShift(event);
      setEditModalOpen(true);
    } else {
      alert(`シフト内容: ${event.title}\n期間: ${event.startStr} - ${event.endStr}`);
    }
  };

  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setSelectedShift(null);
  };

  const handleShiftUpdateRequest = async (id, startTime, endTime) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      await api.put(`/shifts/requests/my/${id}`, { start_time: startTime, end_time: endTime }, config);
      alert('希望シフトを更新しました。');
      fetchShiftData();
    } catch (err) {
      console.error(err.response?.data);
      setError(err.response?.data?.message || '希望シフトの更新に失敗しました。');
    }
  };

  const handleShiftDeleteRequest = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      await api.delete(`/shifts/requests/my/${id}`, config);
      alert('希望シフトを削除しました。');
      fetchShiftData();
    } catch (err) {
      console.error(err.response?.data);
      setError(err.response?.data?.message || '希望シフトの削除に失敗しました。');
    }
  };

  const handleTemplateSubmit = async (startTime, endTime) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      await api.post('/shifts/requests', { 
        start_time: startTime, 
        end_time: endTime 
      }, config);
      alert('テンプレートから希望シフトを提出しました。');
      fetchShiftData();
    } catch (err) {
      console.error(err.response?.data);
      setError(err.response?.data?.message || 'テンプレートからのシフト提出に失敗しました。');
    }
  };

  const workTemplates = [
    { label: '早番 (9-18)', start: 9, end: 18 },
    { label: '遅番 (17-22)', start: 17, end: 22 },
    { label: 'フル (9-22)', start: 9, end: 22 },
  ];

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        希望シフト提出
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        カレンダーの日付や時間をドラッグして希望シフトを提出できます。
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{alignSelf: 'center'}}>テンプレート:</Typography>
        {workTemplates.map(template => (
          <Button key={template.label} variant="outlined" size="small" onClick={() => handleTemplateClick(template)}>
            {template.label}
          </Button>
        ))}
      </Stack>

      <EditShiftRequestModal 
        open={editModalOpen}
        handleClose={handleEditModalClose}
        shift={selectedShift}
        handleUpdate={handleShiftUpdateRequest}
        handleDelete={handleShiftDeleteRequest}
      />

      <ShiftTemplateModal 
        open={modalOpen}
        handleClose={handleModalClose}
        template={selectedTemplate}
        handleSubmit={handleTemplateSubmit}
      />

      <Box sx={{ '.fc-license-message': { display: 'none' } }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          initialView='timeGridWeek'
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          locale='ja'
          events={events}
          select={handleSelect}
          eventClick={handleEventClick}
        />
      </Box>
    </Paper>
  );
};

export default ShiftRequestPage;

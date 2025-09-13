import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box
} from '@mui/material';

const ShiftTemplateModal = ({ open, handleClose, template, handleSubmit }) => {
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    if (open) {
      // モーダルが開かれたときに今日の日付をデフォルトで設定
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
    }
  }, [open]);

  const onConfirm = () => {
    if (!selectedDate || !template) {
      alert('日付を選択してください。');
      return;
    }

    const startTime = `${selectedDate}T${String(template.start).padStart(2, '0')}:00:00`;
    const endTime = `${selectedDate}T${String(template.end).padStart(2, '0')}:00:00`;
    
    handleSubmit(startTime, endTime);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>テンプレートからシフト提出</DialogTitle>
      <DialogContent>
        {template && (
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6">{template.label}</Typography>
            <Typography color="text.secondary" gutterBottom>
              勤務時間: {template.start}:00 - {template.end}:00
            </Typography>
            <TextField
              margin="normal"
              required
              fullWidth
              id="date"
              label="勤務日"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>キャンセル</Button>
        <Button onClick={onConfirm} variant="contained">この内容で提出</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShiftTemplateModal;

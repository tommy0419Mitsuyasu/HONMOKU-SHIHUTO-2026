import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box
} from '@mui/material';

const EditShiftRequestModal = ({ open, handleClose, shift, handleUpdate, handleDelete }) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (shift) {
      // ISO文字列から 'YYYY-MM-DDTHH:mm' 形式に変換
      const formatDateTimeLocal = (isoString) => {
        const date = new Date(isoString);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 16);
      };
      setStartTime(formatDateTimeLocal(shift.start));
      setEndTime(formatDateTimeLocal(shift.end));
    }
  }, [shift]);

  const onUpdate = () => {
    handleUpdate(shift.extendedProps.originalId, startTime, endTime);
    handleClose();
  };

  const onDelete = () => {
    if (window.confirm('この希望シフトを削除してもよろしいですか？')) {
      handleDelete(shift.extendedProps.originalId);
      handleClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>希望シフトの修正・削除</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="start_time"
            label="開始日時"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="end_time"
            label="終了日時"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button onClick={onDelete} variant="outlined" color="error">
          削除
        </Button>
        <Box>
          <Button onClick={handleClose} sx={{ mr: 1 }}>キャンセル</Button>
          <Button onClick={onUpdate} variant="contained">更新</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EditShiftRequestModal;

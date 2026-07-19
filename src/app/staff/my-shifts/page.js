'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useData } from '@/lib/providers';
import { formatDateWithDay, calculateHours, getStatusLabel, generateTimeOptions, getToday } from '@/lib/utils';
import { validateMinorShift, getShiftValidationSummary } from '@/lib/validators';
import DatePicker from 'react-datepicker';
import { ja } from 'date-fns/locale/ja';
import 'react-datepicker/dist/react-datepicker.css';
import './my-shifts.css';

export default function MyShifts() {
  const { user, loading: authLoading } = useAuth();
  const { getShifts, deleteShift, updateShiftStatus, updateShift, initialized } = useData();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('all');
  const [editingShift, setEditingShift] = useState(null);
  const [cancelingShift, setCancelingShift] = useState(null);
  
  // Edit Form State
  const [editDate, setEditDate] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  
  // Cancel Form State
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const allShifts = useMemo(() => {
    if (!user) return [];
    return getShifts({ staffId: user.id }).sort((a, b) => b.work_date.localeCompare(a.work_date) || b.start_time.localeCompare(a.start_time));
  }, [user, getShifts, initialized, editingShift, cancelingShift]); // Refresh on action

  if (authLoading || !initialized || !user) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  const filteredShifts = allShifts.filter(shift => {
    if (activeTab === 'all') return true;
    return shift.status === activeTab;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'badge-pending';
      case 'approved': return 'badge-approved';
      case 'cancel_requested': return 'badge-cancel-requested';
      case 'cancelled': return 'badge-cancelled';
      default: return '';
    }
  };

  const tabs = [
    { id: 'all', label: 'すべて', count: allShifts.length },
    { id: 'pending', label: '未承認', count: allShifts.filter(s => s.status === 'pending').length },
    { id: 'approved', label: '承認済', count: allShifts.filter(s => s.status === 'approved').length },
    { id: 'cancel_requested', label: '取消依頼中', count: allShifts.filter(s => s.status === 'cancel_requested').length },
    { id: 'cancelled', label: '取消済', count: allShifts.filter(s => s.status === 'cancelled').length },
  ];

  const handleEditClick = (shift) => {
    setEditingShift(shift);
    setEditDate(shift.work_date);
    setEditStart(shift.start_time);
    setEditEnd(shift.end_time);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateShift(editingShift.id, {
      work_date: editDate,
      start_time: editStart,
      end_time: editEnd
    });
    setEditingShift(null);
  };

  const handleDeleteClick = (shift) => {
    if (confirm('このシフトを取り消してもよろしいですか？')) {
      deleteShift(shift.id);
    }
  };

  const handleCancelReqSubmit = (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    updateShiftStatus(cancelingShift.id, 'cancel_requested', { cancel_reason: cancelReason });
    setCancelingShift(null);
    setCancelReason('');
  };

  const timeOptions = generateTimeOptions();
  const today = getToday();

  // Edit Validation
  let editMinorError = null;
  if (user?.is_minor && editingShift) {
    const existingShifts = getShifts({ staffId: user.id, excludeStatus: 'cancelled' })
      .filter(s => s.id !== editingShift.id);
    const minorResult = validateMinorShift({ startTime: editStart, endTime: editEnd, workDate: editDate, existingShifts });
    if (!minorResult.valid) {
      editMinorError = minorResult.errors[0];
    }
  }
  const editBasicValidation = getShiftValidationSummary(editStart, editEnd);
  const isEditValid = calculateHours(editStart, editEnd) > 0 && !editMinorError && editBasicValidation?.valid !== false;

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">📋 マイシフト</h1>
        <p className="page-subtitle">シフトの確認・変更ができます。</p>
      </div>

      <div className="my-shifts-filters">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`my-shifts-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="my-shifts-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {filteredShifts.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-icon">📂</div>
          <h3 className="empty-title">シフトが見つかりません</h3>
        </div>
      ) : (
        <div className="my-shifts-list">
          {filteredShifts.map(shift => (
            <div key={shift.id} className="my-shifts-card glass-card">
              <div className="my-shifts-date">
                <span className="date-text">{formatDateWithDay(shift.work_date)}</span>
              </div>
              <div className="my-shifts-details">
                <div className="my-shifts-time">
                  <span className="time-icon">⏰</span>
                  {shift.start_time} 〜 {shift.end_time}
                  <span className="my-shifts-hours">({calculateHours(shift.start_time, shift.end_time).toFixed(1)}h)</span>
                </div>
                <div className="my-shifts-status">
                  <span className={`badge ${getStatusBadgeClass(shift.status)}`}>
                    {getStatusLabel(shift.status)}
                  </span>
                </div>
              </div>
              <div className="my-shifts-actions">
                {shift.status === 'pending' && (
                  <>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleEditClick(shift)}>編集</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteClick(shift)}>取り消す</button>
                  </>
                )}
                {shift.status === 'approved' && shift.work_date >= today && (
                  <button className="btn btn-sm btn-warning" onClick={() => setCancelingShift(shift)}>取消依頼</button>
                )}
                {shift.status === 'cancel_requested' && (
                  <span className="text-muted text-sm">取消依頼中</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingShift && (
        <div className="modal-overlay" onClick={() => setEditingShift(null)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">シフトの編集</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">勤務日</label>
                <DatePicker
                  selected={editDate ? new Date(editDate + 'T00:00:00') : null}
                  onChange={(date) => {
                    if (date) {
                      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                      setEditDate(localDate.toISOString().split('T')[0]);
                    } else {
                      setEditDate('');
                    }
                  }}
                  locale={ja}
                  dateFormat="yyyy/MM/dd"
                  className="form-input"
                  placeholderText="日付を選択"
                  required
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">開始時刻</label>
                  <select className="form-select" value={editStart} onChange={e => setEditStart(e.target.value)}>
                    {timeOptions.map(t => <option key={`estart-${t}`} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">終了時刻</label>
                  <select className="form-select" value={editEnd} onChange={e => setEditEnd(e.target.value)}>
                    {timeOptions.map(t => <option key={`eend-${t}`} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {editBasicValidation?.valid === false ? (
                <div className="alert alert-warning">{editBasicValidation.message}</div>
              ) : (
                <div className="text-center text-muted mb-3"><strong>{editBasicValidation?.message}</strong></div>
              )}
              {editMinorError && <div className="alert alert-error">{editMinorError}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingShift(null)}>キャンセル</button>
                <button type="submit" className="btn btn-primary" disabled={!isEditValid}>保存する</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Request Modal */}
      {cancelingShift && (
        <div className="modal-overlay" onClick={() => setCancelingShift(null)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title text-warning">シフトの取消依頼</h2>
            <p className="mb-4">このシフト（{formatDateWithDay(cancelingShift.work_date)}）の取り消しを依頼しますか？</p>
            <form onSubmit={handleCancelReqSubmit}>
              <div className="form-group">
                <label className="form-label">取消理由 <span className="text-danger">*</span></label>
                <textarea 
                  className="form-input" 
                  rows="3" 
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  required
                  placeholder="理由を入力してください（体調不良、学校の予定など）"
                ></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setCancelingShift(null)}>キャンセル</button>
                <button type="submit" className="btn btn-warning" disabled={!cancelReason.trim()}>取消依頼を送信</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useData } from '@/lib/providers';
import { formatDateWithDay, calculateHours, getStatusLabel, generateTimeOptions, getToday } from '@/lib/utils';
import { validateMinorShift, getShiftValidationSummary } from '@/lib/validators';
import DatePicker from 'react-datepicker';
import { ja } from 'date-fns/locale/ja';
import 'react-datepicker/dist/react-datepicker.css';
import StaffCalendarView from './StaffCalendarView';
import StaffRotationView from './StaffRotationView';
import './my-shifts.css';

export default function MyShifts() {
  const { user, loading: authLoading } = useAuth();
  const { staff, getShifts, deleteShift, updateShiftStatus, updateShift, createShift, initialized } = useData();
  const router = useRouter();

  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [activeTab, setActiveTab] = useState('all');
  const [editingShift, setEditingShift] = useState(null);
  const [cancelingShift, setCancelingShift] = useState(null);
  const [selectedShiftDetails, setSelectedShiftDetails] = useState(null); // For calendar click
  
  // Submit Form State (from Calendar)
  const [submittingDate, setSubmittingDate] = useState(null);
  const [submitStart, setSubmitStart] = useState('09:00');
  const [submitEnd, setSubmitEnd] = useState('17:00');
  
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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateShift(editingShift.id, {
        work_date: editDate,
        start_time: editStart,
        end_time: editEnd,
        status: 'pending'
      });
      setEditingShift(null);
      alert('シフトの変更依頼を送信しました。管理者の承認をお待ちください。');
    } catch (err) {
      alert(err.message || 'シフトの更新に失敗しました');
    }
  };

  const handleDeleteClick = async (shift) => {
    if (confirm('このシフトを取り消してもよろしいですか？')) {
      try {
        await deleteShift(shift.id);
      } catch (err) {
        alert(err.message || 'シフトの削除に失敗しました');
      }
    }
  };

  const handleCancelReqSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    try {
      await updateShiftStatus(cancelingShift.id, 'cancel_requested', { cancel_reason: cancelReason });
      setCancelingShift(null);
      setCancelReason('');
      alert('取消依頼を送信しました。');
    } catch (err) {
      alert(err.message || '取消依頼の送信に失敗しました');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!submittingDate) return;
    
    try {
      await createShift({
        staff_id: user.id,
        work_date: submittingDate,
        start_time: submitStart,
        end_time: submitEnd
      });
      setSubmittingDate(null);
      alert('シフトを提出しました！');
    } catch (err) {
      alert(err.message || 'シフトの提出に失敗しました');
    }
  };

  const timeOptions = generateTimeOptions();
  const today = getToday();

  // Submit Validation
  let submitMinorError = null;
  if (user?.is_minor && submittingDate) {
    const existingForSubmit = getShifts({ staffId: user.id, excludeStatus: 'cancelled' });
    const minorResultSubmit = validateMinorShift({ startTime: submitStart, endTime: submitEnd, workDate: submittingDate, existingShifts: existingForSubmit });
    if (!minorResultSubmit.valid) {
      submitMinorError = minorResultSubmit.errors[0];
    }
  }
  const submitBasicValidation = getShiftValidationSummary(submitStart, submitEnd);
  const isSubmitValid = calculateHours(submitStart, submitEnd) > 0 && !submitMinorError && submitBasicValidation?.valid !== false;

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

      <div className="view-tabs" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button 
          className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViewMode('calendar')}
        >
          📅 カレンダー
        </button>
        <button 
          className={`btn ${viewMode === 'rotation' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViewMode('rotation')}
        >
          📋 本日のローテ
        </button>
      </div>

      {viewMode === 'calendar' ? (
        <StaffCalendarView 
          shifts={allShifts} 
          onShiftClick={(shift) => setSelectedShiftDetails(shift)} 
          onDateClick={(dateStr) => {
            if (dateStr >= today) {
              setSubmittingDate(dateStr);
              setSubmitStart('09:00');
              setSubmitEnd('17:00');
            } else {
              alert('過去の日付のシフトは提出できません。');
            }
          }}
        />
      ) : (
        <StaffRotationView 
          allShifts={getShifts()} 
          allStaff={staff} 
          user={user} 
        />
      )}

      {/* Selected Shift Details Modal (from Calendar) */}
      {selectedShiftDetails && (
        <div className="modal-overlay" onClick={() => setSelectedShiftDetails(null)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">シフト詳細</h2>
            <div className="mb-4">
              <p><strong>日付:</strong> {formatDateWithDay(selectedShiftDetails.work_date)}</p>
              <p><strong>時間:</strong> {selectedShiftDetails.start_time} 〜 {selectedShiftDetails.end_time} ({calculateHours(selectedShiftDetails.start_time, selectedShiftDetails.end_time).toFixed(1)}h)</p>
              <p>
                <strong>ステータス:</strong> <span className={`badge ${getStatusBadgeClass(selectedShiftDetails.status)}`}>{getStatusLabel(selectedShiftDetails.status)}</span>
              </p>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
              {(selectedShiftDetails.status === 'pending' || (selectedShiftDetails.status === 'approved' && selectedShiftDetails.work_date >= today)) && (
                <button className="btn btn-primary" onClick={() => { handleEditClick(selectedShiftDetails); setSelectedShiftDetails(null); }}>時間を変更する</button>
              )}
              {selectedShiftDetails.status === 'pending' && (
                <button className="btn btn-danger" onClick={() => { handleDeleteClick(selectedShiftDetails); setSelectedShiftDetails(null); }}>取り消す</button>
              )}
              {selectedShiftDetails.status === 'approved' && selectedShiftDetails.work_date >= today && (
                <button className="btn btn-warning" onClick={() => { setCancelingShift(selectedShiftDetails); setSelectedShiftDetails(null); }}>完全取消を依頼</button>
              )}
              <button className="btn btn-ghost" onClick={() => setSelectedShiftDetails(null)} style={{ marginLeft: 'auto' }}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit New Shift Modal (from Calendar) */}
      {submittingDate && (
        <div className="modal-overlay" onClick={() => setSubmittingDate(null)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">シフトの提出</h2>
            <p className="mb-4"><strong>{formatDateWithDay(submittingDate)}</strong> のシフトを提出します。</p>
            <form onSubmit={handleCreateSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">開始時刻</label>
                  <select className="form-select" value={submitStart} onChange={e => setSubmitStart(e.target.value)}>
                    {timeOptions.map(t => <option key={`sub-start-${t}`} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">終了時刻</label>
                  <select className="form-select" value={submitEnd} onChange={e => setSubmitEnd(e.target.value)}>
                    {timeOptions.map(t => <option key={`sub-end-${t}`} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {submitBasicValidation?.valid === false ? (
                <div className="alert alert-warning">{submitBasicValidation.message}</div>
              ) : (
                <div className="text-center text-muted mb-3"><strong>{submitBasicValidation?.message}</strong></div>
              )}
              {submitMinorError && <div className="alert alert-error">{submitMinorError}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setSubmittingDate(null)}>キャンセル</button>
                <button type="submit" className="btn btn-primary" disabled={!isSubmitValid}>提出する</button>
              </div>
            </form>
          </div>
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

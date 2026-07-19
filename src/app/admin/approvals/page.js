'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth, useData } from '@/lib/providers';
import { formatDateWithDay, getStaffTypeLabel } from '@/lib/utils';
import './approvals.css';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { shifts, staff, updateShiftStatus, deleteShift, bulkApproveShifts, initialized } = useData();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'cancel_requested'
  const [selectedIds, setSelectedIds] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (initialized) setLoading(false);
  }, [initialized]);

  const pendingShifts = useMemo(() => shifts.filter(s => s.status === 'pending'), [shifts]);
  const cancelRequests = useMemo(() => shifts.filter(s => s.status === 'cancel_requested'), [shifts]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleApprove = async (id) => {
    await updateShiftStatus(id, 'approved', { approved_by: user?.id, approved_at: new Date().toISOString() });
    showToast('シフトを承認しました');
  };

  const handleReject = async (id) => {
    await deleteShift(id);
    showToast('シフトを却下しました');
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    await bulkApproveShifts(selectedIds, user?.id);
    setSelectedIds([]);
    showToast(`${selectedIds.length}件のシフトを承認しました`);
  };

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(pendingShifts.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleAcceptCancel = async (id) => {
    await updateShiftStatus(id, 'cancelled');
    showToast('取消依頼を承認しました');
  };

  const handleRejectCancel = async (id) => {
    await updateShiftStatus(id, 'approved', { cancel_reason: null });
    showToast('取消依頼を却下しました');
  };

  const getStaff = (id) => staff.find(s => s.id === id);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="page-enter approvals-container">
      <div className="page-header">
        <h1 className="page-title">承認管理</h1>
        <p className="page-subtitle">シフト提出と取消の承認・却下</p>
      </div>

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          未承認シフト {pendingShifts.length > 0 && <span className="tab-badge">{pendingShifts.length}</span>}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'cancel_requested' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancel_requested')}
        >
          取消依頼 {cancelRequests.length > 0 && <span className="tab-badge">{cancelRequests.length}</span>}
        </button>
      </div>

      {activeTab === 'pending' && (
        <>
          <div className="action-bar">
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>
                {selectedIds.length} 件選択中
              </span>
            </div>
            <div className="action-buttons">
              <button 
                className="btn btn-success" 
                disabled={selectedIds.length === 0}
                onClick={handleBulkApprove}
              >
                ✓ 一括承認
              </button>
            </div>
          </div>

          <div className="table-container">
            {pendingShifts.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-icon">✅</div>
                <div className="empty-title">未承認のシフトはありません</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th className="checkbox-cell">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.length === pendingShifts.length && pendingShifts.length > 0}
                        onChange={handleToggleSelectAll}
                      />
                    </th>
                    <th>スタッフ名</th>
                    <th>種別</th>
                    <th>日付</th>
                    <th>時間</th>
                    <th>提出日</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingShifts.map(shift => {
                    const st = getStaff(shift.staff_id);
                    return (
                      <tr key={shift.id}>
                        <td className="checkbox-cell">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(shift.id)}
                            onChange={() => handleToggleSelect(shift.id)}
                          />
                        </td>
                        <td>{st?.full_name}</td>
                        <td><span className="badge">{getStaffTypeLabel(st?.staff_type)}</span></td>
                        <td>{formatDateWithDay(shift.work_date)}</td>
                        <td>{shift.start_time} - {shift.end_time}</td>
                        <td>{new Date(shift.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-success btn-sm" onClick={() => handleApprove(shift.id)}>承認</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleReject(shift.id)}>却下</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'cancel_requested' && (
        <div className="table-container">
          {cancelRequests.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <div className="empty-icon">✅</div>
              <div className="empty-title">取消依頼はありません</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>スタッフ名</th>
                  <th>日付</th>
                  <th>時間</th>
                  <th>取消理由</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {cancelRequests.map(shift => {
                  const st = getStaff(shift.staff_id);
                  return (
                    <tr key={shift.id}>
                      <td>{st?.full_name}</td>
                      <td>{formatDateWithDay(shift.work_date)}</td>
                      <td>{shift.start_time} - {shift.end_time}</td>
                      <td style={{ color: 'var(--warning)' }}>{shift.cancel_reason}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-warning btn-sm" onClick={() => handleAcceptCancel(shift.id)}>取消を承認</button>
                          <button className="btn btn-primary btn-sm" onClick={() => handleRejectCancel(shift.id)}>却下(勤務維持)</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {toast && <div className="notification-toast">{toast}</div>}
    </div>
  );
}

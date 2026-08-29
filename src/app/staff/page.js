'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useData } from '@/lib/providers';
import { formatDateWithDay, getToday, calculateHours, formatCurrency, getStatusLabel } from '@/lib/utils';
import './dashboard.css';

export default function StaffDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { getShifts, initialized } = useData();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const shifts = useMemo(() => {
    if (!user) return [];
    return getShifts({ staffId: user.id });
  }, [user, getShifts, initialized]);

  if (authLoading || !initialized || !user) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  // === 給与月（給与計算期間）のロジック ===
  const todayDate = new Date();
  
  // 現在の給与月を判定（11日〜翌月10日を基準とする）
  // 今日が 2026/08/29 の場合、8月11日〜9月10日の期間なので「2026-08」とする
  let defaultYear = todayDate.getFullYear();
  let defaultMonth = todayDate.getMonth() + 1; // 1-12
  if (todayDate.getDate() <= 10) {
    // 10日以前なら、前月分としてカウント
    defaultMonth -= 1;
    if (defaultMonth === 0) {
      defaultMonth = 12;
      defaultYear -= 1;
    }
  }
  const defaultMonthStr = `${defaultYear}-${String(defaultMonth).padStart(2, '0')}`;
  
  const [selectedPeriod, setSelectedPeriod] = useState(defaultMonthStr);

  const getPayrollPeriod = (yearMonthStr) => {
    if (yearMonthStr === 'all') return { start: '1970-01-01', end: '2100-12-31' };
    const [year, month] = yearMonthStr.split('-').map(Number);
    // 指定月の11日 〜 翌月の10日
    const startDate = new Date(year, month - 1, 11);
    const endDate = new Date(year, month, 10);
    
    const formatD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start: formatD(startDate), end: formatD(endDate) };
  };

  // 選択肢の生成（今年の前半から来月まで）
  const periodOptions = [{ value: 'all', label: 'すべての期間（合計）' }];
  for (let i = -6; i <= 2; i++) {
    const d = new Date(defaultYear, defaultMonth - 1 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const val = `${y}-${String(m).padStart(2, '0')}`;
    periodOptions.push({ value: val, label: `${y}年${m}月度 (${m}/11 〜 ${m === 12 ? 1 : m + 1}/10)` });
  }

  const currentPayrollBounds = getPayrollPeriod(selectedPeriod);

  // Filter for selected period
  const periodShifts = shifts.filter(s => 
    s.work_date >= currentPayrollBounds.start && 
    s.work_date <= currentPayrollBounds.end &&
    s.status !== 'cancelled'
  );

  const periodHours = periodShifts.reduce((total, s) => {
    return total + calculateHours(s.start_time, s.end_time);
  }, 0);

  const periodIncome = periodHours * (user.hourly_wage || 0);

  // Upcoming shifts (approved, from today onwards)
  const upcomingShifts = shifts
    .filter(s => s.status === 'approved' && s.work_date >= getToday())
    .sort((a, b) => a.work_date.localeCompare(b.work_date) || a.start_time.localeCompare(b.start_time))
    .slice(0, 5);

  // Status counts (for the selected period)
  const pendingCount = periodShifts.filter(s => s.status === 'pending').length;
  const approvedCount = periodShifts.filter(s => s.status === 'approved').length;
  const cancelReqCount = periodShifts.filter(s => s.status === 'cancel_requested').length;

  return (
    <div className="page-enter">
      <div className="dashboard-header">
        <h1 className="page-title">
          {user.full_name}さん、お疲れ様です！
        </h1>
        <div className="staff-badges">
          <span className="badge badge-approved">{user.staff_type}</span>
          {user.is_minor && <span className="badge badge-warning">18歳未満</span>}
        </div>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>給与期間の選択</h2>
        <select 
          className="form-input" 
          style={{ width: 'auto', minWidth: '200px' }}
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          {periodOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="grid-3 dashboard-stats">
        <div className="stat-card glass-card">
          <div className="stat-icon icon-blue">📅</div>
          <div className="stat-content">
            <div className="stat-label">{selectedPeriod === 'all' ? '合計シフト数' : '期間内のシフト数'}</div>
            <div className="stat-value">{periodShifts.length}件</div>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon icon-green">⏰</div>
          <div className="stat-content">
            <div className="stat-label">{selectedPeriod === 'all' ? '合計勤務時間' : '期間内の勤務時間'}</div>
            <div className="stat-value">{periodHours.toFixed(1)}h</div>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon icon-gold">💰</div>
          <div className="stat-content">
            <div className="stat-label">{selectedPeriod === 'all' ? '合計見込み収入' : '期間内の見込み収入'}</div>
            <div className="stat-value">{formatCurrency(periodIncome)}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section upcoming-section">
          <h2 className="section-title">直近のシフト (承認済)</h2>
          {upcomingShifts.length === 0 ? (
            <div className="empty-state glass-card">
              <div className="empty-icon">📅</div>
              <h3 className="empty-title">直近のシフトはありません</h3>
            </div>
          ) : (
            <div className="upcoming-list">
              {upcomingShifts.map(shift => (
                <div key={shift.id} className="upcoming-card glass-card">
                  <div className="upcoming-date">{formatDateWithDay(shift.work_date)}</div>
                  <div className="upcoming-time">
                    <span className="time-icon">⏰</span>
                    {shift.start_time} 〜 {shift.end_time}
                  </div>
                  <div className="upcoming-status">
                    <span className="badge badge-approved">
                      {getStatusLabel(shift.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-section status-section">
          <h2 className="section-title">{selectedPeriod === 'all' ? '全体のステータス' : '期間内のステータス'}</h2>
          <div className="status-grid">
            <div className="status-item glass-card">
              <div className="status-label">未承認</div>
              <div className="status-count count-pending">{pendingCount}<span>件</span></div>
            </div>
            <div className="status-item glass-card">
              <div className="status-label">承認済</div>
              <div className="status-count count-approved">{approvedCount}<span>件</span></div>
            </div>
            <div className="status-item glass-card">
              <div className="status-label">取消依頼中</div>
              <div className="status-count count-warning">{cancelReqCount}<span>件</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

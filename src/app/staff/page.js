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

  const today = getToday();
  const currentMonth = today.slice(0, 7);

  // Filter for this month
  const thisMonthShifts = shifts.filter(s => 
    s.work_date.startsWith(currentMonth) && 
    s.status !== 'cancelled'
  );

  const thisMonthHours = thisMonthShifts.reduce((total, s) => {
    return total + calculateHours(s.start_time, s.end_time);
  }, 0);

  const thisMonthIncome = thisMonthHours * (user.hourly_wage || 0);

  // Upcoming shifts (approved, from today onwards)
  const upcomingShifts = shifts
    .filter(s => s.status === 'approved' && s.work_date >= today)
    .sort((a, b) => a.work_date.localeCompare(b.work_date) || a.start_time.localeCompare(b.start_time))
    .slice(0, 5);

  // Status counts (this month)
  const pendingCount = thisMonthShifts.filter(s => s.status === 'pending').length;
  const approvedCount = thisMonthShifts.filter(s => s.status === 'approved').length;
  const cancelReqCount = thisMonthShifts.filter(s => s.status === 'cancel_requested').length;

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

      <div className="grid-3 dashboard-stats">
        <div className="stat-card glass-card">
          <div className="stat-icon icon-blue">📅</div>
          <div className="stat-content">
            <div className="stat-label">今月のシフト数</div>
            <div className="stat-value">{thisMonthShifts.length}件</div>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon icon-green">⏰</div>
          <div className="stat-content">
            <div className="stat-label">今月の勤務時間</div>
            <div className="stat-value">{thisMonthHours.toFixed(1)}h</div>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon icon-gold">💰</div>
          <div className="stat-content">
            <div className="stat-label">今月の見込み収入</div>
            <div className="stat-value">{formatCurrency(thisMonthIncome)}</div>
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
          <h2 className="section-title">今月のステータス</h2>
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

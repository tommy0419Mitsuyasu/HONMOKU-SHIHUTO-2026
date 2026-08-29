'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth, useData } from '@/lib/providers';
import { getToday, calculateHours, formatCurrency, getWeekBounds, getDateRange, formatDateShort } from '@/lib/utils';
import Link from 'next/link';
import DatePicker from 'react-datepicker';
import { ja } from 'date-fns/locale/ja';
import 'react-datepicker/dist/react-datepicker.css';
import './dashboard.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { shifts, staff, requirements, getShifts, getStaffById, initialized } = useData();
  const [loading, setLoading] = useState(true);
  
  const today = getToday();
  const [targetDate, setTargetDate] = useState(today);

  useEffect(() => {
    if (initialized) setLoading(false);
  }, [initialized]);

  // Target Date's Stats
  const targetShifts = useMemo(() => {
    return shifts.filter(s => s.work_date === targetDate && ['approved', 'cancel_requested'].includes(s.status));
  }, [shifts, targetDate]);

  const pendingShifts = useMemo(() => {
    return shifts.filter(s => s.status === 'pending');
  }, [shifts]);

  const cancelRequests = useMemo(() => {
    return shifts.filter(s => s.status === 'cancel_requested');
  }, [shifts]);

  const headcount = targetShifts.length;
  
  const totalHours = useMemo(() => {
    return targetShifts.reduce((total, shift) => total + calculateHours(shift.start_time, shift.end_time), 0);
  }, [targetShifts]);

  const totalCost = useMemo(() => {
    return targetShifts.reduce((total, shift) => {
      const shiftStaff = getStaffById(shift.staff_id);
      if (!shiftStaff) return total;
      const hours = calculateHours(shift.start_time, shift.end_time);
      return total + (hours * shiftStaff.hourly_wage);
    }, 0);
  }, [targetShifts, getStaffById]);

  // Weekly Chart Data (Based on targetDate)
  const weeklyData = useMemo(() => {
    const { start, end } = getWeekBounds(targetDate);
    const range = getDateRange(start, end);
    
    return range.map(date => {
      const dayShifts = shifts.filter(s => s.work_date === date && ['approved', 'cancel_requested'].includes(s.status));
      const dailyCost = dayShifts.reduce((total, shift) => {
        const shiftStaff = getStaffById(shift.staff_id);
        if (!shiftStaff) return total;
        return total + (calculateHours(shift.start_time, shift.end_time) * shiftStaff.hourly_wage);
      }, 0);
      
      return {
        date,
        label: formatDateShort(date),
        cost: dailyCost
      };
    });
  }, [shifts, today, getStaffById]);

  const maxWeeklyCost = Math.max(...weeklyData.map(d => d.cost), 1); // prevent div by zero

  // Understaffed Time Slots (Simplified check)
  const hasUnderstaffed = false; // Add real logic if needed

  const handlePrevDay = () => {
    if (!targetDate) return;
    const d = new Date(targetDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setTargetDate(`${y}-${m}-${day}`);
  };

  const handleNextDay = () => {
    if (!targetDate) return;
    const d = new Date(targetDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setTargetDate(`${y}-${m}-${day}`);
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-enter dashboard-grid">
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
        <div>
          <h1 className="page-title">ダッシュボード</h1>
          <p className="page-subtitle">{targetDate === today ? '本日' : formatDateShort(targetDate)}の運用状況と通知</p>
        </div>
        
        <div className="date-selector" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={handlePrevDay}>&lt; 前日</button>
          <div style={{ zIndex: 9999 }}>
            <DatePicker
              selected={new Date(targetDate + 'T00:00:00')}
              onChange={(date) => {
                if (date) {
                  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                  setTargetDate(localDate.toISOString().split('T')[0]);
                }
              }}
              locale={ja}
              dateFormat="yyyy/MM/dd"
              className="form-input"
              style={{ width: '130px', textAlign: 'center' }}
            />
          </div>
          <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={handleNextDay}>翌日 &gt;</button>
        </div>
      </div>

      <div className="stats-container">
        <div className="stat-card" style={{ '--accent-color': 'var(--primary)' }}>
          <div className="stat-header">
            <span className="stat-icon">👥</span>
            <span className="stat-label">出勤人数</span>
          </div>
          <div className="stat-value">{headcount}<span className="stat-suffix">人</span></div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--success)' }}>
          <div className="stat-header">
            <span className="stat-icon">⏰</span>
            <span className="stat-label">合計労働時間</span>
          </div>
          <div className="stat-value">{totalHours.toFixed(1)}<span className="stat-suffix">時間</span></div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--warning)' }}>
          <div className="stat-header">
            <span className="stat-icon">💰</span>
            <span className="stat-label">概算人件費</span>
          </div>
          <div className="stat-value">{formatCurrency(totalCost)}</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--danger)' }}>
          <div className="stat-header">
            <span className="stat-icon">📋</span>
            <span className="stat-label">未承認シフト</span>
          </div>
          <div className="stat-value">{pendingShifts.length}<span className="stat-suffix">件</span></div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="chart-section">
          <h2 className="section-title">📊 今週の人件費推移</h2>
          <div className="chart-container">
            {weeklyData.map((data, idx) => (
              <div key={idx} className="chart-bar-wrapper">
                <span className="chart-value">¥{(data.cost/1000).toFixed(1)}k</span>
                <div 
                  className="chart-bar" 
                  style={{ height: `${(data.cost / maxWeeklyCost) * 100}%` }}
                ></div>
                <span className="chart-label">{data.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="alerts-section">
          <h2 className="section-title">⚠️ 要対応</h2>
          <div className="alert-list">
            {pendingShifts.length > 0 && (
              <div className="alert-item warning">
                <div className="alert-content">
                  <span className="alert-icon">📋</span>
                  <div>
                    <div className="alert-text">未承認のシフトがあります</div>
                    <div className="alert-count">{pendingShifts.length}件</div>
                  </div>
                </div>
                <Link href="/admin/approvals" className="link-button">確認する &rarr;</Link>
              </div>
            )}
            
            {cancelRequests.length > 0 && (
              <div className="alert-item orange">
                <div className="alert-content">
                  <span className="alert-icon">❌</span>
                  <div>
                    <div className="alert-text">取消依頼があります</div>
                    <div className="alert-count">{cancelRequests.length}件</div>
                  </div>
                </div>
                <Link href="/admin/approvals" className="link-button">確認する &rarr;</Link>
              </div>
            )}

            {pendingShifts.length === 0 && cancelRequests.length === 0 && (
              <div className="empty-state" style={{ padding: '20px' }}>
                <div className="empty-icon">✅</div>
                <div className="empty-title">要対応タスクはありません</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

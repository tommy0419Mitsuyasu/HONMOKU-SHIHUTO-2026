import React, { useState, useMemo } from 'react';
import { getStatusLabel } from '@/lib/utils';

export default function StaffCalendarView({ shifts, onShiftClick, onDateClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Go back to Sunday

    const days = [];
    let current = new Date(startDate);
    
    // Generate exactly 6 weeks (42 days) to keep calendar height consistent
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'badge-pending';
      case 'approved': return 'badge-approved';
      case 'cancel_requested': return 'badge-cancel-requested';
      case 'cancelled': return 'badge-cancelled';
      default: return '';
    }
  };

  const getStatusColorClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-warning-light border-warning text-warning-dark';
      case 'approved': return 'bg-success-light border-success text-success-dark';
      case 'cancel_requested': return 'bg-orange-light border-orange text-orange-dark';
      case 'cancelled': return 'bg-gray-200 border-gray-400 text-gray-600';
      default: return '';
    }
  };

  const todayStr = new Date().toLocaleDateString('ja-JP').split('/').map(n => n.padStart(2, '0')).join('-');

  return (
    <div className="staff-calendar glass-card">
      <div className="calendar-header">
        <button className="btn btn-ghost" onClick={handlePrevMonth}>&lt; 前月</button>
        <h2 className="calendar-title" onClick={handleToday} style={{ cursor: 'pointer' }}>
          {year}年 {month + 1}月
        </h2>
        <button className="btn btn-ghost" onClick={handleNextMonth}>次月 &gt;</button>
      </div>

      <div className="calendar-grid">
        {/* Weekdays */}
        {['日', '月', '火', '水', '木', '金', '土'].map((day, idx) => (
          <div key={day} className={`calendar-weekday ${idx === 0 ? 'text-danger' : idx === 6 ? 'text-primary' : ''}`}>
            {day}
          </div>
        ))}

        {/* Days */}
        {calendarDays.map((dayObj, idx) => {
          const dateStr = [
            dayObj.getFullYear(),
            String(dayObj.getMonth() + 1).padStart(2, '0'),
            String(dayObj.getDate()).padStart(2, '0')
          ].join('-');

          const isCurrentMonth = dayObj.getMonth() === month;
          const isToday = dateStr === todayStr;
          
          // Get shifts for this day
          const dayShifts = shifts.filter(s => s.work_date === dateStr);

          return (
            <div 
              key={dateStr} 
              className={`calendar-cell ${!isCurrentMonth ? 'calendar-cell-disabled' : ''} ${isToday ? 'calendar-cell-today' : ''}`}
              onClick={() => onDateClick && onDateClick(dateStr)}
              style={{ cursor: 'pointer' }}
              title="この日にシフトを提出する"
            >
              <div className="calendar-cell-date" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span>{dayObj.getDate()}</span>
                <span className="add-shift-hint" style={{ opacity: 0.3, fontSize: '10px' }}>＋</span>
              </div>
              
              <div className="calendar-cell-shifts">
                {dayShifts.map(shift => (
                  <div 
                    key={shift.id} 
                    className={`calendar-shift-item ${getStatusColorClass(shift.status)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onShiftClick(shift);
                    }}
                  >
                    <div className="shift-time">{shift.start_time}-{shift.end_time}</div>
                    <div className="shift-status">{getStatusLabel(shift.status)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

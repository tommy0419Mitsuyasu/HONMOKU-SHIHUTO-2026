import React, { useState, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { ja } from 'date-fns/locale/ja';
import 'react-datepicker/dist/react-datepicker.css';
import { generateRotation } from '@/lib/rotation-engine';
import { getToday } from '@/lib/utils';

export default function StaffRotationView({ allShifts, allStaff, user }) {
  const [selectedDate, setSelectedDate] = useState(getToday());

  const myRotation = useMemo(() => {
    if (!user) return null;

    // Filter shifts for the selected date and approved status
    const displayShifts = allShifts.filter(s => 
      s.work_date === selectedDate && 
      (s.status === 'approved' || s.status === 'cancel_requested')
    );

    // If the user does not have a shift on this day, return early
    const myShift = displayShifts.find(s => s.staff_id === user.id);
    if (!myShift) return { hasShift: false };

    // Generate the full rotation for the day
    const rotationData = generateRotation(displayShifts, allStaff);

    // Find the user's row in the generated rotation
    const myRow = rotationData.rows.find(r => r.staff.id === user.id);
    if (!myRow) return { hasShift: false };

    // Extract ONLY this user's positions from the rotation
    const userPositions = [];

    // Process Day Slots
    rotationData.daySlots.forEach(slot => {
      if (myRow.assignments[slot.label]) {
        userPositions.push({
          time: slot.label,
          position: myRow.assignments[slot.label],
          isNight: false
        });
      }
    });

    // Process Night Slots
    rotationData.nightSlots.forEach(slot => {
      if (myRow.assignments[slot.label]) {
        userPositions.push({
          time: slot.label,
          position: myRow.assignments[slot.label],
          isNight: true
        });
      }
    });

    return {
      hasShift: true,
      shift: myShift,
      positions: userPositions
    };

  }, [allShifts, allStaff, user, selectedDate]);

  const getPositionColor = (pos) => {
    if (pos === '休憩') return '#00E5FF';
    if (pos === '掃除') return '#888888';
    if (pos === '準備') return '#A5D6A7';
    if (pos === 'St') return '#FFEB3B';
    if (pos === '当割') return '#E0E0E0';
    return '#FF9800'; // Normal positions
  };

  const handlePrevDay = () => {
    if (!selectedDate) return;
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const handleNextDay = () => {
    if (!selectedDate) return;
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  return (
    <div className="staff-rotation-view glass-card">
      <div className="rotation-header" style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>マイポジション</h2>
        
        <div className="date-selector" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={handlePrevDay}>&lt; 前日</button>
          <div style={{ zIndex: 9999 }}>
            <DatePicker
              selected={new Date(selectedDate + 'T00:00:00')}
              onChange={(date) => {
                if (date) {
                  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                  setSelectedDate(localDate.toISOString().split('T')[0]);
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

      {!myRotation?.hasShift ? (
        <div className="empty-state" style={{ padding: '40px' }}>
          <div className="empty-icon">🏖️</div>
          <div className="empty-title">この日はシフトに入っていません</div>
        </div>
      ) : (
        <div className="my-positions-list" style={{ display: 'grid', gap: '10px' }}>
          <div style={{ marginBottom: '10px', fontSize: '1.1rem', fontWeight: 'bold' }}>
            勤務時間: {myRotation.shift.start_time} 〜 {myRotation.shift.end_time}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
            {myRotation.positions.map((p, idx) => (
              <div 
                key={idx} 
                style={{ 
                  background: 'var(--surface-hover)', 
                  padding: '12px', 
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  {p.time}
                </div>
                <div style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: 'bold', 
                  color: getPositionColor(p.position),
                  padding: '4px 12px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '4px'
                }}>
                  {p.position}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

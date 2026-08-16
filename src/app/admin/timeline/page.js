'use client';

import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/lib/providers';
import { getToday, getHourlyHeadcount, getRequiredCount, formatDateWithDay } from '@/lib/utils';
import DatePicker from 'react-datepicker';
import { ja } from 'date-fns/locale/ja';
import 'react-datepicker/dist/react-datepicker.css';
import RotationView from './RotationView';
import './timeline.css';

export default function TimelinePage() {
  const { shifts, staff, requirements, initialized } = useData();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [filters, setFilters] = useState({
    approved: true,
    pending: true,
    cancel_requested: true
  });
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' or 'rotation'

  useEffect(() => {
    if (initialized) setLoading(false);
  }, [initialized]);

  const toggleFilter = (status) => {
    setFilters(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const hourToCol = (time) => {
    const [h, m] = time.split(':').map(Number);
    return (h - 6) * 4 + Math.floor(m / 15) + 1;
  };

  // 06:00 to 24:00 (18 hours total, block starts at 23:00)
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  const displayShifts = useMemo(() => {
    return shifts.filter(s => {
      if (s.work_date !== selectedDate) return false;
      if (s.status === 'cancelled') return false;
      return filters[s.status];
    });
  }, [shifts, selectedDate, filters]);

  // Aggregate by staff
  const staffShifts = useMemo(() => {
    const map = new Map();
    displayShifts.forEach(shift => {
      if (!map.has(shift.staff_id)) {
        const staffMember = staff.find(st => st.id === shift.staff_id);
        if (staffMember) {
          map.set(shift.staff_id, { staff: staffMember, shifts: [] });
        }
      }
      if (map.has(shift.staff_id)) {
        map.get(shift.staff_id).shifts.push(shift);
      }
    });
    return Array.from(map.values());
  }, [displayShifts, staff]);

  // Heatmap Data
  const heatmapData = useMemo(() => {
    const counts = getHourlyHeadcount(displayShifts.filter(s => s.status !== 'pending'));
    return hours.map(h => {
      const timeStr = `${h.toString().padStart(2, '0')}:00`;
      const count = counts[timeStr] || 0;
      const req = getRequiredCount(requirements, selectedDate, timeStr);
      return { hour: h, count, req, sufficient: count >= req };
    });
  }, [displayShifts, requirements, selectedDate, hours]);

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-enter timeline-page">
      <div className="page-header">
        <h1 className="page-title">タイムライン</h1>
        <p className="page-subtitle">シフトのガントチャート表示</p>
      </div>

      <div className="timeline-controls">
        <div className="date-selector">
          <DatePicker
            selected={selectedDate ? new Date(selectedDate + 'T00:00:00') : null}
            onChange={(date) => {
              if (date) {
                const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                setSelectedDate(localDate.toISOString().split('T')[0]);
              }
            }}
            locale={ja}
            dateFormat="yyyy/MM/dd"
            className="form-input"
            placeholderText="日付を選択"
          />
          <span style={{ fontWeight: 600 }}>{formatDateWithDay(selectedDate)}</span>
        </div>
        
        <div className="filter-group">
          <button 
            className={`filter-btn ${filters.approved ? 'active' : ''}`}
            onClick={() => toggleFilter('approved')}
          >承認済</button>
          <button 
            className={`filter-btn ${filters.pending ? 'active' : ''}`}
            onClick={() => toggleFilter('pending')}
          >未承認</button>
          <button 
            className={`filter-btn ${filters.cancel_requested ? 'active' : ''}`}
            onClick={() => toggleFilter('cancel_requested')}
          >取消依頼</button>
        </div>
      </div>

      <div className="view-tabs">
        <button 
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          ガントチャート
        </button>
        <button 
          className={`tab-btn ${activeTab === 'rotation' ? 'active' : ''}`}
          onClick={() => setActiveTab('rotation')}
        >
          ローテーション表
        </button>
      </div>

      {activeTab === 'timeline' ? (
        <div className="timeline-container">
          <div className="timeline-scroll-wrapper">
            <div className="timeline-header">
              <div className="timeline-staff-col">スタッフ</div>
              <div className="timeline-grid-area">
                <div className="timeline-grid">
                  {hours.map(h => (
                    <div key={h} className="hour-marker">{h}:00</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="timeline-row heatmap-row">
              <div className="timeline-staff-col">必要人数 / 現在</div>
              <div className="timeline-grid-area">
                <div className="timeline-grid">
                  {heatmapData.map((data, i) => (
                    <div 
                      key={i} 
                      className={`heatmap-cell ${data.sufficient ? 'sufficient' : 'deficient'}`}
                    >
                      {data.count} / {data.req}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="timeline-body">
              {staffShifts.length === 0 ? (
                <div className="empty-state" style={{ marginTop: '40px' }}>
                  <div className="empty-icon">📅</div>
                  <div className="empty-title">シフトがありません</div>
                </div>
              ) : (
                staffShifts.map(({ staff: st, shifts }) => (
                  <div key={st.id} className="timeline-row">
                    <div className="timeline-staff-col">{st.full_name}</div>
                    <div className="timeline-grid-area">
                      <div className="timeline-grid staff-row-grid">
                        {shifts.map(shift => {
                          const startCol = hourToCol(shift.start_time);
                          const endCol = hourToCol(shift.end_time);
                          const colSpan = endCol - startCol;
                          
                          return (
                            <div 
                              key={shift.id}
                              className={`shift-bar ${shift.status}`}
                              style={{
                                left: `calc(${(startCol - 1) / 72 * 100}%)`,
                                width: `calc(${colSpan / 72 * 100}%)`
                              }}
                            >
                              {shift.start_time} - {shift.end_time}
                              <div className="timeline-tooltip">
                                {shift.start_time} - {shift.end_time} ({shift.status})
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <RotationView shifts={shifts} staff={staff} date={selectedDate} />
      )}
    </div>
  );
}

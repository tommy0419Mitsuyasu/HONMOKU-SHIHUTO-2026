'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useData } from '@/lib/providers';
import { getToday, generateTimeOptions, calculateHours, formatDateWithDay } from '@/lib/utils';
import { validateMinorShift, getShiftValidationSummary } from '@/lib/validators';
import DatePicker from 'react-datepicker';
import { ja } from 'date-fns/locale/ja';
import 'react-datepicker/dist/react-datepicker.css';
import './submit.css';

export default function ShiftSubmit() {
  const { user, loading: authLoading } = useAuth();
  const { getShifts, createShift, initialized } = useData();
  const router = useRouter();

  const [workDate, setWorkDate] = useState(() => getToday());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = getToday();
  const timeOptions = generateTimeOptions();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const existingShifts = useMemo(() => {
    if (!user) return [];
    return getShifts({ staffId: user.id, excludeStatus: 'cancelled' });
  }, [user, getShifts, initialized]);

  const hours = calculateHours(startTime, endTime);
  
  // Validation
  let minorError = null;
  if (user?.is_minor) {
    const minorResult = validateMinorShift({ startTime, endTime, workDate, existingShifts });
    if (!minorResult.valid) {
      minorError = minorResult.errors[0];
    }
  }

  const selectedDateShifts = existingShifts.filter(s => s.work_date === workDate);
  const alreadySubmitted = selectedDateShifts.length > 0;

  const basicValidation = getShiftValidationSummary(startTime, endTime);
  const isValid = hours > 0 && !minorError && basicValidation?.valid !== false && !alreadySubmitted;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createShift({
        staff_id: user.id,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime
      });

      setSuccessMsg('シフトを提出しました！');
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      console.error(err);
      alert('エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !initialized || !user) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  // Get current month dates with shifts for mini calendar
  const currentMonth = workDate ? workDate.slice(0, 7) : today.slice(0, 7);
  const shiftDates = new Set(existingShifts.filter(s => s.work_date.startsWith(currentMonth)).map(s => s.work_date));

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">📝 シフト提出</h1>
        <p className="page-subtitle">希望する勤務日時を入力してください。</p>
      </div>

      {successMsg && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {successMsg}
        </div>
      )}

      <div className="submit-container">
        <div className="submit-form-wrapper glass-card">
          <form onSubmit={handleSubmit} className="submit-form">
            <div className="form-group">
              <label className="form-label">勤務日</label>
              <DatePicker
                selected={workDate ? new Date(workDate + 'T00:00:00') : null}
                onChange={(date) => {
                  if (date) {
                    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                    setWorkDate(localDate.toISOString().split('T')[0]);
                  } else {
                    setWorkDate('');
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
                <select 
                  className="form-select"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                >
                  {timeOptions.map(time => (
                    <option key={`start-${time}`} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">終了時刻</label>
                <select 
                  className="form-select"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                >
                  {timeOptions.map(time => (
                    <option key={`end-${time}`} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="submit-summary">
              <div className="submit-hours">
                <strong>{basicValidation?.message || '時刻を選択してください'}</strong>
              </div>
            </div>

            {basicValidation?.valid === false && (
              <div className="alert alert-warning">
                <span className="alert-icon">⚠️</span>
                {basicValidation.message}
              </div>
            )}

            {minorError && (
              <div className="alert alert-error">
                <span className="alert-icon">⛔</span>
                {minorError}
              </div>
            )}

            {alreadySubmitted && (
              <div className="alert alert-error">
                <span className="alert-icon">⛔</span>
                この日のシフトはすでに提出済みです。
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary btn-lg submit-btn"
              disabled={!isValid || !workDate || isSubmitting}
            >
              {isSubmitting ? '送信中...' : '提出する'}
            </button>
          </form>
        </div>

        <div className="submit-sidebar">
          <div className="glass-card submit-info-card">
            <h3 className="submit-info-title">📅 {workDate ? formatDateWithDay(workDate) : ''} のシフト</h3>
            {selectedDateShifts.length > 0 ? (
              <div className="submit-existing-list">
                {selectedDateShifts.map(s => (
                  <div key={s.id} className="submit-existing-item">
                    <span className="badge badge-pending">提出済</span>
                    {s.start_time} 〜 {s.end_time}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">この日のシフトはまだ提出されていません。</p>
            )}
          </div>
          
          {/* Simple explanation for minor logic if minor */}
          {user.is_minor && (
            <div className="glass-card minor-rules-card">
              <h3 className="submit-info-title">⚠️ 18歳未満の勤務ルール</h3>
              <ul className="minor-rules-list">
                <li>22:00〜翌5:00の勤務はできません</li>
                <li>1日の労働時間は8時間を超えられません</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

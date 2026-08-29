/**
 * Utility functions for the shift management app
 */

/**
 * Format a date string to Japanese locale
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Format a date to short format (M/D)
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

/**
 * Get day of week in Japanese
 */
export function getDayOfWeek(dateStr) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const d = new Date(dateStr + 'T00:00:00');
  return days[d.getDay()];
}

/**
 * Format date with day of week
 */
export function formatDateWithDay(dateStr) {
  return `${formatDate(dateStr)}（${getDayOfWeek(dateStr)}）`;
}

/**
 * Get today's date string in YYYY-MM-DD format (JST)
 */
export function getToday() {
  const d = new Date();
  const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return localDate.toISOString().split('T')[0];
}

/**
 * Get date string offset from today (JST)
 */
export function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return localDate.toISOString().split('T')[0];
}

/**
 * Format time (HH:MM)
 */
export function formatTime(time) {
  if (!time) return '';
  return time.substring(0, 5);
}

/**
 * Calculate hours between two times
 */
export function calculateHours(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const grossHours = (eh * 60 + em - sh * 60 - sm) / 60;
  
  // 6時間以上の勤務の場合は1時間の休憩を引く
  if (grossHours >= 6) {
    return grossHours - 1;
  }
  return grossHours;
}

/**
 * Format currency in JPY
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('ja-JP').format(num);
}

/**
 * Get status label in Japanese
 */
export function getStatusLabel(status) {
  const labels = {
    pending: '未承認',
    approved: '承認済',
    cancel_requested: '取消依頼中',
    cancelled: '取消済',
  };
  return labels[status] || status;
}

/**
 * Get staff type label in Japanese
 */
export function getStaffTypeLabel(type) {
  const labels = {
    high_school: '高校生',
    university: '大学生',
    general: '一般',
  };
  return labels[type] || type;
}

/**
 * Generate a UUID-like unique ID
 */
export function generateId() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Get week boundaries (Monday to Sunday) for a given date
 */
export function getWeekBounds(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const mondayDiff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayDiff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

/**
 * Generate an array of dates between start and end (inclusive)
 */
export function getDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Generate time options for select inputs (15-minute intervals)
 */
export function generateTimeOptions(startHour = 6, endHour = 22) {
  const options = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === endHour && m > 0) break;
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      options.push(time);
    }
  }
  return options;
}

/**
 * Count shifts per hour for headcount calculation
 */
export function getHourlyHeadcount(shifts, startHour = 6, endHour = 22) {
  const headcount = {};
  for (let h = startHour; h < endHour; h++) {
    const hourStr = `${String(h).padStart(2, '0')}:00`;
    headcount[hourStr] = 0;
  }

  shifts.forEach(shift => {
    const [sH] = shift.start_time.split(':').map(Number);
    const [eH] = shift.end_time.split(':').map(Number);
    for (let h = Math.max(sH, startHour); h < Math.min(eH, endHour); h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      if (headcount[hourStr] !== undefined) {
        headcount[hourStr]++;
      }
    }
  });

  return headcount;
}

/**
 * Get required headcount for a given day of week and time
 */
export function getRequiredCount(requirements, dayOfWeek, hour) {
  const timeStr = `${String(hour).padStart(2, '0')}:00`;
  const req = requirements.find(r => {
    return r.day_of_week === dayOfWeek && r.start_time <= timeStr && r.end_time > timeStr;
  });
  return req ? req.required_count : 0;
}

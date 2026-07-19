/**
 * Labor law validators - 労働基準法チェック
 * Validates shift registrations against Japanese labor laws for minors
 */

/**
 * Calculate hours between two time strings (HH:MM format)
 */
export function calculateHours(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const grossHours = (eh * 60 + em - sh * 60 - sm) / 60;
  
  if (grossHours >= 6) {
    return grossHours - 1;
  }
  return grossHours;
}

/**
 * Check if a time range overlaps with the restricted night period (22:00 - 05:00)
 */
function isNightWork(startTime, endTime) {
  const [sh] = startTime.split(':').map(Number);
  const [eh] = endTime.split(':').map(Number);
  // Night work: 22:00-翌5:00
  // Check if end is after 22:00 or start is before 5:00
  if (eh > 22 || (eh === 22 && endTime > '22:00')) return true;
  if (sh < 5) return true;
  // End time wraps past midnight
  if (eh < sh) return true;
  return false;
}

/**
 * Get the Monday of the week containing the given date
 */
function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday is start of week
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

/**
 * Get the Sunday of the week containing the given date
 */
function getWeekEnd(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

/**
 * Validate a shift registration for a minor (18歳未満) staff member.
 * 
 * @param {Object} params
 * @param {string} params.startTime - Shift start time (HH:MM)
 * @param {string} params.endTime - Shift end time (HH:MM)
 * @param {string} params.workDate - Shift date (YYYY-MM-DD)
 * @param {Array} params.existingShifts - Existing shifts for this staff member
 * @param {string|null} params.excludeShiftId - Shift ID to exclude (for editing)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMinorShift({ startTime, endTime, workDate, existingShifts = [], excludeShiftId = null }) {
  if (!workDate) return { valid: true, errors: [] };
  
  const errors = [];

  // 1. Deep night check (22:00 - 05:00)
  if (isNightWork(startTime, endTime)) {
    errors.push('18歳未満のスタッフは22:00〜翌5:00の深夜帯に勤務できません（労働基準法第61条）');
  }

  // Filter out the shift being edited
  const otherShifts = existingShifts.filter(s =>
    s.id !== excludeShiftId &&
    s.status !== 'cancelled'
  );

  // 2. Daily 8-hour check
  const newShiftHours = calculateHours(startTime, endTime);
  const sameDayShifts = otherShifts.filter(s => s.work_date === workDate);
  const existingDayHours = sameDayShifts.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);
  const totalDayHours = existingDayHours + newShiftHours;

  if (totalDayHours > 8) {
    if (existingDayHours > 0) {
      errors.push(`18歳未満のスタッフは1日8時間を超えて勤務できません（既存シフト: ${existingDayHours.toFixed(1)}時間 + 今回: ${newShiftHours.toFixed(1)}時間 = 合計: ${totalDayHours.toFixed(1)}時間）`);
    } else {
      errors.push(`18歳未満のスタッフは1日8時間を超えて勤務できません（今回の申請: ${totalDayHours.toFixed(1)}時間）`);
    }
  }

  // 3. Weekly 40-hour check
  const weekStart = getWeekStart(workDate);
  const weekEnd = getWeekEnd(workDate);
  const weekShifts = otherShifts.filter(s => s.work_date >= weekStart && s.work_date <= weekEnd);
  const existingWeekHours = weekShifts.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);
  const totalWeekHours = existingWeekHours + newShiftHours;

  if (totalWeekHours > 40) {
    if (existingWeekHours > 0) {
      errors.push(`18歳未満のスタッフは1週40時間を超えて勤務できません（週内の既存シフト: ${existingWeekHours.toFixed(1)}時間 + 今回: ${newShiftHours.toFixed(1)}時間 = 合計: ${totalWeekHours.toFixed(1)}時間）`);
    } else {
      errors.push(`18歳未満のスタッフは1週40時間を超えて勤務できません（今回の申請: ${totalWeekHours.toFixed(1)}時間）`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get validation summary for display
 */
export function getShiftValidationSummary(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const grossHours = (eh * 60 + em - sh * 60 - sm) / 60;
  
  if (grossHours <= 0) return { valid: false, message: '終了時刻は開始時刻より後に設定してください' };
  
  const netHours = grossHours >= 6 ? grossHours - 1 : grossHours;
  const breakText = grossHours >= 6 ? '（うち休憩1時間）' : '';
  
  return { valid: true, hours: netHours, message: `実働時間: ${netHours.toFixed(1)}時間 ${breakText}` };
}

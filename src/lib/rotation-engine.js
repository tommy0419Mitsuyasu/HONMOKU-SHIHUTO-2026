export function generateRotation(shifts, staffList) {
  // Helpers
  const timeToMins = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const minsToTime = (m) => {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  };

  // Fixed bounds: 08:00 to 22:00
  const minTime = 8 * 60; // 480
  const maxTime = 22 * 60; // 1320

  // Generate 30-min slots
  const slots = [];
  for (let m = minTime; m < maxTime; m += 30) {
    slots.push({
      start: m,
      end: m + 30,
      label: minsToTime(m)
    });
  }

  // Split into Day and Night slots
  const daySlots = slots.filter(s => s.start < 18 * 60); // 08:00 to 17:30
  const nightSlots = slots.filter(s => s.start >= 18 * 60); // 18:00 to 21:30

  // Setup staff rows
  const rowsMap = new Map();

  shifts.forEach((shift, index) => {
    const staff = staffList.find(st => st.id === shift.staff_id);
    if (!staff) return;

    const start = timeToMins(shift.start_time);
    const end = timeToMins(shift.end_time);
    const durationMins = end - start;
    const durationHours = durationMins / 60;

    let breakStart = -1;
    let breakEnd = -1;

    // 6時間以上の勤務で1時間（60分）休憩
    if (durationMins >= 360) {
      let idealBreakMins = start + Math.floor((durationMins / 2) / 30) * 30;
      
      // 掃除時間(17:00-18:00, 20:30-21:30)と被らないように調整
      if (idealBreakMins >= 1020 && idealBreakMins < 1080) {
        idealBreakMins = 960; // 16:00
      } else if (idealBreakMins >= 1230 && idealBreakMins < 1290) {
        idealBreakMins = 1170; // 19:30
      }
      
      breakStart = idealBreakMins;
      breakEnd = idealBreakMins + 60;
    }

    rowsMap.set(staff.id, {
      staff,
      shift,
      startMins: start,
      endMins: end,
      durationHours,
      hasBreak: breakStart !== -1,
      breakStart,
      breakEnd,
      assignments: {},
      activeSlots: index % 2,
    });
  });

  // Generate assignments
  slots.forEach(slot => {
    const tMins = slot.start;

    // 準備時間 (8:00 - 8:30, 8:30 - 9:00)
    const isPreparation = (tMins === 480 || tMins === 510);
    // 掃除時間
    const isCleaning = (tMins >= 1020 && tMins < 1080) || (tMins >= 1230 && tMins < 1290);

    const workingNow = Array.from(rowsMap.values()).filter(row => 
      tMins >= row.startMins && tMins < row.endMins
    );

    const totalStaffCount = workingNow.length;

    // Fixed rules overrides
    if (isPreparation) {
      workingNow.forEach(row => { row.assignments[slot.label] = '準備'; });
      return;
    }
    if (isCleaning) {
      workingNow.forEach(row => { row.assignments[slot.label] = '掃除'; });
      return;
    }

    // Process breaks and St
    const availableForDuty = [];
    workingNow.forEach(row => {
      if (row.breakStart !== -1 && tMins >= row.breakStart && tMins < row.breakEnd) {
        row.assignments[slot.label] = '休憩';
        return;
      }
      if (row.activeSlots >= 2) {
        row.assignments[slot.label] = 'St';
        row.activeSlots = 0;
        return;
      }
      availableForDuty.push(row);
    });

    const positions = [];

    // B is mandatory from 10:00 (600), but closed 18:00-18:30 (1080-1110)
    if ((tMins >= 600 && tMins < 1080) || (tMins >= 1110)) {
      positions.push('B');
    }

    if (totalStaffCount >= 14) {
      positions.push('T1', 'T2', 'T3', 'T4');
    } else if (totalStaffCount >= 10 && totalStaffCount <= 13) {
      positions.push('T3', 'T4', 'T1', 'T2');
    }

    positions.push('上', '下', '階下', '渚', '後方');

    if (tMins < 1080) {
      positions.push('K', 'A');
    }

    const uniquePositions = [...new Set(positions)];
    availableForDuty.sort((a, b) => b.activeSlots - a.activeSlots);

    availableForDuty.forEach(row => {
      if (uniquePositions.length > 0) {
        row.assignments[slot.label] = uniquePositions.shift();
      } else {
        row.assignments[slot.label] = 'F';
      }
      row.activeSlots++;
    });
  });

  return {
    daySlots,
    nightSlots,
    rows: Array.from(rowsMap.values()).sort((a, b) => a.startMins - b.startMins) // Sort by start time
  };
}

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

  // Fixed bounds: 08:00 to 21:30 (last slot is 21:00-21:30)
  const minTime = 8 * 60; // 480
  const maxTime = 21.5 * 60; // 1290

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

  const breakCounts = {};

  shifts.forEach((shift, index) => {
    const staff = staffList.find(st => st.id === shift.staff_id);
    if (!staff) return;

    const start = timeToMins(shift.start_time);
    const end = timeToMins(shift.end_time);
    const durationMins = end - start;
    const durationHours = durationMins / 60;

    let breakStart = -1;
    let breakEnd = -1;

    // 6時間を超える勤務で1時間（60分）休憩
    if (durationMins > 360) {
      let idealBreakMins = start + Math.floor((durationMins / 2) / 30) * 30;
      
      const maxConcurrentBreaks = Math.max(1, Math.floor(shifts.length / 3));

      // 掃除時間と被らないように調整する関数
      const adjustForCleaning = (mins) => {
        if (mins >= 1020 && mins < 1080) return 960; // 16:00
        if (mins >= 1230 && mins < 1290) return 1170; // 19:30
        return mins;
      };

      idealBreakMins = adjustForCleaning(idealBreakMins);

      // 休憩時間の分散（最大1時間前後）
      const offsets = [0, -30, 30, -60, 60];
      for (const offset of offsets) {
         let candidate = adjustForCleaning(idealBreakMins + offset);
         let count = breakCounts[candidate] || 0;
         if (count < maxConcurrentBreaks) {
            breakStart = candidate;
            breakCounts[candidate] = count + 1;
            break;
         }
      }
      
      // 分散できなかった場合はそのまま
      if (breakStart === -1) {
         breakStart = idealBreakMins;
         breakCounts[idealBreakMins] = (breakCounts[idealBreakMins] || 0) + 1;
      }
      
      breakEnd = breakStart + 60;
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
      originalBreakStart: breakStart,
      assignments: {},
      activeSlots: index % 2,
      posCounts: {},
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
      workingNow.forEach(row => { row.assignments[slot.label] = '準備'; row.lastPosition = '準備'; });
      return;
    }
    if (isCleaning) {
      workingNow.forEach(row => { row.assignments[slot.label] = '掃除'; row.lastPosition = '掃除'; });
      return;
    }

    // Process breaks and St
    const availableForDuty = [];
    workingNow.forEach(row => {
      // 休憩の割り当て
      if (row.breakStart !== -1 && tMins >= row.breakStart && tMins < row.breakEnd) {
        row.assignments[slot.label] = '休憩';
        row.lastPosition = '休憩';
        row.activeSlots = 0; // 休憩中は連続勤務カウントをリセット（休憩直後のStを防ぐ）
        return;
      }
      
      // 次の枠が休憩かどうかを判定
      const isNextSlotBreak = row.breakStart !== -1 && (tMins + 30) >= row.breakStart && (tMins + 30) < row.breakEnd;

      // 連続勤務（2枠以上）の場合は休ませる（通常は「St」）
      if (row.activeSlots >= 2) {
        // 休憩直前のStはややこしいため、「当割」という名称にする
        if (isNextSlotBreak) {
          row.assignments[slot.label] = '当割';
          row.lastPosition = '当割';
        } else {
          row.assignments[slot.label] = 'St';
          row.lastPosition = 'St';
        }
        row.activeSlots = 0;
        return;
      }
      
      availableForDuty.push(row);
    });

    const positions = [];

    // メインプール（上、下は最優先で常に生成）
    positions.push('上', '下');

    // B is mandatory from 10:00 (600), but closed 18:00-18:30 (1080-1110)
    if ((tMins >= 600 && tMins < 1080) || (tMins >= 1110)) {
      positions.push('B');
    }

    // 「St」や「休憩」を除いた、実際に監視に入れる人数で枠数を決定
    const activeStaffCount = availableForDuty.length;

    // T1〜T4 (人数による変動)
    if (activeStaffCount >= 14) {
      positions.push('T3', 'T4', 'T1', 'T2');
    } else if (activeStaffCount >= 10 && activeStaffCount <= 13) {
      positions.push('T3', 'T4', 'T1', 'T2');
    }

    // 人数によるその他のポジション
    if (activeStaffCount <= 9) {
      // 9人以下：Tは生成せず、後方・横を必ず入れる
      positions.push('後方', '横');
    } else {
      // 10人以上：従来通り（階下・渚は廃止されたため削除）
      positions.push('後方');
    }

    // DAYプールのみ
    if (tMins < 1080) {
      positions.push('A', 'K', '当割');
    } else {
      // ナイトプールでも当割は必要か？通常は必要なので入れる
      positions.push('当割');
    }

    let uniquePositions = [...new Set(positions)];
    
    // 人数が足りない場合は、優先度の低い（配列の後ろの）ポジションから削る
    if (availableForDuty.length < uniquePositions.length) {
      uniquePositions = uniquePositions.slice(0, availableForDuty.length);
    }
    
    const positionsCount = uniquePositions.length;

    // 1. 誰をポジションに入れ、誰をStにするか決定する
    // activeSlotsが「少ない」人（休んでいた人）を優先してポジションに入れることで、
    // 全員が同時に activeSlots=2 に到達してStが大量発生（全滅）するのを防ぐ。
    availableForDuty.sort((a, b) => a.activeSlots - b.activeSlots);

    const workingStaff = availableForDuty.slice(0, positionsCount);
    const standbyStaff = availableForDuty.slice(positionsCount);

    // 2. ポジションに入る人の中では、連続勤務時間が「長い」人ほど優先的にポジションを選択させる
    workingStaff.sort((a, b) => b.activeSlots - a.activeSlots);

    const assignedThisSlot = [];

    // 先にポジションを割り当て
    workingStaff.forEach(row => {
      let assignedPos = null;

      // 直前のポジションと違うものを探す
      let validPositions = uniquePositions.filter(p => p !== row.lastPosition);
      
      // 担当回数が少ないものを優先。同じ回数なら元の uniquePositions の順序（重要度順）を維持
      validPositions.sort((p1, p2) => {
        const count1 = row.posCounts[p1] || 0;
        const count2 = row.posCounts[p2] || 0;
        if (count1 !== count2) return count1 - count2;
        return uniquePositions.indexOf(p1) - uniquePositions.indexOf(p2);
      });
      
      if (validPositions.length > 0) {
        assignedPos = validPositions[0];
        uniquePositions.splice(uniquePositions.indexOf(assignedPos), 1);
      } else if (uniquePositions.length > 0) {
        const forcedPos = uniquePositions[0];
        
        // 既に割り当てられた他のスタッフと交換できないか探す
        const swapCandidate = assignedThisSlot.find(other => 
          other.assignedPos !== forcedPos && 
          other.row.lastPosition !== forcedPos
        );
        
        if (swapCandidate) {
          // 交換成立
          assignedPos = swapCandidate.assignedPos; 
          swapCandidate.row.assignments[slot.label] = forcedPos; 
          swapCandidate.row.lastPosition = forcedPos;
          swapCandidate.assignedPos = forcedPos;
          
          // カウントの調整
          swapCandidate.row.posCounts[forcedPos] = (swapCandidate.row.posCounts[forcedPos] || 0) + 1;
          swapCandidate.row.posCounts[assignedPos] -= 1;
          
          uniquePositions.shift();
        } else {
          // 交換もできない場合は仕方なく連続割り当て
          assignedPos = uniquePositions.shift();
        }
      } 
      
      row.assignments[slot.label] = assignedPos;
      row.lastPosition = assignedPos;
      row.posCounts[assignedPos] = (row.posCounts[assignedPos] || 0) + 1;
      row.activeSlots++; // 監視ポジションに入ったので連続勤務カウントを加算
      assignedThisSlot.push({ row, assignedPos });
    });

    // 余った人は「St」として休ませる
    standbyStaff.forEach(row => {
      const isNextSlotBreak = row.breakStart !== -1 && (tMins + 30) >= row.breakStart && (tMins + 30) < row.breakEnd;
      if (isNextSlotBreak) {
        row.assignments[slot.label] = '当割';
        row.lastPosition = '当割';
      } else {
        row.assignments[slot.label] = 'St';
        row.lastPosition = 'St';
      }
      row.activeSlots = 0; // St(または休憩前の当割)は休養扱いなので連続勤務カウントをリセット
    });
  });

  return {
    daySlots,
    nightSlots,
    rows: Array.from(rowsMap.values()).sort((a, b) => a.startMins - b.startMins) // Sort by start time
  };
}

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
      
      // 次の枠が休憩かどうかを判定（休憩直前のStを防ぐため）
      const isNextSlotBreak = row.breakStart !== -1 && (tMins + 30) >= row.breakStart && (tMins + 30) < row.breakEnd;
      // さらにその次の枠が休憩かどうかの判定（休憩前の3ポジション連続を防ぐための先読み）
      const isSlotAfterNextBreak = row.breakStart !== -1 && (tMins + 60) >= row.breakStart && (tMins + 60) < row.breakEnd;

      // 休憩前デッドロック回避：1枠勤務済みで、2枠後が休憩の場合、ここでStを入れないと「次枠でSt(直前St禁止違反)」か「次枠で監視(3連続違反)」になるため、強制的にここでStとする
      const forceStForBreak = row.activeSlots === 1 && !isNextSlotBreak && isSlotAfterNextBreak;

      // 連続勤務（2枠以上）で、かつ次が休憩でない場合はSt。または上記のデッドロック回避条件に合致した場合。
      if ((row.activeSlots >= 2 && !isNextSlotBreak) || forceStForBreak) {
        row.assignments[slot.label] = 'St';
        row.lastPosition = 'St';
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
      positions.push('A', 'K');
    }

    const uniquePositions = [...new Set(positions)];
    const positionsCount = uniquePositions.length;

    // 1. 誰を監視ポジションに入れ、誰を当割にするか決定する
    // activeSlotsが「少ない」人（休んでいた人）を優先してポジションに入れることで、
    // 全員が同時に activeSlots=2 に到達してStが大量発生（全滅）するのを防ぐ。
    availableForDuty.sort((a, b) => a.activeSlots - b.activeSlots);

    const workingStaff = availableForDuty.slice(0, positionsCount);
    const touwariStaff = availableForDuty.slice(positionsCount);

    // 2. ポジションに入る人の中では、連続勤務時間が「長い」人ほど優先度の高い（配列の前の）ポジションを割り当て
    workingStaff.sort((a, b) => b.activeSlots - a.activeSlots);

    const assignedThisSlot = [];

    // 先にポジションを割り当て
    workingStaff.forEach(row => {
      let assignedPos = null;

      // 直前のポジションと違うものを探す
      const validIndex = uniquePositions.findIndex(p => p !== row.lastPosition);
      
      if (validIndex !== -1) {
        assignedPos = uniquePositions.splice(validIndex, 1)[0];
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
          uniquePositions.shift();
        } else {
          // 交換もできない場合は仕方なく連続割り当て
          assignedPos = uniquePositions.shift();
        }
      } 
      
      row.assignments[slot.label] = assignedPos;
      row.lastPosition = assignedPos;
      row.activeSlots++; // 監視ポジションに入ったので連続勤務カウントを加算
      assignedThisSlot.push({ row, assignedPos });
    });

    // 余った人は「当割」
    touwariStaff.forEach(row => {
      row.assignments[slot.label] = '当割';
      row.lastPosition = '当割';
      row.activeSlots = 0; // 当割は監視業務ではないので、連続勤務カウントをリセットして休ませる
    });
  });

  return {
    daySlots,
    nightSlots,
    rows: Array.from(rowsMap.values()).sort((a, b) => a.startMins - b.startMins) // Sort by start time
  };
}

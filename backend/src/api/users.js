const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const db = require('../config/db');

// @route   GET api/users
// @desc    すべてのユーザーを取得する (for admin shift board)
// @access  Private (Admin)
router.get('/', [auth, admin], async (req, res) => {
  try {
    // 管理画面で使うため、役割(role)も取得するように変更
    const users = await db.query('SELECT id, name, role FROM users ORDER BY created_at ASC');
    res.json(users.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

// @route   GET api/users/work-summary
// @desc    全スタッフの労働時間サマリーを取得する
// @access  Private (Admin)
router.get('/work-summary', [auth, admin], async (req, res) => {
  try {
    // 1. 集計期間を定義 (毎月10日～翌月10日)
    const today = new Date();
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11

    let startDate, endDate;

    if (currentDay < 10) {
      // 今月9日以前の場合、先月10日～今月10日
      startDate = new Date(currentYear, currentMonth - 1, 10);
      endDate = new Date(currentYear, currentMonth, 10);
    } else {
      // 今月10日以降の場合、今月10日～来月10日
      startDate = new Date(currentYear, currentMonth, 10);
      endDate = new Date(currentYear, currentMonth + 1, 10);
    }

    // 2. 期間内の全確定シフトを取得
    const shiftsResult = await db.query(
      'SELECT user_id, start_time, end_time FROM shifts WHERE start_time >= $1 AND start_time < $2',
      [startDate, endDate]
    );
    const shifts = shiftsResult.rows;

    // 3. スタッフごとに実労働時間を集計
    const workHoursMap = new Map();
    for (const shift of shifts) {
      const durationMs = new Date(shift.end_time) - new Date(shift.start_time);
      let durationHours = durationMs / (1000 * 60 * 60);

      // 6.5時間以上の勤務で1時間の休憩を差し引く
      if (durationHours >= 6.5) {
        durationHours -= 1;
      }

      const currentHours = workHoursMap.get(shift.user_id) || 0;
      workHoursMap.set(shift.user_id, currentHours + durationHours);
    }

    // 4. 全ユーザー情報を取得し、労働時間と超過フラグを付与
    const usersResult = await db.query('SELECT id, name, role FROM users');
    const usersWithSummary = usersResult.rows.map(user => {
      const totalWorkHours = workHoursMap.get(user.id) || 0;
      return {
        ...user,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100, // 小数点第2位に丸める
        isOvertime: totalWorkHours > 180,
      };
    });

    res.json(usersWithSummary);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '労働時間サマリーの取得に失敗しました。' });
  }
});

module.exports = router;

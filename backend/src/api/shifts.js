const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const db = require('../config/db');

// @route   POST api/shifts
// @desc    管理者が新しい確定シフトを作成する
// @access  Private (Admin)
router.post('/', [auth, admin], async (req, res) => {
  const { user_id, start_time, end_time } = req.body;

  if (!user_id || !start_time || !end_time) {
    return res.status(400).json({ message: '必須項目が不足しています。' });
  }

  try {
    const newShift = await db.query(
      'INSERT INTO shifts (user_id, start_time, end_time) VALUES ($1, $2, $3) RETURNING *',
      [user_id, start_time, end_time]
    );
    res.status(201).json(newShift.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

// @route   PUT api/shifts/:id
// @desc    確定シフトを更新する (時間や担当者)
// @access  Private (Admin)
router.put('/:id', [auth, admin], async (req, res) => {
  const { user_id, start_time, end_time } = req.body;
  const { id } = req.params;

  if (!user_id || !start_time || !end_time) {
    return res.status(400).json({ message: '必須項目が不足しています。' });
  }

  try {
    const updatedShift = await db.query(
      'UPDATE shifts SET user_id = $1, start_time = $2, end_time = $3 WHERE id = $4 RETURNING *',
      [user_id, start_time, end_time, id]
    );

    if (updatedShift.rows.length === 0) {
      return res.status(404).json({ message: '該当するシフトが見つかりません。' });
    }

    res.json(updatedShift.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

// @route   DELETE api/shifts/:id
// @desc    確定シフトを削除する
// @access  Private (Admin)
router.delete('/:id', [auth, admin], async (req, res) => {
  const { id } = req.params;

  try {
    const deleteResult = await db.query('DELETE FROM shifts WHERE id = $1 RETURNING *', [id]);

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: '該当するシフトが見つかりません。' });
    }

    res.json({ message: 'シフトが削除されました。' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});


// @route   POST api/shifts/requests
// @desc    希望シフトを提出する
// @access  Private
router.post('/requests', auth, async (req, res) => {
  const { start_time, end_time } = req.body;
  const { id: user_id, role } = req.user; // 認証ミドルウェアからユーザーIDと役割を取得

  if (!start_time || !end_time) {
    return res.status(400).json({ message: '開始日時と終了日時を入力してください。' });
  }

  // 高校生の労働時間制限チェック
  if (role === 'staff_hs') {
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);
    const durationHours = (endTime - startTime) / (1000 * 60 * 60); // 差を時間単位で計算

    if (durationHours > 9) {
      return res.status(400).json({ message: '1日の勤務時間は9時間を超えられません。' });
    }
  }

  try {
    const newShiftRequest = await db.query(
      'INSERT INTO shift_requests (user_id, start_time, end_time) VALUES ($1, $2, $3) RETURNING *',
      [user_id, start_time, end_time]
    );

    res.status(201).json(newShiftRequest.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

// @route   GET api/shifts/requests
// @desc    すべての希望シフトを取得する
// @access  Private (Admin)
router.get('/requests', [auth, admin], async (req, res) => {
  try {
    const allRequests = await db.query(
      'SELECT sr.id, sr.user_id, sr.start_time, sr.end_time, sr.status, u.name as user_name FROM shift_requests sr JOIN users u ON sr.user_id = u.id ORDER BY sr.created_at DESC'
    );
    res.json(allRequests.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

// @route   PUT api/shifts/requests/:id
// @desc    希望シフトのステータスを更新する
// @access  Private (Admin)
router.put('/requests/:id', [auth, admin], async (req, res) => {
  const { status, start_time, end_time, user_id } = req.body;
  const { id } = req.params;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: '無効なステータスです。' });
  }

  try {
    const requestResult = await db.query('SELECT * FROM shift_requests WHERE id = $1', [id]);
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: '該当する希望シフトが見つかりません。' });
    }
    const originalRequest = requestResult.rows[0];

    // ステータスを更新
    const updatedRequest = await db.query(
      'UPDATE shift_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    // 承認された場合、確定シフトを作成または更新
    if (status === 'approved') {
      const final_user_id = user_id || originalRequest.user_id;
      const final_start_time = start_time || originalRequest.start_time;
      const final_end_time = end_time || originalRequest.end_time;

      await db.query(
        'INSERT INTO shifts (user_id, start_time, end_time) VALUES ($1, $2, $3)',
        [final_user_id, final_start_time, final_end_time]
      );
    }

    res.json(updatedRequest.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

// @route   GET api/shifts/my-requests
// @desc    自分の希望シフトを取得する
// @access  Private
router.get('/my-requests', auth, async (req, res) => {
  try {
    const myRequests = await db.query(
      'SELECT * FROM shift_requests WHERE user_id = $1 ORDER BY start_time ASC',
      [req.user.id]
    );
    res.json(myRequests.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

// @route   GET api/shifts/my-shifts
// @desc    自分の確定シフトを取得する
// @access  Private
router.get('/my-shifts', auth, async (req, res) => {
  try {
    const myShifts = await db.query(
      'SELECT * FROM shifts WHERE user_id = $1 ORDER BY start_time ASC',
      [req.user.id]
    );
    res.json(myShifts.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

// @route   GET api/shifts/all
// @desc    すべての確定シフトを取得する
// @access  Private (Admin)
router.get('/all', [auth, admin], async (req, res) => {
  try {
    const allShifts = await db.query(
      'SELECT s.id, s.user_id, s.start_time, s.end_time, u.name as user_name FROM shifts s JOIN users u ON s.user_id = u.id ORDER BY s.start_time ASC'
    );
    res.json(allShifts.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

// @route   POST api/shifts/requests/bulk-approve
// @desc    複数の希望シフトを一括承認する
// @access  Private (Admin)
router.post('/requests/bulk-approve', [auth, admin], async (req, res) => {
  const { requestIds } = req.body; // 承認するIDの配列

  if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
    return res.status(400).json({ message: '承認する希望シフトのIDを指定してください。' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN'); // トランザクション開始

    // 1. 対象の希望シフト情報を取得
    const requestsResult = await client.query(
      'SELECT * FROM shift_requests WHERE id = ANY($1::int[]) AND status = \'pending\'',
      [requestIds]
    );
    const requestsToApprove = requestsResult.rows;

    if (requestsToApprove.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: '承認対象の希望シフトが見つかりません。' });
    }

    // 2. ステータスを 'approved' に更新
    await client.query(
      'UPDATE shift_requests SET status = \'approved\' WHERE id = ANY($1::int[])',
      [requestIds]
    );

    // 3. 確定シフトテーブルに挿入
    const insertValues = requestsToApprove.map(
      req => `(${req.user_id}, '${new Date(req.start_time).toISOString()}', '${new Date(req.end_time).toISOString()}')`
    ).join(',');
    
    if (insertValues) {
        await client.query(
            `INSERT INTO shifts (user_id, start_time, end_time) VALUES ${insertValues}`
        );
    }

    await client.query('COMMIT'); // トランザクション確定
    res.json({ message: `${requestsToApprove.length}件の希望シフトが承認されました。` });

  } catch (error) {
    await client.query('ROLLBACK'); // エラー時はロールバック
    console.error(error);
    res.status(500).json({ message: '一括承認処理中にエラーが発生しました。' });
  } finally {
    client.release(); // コネクションをプールに返却
  }
});

// @route   GET api/shifts/my-work-summary
// @desc    自分の総労働時間サマリーを取得する
// @access  Private
router.get('/my-work-summary', auth, async (req, res) => {
  const user_id = req.user.id;

  try {
    // 1. 集計期間を定義 (毎月10日～翌月10日)
    const today = new Date();
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11

    let startDate, endDate;

    if (currentDay < 10) {
      startDate = new Date(currentYear, currentMonth - 1, 10);
      endDate = new Date(currentYear, currentMonth, 10);
    } else {
      startDate = new Date(currentYear, currentMonth, 10);
      endDate = new Date(currentYear, currentMonth + 1, 10);
    }

    // 2. 期間内の自分の確定シフトを取得
    const shiftsResult = await db.query(
      'SELECT start_time, end_time FROM shifts WHERE user_id = $1 AND start_time >= $2 AND start_time < $3',
      [user_id, startDate, endDate]
    );
    const shifts = shiftsResult.rows;

    // 3. 実労働時間を集計
    let totalWorkHours = 0;
    for (const shift of shifts) {
      const durationMs = new Date(shift.end_time) - new Date(shift.start_time);
      let durationHours = durationMs / (1000 * 60 * 60);

      // 6.5時間以上の勤務で1時間の休憩を差し引く
      if (durationHours >= 6.5) {
        durationHours -= 1;
      }
      totalWorkHours += durationHours;
    }

    res.json({ 
      totalWorkHours: Math.round(totalWorkHours * 100) / 100, // 小数点第2位に丸める
      startDate: startDate.toLocaleDateString('ja-JP'),
      endDate: endDate.toLocaleDateString('ja-JP'),
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '労働時間サマリーの取得に失敗しました。' });
  }
});


// @route   DELETE api/shifts/requests/:id
// @desc    希望シフトを削除する
// @access  Private (Admin)
router.delete('/requests/:id', [auth, admin], async (req, res) => {
  try {
    const result = await db.query('DELETE FROM shift_requests WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: '該当する希望シフトが見つかりません。' });
    }
    res.json({ message: '希望シフトが削除されました。' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

// @route   PUT api/shifts/requests/my/:id
// @desc    自分の希望シフトを修正する
// @access  Private (Staff)
router.put('/requests/my/:id', auth, async (req, res) => {
  const { start_time, end_time } = req.body;
  const { id } = req.params;
  const user_id = req.user.id;

  if (!start_time || !end_time) {
    return res.status(400).json({ message: '開始日時と終了日時を指定してください。' });
  }

  try {
    // 希望シフトの所有者とステータスを確認
    const requestResult = await db.query(
      'SELECT * FROM shift_requests WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: '該当する希望シフトが見つからないか、編集権限がありません。' });
    }

    const shiftRequest = requestResult.rows[0];
    if (shiftRequest.status !== 'pending') {
      return res.status(403).json({ message: '承認済または却下されたシフトは修正できません。' });
    }

    // 希望シフトを更新
    const updatedRequest = await db.query(
      'UPDATE shift_requests SET start_time = $1, end_time = $2 WHERE id = $3 RETURNING *',
      [start_time, end_time, id]
    );

    res.json(updatedRequest.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

// @route   DELETE api/shifts/requests/my/:id
// @desc    自分の希望シフトを削除する
// @access  Private (Staff)
router.delete('/requests/my/:id', auth, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    // 希望シフトの所有者とステータスを確認
    const requestResult = await db.query(
      'SELECT * FROM shift_requests WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: '該当する希望シフトが見つからないか、削除権限がありません。' });
    }

    if (requestResult.rows[0].status !== 'pending') {
      return res.status(403).json({ message: '承認済または却下されたシフトは削除できません。' });
    }

    // 希望シフトを削除
    await db.query('DELETE FROM shift_requests WHERE id = $1', [id]);

    res.json({ message: '希望シフトを削除しました。' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});

module.exports = router;

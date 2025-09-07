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
  const user_id = req.user.id; // 認証ミドルウェアからユーザーIDを取得

  if (!start_time || !end_time) {
    return res.status(400).json({ message: '開始日時と終了日時を入力してください。' });
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
  const { status } = req.body;
  const { id } = req.params;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: '無効なステータスです。' });
  }

  try {
    // まず、リクエストされた希望シフトの情報を取得
    const requestResult = await db.query('SELECT * FROM shift_requests WHERE id = $1', [id]);
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: '該当する希望シフトが見つかりません。' });
    }
    const shiftRequest = requestResult.rows[0];

    // ステータスを更新
    const updatedRequest = await db.query(
      'UPDATE shift_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    // もし承認されたなら、確定シフトテーブルにも追加
    if (status === 'approved') {
      await db.query(
        'INSERT INTO shifts (user_id, start_time, end_time) VALUES ($1, $2, $3)',
        [shiftRequest.user_id, shiftRequest.start_time, shiftRequest.end_time]
      );
    }

    res.json(updatedRequest.rows[0]);
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

module.exports = router;

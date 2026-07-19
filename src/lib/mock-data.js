/**
 * Mock data for demo mode - 本牧市民プール
 * Used when Supabase is not configured
 */

// ── Staff profiles ──
export const MOCK_STAFF = [
  { id: 'admin-001', full_name: '田中 太郎', email: 'admin@honmoku-pool.jp', role: 'admin', staff_type: 'general', is_minor: false, hourly_wage: 1500, is_active: true },
  { id: 'staff-001', full_name: '佐藤 花子', email: 'sato@example.com', role: 'staff', staff_type: 'university', is_minor: false, hourly_wage: 1163, is_active: true },
  { id: 'staff-002', full_name: '鈴木 一郎', email: 'suzuki@example.com', role: 'staff', staff_type: 'high_school', is_minor: true, hourly_wage: 1113, is_active: true },
  { id: 'staff-003', full_name: '高橋 美咲', email: 'takahashi@example.com', role: 'staff', staff_type: 'general', is_minor: false, hourly_wage: 1200, is_active: true },
  { id: 'staff-004', full_name: '伊藤 健太', email: 'ito@example.com', role: 'staff', staff_type: 'university', is_minor: false, hourly_wage: 1163, is_active: true },
  { id: 'staff-005', full_name: '渡辺 さくら', email: 'watanabe@example.com', role: 'staff', staff_type: 'high_school', is_minor: true, hourly_wage: 1113, is_active: true },
  { id: 'staff-006', full_name: '山本 大輝', email: 'yamamoto@example.com', role: 'staff', staff_type: 'general', is_minor: false, hourly_wage: 1250, is_active: true },
  { id: 'staff-007', full_name: '中村 遥', email: 'nakamura@example.com', role: 'staff', staff_type: 'university', is_minor: false, hourly_wage: 1163, is_active: true },
  { id: 'staff-008', full_name: '小林 翔太', email: 'kobayashi@example.com', role: 'staff', staff_type: 'high_school', is_minor: true, hourly_wage: 1113, is_active: true },
  { id: 'staff-009', full_name: '加藤 愛', email: 'kato@example.com', role: 'staff', staff_type: 'general', is_minor: false, hourly_wage: 1200, is_active: true },
  { id: 'staff-010', full_name: '吉田 直人', email: 'yoshida@example.com', role: 'staff', staff_type: 'university', is_minor: false, hourly_wage: 1163, is_active: true },
  { id: 'staff-011', full_name: '山田 真央', email: 'yamada@example.com', role: 'staff', staff_type: 'high_school', is_minor: true, hourly_wage: 1113, is_active: true },
  { id: 'staff-012', full_name: '松本 拓也', email: 'matsumoto@example.com', role: 'staff', staff_type: 'general', is_minor: false, hourly_wage: 1300, is_active: true },
  { id: 'staff-013', full_name: '井上 麻衣', email: 'inoue@example.com', role: 'staff', staff_type: 'university', is_minor: false, hourly_wage: 1163, is_active: true },
  { id: 'staff-014', full_name: '木村 蓮', email: 'kimura@example.com', role: 'staff', staff_type: 'general', is_minor: false, hourly_wage: 1200, is_active: true },
  { id: 'staff-015', full_name: '林 優花', email: 'hayashi@example.com', role: 'staff', staff_type: 'university', is_minor: false, hourly_wage: 1163, is_active: true },
];

// Demo passwords (all the same for demo)
export const DEMO_PASSWORD = 'demo1234';

// ── Helper: generate date strings relative to today ──
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const today = dateOffset(0);
const yesterday = dateOffset(-1);
const tomorrow = dateOffset(1);
const dayAfter = dateOffset(2);
const threeDays = dateOffset(3);

// ── Shifts ──
export const MOCK_SHIFTS = [
  // Today's shifts
  { id: 'shift-001', staff_id: 'staff-001', work_date: today, start_time: '09:00', end_time: '14:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: yesterday + 'T10:00:00Z' },
  { id: 'shift-002', staff_id: 'staff-002', work_date: today, start_time: '09:00', end_time: '13:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: yesterday + 'T10:00:00Z' },
  { id: 'shift-003', staff_id: 'staff-003', work_date: today, start_time: '10:00', end_time: '17:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: yesterday + 'T10:00:00Z' },
  { id: 'shift-004', staff_id: 'staff-004', work_date: today, start_time: '12:00', end_time: '18:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: yesterday + 'T10:00:00Z' },
  { id: 'shift-005', staff_id: 'staff-005', work_date: today, start_time: '09:30', end_time: '14:30', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: yesterday + 'T10:00:00Z' },
  { id: 'shift-006', staff_id: 'staff-006', work_date: today, start_time: '13:00', end_time: '19:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: yesterday + 'T10:00:00Z' },
  { id: 'shift-007', staff_id: 'staff-007', work_date: today, start_time: '11:00', end_time: '16:00', status: 'pending', cancel_reason: null, approved_by: null, approved_at: null },
  { id: 'shift-008', staff_id: 'staff-008', work_date: today, start_time: '10:00', end_time: '15:00', status: 'pending', cancel_reason: null, approved_by: null, approved_at: null },
  { id: 'shift-009', staff_id: 'staff-009', work_date: today, start_time: '14:00', end_time: '20:00', status: 'cancel_requested', cancel_reason: '体調不良のため', approved_by: 'admin-001', approved_at: yesterday + 'T11:00:00Z' },
  { id: 'shift-010', staff_id: 'staff-010', work_date: today, start_time: '09:00', end_time: '15:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: yesterday + 'T10:00:00Z' },
  { id: 'shift-011', staff_id: 'staff-012', work_date: today, start_time: '08:00', end_time: '14:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: yesterday + 'T10:00:00Z' },
  { id: 'shift-012', staff_id: 'staff-013', work_date: today, start_time: '15:00', end_time: '21:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: yesterday + 'T10:00:00Z' },
  { id: 'shift-013', staff_id: 'staff-014', work_date: today, start_time: '11:00', end_time: '18:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: yesterday + 'T10:00:00Z' },

  // Tomorrow's shifts
  { id: 'shift-014', staff_id: 'staff-001', work_date: tomorrow, start_time: '10:00', end_time: '16:00', status: 'pending', cancel_reason: null, approved_by: null, approved_at: null },
  { id: 'shift-015', staff_id: 'staff-003', work_date: tomorrow, start_time: '09:00', end_time: '15:00', status: 'pending', cancel_reason: null, approved_by: null, approved_at: null },
  { id: 'shift-016', staff_id: 'staff-004', work_date: tomorrow, start_time: '13:00', end_time: '19:00', status: 'pending', cancel_reason: null, approved_by: null, approved_at: null },
  { id: 'shift-017', staff_id: 'staff-006', work_date: tomorrow, start_time: '12:00', end_time: '18:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: today + 'T08:00:00Z' },
  { id: 'shift-018', staff_id: 'staff-007', work_date: tomorrow, start_time: '09:00', end_time: '14:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: today + 'T08:00:00Z' },
  { id: 'shift-019', staff_id: 'staff-009', work_date: tomorrow, start_time: '10:00', end_time: '16:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: today + 'T08:00:00Z' },
  { id: 'shift-020', staff_id: 'staff-011', work_date: tomorrow, start_time: '09:00', end_time: '13:00', status: 'pending', cancel_reason: null, approved_by: null, approved_at: null },
  { id: 'shift-021', staff_id: 'staff-015', work_date: tomorrow, start_time: '14:00', end_time: '20:00', status: 'pending', cancel_reason: null, approved_by: null, approved_at: null },

  // Day after tomorrow
  { id: 'shift-022', staff_id: 'staff-002', work_date: dayAfter, start_time: '09:00', end_time: '14:00', status: 'pending', cancel_reason: null, approved_by: null, approved_at: null },
  { id: 'shift-023', staff_id: 'staff-005', work_date: dayAfter, start_time: '10:00', end_time: '15:00', status: 'pending', cancel_reason: null, approved_by: null, approved_at: null },
  { id: 'shift-024', staff_id: 'staff-008', work_date: dayAfter, start_time: '09:00', end_time: '13:00', status: 'pending', cancel_reason: null, approved_by: null, approved_at: null },
  { id: 'shift-025', staff_id: 'staff-010', work_date: dayAfter, start_time: '13:00', end_time: '19:00', status: 'pending', cancel_reason: null, approved_by: null, approved_at: null },

  // Yesterday (for history)
  { id: 'shift-026', staff_id: 'staff-001', work_date: yesterday, start_time: '09:00', end_time: '15:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: dateOffset(-2) + 'T10:00:00Z' },
  { id: 'shift-027', staff_id: 'staff-003', work_date: yesterday, start_time: '10:00', end_time: '17:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: dateOffset(-2) + 'T10:00:00Z' },
  { id: 'shift-028', staff_id: 'staff-006', work_date: yesterday, start_time: '09:00', end_time: '18:00', status: 'cancelled', cancel_reason: '台風のため休館', approved_by: 'admin-001', approved_at: dateOffset(-2) + 'T10:00:00Z' },
  { id: 'shift-029', staff_id: 'staff-012', work_date: yesterday, start_time: '08:00', end_time: '14:00', status: 'approved', cancel_reason: null, approved_by: 'admin-001', approved_at: dateOffset(-2) + 'T10:00:00Z' },
];

// ── Staffing requirements (per time slot per day of week) ──
export const MOCK_STAFFING_REQUIREMENTS = [
  // Weekdays (Mon=1 - Fri=5)
  ...[1, 2, 3, 4, 5].flatMap(dow => [
    { id: `req-${dow}-1`, day_of_week: dow, start_time: '09:00', end_time: '12:00', required_count: 6 },
    { id: `req-${dow}-2`, day_of_week: dow, start_time: '12:00', end_time: '15:00', required_count: 8 },
    { id: `req-${dow}-3`, day_of_week: dow, start_time: '15:00', end_time: '18:00', required_count: 6 },
    { id: `req-${dow}-4`, day_of_week: dow, start_time: '18:00', end_time: '21:00', required_count: 4 },
  ]),
  // Weekends (Sat=6, Sun=0)
  ...[0, 6].flatMap(dow => [
    { id: `req-${dow}-1`, day_of_week: dow, start_time: '09:00', end_time: '12:00', required_count: 10 },
    { id: `req-${dow}-2`, day_of_week: dow, start_time: '12:00', end_time: '15:00', required_count: 14 },
    { id: `req-${dow}-3`, day_of_week: dow, start_time: '15:00', end_time: '18:00', required_count: 12 },
    { id: `req-${dow}-4`, day_of_week: dow, start_time: '18:00', end_time: '21:00', required_count: 6 },
  ]),
];

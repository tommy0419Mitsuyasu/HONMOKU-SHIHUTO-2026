-- ================================================================
-- 本牧市民プール シフト管理システム - Supabase Schema
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Profiles table ──
-- Linked to Supabase Auth users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  staff_type TEXT CHECK (staff_type IN ('high_school', 'general')),
  is_minor BOOLEAN NOT NULL DEFAULT false,
  hourly_wage INTEGER NOT NULL DEFAULT 1163,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Shifts table ──
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'cancel_requested', 'cancelled')),
  cancel_reason TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_shifts_staff_date ON shifts(staff_id, work_date);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_work_date ON shifts(work_date);

-- ── Staffing Requirements table ──
CREATE TABLE staffing_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  required_count INTEGER NOT NULL DEFAULT 1
);

-- ── Row Level Security ──

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Shifts RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to shifts" ON shifts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Anyone can view all shifts" ON shifts
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert own shifts" ON shifts
  FOR INSERT WITH CHECK (staff_id = auth.uid());

CREATE POLICY "Staff can update own shifts" ON shifts
  FOR UPDATE USING (
    staff_id = auth.uid()
  );

CREATE POLICY "Staff can delete own pending shifts" ON shifts
  FOR DELETE USING (
    staff_id = auth.uid() AND status = 'pending'
  );

-- Staffing Requirements RLS (read-only for all, admin for write)
ALTER TABLE staffing_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view requirements" ON staffing_requirements
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage requirements" ON staffing_requirements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ── Auto-update timestamp trigger ──
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Realtime Setup ──
-- Enable realtime for profiles and shifts tables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles, shifts;

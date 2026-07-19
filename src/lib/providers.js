'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MOCK_STAFF, MOCK_SHIFTS, MOCK_STAFFING_REQUIREMENTS, DEMO_PASSWORD } from '@/lib/mock-data';
import { generateId } from '@/lib/utils';

const AuthContext = createContext(null);
const DataContext = createContext(null);

// ── Auth Provider ──
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved session
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pool_auth') : null;
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = useCallback((email, password) => {
    // Demo mode: check against mock staff
    const staff = MOCK_STAFF.find(s => s.email === email);
    if (!staff) return { error: 'メールアドレスが見つかりません' };
    if (password !== DEMO_PASSWORD) return { error: 'パスワードが正しくありません' };
    setUser(staff);
    localStorage.setItem('pool_auth', JSON.stringify(staff));
    return { user: staff };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('pool_auth');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ── Data Provider ──
export function DataProvider({ children }) {
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize from localStorage or mock data
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedShifts = localStorage.getItem('pool_shifts');
    const savedStaff = localStorage.getItem('pool_staff');
    setStaff(savedStaff ? JSON.parse(savedStaff) : [...MOCK_STAFF]);
    setShifts(savedShifts ? JSON.parse(savedShifts) : [...MOCK_SHIFTS]);
    setRequirements([...MOCK_STAFFING_REQUIREMENTS]);
    setInitialized(true);
  }, []);

  // Persist shifts and staff changes
  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem('pool_shifts', JSON.stringify(shifts));
  }, [shifts, initialized]);

  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem('pool_staff', JSON.stringify(staff));
  }, [staff, initialized]);

  // Sync data across different tabs automatically
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'pool_shifts' && e.newValue) {
        setShifts(JSON.parse(e.newValue));
      } else if (e.key === 'pool_staff' && e.newValue) {
        setStaff(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ── Shift Operations ──
  const getShifts = useCallback((filters = {}) => {
    let result = [...shifts];
    if (filters.staffId) result = result.filter(s => s.staff_id === filters.staffId);
    if (filters.date) result = result.filter(s => s.work_date === filters.date);
    if (filters.dateFrom) result = result.filter(s => s.work_date >= filters.dateFrom);
    if (filters.dateTo) result = result.filter(s => s.work_date <= filters.dateTo);
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      result = result.filter(s => statuses.includes(s.status));
    }
    if (filters.excludeStatus) {
      const excludes = Array.isArray(filters.excludeStatus) ? filters.excludeStatus : [filters.excludeStatus];
      result = result.filter(s => !excludes.includes(s.status));
    }
    return result;
  }, [shifts]);

  const createShift = useCallback((shiftData) => {
    const newShift = {
      id: generateId(),
      ...shiftData,
      status: 'pending',
      cancel_reason: null,
      approved_by: null,
      approved_at: null,
      created_at: new Date().toISOString(),
    };
    setShifts(prev => [...prev, newShift]);
    return newShift;
  }, []);

  const updateShiftStatus = useCallback((shiftId, status, extra = {}) => {
    setShifts(prev => prev.map(s =>
      s.id === shiftId
        ? { ...s, status, ...extra, updated_at: new Date().toISOString() }
        : s
    ));
  }, []);

  const deleteShift = useCallback((shiftId) => {
    setShifts(prev => prev.filter(s => s.id !== shiftId));
  }, []);

  const updateShift = useCallback((shiftId, data) => {
    setShifts(prev => prev.map(s =>
      s.id === shiftId
        ? { ...s, ...data, updated_at: new Date().toISOString() }
        : s
    ));
  }, []);

  // Bulk approve
  const bulkApproveShifts = useCallback((shiftIds, adminId) => {
    setShifts(prev => prev.map(s =>
      shiftIds.includes(s.id) && s.status === 'pending'
        ? { ...s, status: 'approved', approved_by: adminId, approved_at: new Date().toISOString() }
        : s
    ));
  }, []);

  // ── Staff Operations ──
  const getStaff = useCallback((filters = {}) => {
    let result = staff.filter(s => s.role === 'staff');
    if (filters.active !== undefined) result = result.filter(s => s.is_active === filters.active);
    if (filters.type) result = result.filter(s => s.staff_type === filters.type);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(s => s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    return result;
  }, [staff]);

  const getStaffById = useCallback((id) => {
    return staff.find(s => s.id === id) || null;
  }, [staff]);

  const createStaff = useCallback((data) => {
    const newStaff = {
      id: generateId(),
      ...data,
      role: 'staff',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    setStaff(prev => [...prev, newStaff]);
    return newStaff;
  }, []);

  const updateStaff = useCallback((staffId, data) => {
    setStaff(prev => prev.map(s =>
      s.id === staffId ? { ...s, ...data } : s
    ));
  }, []);

  const resetData = useCallback(() => {
    setStaff([...MOCK_STAFF]);
    setShifts([...MOCK_SHIFTS]);
    localStorage.removeItem('pool_shifts');
    localStorage.removeItem('pool_staff');
  }, []);

  const value = {
    staff, shifts, requirements, initialized,
    getShifts, createShift, updateShiftStatus, deleteShift, updateShift, bulkApproveShifts,
    getStaff, getStaffById, createStaff, updateStaff,
    resetData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

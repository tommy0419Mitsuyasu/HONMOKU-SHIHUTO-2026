'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MOCK_STAFF, MOCK_SHIFTS, MOCK_STAFFING_REQUIREMENTS, DEMO_PASSWORD } from '@/lib/mock-data';
import { generateId } from '@/lib/utils';
import { supabase, isDemo } from '@/lib/supabase';

const AuthContext = createContext(null);
const DataContext = createContext(null);

// ── Auth Provider ──
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved session
    if (isDemo) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('pool_auth') : null;
      if (saved) {
        try {
          setUser(JSON.parse(saved));
        } catch {}
      }
      setLoading(false);
    } else {
      // Supabase auth
      const checkUser = async () => {
        console.log('[Auth] Checking existing session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('[Auth] Session:', session ? 'found' : 'none', sessionError || '');
        if (session) {
          const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          console.log('[Auth] Profile fetch result:', profile, profileError);
          setUser(profile);
        }
        setLoading(false);
      };
      checkUser();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        console.log('[Auth] onAuthStateChange event:', _event, 'session:', session ? 'yes' : 'no');
        if (session) {
          const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          console.log('[Auth] Profile from onAuthStateChange:', profile, profileError);
          setUser(profile);
        } else {
          setUser(null);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const login = useCallback(async (email, password) => {
    console.log('[Login] isDemo:', isDemo, 'email:', email);
    if (isDemo) {
      const staff = MOCK_STAFF.find(s => s.email === email);
      if (!staff) return { error: 'メールアドレスが見つかりません' };
      if (password !== DEMO_PASSWORD) return { error: 'パスワードが正しくありません' };
      setUser(staff);
      localStorage.setItem('pool_auth', JSON.stringify(staff));
      return { user: staff };
    } else {
      console.log('[Login] Calling supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('[Login] Result:', data, 'Error:', error);
      if (error) return { error: error.message };
      return { user: data.user };
    }
  }, []);

  const logout = useCallback(async () => {
    if (isDemo) {
      setUser(null);
      localStorage.removeItem('pool_auth');
    } else {
      await supabase.auth.signOut();
      setUser(null);
    }
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
  const [rotations, setRotations] = useState([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize data
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isDemo) {
      const savedShifts = localStorage.getItem('pool_shifts');
      const savedStaff = localStorage.getItem('pool_staff');
      const savedRotations = localStorage.getItem('pool_rotations');
      setStaff(savedStaff ? JSON.parse(savedStaff) : [...MOCK_STAFF]);
      setShifts(savedShifts ? JSON.parse(savedShifts) : [...MOCK_SHIFTS]);
      setRequirements([...MOCK_STAFFING_REQUIREMENTS]);
      setRotations(savedRotations ? JSON.parse(savedRotations) : []);
      setInitialized(true);
    } else {
      const fetchData = async () => {
        const [staffRes, shiftsRes, reqsRes, rotRes] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('shifts').select('*'),
          supabase.from('staffing_requirements').select('*'),
          supabase.from('rotations').select('*')
        ]);
        
        if (staffRes.data) setStaff(staffRes.data);
        if (shiftsRes.data) setShifts(shiftsRes.data);
        if (reqsRes.data) setRequirements(reqsRes.data);
        if (rotRes.data) setRotations(rotRes.data);
        setInitialized(true);
      };
      fetchData();
      
      // Realtime subscriptions
      const shiftsSub = supabase.channel('shifts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, payload => {
          if (payload.eventType === 'INSERT') setShifts(prev => [...prev, payload.new]);
          if (payload.eventType === 'UPDATE') setShifts(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
          if (payload.eventType === 'DELETE') setShifts(prev => prev.filter(s => s.id !== payload.old.id));
        })
        .subscribe();
        
      const profilesSub = supabase.channel('profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
          if (payload.eventType === 'INSERT') setStaff(prev => [...prev, payload.new]);
          if (payload.eventType === 'UPDATE') setStaff(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        })
        .subscribe();
        
      const rotationsSub = supabase.channel('rotations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rotations' }, payload => {
          if (payload.eventType === 'INSERT') setRotations(prev => [...prev, payload.new]);
          if (payload.eventType === 'UPDATE') setRotations(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
          if (payload.eventType === 'DELETE') setRotations(prev => prev.filter(r => r.id !== payload.old.id));
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(shiftsSub);
        supabase.removeChannel(profilesSub);
        supabase.removeChannel(rotationsSub);
      };
    }
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

  const createShift = useCallback(async (shiftData) => {
    const newShift = {
      status: 'pending',
      cancel_reason: null,
      approved_by: null,
      approved_at: null,
      ...shiftData,
    };
    
    if (isDemo) {
      newShift.id = generateId();
      newShift.created_at = new Date().toISOString();
      setShifts(prev => [...prev, newShift]);
      return newShift;
    } else {
      const { data, error } = await supabase.from('shifts').insert(newShift).select().single();
      if (error) {
        console.error("Error creating shift:", error);
        throw error;
      }
      setShifts(prev => {
        // Prevent duplicate if realtime event fired first
        if (prev.some(s => s.id === data.id)) return prev;
        return [...prev, data];
      });
      return data;
    }
  }, []);

  const updateShiftStatus = useCallback(async (shiftId, status, extra = {}) => {
    if (isDemo) {
      setShifts(prev => prev.map(s =>
        s.id === shiftId
          ? { ...s, status, ...extra, updated_at: new Date().toISOString() }
          : s
      ));
    } else {
      const { error } = await supabase.from('shifts').update({ status, ...extra }).eq('id', shiftId);
      if (error) {
        console.error("Error updating shift status:", error);
        throw error;
      }
    }
  }, []);

  const deleteShift = useCallback(async (shiftId) => {
    if (isDemo) {
      setShifts(prev => prev.filter(s => s.id !== shiftId));
    } else {
      const { error } = await supabase.from('shifts').delete().eq('id', shiftId);
      if (error) throw error;
    }
  }, []);

  const updateShift = useCallback(async (shiftId, data) => {
    if (isDemo) {
      setShifts(prev => prev.map(s =>
        s.id === shiftId
          ? { ...s, ...data, updated_at: new Date().toISOString() }
          : s
      ));
    } else {
      const { error } = await supabase.from('shifts').update(data).eq('id', shiftId);
      if (error) {
        console.error("Error updating shift:", error);
        throw error;
      }
    }
  }, []);

  // Bulk approve
  const bulkApproveShifts = useCallback(async (shiftIds, adminId) => {
    if (isDemo) {
      setShifts(prev => prev.map(s =>
        shiftIds.includes(s.id) && s.status === 'pending'
          ? { ...s, status: 'approved', approved_by: adminId, approved_at: new Date().toISOString() }
          : s
      ));
    } else {
      await supabase.from('shifts')
        .update({ status: 'approved', approved_by: adminId, approved_at: new Date().toISOString() })
        .in('id', shiftIds)
        .eq('status', 'pending');
    }
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

  const createStaff = useCallback(async (data) => {
    if (isDemo) {
      const { password, ...staffData } = data;
      const newStaff = {
        id: generateId(),
        ...staffData,
        role: 'staff',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setStaff(prev => [...prev, newStaff]);
      return newStaff;
    } else {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setStaff(prev => [...prev, result.staff]);
      return result.staff;
    }
  }, []);

  const updateStaff = useCallback(async (staffId, data) => {
    if (isDemo) {
      setStaff(prev => prev.map(s =>
        s.id === staffId ? { ...s, ...data } : s
      ));
    } else {
      await supabase.from('profiles').update(data).eq('id', staffId);
      setStaff(prev => prev.map(s =>
        s.id === staffId ? { ...s, ...data } : s
      ));
    }
  }, []);

  const deleteStaff = useCallback(async (staffId) => {
    if (isDemo) {
      setStaff(prev => prev.filter(s => s.id !== staffId));
    } else {
      const res = await fetch(`/api/staff?id=${staffId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setStaff(prev => prev.filter(s => s.id !== staffId));
    }
  }, []);

  const saveRotation = useCallback(async (date, data) => {
    const newRot = { id: generateId(), date, data, updated_at: new Date().toISOString() };
    
    setRotations(prev => {
      const filtered = prev.filter(r => r.date !== date);
      const newState = [...filtered, newRot];
      if (isDemo) localStorage.setItem('pool_rotations', JSON.stringify(newState));
      return newState;
    });

    if (!isDemo) {
      const { error } = await supabase.from('rotations').upsert({ date, data }, { onConflict: 'date' });
      if (error) console.error('Error saving rotation:', error);
    }
  }, []);

  const deleteRotation = useCallback(async (date) => {
    setRotations(prev => {
      const newState = prev.filter(r => r.date !== date);
      if (isDemo) localStorage.setItem('pool_rotations', JSON.stringify(newState));
      return newState;
    });

    if (!isDemo) {
      const { error } = await supabase.from('rotations').delete().eq('date', date);
      if (error) console.error('Error deleting rotation:', error);
    }
  }, []);

  const resetData = useCallback(() => {
    setStaff([...MOCK_STAFF]);
    setShifts([...MOCK_SHIFTS]);
    setRotations([]);
    localStorage.removeItem('pool_shifts');
    localStorage.removeItem('pool_staff');
    localStorage.removeItem('pool_rotations');
  }, []);

  const value = {
    staff, shifts, requirements, rotations, initialized,
    getShifts, createShift, updateShiftStatus, deleteShift, updateShift, bulkApproveShifts,
    getStaff, getStaffById, createStaff, updateStaff, deleteStaff,
    saveRotation, deleteRotation,
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

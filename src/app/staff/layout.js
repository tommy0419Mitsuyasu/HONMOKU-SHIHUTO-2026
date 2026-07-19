'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/providers';
import { getStaffTypeLabel } from '@/lib/utils';
import './staff-layout.css';

export default function StaffLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && mounted) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'staff') {
        router.push('/admin');
      }
    }
  }, [user, loading, router, mounted]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!mounted || loading || !user || user.role !== 'staff') {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  const navItems = [
    { href: '/staff', icon: '🏠', label: 'ホーム' },
    { href: '/staff/submit', icon: '📝', label: 'シフト提出' },
    { href: '/staff/my-shifts', icon: '📋', label: 'マイシフト' },
  ];

  return (
    <div className="staff-layout">
      <aside className="staff-sidebar">
        <div className="staff-sidebar-header">
          <div className="staff-sidebar-title">🏊 本牧市民プール</div>
          <div className="staff-user-summary">
            <div className="staff-user-name">{user.full_name}</div>
            <span className={`badge ${user.is_minor ? 'badge-warning' : 'badge-primary'}`}>
              {getStaffTypeLabel(user.staff_type)}
            </span>
          </div>
        </div>

        <nav className="staff-nav">
          <ul className="staff-nav-list">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/staff' && pathname.startsWith(item.href));
              return (
                <li key={item.href} className="staff-nav-item">
                  <Link 
                    href={item.href} 
                    className={`staff-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="staff-sidebar-footer">
          <button 
            onClick={handleLogout} 
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            ログアウト
          </button>
        </div>
      </aside>

      <main className="staff-main page-enter">
        {children}
      </main>
    </div>
  );
}

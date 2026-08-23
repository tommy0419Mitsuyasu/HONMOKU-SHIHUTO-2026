'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useData } from '@/lib/providers';
import './admin-layout.css';

export default function AdminLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const { shifts, initialized, resetData } = useData();
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
      } else if (user.role !== 'admin') {
        router.push('/staff');
      }
    }
  }, [user, loading, router, mounted]);

  // Calculate pending shifts
  const pendingCount = shifts?.filter(s => 
    s.status === 'pending' || s.status === 'cancel_requested'
  ).length || 0;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleResetData = async () => {
    if (window.confirm('データを初期状態にリセットしますか？この操作は取り消せません。')) {
      await resetData();
      window.location.reload();
    }
  };

  if (!mounted || loading || !user || user.role !== 'admin') {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', icon: '📊', label: 'ダッシュボード' },
    { href: '/admin/timeline', icon: '📅', label: 'タイムライン' },
    { 
      href: '/admin/approvals', 
      icon: '✅', 
      label: 'シフト承認',
      badge: pendingCount > 0 ? pendingCount : null
    },
    { href: '/admin/staff', icon: '👥', label: 'スタッフ管理' },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-title">🏊 本牧市民プール</div>
          <div className="admin-sidebar-subtitle">管理者パネル</div>
        </div>

        <nav className="admin-nav">
          <ul className="admin-nav-list">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <li key={item.href} className="admin-nav-item">
                  <Link 
                    href={item.href} 
                    className={`admin-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="count-badge" style={{ marginLeft: 'auto' }}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-avatar">👤</div>
            <div className="admin-user-details">
              <span className="admin-user-name">{user.full_name}</span>
              <span className="admin-user-role">管理者</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={handleLogout} 
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              ログアウト
            </button>
            <button 
              onClick={handleResetData} 
              className="btn btn-danger btn-sm"
              style={{ width: '100%', justifyContent: 'center', opacity: 0.7 }}
            >
              データリセット
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main page-enter">
        {children}
      </main>

      <nav className="mobile-bottom-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="mobile-nav-icon">
                {item.icon}
                {item.badge && (
                  <span className="mobile-badge">{item.badge}</span>
                )}
              </div>
              <span className="mobile-nav-label">{item.label.replace('ダッシュボード', 'ホーム').replace('スタッフ管理', 'スタッフ')}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

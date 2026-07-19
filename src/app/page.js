'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'admin') {
      router.replace('/admin');
    } else {
      router.replace('/staff');
    }
  }, [user, loading, router]);

  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)' }}>読み込み中...</p>
    </div>
  );
}

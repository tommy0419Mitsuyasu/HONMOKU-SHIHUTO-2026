'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';
import './login.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { login, user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/staff');
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    
    try {
      const result = await login(email, password);
      if (result.error) {
        setErrorMsg(result.error);
      }
      // Success will trigger the useEffect to redirect
    } catch (err) {
      setErrorMsg('ログイン中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };


  if (loading) {
    return (
      <div className="login-page">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-bg-effects">
        <div className="water-ripple"></div>
        <div className="water-ripple"></div>
      </div>
      
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">🏊 本牧市民プール</h1>
          <p className="login-subtitle">シフト管理システム</p>
        </div>
        
        <div className="login-card">
          <form className="login-form" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="alert alert-error">
                {errorMsg}
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label" htmlFor="email">メールアドレス</label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@example.com"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="password">パスワード</label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                disabled={isSubmitting}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary btn-lg" 
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <span className="spinner" style={{ width: '1.2rem', height: '1.2rem', borderWidth: '2px' }}></span> : 'ログイン'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

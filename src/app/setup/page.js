'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SetupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('初期化を開始するにはボタンを押してください');
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    if (!email || !password) {
      setStatus('エラー: メールアドレスとパスワードを入力してください');
      return;
    }
    
    setLoading(true);
    setStatus(`管理者アカウント(${email})を作成中...`);
    
    try {
      let user = null;
      // 1. サインアップ (Auth)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) {
        // レートリミットや登録済みの場合は、ログインを試行する
        console.log("Signup error (trying login instead):", authError.message);
        setStatus(`サインアップ制限中のため、ログインからの初期化を試みます...`);
        
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (loginError) {
          throw new Error(`サインアップ制限に引っかかっています。先にSupabase管理画面の「Authentication」から直接ユーザーを作成してください。（詳細: ${loginError.message}）`);
        }
        user = loginData.user;
      } else {
        user = authData?.user;
      }
      
      if (user) {
        setStatus('Auth登録完了。プロフィール(profiles)を作成中...');
        // 2. プロフィール作成
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: user.id,
          full_name: '管理者',
          email: email,
          role: 'admin',
          staff_type: 'general',
          is_minor: false,
          hourly_wage: 0,
          is_active: true
        });

        if (profileError) throw profileError;
        
        setStatus('✅ 初期セットアップがすべて完了しました！ ログイン画面に戻ってログインできます。');
      }

    } catch (err) {
      console.error(err);
      setStatus(`❌ エラーが発生しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🛠 Supabase 初期セットアップ</h1>
      <p>Supabaseのデータベースに最初の管理者アカウントを作成します。</p>
      
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <strong>管理者の情報を入力してください:</strong><br/><br/>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>メールアドレス:</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="例: test@gmail.com"
            style={{ padding: '8px', width: '100%', maxWidth: '300px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>パスワード (6文字以上):</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '8px', width: '100%', maxWidth: '300px' }}
          />
        </div>
      </div>

      <button 
        onClick={handleSetup} 
        disabled={loading}
        style={{
          padding: '12px 24px',
          background: '#0ea5e9',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? '処理中...' : '初期データを投入する'}
      </button>

      <p style={{ marginTop: '20px', fontWeight: 'bold', color: status.includes('エラー') ? 'red' : 'green' }}>
        {status}
      </p>
      
      <div style={{ marginTop: '40px' }}>
        <a href="/" style={{ color: '#0ea5e9' }}>← ログイン画面に戻る</a>
      </div>
    </div>
  );
}

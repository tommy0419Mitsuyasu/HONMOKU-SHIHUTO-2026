import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY が .env.local に設定されていません');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// POST: スタッフ新規作成
export async function POST(request) {
  try {
    const body = await request.json();
    const { full_name, email, password, role, staff_type, is_minor, hourly_wage } = body;

    if (!full_name || !email || !password) {
      return NextResponse.json({ error: '氏名・メール・パスワードは必須です' }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1. Authユーザー作成（レートリミット・メール確認なし）
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // 自動で確認済みにする
    });

    if (authError) {
      return NextResponse.json({ error: `Auth作成失敗: ${authError.message}` }, { status: 400 });
    }

    // 2. プロフィール作成
    const { data: profile, error: profileError } = await admin.from('profiles').insert({
      id: authData.user.id,
      full_name,
      email,
      role: role === 'admin' ? 'admin' : 'staff',
      staff_type: staff_type || 'general',
      is_minor: is_minor || false,
      hourly_wage: hourly_wage || 1163,
      is_active: true,
    }).select().single();

    if (profileError) {
      // プロフィール作成失敗時はAuthユーザーも削除
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: `プロフィール作成失敗: ${profileError.message}` }, { status: 400 });
    }

    return NextResponse.json({ staff: profile });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: スタッフ削除
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('id');

    if (!staffId) {
      return NextResponse.json({ error: 'IDが指定されていません' }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1. プロフィール削除（CASCADE で shifts も消える）
    await admin.from('profiles').delete().eq('id', staffId);

    // 2. Authユーザー削除
    const { error } = await admin.auth.admin.deleteUser(staffId);
    if (error) {
      return NextResponse.json({ error: `Auth削除失敗: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

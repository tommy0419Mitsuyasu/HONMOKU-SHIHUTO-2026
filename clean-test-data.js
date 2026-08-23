const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function cleanTestData() {
  console.log('Fetching test users...');
  
  // 1. Fetch all users from auth.users (via admin API)
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Error fetching users:', authError);
    return;
  }
  
  const testUsers = users.filter(u => 
    u.email.includes('test.staff') || 
    u.email === 'sato@example.com' || 
    u.email === 'suzuki@example.com'
  );
  
  console.log(`Found ${testUsers.length} test users to delete.`);
  
  for (const user of testUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`Failed to delete ${user.email}:`, error);
    } else {
      console.log(`Deleted ${user.email}`);
    }
  }
  
  console.log('Test data cleanup complete. (Profiles and shifts are auto-deleted via CASCADE)');
}

cleanTestData();

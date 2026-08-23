const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateAdmin() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) return console.error(error);
  
  const adminUser = users.find(u => u.email === 'admin@honmoku-pool.jp');
  if (adminUser) {
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(adminUser.id, {
      email: 'tommy20000419@gmail.com',
      password: 'Tommy0419',
      email_confirm: true
    });
    if (updateError) console.error('Update error:', updateError);
    else {
      // also update profile email
      await supabase.from('profiles').update({ email: 'tommy20000419@gmail.com', full_name: '管理者' }).eq('id', adminUser.id);
      console.log('Admin user updated successfully');
    }
  } else {
    console.log('Admin user not found. Checking if tommy is already there...');
    const tommy = users.find(u => u.email === 'tommy20000419@gmail.com');
    if (tommy) {
       await supabase.auth.admin.updateUserById(tommy.id, { password: 'Tommy0419' });
       console.log('Updated existing tommy account password.');
    } else {
       console.log('Creating new tommy account');
       const { data, error: createError } = await supabase.auth.admin.createUser({
          email: 'tommy20000419@gmail.com',
          password: 'Tommy0419',
          email_confirm: true
       });
       if(createError) console.log(createError);
       else {
          await supabase.from('profiles').insert({
             id: data.user.id,
             full_name: '管理者',
             email: 'tommy20000419@gmail.com',
             role: 'admin',
             is_active: true
          });
          console.log('Created admin tommy account');
       }
    }
  }
}
updateAdmin();

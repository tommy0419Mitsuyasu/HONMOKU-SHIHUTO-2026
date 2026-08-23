const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Generating test data...');
  
  // 1. Create 15 test staff
  const testStaff = [];
  for (let i = 1; i <= 15; i++) {
    const email = `test.staff.${i}@example.com`;
    const password = 'password123';
    
    // Check if exists
    let user;
    const { data: existingUser } = await supabase.from('profiles').select('*').eq('email', email).single();
    
    if (existingUser) {
      user = existingUser;
    } else {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      
      if (authError) {
        console.error('Error creating auth user:', authError);
        continue;
      }
      
      const newStaff = {
        id: authData.user.id,
        full_name: `テストバイト ${i}号`,
        email: email,
        role: 'staff',
        staff_type: i % 3 === 0 ? 'high_school' : 'general',
        is_minor: i % 3 === 0,
        hourly_wage: i % 3 === 0 ? 1163 : 1200
      };
      
      const { data: profile, error: profError } = await supabase.from('profiles').insert(newStaff).select().single();
      if (profError) {
        console.error('Error creating profile:', profError);
        continue;
      }
      user = profile;
    }
    testStaff.push(user);
  }
  
  console.log(`Created ${testStaff.length} test staff members.`);

  // 2. Generate shifts
  // 8/27: 15 staff
  // 8/28: 4 staff
  // 8/29: 8 staff
  // 8/30: 12 staff
  // 8/31: 6 staff
  const plan = [
    { date: '2026-08-27', count: 15 },
    { date: '2026-08-28', count: 4 },
    { date: '2026-08-29', count: 8 },
    { date: '2026-08-30', count: 12 },
    { date: '2026-08-31', count: 6 }
  ];
  
  const timeOptions = [
    { start: '08:00', end: '17:30' },
    { start: '08:00', end: '16:00' },
    { start: '09:00', end: '17:00' },
    { start: '10:00', end: '14:00' },
    { start: '13:00', end: '21:30' },
    { start: '18:00', end: '21:30' },
    { start: '08:00', end: '21:30' }
  ];

  let shiftsCreated = 0;
  
  for (const day of plan) {
    // Pick random subset of staff
    const selectedStaff = [...testStaff].sort(() => 0.5 - Math.random()).slice(0, day.count);
    
    for (const staff of selectedStaff) {
      let times = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      
      // Minors can't work past 22:00, and max 8 hours
      if (staff.is_minor) {
         if (times.end === '21:30') times.end = '17:30';
      }
      
      const shift = {
        staff_id: staff.id,
        work_date: day.date,
        start_time: times.start,
        end_time: times.end,
        status: 'approved', // already approved so it appears on rotation
        approved_by: staff.id,
        approved_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('shifts').insert(shift);
      if (error) {
        console.error('Error inserting shift:', error);
      } else {
        shiftsCreated++;
      }
    }
  }
  
  console.log(`Successfully created ${shiftsCreated} approved test shifts.`);
}

run();

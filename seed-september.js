const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Generating September test data...');
  
  // 1. Create up to 30 test staff
  const testStaff = [];
  for (let i = 1; i <= 30; i++) {
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
        // Make everyone general to avoid minor restrictions for long shifts, except the first few
        staff_type: 'general',
        is_minor: false,
        hourly_wage: 1200
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
  
  console.log(`Ensured ${testStaff.length} test staff members exist.`);

  const shiftsToInsert = [];

  // Helper to format date
  const pad = (n) => n.toString().padStart(2, '0');

  // Sep 1: 30 members, 08:00 - 21:30
  for (const staff of testStaff) {
    shiftsToInsert.push({
      staff_id: staff.id,
      work_date: '2026-09-01',
      start_time: '08:00',
      end_time: '21:30',
      status: 'approved',
      approved_by: staff.id,
      approved_at: new Date().toISOString()
    });
  }

  // Sep 2: 3 members, 08:00 - 21:30
  const sep2Staff = [...testStaff].sort(() => 0.5 - Math.random()).slice(0, 3);
  for (const staff of sep2Staff) {
    shiftsToInsert.push({
      staff_id: staff.id,
      work_date: '2026-09-02',
      start_time: '08:00',
      end_time: '21:30',
      status: 'approved',
      approved_by: staff.id,
      approved_at: new Date().toISOString()
    });
  }

  // Sep 3 to Sep 30: Random
  const timeOptions = [
    { start: '08:00', end: '17:30' },
    { start: '08:00', end: '16:00' },
    { start: '09:00', end: '17:00' },
    { start: '10:00', end: '14:00' },
    { start: '13:00', end: '21:30' },
    { start: '18:00', end: '21:30' },
    { start: '08:00', end: '21:30' }
  ];

  for (let day = 3; day <= 30; day++) {
    const dateStr = `2026-09-${pad(day)}`;
    // Random headcount between 5 and 20
    const count = Math.floor(Math.random() * 16) + 5; 
    const selectedStaff = [...testStaff].sort(() => 0.5 - Math.random()).slice(0, count);
    
    for (const staff of selectedStaff) {
      let times = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      
      shiftsToInsert.push({
        staff_id: staff.id,
        work_date: dateStr,
        start_time: times.start,
        end_time: times.end,
        status: 'approved',
        approved_by: staff.id,
        approved_at: new Date().toISOString()
      });
    }
  }
  
  console.log(`Attempting to insert ${shiftsToInsert.length} shifts...`);

  // Insert in batches of 100 to avoid limits
  let inserted = 0;
  for (let i = 0; i < shiftsToInsert.length; i += 100) {
    const batch = shiftsToInsert.slice(i, i + 100);
    const { error } = await supabase.from('shifts').insert(batch);
    if (error) {
      console.error('Error inserting batch:', error);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`Successfully created ${inserted} approved test shifts for September.`);
}

run();

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function diagnose() {
  console.log('=== SUPABASE DATABASE DIAGNOSIS ===\n')
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('')

  // 1. Check if profiles table exists and its columns
  console.log('--- 1. PROFILES TABLE ---')
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('*')
    .limit(5)
  if (profilesErr) {
    console.log('ERROR:', profilesErr.message, profilesErr.code, profilesErr.details)
  } else {
    console.log('Profiles count (up to 5):', profiles.length)
    if (profiles.length > 0) {
      console.log('Sample columns:', Object.keys(profiles[0]))
      console.log('Sample data:', JSON.stringify(profiles[0], null, 2))
    }
  }

  // 2. Check auth users
  console.log('\n--- 2. AUTH USERS ---')
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers()
  if (authErr) {
    console.log('ERROR listing auth users:', authErr.message)
  } else {
    console.log('Total auth users:', authUsers.users.length)
    authUsers.users.forEach(u => {
      console.log(`  - ${u.email} (id: ${u.id}, created: ${u.created_at})`)
    })
  }

  // 3. Check if profiles exist for each auth user
  console.log('\n--- 3. PROFILE-AUTH SYNC CHECK ---')
  if (!authErr && authUsers.users.length > 0) {
    for (const u of authUsers.users) {
      const { data: p, error: pe } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', u.id)
        .single()
      if (pe) {
        console.log(`  MISSING PROFILE for ${u.email} (${u.id}): ${pe.message}`)
      } else {
        console.log(`  OK: ${u.email} => role=${p.role}, name=${p.full_name}`)
      }
    }
  }

  // 4. Check key tables exist
  console.log('\n--- 4. TABLE EXISTENCE CHECK ---')
  const tables = ['profiles', 'officer_profiles', 'incidents', 'sos_events', 'messages', 
                  'notifications', 'alerts', 'complaints', 'zones', 'stations', 'neighborhoods',
                  'incident_simple_theft', 'incident_cyber_crime', 'incident_cheating_fraud',
                  'incident_burglary', 'incident_ncr', 'incident_evidence', 'incident_status_history']
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('id').limit(1)
    console.log(`  ${t}: ${error ? 'ERROR - ' + error.message : 'OK (' + data.length + ' rows sample)'}`)
  }

  // 5. Check trigger existence
  console.log('\n--- 5. TEST USER CREATE + DELETE ---')
  const testEmail = 'diag_test_' + Date.now() + '@test.com'
  const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: { full_name: 'Diagnostic Test', role: 'citizen', phone: '9999999999' }
  })
  if (createErr) {
    console.log('CREATE USER ERROR:', createErr.message, createErr.status, createErr.code)
  } else {
    console.log('User created:', createData.user.id)
    
    // Wait for trigger
    await new Promise(r => setTimeout(r, 1500))
    
    // Check if profile was auto-created
    const { data: autoProfile, error: autoErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', createData.user.id)
      .single()
    if (autoErr) {
      console.log('Profile NOT auto-created by trigger:', autoErr.message)
    } else {
      console.log('Profile auto-created:', JSON.stringify(autoProfile, null, 2))
    }

    // Try to delete
    const { error: delErr } = await supabase.auth.admin.deleteUser(createData.user.id)
    if (delErr) {
      console.log('DELETE USER ERROR:', delErr.message, delErr.status, delErr.code)
    } else {
      console.log('User deleted successfully!')
    }
  }

  // 6. Check foreign key constraints on profiles
  console.log('\n--- 6. CHECK FK CONSTRAINTS ---')
  const { data: fkData, error: fkErr } = await supabase.rpc('get_fk_info')
  if (fkErr) {
    console.log('(Cannot check FK via RPC - need SQL editor)')
  }

  console.log('\n=== DIAGNOSIS COMPLETE ===')
}

diagnose().catch(e => console.error('Fatal:', e))

/**
 * FINAL VERIFICATION SCRIPT
 * Run this AFTER executing FIX_ALL_DATABASE.sql in Supabase SQL Editor.
 * Usage: node verify-db.js
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

let passed = 0
let failed = 0

function ok(label) { passed++; console.log(`  ✅ ${label}`) }
function fail(label, detail) { failed++; console.log(`  ❌ ${label}: ${detail}`) }

async function main() {
  console.log('\n🔍 COPS Platform — Database Verification\n')
  console.log('─'.repeat(50))

  // Test 1: Connection
  console.log('\n📡 Test 1: Database Connection')
  const { data: profiles, error: connErr } = await supabase.from('profiles').select('id').limit(1)
  if (connErr) fail('Connection', connErr.message)
  else ok('Connected to Supabase')

  // Test 2: All tables exist
  console.log('\n📋 Test 2: Table Existence')
  const tables = ['profiles', 'officer_profiles', 'incidents', 'sos_events',
    'messages', 'notifications', 'alerts', 'complaints', 'zones', 'stations', 'neighborhoods',
    'incident_simple_theft', 'incident_cyber_crime', 'incident_cheating_fraud',
    'incident_burglary', 'incident_ncr', 'incident_evidence', 'incident_status_history']
  
  for (const t of tables) {
    const { error } = await supabase.from(t).select('id').limit(1)
    if (error) fail(t, error.message)
    else ok(t)
  }

  // Test 3: Profile columns exist
  console.log('\n🧩 Test 3: Profile Extended Columns')
  const { data: colTest, error: colErr } = await supabase
    .from('profiles')
    .select('father_husband_name, mother_name, gender, alternate_mobile, id_proof_type, id_number, pincode, state, district, city_town, tehsil_division, police_station_area, full_address')
    .limit(1)
  if (colErr) fail('Profile columns', colErr.message)
  else ok('All extended profile columns exist')

  // Test 4: User Create + Profile Auto-creation
  console.log('\n👤 Test 4: User Signup Flow')
  const testEmail = 'verify_' + Date.now() + '@test.com'
  const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: { full_name: 'Verify Test User', role: 'citizen', phone: '9876543210' }
  })

  if (createErr) {
    fail('User creation', createErr.message)
  } else {
    ok('Auth user created: ' + createData.user.id)
    
    // Wait a moment for trigger
    await new Promise(r => setTimeout(r, 1000))

    // Check auto-profile
    const { data: autoProfile, error: apErr } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', createData.user.id)
      .single()
    
    if (apErr || !autoProfile) {
      fail('Profile auto-creation', apErr?.message || 'No profile found')
    } else {
      ok('Profile auto-created by trigger: role=' + autoProfile.role + ', name=' + autoProfile.full_name)
    }

    // Test upsert with full data
    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert({
        id: createData.user.id,
        role: 'citizen',
        full_name: 'Updated Verify User',
        phone: '9876543210',
        father_husband_name: 'Test Father',
        state: 'Madhya Pradesh',
        district: 'Indore',
        pincode: '452001',
        police_station_area: 'Palasia Police Station',
        full_address: '123 Test Road',
      }, { onConflict: 'id' })

    if (upsertErr) fail('Profile upsert', upsertErr.message)
    else ok('Profile upsert with extended fields')

    // Test 5: User Delete
    console.log('\n🗑️  Test 5: User Deletion (CASCADE)')
    const { error: delErr } = await supabase.auth.admin.deleteUser(createData.user.id)
    if (delErr) {
      fail('User deletion', delErr.message + ' (status: ' + delErr.status + ')')
      console.log('\n    ⚠️  YOU NEED TO RUN FIX_ALL_DATABASE.sql IN SUPABASE SQL EDITOR FIRST!')
    } else {
      ok('User deleted via API')
      
      // Verify profile is gone too
      await new Promise(r => setTimeout(r, 500))
      const { data: ghostProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', createData.user.id)
        .single()
      
      if (ghostProfile) fail('Cascade delete', 'Profile still exists after user deletion')
      else ok('Profile cascaded (deleted with user)')
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(50))
  console.log(`\n  Results: ${passed} passed, ${failed} failed`)
  if (failed === 0) {
    console.log('  🎉 ALL TESTS PASSED! Database is fully integrated.\n')
  } else {
    console.log('  ⚠️  Some tests failed. Run FIX_ALL_DATABASE.sql in Supabase SQL Editor.\n')
  }
}

main().catch(e => console.error('Fatal:', e))

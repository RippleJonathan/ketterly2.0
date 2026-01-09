// Test team-based commission logic
// File: test-team-commission.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTeamCommissions() {
  console.log('🧪 Testing Team-Based Commission Logic\n')

  // Step 1: Get Billy Idol (should be Team Lead)
  const { data: billy } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .ilike('full_name', '%billy%idol%')
    .single()

  if (!billy) {
    console.log('❌ Billy Idol not found. Please check the database.')
    return
  }

  console.log('✅ Found Billy Idol:', {
    name: billy.full_name,
    email: billy.email,
    role: billy.role
  })

  // Step 2: Get Arizona Office location
  const { data: arizonaOffice } = await supabase
    .from('locations')
    .select('id, name, company_id')
    .ilike('name', '%arizona%')
    .single()

  if (!arizonaOffice) {
    console.log('❌ Arizona Office not found.')
    return
  }

  console.log('✅ Found location:', arizonaOffice.name, '\n')

  // Step 3: Check if Billy's team exists (should be created by migration)
  const { data: billyTeam } = await supabase
    .from('teams')
    .select('*')
    .eq('location_id', arizonaOffice.id)
    .eq('team_lead_id', billy.id)
    .single()

  if (billyTeam) {
    console.log('✅ Billy\'s team found:', {
      name: billyTeam.name,
      commission_rate: billyTeam.commission_rate,
      paid_when: billyTeam.paid_when,
      include_own_sales: billyTeam.include_own_sales
    })
  } else {
    console.log('⚠️  Billy\'s team not found. Creating it now...')
    
    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({
        company_id: arizonaOffice.company_id,
        location_id: arizonaOffice.id,
        name: billy.full_name + '\'s Team',
        team_lead_id: billy.id,
        commission_rate: 2.0,
        paid_when: 'when_final_payment',
        include_own_sales: false,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.log('❌ Error creating team:', error.message)
      return
    }

    console.log('✅ Created team:', newTeam.name)
  }

  const teamToUse = billyTeam || await supabase
    .from('teams')
    .select('*')
    .eq('location_id', arizonaOffice.id)
    .eq('team_lead_id', billy.id)
    .single()
    .then(r => r.data)

  console.log('')

  // Step 4: Find or assign Silly Willy to Billy's team
  const { data: sillyWilly } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .ilike('full_name', '%silly%willy%')
    .single()

  if (!sillyWilly) {
    console.log('❌ Silly Willy not found.')
    return
  }

  console.log('✅ Found sales rep:', sillyWilly.full_name)

  // Check if Silly Willy is assigned to the location
  const { data: sillyLocation } = await supabase
    .from('location_users')
    .select('*')
    .eq('user_id', sillyWilly.id)
    .eq('location_id', arizonaOffice.id)
    .single()

  if (!sillyLocation) {
    console.log('⚠️  Silly Willy not assigned to Arizona Office. Assigning now...')
    await supabase
      .from('location_users')
      .insert({
        user_id: sillyWilly.id,
        location_id: arizonaOffice.id,
        team_id: teamToUse.id
      })
    console.log('✅ Assigned Silly Willy to Arizona Office and Billy\'s team')
  } else if (sillyLocation.team_id !== teamToUse.id) {
    console.log('⚠️  Updating Silly Willy\'s team assignment...')
    await supabase
      .from('location_users')
      .update({ team_id: teamToUse.id })
      .eq('user_id', sillyWilly.id)
      .eq('location_id', arizonaOffice.id)
    console.log('✅ Silly Willy assigned to Billy\'s team')
  } else {
    console.log('✅ Silly Willy already on Billy\'s team')
  }

  console.log('\n📊 Team Structure:')
  console.log('   Location:', arizonaOffice.name)
  console.log('   Team:', teamToUse.name)
  console.log('   Team Lead:', billy.full_name, '(2% override)')
  console.log('   Team Member:', sillyWilly.full_name, '(sales rep)')

  // Step 5: Find a lead with Silly Willy as sales rep
  console.log('\n🔍 Finding lead with Silly Willy as sales rep...')
  const { data: testLead } = await supabase
    .from('leads')
    .select('id, full_name, sales_rep_id, location_id')
    .eq('sales_rep_id', sillyWilly.id)
    .eq('location_id', arizonaOffice.id)
    .is('deleted_at', null)
    .limit(1)
    .single()

  if (!testLead) {
    console.log('❌ No lead found with Silly Willy as sales rep at Arizona Office.')
    console.log('   Please create a lead with Silly Willy as sales rep and try again.')
    return
  }

  console.log('✅ Found test lead:', testLead.full_name)

  // Step 6: Check commissions for this lead
  console.log('\n💰 Current commissions for lead:', testLead.full_name)
  const { data: commissions } = await supabase
    .from('lead_commissions')
    .select(`
      id,
      user_id,
      commission_type,
      commission_rate,
      flat_amount,
      calculated_amount,
      paid_when,
      notes,
      users!inner(full_name, role)
    `)
    .eq('lead_id', testLead.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (!commissions || commissions.length === 0) {
    console.log('   No commissions found. Run the Refresh button in the UI to create them.')
  } else {
    commissions.forEach((comm, idx) => {
      console.log(`\n   ${idx + 1}. ${comm.users.full_name} (${comm.users.role})`)
      console.log(`      Type: ${comm.commission_type}`)
      if (comm.commission_type === 'percentage') {
        console.log(`      Rate: ${comm.commission_rate}%`)
      } else {
        console.log(`      Flat: $${comm.flat_amount}`)
      }
      console.log(`      Amount: $${comm.calculated_amount?.toFixed(2) || '0.00'}`)
      console.log(`      Paid When: ${comm.paid_when}`)
      console.log(`      Notes: ${comm.notes || 'None'}`)
    })

    // Verify Billy has a Team Lead commission
    const billyComm = commissions.find(c => c.user_id === billy.id)
    if (billyComm) {
      console.log('\n✅ PASSED: Billy has Team Lead override commission!')
      console.log('   Amount:', billyComm.calculated_amount)
      console.log('   Rate:', billyComm.commission_rate + '%')
    } else {
      console.log('\n❌ FAILED: Billy should have a Team Lead commission but doesn\'t!')
      console.log('   This means the team-based logic is not working.')
    }
  }

  // Step 7: Test the include_own_sales flag
  console.log('\n\n🧪 Testing include_own_sales flag...')
  console.log('   Scenario: Billy is BOTH Team Lead AND sales rep on a lead')
  
  const { data: billyAsRepLead } = await supabase
    .from('leads')
    .select('id, full_name, sales_rep_id')
    .eq('sales_rep_id', billy.id)
    .eq('location_id', arizonaOffice.id)
    .is('deleted_at', null)
    .limit(1)
    .single()

  if (!billyAsRepLead) {
    console.log('   ℹ️  No lead found with Billy as sales rep. Skipping this test.')
  } else {
    console.log('   Found lead:', billyAsRepLead.full_name)
    
    const { data: billyLeadComms } = await supabase
      .from('lead_commissions')
      .select('id, user_id, notes, commission_rate')
      .eq('lead_id', billyAsRepLead.id)
      .eq('user_id', billy.id)
      .is('deleted_at', null)

    const teamLeadComm = billyLeadComms?.find(c => c.notes?.includes('Team Lead override'))
    
    if (teamToUse.include_own_sales) {
      if (teamLeadComm) {
        console.log('   ✅ PASSED: Billy gets Team Lead override on own sales (include_own_sales=true)')
      } else {
        console.log('   ❌ FAILED: Billy should get Team Lead override (include_own_sales=true)')
      }
    } else {
      if (!teamLeadComm) {
        console.log('   ✅ PASSED: Billy does NOT get Team Lead override on own sales (include_own_sales=false)')
      } else {
        console.log('   ❌ FAILED: Billy should NOT get Team Lead override (include_own_sales=false)')
      }
    }
  }

  console.log('\n✅ Test complete!')
}

testTeamCommissions()

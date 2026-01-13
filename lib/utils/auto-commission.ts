// Automatic Commission Calculation and Creation
import { createClient } from '@/lib/supabase/client'
import { createLeadCommission, updateLeadCommission } from '@/lib/api/lead-commissions'
import { CommissionType, CommissionPaidWhen } from '@/lib/types/commissions'

type AssignmentField = 'sales_rep_id' | 'marketing_rep_id' | 'sales_manager_id' | 'production_manager_id'

/**
 * Get commission configuration for a user based on their assignment role
 * 
 * Priority order:
 * 1. User's commission plan (if set) - legacy/override
 * 2. Location-specific override (location_users)
 * 3. Role-based commission rate (users.sales_commission_rate, etc.)
 * 4. No commission ($0)
 */
async function getUserCommissionConfig(
  userId: string,
  companyId: string,
  locationId: string | null,
  assignmentField: AssignmentField
): Promise<{
  commissionType: 'percentage' | 'flat_amount' | null
  commissionRate: number | null
  flatAmount: number | null
  paidWhen: string
  source: 'plan' | 'location' | 'role' | 'none'
} | null> {
  const supabase = createClient()
  
  // Get user data
  const { data: user } = await supabase
    .from('users')
    .select(`
      id,
      commission_plan_id,
      sales_commission_type,
      sales_commission_rate,
      sales_flat_amount,
      marketing_commission_type,
      marketing_commission_rate,
      marketing_flat_amount,
      production_commission_type,
      production_commission_rate,
      production_flat_amount
    `)
    .eq('id', userId)
    .eq('company_id', companyId)
    .single()
  
  if (!user) return null
  
  // 1. Check if user has commission plan (legacy system)
  if (user.commission_plan_id) {
    const { data: plan } = await supabase
      .from('commission_plans')
      .select('commission_type, commission_rate, flat_amount, paid_when')
      .eq('id', user.commission_plan_id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()
    
    if (plan) {
      return {
        commissionType: plan.commission_type === 'percentage' ? 'percentage' : 'flat_amount',
        commissionRate: plan.commission_type === 'percentage' ? plan.commission_rate : null,
        flatAmount: plan.commission_type === 'flat_per_job' ? plan.flat_amount : null,
        paidWhen: plan.paid_when || 'completed',
        source: 'plan'
      }
    }
  }
  
  // 2. Check location override
  if (locationId) {
    const { data: locationUser } = await supabase
      .from('location_users')
      .select('commission_enabled, commission_type, commission_rate, flat_commission_amount, paid_when')
      .eq('user_id', userId)
      .eq('location_id', locationId)
      .eq('commission_enabled', true)
      .maybeSingle()
    
    if (locationUser) {
      return {
        commissionType: locationUser.commission_type as 'percentage' | 'flat_amount',
        commissionRate: locationUser.commission_type === 'percentage' ? locationUser.commission_rate : null,
        flatAmount: locationUser.commission_type === 'flat_amount' ? locationUser.flat_commission_amount : null,
        paidWhen: locationUser.paid_when || 'when_final_payment',
        source: 'location'
      }
    }
  }
  
  // 3. Check role-based commission rate
  const rolePrefix = assignmentField.replace('_id', '') // 'sales_rep' | 'marketing_rep' | 'sales_manager' | 'production_manager'
  
  let roleCommType: 'percentage' | 'flat_amount' | null = null
  let roleCommRate: number | null = null
  let roleFlatAmount: number | null = null
  
  if (rolePrefix === 'sales_rep' || rolePrefix === 'sales_manager') {
    roleCommType = user.sales_commission_type
    roleCommRate = user.sales_commission_rate
    roleFlatAmount = user.sales_flat_amount
  } else if (rolePrefix === 'marketing_rep') {
    roleCommType = user.marketing_commission_type
    roleCommRate = user.marketing_commission_rate
    roleFlatAmount = user.marketing_flat_amount
  } else if (rolePrefix === 'production_manager') {
    roleCommType = user.production_commission_type
    roleCommRate = user.production_commission_rate
    roleFlatAmount = user.production_flat_amount
  }
  
  if (roleCommType && (roleCommRate || roleFlatAmount)) {
    return {
      commissionType: roleCommType,
      commissionRate: roleCommType === 'percentage' ? roleCommRate : null,
      flatAmount: roleCommType === 'flat_amount' ? roleFlatAmount : null,
      paidWhen: 'when_final_payment', // Default
      source: 'role'
    }
  }
  
  // 4. No commission
  return {
    commissionType: null,
    commissionRate: null,
    flatAmount: null,
    paidWhen: 'when_final_payment',
    source: 'none'
  }
}

function mapPlanPaidWhenToLeadCommissionPaidWhen(
  planPaidWhen: string | null | undefined
): CommissionPaidWhen {
  switch (planPaidWhen) {
    case 'deposit':
      return 'when_deposit_paid'
    case 'completed':
      return 'when_job_completed'
    case 'collected':
      return 'when_final_payment'
    case 'signed':
      // No exact equivalent in lead_commissions; keep valid and conservative.
      return 'custom'
    default:
      return 'when_final_payment'
  }
}

/**
 * Create office and team lead override commissions for a lead
 * This should be called ONCE after all user role commissions are created
 * to avoid race condition duplicates when multiple users are assigned
 * 
 * @param leadId - The lead ID
 * @param salesRepId - The sales rep ID (used to find team)
 * @param companyId - The company ID
 */
export async function createOfficeAndTeamCommissions(
  leadId: string,
  salesRepId: string,
  companyId: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = createClient()

  try {
    // Get the lead's location
    const { data: leadData } = await supabase
      .from('leads')
      .select('location_id, sales_rep_id')
      .eq('id', leadId)
      .single()
    
    if (!leadData?.location_id) {
      return { success: true, message: 'No location set, skipping office/team commissions' }
    }

    // OFFICE MANAGER COMMISSIONS
    const { data: locationUsers } = await supabase
      .from('location_users')
      .select(`
        user_id,
        commission_enabled,
        commission_type,
        commission_rate,
        flat_commission_amount,
        paid_when,
        include_own_sales,
        users!location_users_user_id_fkey(id, full_name, role)
      `)
      .eq('location_id', leadData.location_id)
      .eq('commission_enabled', true)
    
    console.log('🏢 Office users with commission enabled:', locationUsers?.length || 0)
    
    if (locationUsers && locationUsers.length > 0) {
      for (const locationUser of locationUsers) {
        const userRole = locationUser.users?.role || 'unknown'
        
        // Only process Office role here
        if (userRole !== 'office') continue
        
        console.log(`   🔍 Processing Office Manager: ${locationUser.users?.full_name}`)
        
        // Check if office commission already exists
        const { data: existingOfficeComm } = await supabase
          .from('lead_commissions')
          .select('id')
          .eq('lead_id', leadId)
          .eq('user_id', locationUser.user_id)
          .eq('assignment_field', 'office_override')
          .is('deleted_at', null)
          .maybeSingle()
        
        if (existingOfficeComm) {
          console.log('      ⏭️  Skipping - Office commission already exists')
          continue
        }
        
        // Check include_own_sales flag
        if (!locationUser.include_own_sales && leadData.sales_rep_id === locationUser.user_id) {
          console.log('      ⏭️  Skipping - user is sales rep and include_own_sales is false')
          continue
        }
        
        // Calculate office commission
        const officeCommType = locationUser.commission_type === 'flat_amount' ? 'flat_amount' : 'percentage'
        let officeCommAmount = 0
        let officeBaseAmount = 0
        
        if (locationUser.commission_type === 'flat_amount') {
          officeCommAmount = Number(locationUser.flat_commission_amount) || 0
          officeBaseAmount = officeCommAmount
          console.log(`      💰 Flat commission: $${officeCommAmount}`)
        } else {
          const { data: invoice } = await supabase
            .from('customer_invoices')
            .select('total')
            .eq('lead_id', leadId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          officeBaseAmount = invoice ? Number(invoice.total) || 0 : 0
          const rate = Number(locationUser.commission_rate) || 0
          officeCommAmount = officeBaseAmount * (rate / 100)
          console.log(`      💰 Percentage commission: ${rate}% of $${officeBaseAmount} = $${officeCommAmount}`)
        }
        
        if (officeCommAmount > 0 || (locationUser.commission_type === 'percentage' && Number(locationUser.commission_rate) > 0)) {
          const paidWhen = locationUser.paid_when || 'when_final_payment'
          const commissionNote = `Auto-created: Office Manager override commission${officeCommAmount > 0 ? `: $${officeCommAmount.toFixed(2)}` : ''}`
          
          console.log(`      ✅ Creating Office Manager commission for ${locationUser.users?.full_name}`)
          console.log(`      📅 Paid when: ${paidWhen}`)
          
          await createLeadCommission(leadId, companyId, {
            lead_id: leadId,
            user_id: locationUser.user_id,
            assignment_field: 'office_override',
            commission_plan_id: null,
            commission_type: officeCommType,
            commission_rate: locationUser.commission_type === 'percentage' ? Number(locationUser.commission_rate) : null,
            flat_amount: locationUser.commission_type === 'flat_amount' ? Number(locationUser.flat_commission_amount) : null,
            calculated_amount: officeCommAmount,
            base_amount: officeBaseAmount,
            paid_when: paidWhen,
            notes: commissionNote,
          } as any)
        }
      }
    }

    // TEAM LEAD COMMISSIONS
    if (salesRepId) {
      console.log('👔 Checking for Team Lead commission...')
      
      const { data: salesRepTeam } = await supabase
        .from('location_users')
        .select(`
          team_id,
          teams!inner(
            id,
            team_lead_id,
            commission_rate,
            paid_when,
            include_own_sales,
            is_active
          )
        `)
        .eq('user_id', salesRepId)
        .eq('location_id', leadData.location_id)
        .not('team_id', 'is', null)
        .maybeSingle()
      
      if (salesRepTeam?.teams && salesRepTeam.teams.team_lead_id) {
        const team = salesRepTeam.teams
        console.log(`   📋 Sales rep is on team with Team Lead:`, team.team_lead_id)
        
        if (!team.is_active) {
          console.log('   ⏭️  Skipping - Team is inactive')
        } else {
          // Check if team lead commission already exists
          const { data: existingTeamComm } = await supabase
            .from('lead_commissions')
            .select('id')
            .eq('lead_id', leadId)
            .eq('user_id', team.team_lead_id)
            .eq('assignment_field', 'team_lead_override')
            .is('deleted_at', null)
            .maybeSingle()
          
          if (existingTeamComm) {
            console.log('   ⏭️  Skipping - Team Lead commission already exists')
          } else {
            // Calculate team lead commission
            const { data: invoice } = await supabase
              .from('customer_invoices')
              .select('total')
              .eq('lead_id', leadId)
              .is('deleted_at', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            
            const baseAmount = invoice ? Number(invoice.total) || 0 : 0
            const rate = Number(team.commission_rate) || 0
            const teamCommAmount = baseAmount * (rate / 100)
            
            console.log(`   💰 Team Lead commission: ${rate}% of $${baseAmount} = $${teamCommAmount}`)
            
            if (teamCommAmount > 0 || rate > 0) {
              await createLeadCommission(leadId, companyId, {
                lead_id: leadId,
                user_id: team.team_lead_id,
                assignment_field: 'team_lead_override',
                commission_plan_id: null,
                commission_type: 'percentage',
                commission_rate: rate,
                flat_amount: null,
                calculated_amount: teamCommAmount,
                base_amount: baseAmount,
                paid_when: team.paid_when || 'when_final_payment',
                notes: `Auto-created: Team Lead override commission: $${teamCommAmount.toFixed(2)}`,
              } as any)
              console.log('   ✅ Team Lead commission created')
            }
          }
        }
      } else {
        console.log('   ℹ️  Sales rep is not on a team (no Team Lead override)')
      }
    }

    return { success: true, message: 'Office and team commissions processed' }
  } catch (error) {
    console.error('❌ Error creating office/team commissions:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Automatically create or update commission for a lead when user is assigned
 * 
 * This function:
 * 1. Gets the assigned user's commission configuration (plan/location/role-based)
 * 2. Checks for location-based office role commissions
 * 3. Finds the latest approved quote/invoice total as base amount
 * 4. Calculates commission based on config
 * 5. Creates/updates commission record
 * 6. Handles reassignment by canceling old user's commission (unless skipCancelOthers=true)
 * 
 * @param leadId - The lead ID
 * @param userId - The newly assigned user ID (null if unassigning)
 * @param companyId - The company ID
 * @param currentUserId - The user making the change
 * @param assignmentField - Which role the user is filling (sales_rep_id, marketing_rep_id, etc.)
 * @param skipCancelOthers - If true, don't cancel other users' commissions (for multi-user scenarios)
 */
export async function autoCreateCommission(
  leadId: string,
  userId: string | null,
  companyId: string,
  currentUserId: string | null,
  assignmentField: AssignmentField = 'sales_rep_id',
  skipCancelOthers: boolean = false
): Promise<{ success: boolean; message?: string }> {
  const supabase = createClient()

  try {
    console.log('🎯 autoCreateCommission called:', { leadId, userId, companyId, skipCancelOthers })
    
    // Get the lead's location and sales rep (needed for all commission types)
    const { data: leadData } = await supabase
      .from('leads')
      .select('location_id, sales_rep_id')
      .eq('id', leadId)
      .single()
    
    console.log('📍 Lead location:', leadData?.location_id || 'NO LOCATION')
    console.log('👤 Sales rep:', leadData?.sales_rep_id || 'NO SALES REP')
    
    // STEP 0: Check for location-based office role commissions + Team Lead override
    // Skip this if called from invoice creation (skipCancelOthers=true) since it will be handled separately
    // to avoid race condition duplicates
    if (!skipCancelOthers && leadData?.location_id) {
      // Find Office Manager at this location
      const { data: locationUsers } = await supabase
        .from('location_users')
        .select(`
          user_id,
          commission_enabled,
          commission_type,
          commission_rate,
          flat_commission_amount,
          paid_when,
          include_own_sales,
          users!location_users_user_id_fkey(id, full_name, role)
        `)
        .eq('location_id', leadData.location_id)
        .eq('commission_enabled', true)
      
      console.log('👥 Office users with commission enabled:', locationUsers?.length || 0)
      
      // Create Office Manager commission (if exists)
      if (locationUsers && locationUsers.length > 0) {
        for (const locationUser of locationUsers) {
          const userRole = locationUser.users?.role || 'unknown'
          
          // Only process Office role here (Team Leads handled separately below)
          if (userRole !== 'office') continue
          
          console.log(`   🔍 Processing Office Manager: ${locationUser.users?.full_name}`)
          
          // Skip if this is the same as the assigned user (to avoid duplicates)
          if (locationUser.user_id === userId) {
            console.log('      ⏭️  Skipping - same as assigned user')
            continue
          }
          
          // Check include_own_sales flag
          if (!locationUser.include_own_sales && leadData.sales_rep_id === locationUser.user_id) {
            console.log('      ⏭️  Skipping - user is sales rep and include_own_sales is false')
            continue
          }
          
          // Check if commission already exists for this office user (regardless of assignment_field)
          // Office commissions are created once per lead, not per role
          const { data: existingOfficeComm } = await supabase
            .from('lead_commissions')
            .select('id, created_at, assignment_field')
            .eq('lead_id', leadId)
            .eq('user_id', locationUser.user_id)
            .is('deleted_at', null)
            .limit(1)
            .maybeSingle()
          
          if (existingOfficeComm) {
            console.log(`      ⏭️  Skipping - Office commission already exists (created for ${existingOfficeComm.assignment_field})`)
            continue
          }
          
          // Calculate office commission
          const officeCommType = locationUser.commission_type === 'flat_amount' ? 'flat_amount' : 'percentage'
          let officeCommAmount = 0
          let officeBaseAmount = 0
          
          if (locationUser.commission_type === 'flat_amount') {
            officeCommAmount = Number(locationUser.flat_commission_amount) || 0
            officeBaseAmount = officeCommAmount
            console.log(`      💰 Flat commission: $${officeCommAmount}`)
          } else {
            const { data: invoice } = await supabase
              .from('customer_invoices')
              .select('total')
              .eq('lead_id', leadId)
              .is('deleted_at', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            
            officeBaseAmount = invoice ? Number(invoice.total) || 0 : 0
            const rate = Number(locationUser.commission_rate) || 0
            officeCommAmount = officeBaseAmount * (rate / 100)
            console.log(`      💰 Percentage commission: ${rate}% of $${officeBaseAmount} = $${officeCommAmount}`)
          }
          
          if (officeCommAmount > 0 || (locationUser.commission_type === 'percentage' && Number(locationUser.commission_rate) > 0)) {
            const paidWhen = locationUser.paid_when || 'when_final_payment'
            const commissionNote = `Auto-created: Office Manager override commission${officeCommAmount > 0 ? `: $${officeCommAmount.toFixed(2)}` : ''}`
            
            console.log(`      ✅ Creating Office Manager commission for ${locationUser.users?.full_name}`)
            console.log(`      📅 Paid when: ${paidWhen}`)
            
            await createLeadCommission(leadId, companyId, {
              lead_id: leadId,
              user_id: locationUser.user_id,
              assignment_field: 'office_override', // Mark as office override, not tied to specific role
              commission_plan_id: null,
              commission_type: officeCommType,
              commission_rate: locationUser.commission_type === 'percentage' ? Number(locationUser.commission_rate) : null,
              flat_amount: locationUser.commission_type === 'flat_amount' ? Number(locationUser.flat_commission_amount) : null,
              calculated_amount: officeCommAmount,
              base_amount: officeBaseAmount,
              paid_when: paidWhen,
              notes: commissionNote,
              ...(currentUserId && { created_by: currentUserId }),
            } as any)
          }
        }
      }
      
      // Check for Team Lead commission (based on sales rep's team)
      if (leadData.sales_rep_id) {
        console.log('👔 Checking for Team Lead commission...')
        
        // Find the team for this sales rep
        const { data: salesRepTeam } = await supabase
          .from('location_users')
          .select(`
            team_id,
            teams!inner(
              id,
              team_lead_id,
              commission_rate,
              paid_when,
              include_own_sales,
              is_active
            )
          `)
          .eq('user_id', leadData.sales_rep_id)
          .eq('location_id', leadData.location_id)
          .not('team_id', 'is', null)
          .maybeSingle()
        
        if (salesRepTeam?.teams && salesRepTeam.teams.team_lead_id) {
          const team = salesRepTeam.teams
          console.log(`   📋 Sales rep is on team with Team Lead:`, team.team_lead_id)
          
          // Skip if Team Lead commission is disabled or team inactive
          if (!team.is_active) {
            console.log('      ⏭️  Skipping - team is inactive')
          } else if (!team.commission_rate || team.commission_rate <= 0) {
            console.log('      ⏭️  Skipping - team has no commission rate')
          } else {
            // Check include_own_sales flag
            if (!team.include_own_sales && leadData.sales_rep_id === team.team_lead_id) {
              console.log('      ⏭️  Skipping - Team Lead is also sales rep and include_own_sales is false')
            } else {
              // Check if Team Lead commission already exists (regardless of assignment_field)
              // Team Lead commissions are created once per lead, not per role
              const { data: existingTeamLeadComm } = await supabase
                .from('lead_commissions')
                .select('id, assignment_field')
                .eq('lead_id', leadId)
                .eq('user_id', team.team_lead_id)
                .is('deleted_at', null)
                .limit(1)
                .maybeSingle()
              
              if (existingTeamLeadComm) {
                console.log(`      ⏭️  Skipping - Team Lead commission already exists (created for ${existingTeamLeadComm.assignment_field})`)
              } else {
                // Get Team Lead user info
                const { data: teamLeadUser } = await supabase
                  .from('users')
                  .select('full_name')
                  .eq('id', team.team_lead_id)
                  .single()
                
                // Calculate Team Lead override commission
                const { data: invoice } = await supabase
                  .from('customer_invoices')
                  .select('total')
                  .eq('lead_id', leadId)
                  .is('deleted_at', null)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle()
                
                const baseAmount = invoice ? Number(invoice.total) || 0 : 0
                const rate = Number(team.commission_rate) || 0
                const teamLeadAmount = baseAmount * (rate / 100)
                
                console.log(`      💰 Team Lead commission: ${rate}% of $${baseAmount} = $${teamLeadAmount}`)
                
                if (rate > 0) {
                  const paidWhen = team.paid_when || 'when_final_payment'
                  const commissionNote = `Auto-created: Team Lead override commission${teamLeadAmount > 0 ? `: $${teamLeadAmount.toFixed(2)}` : ''}`
                  
                  console.log(`      ✅ Creating Team Lead commission for ${teamLeadUser?.full_name}`)
                  console.log(`      📅 Paid when: ${paidWhen}`)
                  
                  await createLeadCommission(leadId, companyId, {
                    lead_id: leadId,
                    user_id: team.team_lead_id,
                    assignment_field: 'team_lead_override', // Mark as team lead override, not tied to specific role
                    commission_plan_id: null,
                    commission_type: 'percentage',
                    commission_rate: rate,
                    flat_amount: null,
                    calculated_amount: teamLeadAmount,
                    base_amount: baseAmount,
                    paid_when: paidWhen,
                    notes: commissionNote,
                    ...(currentUserId && { created_by: currentUserId }),
                  } as any)
                }
              }
            }
          }
        } else {
          console.log('   ℹ️  Sales rep is not on a team (no Team Lead override)')
        }
      }
    } // End skipCancelOthers check

    // If unassigning (userId is null), cancel existing pending commissions
    if (!userId) {
      const { data: existingCommissions } = await supabase
        .from('lead_commissions')
        .select('id, status')
        .eq('lead_id', leadId)
        .eq('company_id', companyId)
        .in('status', ['pending', 'approved'])
        .is('deleted_at', null)

      if (existingCommissions && existingCommissions.length > 0) {
        for (const commission of existingCommissions) {
          await updateLeadCommission(commission.id, companyId, {
            status: 'cancelled',
            notes: 'Lead unassigned - commission cancelled',
          })
        }
      }

      return { success: true, message: 'Existing commissions cancelled' }
    }

    // Get the assigned user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', userId)
      .eq('company_id', companyId)
      .single()

    if (userError || !userData) {
      console.error('Error fetching user:', userError)
      return { success: false, message: 'User not found' }
    }

    // Get commission configuration for this user and assignment role
    const commConfig = await getUserCommissionConfig(userId, companyId, leadData?.location_id || null, assignmentField)
    
    if (!commConfig || commConfig.source === 'none') {
      console.log(`User has no commission configuration for ${assignmentField}, skipping commission creation`)
      return { success: true, message: 'No commission configured for this role' }
    }
    
    console.log(`💰 Commission config (source: ${commConfig.source}):`, {
      type: commConfig.commissionType,
      rate: commConfig.commissionRate,
      flat: commConfig.flatAmount,
      paidWhen: commConfig.paidWhen
    })

    // Get invoice total for this lead (includes quote + change orders automatically)
    // This is the single source of truth for commission calculations
    let baseAmount = 0
    
    const { data: invoice } = await supabase
      .from('customer_invoices')
      .select('total, subtotal, tax_amount, status')
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const invoiceTotal = invoice ? Number(invoice.total) || 0 : 0

    // Get total base_amount already commissioned for this user on this lead
    const { data: existingCommissions } = await supabase
      .from('lead_commissions')
      .select('base_amount')
      .eq('lead_id', leadId)
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    const totalAlreadyCommissioned = existingCommissions?.reduce((sum, c) => sum + (Number(c.base_amount) || 0), 0) || 0

    // Calculate base amount (always use revenue for simplicity with role-based commissions)
    // Role-based commissions default to revenue calculation
    const fullBaseAmount = invoiceTotal

    // Calculate the delta - amount not yet commissioned
    baseAmount = Math.max(0, fullBaseAmount - totalAlreadyCommissioned)

    // If still no base amount, create with $0 (can be updated when invoice is created)
    if (baseAmount === 0) {
      console.log('No invoice or financial data found - commission will be created with $0 base')
    }

    // Calculate commission based on config type
    let calculatedAmount = 0
    const commissionType = commConfig.commissionType || 'percentage'
    const commissionRate = commConfig.commissionRate
    const flatAmount = commConfig.flatAmount

    if (commConfig.commissionType === 'percentage') {
      calculatedAmount = baseAmount * ((commConfig.commissionRate || 0) / 100)
    } else if (commConfig.commissionType === 'flat_amount') {
      calculatedAmount = commConfig.flatAmount || 0
    } else {
      // Fallback: $0 commission
      calculatedAmount = 0
    }
    
    console.log(`💵 Calculated commission: $${calculatedAmount.toFixed(2)} (base: $${baseAmount.toFixed(2)})`)

    // Cancel any existing pending commissions for OTHER users (unless skipCancelOthers=true)
    const { data: allCommissions } = await supabase
      .from('lead_commissions')
      .select('id, user_id, status')
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (!skipCancelOthers && allCommissions && allCommissions.length > 0) {
      for (const commission of allCommissions) {
        // Cancel commissions for other users
        if (commission.user_id !== userId && 
            (commission.status === 'pending' || commission.status === 'approved')) {
          await updateLeadCommission(commission.id, companyId, {
            status: 'cancelled',
            notes: 'Lead reassigned to different user',
          })
        }
      }
    }

    // Check if THIS user already has a commission for THIS ROLE on this lead
    // CRITICAL: Must check assignment_field to support multiple roles per user
    const { data: roleCommissions } = await supabase
      .from('lead_commissions')
      .select('*')
      .eq('lead_id', leadId)
      .eq('user_id', userId)
      .eq('assignment_field', assignmentField)
      .is('deleted_at', null)

    const existingUserCommission = roleCommissions?.find(
      c => c.status !== 'cancelled' && c.status !== 'paid'
    )

    if (existingUserCommission) {
      // Get current commission details to add the delta
      const { data: currentCommission } = await supabase
        .from('lead_commissions')
        .select('base_amount, calculated_amount')
        .eq('id', existingUserCommission.id)
        .single()

      const currentBaseAmount = Number(currentCommission?.base_amount) || 0
      const newBaseAmount = currentBaseAmount + baseAmount
      const newCalculatedAmount = commissionType === 'percentage' 
        ? newBaseAmount * ((commissionRate || 0) / 100)
        : (flatAmount || 0)

      // Update existing commission by adding the delta
      const updateData: any = {
        calculated_amount: newCalculatedAmount,
        base_amount: newBaseAmount,
        commission_type: commissionType,
        commission_rate: commissionRate,
        flat_amount: flatAmount,
        paid_when: mapPlanPaidWhenToLeadCommissionPaidWhen(commConfig.paidWhen),
        notes: `Auto-updated: Added $${baseAmount.toFixed(2)} delta. New base: $${newBaseAmount.toFixed(2)}, Commission: $${newCalculatedAmount.toFixed(2)} (${assignmentField.replace('_id', '')})`,
      }

      const updateResult = await updateLeadCommission(existingUserCommission.id, companyId, updateData)

      if (updateResult.error) {
        console.error('Error updating commission:', updateResult.error)
        return { success: false, message: 'Error updating commission' }
      }

      return { success: true, message: `Commission updated: $${newCalculatedAmount.toFixed(2)}` }
    }

    // Create new commission
    const commissionData = {
      lead_id: leadId,
      user_id: userId,
      assignment_field: assignmentField, // CRITICAL: Store which role this commission is for
      commission_plan_id: null, // No longer using commission plans for role-based commissions
      commission_type: commissionType,
      commission_rate: commissionRate,
      flat_amount: flatAmount,
      calculated_amount: calculatedAmount,
      base_amount: baseAmount,
      paid_when: mapPlanPaidWhenToLeadCommissionPaidWhen(commConfig.paidWhen),
      notes: `Auto-created: Base $${baseAmount.toFixed(2)}, Commission: $${calculatedAmount.toFixed(2)} (${assignmentField.replace('_id', '')} role)`,
      ...(currentUserId && { created_by: currentUserId }),
    }

    const result = await createLeadCommission(leadId, companyId, commissionData)

    if (result.error) {
      console.error('Error creating commission:', result.error)
      return { success: false, message: result.error.message || 'Error creating commission' }
    }

    return { success: true, message: `Commission created: $${calculatedAmount.toFixed(2)}` }
  } catch (error) {
    console.error('Error in autoCreateCommission:', error)
    return { success: false, message: 'Unexpected error' }
  }
}

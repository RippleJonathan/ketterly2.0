import { createClient } from '@/lib/supabase/client'

/**
 * Dashboard Analytics API
 * 
 * Provides aggregated metrics and insights for role-specific dashboards
 */

export interface DashboardStats {
  // Lead Metrics
  totalLeads: number
  newLeadsToday: number
  newLeadsThisWeek: number
  activeLeads: number
  
  // Quote/Estimate Metrics
  totalQuotes: number
  pendingQuotes: number
  quotesThisWeek: number
  quoteWinRate: number
  
  // Financial Metrics
  totalRevenue: number
  revenueThisMonth: number
  outstandingInvoices: number
  overdueInvoices: number
  totalOutstandingAmount: number
  
  // Production Metrics
  activeProjects: number
  scheduledThisWeek: number
  completedThisMonth: number
  
  // Commission Metrics (for sales/marketing)
  myCommissionsThisMonth: number
  myCommissionsTotal: number
  myLeadsThisMonth: number
  
  // Urgency Indicators
  overdueFollowUps: number
  unsignedQuotesOlderThan7Days: number
  invoicesOverdue30Plus: number
}

export interface PipelineMetrics {
  stage: string
  count: number
  value: number
  color: string
}

export interface RevenueByMonth {
  month: string
  revenue: number
  invoices: number
}

export interface UpcomingEvent {
  id: string
  title: string
  type: string
  start_time: string
  lead_name?: string
  lead_address?: string
}

export interface RecentActivity {
  id: string
  type: 'lead_created' | 'quote_sent' | 'quote_signed' | 'invoice_paid' | 'payment_received'
  title: string
  description: string
  timestamp: string
  user_name?: string
  amount?: number
}

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats(
  companyId: string,
  userId?: string
): Promise<DashboardStats> {
  const supabase = createClient()
  const today = new Date()
  const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay())).toISOString()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  // Lead Metrics
  const { data: leads } = await supabase
    .from('leads')
    .select('id, created_at, status, sub_status')
    .eq('company_id', companyId)
    .is('deleted_at', null)

  const totalLeads = leads?.length || 0
  const newLeadsToday = leads?.filter(l => l.created_at >= startOfToday).length || 0
  const newLeadsThisWeek = leads?.filter(l => l.created_at >= startOfWeek).length || 0
  const activeLeads = leads?.filter(l => 
    l.status !== 'CLOSED' && l.sub_status !== 'LOST'
  ).length || 0

  // Quote/Estimate Metrics
  const { data: quotes } = await supabase
    .from('estimates')
    .select('id, created_at, status, total')
    .eq('company_id', companyId)
    .is('deleted_at', null)

  const totalQuotes = quotes?.length || 0
  const quotesThisWeek = quotes?.filter(q => q.created_at >= startOfWeek).length || 0
  const pendingQuotes = quotes?.filter(q => q.status === 'pending' || q.status === 'sent').length || 0
  const approvedQuotes = quotes?.filter(q => q.status === 'approved').length || 0
  const quoteWinRate = totalQuotes > 0 ? (approvedQuotes / totalQuotes) * 100 : 0

  // Financial Metrics
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, status, total, balance_due, due_date')
    .eq('company_id', companyId)
    .is('deleted_at', null)

  const totalRevenue = invoices
    ?.filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0) || 0

  const { data: invoicesThisMonth } = await supabase
    .from('invoices')
    .select('total')
    .eq('company_id', companyId)
    .eq('status', 'paid')
    .gte('created_at', startOfMonth)
    .is('deleted_at', null)

  const revenueThisMonth = invoicesThisMonth?.reduce((sum, i) => sum + (i.total || 0), 0) || 0

  const outstandingInvoices = invoices?.filter(i => 
    i.status === 'sent' || i.status === 'overdue'
  ).length || 0

  const overdueInvoices = invoices?.filter(i => i.status === 'overdue').length || 0
  
  const totalOutstandingAmount = invoices
    ?.filter(i => i.status !== 'paid' && i.status !== 'draft')
    .reduce((sum, i) => sum + (i.balance_due || 0), 0) || 0

  // Production Metrics
  const { data: projects } = await supabase
    .from('leads')
    .select('id, status, sub_status')
    .eq('company_id', companyId)
    .eq('status', 'PRODUCTION')
    .is('deleted_at', null)

  const activeProjects = projects?.length || 0

  const { data: scheduledEvents } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('company_id', companyId)
    .in('type', ['production_materials', 'production_labor'])
    .gte('start_time', startOfWeek)
    .is('deleted_at', null)

  const scheduledThisWeek = scheduledEvents?.length || 0

  const completedThisMonth = projects?.filter(p => 
    p.sub_status === 'COMPLETED'
  ).length || 0

  // Commission Metrics (user-specific)
  let myCommissionsThisMonth = 0
  let myCommissionsTotal = 0
  let myLeadsThisMonth = 0

  if (userId) {
    const { data: commissions } = await supabase
      .from('lead_commissions')
      .select('commission_amount')
      .eq('company_id', companyId)
      .eq('user_id', userId)

    myCommissionsTotal = commissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0

    const { data: commissionsThisMonth } = await supabase
      .from('lead_commissions')
      .select('commission_amount')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .gte('created_at', startOfMonth)

    myCommissionsThisMonth = commissionsThisMonth?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0

    const { data: myLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('company_id', companyId)
      .eq('assigned_to', userId)
      .gte('created_at', startOfMonth)
      .is('deleted_at', null)

    myLeadsThisMonth = myLeads?.length || 0
  }

  // Urgency Indicators
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: oldUnsignedQuotes } = await supabase
    .from('estimates')
    .select('id')
    .eq('company_id', companyId)
    .in('status', ['pending', 'sent'])
    .lte('created_at', sevenDaysAgo.toISOString())
    .is('deleted_at', null)

  const unsignedQuotesOlderThan7Days = oldUnsignedQuotes?.length || 0

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: oldOverdueInvoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'overdue')
    .lte('due_date', thirtyDaysAgo.toISOString())
    .is('deleted_at', null)

  const invoicesOverdue30Plus = oldOverdueInvoices?.length || 0

  // Note: overdueFollowUps would require activities table implementation
  const overdueFollowUps = 0

  return {
    totalLeads,
    newLeadsToday,
    newLeadsThisWeek,
    activeLeads,
    totalQuotes,
    pendingQuotes,
    quotesThisWeek,
    quoteWinRate,
    totalRevenue,
    revenueThisMonth,
    outstandingInvoices,
    overdueInvoices,
    totalOutstandingAmount,
    activeProjects,
    scheduledThisWeek,
    completedThisMonth,
    myCommissionsThisMonth,
    myCommissionsTotal,
    myLeadsThisMonth,
    overdueFollowUps,
    unsignedQuotesOlderThan7Days,
    invoicesOverdue30Plus,
  }
}

/**
 * Get sales pipeline metrics by stage
 */
export async function getPipelineMetrics(companyId: string): Promise<PipelineMetrics[]> {
  const supabase = createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      id,
      status,
      sub_status,
      estimates (total)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null)

  if (!leads) return []

  // Group by main status
  const pipeline: Record<string, { count: number; value: number; color: string }> = {
    NEW_LEAD: { count: 0, value: 0, color: '#3b82f6' },
    QUOTE: { count: 0, value: 0, color: '#8b5cf6' },
    PRODUCTION: { count: 0, value: 0, color: '#f59e0b' },
    INVOICED: { count: 0, value: 0, color: '#10b981' },
  }

  leads.forEach((lead: any) => {
    const stage = lead.status
    if (pipeline[stage]) {
      pipeline[stage].count++
      // Sum estimate totals
      const estimateTotal = lead.estimates?.[0]?.total || 0
      pipeline[stage].value += estimateTotal
    }
  })

  return Object.entries(pipeline).map(([stage, data]) => ({
    stage: stage.replace('_', ' '),
    count: data.count,
    value: data.value,
    color: data.color,
  }))
}

/**
 * Get revenue by month for the last 6 months
 */
export async function getRevenueByMonth(companyId: string): Promise<RevenueByMonth[]> {
  const supabase = createClient()
  const months: RevenueByMonth[] = []

  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const { data: invoices } = await supabase
      .from('invoices')
      .select('total')
      .eq('company_id', companyId)
      .eq('status', 'paid')
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)
      .is('deleted_at', null)

    const revenue = invoices?.reduce((sum, i) => sum + (i.total || 0), 0) || 0

    months.push({
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      revenue,
      invoices: invoices?.length || 0,
    })
  }

  return months
}

/**
 * Get upcoming events for today and next 7 days
 */
export async function getUpcomingEvents(
  companyId: string,
  userId?: string,
  limit = 5
): Promise<UpcomingEvent[]> {
  const supabase = createClient()
  const now = new Date().toISOString()
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  let query = supabase
    .from('calendar_events')
    .select(`
      id,
      title,
      type,
      start_time,
      leads (
        full_name,
        address
      )
    `)
    .eq('company_id', companyId)
    .gte('start_time', now)
    .lte('start_time', nextWeek.toISOString())
    .is('deleted_at', null)
    .order('start_time', { ascending: true })
    .limit(limit)

  // If userId provided, filter to user's events
  if (userId) {
    const { data: assignments } = await supabase
      .from('calendar_event_assignments')
      .select('event_id')
      .eq('user_id', userId)

    if (assignments && assignments.length > 0) {
      const eventIds = assignments.map(a => a.event_id)
      query = query.in('id', eventIds)
    }
  }

  const { data: events } = await query

  if (!events) return []

  return events.map((event: any) => ({
    id: event.id,
    title: event.title,
    type: event.type,
    start_time: event.start_time,
    lead_name: event.leads?.full_name,
    lead_address: event.leads?.address,
  }))
}

/**
 * Get recent activity feed
 */
export async function getRecentActivity(
  companyId: string,
  limit = 10
): Promise<RecentActivity[]> {
  const supabase = createClient()
  const activities: RecentActivity[] = []

  // Get recent leads
  const { data: recentLeads } = await supabase
    .from('leads')
    .select('id, full_name, created_at')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(3)

  recentLeads?.forEach(lead => {
    activities.push({
      id: lead.id,
      type: 'lead_created',
      title: 'New lead created',
      description: lead.full_name,
      timestamp: lead.created_at,
    })
  })

  // Get recent quotes
  const { data: recentQuotes } = await supabase
    .from('estimates')
    .select(`
      id,
      created_at,
      status,
      leads (full_name)
    `)
    .eq('company_id', companyId)
    .eq('status', 'sent')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(3)

  recentQuotes?.forEach((quote: any) => {
    activities.push({
      id: quote.id,
      type: 'quote_sent',
      title: 'Quote sent',
      description: quote.leads?.full_name || 'Unknown customer',
      timestamp: quote.created_at,
    })
  })

  // Get recent payments
  const { data: recentPayments } = await supabase
    .from('invoice_payments')
    .select(`
      id,
      amount,
      created_at,
      invoices (
        leads (full_name)
      )
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(3)

  recentPayments?.forEach((payment: any) => {
    activities.push({
      id: payment.id,
      type: 'payment_received',
      title: 'Payment received',
      description: payment.invoices?.leads?.full_name || 'Unknown customer',
      timestamp: payment.created_at,
      amount: payment.amount,
    })
  })

  // Sort all activities by timestamp and limit
  activities.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return activities.slice(0, limit)
}

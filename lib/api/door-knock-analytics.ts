import { createClient } from '@/lib/supabase/client';

export interface DoorKnockUserStats {
  user_id: string;
  user_name: string;
  total_pins: number;
  leads_created: number;
  signed_contracts: number;
  total_revenue: number;
}

export interface DoorKnockAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  locationId?: string;
}

/**
 * Get door knocking analytics by user
 */
export async function getDoorKnockAnalytics(
  companyId: string,
  filters: DoorKnockAnalyticsFilters = {}
) {
  console.log('[Analytics] Starting with filters:', filters);
  const supabase = createClient();
  try {
    const { startDate, endDate, userId, locationId } = filters;

    // Build the query for door knock pins
    let pinsQuery = supabase
      .from('door_knock_pins')
      .select(`
        id,
        pin_type,
        created_by,
        created_at,
        users!door_knock_pins_created_by_fkey (
          id,
          full_name
        )
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (startDate) {
      pinsQuery = pinsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      pinsQuery = pinsQuery.lte('created_at', endDate);
    }
    if (userId) {
      pinsQuery = pinsQuery.eq('created_by', userId);
    }
    // Note: location filtering done via userId (users have locations)

    const { data: pins, error: pinsError } = await pinsQuery;
    if (pinsError) {
      console.error('[Analytics] Pins query error:', pinsError);
      throw pinsError;
    }

    console.log('[Analytics] Pins fetched:', pins?.length || 0, pins);

    // Build the query for leads from door knocking (just count leads)
    let leadsQuery = supabase
      .from('leads')
      .select(`
        id,
        marketing_rep_id,
        created_at,
        location_id
      `)
      .eq('company_id', companyId)
      .eq('source', 'door_knocking')
      .is('deleted_at', null);

    if (startDate) {
      leadsQuery = leadsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      leadsQuery = leadsQuery.lte('created_at', endDate);
    }
    if (userId) {
      leadsQuery = leadsQuery.eq('marketing_rep_id', userId);
    }
    if (locationId) {
      leadsQuery = leadsQuery.eq('location_id', locationId);
    }

    const { data: leads, error: leadsError } = await leadsQuery;
    if (leadsError) {
      console.error('[Analytics] Leads query error:', leadsError);
      throw leadsError;
    }

    console.log('[Analytics] Leads fetched:', leads?.length || 0, leads);

    // Get invoices for door knocking leads (like leaderboard)
    let invoicesQuery = supabase
      .from('customer_invoices')
      .select(`
        id,
        total,
        created_at,
        lead_id,
        leads!inner (
          marketing_rep_id,
          source
        )
      `)
      .eq('company_id', companyId)
      .eq('leads.source', 'door_knocking')
      .is('deleted_at', null);

    if (startDate) {
      invoicesQuery = invoicesQuery.gte('created_at', startDate);
    }
    if (endDate) {
      invoicesQuery = invoicesQuery.lte('created_at', endDate);
    }
    if (userId) {
      invoicesQuery = invoicesQuery.eq('leads.marketing_rep_id', userId);
    }

    const { data: invoices, error: invoicesError } = await invoicesQuery;
    if (invoicesError) {
      console.error('[Analytics] Invoices query error:', invoicesError);
      throw invoicesError;
    }

    console.log('[Analytics] Invoices fetched:', invoices?.length || 0, invoices);

    // Aggregate stats by user
    const userStatsMap = new Map<string, DoorKnockUserStats>();

    // Process pins
    pins?.forEach((pin: any) => {
      const userId = pin.created_by;
      const userName = (pin.users as any)?.full_name || 'Unknown User';

      if (!userStatsMap.has(userId)) {
        userStatsMap.set(userId, {
          user_id: userId,
          user_name: userName,
          total_pins: 0,
          leads_created: 0,
          signed_contracts: 0,
          total_revenue: 0,
        });
      }

      const stats = userStatsMap.get(userId)!;
      stats.total_pins++;
    });

    // Process leads (just count them) - track by marketing_rep_id only
    leads?.forEach((lead: any) => {
      const userId = lead.marketing_rep_id;
      if (!userId) return;

      const stats = userStatsMap.get(userId);
      if (stats) {
        stats.leads_created++;
      }
    });

    // Process invoices for contracts and revenue (like leaderboard)
    // Track by marketing_rep_id only (the person who did the door knocking)
    invoices?.forEach((invoice: any) => {
      const userId = invoice.leads?.marketing_rep_id;
      if (!userId) return;

      const stats = userStatsMap.get(userId);
      if (stats) {
        stats.signed_contracts += 1;
        stats.total_revenue += invoice.total || 0;
      }
    });

    // Convert map to array and sort by total revenue
    const userStats = Array.from(userStatsMap.values()).sort(
      (a, b) => b.total_revenue - a.total_revenue
    );

    // Calculate totals
    const totals = {
      total_pins: userStats.reduce((sum, s) => sum + s.total_pins, 0),
      leads_created: userStats.reduce((sum, s) => sum + s.leads_created, 0),
      signed_contracts: userStats.reduce((sum, s) => sum + s.signed_contracts, 0),
      total_revenue: userStats.reduce((sum, s) => sum + s.total_revenue, 0),
    };

    console.log('[Analytics] Final user stats:', userStats.length, 'users');
    console.log('[Analytics] Totals:', totals);

    return {
      data: userStats,
      totals,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching door knock analytics:', error);
    return {
      data: null,
      totals: null,
      error: error instanceof Error ? error.message : 'Failed to fetch analytics',
    };
  }
}

/**
 * Get door knocking activity over time (for charts)
 */
export async function getDoorKnockActivity(
  companyId: string,
  filters: DoorKnockAnalyticsFilters = {}
) {
  const supabase = createClient();
  try {
    const { startDate, endDate, userId } = filters;

    let query = supabase
      .from('door_knock_pins')
      .select('created_at, pin_type')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (userId) {
      query = query.eq('created_by', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching door knock activity:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch activity',
    };
  }
}

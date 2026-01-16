import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface DoorKnockUserStats {
  user_id: string;
  user_name: string;
  total_pins: number;
  appointment_pins: number;
  appointment_rate: number;
  leads_created: number;
  signed_contracts: number;
  total_revenue: number;
}

export interface DoorKnockAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
}

/**
 * Get door knocking analytics by user
 */
export async function getDoorKnockAnalytics(
  companyId: string,
  filters: DoorKnockAnalyticsFilters = {}
) {
  try {
    const { startDate, endDate, userId } = filters;

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

    const { data: pins, error: pinsError } = await pinsQuery;
    if (pinsError) throw pinsError;

    // Build the query for leads from door knocking
    let leadsQuery = supabase
      .from('leads')
      .select(`
        id,
        sales_rep_id,
        created_at,
        quotes (
          id,
          status,
          total_price
        )
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
      leadsQuery = leadsQuery.eq('sales_rep_id', userId);
    }

    const { data: leads, error: leadsError } = await leadsQuery;
    if (leadsError) throw leadsError;

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
          appointment_pins: 0,
          appointment_rate: 0,
          leads_created: 0,
          signed_contracts: 0,
          total_revenue: 0,
        });
      }

      const stats = userStatsMap.get(userId)!;
      stats.total_pins++;
      
      if (pin.pin_type === 'appointment_set') {
        stats.appointment_pins++;
      }
    });

    // Process leads and quotes
    leads?.forEach((lead: any) => {
      const userId = lead.sales_rep_id;
      if (!userId) return;

      const stats = userStatsMap.get(userId);
      if (stats) {
        stats.leads_created++;

        // Check for signed contracts
        const signedQuotes = (lead.quotes || []).filter((q: any) => 
          q.status === 'signed' || q.status === 'approved'
        );

        stats.signed_contracts += signedQuotes.length;
        stats.total_revenue += signedQuotes.reduce((sum: number, q: any) => 
          sum + (parseFloat(q.total_price) || 0), 0
        );
      }
    });

    // Calculate appointment rates
    userStatsMap.forEach((stats) => {
      if (stats.total_pins > 0) {
        stats.appointment_rate = (stats.appointment_pins / stats.total_pins) * 100;
      }
    });

    // Convert map to array and sort by total revenue
    const userStats = Array.from(userStatsMap.values()).sort(
      (a, b) => b.total_revenue - a.total_revenue
    );

    // Calculate totals
    const totals = {
      total_pins: userStats.reduce((sum, s) => sum + s.total_pins, 0),
      appointment_pins: userStats.reduce((sum, s) => sum + s.appointment_pins, 0),
      appointment_rate: 0,
      leads_created: userStats.reduce((sum, s) => sum + s.leads_created, 0),
      signed_contracts: userStats.reduce((sum, s) => sum + s.signed_contracts, 0),
      total_revenue: userStats.reduce((sum, s) => sum + s.total_revenue, 0),
    };

    if (totals.total_pins > 0) {
      totals.appointment_rate = (totals.appointment_pins / totals.total_pins) * 100;
    }

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

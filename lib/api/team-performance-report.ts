import { createClient } from '@/lib/supabase/client';

export interface TeamMemberPerformance {
  userId: string;
  userName: string;
  role: string;
  location: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalRevenue: number;
  averageDealSize: number;
  totalCommissions: number;
  quotesCreated: number;
  averageResponseTime: number;
}

export interface TeamPerformanceData {
  topPerformers: TeamMemberPerformance[];
  teamAverages: {
    conversionRate: number;
    averageDealSize: number;
    averageResponseTime: number;
  };
  totalTeamRevenue: number;
  totalTeamCommissions: number;
}

export interface TeamPerformanceFilters {
  startDate?: string;
  endDate?: string;
  locationId?: string;
  role?: string;
}

export async function getTeamPerformanceData(
  companyId: string,
  filters: TeamPerformanceFilters = {}
): Promise<TeamPerformanceData> {
  const supabase = createClient();
  const { startDate, endDate, locationId, role } = filters;

  let usersQuery = supabase
    .from('users')
    .select(`
      id,
      full_name,
      role,
      location_id,
      locations (name)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (locationId) usersQuery = usersQuery.eq('location_id', locationId);
  if (role) usersQuery = usersQuery.eq('role', role);

  const { data: users, error: usersError } = await usersQuery;

  if (usersError || !users || users.length === 0) {
    console.error('Error fetching users:', usersError);
    return {
      topPerformers: [],
      teamAverages: {
        conversionRate: 0,
        averageDealSize: 0,
        averageResponseTime: 0,
      },
      totalTeamRevenue: 0,
      totalTeamCommissions: 0,
    };
  }

  const performanceData: TeamMemberPerformance[] = [];

  for (const user of users) {
    let leadsQuery = supabase
      .from('leads')
      .select(`
        id,
        status,
        created_at,
        quotes (
          id,
          total_price,
          created_at
        )
      `)
      .eq('company_id', companyId)
      .eq('assigned_to', user.id)
      .is('deleted_at', null);

    if (startDate) leadsQuery = leadsQuery.gte('created_at', startDate);
    if (endDate) leadsQuery = leadsQuery.lte('created_at', endDate);

    const { data: leads } = await leadsQuery;

    let commissionsQuery = supabase
      .from('lead_commissions')
      .select('total_commission')
      .eq('user_id', user.id);

    if (startDate) commissionsQuery = commissionsQuery.gte('created_at', startDate);
    if (endDate) commissionsQuery = commissionsQuery.lte('created_at', endDate);

    const { data: commissions } = await commissionsQuery;

    const totalLeads = leads?.length || 0;
    const convertedLeads = leads?.filter(l => l.status === 'CLOSED' || l.status === 'PRODUCTION').length || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const quotesCreated = leads?.reduce((sum, lead) => sum + ((lead.quotes as any)?.length || 0), 0) || 0;
    
    const totalRevenue = leads?.reduce((sum, lead) => {
      const quotes = (lead.quotes as any) || [];
      return sum + quotes.reduce((qSum: number, q: any) => qSum + (q.total_price || 0), 0);
    }, 0) || 0;

    const averageDealSize = convertedLeads > 0 ? totalRevenue / convertedLeads : 0;

    const totalCommissions = commissions?.reduce((sum, c) => sum + (c.total_commission || 0), 0) || 0;

    let totalResponseTime = 0;
    let responseCount = 0;

    leads?.forEach(lead => {
      const leadCreated = new Date(lead.created_at);
      const quotes = (lead.quotes as any) || [];
      
      if (quotes.length > 0) {
        const firstQuote = quotes.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[0];
        
        const quoteCreated = new Date(firstQuote.created_at);
        const hours = (quoteCreated.getTime() - leadCreated.getTime()) / (1000 * 60 * 60);
        
        totalResponseTime += hours;
        responseCount++;
      }
    });

    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    performanceData.push({
      userId: user.id,
      userName: user.full_name,
      role: user.role,
      location: (user.locations as any)?.name || 'Unknown',
      totalLeads,
      convertedLeads,
      conversionRate,
      totalRevenue,
      averageDealSize,
      totalCommissions,
      quotesCreated,
      averageResponseTime,
    });
  }

  performanceData.sort((a, b) => b.totalRevenue - a.totalRevenue);

  const teamAverages = {
    conversionRate: performanceData.reduce((sum, p) => sum + p.conversionRate, 0) / (performanceData.length || 1),
    averageDealSize: performanceData.reduce((sum, p) => sum + p.averageDealSize, 0) / (performanceData.length || 1),
    averageResponseTime: performanceData.reduce((sum, p) => sum + p.averageResponseTime, 0) / (performanceData.length || 1),
  };

  const totalTeamRevenue = performanceData.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalTeamCommissions = performanceData.reduce((sum, p) => sum + p.totalCommissions, 0);

  return {
    topPerformers: performanceData,
    teamAverages,
    totalTeamRevenue,
    totalTeamCommissions,
  };
}

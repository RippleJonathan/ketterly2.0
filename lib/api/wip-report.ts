import { createClient } from '@/lib/supabase/client';

export interface WIPProject {
  id: string;
  lead_id: string;
  customer_name: string;
  address: string;
  sub_status: string;
  start_date: string;
  days_in_production: number;
  total_value: number;
  material_costs: number;
  assigned_crew: string | null;
  completion_percentage: number;
}

export interface WIPData {
  totalProjects: number;
  averageDaysInProduction: number;
  totalValue: number;
  totalMaterialCosts: number;
  projectsByStage: {
    stage: string;
    count: number;
    totalValue: number;
    avgDays: number;
  }[];
  projects: WIPProject[];
}

export interface WIPFilters {
  locationId?: string;
  subStatus?: string;
}

export async function getWorkInProgressData(
  companyId: string,
  filters: WIPFilters = {}
): Promise<WIPData> {
  const supabase = createClient();
  const { locationId, subStatus } = filters;

  let query = supabase
    .from('leads')
    .select(`
      id,
      full_name,
      address,
      city,
      state,
      status,
      sub_status,
      location_id,
      created_at,
      quotes (
        id,
        total_price,
        material_cost,
        status,
        updated_at
      )
    `)
    .eq('company_id', companyId)
    .eq('status', 'production')
    .is('deleted_at', null);

  if (locationId) query = query.eq('location_id', locationId);
  if (subStatus) query = query.eq('sub_status', subStatus);

  const { data: leadsData, error } = await query;

  if (error) {
    console.error('Error fetching WIP data:', error);
    return {
      totalProjects: 0,
      averageDaysInProduction: 0,
      totalValue: 0,
      totalMaterialCosts: 0,
      projectsByStage: [],
      projects: [],
    };
  }

  // Filter for leads with accepted quotes
  const leads = leadsData?.filter((lead: any) => {
    const quotes = lead.quotes || [];
    return quotes.some((quote: any) => quote.status === 'accepted');
  }) || [];

  if (error) {
    console.error('Error fetching WIP data:', error);
    return {
      totalProjects: 0,
      averageDaysInProduction: 0,
      totalValue: 0,
      totalMaterialCosts: 0,
      projectsByStage: [],
      projects: [],
    };
  }

  const completionPercentages: Record<string, number> = {
    'contract_signed': 10,
    'scheduled': 20,
    'materials_ordered': 30,
    'in_progress': 60,
    'completed': 90,
    'inspection_needed': 85,
    'inspection_passed': 95,
  };

  const today = new Date();
  const projects: WIPProject[] = leads?.map(lead => {
    const quote = (lead.quotes as any)?.[0];
    const totalValue = quote?.total_price || 0;
    const materialCosts = quote?.material_cost || 0;
    
    // Use quote updated_at as production start (when quote was accepted)
    const startDate = new Date(quote?.updated_at || lead.created_at || new Date());
    const daysInProduction = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const completion = completionPercentages[lead.sub_status || ''] || 5;

    return {
      id: lead.id,
      lead_id: lead.id,
      customer_name: lead.full_name,
      address: `${lead.address || ''}, ${lead.city || ''}, ${lead.state || ''}`,
      sub_status: lead.sub_status || 'Unknown',
      start_date: quote?.updated_at || lead.created_at || '',
      days_in_production: daysInProduction,
      total_value: totalValue,
      material_costs: materialCosts,
      assigned_crew: null,
      completion_percentage: completion,
    };
  }) || [];

  const totalProjects = projects.length;
  const averageDaysInProduction = totalProjects > 0
    ? projects.reduce((sum, p) => sum + p.days_in_production, 0) / totalProjects
    : 0;
  const totalValue = projects.reduce((sum, p) => sum + p.total_value, 0);
  const totalMaterialCosts = projects.reduce((sum, p) => sum + p.material_costs, 0);

  const stageMap: Record<string, { count: number; totalValue: number; totalDays: number }> = {};
  
  projects.forEach(project => {
    if (!stageMap[project.sub_status]) {
      stageMap[project.sub_status] = { count: 0, totalValue: 0, totalDays: 0 };
    }
    stageMap[project.sub_status].count++;
    stageMap[project.sub_status].totalValue += project.total_value;
    stageMap[project.sub_status].totalDays += project.days_in_production;
  });

  const projectsByStage = Object.entries(stageMap).map(([stage, data]) => ({
    stage,
    count: data.count,
    totalValue: data.totalValue,
    avgDays: data.count > 0 ? data.totalDays / data.count : 0,
  })).sort((a, b) => b.count - a.count);

  return {
    totalProjects,
    averageDaysInProduction: Math.round(averageDaysInProduction),
    totalValue,
    totalMaterialCosts,
    projectsByStage,
    projects: projects.slice(0, 50),
  };
}

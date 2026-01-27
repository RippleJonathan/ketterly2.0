import { createClient } from '@/lib/supabase/client';

export interface PipelineStageData {
  stage: string;
  status: string;
  count: number;
  totalValue: number;
  averageValue: number;
  conversionRate: number;
}

export interface SalesPipelineData {
  byStage: PipelineStageData[];
  totalLeads: number;
  totalValue: number;
  overallConversionRate: number;
  averageDealSize: number;
}

export interface SalesPipelineFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  locationId?: string;
}

export async function getSalesPipelineData(
  companyId: string,
  filters: SalesPipelineFilters = {}
): Promise<SalesPipelineData> {
  const supabase = createClient();
  const { startDate, endDate, userId, locationId } = filters;

  let query = supabase
    .from('leads')
    .select(`
      id,
      status,
      sub_status,
      sales_rep_id,
      location_id,
      created_at,
      quotes (
        id,
        total,
        status
      )
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);
  if (userId) query = query.eq('sales_rep_id', userId);
  if (locationId) query = query.eq('location_id', locationId);

  const { data: leads, error } = await query;

  if (error) {
    console.error('Error fetching pipeline data:', error);
    return {
      byStage: [],
      totalLeads: 0,
      totalValue: 0,
      overallConversionRate: 0,
      averageDealSize: 0,
    };
  }

  const stageGroups: Record<string, any[]> = {};
  
  leads?.forEach(lead => {
    const stage = lead.status || 'NEW_LEAD';
    if (!stageGroups[stage]) stageGroups[stage] = [];
    stageGroups[stage].push(lead);
  });

  const byStage: PipelineStageData[] = Object.entries(stageGroups).map(([stage, stageLeads]) => {
    const quotedLeads = stageLeads.filter(l => (l as any).quotes?.length > 0);
    const totalValue = quotedLeads.reduce((sum, l) => {
      const quote = (l as any).quotes?.[0];
      return sum + (quote?.total || 0);
    }, 0);

    return {
      stage,
      status: stage,
      count: stageLeads.length,
      totalValue,
      averageValue: stageLeads.length > 0 ? totalValue / stageLeads.length : 0,
      conversionRate: 0,
    };
  });

  const totalLeads = leads?.length || 0;
  const closedLeads = leads?.filter(l => l.status === 'CLOSED' || l.status === 'INVOICED').length || 0;
  const overallConversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;

  const totalValue = byStage.reduce((sum, stage) => sum + stage.totalValue, 0);
  const averageDealSize = closedLeads > 0 ? totalValue / closedLeads : 0;

  return {
    byStage: byStage.sort((a, b) => {
      const order = ['NEW_LEAD', 'QUOTE', 'PRODUCTION', 'INVOICED', 'CLOSED'];
      return order.indexOf(a.stage) - order.indexOf(b.stage);
    }),
    totalLeads,
    totalValue,
    overallConversionRate,
    averageDealSize,
  };
}

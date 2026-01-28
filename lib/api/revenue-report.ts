import { createClient } from '@/lib/supabase/client';

export interface RevenueCollectionsData {
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  revenueByMonth: { month: string; revenue: number; paid: number; pending: number }[];
  outstandingInvoices: {
    id: string;
    lead_id: string;
    lead_name: string;
    total: number;
    due_date: string | null;
    days_overdue: number;
    status: string;
  }[];
  agingReport: {
    current: number;
    days_30: number;
    days_60: number;
    days_90: number;
    days_90_plus: number;
  };
}

export interface RevenueCollectionsFilters {
  startDate?: string;
  endDate?: string;
  locationId?: string;
}

export async function getRevenueCollectionsData(
  companyId: string,
  filters: RevenueCollectionsFilters = {}
): Promise<RevenueCollectionsData> {
  const supabase = createClient();
  const { startDate, endDate, locationId } = filters;

  let query = supabase
    .from('customer_invoices')
    .select(`
      id,
      lead_id,
      total,
      status,
      due_date,
      created_at,
      leads!inner (
        id,
        full_name,
        location_id
      )
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    // CRITICAL: Only include sent/partial/paid invoices, NOT drafts
    .in('status', ['sent', 'partial', 'paid', 'completed', 'overdue']);

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);
  if (locationId) query = query.eq('leads.location_id', locationId);

  const { data: invoices, error } = await query;

  if (error) {
    console.error('Error fetching revenue data:', error);
    return {
      totalRevenue: 0,
      paidRevenue: 0,
      pendingRevenue: 0,
      overdueRevenue: 0,
      revenueByMonth: [],
      outstandingInvoices: [],
      agingReport: {
        current: 0,
        days_30: 0,
        days_60: 0,
        days_90: 0,
        days_90_plus: 0,
      },
    };
  }

  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
  const paidRevenue = invoices
    ?.filter(inv => inv.status === 'paid' || inv.status === 'completed')
    .reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
  const pendingRevenue = invoices
    ?.filter(inv => inv.status === 'pending' || inv.status === 'sent')
    .reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
  const overdueRevenue = invoices
    ?.filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyData: Record<string, { revenue: number; paid: number; pending: number }> = {};
  
  invoices?.forEach(invoice => {
    const date = new Date(invoice.created_at);
    if (date >= sixMonthsAgo) {
      const monthKey = date.toISOString().substring(0, 7);
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, paid: 0, pending: 0 };
      }
      
      monthlyData[monthKey].revenue += invoice.total || 0;
      
      if (invoice.status === 'paid' || invoice.status === 'completed') {
        monthlyData[monthKey].paid += invoice.total || 0;
      } else {
        monthlyData[monthKey].pending += invoice.total || 0;
      }
    }
  });

  const revenueByMonth = Object.entries(monthlyData)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const today = new Date();
  const outstandingInvoices = invoices
    ?.filter(inv => {
      // Only include sent/partial/overdue invoices (not paid, completed, cancelled, or draft)
      return inv.status === 'sent' || inv.status === 'partial' || inv.status === 'overdue';
    })
    .map(inv => {
      // Handle null/undefined due dates
      if (!inv.due_date) {
        return {
          id: inv.id,
          lead_id: inv.lead_id,
          lead_name: (inv.leads as any)?.full_name || 'Unknown',
          total: inv.total || 0,
          due_date: null,
          days_overdue: 0,
          status: inv.status,
        };
      }

      const dueDate = new Date(inv.due_date);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: inv.id,
        lead_id: inv.lead_id,
        lead_name: (inv.leads as any)?.full_name || 'Unknown',
        total: inv.total || 0,
        due_date: inv.due_date,
        days_overdue: daysOverdue > 0 ? daysOverdue : 0,
        status: inv.status,
      };
    })
    .sort((a, b) => b.days_overdue - a.days_overdue) || [];

  const agingReport = {
    current: 0,
    days_30: 0,
    days_60: 0,
    days_90: 0,
    days_90_plus: 0,
  };

  outstandingInvoices.forEach(inv => {
    if (inv.days_overdue === 0) {
      agingReport.current += inv.total;
    } else if (inv.days_overdue <= 30) {
      agingReport.days_30 += inv.total;
    } else if (inv.days_overdue <= 60) {
      agingReport.days_60 += inv.total;
    } else if (inv.days_overdue <= 90) {
      agingReport.days_90 += inv.total;
    } else {
      agingReport.days_90_plus += inv.total;
    }
  });

  return {
    totalRevenue,
    paidRevenue,
    pendingRevenue,
    overdueRevenue,
    revenueByMonth,
    outstandingInvoices: outstandingInvoices.slice(0, 20),
    agingReport,
  };
}

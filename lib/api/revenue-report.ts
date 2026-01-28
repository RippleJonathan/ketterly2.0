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

  // Fetch invoices with their payments
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
        location_id,
        deleted_at
      ),
      invoice_payments (
        id,
        amount,
        cleared_date,
        status
      )
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .is('leads.deleted_at', null) // Exclude deleted leads
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

  const today = new Date();

  // Calculate totals using ACTUAL payment data
  let totalRevenue = 0;
  let paidRevenue = 0;
  let pendingRevenue = 0;
  let overdueRevenue = 0;

  invoices?.forEach(inv => {
    totalRevenue += inv.total || 0;

    // Calculate actual paid amount from cleared payments
    const clearedPayments = (inv.invoice_payments as any[])?.filter(
      p => p.status === 'cleared' || p.status === 'pending'
    ) || [];
    const paidAmount = clearedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainingBalance = (inv.total || 0) - paidAmount;

    paidRevenue += paidAmount;

    // Determine if overdue based on due date
    const isOverdue = inv.due_date && new Date(inv.due_date) < today && remainingBalance > 0;

    if (isOverdue) {
      overdueRevenue += remainingBalance;
    } else if (remainingBalance > 0) {
      pendingRevenue += remainingBalance;
    }
  });

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
      
      // Calculate paid amount from payments
      const clearedPayments = (invoice.invoice_payments as any[])?.filter(
        p => p.status === 'cleared' || p.status === 'pending'
      ) || [];
      const paidAmount = clearedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remainingBalance = (invoice.total || 0) - paidAmount;

      monthlyData[monthKey].paid += paidAmount;
      monthlyData[monthKey].pending += remainingBalance;
    }
  });

  const revenueByMonth = Object.entries(monthlyData)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const outstandingInvoices = invoices
    ?.map(inv => {
      // Calculate actual paid and remaining balance
      const clearedPayments = (inv.invoice_payments as any[])?.filter(
        p => p.status === 'cleared' || p.status === 'pending'
      ) || [];
      const paidAmount = clearedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remainingBalance = (inv.total || 0) - paidAmount;

      // Only include invoices with remaining balance
      if (remainingBalance <= 0) return null;

      // Handle null/undefined due dates
      if (!inv.due_date) {
        return {
          id: inv.id,
          lead_id: inv.lead_id,
          lead_name: (inv.leads as any)?.full_name || 'Unknown',
          total: remainingBalance,
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
        total: remainingBalance,
        due_date: inv.due_date,
        days_overdue: daysOverdue > 0 ? daysOverdue : 0,
        status: inv.status,
      };
    })
    .filter(Boolean) // Remove nulls
    .sort((a, b) => b!.days_overdue - a!.days_overdue) as any[] || [];

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

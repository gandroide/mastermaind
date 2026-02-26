import { supabase } from '@/lib/supabase';
import type { DashboardMetrics, ClientCardData } from '@/types/database';

/** Build a business_unit_id filter clause */
async function getBuId(buSlug?: string): Promise<string | null> {
  if (!buSlug || buSlug === 'all') return null;
  const { data } = await supabase
    .from('business_units')
    .select('id')
    .eq('slug', buSlug)
    .single();
  return data?.id ?? null;
}

/** Get aggregate dashboard metrics */
export async function getDashboardMetrics(buSlug?: string): Promise<DashboardMetrics> {
  const buId = await getBuId(buSlug);

  // ── Revenue (income) ──
  let incomeQuery = supabase.from('transactions').select('amount').eq('type', 'income');
  if (buId) incomeQuery = incomeQuery.eq('business_unit_id', buId);
  const { data: incomeData } = await incomeQuery;
  const totalRevenue = (incomeData ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

  // ── Expenses (Operating Expenses mainly for dashboard) ──
  // Per user request, totalExpenses on the generic dashboard might want to reflect all expenses, 
  // but if we need to split it, we do it here. For the root dashboard, we just sum up everything, or we can mirror the logic.
  let expenseQuery = supabase.from('transactions').select('amount').eq('type', 'expense');
  if (buId) expenseQuery = expenseQuery.eq('business_unit_id', buId);
  const { data: expenseData } = await expenseQuery;
  const totalExpenses = (expenseData ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

  // ── Client count ──
  let clientQuery = supabase.from('clients').select('id', { count: 'exact', head: true }).eq('is_active', true);
  if (buId) clientQuery = clientQuery.eq('business_unit_id', buId);
  const { count: clientCount } = await clientQuery;

  // ── Contract count ──
  let contractQuery = supabase.from('contracts').select('id', { count: 'exact', head: true });
  if (buId) contractQuery = contractQuery.eq('business_unit_id', buId);
  const { count: contractCount } = await contractQuery;

  // ── Active contracts ──
  let activeContractQuery = supabase.from('contracts').select('id', { count: 'exact', head: true }).in('status', ['active', 'signed']);
  if (buId) activeContractQuery = activeContractQuery.eq('business_unit_id', buId);
  const { count: activeContractCount } = await activeContractQuery;

  // ── Inventory ──
  let invQuery = supabase.from('inventory').select('id', { count: 'exact', head: true }).eq('is_active', true);
  if (buId) invQuery = invQuery.eq('business_unit_id', buId);
  const { count: inventoryCount } = await invQuery;

  // ── Low stock ──
  let lowStockQuery = supabase.from('inventory').select('id, quantity').eq('is_active', true);
  if (buId) lowStockQuery = lowStockQuery.eq('business_unit_id', buId);
  const { data: lowStockData } = await lowStockQuery;
  const lowStockCount = (lowStockData ?? []).filter((item) => Number(item.quantity) <= 5).length;

  return {
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
    clientCount: clientCount ?? 0,
    contractCount: contractCount ?? 0,
    activeContractCount: activeContractCount ?? 0,
    inventoryCount: inventoryCount ?? 0,
    lowStockCount,
  };
}

/** Get client cards with aggregated billing data */
export async function getClientCards(buSlug?: string): Promise<ClientCardData[]> {
  const buId = await getBuId(buSlug);

  // Fetch clients with their BU
  let clientsQuery = supabase
    .from('clients')
    .select('id, name, company, business_unit_id, business_unit:business_units(slug, name, color)')
    .eq('is_active', true)
    .order('name')
    .limit(12); // Top 12 for dashboard cards

  if (buId) clientsQuery = clientsQuery.eq('business_unit_id', buId);
  const { data: clients, error: clientError } = await clientsQuery;
  if (clientError || !clients) return [];

  // For each client, get total billed (income finance records)
  const cards: ClientCardData[] = await Promise.all(
    clients.map(async (client) => {
      // Total billed = sum of income finances linked to this client
      const { data: finances } = await supabase
        .from('finances')
        .select('amount')
        .eq('client_id', client.id)
        .eq('type', 'income');

      const totalBilled = (finances ?? []).reduce((sum, f) => sum + Number(f.amount), 0);

      // Active contracts for this client
      const { count: activeContracts } = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .in('status', ['active', 'signed']);

      // Inventory items (for Bio-Alert context: sensors, etc.)
      const { count: inventoryItems } = await supabase
        .from('inventory')
        .select('id', { count: 'exact', head: true })
        .eq('business_unit_id', client.business_unit_id)
        .eq('is_active', true);

      const bu = client.business_unit as unknown as { slug: string; name: string; color: string };

      return {
        id: client.id,
        name: client.name,
        company: client.company,
        businessUnitSlug: bu?.slug ?? '',
        businessUnitName: bu?.name ?? '',
        businessUnitColor: bu?.color ?? '#a78bfa',
        totalBilled,
        activeContracts: activeContracts ?? 0,
        inventoryItems: inventoryItems ?? 0,
      };
    })
  );

  return cards;
}

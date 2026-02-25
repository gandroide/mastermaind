// ═══════════════════════════════════════════════════════
// BRIVEX MASTERMIND — Database Types
// Mirror of supabase/schema.sql
// ═══════════════════════════════════════════════════════

export interface BusinessUnit {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  business_unit_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields (optional, from queries)
  business_unit?: BusinessUnit;
}

export type ContractStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'active' | 'expired' | 'cancelled';

export interface Contract {
  id: string;
  business_unit_id: string;
  client_id: string | null;
  title: string;
  status: ContractStatus;
  value: number;
  currency: string;
  pdf_url: string | null;
  signed_pdf_url: string | null;
  signed_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  business_unit?: BusinessUnit;
  client?: Client;
}

export type FinanceType = 'income' | 'expense';

export interface Finance {
  id: string;
  business_unit_id: string;
  client_id: string | null;
  type: FinanceType;
  category: string | null;
  amount: number;
  currency: string;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  // Joined
  business_unit?: BusinessUnit;
  client?: Client;
}

export interface InventoryItem {
  id: string;
  business_unit_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  currency: string;
  min_stock: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  business_unit?: BusinessUnit;
}

// ── Form types (for create/update) ──

export interface CreateClientPayload {
  business_unit_id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
}

export interface UpdateClientPayload extends Partial<CreateClientPayload> {
  id: string;
  is_active?: boolean;
}

// ── Dashboard aggregates ──

export interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  clientCount: number;
  contractCount: number;
  activeContractCount: number;
  inventoryCount: number;
  lowStockCount: number;
}

export interface ClientCardData {
  id: string;
  name: string;
  company: string | null;
  businessUnitSlug: string;
  businessUnitName: string;
  businessUnitColor: string;
  totalBilled: number;
  activeContracts: number;
  inventoryItems: number;
}

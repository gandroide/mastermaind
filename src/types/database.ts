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
  item_name: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  location: string | null;
  description: string | null;
  image_url: string | null;
  schematic_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  business_unit?: BusinessUnit;
}

// ── Form types (for create/update) ──

export interface CreateInventoryPayload {
  business_unit_id: string;
  item_name: string;
  sku?: string;
  category?: string;
  quantity: number;
  location?: string;
  description?: string;
  image_url?: string;
  schematic_url?: string;
  notes?: string;
}

export interface UpdateInventoryPayload extends Partial<CreateInventoryPayload> {
  id: string;
  is_active?: boolean;
}

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

// ── Blueprints ──

export interface Blueprint {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  share_token: string | null;
  share_pin: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlueprintPhase {
  id: string;
  blueprint_id: string;
  phase_number: number;
  title: string;
  content_markdown: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlueprintMaterial {
  id: string;
  blueprint_id: string;
  inventory_item_id: string | null;
  part_name: string;
  quantity_needed: number;
  notes: string | null;
  created_at: string;
  // Joined inventory item (optional)
  inventory_item?: InventoryItem | null;
}

export interface BlueprintWithDetails extends Blueprint {
  phases: BlueprintPhase[];
  materials: BlueprintMaterial[];
}

// ── Finance (Transactions) ──

export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'paid' | 'overdue';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category: string | null;
  description: string | null;
  status: TransactionStatus;
  business_unit_id: string;
  date: string;
  contract_id: string | null;
  inventory_item_id: string | null;
  created_at: string;
  updated_at: string;
}

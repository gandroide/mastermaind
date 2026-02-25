import { supabase } from '@/lib/supabase';
import type { Client, CreateClientPayload, UpdateClientPayload } from '@/types/database';

// ── Helper: apply business unit filter ──
function applyBuFilter(
  query: ReturnType<ReturnType<typeof supabase.from>['select']>,
  buSlug?: string
) {
  if (buSlug && buSlug !== 'all') {
    return query.eq('business_units.slug', buSlug);
  }
  return query;
}

/** Fetch clients with optional business unit filter */
export async function getClients(buSlug?: string, search?: string): Promise<Client[]> {
  let query = supabase
    .from('clients')
    .select('*, business_unit:business_units(*)')
    .eq('is_active', true)
    .order('name');

  // Filter by business unit
  if (buSlug && buSlug !== 'all') {
    // We need to get BU id first, or use inner join filter
    const { data: bu } = await supabase
      .from('business_units')
      .select('id')
      .eq('slug', buSlug)
      .single();

    if (bu) {
      query = query.eq('business_unit_id', bu.id);
    }
  }

  // Search by name or company
  if (search && search.trim()) {
    query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Client[];
}

/** Get a single client by ID */
export async function getClientById(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*, business_unit:business_units(*)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Client;
}

/** Create a new client */
export async function createClient(payload: CreateClientPayload): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select('*, business_unit:business_units(*)')
    .single();

  if (error) throw error;
  return data as Client;
}

/** Update an existing client */
export async function updateClient({ id, ...payload }: UpdateClientPayload): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', id)
    .select('*, business_unit:business_units(*)')
    .single();

  if (error) throw error;
  return data as Client;
}

/** Soft-delete a client */
export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

/** Get total count of active clients, optionally filtered by BU */
export async function getClientCount(buSlug?: string): Promise<number> {
  let query = supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  if (buSlug && buSlug !== 'all') {
    const { data: bu } = await supabase
      .from('business_units')
      .select('id')
      .eq('slug', buSlug)
      .single();

    if (bu) {
      query = query.eq('business_unit_id', bu.id);
    }
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

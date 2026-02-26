import { supabase } from '@/lib/supabase';
import type { InventoryItem, CreateInventoryPayload, UpdateInventoryPayload } from '@/types/database';

// ── Helpers ──

/** Resolve business_unit_id from slug */
async function getBuId(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('business_units')
    .select('id')
    .eq('slug', slug)
    .single();
  return data?.id ?? null;
}

// ── CRUD ──

/** Fetch inventory items with optional filters */
export async function getInventory(
  buSlug?: string,
  location?: string,
  category?: string,
  search?: string
): Promise<InventoryItem[]> {
  let query = supabase
    .from('inventory')
    .select('*, business_unit:business_units(*)')
    .eq('is_active', true)
    .order('item_name');

  if (buSlug && buSlug !== 'all') {
    const buId = await getBuId(buSlug);
    if (buId) query = query.eq('business_unit_id', buId);
  }

  if (location) {
    query = query.eq('location', location);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (search && search.trim()) {
    query = query.or(
      `item_name.ilike.%${search}%,sku.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as InventoryItem[];
}

/** Get a single inventory item by ID */
export async function getInventoryById(id: string): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*, business_unit:business_units(*)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as InventoryItem;
}

/** Create a new inventory item */
export async function createInventoryItem(payload: CreateInventoryPayload): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory')
    .insert(payload)
    .select('*, business_unit:business_units(*)')
    .single();

  if (error) throw error;
  return data as InventoryItem;
}

/** Update an existing inventory item */
export async function updateInventoryItem({ id, ...payload }: UpdateInventoryPayload): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory')
    .update(payload)
    .eq('id', id)
    .select('*, business_unit:business_units(*)')
    .single();

  if (error) throw error;
  return data as InventoryItem;
}

/** Soft-delete an inventory item */
export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

// ── File Uploads ──

/** Upload a file to a Supabase Storage bucket, returns public URL */
export async function uploadInventoryFile(
  bucket: 'inventory_images' | 'inventory_schematics',
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

/** Get distinct categories from inventory */
export async function getInventoryCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('category')
    .eq('is_active', true)
    .not('category', 'is', null);

  if (error) throw error;
  const unique = [...new Set((data ?? []).map((d) => d.category as string))];
  return unique.sort();
}

/** Get distinct locations from inventory */
export async function getInventoryLocations(): Promise<string[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('location')
    .eq('is_active', true)
    .not('location', 'is', null);

  if (error) throw error;
  const unique = [...new Set((data ?? []).map((d) => d.location as string))];
  return unique.sort();
}

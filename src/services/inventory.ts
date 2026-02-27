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

// ── Share (Partner Portal) ──

function generatePin(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function enableInventoryShare(buSlug: string, location: string, customPin?: string) {
  const buId = await getBuId(buSlug);
  if (!buId) throw new Error('BU not found');

  const token = crypto.randomUUID();
  const pin = customPin || generatePin();

  // Upsert the link for this BU and location
  const { data, error } = await supabase
    .from('inventory_share_links')
    .upsert(
      {
        business_unit_id: buId,
        location,
        share_token: token,
        share_pin: pin,
        is_active: true
      },
      { onConflict: 'business_unit_id, location' }
    )
    .select('share_token, share_pin')
    .single();

  if (error || !data) throw error ?? new Error('Failed to enable inventory share');
  return { token: data.share_token, pin: data.share_pin };
}

export async function disableInventoryShare(buSlug: string, location: string): Promise<void> {
  const buId = await getBuId(buSlug);
  if (!buId) return;

  const { error } = await supabase
    .from('inventory_share_links')
    .delete()
    .eq('business_unit_id', buId)
    .eq('location', location);

  if (error) throw error;
}

export async function getInventoryShareDetails(buSlug: string, location: string): Promise<{ token: string; pin: string; isActive: boolean } | null> {
  const buId = await getBuId(buSlug);
  if (!buId) return null;

  const { data, error } = await supabase
    .from('inventory_share_links')
    .select('share_token, share_pin, is_active')
    .eq('business_unit_id', buId)
    .eq('location', location)
    .single();
    
  if (error || !data?.share_token || !data?.share_pin) return null;
  return { token: data.share_token, pin: data.share_pin, isActive: data.is_active };
}

export async function verifyInventorySharePin(token: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('inventory_share_links')
    .select('share_pin, is_active')
    .eq('share_token', token)
    .single();

  if (error || !data || !data.is_active) throw new Error('Invalid or inactive link');
  if (pin === '__check__') return false; 
  return data.share_pin === pin;
}

export async function getPublicInventory(token: string): Promise<InventoryItem[] | null> {
  // 1. Resolve token to BU and location
  const { data: link, error: linkError } = await supabase
    .from('inventory_share_links')
    .select('business_unit_id, location, is_active')
    .eq('share_token', token)
    .single();

  if (linkError || !link || !link.is_active) return null;

  // 2. Fetch active inventory for that BU and location
  const { data: items, error: itemsError } = await supabase
    .from('inventory')
    .select('*, business_unit:business_units(*)')
    .eq('business_unit_id', link.business_unit_id)
    .eq('location', link.location)
    .eq('is_active', true)
    .order('item_name');

  if (itemsError) return null;
  return items as InventoryItem[];
}

export async function getPublicInventoryContext(token: string) {
  const { data: link, error } = await supabase
    .from('inventory_share_links')
    .select('business_unit_id, location, is_active')
    .eq('share_token', token)
    .single();
  if (error || !link || !link.is_active) throw new Error('Unauthorized');
  return { buId: link.business_unit_id, location: link.location };
}

export async function updatePublicInventoryQuantity(itemId: string, quantity: number, token: string): Promise<void> {
  const ctx = await getPublicInventoryContext(token);

  // Update item ensuring it belongs to token's BU and location
  const { error } = await supabase
    .from('inventory')
    .update({ quantity })
    .eq('id', itemId)
    .eq('business_unit_id', ctx.buId)
    .eq('location', ctx.location);

  if (error) throw error;
}

export async function createPublicInventoryItem(payload: Omit<CreateInventoryPayload, 'business_unit_id'>, token: string): Promise<InventoryItem> {
  const ctx = await getPublicInventoryContext(token);

  // Force creation with the token's locked location and BU
  const { data, error } = await supabase
    .from('inventory')
    .insert({ ...payload, business_unit_id: ctx.buId, location: ctx.location })
    .select('*, business_unit:business_units(*)')
    .single();

  if (error) throw error;
  return data as InventoryItem;
}

import { supabase } from '@/lib/supabase';
import type { Blueprint, BlueprintPhase, BlueprintMaterial, BlueprintWithDetails } from '@/types/database';

// ── Phase definitions (shared constant) ──
const DEFAULT_PHASES = [
  { phase_number: 1, title: 'BOM & Esquemáticos' },
  { phase_number: 2, title: 'Ensamblaje en Protoboard' },
  { phase_number: 3, title: 'Flash de Firmware & Testing' },
  { phase_number: 4, title: 'Soldadura y PCB' },
  { phase_number: 5, title: 'Enclosure (Carcasa) y QA Final' },
];

// ── Blueprints — Read ──

export async function getBlueprints(): Promise<Blueprint[]> {
  const { data, error } = await supabase
    .from('blueprints')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function getBlueprintWithDetails(id: string): Promise<BlueprintWithDetails | null> {
  const { data: blueprint, error: bpError } = await supabase
    .from('blueprints')
    .select('*')
    .eq('id', id)
    .single();

  if (bpError || !blueprint) return null;

  const { data: phases } = await supabase
    .from('blueprint_phases')
    .select('*')
    .eq('blueprint_id', id)
    .order('phase_number');

  const { data: materials } = await supabase
    .from('blueprint_materials')
    .select('*, inventory_item:inventory(*)')
    .eq('blueprint_id', id);

  return {
    ...blueprint,
    phases: phases ?? [],
    materials: materials ?? [],
  };
}

// ── Blueprints — Create ──

export async function createBlueprint(payload: {
  name: string;
  name_pt?: string;
  description?: string;
  description_pt?: string;
  cover_image?: string;
}): Promise<Blueprint> {
  const { data, error } = await supabase
    .from('blueprints')
    .insert(payload)
    .select()
    .single();

  if (error || !data) throw error ?? new Error('Failed to create blueprint');

  // Auto-generate 5 empty phases
  const phases = DEFAULT_PHASES.map((p) => ({
    blueprint_id: data.id,
    phase_number: p.phase_number,
    title: p.title,
    content_markdown: null,
  }));

  await supabase.from('blueprint_phases').insert(phases);

  return data;
}

export async function updateBlueprint(id: string, payload: {
  name?: string;
  name_pt?: string | null;
  description?: string | null;
  description_pt?: string | null;
  cover_image?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('blueprints')
    .update(payload)
    .eq('id', id);

  if (error) throw error;
}

// ── Phases — Read ──

export async function getBlueprintPhases(blueprintId: string): Promise<BlueprintPhase[]> {
  const { data, error } = await supabase
    .from('blueprint_phases')
    .select('*')
    .eq('blueprint_id', blueprintId)
    .order('phase_number');

  if (error) throw error;
  return data ?? [];
}

// ── Phases — Update ──

export async function updatePhaseContent(phaseId: string, payload: {
  content_markdown?: string | null;
  content_pt?: string | null;
  title?: string;
  title_pt?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('blueprint_phases')
    .update(payload)
    .eq('id', phaseId);

  if (error) throw error;
}

// ── Materials (BOM) — Read ──

export async function getBlueprintMaterials(blueprintId: string): Promise<BlueprintMaterial[]> {
  const { data, error } = await supabase
    .from('blueprint_materials')
    .select('*, inventory_item:inventory(*)')
    .eq('blueprint_id', blueprintId)
    .order('part_name');

  if (error) throw error;
  return data ?? [];
}

// ── Materials (BOM) — Create ──

export async function addBlueprintMaterial(payload: {
  blueprint_id: string;
  inventory_item_id?: string | null;
  part_name: string;
  quantity_needed: number;
  notes?: string;
}): Promise<BlueprintMaterial> {
  const { data, error } = await supabase
    .from('blueprint_materials')
    .insert(payload)
    .select('*, inventory_item:inventory(*)')
    .single();

  if (error || !data) throw error ?? new Error('Failed to add material');
  return data;
}

// ── Materials (BOM) — Delete ──

export async function deleteBlueprintMaterial(id: string): Promise<void> {
  const { error } = await supabase
    .from('blueprint_materials')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ── Share — Enable / Disable ──

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

export async function enableShare(blueprintId: string, customPin?: string): Promise<{ token: string; pin: string }> {
  const token = generateToken();
  const pin = customPin || generatePin();

  const { error } = await supabase
    .from('blueprints')
    .update({ share_token: token, share_pin: pin })
    .eq('id', blueprintId);

  if (error) throw error;
  return { token, pin };
}

export async function disableShare(blueprintId: string): Promise<void> {
  const { error } = await supabase
    .from('blueprints')
    .update({ share_token: null, share_pin: null })
    .eq('id', blueprintId);

  if (error) throw error;
}

// ── Share — Public access ──

export async function getPublicBlueprint(token: string): Promise<BlueprintWithDetails | null> {
  const { data: blueprint, error } = await supabase
    .from('blueprints')
    .select('*')
    .eq('share_token', token)
    .eq('is_active', true)
    .single();

  if (error || !blueprint) return null;

  const { data: phases } = await supabase
    .from('blueprint_phases')
    .select('*')
    .eq('blueprint_id', blueprint.id)
    .order('phase_number');

  // BOM: include part_name + quantity_needed + inventory (image_url & schematic_url) safely
  const { data: materials } = await supabase
    .from('blueprint_materials')
    .select('id, blueprint_id, part_name, quantity_needed, notes, created_at, inventory_item:inventory(image_url, schematic_url)')
    .eq('blueprint_id', blueprint.id)
    .order('part_name');

  return {
    ...blueprint,
    phases: phases ?? [],
    materials: (materials ?? []).map((m: any) => ({
      ...m,
      inventory_item_id: null,
      inventory_item: m.inventory_item ? { 
        image_url: m.inventory_item.image_url,
        schematic_url: m.inventory_item.schematic_url 
      } : null,
    })),
  };
}

export async function verifySharePin(token: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('blueprints')
    .select('share_pin')
    .eq('share_token', token)
    .eq('is_active', true)
    .single();

  if (error || !data) return false;
  return data.share_pin === pin;
}

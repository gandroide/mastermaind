import { supabase } from '@/lib/supabase';
import type { BusinessUnit } from '@/types/database';

/** Fetch all active business units */
export async function getBusinessUnits(): Promise<BusinessUnit[]> {
  const { data, error } = await supabase
    .from('business_units')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

/** Get a single business unit by slug */
export async function getBusinessUnitBySlug(slug: string): Promise<BusinessUnit | null> {
  const { data, error } = await supabase
    .from('business_units')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data;
}

import { supabase } from '@/lib/supabase';
import type { ContractDropzoneLink } from '@/types/database';

export async function createDropzoneLink(businessUnitId: string): Promise<string> {
  const { data, error } = await supabase
    .from('contract_dropzone_links')
    .insert({
      business_unit_id: businessUnitId,
      is_active: true
    })
    .select('share_token')
    .single();

  if (error) {
    throw error;
  }
  return data.share_token;
}

export async function getActiveDropzoneLinks(businessUnitSlug?: string): Promise<ContractDropzoneLink[]> {
  let query = supabase
    .from('contract_dropzone_links')
    .select('*, business_unit:business_units(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (businessUnitSlug && businessUnitSlug !== 'all') {
    // First resolve the slug to BU id
    const { data: buData } = await supabase
      .from('business_units')
      .select('id')
      .eq('slug', businessUnitSlug)
      .single();

    if (buData) {
      query = query.eq('business_unit_id', buData.id);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as ContractDropzoneLink[];
}

export async function deactivateDropzoneLink(id: string): Promise<void> {
  const { error } = await supabase
    .from('contract_dropzone_links')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

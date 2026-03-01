import { supabase } from '@/lib/supabase';
import { uploadContractPdf } from './contracts';

export interface DropzoneContext {
  business_unit_id: string;
  business_unit_name: string;
  share_token: string;
}

/** Get context from a public dropzone token */
export async function getDropzoneContext(token: string): Promise<DropzoneContext | null> {
  const { data, error } = await supabase
    .from('contract_dropzone_links')
    .select('share_token, is_active, business_unit_id, business_unit:business_units(name)')
    .eq('share_token', token)
    .single();

  if (error || !data || !data.is_active) return null;

  return {
    business_unit_id: data.business_unit_id,
    business_unit_name: Array.isArray(data.business_unit) 
      ? (data.business_unit[0] as any)?.name 
      : (data.business_unit as any)?.name || 'Unknown',
    share_token: data.share_token,
  };
}

/** Process the public upload */
export async function processDropzoneUpload(
  token: string,
  title: string,
  companyName: string,
  file: File
): Promise<void> {
  // 1. Validate token and get BU
  const ctx = await getDropzoneContext(token);
  if (!ctx) throw new Error('Invalid or expired dropzone link');

  // 2. Upload file to Supabase Storage
  const pdfUrl = await uploadContractPdf(file);

  // 3. Create contract in DB with status 'draft' or 'pending'.
  // We'll use 'draft' as it's the valid ContractStatus. We can also set notes
  // to save the "Empresa/Socio" name since the user might not exist in `clients`.
  const { error } = await supabase
    .from('contracts')
    .insert({
      business_unit_id: ctx.business_unit_id,
      title,
      status: 'draft',
      pdf_url: pdfUrl,
      notes: `[Subido vía Dropzone Público] Empresa/Socio: ${companyName}`,
      // we leave client_id as null
    });

  if (error) throw error;
}

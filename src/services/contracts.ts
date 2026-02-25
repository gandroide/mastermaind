import { supabase } from '@/lib/supabase';
import type { Contract, ContractStatus } from '@/types/database';

export interface CreateContractPayload {
  business_unit_id: string;
  client_id?: string;
  title: string;
  status?: ContractStatus;
  value?: number;
  currency?: string;
  pdf_url?: string;
  expires_at?: string;
  notes?: string;
}

export interface UpdateContractPayload extends Partial<CreateContractPayload> {
  id: string;
  signed_pdf_url?: string;
  signed_at?: string;
}

/** Helper to get BU id from slug */
async function getBuId(buSlug?: string): Promise<string | null> {
  if (!buSlug || buSlug === 'all') return null;
  const { data } = await supabase
    .from('business_units')
    .select('id')
    .eq('slug', buSlug)
    .single();
  return data?.id ?? null;
}

/** Fetch contracts with optional BU + status + client filters */
export async function getContracts(
  buSlug?: string,
  status?: ContractStatus,
  clientId?: string,
  search?: string
): Promise<Contract[]> {
  let query = supabase
    .from('contracts')
    .select('*, business_unit:business_units(*), client:clients(id, name, company)')
    .order('created_at', { ascending: false });

  // Business unit filter
  if (buSlug && buSlug !== 'all') {
    const buId = await getBuId(buSlug);
    if (buId) query = query.eq('business_unit_id', buId);
  }

  // Status filter
  if (status) {
    query = query.eq('status', status);
  }

  // Client filter
  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  // Search by title
  if (search?.trim()) {
    query = query.ilike('title', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Contract[];
}

/** Get a single contract by ID */
export async function getContractById(id: string): Promise<Contract | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*, business_unit:business_units(*), client:clients(id, name, company)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Contract;
}

/** Create a new contract */
export async function createContract(payload: CreateContractPayload): Promise<Contract> {
  const { data, error } = await supabase
    .from('contracts')
    .insert(payload)
    .select('*, business_unit:business_units(*), client:clients(id, name, company)')
    .single();

  if (error) throw error;
  return data as Contract;
}

/** Update a contract */
export async function updateContract({ id, ...payload }: UpdateContractPayload): Promise<Contract> {
  const { data, error } = await supabase
    .from('contracts')
    .update(payload)
    .eq('id', id)
    .select('*, business_unit:business_units(*), client:clients(id, name, company)')
    .single();

  if (error) throw error;
  return data as Contract;
}

/** Mark contract as signed (update status + signed_pdf_url) */
export async function markContractSigned(
  id: string,
  signedPdfUrl: string
): Promise<Contract> {
  return updateContract({
    id,
    status: 'signed',
    signed_pdf_url: signedPdfUrl,
    signed_at: new Date().toISOString(),
  });
}

/** Upload signed PDF to Supabase Storage */
export async function uploadSignedPdf(
  contractId: string,
  pdfBytes: Uint8Array
): Promise<string> {
  const fileName = `signed_${contractId}_${Date.now()}.pdf`;
  const filePath = `signed-contracts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('signed-contracts')
    .upload(filePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('signed-contracts')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/** Upload a contract PDF to Supabase Storage (contracts_pdfs bucket) */
export async function uploadContractPdf(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'pdf';
  const fileName = `contract_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('contracts_pdfs')
    .upload(fileName, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('contracts_pdfs').getPublicUrl(fileName);
  return data.publicUrl;
}

/** Delete a contract */
export async function deleteContract(id: string): Promise<void> {
  const { error } = await supabase.from('contracts').delete().eq('id', id);
  if (error) throw error;
}

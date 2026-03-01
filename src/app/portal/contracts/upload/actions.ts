'use server';

import { processDropzoneUpload } from '@/services/contract-dropzone';

export async function uploadContractAction(
  token: string,
  title: string,
  companyName: string,
  formData: FormData
) {
  const file = formData.get('file') as File;
  
  if (!file || !(file instanceof File)) {
    throw new Error('No se recibió un archivo válido');
  }

  await processDropzoneUpload(token, title, companyName, file);
}

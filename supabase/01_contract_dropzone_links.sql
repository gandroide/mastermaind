CREATE TABLE public.contract_dropzone_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE CASCADE,
  share_token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.contract_dropzone_links ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Enable read for public with active token"
  ON public.contract_dropzone_links FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Enable all for authenticated users"
  ON public.contract_dropzone_links FOR ALL
  TO authenticated
  USING (true);

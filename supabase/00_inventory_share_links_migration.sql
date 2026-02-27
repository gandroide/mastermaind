CREATE TABLE IF NOT EXISTS inventory_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  location VARCHAR(100) NOT NULL,
  share_token UUID UNIQUE DEFAULT gen_random_uuid(),
  share_pin VARCHAR(6) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_unit_id, location)
);

CREATE INDEX IF NOT EXISTS idx_inv_share_token ON inventory_share_links(share_token);

CREATE TRIGGER trg_inv_share_links_updated BEFORE UPDATE ON inventory_share_links FOR EACH ROW EXECUTE FUNCTION update_updated_at();

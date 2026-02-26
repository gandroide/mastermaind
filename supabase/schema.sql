-- ═══════════════════════════════════════════════════════════
-- BRIVEX MASTERMIND — Database Schema (Supabase / Postgres)
-- Single-user CEO system with logical business unit separation
-- ═══════════════════════════════════════════════════════════

-- ── Business Units (Reference Table) ──
CREATE TABLE IF NOT EXISTS business_units (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  slug       VARCHAR(50)  NOT NULL UNIQUE,
  color      VARCHAR(20)  DEFAULT '#a78bfa',
  icon       VARCHAR(50)  DEFAULT 'briefcase',
  is_active  BOOLEAN      DEFAULT TRUE,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Seed default business units
INSERT INTO business_units (name, slug, color, icon) VALUES
  ('Brivex',    'brivex',    '#38bdf8', 'building-2'),
  ('Bio-Alert', 'bio-alert', '#34d399', 'activity'),
  ('Tech Ops',  'tech-ops',  '#fb923c', 'cpu')
ON CONFLICT (slug) DO NOTHING;

-- ── Clients ──
CREATE TABLE IF NOT EXISTS clients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE RESTRICT,
  name             VARCHAR(200) NOT NULL,
  email            VARCHAR(200),
  phone            VARCHAR(50),
  company          VARCHAR(200),
  notes            TEXT,
  is_active        BOOLEAN     DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_bu ON clients(business_unit_id);
CREATE INDEX idx_clients_name ON clients(name);

-- ── Contracts ──
CREATE TYPE contract_status AS ENUM (
  'draft', 'sent', 'viewed', 'signed', 'active', 'expired', 'cancelled'
);

CREATE TABLE IF NOT EXISTS contracts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE RESTRICT,
  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  title            VARCHAR(300) NOT NULL,
  status           contract_status DEFAULT 'draft',
  value            NUMERIC(14,2)  DEFAULT 0,
  currency         VARCHAR(3)     DEFAULT 'USD',
  pdf_url          TEXT,
  signed_pdf_url   TEXT,
  signed_at        TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contracts_bu     ON contracts(business_unit_id);
CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- ── Finances ──
CREATE TYPE finance_type AS ENUM ('income', 'expense');

CREATE TABLE IF NOT EXISTS finances (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE RESTRICT,
  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  type             finance_type NOT NULL,
  category         VARCHAR(100),
  amount           NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency         VARCHAR(3)    DEFAULT 'USD',
  description      TEXT,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE transaction_status AS ENUM ('pending', 'paid', 'overdue');

CREATE TABLE IF NOT EXISTS transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type               VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  amount             NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency           VARCHAR(3) DEFAULT 'USD',
  category           VARCHAR(100),
  description        TEXT,
  status             transaction_status DEFAULT 'pending',
  business_unit_id   UUID NOT NULL REFERENCES business_units(id) ON DELETE RESTRICT,
  date               DATE NOT NULL DEFAULT CURRENT_DATE,
  contract_id        UUID REFERENCES contracts(id) ON DELETE SET NULL,
  inventory_item_id  UUID REFERENCES inventory(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);


CREATE INDEX idx_finances_bu   ON finances(business_unit_id);
CREATE INDEX idx_finances_type ON finances(type);
CREATE INDEX idx_finances_date ON finances(date);

-- ── Inventory (Distributed Technical Inventory) ──
CREATE TABLE IF NOT EXISTS inventory (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE RESTRICT,
  item_name        VARCHAR(200) NOT NULL,
  sku              VARCHAR(100),
  category         VARCHAR(100),        -- e.g. 'Componente Electrónico', 'Producto Ensamblado'
  quantity         INTEGER NOT NULL DEFAULT 0,
  location         VARCHAR(100),        -- e.g. 'Dominicana', 'Portugal', 'Argentina'
  description      TEXT,                -- long technical description
  image_url        TEXT,                -- reference image (Supabase Storage)
  schematic_url    TEXT,                -- electrical schematic PDF/image (Supabase Storage)
  notes            TEXT,
  is_active        BOOLEAN     DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_bu       ON inventory(business_unit_id);
CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_sku      ON inventory(sku);
CREATE INDEX idx_inventory_location ON inventory(location);

-- ── Auto-update timestamps trigger ──
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clients_updated    BEFORE UPDATE ON clients    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contracts_updated   BEFORE UPDATE ON contracts  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_finances_updated    BEFORE UPDATE ON finances   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventory_updated   BEFORE UPDATE ON inventory  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_business_units_upd  BEFORE UPDATE ON business_units FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Blueprints (Hardware Assembly Documentation) ──
CREATE TABLE IF NOT EXISTS blueprints (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  cover_image   TEXT,
  share_token   VARCHAR(64)  UNIQUE,
  share_pin     VARCHAR(6),
  is_active     BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_blueprints_share_token ON blueprints(share_token) WHERE share_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS blueprint_phases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id     UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  phase_number     INTEGER NOT NULL,
  title            VARCHAR(200) NOT NULL,
  content_markdown TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blueprint_id, phase_number)
);

CREATE TABLE IF NOT EXISTS blueprint_materials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id      UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  part_name         VARCHAR(200) NOT NULL,
  quantity_needed   INTEGER NOT NULL DEFAULT 1,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blueprint_phases_blueprint ON blueprint_phases(blueprint_id);
CREATE INDEX idx_blueprint_materials_blueprint ON blueprint_materials(blueprint_id);

CREATE TRIGGER trg_blueprints_updated       BEFORE UPDATE ON blueprints       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_blueprint_phases_updated  BEFORE UPDATE ON blueprint_phases FOR EACH ROW EXECUTE FUNCTION update_updated_at();

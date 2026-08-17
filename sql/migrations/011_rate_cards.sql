-- Rate Cards Table: Supplier price comparison / rate card
-- Each row = one visa type / service, with per-supplier costs as JSONB
CREATE TABLE IF NOT EXISTS rate_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visa_type TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  section TEXT DEFAULT 'Visa',
  supplier_costs JSONB DEFAULT '{}',
  selling_price TEXT DEFAULT '',
  sub_agent_price TEXT DEFAULT '',
  other_agent_price TEXT DEFAULT '',
  remark TEXT DEFAULT '',
  required_documents TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_rate_cards_sort ON rate_cards (section, sort_order);

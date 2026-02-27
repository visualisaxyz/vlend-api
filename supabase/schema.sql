-- vLend API Supabase schema
-- Run this in Supabase Dashboard > SQL Editor

-- Protocol historical statistics (for /protocol_stats)
CREATE TABLE IF NOT EXISTS historical_statistics (
  id BIGSERIAL PRIMARY KEY,
  chain TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by chain
CREATE INDEX IF NOT EXISTS idx_historical_statistics_chain_created 
  ON historical_statistics (chain, created_at DESC);

-- RLS: allow anon key to insert/select (for refreshStatistics)
ALTER TABLE historical_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert" ON historical_statistics
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select" ON historical_statistics
  FOR SELECT TO anon USING (true);

-- Whitelist: referrers (uniqueId -> referred addresses)
CREATE TABLE IF NOT EXISTS referers (
  id BIGSERIAL PRIMARY KEY,
  referer TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referers_referer ON referers (referer);

-- Whitelist: wallet to referer mapping (wallet -> uniqueId)
CREATE TABLE IF NOT EXISTS walletToReferer (
  id BIGSERIAL PRIMARY KEY,
  uniqueId TEXT NOT NULL UNIQUE,
  walletAddress TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_walletToReferer_wallet ON walletToReferer (walletAddress);

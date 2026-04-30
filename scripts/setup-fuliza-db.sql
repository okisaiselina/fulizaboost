-- Create fuliza_boosts table for the new dedicated database
CREATE TABLE IF NOT EXISTS fuliza_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_number TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  new_limit BIGINT NOT NULL,
  processing_fee BIGINT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on phone_number for faster queries
CREATE INDEX IF NOT EXISTS idx_fuliza_boosts_phone ON fuliza_boosts(phone_number);

-- Create index on status for tracking pending payments
CREATE INDEX IF NOT EXISTS idx_fuliza_boosts_status ON fuliza_boosts(status);

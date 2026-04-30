import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupDatabase() {
  try {
    console.log('Setting up Fuliza Boosts database...');

    // Test if table exists
    const { data, error } = await supabase
      .from('fuliza_boosts')
      .select('COUNT(*)')
      .limit(1);
    
    if (error?.code === 'PGRST116') {
      console.error('❌ Table "fuliza_boosts" does not exist.');
      console.error('Please create it manually in your Supabase dashboard using the SQL below:');
      console.error(`
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

CREATE INDEX IF NOT EXISTS idx_fuliza_boosts_phone ON fuliza_boosts(phone_number);
CREATE INDEX IF NOT EXISTS idx_fuliza_boosts_status ON fuliza_boosts(status);
      `);
      process.exit(1);
    } else if (error) {
      console.error('Unexpected error:', error);
      process.exit(1);
    } else {
      console.log('✅ Database setup complete! Table "fuliza_boosts" is ready.');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

setupDatabase();

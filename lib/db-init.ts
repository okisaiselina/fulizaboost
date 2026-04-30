'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export async function initializeDatabase() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if table exists by trying to query it
    const { error: queryError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (queryError?.code === 'PGRST116' || queryError?.code === '42P01') {
      // Table doesn't exist, create it
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_number VARCHAR(20) NOT NULL,
            phone_number VARCHAR(20) NOT NULL,
            new_limit INTEGER NOT NULL,
            processing_fee INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'pending'
          );

          CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
          CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
        `,
      });

      if (createError) {
        console.error('Error creating table:', createError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}

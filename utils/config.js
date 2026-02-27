require('dotenv').config();

// Service role key bypasses RLS (required for refreshStatistics writes)
// Anon key works for reads but RLS blocks inserts
module.exports = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY
};

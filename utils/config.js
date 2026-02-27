require('dotenv').config();

module.exports = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
};

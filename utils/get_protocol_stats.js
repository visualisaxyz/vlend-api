require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const config = require('../utils/config');
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function getProtocolStats(chain) {
  const result = await supabase
    .from('historical_statistics')
    .select()
    .eq('chain', chain)
    .order('created_at', { ascending: false })
    .limit(1);

  return result;
}

module.exports = getProtocolStats;

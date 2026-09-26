const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

let supabaseAdmin = null;

if (config.supabase.url && config.supabase.serviceRoleKey) {
  try {
    supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('[SUPABASE] Initialized Supabase Admin client with Service Role Key.');
  } catch (err) {
    console.warn('[SUPABASE] Failed to initialize Supabase client:', err.message);
  }
}

module.exports = {
  supabaseAdmin,
  isSupabaseConfigured: () => !!supabaseAdmin
};

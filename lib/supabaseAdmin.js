import { createClient } from '@supabase/supabase-js';

// Usa a service_role key — só em rotas de servidor (API routes),
// NUNCA importe isso em um componente de cliente.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

import { createClient } from '@supabase/supabase-js';

const ALLOWED_DOMAIN = 'sidelineswap.com';

/**
 * Verify the Supabase access token from the Authorization header.
 * Returns the user if valid and from the allowed domain, or null.
 */
export async function verifyAuth(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) return null;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  if (!user.email?.endsWith(`@${ALLOWED_DOMAIN}`)) return null;

  return user;
}

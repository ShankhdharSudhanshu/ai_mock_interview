import { createClient } from '@supabase/supabase-js';

/** Server-side Supabase client with service role key (bypasses RLS).
 *  NEVER import this in client-side code. */
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL  || '';

let adminClient = null;

export function getAdminClient() {
  if (!serviceRoleKey) return null;
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

/**
 * Middleware helper: verify Bearer token and return user + role.
 * Usage in API routes:
 *   const { user, role, error } = await verifyAuth(req);
 *   if (error) return res.status(401).json({ error });
 */
export async function verifyAuth(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    // Try cookie-based session (Supabase default)
    const anonClient = (await import('./supabase')).default;
    const { data: { user }, error } = await anonClient.auth.getUser();
    if (error || !user) return { user: null, role: null, error: 'Unauthorized' };
    const role = await getUserRole(user.id);
    return { user, role, error: null };
  }

  // Bearer token path
  const anonClient = (await import('./supabase')).default;
  const { data: { user }, error } = await anonClient.auth.getUser(token);
  if (error || !user) return { user: null, role: null, error: 'Invalid or expired token' };
  const role = await getUserRole(user.id);
  return { user, role, error: null };
}

async function getUserRole(userId) {
  try {
    const anonClient = (await import('./supabase')).default;
    const { data } = await anonClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    return data?.role || 'candidate';
  } catch {
    return 'candidate';
  }
}

/** Require admin role — returns 403 if not admin */
export async function requireAdmin(req, res) {
  const { user, role, error } = await verifyAuth(req);
  if (error) { res.status(401).json({ error }); return null; }
  if (role !== 'admin') { res.status(403).json({ error: 'Forbidden — admin only' }); return null; }
  return { user, role };
}

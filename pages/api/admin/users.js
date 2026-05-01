import { requireAdmin } from '../../../lib/auth-middleware';
import { getAdminClient } from '../../../lib/auth-middleware';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireAdmin(req, res);
  if (!auth) return; // requireAdmin already sent 401/403

  const admin = getAdminClient();
  if (!admin) return res.status(503).json({ error: 'Admin client not configured. Set SUPABASE_SERVICE_ROLE_KEY.' });

  try {
    const { data: { users }, error } = await admin.auth.admin.listUsers();
    if (error) return res.status(500).json({ error: error.message });

    // Fetch roles from profiles
    const { data: profiles } = await admin.from('profiles').select('id, role, plan');
    const roleMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    const result = users.map(u => ({
      id:            u.id,
      email:         u.email,
      role:          roleMap[u.id]?.role || 'candidate',
      plan:          roleMap[u.id]?.plan || 'free',
      emailVerified: u.email_confirmed_at != null,
      createdAt:     u.created_at,
      lastSignIn:    u.last_sign_in_at,
    }));

    return res.status(200).json({ users: result, total: result.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

import { verifyAuth } from '../../../lib/auth-middleware';
import { rateLimit } from '../../../lib/rate-limit';
import { sanitize } from '../../../lib/validate';
import supabase from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 30 profile updates per hour
  const { success } = rateLimit(req, { limit: 30, window: 3600 });
  if (!success) return res.status(429).json({ error: 'Too many requests. Try again later.' });

  const { user, error: authErr } = await verifyAuth(req);
  if (authErr) return res.status(401).json({ error: authErr });

  const { full_name, bio, skills, avatar_url } = req.body || {};

  const update = {};
  if (full_name !== undefined) update.full_name = sanitize(full_name);
  if (bio       !== undefined) update.bio        = sanitize(bio);
  if (skills    !== undefined) update.skills     = Array.isArray(skills) ? skills : [];
  if (avatar_url !== undefined) update.avatar_url = avatar_url;
  update.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...update });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}

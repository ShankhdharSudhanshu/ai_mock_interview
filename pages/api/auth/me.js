import { verifyAuth } from '../../../lib/auth-middleware';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { user, role, error } = await verifyAuth(req);
  if (error) return res.status(401).json({ error });

  return res.status(200).json({
    id:    user.id,
    email: user.email,
    role,
    emailVerified: user.email_confirmed_at != null,
  });
}

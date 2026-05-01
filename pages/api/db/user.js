/**
 * GET/PUT /api/db/user
 * GET  → return MongoDB user doc for current user
 * PUT  → update profile fields (name, bio, skills, etc.)
 */
import { connectDB, hasMongoConfig } from '../../../lib/mongodb';
import UserModel   from '../../../lib/models/User';
import { verifyAuth } from '../../../lib/auth-middleware';
import { sanitize }   from '../../../lib/validate';

export default async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (!hasMongoConfig()) return res.status(200).json({ user: null, skipped: true });

  const { user, error } = await verifyAuth(req);
  if (error) return res.status(401).json({ error });

  await connectDB();

  if (req.method === 'GET') {
    const doc = await UserModel.findOne({ supabaseId: user.id })
      .select('-__v')
      .lean();
    return res.status(200).json({ user: doc });
  }

  // PUT — update profile
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const allowed = {};
  if (body.name      !== undefined) allowed.name      = sanitize(body.name);
  if (body.bio       !== undefined) allowed.bio        = sanitize(body.bio);
  if (body.skills    !== undefined) allowed.skills     = Array.isArray(body.skills) ? body.skills : [];
  if (body.avatarUrl !== undefined) allowed.avatarUrl  = body.avatarUrl;
  if (body.resumeUrl !== undefined) allowed.resumeUrl  = body.resumeUrl;

  const updated = await UserModel.findOneAndUpdate(
    { supabaseId: user.id },
    { $set: { ...allowed, updatedAt: new Date() } },
    { new: true, upsert: true }
  ).select('-__v').lean();

  return res.status(200).json({ success: true, user: updated });
}

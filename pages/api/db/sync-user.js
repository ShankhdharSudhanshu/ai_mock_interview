/**
 * POST /api/db/sync-user
 * Called after login/signup to sync Supabase auth user → MongoDB User doc.
 * Safe to call multiple times (upserts).
 */
import { connectDB, hasMongoConfig } from '../../../lib/mongodb';
import UserModel from '../../../lib/models/User';
import { verifyAuth } from '../../../lib/auth-middleware';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasMongoConfig()) return res.status(200).json({ skipped: true, reason: 'MongoDB not configured' });

  const { user, error } = await verifyAuth(req);
  if (error) return res.status(401).json({ error });

  try {
    await connectDB();

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    const doc = await UserModel.findOneAndUpdate(
      { supabaseId: user.id },
      {
        $set: {
          supabaseId: user.id,
          email:      user.email,
          name:       body.name || user.email?.split('@')[0],
          avatarUrl:  body.avatarUrl  || null,
          role:       body.role       || 'candidate',
          plan:       body.plan       || 'free',
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, userId: doc._id });
  } catch (err) {
    console.error('sync-user error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/db/scores          → full score breakdown for current user
 * GET /api/db/scores?top=10   → leaderboard (top N by average score)
 */
import { connectDB, hasMongoConfig } from '../../../lib/mongodb';
import ScoreModel from '../../../lib/models/Score';
import { verifyAuth }  from '../../../lib/auth-middleware';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasMongoConfig()) return res.status(200).json({ score: null, skipped: true });

  const { user, error } = await verifyAuth(req);
  if (error) return res.status(401).json({ error });

  await connectDB();

  const { top } = req.query;

  // Leaderboard mode
  if (top) {
    const leaders = await ScoreModel
      .find({ totalInterviews: { $gte: 1 } })
      .sort({ averageScore: -1 })
      .limit(Math.min(Number(top) || 10, 50))
      .select('userId averageScore bestScore totalInterviews')
      .lean();
    return res.status(200).json({ leaderboard: leaders });
  }

  // Personal score doc
  const score = await ScoreModel.findOne({ userId: user.id }).lean();
  if (!score) return res.status(200).json({ score: null });

  return res.status(200).json({ score });
}

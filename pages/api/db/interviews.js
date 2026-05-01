/**
 * GET  /api/db/interviews          → list user's interview history
 * POST /api/db/interviews          → save a completed interview
 * GET  /api/db/interviews?id=xxx   → single session detail
 */
import { connectDB, hasMongoConfig } from '../../../lib/mongodb';
import InterviewModel from '../../../lib/models/Interview';
import ScoreModel     from '../../../lib/models/Score';
import UserModel      from '../../../lib/models/User';
import { verifyAuth } from '../../../lib/auth-middleware';
import { rateLimit }  from '../../../lib/rate-limit';

export default async function handler(req, res) {
  // Rate limit
  const { success } = rateLimit(req, { limit: 60, window: 60 });
  if (!success) return res.status(429).json({ error: 'Too many requests' });

  if (!hasMongoConfig()) return res.status(200).json({ interviews: [], skipped: true });

  const { user, error } = await verifyAuth(req);
  if (error) return res.status(401).json({ error });

  await connectDB();

  // ── GET list or single ──────────────────────────────────────
  if (req.method === 'GET') {
    const { id, page = 1, limit = 20, category } = req.query;

    // Single session
    if (id) {
      const interview = await InterviewModel.findOne({ sessionId: id, userId: user.id }).lean();
      if (!interview) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ interview });
    }

    // List with pagination + optional category filter
    const filter = { userId: user.id };
    if (category) filter.category = category;

    const [interviews, total] = await Promise.all([
      InterviewModel
        .find(filter)
        .sort({ completedAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .select('-answers')   // exclude full answers for list view (performance)
        .lean(),
      InterviewModel.countDocuments(filter),
    ]);

    return res.status(200).json({ interviews, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  }

  // ── POST: save interview ───────────────────────────────────
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { sessionId, category, score, answers, source } = body;

    if (!category || score == null) return res.status(400).json({ error: 'category and score are required' });

    // Upsert interview (safe if called twice)
    const interview = await InterviewModel.findOneAndUpdate(
      { sessionId: sessionId || `mongo-${Date.now()}`, userId: user.id },
      {
        $set: {
          userId:         user.id,
          category,
          score:          Number(score),
          totalQuestions: answers?.length || 0,
          answers:        answers || [],
          source:         source || 'web',
          completedAt:    new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // Update aggregated Score doc
    await ScoreModel.recordInterview(user.id, { score: Number(score), category });

    // Update denormalized stats on User doc
    const scoreDoc = await ScoreModel.findOne({ userId: user.id }).lean();
    if (scoreDoc) {
      await UserModel.findOneAndUpdate(
        { supabaseId: user.id },
        {
          $set: {
            totalInterviews: scoreDoc.totalInterviews,
            averageScore:    scoreDoc.averageScore,
            bestScore:       scoreDoc.bestScore,
            lastActivityAt:  new Date(),
          },
        }
      );
    }

    return res.status(201).json({ success: true, id: interview._id, sessionId: interview.sessionId });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

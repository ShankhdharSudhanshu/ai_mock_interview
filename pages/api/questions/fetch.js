/**
 * GET  /api/questions/fetch
 * Fetches questions for an interview session.
 * Query params:
 *   category   - required
 *   difficulty - optional (easy|medium|hard); auto-detected from user profile if omitted
 *   tags       - optional comma-separated tag filter
 *   count      - how many questions to fetch (default 5)
 *   userId     - optional; used to exclude seen questions
 */
import { connectDB, hasMongoConfig } from '../../../lib/mongodb';
import QuestionModel   from '../../../lib/models/Question';
import UserProgress    from '../../../lib/models/UserProgress';
import { SEED_QUESTIONS } from '../../../lib/questionBank';
import { rateLimit }   from '../../../lib/rate-limit';

// Map average score → difficulty
function scoreToDifficulty(avg) {
  if (avg >= 7.5) return 'hard';
  if (avg >= 5)   return 'medium';
  return 'easy';
}

/** Seeder — inserts built-in questions if DB has fewer than 10 */
async function maybeSeED() {
  const count = await QuestionModel.countDocuments();
  if (count < 10) {
    try {
      await QuestionModel.insertMany(SEED_QUESTIONS, { ordered: false });
      console.log('[Seeder] Inserted', SEED_QUESTIONS.length, 'seed questions');
    } catch (e) {
      if (e.code !== 11000) console.warn('[Seeder] error:', e.message);
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const rl = rateLimit(req, { limit: 60, window: 60 });
  if (!rl.success) return res.status(429).json({ error: 'Too many requests' });

  const {
    category, difficulty, tags, count = '5', userId, avgScore,
  } = req.query;

  if (!category) return res.status(400).json({ error: 'category is required' });

  // ── If MongoDB is not configured, fall back to inline question generation ──
  if (!hasMongoConfig()) {
    return res.status(200).json({ questions: await getFallbackQuestions(category, Number(count)), source: 'fallback' });
  }

  await connectDB();
  await maybeSeED();

  // ── Determine difficulty from user performance if not specified ──
  let targetDiff = difficulty;
  if (!targetDiff) {
    if (userId) {
      const progress = await UserProgress.findOne({ userId });
      const catStat  = progress?.categoryStats?.find(c => c.category === category);
      targetDiff = catStat?.targetDiff || 'medium';
    } else if (avgScore) {
      targetDiff = scoreToDifficulty(parseFloat(avgScore));
    } else {
      targetDiff = 'medium';
    }
  }

  // ── Build filter ──────────────────────────────────────────────────────────
  const filter = { category, isActive: true };
  if (targetDiff) filter.difficulty = targetDiff;
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    if (tagList.length) filter.tags = { $in: tagList };
  }

  // ── Exclude already-seen questions for this user ──────────────────────────
  let seenIds = [];
  if (userId) {
    const progress = await UserProgress.findOne({ userId }, { seenQuestions: 1 });
    seenIds = progress?.seenQuestions || [];
  }
  if (seenIds.length) filter._id = { $nin: seenIds };

  // ── Fetch + randomize ─────────────────────────────────────────────────────
  const wantCount = Math.min(Math.max(parseInt(count) || 5, 1), 20);

  // Fetch more than needed, then randomly sample (avoids always taking first N)
  let pool = await QuestionModel
    .find(filter)
    .sort({ usageCount: 1 })    // least-used first for freshness
    .limit(wantCount * 5)       // over-fetch pool
    .select('text difficulty tags timeLimit expectedAnswer keywords category')
    .lean();

  // If not enough with current difficulty, loosen the filter
  if (pool.length < wantCount) {
    const looseFilter = { category, isActive: true };
    if (seenIds.length) looseFilter._id = { $nin: seenIds };
    if (tags) looseFilter.tags = filter.tags;
    const extra = await QuestionModel.find(looseFilter).limit(wantCount * 3).lean();
    const known = new Set(pool.map(q => q._id.toString()));
    pool = [...pool, ...extra.filter(q => !known.has(q._id.toString()))];
  }

  // Shuffle pool and take wantCount
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, wantCount);

  // If still short, AI-generate the rest
  let questions = shuffled;
  if (questions.length < wantCount) {
    const aiQuestions = await generateWithAI(category, targetDiff, wantCount - questions.length);
    questions = [...questions, ...aiQuestions];
  }

  // ── Update usage count (fire-and-forget) ──────────────────────────────────
  const mongoIds = questions.filter(q => q._id).map(q => q._id);
  if (mongoIds.length) {
    QuestionModel.updateMany({ _id: { $in: mongoIds } }, { $inc: { usageCount: 1 } }).catch(() => {});
  }

  return res.status(200).json({
    questions,
    count:      questions.length,
    difficulty: targetDiff,
    source:     'db',
  });
}

// ── AI-based fallback question generator ─────────────────────────────────────
async function generateWithAI(category, difficulty, count) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return getFallbackQuestions(category, count);
  try {
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: openaiKey });
    const prompt = `Generate exactly ${count} ${difficulty} difficulty interview questions for a "${category}" interview.
Return ONLY a JSON array of objects with this exact structure:
[{"text":"<question>","difficulty":"${difficulty}","tags":["<tag1>"],"timeLimit":120,"expectedAnswer":"<key points>","keywords":["<keyword1>"]}]
No markdown, no extra text.`;

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 1000,
      messages: [{ role:'user', content: prompt }],
    });
    const parsed = JSON.parse(resp.choices[0].message.content.trim());
    return parsed.map(q => ({ ...q, category, source: 'ai-generated' }));
  } catch { return getFallbackQuestions(category, count); }
}

// ── Static fallback (no DB, no AI) ───────────────────────────────────────────
function getFallbackQuestions(category, count) {
  const pool = SEED_QUESTIONS.filter(q => q.category === category || q.category === 'behavioral');
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const result = shuffled.slice(0, count);
  // If still not enough, take from all categories
  if (result.length < count) {
    const all = [...SEED_QUESTIONS].sort(() => Math.random() - 0.5);
    return all.slice(0, count).map(q => q.text);
  }
  return result.map(q => q.text);
}

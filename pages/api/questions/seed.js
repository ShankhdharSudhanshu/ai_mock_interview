/**
 * POST /api/questions/seed
 * Seeds MongoDB with all SEED_QUESTIONS (idempotent — skips duplicates).
 * Also works without MongoDB: returns the full question bank as JSON.
 *
 * GET /api/questions/seed?category=dsa&difficulty=medium&count=5
 * Returns a random selection from the in-memory question bank (no DB needed).
 */
import { connectDB, hasMongoConfig } from '../../../lib/mongodb';
import QuestionModel from '../../../lib/models/Question';
import { SEED_QUESTIONS, CATEGORY_DESCRIPTIONS } from '../../../lib/questionBank';

export default async function handler(req, res) {

  // ── GET: Return filtered questions from in-memory bank ────────────────────
  if (req.method === 'GET') {
    const { category, difficulty, count = '5', q } = req.query;
    const want = Math.min(Math.max(parseInt(count) || 5, 1), 50);

    let pool = [...SEED_QUESTIONS];

    if (category && category !== 'all') {
      pool = pool.filter(qs => qs.category === category);
    }
    if (difficulty && difficulty !== 'all') {
      pool = pool.filter(qs => qs.difficulty === difficulty);
    }
    if (q) {
      const term = q.toLowerCase();
      pool = pool.filter(qs =>
        qs.text.toLowerCase().includes(term) ||
        qs.tags?.some(t => t.includes(term)) ||
        qs.expectedAnswer?.toLowerCase().includes(term)
      );
    }

    // Shuffle and slice
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const questions = shuffled.slice(0, want);

    return res.status(200).json({
      questions,
      total:       pool.length,
      count:       questions.length,
      category:    category || 'all',
      difficulty:  difficulty || 'all',
      source:      'seed-bank',
      categories:  CATEGORY_DESCRIPTIONS,
    });
  }

  // ── POST: Seed MongoDB ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    // Works without MongoDB — just returns the bank as JSON
    if (!hasMongoConfig()) {
      return res.status(200).json({
        success:    true,
        message:    'MongoDB not configured — returning in-memory bank.',
        questions:  SEED_QUESTIONS,
        total:      SEED_QUESTIONS.length,
        source:     'memory',
        categories: CATEGORY_DESCRIPTIONS,
      });
    }

    try {
      await connectDB();

      const before = await QuestionModel.countDocuments();

      // insertMany with ordered:false skips duplicates gracefully
      let inserted = 0;
      try {
        const result = await QuestionModel.insertMany(SEED_QUESTIONS, { ordered: false });
        inserted = result.length;
      } catch (err) {
        // Partial success on duplicate key errors
        if (err.code === 11000 || err.writeErrors) {
          inserted = SEED_QUESTIONS.length - (err.writeErrors?.length || 0);
        } else {
          throw err;
        }
      }

      const after = await QuestionModel.countDocuments();

      return res.status(200).json({
        success:   true,
        message:   `Seeded ${inserted} new questions. DB now has ${after} questions.`,
        before,
        after,
        inserted,
        skipped:   SEED_QUESTIONS.length - inserted,
        total:     SEED_QUESTIONS.length,
        source:    'mongodb',
      });
    } catch (err) {
      console.error('[Seed] Error:', err.message);
      return res.status(500).json({ error: 'Seed failed', detail: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

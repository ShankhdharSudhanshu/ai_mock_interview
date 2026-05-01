/**
 * POST /api/questions/generate
 * Admin-only: use AI to generate and auto-save new questions to the DB.
 * Body: { category, difficulty, count, tags }
 */
import { connectDB, hasMongoConfig } from '../../../lib/mongodb';
import QuestionModel from '../../../lib/models/Question';
import { requireAdmin } from '../../../lib/auth-middleware';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasMongoConfig())     return res.status(503).json({ error: 'MongoDB not configured' });

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const { category = 'behavioral', difficulty = 'medium', count = 5, tags = [] } = req.body || {};
  const wantCount = Math.min(Number(count), 20);

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: 'OPENAI_API_KEY not configured. Add it to .env.local to use AI generation.' });

  try {
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: openaiKey });

    const tagHint = Array.isArray(tags) && tags.length
      ? `Focus on these topic areas: ${tags.join(', ')}.`
      : '';

    const prompt = `You are an expert technical interviewer. Generate exactly ${wantCount} unique, high-quality interview questions.

Category: ${category}
Difficulty: ${difficulty}
${tagHint}

Return ONLY a valid JSON array with this exact structure (no markdown, no extra text):
[
  {
    "text": "<the interview question>",
    "difficulty": "${difficulty}",
    "tags": ["<tag1>", "<tag2>"],
    "timeLimit": 120,
    "expectedAnswer": "<key points the candidate should cover>",
    "keywords": ["<keyword1>", "<keyword2>"]
  }
]

Rules:
- Questions must be specific and practical, not generic
- expectedAnswer should be 1-3 sentences of key evaluation points
- keywords are words/phrases that indicate a strong answer
- timeLimit in seconds (60-300)
- tags are lowercase, single-word topics`;

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0.8, max_tokens: 2000,
      messages: [{ role:'user', content: prompt }],
    });

    const raw  = resp.choices[0].message.content.trim();
    const parsed = JSON.parse(raw);

    await connectDB();

    const docs = parsed.map(q => ({
      text:           q.text,
      category,
      difficulty:     q.difficulty || difficulty,
      tags:           Array.isArray(q.tags) ? q.tags.map(t => t.toLowerCase()) : [],
      expectedAnswer: q.expectedAnswer || '',
      keywords:       Array.isArray(q.keywords) ? q.keywords : [],
      timeLimit:      Number(q.timeLimit) || 120,
      source:         'ai-generated',
      createdBy:      auth.user.id,
    }));

    const saved = await QuestionModel.insertMany(docs, { ordered: false });

    return res.status(201).json({
      success:   true,
      generated: saved.length,
      questions: saved,
    });
  } catch (err) {
    return res.status(500).json({ error: `AI generation failed: ${err.message}` });
  }
}

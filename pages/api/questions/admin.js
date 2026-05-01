/**
 * Admin-only Question CRUD API
 * GET    /api/questions/admin?page=1&category=dsa&difficulty=easy&q=search
 * POST   /api/questions/admin                  → create question
 * PUT    /api/questions/admin?id=<mongoId>     → update question
 * DELETE /api/questions/admin?id=<mongoId>     → soft-delete (isActive=false)
 */
import { connectDB, hasMongoConfig } from '../../../lib/mongodb';
import QuestionModel from '../../../lib/models/Question';
import { requireAdmin } from '../../../lib/auth-middleware';
import { sanitize } from '../../../lib/validate';

export default async function handler(req, res) {
  if (!hasMongoConfig()) return res.status(503).json({ error: 'MongoDB not configured' });

  const auth = await requireAdmin(req, res);
  if (!auth) return;   // requireAdmin already sent 401/403

  await connectDB();

  // ── GET: list questions ────────────────────────────────────────
  if (req.method === 'GET') {
    const { page = 1, limit = 20, category, difficulty, tag, q, active } = req.query;
    const filter = {};
    if (category)               filter.category   = category;
    if (difficulty)             filter.difficulty  = difficulty;
    if (tag)                    filter.tags        = tag;
    if (active !== undefined)   filter.isActive    = active !== 'false';
    if (q)                      filter.text        = { $regex: q, $options: 'i' };

    const [docs, total] = await Promise.all([
      QuestionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      QuestionModel.countDocuments(filter),
    ]);
    return res.status(200).json({ questions: docs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  }

  // ── POST: create question ──────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body || {};
    if (!body.text?.trim())     return res.status(400).json({ error: 'text is required' });
    if (!body.category)         return res.status(400).json({ error: 'category is required' });

    const doc = await QuestionModel.create({
      text:           sanitize(body.text),
      category:       body.category,
      difficulty:     body.difficulty || 'medium',
      tags:           Array.isArray(body.tags) ? body.tags.map(t => t.toLowerCase().trim()) : [],
      expectedAnswer: sanitize(body.expectedAnswer || ''),
      keywords:       Array.isArray(body.keywords) ? body.keywords : [],
      timeLimit:      Number(body.timeLimit) || 120,
      source:         body.source || 'manual',
      createdBy:      auth.user.id,
    });
    return res.status(201).json({ success: true, question: doc });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id is required for PUT/DELETE' });

  // ── PUT: update question ────────────────────────────────────────
  if (req.method === 'PUT') {
    const body = req.body || {};
    const update = {};
    if (body.text           !== undefined) update.text           = sanitize(body.text);
    if (body.category       !== undefined) update.category       = body.category;
    if (body.difficulty     !== undefined) update.difficulty     = body.difficulty;
    if (body.tags           !== undefined) update.tags           = body.tags;
    if (body.expectedAnswer !== undefined) update.expectedAnswer = sanitize(body.expectedAnswer);
    if (body.keywords       !== undefined) update.keywords       = body.keywords;
    if (body.timeLimit      !== undefined) update.timeLimit      = Number(body.timeLimit);
    if (body.isActive       !== undefined) update.isActive       = Boolean(body.isActive);

    const doc = await QuestionModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Question not found' });
    return res.status(200).json({ success: true, question: doc });
  }

  // ── DELETE: soft delete ─────────────────────────────────────────
  if (req.method === 'DELETE') {
    const doc = await QuestionModel.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Question not found' });
    return res.status(200).json({ success: true, message: 'Question deactivated' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

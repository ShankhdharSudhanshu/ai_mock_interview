/**
 * POST /api/questions/bulk
 * Admin-only: bulk upload questions from a JSON array or CSV-style data.
 * Body: { questions: [...] }  OR  { csv: "text,category,difficulty,tags\n..." }
 */
import { connectDB, hasMongoConfig } from '../../../lib/mongodb';
import QuestionModel from '../../../lib/models/Question';
import { requireAdmin } from '../../../lib/auth-middleware';
import { sanitize } from '../../../lib/validate';

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasMongoConfig())     return res.status(503).json({ error: 'MongoDB not configured' });

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  await connectDB();

  const body = req.body || {};
  let rawItems = [];

  if (body.questions && Array.isArray(body.questions)) {
    rawItems = body.questions;
  } else if (body.csv && typeof body.csv === 'string') {
    rawItems = parseCSV(body.csv);
  } else {
    return res.status(400).json({ error: 'Provide questions[] array or csv string in body' });
  }

  if (rawItems.length > 500) {
    return res.status(400).json({ error: 'Max 500 questions per bulk upload' });
  }

  const VALID_CATEGORIES = ['frontend','backend','fullstack','dsa','system-design','hr','data-science','devops','product-manager','behavioral'];
  const VALID_DIFFICULTIES = ['easy','medium','hard'];

  const docs = rawItems
    .filter(item => item.text && item.category)
    .map(item => ({
      text:           sanitize(String(item.text)),
      category:       VALID_CATEGORIES.includes(item.category) ? item.category : 'behavioral',
      difficulty:     VALID_DIFFICULTIES.includes(item.difficulty) ? item.difficulty : 'medium',
      tags:           typeof item.tags === 'string' ? item.tags.split('|').map(t => t.trim().toLowerCase()) : (Array.isArray(item.tags) ? item.tags : []),
      expectedAnswer: sanitize(String(item.expectedAnswer || item.expected_answer || '')),
      keywords:       typeof item.keywords === 'string' ? item.keywords.split('|').map(k => k.trim()) : (Array.isArray(item.keywords) ? item.keywords : []),
      timeLimit:      Number(item.timeLimit || item.time_limit) || 120,
      source:         'bulk-upload',
      createdBy:      auth.user.id,
    }));

  if (docs.length === 0) return res.status(400).json({ error: 'No valid questions found in upload' });

  const result = await QuestionModel.insertMany(docs, { ordered: false }).catch(err => {
    if (err.writeErrors) return { insertedCount: docs.length - err.writeErrors.length };
    throw err;
  });

  return res.status(201).json({
    success:  true,
    inserted: result.insertedCount ?? docs.length,
    skipped:  docs.length - (result.insertedCount ?? docs.length),
    total:    rawItems.length,
  });
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

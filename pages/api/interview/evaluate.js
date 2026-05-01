import { authRateLimit } from '../../../lib/rate-limit';

// ── Fluency Analysis ──────────────────────────────────────────────────────────
const FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually',
  'so', 'right', 'i mean', 'kind of', 'sort of', 'just', 'very', 'really',
];

function analyzeFluency(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount === 0) return { score: 0, fillerCount: 0, paceLabel: 'No answer', wordCount: 0 };

  // Filler word detection
  const lower = text.toLowerCase();
  let fillerCount = 0;
  FILLER_WORDS.forEach(fw => {
    const re = new RegExp(`\\b${fw}\\b`, 'gi');
    const matches = lower.match(re);
    if (matches) fillerCount += matches.length;
  });

  const fillerRatio = fillerCount / Math.max(wordCount, 1);

  // Pace label based on word count (typical answer for 60s is 100-150 words)
  let paceLabel = 'Appropriate';
  if (wordCount < 20)  paceLabel = 'Too brief';
  else if (wordCount < 50)  paceLabel = 'Short';
  else if (wordCount > 250) paceLabel = 'Very detailed';
  else if (wordCount > 150) paceLabel = 'Detailed';

  // Grammar quality — sentence structure heuristic
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);
  const avgSentLen = wordCount / Math.max(sentences.length, 1);
  const grammarOk = avgSentLen >= 4 && avgSentLen <= 35;

  // Fluency score (0–10)
  let fluencyScore = 10;
  fluencyScore -= fillerRatio * 15;        // penalise fillers
  if (wordCount < 20)  fluencyScore -= 4;
  else if (wordCount < 40)  fluencyScore -= 2;
  if (!grammarOk) fluencyScore -= 1;
  fluencyScore = Math.max(1, Math.min(10, parseFloat(fluencyScore.toFixed(1))));

  return { score: fluencyScore, fillerCount, paceLabel, wordCount, grammarOk };
}

// ── Sentiment Analysis ────────────────────────────────────────────────────────
const POSITIVE_WORDS = [
  'excellent', 'great', 'good', 'confident', 'successfully', 'achieved', 'improved',
  'love', 'enjoy', 'passionate', 'excited', 'proud', 'led', 'built', 'delivered',
  'optimized', 'learned', 'grew', 'collaborated', 'solved', 'effective', 'strong',
  'best', 'innovative', 'creative', 'proactive', 'motivated', 'dedicated', 'clear',
];
const NEGATIVE_WORDS = [
  'failed', 'struggle', 'difficult', 'hard', 'confused', 'unsure', 'not sure',
  'terrible', 'awful', 'bad', 'wrong', 'mistake', 'error', 'problem', 'issue',
  'worried', 'nervous', 'anxious', 'frustrating', 'hate', 'boring', 'never', "can't",
];
const HEDGE_WORDS = [
  'maybe', 'perhaps', 'i think', 'i guess', 'i believe', 'possibly', 'probably',
  'not sure', 'uncertain', "don't know", 'might', 'could be',
];

function analyzeSentiment(text) {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);

  let posCount = 0, negCount = 0, hedgeCount = 0;

  POSITIVE_WORDS.forEach(w => { if (lower.includes(w)) posCount++; });
  NEGATIVE_WORDS.forEach(w => { if (lower.includes(w)) negCount++; });
  HEDGE_WORDS.forEach(w => { if (lower.includes(w)) hedgeCount++; });

  const total = posCount + negCount + hedgeCount || 1;
  const posRatio = posCount / total;
  const negRatio = negCount / total;

  // Valence: -1 to 1
  const valence = (posCount - negCount) / Math.max(posCount + negCount, 1);

  // Confidence: penalise hedges
  const confidence = Math.max(0, Math.min(1, 1 - (hedgeCount / Math.max(words.length * 0.05, 1))));

  // Sentiment score (0–10)
  let sentimentScore = 5 + valence * 2.5 + confidence * 2.5;
  sentimentScore = Math.max(1, Math.min(10, parseFloat(sentimentScore.toFixed(1))));

  let label = 'Neutral';
  if (valence > 0.3) label = confidence > 0.6 ? 'Confident & Positive' : 'Positive';
  else if (valence < -0.3) label = 'Negative';
  else if (hedgeCount > 2) label = 'Uncertain / Hedging';

  return { score: sentimentScore, label, posCount, negCount, hedgeCount, confidence: parseFloat(confidence.toFixed(2)) };
}

// ── Content Relevance (keyword matching) ─────────────────────────────────────
function analyzeContent(question, answer, category) {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;

  // Word-count-based base score
  let baseScore;
  if (words < 15)       baseScore = 3 + Math.random();
  else if (words < 35)  baseScore = 4.5 + Math.random() * 1.5;
  else if (words < 70)  baseScore = 6 + Math.random() * 1.5;
  else if (words < 120) baseScore = 7 + Math.random() * 1.5;
  else                  baseScore = 8 + Math.random();

  // Keyword overlap with question (proxy for relevance)
  const qWords = new Set(
    question.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 4)
  );
  const aLower = answer.toLowerCase();
  let hits = 0;
  qWords.forEach(w => { if (aLower.includes(w)) hits++; });
  const relevanceBonus = qWords.size > 0 ? (hits / qWords.size) * 2 : 0;

  const score = Math.min(10, Math.max(1, parseFloat((baseScore + relevanceBonus * 0.5).toFixed(1))));
  return { score };
}

// ── Template feedback by band ────────────────────────────────────────────────
function buildTemplateFeedback(weightedScore, fluency, sentiment) {
  const templates = {
    excellent: {
      feedback: `Outstanding response! You demonstrated strong command of the topic with a well-structured, confident answer. Your delivery was fluent and your tone conveyed genuine expertise. A few more specific examples would make this perfect.`,
      strengths: ['Clear and well-structured response', 'Strong technical depth', 'Confident and positive tone'],
      improvements: ['Add concrete real-world examples', 'Consider edge cases or trade-offs'],
    },
    good: {
      feedback: `Solid answer covering the main points effectively. Your delivery was generally fluent and you came across as knowledgeable. There's room to add more depth and precision to elevate this response further.`,
      strengths: ['Core concept understood', 'Good answer structure', 'Relevant points addressed'],
      improvements: ['Add specific examples or metrics', 'Deepen the technical explanation', 'Structure using a framework (e.g. STAR)'],
    },
    average: {
      feedback: `A decent attempt but the answer could be more comprehensive. You touched on the topic but missed some key aspects. Consider structuring your thoughts before speaking and adding concrete details to support your points.`,
      strengths: ['Showed awareness of the topic', 'Attempted to answer the question'],
      improvements: ['Review core concepts more deeply', 'Use the STAR/PREP framework', 'Provide specific examples', `Reduce filler words (detected: ${fluency.fillerCount})`],
    },
    poor: {
      feedback: `The response needs significant improvement — it was too brief or unclear to fully address the question. Focus on structuring your thoughts, covering the key concept clearly, and always including at least one concrete example.`,
      strengths: ['Attempted to answer the question'],
      improvements: ['Study and review the core concept', 'Practice articulating thoughts clearly', 'Use the STAR method for structure', 'Always include at least one example'],
    },
  };

  if (weightedScore >= 8.5) return templates.excellent;
  if (weightedScore >= 6.5) return templates.good;
  if (weightedScore >= 4.5) return templates.average;
  return templates.poor;
}

// ── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 10 evaluations / 15 min per IP
  const { success } = authRateLimit(req);
  if (!success) return res.status(429).json({ error: 'Too many requests. Please slow down.' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { question = '', answer = '', category = '' } = body;
  if (!answer?.trim()) return res.status(400).json({ error: 'Answer is required' });

  // ── Step 6: Run all 3 analyses in parallel ────────────────────────────────
  const [fluencyResult, sentimentResult, contentResult] = await Promise.all([
    Promise.resolve(analyzeFluency(answer)),
    Promise.resolve(analyzeSentiment(answer)),
    Promise.resolve(analyzeContent(question, answer, category)),
  ]);

  // ── Try OpenAI for content + feedback override ────────────────────────────
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: openaiKey });

      const prompt = `You are an expert interview coach evaluating a candidate's answer.

Interview Question: "${question}"
Candidate's Answer: "${answer}"
Interview Track: ${category}
Fluency Analysis: ${fluencyResult.fillerCount} filler words, ${fluencyResult.wordCount} words, pace: ${fluencyResult.paceLabel}
Sentiment: ${sentimentResult.label}

Evaluate and return ONLY a JSON object:
{
  "contentScore": <number 1-10>,
  "feedback": "<2-3 sentence overall feedback>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 600,
      });

      const json = JSON.parse(completion.choices[0].message.content.trim());

      // ── Step 7: Weighted scoring (50% content, 30% fluency, 20% sentiment) ──
      const contentScore  = Math.min(10, Math.max(1, parseFloat(json.contentScore)));
      const fluencyScore  = fluencyResult.score;
      const sentimentScore = sentimentResult.score;
      const weightedScore = parseFloat(
        (contentScore * 0.5 + fluencyScore * 0.3 + sentimentScore * 0.2).toFixed(1)
      );

      return res.status(200).json({
        score:          weightedScore,
        contentScore,
        fluencyScore,
        sentimentScore,
        feedback:       json.feedback,
        strengths:      json.strengths || [],
        improvements:   json.improvements || [],
        fluency:        fluencyResult,
        sentiment:      sentimentResult,
        scoringWeights: { content: 0.5, fluency: 0.3, sentiment: 0.2 },
        source:         'openai',
      });
    } catch (err) {
      console.error('OpenAI evaluation failed:', err.message);
    }
  }

  // ── Demo fallback: use local analysis results ─────────────────────────────
  const contentScore   = contentResult.score;
  const fluencyScore   = fluencyResult.score;
  const sentimentScore = sentimentResult.score;

  // Step 7: Weighted score
  const weightedScore = parseFloat(
    (contentScore * 0.5 + fluencyScore * 0.3 + sentimentScore * 0.2).toFixed(1)
  );

  const tpl = buildTemplateFeedback(weightedScore, fluencyResult, sentimentResult);

  return res.status(200).json({
    score:          weightedScore,
    contentScore,
    fluencyScore,
    sentimentScore,
    feedback:       tpl.feedback,
    strengths:      tpl.strengths,
    improvements:   tpl.improvements,
    fluency:        fluencyResult,
    sentiment:      sentimentResult,
    scoringWeights: { content: 0.5, fluency: 0.3, sentiment: 0.2 },
    source:         'demo',
  });
}

import mongoose from 'mongoose';

const CategoryStatsSchema = new mongoose.Schema({
  category:     { type: String, required: true },
  count:        { type: Number, default: 0 },
  totalScore:   { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  bestScore:    { type: Number, default: 0 },
  lastPlayedAt: { type: Date },
}, { _id: false });

const WeeklyScoreSchema = new mongoose.Schema({
  weekKey:      { type: String },  // e.g. "2024-W14"
  sessions:     { type: Number, default: 0 },
  totalScore:   { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
}, { _id: false });

const ScoreSchema = new mongoose.Schema(
  {
    userId:          { type: String, required: true, unique: true },   // supabase user ID
    totalInterviews: { type: Number, default: 0 },
    totalScore:      { type: Number, default: 0 },
    averageScore:    { type: Number, default: 0 },
    bestScore:       { type: Number, default: 0 },
    currentStreak:   { type: Number, default: 0 },   // consecutive days with a session
    longestStreak:   { type: Number, default: 0 },
    lastSessionAt:   { type: Date },
    categoryStats:   [CategoryStatsSchema],
    weeklyHistory:   { type: [WeeklyScoreSchema], default: [] },
    updatedAt:       { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ScoreSchema.index({ userId: 1 });
ScoreSchema.index({ averageScore: -1 });   // leaderboard

/**
 * Record a new interview result and update all aggregates atomically.
 * Usage: await ScoreModel.recordInterview(userId, { score, category })
 */
ScoreSchema.statics.recordInterview = async function(userId, { score, category }) {
  const now  = new Date();
  const week = getISOWeek(now);

  const doc = await this.findOne({ userId });

  if (!doc) {
    return this.create({
      userId,
      totalInterviews: 1,
      totalScore:      score,
      averageScore:    score,
      bestScore:       score,
      currentStreak:   1,
      longestStreak:   1,
      lastSessionAt:   now,
      categoryStats: [{ category, count: 1, totalScore: score, averageScore: score, bestScore: score, lastPlayedAt: now }],
      weeklyHistory: [{ weekKey: week, sessions: 1, totalScore: score, averageScore: score }],
    });
  }

  // Update totals
  doc.totalInterviews += 1;
  doc.totalScore      += score;
  doc.averageScore     = parseFloat((doc.totalScore / doc.totalInterviews).toFixed(2));
  doc.bestScore        = Math.max(doc.bestScore, score);

  // Streak logic
  const lastDate = doc.lastSessionAt ? new Date(doc.lastSessionAt) : null;
  const diffDays = lastDate ? Math.floor((now - lastDate) / 86400000) : null;
  if (diffDays === null || diffDays >= 2) doc.currentStreak = 1;
  else if (diffDays === 1) doc.currentStreak += 1;
  doc.longestStreak = Math.max(doc.longestStreak, doc.currentStreak);
  doc.lastSessionAt = now;

  // Category stats
  const cat = doc.categoryStats.find(c => c.category === category);
  if (cat) {
    cat.count       += 1;
    cat.totalScore  += score;
    cat.averageScore = parseFloat((cat.totalScore / cat.count).toFixed(2));
    cat.bestScore    = Math.max(cat.bestScore, score);
    cat.lastPlayedAt = now;
  } else {
    doc.categoryStats.push({ category, count: 1, totalScore: score, averageScore: score, bestScore: score, lastPlayedAt: now });
  }

  // Weekly history
  const wk = doc.weeklyHistory.find(w => w.weekKey === week);
  if (wk) {
    wk.sessions   += 1;
    wk.totalScore += score;
    wk.averageScore = parseFloat((wk.totalScore / wk.sessions).toFixed(2));
  } else {
    doc.weeklyHistory.push({ weekKey: week, sessions: 1, totalScore: score, averageScore: score });
  }
  // Keep only last 12 weeks
  doc.weeklyHistory.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  doc.weeklyHistory = doc.weeklyHistory.slice(0, 12);

  return doc.save();
};

function getISOWeek(date) {
  const d   = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const year = d.getFullYear();
  const week = Math.ceil(((d - new Date(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export default mongoose.models.Score || mongoose.model('Score', ScoreSchema);

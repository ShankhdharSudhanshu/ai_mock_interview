import mongoose from 'mongoose';

/** Tracks which questions each user has already seen — prevents repetition */
const UserProgressSchema = new mongoose.Schema(
  {
    userId:        { type: String, required: true, unique: true },
    seenQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    // Per-category progress
    categoryStats: [{
      category:    String,
      seen:        { type: Number, default: 0 },
      avgScore:    { type: Number, default: 0 },
      // Derived difficulty preference based on performance
      targetDiff:  { type: String, enum: ['easy','medium','hard'], default: 'medium' },
    }],
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UserProgressSchema.index({ userId: 1 });

/**
 * Update user progress after an interview session.
 * Adjusts targetDifficulty per category based on score:
 *   score >= 8  → bump to harder
 *   score >= 6  → keep current
 *   score <  6  → drop to easier
 */
UserProgressSchema.statics.recordSession = async function(userId, { category, score, questionIds }) {
  let doc = await this.findOne({ userId });
  if (!doc) doc = new this({ userId });

  // Mark questions as seen
  const newIds = questionIds.filter(id => !doc.seenQuestions.map(s => s.toString()).includes(id.toString()));
  doc.seenQuestions.push(...newIds);

  // Trim seen list to last 200 to avoid unbounded growth
  if (doc.seenQuestions.length > 200) doc.seenQuestions = doc.seenQuestions.slice(-200);

  // Update category stat
  let stat = doc.categoryStats.find(c => c.category === category);
  if (!stat) {
    stat = { category, seen: 0, avgScore: 0, targetDiff: 'medium' };
    doc.categoryStats.push(stat);
    stat = doc.categoryStats[doc.categoryStats.length - 1];
  }
  stat.seen   += questionIds.length;
  stat.avgScore = parseFloat(((stat.avgScore + score) / 2).toFixed(2));
  if (score >= 8)      stat.targetDiff = 'hard';
  else if (score >= 6) stat.targetDiff = 'medium';
  else                 stat.targetDiff = 'easy';

  doc.lastUpdated = new Date();
  return doc.save();
};

export default mongoose.models.UserProgress || mongoose.model('UserProgress', UserProgressSchema);

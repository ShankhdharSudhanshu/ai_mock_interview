import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema(
  {
    // ── Core ────────────────────────────────────────────────────
    text:     { type: String, required: true, trim: true },
    category: {
      type: String, required: true, lowercase: true,
      enum: ['frontend','backend','fullstack','dsa','system-design','hr','data-science','devops','product-manager','behavioral'],
    },
    difficulty: { type: String, enum: ['easy','medium','hard'], default: 'medium' },
    tags:       [{ type: String, lowercase: true, trim: true }],  // e.g. ['arrays','react','sql']

    // ── Metadata for Evaluation ──────────────────────────────────
    expectedAnswer: { type: String },                // Model answer / key talking points
    keywords:       [{ type: String }],              // Keywords evaluator should detect
    timeLimit:      { type: Number, default: 120 },  // seconds per question

    // ── Tracking ─────────────────────────────────────────────────
    source:     { type: String, enum: ['manual','ai-generated','bulk-upload'], default: 'manual' },
    isActive:   { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },   // cumulative score to calc avg
    avgScore:   { type: Number, default: 0 },   // rolling average candidate score
    createdBy:  { type: String },               // admin supabase user ID
  },
  { timestamps: true }
);

// Indexes for fast filtered queries
QuestionSchema.index({ category: 1, difficulty: 1, isActive: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ category: 1, tags: 1, difficulty: 1 });
QuestionSchema.index({ usageCount: 1 });

export default mongoose.models.Question || mongoose.model('Question', QuestionSchema);

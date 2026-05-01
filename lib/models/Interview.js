import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema({
  question:     { type: String, required: true },
  answer:       { type: String, default: '' },
  score:        { type: Number, min: 0, max: 10 },
  feedback:     { type: String },
  strengths:    [{ type: String }],
  improvements: [{ type: String }],
}, { _id: false });

const InterviewSchema = new mongoose.Schema(
  {
    userId:        { type: String, required: true, index: true },  // supabase user ID or 'demo-*'
    sessionId:     { type: String, unique: true, sparse: true },   // e.g. "session-1712345678"
    category:      { type: String, required: true },
    score:         { type: Number, min: 0, max: 10 },              // average
    totalQuestions:{ type: Number },
    answers:       [AnswerSchema],
    source:        { type: String, enum: ['web', 'voice-agent'], default: 'web' },
    completedAt:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound indexes for efficient querying
InterviewSchema.index({ userId: 1, completedAt: -1 });
InterviewSchema.index({ userId: 1, category: 1 });
InterviewSchema.index({ userId: 1, score: -1 });

export default mongoose.models.Interview || mongoose.model('Interview', InterviewSchema);

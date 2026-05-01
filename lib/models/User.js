import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    supabaseId: { type: String, unique: true, sparse: true },   // links to Supabase auth.users
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    name:       { type: String, trim: true },
    avatarUrl:  { type: String },
    role:       { type: String, enum: ['candidate', 'admin'], default: 'candidate' },
    plan:       { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    skills:     [{ type: String }],
    bio:        { type: String, maxlength: 500 },
    resumeUrl:  { type: String },
    // Stats — denormalized for fast reads
    totalInterviews: { type: Number, default: 0 },
    averageScore:    { type: Number, default: 0 },
    bestScore:       { type: Number, default: 0 },
    lastActivityAt:  { type: Date },
  },
  { timestamps: true }  // adds createdAt + updatedAt automatically
);

UserSchema.index({ email: 1 });
UserSchema.index({ supabaseId: 1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);

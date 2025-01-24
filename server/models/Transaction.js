import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  title: { type: String, required: true },
  description: { type: String },
  categoryId: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Add an index for faster sorting
transactionSchema.index({ createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
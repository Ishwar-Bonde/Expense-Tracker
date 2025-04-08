import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String }, // Category name (e.g., 'Loans')
  categoryId: { type: String }, // Optional reference to category ID
  amount: { type: Number, required: true },
  originalAmount: { type: Number }, // Original amount before currency conversion
  currency: { type: String, required: true },
  originalCurrency: { type: String }, // Original currency before conversion
  date: { type: Date, required: true },
  paymentMethod: { type: String }, // Added for loan payments
  notes: { type: String }, // Added for loan payment notes
  isRecurring: { type: Boolean, default: false },
  recurringTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringTransaction' },
  recurringDetails: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
    startDate: { type: Date },
    endDate: { type: Date },
    lastProcessedDate: { type: Date },
    nextDueDate: { type: Date }
  },
  icon: { type: String },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Add indexes for faster querying
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ recurringTransactionId: 1 });
transactionSchema.index({ isRecurring: 1 });
transactionSchema.index({ 'recurringDetails.nextDueDate': 1 });
transactionSchema.index({ category: 1 }); // Add index for category queries

export default mongoose.model('Transaction', transactionSchema);
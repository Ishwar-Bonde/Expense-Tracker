import mongoose from 'mongoose';

const recurringTransactionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  originalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true
  },
  originalCurrency: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  lastProcessed: {
    type: Date
  },
  nextDueDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Calculate next due date based on frequency
recurringTransactionSchema.methods.calculateNextDueDate = function() {
  const currentDate = this.lastProcessed || this.startDate;
  const nextDate = new Date(currentDate);

  switch (this.frequency.toLowerCase()) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
};

// Update lastProcessed and nextDueDate
recurringTransactionSchema.methods.updateProcessingDates = async function() {
  const now = new Date();
  this.lastProcessed = now;
  this.nextDueDate = this.calculateNextDueDate();
  
  if (this.endDate && this.nextDueDate > this.endDate) {
    this.isActive = false;
  }
  
  return this.save();
};

const RecurringTransaction = mongoose.model('RecurringTransaction', recurringTransactionSchema);

export default RecurringTransaction;

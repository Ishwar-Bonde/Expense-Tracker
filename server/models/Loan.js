import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  method: {
    type: String,
    enum: ['cash', 'bank_transfer', 'upi', 'other'],
    default: 'cash'
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  }
});

const loanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['given', 'taken'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  paymentFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one-time'],
    required: true
  },
  installmentAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'defaulted'],
    default: 'active'
  },
  contact: {
    name: {
      type: String,
      required: true
    },
    phone: String,
    email: String,
    relationship: String
  },
  documents: [{
    title: String,
    url: String,
    type: String
  }],
  payments: [paymentSchema],
  remainingAmount: {
    type: Number,
    required: true,
    min: 0
  },
  totalInterestPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  nextPaymentDate: Date,
  reminderEnabled: {
    type: Boolean,
    default: true
  },
  reminderDays: {
    type: Number,
    default: 3,
    min: 0
  }
}, {
  timestamps: true
});

// Pre-save middleware to update next payment date
loanSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('startDate') || this.isModified('paymentFrequency')) {
    const nextDate = this.calculateNextPaymentDate();
    if (nextDate) {
      this.nextPaymentDate = nextDate;
    }
  }
  next();
});

// Methods
loanSchema.methods.calculateNextPaymentDate = function() {
  const today = new Date();
  if (this.status === 'completed' || today > this.endDate) {
    return null;
  }

  let nextDate = new Date(this.startDate);
  while (nextDate <= today) {
    switch (this.paymentFrequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'one-time':
        return this.endDate;
    }
  }

  return nextDate > this.endDate ? this.endDate : nextDate;
};

const Loan = mongoose.model('Loan', loanSchema);

export default Loan;

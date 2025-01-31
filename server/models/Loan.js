import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['given', 'taken'],
    required: true
  },
  purpose: {
    type: String,
    enum: ['education', 'personal', 'home', 'vehicle', 'business', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  paymentFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', 'one-time'],
    required: true
  },
  nextPaymentDate: {
    type: Date,
    required: true,
    default: function() {
      return this.startDate;
    }
  },
  contact: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    relationship: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  collateral: {
    type: {
      type: String,
      enum: ['property', 'vehicle', 'jewelry', 'investment', 'other', 'none'],
      default: 'none'
    },
    description: {
      type: String,
      trim: true
    },
    value: {
      type: Number,
      min: 0
    },
    documents: [{
      title: String,
      url: String,
      uploadDate: Date
    }]
  },
  guarantor: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    relationship: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'defaulted', 'cancelled'],
    default: 'active'
  },
  paymentHistory: [{
    amount: Number,
    date: Date,
    type: {
      type: String,
      enum: ['principal', 'interest', 'penalty'],
      required: true
    },
    notes: String
  }],
  remainingAmount: {
    type: Number,
    min: 0
  },
  penalties: {
    rate: {
      type: Number,
      min: 0,
      default: 0
    },
    amount: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  documents: [{
    title: String,
    type: {
      type: String,
      enum: ['agreement', 'id_proof', 'address_proof', 'income_proof', 'other'],
      required: true
    },
    url: String,
    uploadDate: Date
  }],
  notes: [{
    content: String,
    date: {
      type: Date,
      default: Date.now
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

// Middleware to update remainingAmount before saving
loanSchema.pre('save', function(next) {
  if (this.isNew) {
    this.remainingAmount = this.amount;
  }
  next();
});

// Calculate EMI
loanSchema.methods.calculateEMI = function() {
  const P = this.amount;
  const R = this.interestRate / 1200; // Convert annual rate to monthly and percentage to decimal
  const N = this.getTotalInstallments();
  
  if (R === 0) return P / N;
  
  return P * R * Math.pow(1 + R, N) / (Math.pow(1 + R, N) - 1);
};

// Get total number of installments
loanSchema.methods.getTotalInstallments = function() {
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);
  const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                    (endDate.getMonth() - startDate.getMonth());
  
  switch(this.paymentFrequency) {
    case 'monthly': return monthsDiff;
    case 'quarterly': return Math.ceil(monthsDiff / 3);
    case 'yearly': return Math.ceil(monthsDiff / 12);
    case 'one-time': return 1;
    default: return monthsDiff;
  }
};

// Calculate next payment date
loanSchema.methods.calculateNextPaymentDate = function() {
  if (!this.startDate) {
    return null;
  }

  const startDate = new Date(this.startDate);
  const today = new Date();
  
  // For new loans, use startDate as the base
  if (this.isNew) {
    let nextDate = new Date(startDate);
    
    // For one-time payments, use endDate if available, otherwise startDate
    if (this.paymentFrequency === 'one-time') {
      return this.endDate || startDate;
    }
    
    // For recurring payments, calculate first payment date
    switch (this.paymentFrequency) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    return nextDate;
  }
  
  // For existing loans
  let nextDate = new Date(this.nextPaymentDate || startDate);
  
  // If next payment date is in the past
  while (nextDate <= today) {
    switch (this.paymentFrequency) {
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
        return this.endDate || startDate;
    }
  }
  
  return nextDate;
};

// Update next payment date before saving
loanSchema.pre('save', async function(next) {
  try {
    // For new loans or when relevant fields are modified
    if (this.isNew || this.isModified('startDate') || this.isModified('paymentFrequency') || this.isModified('endDate')) {
      const nextDate = this.calculateNextPaymentDate();
      if (!nextDate) {
        throw new Error('Unable to calculate next payment date. Please ensure start date is provided.');
      }
      this.nextPaymentDate = nextDate;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Update loan status based on payments
loanSchema.methods.updateStatus = function() {
  const today = new Date();
  const endDate = new Date(this.endDate);
  
  if (this.remainingAmount <= 0) {
    this.status = 'completed';
  } else if (today > endDate && this.remainingAmount > 0) {
    this.status = 'defaulted';
  } else {
    this.status = 'active';
  }
};

const Loan = mongoose.model('Loan', loanSchema);

export default Loan;

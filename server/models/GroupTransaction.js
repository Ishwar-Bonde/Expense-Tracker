import mongoose from 'mongoose';

const groupTransactionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  date: {
    type: Date,
    default: Date.now
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true
  },
  splitType: {
    type: String,
    enum: ['equal', 'custom'],
    default: 'equal'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  splits: [{
    _id: false, // Disable automatic _id for subdocuments
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'settled'],
      default: 'pending'
    },
    settledAt: Date
  }],
  status: {
    type: String,
    enum: ['pending', 'partially_settled', 'settled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to calculate split amounts for equal distribution
groupTransactionSchema.methods.calculateEqualSplits = function(participants) {
  const amountPerPerson = this.amount / participants.length;
  this.splits = participants.map(participant => ({
    user: participant.userId,
    amount: amountPerPerson,
    status: participant.userId.toString() === this.paidBy.toString() ? 'settled' : 'pending'
  }));
};

// Method to update transaction status based on settlements
groupTransactionSchema.methods.updateStatus = function() {
  const totalSplits = this.splits.length;
  const settledSplits = this.splits.filter(split => split.status === 'settled').length;
  
  if (settledSplits === 0) {
    this.status = 'pending';
  } else if (settledSplits === totalSplits) {
    this.status = 'settled';
  } else {
    this.status = 'partially_settled';
  }
};

// Middleware to automatically update status before saving
groupTransactionSchema.pre('save', function(next) {
  this.updateStatus();
  next();
});

// Add indexes for better query performance
groupTransactionSchema.index({ groupId: 1, date: -1 });
groupTransactionSchema.index({ paidBy: 1 });
groupTransactionSchema.index({ 'splits.user': 1 });

const GroupTransaction = mongoose.model('GroupTransaction', groupTransactionSchema);

export default GroupTransaction;

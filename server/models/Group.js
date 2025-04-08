import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true,
    default: ''
  },
  members: [{
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    role: { 
      type: String, 
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    defaultCurrency: {
      type: String,
      default: 'INR'
    },
    budgetLimit: {
      type: Number,
      default: 0
    },
    expenseCategories: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      color: {
        type: String,
        required: true,
        default: '#6366F1'
      },
      icon: {
        type: String,
        required: true,
        default: '💰'
      }
    }],
    notificationPreferences: {
      expenseAlerts: {
        type: Boolean,
        default: true
      },
      budgetAlerts: {
        type: Boolean,
        default: true
      },
      memberUpdates: {
        type: Boolean,
        default: true
      }
    },
    splitPreferences: {
      defaultSplitType: {
        type: String,
        enum: ['equal', 'percentage', 'amount'],
        default: 'equal'
      }
    }
  },
  statistics: {
    totalExpenses: {
      type: Number,
      default: 0
    },
    monthlyExpenses: {
      type: Number,
      default: 0
    },
    lastUpdateDate: {
      type: Date,
      default: Date.now
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Add indexes for faster querying
groupSchema.index({ name: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ createdBy: 1 });

// Method to update group statistics
groupSchema.methods.updateStatistics = async function() {
  const GroupTransaction = mongoose.model('GroupTransaction');
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalExpenses, monthlyExpenses] = await Promise.all([
    GroupTransaction.aggregate([
      { $match: { groupId: this._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    GroupTransaction.aggregate([
      { 
        $match: { 
          groupId: this._id,
          date: { $gte: firstDayOfMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  this.statistics.totalExpenses = totalExpenses[0]?.total || 0;
  this.statistics.monthlyExpenses = monthlyExpenses[0]?.total || 0;
  this.statistics.lastUpdateDate = now;

  await this.save();
};

const Group = mongoose.model('Group', groupSchema);

export default Group;

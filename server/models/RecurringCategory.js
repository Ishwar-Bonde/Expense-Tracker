import mongoose from 'mongoose';

const recurringCategorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['income', 'expense', 'both'],
    required: true
  },
  color: {
    type: String,
    required: true,
    default: '#000000'
  },
  icon: {
    type: String,
    required: true,
    default: '💰'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index to ensure unique categories per user
recurringCategorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

export default mongoose.model('RecurringCategory', recurringCategorySchema);

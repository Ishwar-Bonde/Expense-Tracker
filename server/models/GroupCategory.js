import mongoose from 'mongoose';

const groupCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    default: '#6366F1'
  },
  icon: {
    type: String,
    default: '💰'
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for faster queries
groupCategorySchema.index({ groupId: 1, name: 1 }, { unique: true });

const GroupCategory = mongoose.model('GroupCategory', groupCategorySchema);

export default GroupCategory;

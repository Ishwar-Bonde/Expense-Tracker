import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
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
    enum: ['income', 'expense'],
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
    default: 'default'
  },
  budgetLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Add compound index to ensure unique categories per user
categorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);
export default Category;
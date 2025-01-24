import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  budgetLimit: {
    type: Number,
    default: 0
  },
  savingsGoal: {
    type: Number,
    default: 0
  },
  notifications: {
    budgetAlerts: {
      type: Boolean,
      default: true
    }
  }
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;

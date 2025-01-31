import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error', 'recurring'],
    default: 'info'
  },
  status: {
    type: String,
    enum: ['unread', 'read'],
    default: 'unread'
  },
  relatedTo: {
    type: String,
    enum: ['transaction', 'recurring', 'budget', 'system'],
    default: 'system'
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedTo'
  },
  scheduledFor: {
    type: Date
  },
  amount: {
    type: Number
  },
  currency: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

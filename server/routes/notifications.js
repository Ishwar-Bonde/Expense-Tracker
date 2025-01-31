import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Notification from '../models/Notification.js';
import RecurringTransaction from '../models/RecurringTransaction.js';

const router = express.Router();

// Get all notifications for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      userId: req.user.id 
    }).sort({ createdAt: -1 });
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: 'read' },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create upcoming recurring transaction notifications
export async function createRecurringNotifications() {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    
    // Find recurring transactions due in the next 3 days
    const upcomingTransactions = await RecurringTransaction.find({
      isActive: true,
      nextDueDate: {
        $gte: now,
        $lte: threeDaysFromNow
      }
    }).populate('categoryId');

    for (const transaction of upcomingTransactions) {
      // Check if notification already exists
      const existingNotification = await Notification.findOne({
        relatedId: transaction._id,
        scheduledFor: transaction.nextDueDate,
        status: 'unread'
      });

      if (!existingNotification) {
        const daysUntilDue = Math.ceil((transaction.nextDueDate - now) / (1000 * 60 * 60 * 24));
        
        await Notification.create({
          userId: transaction.userId,
          title: 'Upcoming Recurring Transaction',
          message: `Your ${transaction.frequency.toLowerCase()} payment for ${transaction.title} of ${transaction.amount} ${transaction.currency} is due in ${daysUntilDue} days.`,
          type: 'recurring',
          relatedTo: 'recurring',
          relatedId: transaction._id,
          scheduledFor: transaction.nextDueDate,
          amount: transaction.amount,
          currency: transaction.currency
        });
      }
    }
  } catch (error) {
    console.error('Error creating recurring notifications:', error);
  }
}

// Get unread notification count
router.get('/unread/count', authenticateToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      status: 'unread'
    });
    
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, status: 'unread' },
      { status: 'read' }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

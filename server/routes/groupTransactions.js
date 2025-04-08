import express from 'express';
import GroupTransaction from '../models/GroupTransaction.js';
import Group from '../models/Group.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all transactions for a group
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of the group
    const group = await Group.findOne({
      _id: groupId,
      'members.user': userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or access denied' });
    }

    const transactions = await GroupTransaction.find({ groupId })
      .populate('paidBy.user', 'name email')
      .populate('splits.user', 'name email')
      .populate('createdBy', 'name email')
      .sort({ date: -1 });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching group transactions:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// Create a new split transaction
router.post('/:groupId/transactions', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { 
      title, 
      description, 
      amount, 
      currency, 
      category,
      splitType = 'equal',
      participants
    } = req.body;
    
    const paidBy = req.user.id;

    // Validate group membership
    const group = await Group.findOne({
      _id: groupId,
      'members.user': paidBy
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or access denied' });
    }

    // Validate all participants are group members
    const invalidParticipants = participants.filter(p => 
      !group.members.some(member => member.user.toString() === p.userId.toString())
    );

    if (invalidParticipants.length > 0) {
      return res.status(400).json({
        message: 'Some participants are not group members',
        invalidParticipants
      });
    }

    // Create transaction
    const transaction = new GroupTransaction({
      title,
      description,
      amount: Number(amount),
      currency: currency || group.settings?.defaultCurrency || 'INR',
      category,
      groupId,
      paidBy,
      splitType,
      createdBy: req.user.id
    });

    // Calculate splits based on split type
    if (splitType === 'equal') {
      transaction.calculateEqualSplits(participants);
    } else {
      // Handle custom splits if needed
      transaction.splits = participants.map(participant => ({
        user: participant.userId,
        amount: participant.amount,
        status: participant.userId === paidBy ? 'settled' : 'pending'
      }));
    }

    await transaction.save();

    // Populate user details
    await transaction.populate([
      { path: 'paidBy', select: 'firstName lastName email' },
      { path: 'splits.user', select: 'firstName lastName email' },
      { path: 'createdBy', select: 'firstName lastName email' }
    ]);

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating split transaction:', error);
    res.status(500).json({ 
      message: 'Failed to create split transaction',
      error: error.message 
    });
  }
});

// Settle a split payment
router.post('/:transactionId/settle', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;

    const transaction = await GroupTransaction.findById(transactionId)
      .populate('paidBy', 'firstName lastName email')
      .populate('splits.user', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Find user's split
    const userSplit = transaction.splits.find(
      split => split.user._id.toString() === userId
    );

    if (!userSplit) {
      return res.status(400).json({ message: 'You are not part of this transaction' });
    }

    if (userSplit.status === 'settled') {
      return res.status(400).json({ message: 'Your share is already settled' });
    }

    if (userId === transaction.paidBy._id.toString()) {
      return res.status(400).json({ message: 'You cannot settle your own payment' });
    }

    // Update split status
    userSplit.status = 'settled';
    userSplit.settledAt = new Date();
    
    // Update transaction status
    transaction.updateStatus();
    await transaction.save();

    res.json(transaction);
  } catch (error) {
    console.error('Error settling split payment:', error);
    res.status(500).json({ 
      message: 'Failed to settle payment',
      error: error.message 
    });
  }
});

// Delete a transaction
router.delete('/:groupId/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { groupId, transactionId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of the group
    const group = await Group.findOne({
      _id: groupId,
      'members.user': userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or access denied' });
    }

    // Find and delete the transaction
    const transaction = await GroupTransaction.findOneAndDelete({
      _id: transactionId,
      groupId
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: 'Failed to delete transaction' });
  }
});

// Update transaction settlement status
router.patch('/:groupId/transactions/:transactionId/settle', async (req, res) => {
  try {
    const { groupId, transactionId } = req.params;
    const userId = req.user.id;
    
    const transaction = await GroupTransaction.findOne({
      _id: transactionId,
      groupId
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Find and update the user's split
    const userSplit = transaction.splits.find(
      split => split.user.toString() === userId
    );

    if (!userSplit) {
      return res.status(400).json({ message: 'You are not part of this transaction' });
    }

    userSplit.settled = true;
    userSplit.settledAt = new Date();

    await transaction.save();

    // Update group statistics
    const group = await Group.findById(groupId);
    await group.updateStatistics();

    res.json(transaction);
  } catch (error) {
    console.error('Error updating settlement status:', error);
    res.status(500).json({ message: 'Failed to update settlement status' });
  }
});

// Get transaction statistics for a group
router.get('/:groupId/statistics', async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of the group
    const group = await Group.findOne({
      _id: groupId,
      'members.user': userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or access denied' });
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthlyStats, categoryStats, memberStats] = await Promise.all([
      // Monthly statistics
      GroupTransaction.aggregate([
        { $match: { groupId: group._id, date: { $gte: firstDayOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Category-wise statistics
      GroupTransaction.aggregate([
        { $match: { groupId: group._id } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ]),
      // Member-wise statistics
      GroupTransaction.aggregate([
        { $match: { groupId: group._id } },
        { $unwind: '$splits' },
        { 
          $group: { 
            _id: '$splits.user',
            totalOwed: { $sum: '$splits.amount' },
            totalPaid: {
              $sum: {
                $cond: [
                  { $eq: ['$paidBy.user', '$splits.user'] },
                  '$amount',
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    res.json({
      monthlyExpenses: monthlyStats[0]?.total || 0,
      categoryBreakdown: categoryStats,
      memberBalances: memberStats
    });
  } catch (error) {
    console.error('Error fetching group statistics:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

export default router;

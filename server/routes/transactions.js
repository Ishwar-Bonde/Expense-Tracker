import express from 'express';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth.js';
import { convertCurrency, formatCurrency } from '../utils/currencyConverter.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || undefined;
    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(limit);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// Add new transaction
router.post('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('defaultCurrency');
    const userCurrency = user.defaultCurrency || 'USD';

    // Validate required fields
    if (!req.body.title || !req.body.amount || !req.body.type || !req.body.categoryId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create the transaction
    const transaction = new Transaction({
      ...req.body,
      userId: req.user.id,
      currency: userCurrency,
      date: req.body.date || new Date()
    });

    await transaction.save();
    
    // Populate the category before sending response
    await transaction.populate('categoryId');
    
    console.log('Created transaction:', transaction); // Debug log
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Failed to create transaction' });
  }
});

// Bulk import transactions
router.post('/bulk', async (req, res) => {
  try {
    const { transactions } = req.body;
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ message: 'Invalid transactions data' });
    }

    const processedTransactions = transactions.map(transaction => ({
      ...transaction,
      userId: req.user.id,
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    }));

    const result = await Transaction.insertMany(processedTransactions);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error importing transactions:', error);
    res.status(500).json({ message: 'Failed to import transactions' });
  }
});

// Bulk delete transactions
router.post('/bulk-delete', async (req, res) => {
  try {
    const { transactionIds } = req.body;
    
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ message: 'No transaction IDs provided' });
    }

    // Verify all transactions belong to the user
    const transactions = await Transaction.find({
      _id: { $in: transactionIds },
      userId: req.user.id
    });

    if (transactions.length !== transactionIds.length) {
      return res.status(403).json({ message: 'Some transactions do not belong to the user' });
    }

    // Delete all transactions
    await Transaction.deleteMany({
      _id: { $in: transactionIds },
      userId: req.user.id
    });

    res.json({ message: 'Transactions deleted successfully', deletedCount: transactions.length });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({ message: 'Error deleting transactions' });
  }
});

// Update a transaction
router.put('/:id', async (req, res) => {
  try {
    const { type, title, description, categoryId, amount, currency, date } = req.body;
    
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Update fields
    transaction.type = type || transaction.type;
    transaction.title = title || transaction.title;
    transaction.description = description || transaction.description;
    transaction.categoryId = categoryId || transaction.categoryId;
    transaction.amount = amount || transaction.amount;
    transaction.currency = currency || transaction.currency;
    transaction.date = date ? new Date(date) : transaction.date;

    await transaction.save();
    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ message: 'Failed to update transaction' });
  }
});

// Delete a transaction
router.delete('/:id', async (req, res) => {
  try {
    console.log('Delete request received:');
    console.log('- Transaction ID:', req.params.id);
    console.log('- User ID:', req.user.id);

    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('Invalid transaction ID format');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid transaction ID format'
      });
    }

    // First, let's check if the transaction exists at all
    const transaction = await Transaction.findById(req.params.id);
    console.log('Transaction found:', transaction);

    if (!transaction) {
      console.log('Transaction not found');
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }

    // Check if the transaction belongs to the user
    if (transaction.userId.toString() !== req.user.id) {
      console.log('Transaction belongs to different user');
      console.log('Transaction user ID:', transaction.userId.toString());
      console.log('Request user ID:', req.user.id);
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this transaction'
      });
    }

    // Delete the transaction
    const deleteResult = await Transaction.findByIdAndDelete(req.params.id);
    console.log('Delete result:', deleteResult);

    if (!deleteResult) {
      console.log('Transaction could not be deleted');
      return res.status(500).json({
        status: 'error',
        message: 'Could not delete transaction'
      });
    }

    console.log('Transaction deleted successfully');
    return res.status(200).json({
      status: 'success',
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error deleting transaction',
      error: error.message
    });
  }
});

export default router;
import express from 'express';
import mongoose from 'mongoose';
import RecurringTransaction from '../models/RecurringTransaction.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { processRecurringTransactions, processMissedTransactions } from '../utils/recurringTransactions.js';
import axios from 'axios';

const router = express.Router();

// Function to convert currency
async function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  
  try {
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
    const rate = response.data.rates[toCurrency];
    if (!rate) throw new Error(`Exchange rate not found for ${toCurrency}`);
    return amount * rate;
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw error;
  }
}

// Get all recurring transactions for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Process any pending transactions first
    await processMissedTransactions(req.user.id);
    
    const user = await User.findById(req.user.id).select('defaultCurrency');
    const userCurrency = user.defaultCurrency || 'USD';

    const recurringTransactions = await RecurringTransaction.find({ 
      userId: req.user.id,
      isActive: true 
    }).sort({ nextDueDate: 1 });

    // Convert amounts to user's currency
    const convertedTransactions = await Promise.all(
      recurringTransactions.map(async (transaction) => {
        const convertedAmount = await convertCurrency(
          transaction.amount,
          transaction.currency,
          userCurrency
        );
        return {
          ...transaction.toObject(),
          amount: convertedAmount,
          originalAmount: transaction.originalAmount,
          originalCurrency: transaction.originalCurrency,
          displayCurrency: userCurrency
        };
      })
    );

    res.json(convertedTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate transaction data
const validateTransactionData = (data) => {
  console.log('=== Validating Transaction Data ===');
  console.log('Input data:', JSON.stringify(data, null, 2));
  const errors = [];
  
  // Required fields
  const requiredFields = {
    title: 'Title',
    amount: 'Amount',
    type: 'Type',
    categoryId: 'Category',
    frequency: 'Frequency',
    startDate: 'Start Date',
    userId: 'User ID'
  };

  // Check for missing or empty fields
  Object.entries(requiredFields).forEach(([field, label]) => {
    console.log(`Checking required field ${field}:`, data[field]);
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors.push(`${label} is required`);
    }
  });

  if (errors.length > 0) {
    console.log('Required field validation errors:', errors);
    return errors;
  }

  // Validate amount
  const amount = Number(data.amount);
  console.log('Validating amount:', { raw: data.amount, parsed: amount });
  if (isNaN(amount)) {
    errors.push('Amount must be a number');
  } else if (amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  // Validate type
  console.log('Validating type:', data.type);
  if (!['income', 'expense'].includes(data.type)) {
    errors.push('Type must be either income or expense');
  }

  // Validate frequency
  console.log('Validating frequency:', data.frequency);
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(data.frequency)) {
    errors.push('Frequency must be daily, weekly, monthly, or yearly');
  }

  // Validate dates
  console.log('Validating dates:', { 
    startDate: data.startDate, 
    endDate: data.endDate 
  });
  
  try {
    const startDate = new Date(data.startDate);
    if (isNaN(startDate.getTime())) {
      errors.push('Invalid start date format');
    }

    if (data.endDate) {
      const endDate = new Date(data.endDate);
      if (isNaN(endDate.getTime())) {
        errors.push('Invalid end date format');
      } else if (endDate < startDate) {
        errors.push('End date must be after start date');
      }
    }
  } catch (error) {
    console.error('Date validation error:', error);
    errors.push('Invalid date format');
  }

  // Validate categoryId
  console.log('Validating categoryId:', data.categoryId);
  if (!mongoose.Types.ObjectId.isValid(data.categoryId)) {
    errors.push('Invalid category ID format');
  }

  // Optional field validations
  if (data.currency && typeof data.currency !== 'string') {
    errors.push('Currency must be a string');
  }

  if (data.icon && typeof data.icon !== 'string') {
    errors.push('Icon must be a string');
  }

  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  }

  console.log('Validation complete. Errors:', errors);
  return errors;
};

// Create a new recurring transaction
router.post('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('defaultCurrency');
    const userCurrency = user.defaultCurrency || 'USD';

    // Store original amount and currency
    const originalAmount = Number(req.body.amount);
    const originalCurrency = req.body.currency;

    // Convert amount if currencies are different
    let convertedAmount = originalAmount;
    if (originalCurrency !== userCurrency) {
      convertedAmount = await convertCurrency(originalAmount, originalCurrency, userCurrency);
    }

    const transactionData = {
      ...req.body,
      amount: convertedAmount,
      currency: userCurrency,
      originalAmount: originalAmount,
      originalCurrency: originalCurrency,
      userId: req.user.id,
      nextDueDate: (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const startDate = new Date(req.body.startDate);
        startDate.setHours(0, 0, 0, 0);

        // If start date is today, calculate next due date from tomorrow
        if (startDate.toISOString().split('T')[0] === today.toISOString().split('T')[0]) {
          startDate.setDate(startDate.getDate() + 1);
        }
        
        const nextDue = new Date(startDate);
        switch (req.body.frequency) {
          case 'daily':
            nextDue.setDate(nextDue.getDate() + 1);
            break;
          case 'weekly':
            nextDue.setDate(nextDue.getDate() + 7);
            break;
          case 'monthly':
            nextDue.setMonth(nextDue.getMonth() + 1);
            break;
          case 'yearly':
            nextDue.setFullYear(nextDue.getFullYear() + 1);
            break;
        }
        return nextDue;
      })()
    };

    console.log('Creating transaction with data:', transactionData);

    const errors = validateTransactionData(transactionData);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const recurringTransaction = new RecurringTransaction(transactionData);
    await recurringTransaction.save();

    res.status(201).json(recurringTransaction);
  } catch (error) {
    console.error('Error creating recurring transaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a recurring transaction
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('=== Update Transaction Request ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User ID:', req.user.id);
    console.log('Transaction ID:', req.params.id);

    // Validate transaction ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('Invalid transaction ID');
      return res.status(400).json({ message: 'Invalid transaction ID' });
    }

    // Find the transaction
    const recurringTransaction = await RecurringTransaction.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!recurringTransaction) {
      console.log('Transaction not found');
      return res.status(404).json({ message: 'Recurring transaction not found' });
    }

    console.log('Found existing transaction:', JSON.stringify(recurringTransaction.toObject(), null, 2));

    const user = await User.findById(req.user.id).select('defaultCurrency');
    const userCurrency = user.defaultCurrency || 'USD';

    // Store original amount and currency
    const originalAmount = Number(req.body.amount);
    const originalCurrency = req.body.currency;

    // Convert amount if currencies are different
    let convertedAmount = originalAmount;
    if (originalCurrency !== userCurrency) {
      convertedAmount = await convertCurrency(originalAmount, originalCurrency, userCurrency);
    }

    const updateData = {
      ...req.body,
      amount: convertedAmount,
      currency: userCurrency,
      originalAmount: originalAmount,
      originalCurrency: originalCurrency
    };

    // Merge updates with existing data for validation
    const mergedData = {
      ...recurringTransaction.toObject(),
      ...updateData,
      userId: req.user.id // Ensure userId is included for validation
    };

    console.log('Merged data for validation:', JSON.stringify(mergedData, null, 2));

    // Validate the merged data
    const validationErrors = validateTransactionData(mergedData);

    if (validationErrors.length > 0) {
      console.log('Validation errors:', validationErrors);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Apply updates to the transaction
    Object.assign(recurringTransaction, updateData);

    // Set lastProcessed to null if startDate changed
    if (updateData.startDate) {
      recurringTransaction.lastProcessed = null;
    }

    // Calculate nextDueDate based on startDate and frequency
    const startDate = new Date(recurringTransaction.startDate);
    if (updateData.startDate || updateData.frequency || !recurringTransaction.nextDueDate) {
      const now = new Date();
      // If start date is in the future, use that as the next due date
      if (startDate > now) {
        recurringTransaction.nextDueDate = startDate;
      } else {
        // Otherwise calculate the next due date from now
        recurringTransaction.lastProcessed = now;
        recurringTransaction.nextDueDate = recurringTransaction.calculateNextDueDate();
      }
    }

    console.log('Transaction before save:', {
      startDate: recurringTransaction.startDate,
      lastProcessed: recurringTransaction.lastProcessed,
      nextDueDate: recurringTransaction.nextDueDate,
      frequency: recurringTransaction.frequency
    });

    // Save the updated transaction
    console.log('Saving updated transaction...');
    await recurringTransaction.save();
    console.log('Transaction saved successfully');

    res.json(recurringTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(400).json({ 
      message: 'Error updating transaction',
      error: error.message
    });
  }
});

// Delete a recurring transaction
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await RecurringTransaction.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id
      },
      { isActive: false },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: 'Recurring transaction not found' });
    }
    
    res.json({ message: 'Recurring transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Process recurring transactions
router.post('/process', authenticateToken, async (req, res) => {
  try {
    console.log('Processing recurring transactions for user:', req.user.id);
    const result = await processMissedTransactions(req.user.id);
    console.log('Processing result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process recurring transactions',
      details: error.message
    });
  }
});

// Get upcoming recurring transactions
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    // First process any pending transactions
    await processMissedTransactions(req.user.id);
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const transactions = await RecurringTransaction.find({
      userId: req.user.id,
      isActive: true,
      nextDueDate: {
        $gte: now,
        $lte: thirtyDaysFromNow
      }
    }).sort({ nextDueDate: 1 });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching upcoming transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming transactions',
      details: error.message
    });
  }
});

export default router;

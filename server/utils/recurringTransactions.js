import RecurringTransaction from '../models/RecurringTransaction.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { sendRecurringTransactionConfirmation } from './emailService.js';

// Process missed transactions when server was down
export async function processMissedTransactions(userId) {
  try {
    const now = new Date();
    console.log(`Processing missed transactions for user ${userId} at ${now}`);
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find all active recurring transactions
    const activeTransactions = await RecurringTransaction.find({
      userId,
      isActive: true
    }).populate('categoryId');

    console.log(`Found ${activeTransactions.length} active recurring transactions`);

    const processedTransactions = [];
    const errors = [];

    for (const recurringTx of activeTransactions) {
      try {
        console.log(`Processing transaction: ${recurringTx.title} (${recurringTx._id})`);
        console.log(`Last processed: ${recurringTx.lastProcessed}, Next due: ${recurringTx.nextDueDate}`);
        
        // Get the reference date (either last processed or start date)
        const startDate = new Date(recurringTx.startDate);
        const lastProcessed = recurringTx.lastProcessed ? new Date(recurringTx.lastProcessed) : null;
        const nextDueDate = new Date(recurringTx.nextDueDate);
        
        // If next due date is in the future, skip this transaction
        if (nextDueDate > now) {
          console.log(`Next due date ${nextDueDate} is in the future, skipping`);
          continue;
        }

        // For first-time processing
        let currentDate = lastProcessed || startDate;
        
        // Ensure we don't create transactions before the start date
        if (currentDate < startDate) {
          currentDate = startDate;
        }

        console.log(`Reference date for processing: ${currentDate}`);

        // Process all missed occurrences up to now
        while (currentDate <= now) {
          const startOfDay = new Date(currentDate);
          startOfDay.setHours(0, 0, 0, 0);
          
          const endOfDay = new Date(startOfDay);
          endOfDay.setHours(23, 59, 59, 999);

          // Check if transaction already exists for this date
          const existingTransaction = await Transaction.findOne({
            userId,
            recurringTransactionId: recurringTx._id,
            date: {
              $gte: startOfDay,
              $lte: endOfDay
            }
          });

          if (existingTransaction) {
            console.log(`Transaction already exists for date: ${currentDate}`);
          } else {
            // For monthly/yearly transactions, check if enough time has passed
            let shouldProcess = true;
            if (recurringTx.frequency === 'monthly' || recurringTx.frequency === 'yearly') {
              const lastProcessedDate = lastProcessed || startDate;
              const monthsDiff = (currentDate.getFullYear() - lastProcessedDate.getFullYear()) * 12 + 
                               (currentDate.getMonth() - lastProcessedDate.getMonth());
              const yearsDiff = currentDate.getFullYear() - lastProcessedDate.getFullYear();
              
              shouldProcess = recurringTx.frequency === 'monthly' ? monthsDiff >= 1 : yearsDiff >= 1;
            }

            if (shouldProcess) {
              console.log(`Creating transaction for date: ${currentDate}`);
              
              // Create the missed transaction
              const transaction = new Transaction({
                userId: recurringTx.userId,
                recurringTransactionId: recurringTx._id,
                type: recurringTx.type,
                title: recurringTx.title,
                description: `Recurring ${recurringTx.frequency} ${recurringTx.type} for ${recurringTx.title}`,
                amount: recurringTx.amount,
                originalAmount: recurringTx.originalAmount,
                currency: recurringTx.currency,
                originalCurrency: recurringTx.originalCurrency,
                categoryId: recurringTx.categoryId,
                icon: recurringTx.icon,
                date: currentDate,
                isRecurring: true,
              });

              const savedTransaction = await transaction.save();
              console.log(`Created transaction: ${savedTransaction._id}`);
              processedTransactions.push(savedTransaction);
            }
          }

          // Move to next occurrence based on frequency
          switch (recurringTx.frequency) {
            case 'daily':
              currentDate.setDate(currentDate.getDate() + 1);
              break;
            case 'weekly':
              currentDate.setDate(currentDate.getDate() + 7);
              break;
            case 'monthly':
              currentDate.setMonth(currentDate.getMonth() + 1);
              break;
            case 'yearly':
              currentDate.setFullYear(currentDate.getFullYear() + 1);
              break;
            default:
              currentDate.setDate(currentDate.getDate() + 1);
          }
        }

        // Calculate next due date
        const nextDate = new Date(currentDate);
        recurringTx.lastProcessed = now;
        recurringTx.nextDueDate = nextDate;
        await recurringTx.save();
        console.log(`Updated recurring transaction. Next due date: ${nextDate}`);

      } catch (error) {
        console.error(`Error processing recurring transaction ${recurringTx._id}:`, error);
        errors.push({ transactionId: recurringTx._id, error: error.message });
      }
    }

    // Send email notification if any transactions were processed
    if (processedTransactions.length > 0) {
      try {
        await sendRecurringTransactionConfirmation(user, processedTransactions);
      } catch (error) {
        console.error('Error sending email notification:', error);
      }
    }

    return {
      success: true,
      processedCount: processedTransactions.length,
      errors: errors
    };

  } catch (error) {
    console.error('Error processing missed transactions:', error);
    throw error;
  }
}

export async function processRecurringTransactions(userId) {
  try {
    await processMissedTransactions(userId);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get user for email notification
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find transactions that are due and haven't been processed today
    const dueTransactions = await RecurringTransaction.find({
      userId,
      isActive: true,
      nextDueDate: { $lte: now },
      $or: [
        { lastProcessed: { $lt: startOfDay } },
        { lastProcessed: null }
      ]
    }).populate('categoryId');

    const processedTransactions = [];
    const errors = [];

    for (const recurringTx of dueTransactions) {
      try {
        // Calculate next due date based on frequency and current due date
        const currentDueDate = new Date(recurringTx.nextDueDate);
        let nextDueDate = new Date(currentDueDate);
        
        switch (recurringTx.frequency) {
          case 'daily':
            nextDueDate.setDate(nextDueDate.getDate() + 1);
            break;
          case 'weekly':
            nextDueDate.setDate(nextDueDate.getDate() + 7);
            break;
          case 'monthly':
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            // Handle month-end cases
            if (currentDueDate.getDate() !== nextDueDate.getDate()) {
              nextDueDate = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth(), 0);
            }
            break;
          case 'yearly':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
          default:
            throw new Error(`Invalid frequency: ${recurringTx.frequency}`);
        }

        // Check if the recurring transaction has ended
        if (recurringTx.endDate && new Date(recurringTx.endDate) < nextDueDate) {
          // Deactivate the recurring transaction
          await RecurringTransaction.findByIdAndUpdate(recurringTx._id, {
            isActive: false,
            lastProcessed: now
          });
          continue;
        }

        // Check if a transaction already exists for this recurring transaction today
        const existingTransaction = await Transaction.findOne({
          recurringTransactionId: recurringTx._id,
          date: {
            $gte: startOfDay,
            $lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
          }
        });

        if (existingTransaction) {
          console.log(`Transaction already exists for ${recurringTx._id} today, skipping...`);
          continue;
        }

        // Create the actual transaction
        const transaction = new Transaction({
          userId: recurringTx.userId,
          recurringTransactionId: recurringTx._id,
          type: recurringTx.type,
          title: recurringTx.title,
          description: recurringTx.description || `Recurring ${recurringTx.frequency} ${recurringTx.type} for ${recurringTx.title}`,
          amount: recurringTx.amount,
          originalAmount: recurringTx.originalAmount,
          currency: recurringTx.currency,
          originalCurrency: recurringTx.originalCurrency,
          categoryId: recurringTx.categoryId,
          icon: recurringTx.icon,
          date: currentDueDate,
          tags: ['recurring']
        });

        await transaction.save();

        // Update the recurring transaction with new dates
        await RecurringTransaction.findByIdAndUpdate(recurringTx._id, {
          lastProcessed: now,
          nextDueDate: nextDueDate
        });

        processedTransactions.push({
          transactionId: transaction._id,
          recurringTransactionId: recurringTx._id,
          nextDueDate
        });

        // Send email notification if enabled
        if (user.emailNotifications?.recurringTransactions) {
          await sendRecurringTransactionConfirmation(
            user.email,
            transaction,
            nextDueDate
          );
        }

      } catch (error) {
        console.error(`Error processing recurring transaction ${recurringTx._id}:`, error);
        errors.push({
          recurringTransactionId: recurringTx._id,
          error: error.message
        });
      }
    }

    return {
      success: true,
      processedCount: processedTransactions.length,
      processedTransactions,
      errors
    };

  } catch (error) {
    console.error('Error in processRecurringTransactions:', error);
    throw error;
  }
}

// Get upcoming recurring transactions
export async function getUpcomingRecurringTransactions(userId, minutesThreshold = 5) {
  try {
    const now = new Date();
    const thresholdTime = new Date(now.getTime() + (minutesThreshold * 60 * 1000));

    console.log(`Checking for upcoming transactions between ${now.toISOString()} and ${thresholdTime.toISOString()}`);

    const transactions = await Transaction.find({
      userId,
      isRecurring: true,
      'recurringDetails.nextDueDate': {
        $gte: now,
        $lte: thresholdTime
      }
    })
    .populate('categoryId')
    .sort({ 'recurringDetails.nextDueDate': 1 });

    console.log(`Found ${transactions.length} upcoming transactions`);
    return transactions;
  } catch (error) {
    console.error('Error getting upcoming transactions:', error);
    throw error;
  }
}

// Get processed recurring transactions
export async function getProcessedRecurringTransactions(userId) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  return await Transaction.find({
    userId,
    isRecurring: true,
    'recurringDetails.lastProcessedDate': {
      $gte: yesterday,
      $lt: now
    }
  })
  .populate('categoryId')
  .sort({ 'recurringDetails.lastProcessedDate': -1 });
}

// Get active recurring transactions
export async function getActiveRecurringTransactions(userId) {
  return await Transaction.find({
    userId,
    isRecurring: true,
    'recurringDetails.endDate': { $gt: new Date() }
  })
  .populate('categoryId')
  .sort({ 'recurringDetails.nextDueDate': 1 });
}

// Function to schedule next check based on upcoming transactions
export async function scheduleNextTransactionCheck(userId) {
  try {
    const recurringTransactions = await RecurringTransaction.find({ userId });
    const now = new Date();
    let nextCheckTime = null;

    for (const tx of recurringTransactions) {
      const nextDueDate = new Date(tx.nextDueDate);
      const warningTime = new Date(nextDueDate.getTime() - 5 * 60000); // 5 minutes before

      if (warningTime > now) {
        if (!nextCheckTime || warningTime < nextCheckTime) {
          nextCheckTime = warningTime;
        }
      }
    }

    return nextCheckTime;
  } catch (error) {
    console.error('Error scheduling next check:', error);
    throw error;
  }
}

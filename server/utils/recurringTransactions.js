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

    // Sort transactions by their next due date
    activeTransactions.sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));

    for (const recurringTx of activeTransactions) {
      try {
        console.log(`Processing transaction: ${recurringTx.title} (${recurringTx._id})`);
        console.log(`Last processed: ${recurringTx.lastProcessed}, Next due: ${recurringTx.nextDueDate}`);
        
        const startDate = new Date(recurringTx.startDate);
        const lastProcessed = recurringTx.lastProcessed ? new Date(recurringTx.lastProcessed) : null;
        const nextDueDate = new Date(recurringTx.nextDueDate);
        
        if (nextDueDate > now) {
          console.log(`Next due date ${nextDueDate} is in the future, skipping`);
          continue;
        }

        let currentDate = lastProcessed || startDate;
        if (currentDate < startDate) {
          currentDate = startDate;
        }

        console.log(`Reference date for processing: ${currentDate}`);

        // Process each missed occurrence one at a time
        while (currentDate <= now) {
          const startOfDay = new Date(currentDate);
          startOfDay.setHours(0, 0, 0, 0);
          
          const endOfDay = new Date(startOfDay);
          endOfDay.setHours(23, 59, 59, 999);

          const existingTransaction = await Transaction.findOne({
            userId,
            recurringTransactionId: recurringTx._id,
            date: {
              $gte: startOfDay,
              $lte: endOfDay
            }
          });

          if (!existingTransaction) {
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
                date: new Date(currentDate),
                isRecurring: true
              });

              // Save transaction
              await transaction.save();

              // Update recurring transaction's last processed date
              recurringTx.lastProcessed = currentDate;
              await recurringTx.save();

              // Send email notification with correct financial data
              try {
                const populatedUser = await User.findById(userId).populate('categories');
                await sendRecurringTransactionConfirmation(populatedUser, transaction);
                
                // Add delay between processing transactions to ensure correct order
                await new Promise(resolve => setTimeout(resolve, 1000));
              } catch (emailError) {
                console.error('Error sending confirmation email:', emailError);
              }

              processedTransactions.push(transaction);
            }
          }

          // Increment date based on frequency
          if (recurringTx.frequency === 'daily') {
            currentDate.setDate(currentDate.getDate() + 1);
          } else if (recurringTx.frequency === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
          } else if (recurringTx.frequency === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
          } else if (recurringTx.frequency === 'yearly') {
            currentDate.setFullYear(currentDate.getFullYear() + 1);
          }
        }

        // Update next due date
        recurringTx.nextDueDate = calculateNextDueDate(new Date(), recurringTx.frequency);
        await recurringTx.save();

      } catch (error) {
        console.error(`Error processing recurring transaction ${recurringTx._id}:`, error);
        errors.push({ transactionId: recurringTx._id, error: error.message });
      }
    }

    return {
      success: true,
      processedTransactions,
      errors
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

    // Find recurring transactions that are due soon
    const transactions = await RecurringTransaction.find({
      userId,
      isActive: true,
      nextDueDate: {
        $gte: now,
        $lte: thresholdTime
      }
    })
    .populate('categoryId')
    .sort({ nextDueDate: 1 });

    console.log(`Found ${transactions.length} upcoming recurring transactions`);
    
    // Map transactions to include all necessary information
    const mappedTransactions = transactions.map(tx => ({
      _id: tx._id,
      title: tx.title,
      amount: tx.amount,
      currency: tx.currency,
      type: tx.type,
      categoryId: tx.categoryId,
      description: tx.description,
      nextDueDate: tx.nextDueDate,
      frequency: tx.frequency
    }));

    return mappedTransactions;
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

function calculateNextDueDate(currentDate, frequency) {
  let nextDueDate = new Date(currentDate);
  switch (frequency) {
    case 'daily':
      nextDueDate.setDate(nextDueDate.getDate() + 1);
      break;
    case 'weekly':
      nextDueDate.setDate(nextDueDate.getDate() + 7);
      break;
    case 'monthly':
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
      break;
    default:
      throw new Error(`Invalid frequency: ${frequency}`);
  }
  return nextDueDate;
}
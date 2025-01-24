import RecurringTransaction from '../models/RecurringTransaction.js';
import Transaction from '../models/Transaction.js';

export async function processRecurringTransactions(userId) {
  try {
    const now = new Date();
    const dueTransactions = await RecurringTransaction.find({
      userId,
      isActive: true,
      nextDueDate: { $lte: now }
    });

    const processedTransactions = [];

    for (const recurringTx of dueTransactions) {
      // Create the actual transaction
      const transaction = new Transaction({
        userId: recurringTx.userId,
        type: recurringTx.type,
        title: recurringTx.title,
        description: recurringTx.description,
        categoryId: recurringTx.categoryId,
        amount: {
          original: recurringTx.amount,
          usd: recurringTx.amount // You might want to add currency conversion here
        },
        currency: recurringTx.currency || 'USD',
        date: recurringTx.nextDueDate,
        isRecurring: true,
        recurringTransactionId: recurringTx._id
      });

      await transaction.save();
      processedTransactions.push(transaction);

      // Update the recurring transaction
      recurringTx.lastProcessed = recurringTx.nextDueDate;
      recurringTx.nextDueDate = recurringTx.calculateNextDueDate();
      
      if (recurringTx.nextDueDate) {
        await recurringTx.save();
      } else {
        // If no next due date (e.g., past end date), mark as inactive
        recurringTx.isActive = false;
        await recurringTx.save();
      }
    }

    return {
      processed: processedTransactions.length,
      transactions: processedTransactions
    };
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
    throw error;
  }
}

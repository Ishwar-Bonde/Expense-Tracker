import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

export async function getFinancialInsights(userId, newTransactions = [], currency = 'INR') {
  try {
    console.log('=== Getting Financial Insights ===');
    console.log('New Transactions:', JSON.stringify(newTransactions, null, 2));
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const newTransaction = newTransactions[0] || { amount: 0, type: 'expense', _id: null };
    console.log('Processing transaction:', JSON.stringify(newTransaction, null, 2));

    // First get ALL transactions for this month to see what we have
    const allMonthlyTransactions = await Transaction.find({
      userId: userId,
      date: { 
        $gte: startOfMonth, 
        $lte: endOfMonth 
      }
    }).select('amount type title date');

    console.log('All Monthly Transactions:', JSON.stringify(allMonthlyTransactions.map(t => ({
      id: t._id,
      title: t.title,
      type: t.type,
      amount: t.amount,
      date: t.date
    })), null, 2));
    
    // Get monthly transactions
    const monthlyTransactions = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { 
            $gte: startOfMonth, 
            $lte: endOfMonth 
          }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          transactions: { 
            $push: { 
              id: '$_id', 
              title: '$title',
              amount: '$amount', 
              date: '$date',
              isRecurring: '$isRecurring'
            } 
          }
        }
      }
    ]);

    console.log('Monthly Aggregated Totals:', JSON.stringify(monthlyTransactions, null, 2));

    // Calculate monthly totals
    let monthlyExpenses = monthlyTransactions.find(t => t._id === 'expense')?.total || 0;
    let monthlyIncome = monthlyTransactions.find(t => t._id === 'income')?.total || 0;

    console.log('Initial Monthly Totals:', {
      income: monthlyIncome,
      expenses: monthlyExpenses
    });

    // Only add new transaction if it's not recurring (recurring ones are already in DB)
    if (newTransaction._id && !newTransaction.isRecurring) {
      console.log('Adding non-recurring transaction to totals:', newTransaction);
      if (newTransaction.type === 'income') {
        monthlyIncome += newTransaction.amount || 0;
      } else {
        monthlyExpenses += newTransaction.amount || 0;
      }
    }

    console.log('Final Monthly Totals:', {
      income: monthlyIncome,
      expenses: monthlyExpenses
    });

    // Get all transactions for total balance
    const allTransactions = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Calculate total balance
    const totalIncome = allTransactions.find(t => t._id === 'income')?.total || 0;
    const totalExpenses = allTransactions.find(t => t._id === 'expense')?.total || 0;
    const currentBalance = totalIncome - totalExpenses;

    // Calculate remaining balance
    const remainingBalance = newTransaction.type === 'expense' 
      ? currentBalance - (newTransaction.isRecurring ? 0 : (newTransaction.amount || 0))
      : currentBalance + (newTransaction.isRecurring ? 0 : (newTransaction.amount || 0));

    const result = {
      monthlyOverview: {
        income: monthlyIncome,
        expenses: monthlyExpenses,
        balance: currentBalance,
        currency
      },
      recurringImpact: {
        amount: newTransaction.amount || 0,
        remainingBalance,
        currency
      }
    };

    console.log('Final result:', result);
    return result;
  } catch (error) {
    console.error('Error getting financial insights:', error);
    return {
      monthlyOverview: { income: 0, expenses: 0, balance: 0, currency },
      recurringImpact: { amount: 0, remainingBalance: 0, currency }
    };
  }
}

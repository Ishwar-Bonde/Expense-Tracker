import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

export async function getFinancialInsights(userId, transactions, currency = 'INR') {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // Get monthly totals
  const monthlyTransactions = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  const monthlyExpenses = monthlyTransactions.find(t => t._id === 'expense')?.total || 0;
  const monthlyIncome = monthlyTransactions.find(t => t._id === 'income')?.total || 0;

  // Get category spending for this month
  const categorySpending = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: '$categoryId',
        total: { $sum: '$amount' }
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category'
      }
    },
    {
      $unwind: '$category'
    },
    {
      $sort: { total: -1 }
    },
    {
      $limit: 3
    }
  ]);

  // Get historical comparison (last 3 months)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const historicalData = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: threeMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          month: { $month: '$date' },
          year: { $year: '$date' },
          type: '$type'
        },
        total: { $sum: '$amount' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  // Calculate month-over-month changes
  const currentMonthExpenses = monthlyExpenses;
  const lastMonthExpenses = historicalData
    .filter(d => d._id.month === (now.getMonth() === 0 ? 12 : now.getMonth()) && 
                 d._id.year === (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()) &&
                 d._id.type === 'expense')
    [0]?.total || 0;

  const expenseChange = ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;

  // Calculate budget impact
  const budgetImpact = {
    totalBudgeted: 0,
    totalSpent: monthlyExpenses,
    remaining: 0,
    categories: []
  };

  // Get budget information for categories
  const budgets = await mongoose.model('Budget').find({
    userId: userId,
    month: now.getMonth() + 1,
    year: now.getFullYear()
  }).populate('categoryId');

  if (budgets.length > 0) {
    budgetImpact.totalBudgeted = budgets.reduce((sum, budget) => sum + budget.amount, 0);
    budgetImpact.remaining = budgetImpact.totalBudgeted - budgetImpact.totalSpent;

    budgetImpact.categories = budgets.map(budget => {
      const spent = categorySpending.find(cs => cs._id.equals(budget.categoryId._id))?.total || 0;
      return {
        name: budget.categoryId.name,
        budgeted: budget.amount,
        spent: spent,
        remaining: budget.amount - spent,
        percentage: (spent / budget.amount) * 100
      };
    });
  }

  // Calculate recurring transaction impact
  const recurringTotal = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const recurringImpact = (recurringTotal / monthlyExpenses) * 100;

  return {
    monthlyOverview: {
      income: monthlyIncome,
      expenses: monthlyExpenses,
      balance: monthlyIncome - monthlyExpenses,
      currency
    },
    topCategories: categorySpending.map(cat => ({
      name: cat.category.name,
      amount: cat.total,
      percentage: (cat.total / monthlyExpenses) * 100
    })),
    monthOverMonth: {
      expenseChange,
      trend: expenseChange > 0 ? 'increase' : 'decrease'
    },
    budgetImpact,
    recurringImpact: {
      amount: recurringTotal,
      percentage: recurringImpact,
      currency
    }
  };
}

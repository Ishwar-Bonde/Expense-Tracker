import express from 'express';
import { spawn } from 'child_process';
import { authenticateToken } from '../middleware/auth.js';
import Transaction from '../models/Transaction.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Helper function to run Python prediction script
async function getPrediction(income, expenses, month, savings) {
  return new Promise((resolve, reject) => {
    const scriptPath = join(__dirname, '..', 'ml', 'expense_predictor.py');
    const pythonPath = join(__dirname, '..', 'ml', 'ml_env', 'Scripts', 'python.exe');
    
    console.log('Running Python script:', scriptPath);
    console.log('Using Python path:', pythonPath);
    
    const pythonProcess = spawn(pythonPath, [
      scriptPath,
      income.toString(),
      expenses.toString(),
      month.toString(),
      savings.toString()
    ]);

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
      console.error(`Python stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(`Error output: ${error}`);
        reject(new Error(`Python script failed with code ${code}`));
        return;
      }

      try {
        // Parse the last line of output as the prediction
        const lines = result.trim().split('\n');
        const prediction = parseFloat(lines[lines.length - 1]);
        
        if (isNaN(prediction)) {
          reject(new Error('Invalid prediction value received from Python script'));
          return;
        }
        
        resolve(prediction);
      } catch (err) {
        console.error('Error parsing Python output:', err);
        reject(err);
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      reject(err);
    });
  });
};

// Get expense predictions for next months
router.get('/future-expenses', authenticateToken, async (req, res) => {
  try {
    console.log('Starting prediction request for user:', req.user.id);
    
    // Get user's recent transactions
    const recentTransactions = await Transaction.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(90);  // Get last 3 months of data

    console.log('Recent transactions:', JSON.stringify(recentTransactions, null, 2));

    if (recentTransactions.length === 0) {
      console.log('No transactions found for user');
      return res.status(400).json({ message: 'Not enough transaction history for predictions' });
    }

    // Calculate averages from recent transactions
    const totals = { income: 0, expenses: 0 };
    const counts = { income: 0, expenses: 0 };
    const categories = {};
    
    // Get the current month
    const currentMonth = new Date().getMonth();
    
    recentTransactions.forEach(transaction => {
      // Convert amount to INR if needed
      let amount = transaction.amount;
      if (transaction.currency === 'USD') {
        amount = Math.round(amount * 82.50);
        console.log(`Converted USD ${transaction.amount} to INR ${amount}`);
      }

      // Initialize category if not exists
      if (!categories[transaction.categoryId]) {
        categories[transaction.categoryId] = {
          total: 0,
          count: 0,
          type: transaction.type,
          isRecurring: false
        };
      }

      // Update category stats
      categories[transaction.categoryId].total += amount;
      categories[transaction.categoryId].count++;

      // Mark as recurring if appears more than once
      if (categories[transaction.categoryId].count > 1) {
        categories[transaction.categoryId].isRecurring = true;
      }

      if (transaction.type === 'income') {
        totals.income += amount;
        counts.income++;
      } else if (transaction.type === 'expense') {
        totals.expenses += amount;
        counts.expenses++;
      }
    });

    console.log('Transaction totals:', totals);
    console.log('Transaction counts:', counts);
    console.log('Category analysis:', categories);

    // Calculate monthly averages
    const monthlyAverages = {
      income: counts.income > 0 ? totals.income / counts.income : 0,
      expenses: counts.expenses > 0 ? totals.expenses / counts.expenses : 0
    };

    // If we have no expense data, use 20% of income as a baseline
    if (monthlyAverages.expenses === 0 && monthlyAverages.income > 0) {
      console.log('No expense data found, using 20% of income as baseline');
      monthlyAverages.expenses = monthlyAverages.income * 0.2;
    }

    // Ensure we have income data
    if (monthlyAverages.income === 0) {
      return res.status(400).json({ 
        message: 'Need income transaction history for predictions',
        currentStats: { monthlyAverages, totals }
      });
    }

    const currentSavings = monthlyAverages.income - monthlyAverages.expenses;

    console.log('Prediction input values:', {
      monthlyIncome: monthlyAverages.income,
      monthlyExpenses: monthlyAverages.expenses,
      currentMonth: currentMonth + 1, // 1-12
      currentSavings
    });

    // Get prediction for next month
    const prediction = await getPrediction(
      monthlyAverages.income,
      monthlyAverages.expenses,
      currentMonth + 1, // 1-12
      currentSavings
    );

    console.log('Received prediction result:', prediction);

    // Ensure prediction is not zero or negative
    if (prediction <= 0) {
      console.error('Invalid prediction value:', prediction);
      return res.status(500).json({ 
        message: 'Error: Prediction model returned invalid value',
        debug: { prediction, monthlyAverages, currentMonth, currentSavings }
      });
    }

    const response = {
      currentStats: {
        averageIncome: monthlyAverages.income,
        averageExpenses: monthlyAverages.expenses,
        monthlySavings: currentSavings
      },
      prediction: {
        nextMonthExpenses: prediction,
        predictedSavings: monthlyAverages.income - prediction,
        confidence: 0.85
      }
    };

    console.log('Sending response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('Error generating prediction:', error);
    res.status(500).json({ 
      message: 'Failed to generate prediction',
      error: error.message 
    });
  }
});

export default router;
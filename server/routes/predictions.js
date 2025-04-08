import express from 'express';
import { spawn } from 'child_process';
import { authenticateToken } from '../middleware/auth.js';
import Transaction from '../models/Transaction.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getExchangeRates } from '../utils/currency.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Helper function to run Python prediction script using the base model
async function getBasePrediction(income, expenses, month, savings) {
  return new Promise((resolve, reject) => {
    const scriptPath = join(__dirname, '..', 'ml', 'expense_predictor.py');
    const pythonPath = 'python'; // Use system Python interpreter
    
    console.log('Running Python script:', scriptPath);
    
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
    
    // First check if we have enough income transactions
    const incomeTransactions = await Transaction.find({ 
      userId: req.user.id,
      type: 'income'
    })
    .sort({ date: -1 })
    .limit(90); // Last 3 months

    console.log('Found income transactions:', incomeTransactions.length);

    if (incomeTransactions.length === 0) {
      return res.status(400).json({ 
        message: 'Need income transaction history for predictions. Please add some income transactions first.' 
      });
    }

    if (incomeTransactions.length < 3) {
      return res.status(400).json({ 
        message: 'Need at least 3 income transactions for accurate predictions. Please add more income transactions.' 
      });
    }

    // Get expense transactions
    const expenseTransactions = await Transaction.find({
      userId: req.user.id,
      type: 'expense'
    })
    .sort({ date: -1 })
    .limit(90);

    // Get exchange rates for INR (base currency)
    const rates = await getExchangeRates('INR');
    console.log('Exchange rates:', rates);

    // Calculate totals
    const totals = { 
      income: 0, 
      expenses: 0 
    };
    
    // Process income transactions
    incomeTransactions.forEach(transaction => {
      let amount = transaction.amount;
      if (transaction.currency !== 'INR') {
        // Convert to INR using rates
        amount = amount / rates[transaction.currency];
      }
      totals.income += amount;
    });

    // Process expense transactions
    expenseTransactions.forEach(transaction => {
      let amount = transaction.amount;
      if (transaction.currency !== 'INR') {
        // Convert to INR using rates
        amount = amount / rates[transaction.currency];
      }
      totals.expenses += amount;
    });

    // Calculate monthly averages
    const monthlyAverages = {
      income: totals.income / Math.min(3, incomeTransactions.length), // Average over max 3 months
      expenses: expenseTransactions.length > 0 
        ? totals.expenses / Math.min(3, expenseTransactions.length)
        : 0
    };

    // If we have no expense data, use 20% of income as a baseline
    if (monthlyAverages.expenses === 0) {
      console.log('No expense data found, using 20% of income as baseline');
      monthlyAverages.expenses = monthlyAverages.income * 0.2;
    }

    const currentMonth = new Date().getMonth();
    const currentSavings = monthlyAverages.income - monthlyAverages.expenses;

    console.log('Prediction input values:', {
      monthlyIncome: monthlyAverages.income,
      monthlyExpenses: monthlyAverages.expenses,
      currentMonth: currentMonth + 1,
      currentSavings
    });

    // Check if user has a personalized model
    const userModelDir = join(__dirname, '..', 'ml', 'user_models', req.user.id);
    const userModelPath = join(userModelDir, 'expense_predictor.keras');
    const userScalerPath = join(userModelDir, 'scaler.save');
    const userMetadataPath = join(userModelDir, 'metadata.json');
    
    let usePersonalizedModel = false;
    let modelMetadata = null;
    
    // Check if user has a personalized model
    if (fs.existsSync(userModelPath) && fs.existsSync(userScalerPath)) {
      usePersonalizedModel = true;
      
      // Load metadata if available
      if (fs.existsSync(userMetadataPath)) {
        try {
          const metadataContent = fs.readFileSync(userMetadataPath, 'utf8');
          modelMetadata = JSON.parse(metadataContent);
        } catch (e) {
          console.error('Error reading model metadata:', e);
        }
      }
    }
    
    let prediction;
    
    if (usePersonalizedModel) {
      console.log('Using personalized prediction model for user:', req.user.id);
      // Get prediction using personalized model
      prediction = await getPersonalizedPrediction(
        req.user.id,
        monthlyAverages.income,
        monthlyAverages.expenses,
        currentMonth + 1,
        currentSavings
      );
    } else {
      console.log('Using base prediction model for user:', req.user.id);
      // Get prediction using base model
      prediction = await getBasePrediction(
        monthlyAverages.income,
        monthlyAverages.expenses,
        currentMonth + 1,
        currentSavings
      );
    }

    console.log('Received prediction result:', prediction);

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
    console.error('Error in predictions:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Helper function to run Python prediction script using personalized model
async function getPersonalizedPrediction(userId, income, expenses, month, savings) {
  return new Promise((resolve, reject) => {
    const scriptPath = join(__dirname, '..', 'ml', 'personalized_predict.py');
    const pythonPath = 'python'; // Use system Python interpreter
    
    // Check if the script exists, if not create it
    if (!fs.existsSync(scriptPath)) {
      // Create the script
      const scriptContent = `import sys
import os
from pathlib import Path

# Add the current directory to the path so we can import the personalized_model module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from personalized_model import PersonalizedExpensePredictor

def predict(user_id, income, expenses, month, savings):
    """Make a prediction using a user's personalized model"""
    try:
        # Initialize personalized model
        model = PersonalizedExpensePredictor(user_id)
        
        # Make prediction
        prediction = model.predict(
            float(income), 
            float(expenses), 
            int(month), 
            float(savings)
        )
        
        print(prediction)
        return True
    except Exception as e:
        print(f"Error in personalized prediction: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 6:
        print("Usage: python personalized_predict.py <user_id> <income> <expenses> <month> <savings>", file=sys.stderr)
        sys.exit(1)
    
    user_id = sys.argv[1]
    income = sys.argv[2]
    expenses = sys.argv[3]
    month = sys.argv[4]
    savings = sys.argv[5]
    
    success = predict(user_id, income, expenses, month, savings)
    sys.exit(0 if success else 1)
`;
      fs.writeFileSync(scriptPath, scriptContent);
    }
    
    console.log('Running personalized prediction for user:', userId);
    
    const pythonProcess = spawn(pythonPath, [
      scriptPath,
      userId,
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
        
        // Fall back to base model
        console.log('Falling back to base prediction model');
        getBasePrediction(income, expenses, month, savings)
          .then(resolve)
          .catch(reject);
        return;
      }

      try {
        // Parse the last line of output as the prediction
        const lines = result.trim().split('\n');
        const prediction = parseFloat(lines[lines.length - 1]);
        
        if (isNaN(prediction)) {
          console.error('Invalid prediction value received from personalized model');
          // Fall back to base model
          getBasePrediction(income, expenses, month, savings)
            .then(resolve)
            .catch(reject);
          return;
        }
        
        resolve(prediction);
      } catch (err) {
        console.error('Error parsing Python output:', err);
        // Fall back to base model
        getBasePrediction(income, expenses, month, savings)
          .then(resolve)
          .catch(reject);
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      // Fall back to base model
      getBasePrediction(income, expenses, month, savings)
        .then(resolve)
        .catch(reject);
    });
  });
};

// Get model status for the current user
router.get('/model-status', authenticateToken, async (req, res) => {
  try {
    console.log('Model status requested for user:', req.user.id);
    
    // Check if user has a personalized model
    const userModelDir = join(__dirname, '..', 'ml', 'user_models', req.user.id);
    const userModelPath = join(userModelDir, 'expense_predictor.keras');
    const userScalerPath = join(userModelDir, 'scaler.save');
    const userMetadataPath = join(userModelDir, 'metadata.json');
    
    // If no personalized model exists
    if (!fs.existsSync(userModelPath) || !fs.existsSync(userScalerPath)) {
      return res.json({
        hasPersonalizedModel: false,
        message: 'Using base prediction model. Train a personalized model to improve prediction accuracy.'
      });
    }
    
    // Load metadata if available
    let metadata = {
      created_at: 'Unknown',
      last_trained: 'Unknown',
      training_count: 0,
      transaction_count: 0,
      personal_model_weight: 0.5,
      base_model_weight: 0.5
    };
    
    if (fs.existsSync(userMetadataPath)) {
      try {
        const metadataContent = fs.readFileSync(userMetadataPath, 'utf8');
        metadata = JSON.parse(metadataContent);
      } catch (e) {
        console.error('Error reading model metadata:', e);
      }
    }
    
    // Format dates
    const formatDate = (dateStr) => {
      if (!dateStr || dateStr === 'Unknown') return 'Unknown';
      try {
        return new Date(dateStr).toLocaleString();
      } catch (e) {
        return dateStr;
      }
    };
    
    res.json({
      hasPersonalizedModel: true,
      created: formatDate(metadata.created_at),
      lastTrained: formatDate(metadata.last_trained),
      trainingCount: metadata.training_count,
      transactionCount: metadata.transaction_count,
      personalModelWeight: Math.round(metadata.personal_model_weight * 100),
      baseModelWeight: Math.round(metadata.base_model_weight * 100),
      message: 'Using personalized prediction model based on your transaction history.'
    });
    
  } catch (error) {
    console.error('Error getting model status:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Route to manually trigger model retraining for the current user
router.post('/retrain-model', authenticateToken, async (req, res) => {
  try {
    console.log('Manual model retraining requested for user:', req.user.id);
    
    // Get all user transactions
    const transactions = await Transaction.find({ 
      userId: req.user.id
    })
    .sort({ date: 1 })
    .lean();
    
    if (transactions.length < 10) {
      return res.status(400).json({ 
        message: 'Not enough transaction data for model training. Need at least 10 transactions.' 
      });
    }
    
    // Get exchange rates for INR (base currency)
    const rates = await getExchangeRates('INR');
    
    // Normalize transactions to INR
    const normalizedTransactions = transactions.map(t => {
      let amount = t.amount;
      if (t.currency !== 'INR') {
        // Convert to INR using rates
        amount = amount / rates[t.currency];
      }
      
      return {
        _id: t._id.toString(),
        type: t.type,
        amount: amount,
        date: t.date,
        currency: t.currency || 'INR'
      };
    });
    
    // Check if user models directory exists
    const userModelDir = join(__dirname, '..', 'ml', 'user_models', req.user.id);
    if (!fs.existsSync(userModelDir)) {
      fs.mkdirSync(userModelDir, { recursive: true });
    }
    
    // Store transactions for processing
    const tempDataFile = join(userModelDir, 'training_data.json');
    fs.writeFileSync(tempDataFile, JSON.stringify(normalizedTransactions));
    
    // Run Python script to update the model
    const scriptPath = join(__dirname, '..', 'ml', 'update_user_model.py');
    const pythonPath = 'python'; // Use system Python interpreter
    
    // Check if the script exists, if not create it
    if (!fs.existsSync(scriptPath)) {
      // Create the script
      const scriptContent = `import sys
import json
import pandas as pd
from pathlib import Path
import os

# Add the current directory to the path so we can import the personalized_model module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from personalized_model import PersonalizedExpensePredictor

def update_user_model(user_id, data_file):
    """Update a user's personalized model with new transaction data"""
    try:
        # Load transaction data from JSON file
        with open(data_file, 'r') as f:
            transactions = json.load(f)
        
        # Convert to DataFrame
        df = pd.DataFrame(transactions)
        
        # Initialize personalized model
        model = PersonalizedExpensePredictor(user_id)
        
        # Add transaction data
        model.add_transaction_data(df)
        
        # Check if we should retrain
        if model.should_retrain(min_transactions=10):
            print(f"Retraining model for user {user_id}")
            success = model.train_model(epochs=150, verbose=1)
            if success:
                print(f"Successfully retrained model for user {user_id}")
            else:
                print(f"Failed to retrain model for user {user_id}")
        else:
            print(f"Not enough new data to retrain model for user {user_id}")
        
        return True
    except Exception as e:
        print(f"Error updating user model: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python update_user_model.py <user_id> <data_file>", file=sys.stderr)
        sys.exit(1)
    
    user_id = sys.argv[1]
    data_file = sys.argv[2]
    
    success = update_user_model(user_id, data_file)
    sys.exit(0 if success else 1)
`;
      fs.writeFileSync(scriptPath, scriptContent);
    }
    
    // Run the script
    const pythonProcess = spawn(pythonPath, [
      scriptPath,
      req.user.id,
      tempDataFile
    ]);
    
    // Send immediate response
    res.json({ 
      message: 'Model retraining started. This process may take a few minutes.',
      status: 'processing'
    });
    
    // Log the output but don't wait for it
    let result = '';
    let error = '';
    
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
      console.log(`Python stdout: ${data}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
      console.error(`Python stderr: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      
      // Clean up temporary file
      try {
        fs.unlinkSync(tempDataFile);
      } catch (e) {
        console.error('Error removing temp file:', e);
      }
      
      if (code !== 0) {
        console.error(`Error output: ${error}`);
      } else {
        console.log(`Model retraining completed for user ${req.user.id}`);
      }
    });
    
  } catch (error) {
    console.error('Error in model retraining:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get model status
router.get('/model-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userModelDir = join(__dirname, '..', 'ml', 'user_models', userId);
    const modelPath = join(userModelDir, 'expense_predictor.keras');
    const metadataPath = join(userModelDir, 'metadata.json');
    
    if (!fs.existsSync(modelPath)) {
      return res.json({
        hasPersonalizedModel: false,
        message: 'No personalized model found. Using base model for predictions.'
      });
    }
    
    // Read metadata if available
    let metadata = {
      created_at: 'Unknown',
      last_trained: 'Unknown',
      training_count: 0,
      transaction_count: 0,
      base_model_weight: 1.0,
      personal_model_weight: 0.0
    };
    
    if (fs.existsSync(metadataPath)) {
      try {
        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        metadata = JSON.parse(metadataContent);
      } catch (e) {
        console.error('Error reading metadata:', e);
      }
    }
    
    res.json({
      success: true,
      message: 'Model retraining started successfully. This process may take a few minutes.'
    });
  } catch (error) {
    console.error('Error retraining model:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

export default router;

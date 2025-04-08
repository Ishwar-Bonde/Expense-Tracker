import { spawn } from 'child_process';
import mongoose from 'mongoose';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { getExchangeRates } from '../utils/currency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directory for storing user transaction data
const ML_DIR = join(__dirname);
const USER_MODELS_DIR = join(ML_DIR, 'user_models');

// Ensure directories exist
if (!fs.existsSync(USER_MODELS_DIR)) {
  fs.mkdirSync(USER_MODELS_DIR, { recursive: true });
}

/**
 * Convert transactions to a common currency (INR) for model training
 */
async function normalizeTransactions(transactions) {
  try {
    // Get exchange rates for INR (base currency)
    const rates = await getExchangeRates('INR');
    
    // Convert all transactions to INR
    return transactions.map(transaction => {
      let amount = transaction.amount;
      
      // Convert to INR if needed
      if (transaction.currency && transaction.currency !== 'INR') {
        amount = amount / rates[transaction.currency];
      }
      
      return {
        ...transaction,
        amount: amount,
        originalCurrency: transaction.currency || 'INR'
      };
    });
  } catch (error) {
    console.error('Error normalizing transactions:', error);
    return transactions; // Return original transactions if conversion fails
  }
}

/**
 * Extract user transactions and prepare them for model training
 */
async function prepareUserTransactions(userId) {
  try {
    // Get user's transactions
    const transactions = await Transaction.find({ userId })
      .sort({ date: 1 })
      .lean();
    
    if (!transactions || transactions.length < 10) {
      console.log(`User ${userId} has insufficient transaction data (${transactions?.length || 0} transactions)`);
      return null;
    }
    
    // Normalize transactions to INR
    const normalizedTransactions = await normalizeTransactions(transactions);
    
    // Convert to CSV format
    const csvData = normalizedTransactions.map(t => ({
      _id: t._id.toString(),
      type: t.type,
      amount: t.amount,
      date: t.date,
      currency: t.originalCurrency || 'INR'
    }));
    
    return csvData;
  } catch (error) {
    console.error(`Error preparing transactions for user ${userId}:`, error);
    return null;
  }
}

/**
 * Update user model with new transaction data
 */
async function updateUserModel(userId, transactions) {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary CSV file with transaction data
      const tempDataFile = join(USER_MODELS_DIR, `${userId}_temp_data.json`);
      fs.writeFileSync(tempDataFile, JSON.stringify(transactions));
      
      // Run Python script to update the model
      const scriptPath = join(ML_DIR, 'update_user_model.py');
      const pythonPath = 'python'; // Use system Python interpreter
      
      console.log(`Updating model for user ${userId}`);
      
      const pythonProcess = spawn(pythonPath, [
        scriptPath,
        userId,
        tempDataFile
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
        // Clean up temporary file
        try {
          fs.unlinkSync(tempDataFile);
        } catch (e) {
          console.error('Error removing temp file:', e);
        }
        
        if (code !== 0) {
          console.error(`Python process exited with code ${code}`);
          console.error(`Error output: ${error}`);
          reject(new Error(`Python script failed with code ${code}`));
          return;
        }
        
        console.log(`Successfully updated model for user ${userId}`);
        console.log(`Python output: ${result}`);
        resolve(true);
      });
      
      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        reject(err);
      });
    } catch (error) {
      console.error(`Error updating model for user ${userId}:`, error);
      reject(error);
    }
  });
}

/**
 * Process all users and update their models
 */
async function processAllUsers() {
  try {
    console.log('Starting scheduled model retraining...');
    
    // Get all users
    const users = await User.find({}).lean();
    console.log(`Found ${users.length} users to process`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const user of users) {
      try {
        console.log(`Processing user ${user._id}`);
        
        // Prepare transaction data
        const transactions = await prepareUserTransactions(user._id);
        
        if (!transactions) {
          console.log(`Skipping user ${user._id} due to insufficient data`);
          continue;
        }
        
        // Update user model
        await updateUserModel(user._id.toString(), transactions);
        successCount++;
        
      } catch (error) {
        console.error(`Error processing user ${user._id}:`, error);
        failureCount++;
      }
    }
    
    console.log(`Model retraining completed. Success: ${successCount}, Failures: ${failureCount}`);
  } catch (error) {
    console.error('Error in processAllUsers:', error);
  }
}

/**
 * Initialize the model retrainer
 */
export function initModelRetrainer(app, db) {
  console.log('Initializing expense prediction model retrainer...');
  
  // Create Python helper script for updating user models
  createPythonHelperScript();
  
  // Schedule weekly model retraining (every Sunday at 3 AM)
  cron.schedule('0 3 * * 0', async () => {
    console.log('Running scheduled model retraining...');
    await processAllUsers();
  });
  
  // Add route for manual retraining (admin only)
  app.post('/api/admin/retrain-models', async (req, res) => {
    try {
      // This should be protected by admin authentication
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      // Start retraining in background
      processAllUsers();
      
      res.json({ message: 'Model retraining started' });
    } catch (error) {
      console.error('Error starting model retraining:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Add route for retraining a specific user's model
  app.post('/api/admin/retrain-user-model/:userId', async (req, res) => {
    try {
      // This should be protected by admin authentication
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      const userId = req.params.userId;
      
      // Prepare transaction data
      const transactions = await prepareUserTransactions(userId);
      
      if (!transactions) {
        return res.status(400).json({ message: 'Insufficient transaction data for this user' });
      }
      
      // Update user model
      await updateUserModel(userId, transactions);
      
      res.json({ message: `Model for user ${userId} retrained successfully` });
    } catch (error) {
      console.error(`Error retraining model for user ${req.params.userId}:`, error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  console.log('Model retrainer initialized');
}

/**
 * Create Python helper script for updating user models
 */
function createPythonHelperScript() {
  const scriptPath = join(ML_DIR, 'update_user_model.py');
  
  // Only create if it doesn't exist
  if (fs.existsSync(scriptPath)) {
    return;
  }
  
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
        if model.should_retrain():
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
  console.log(`Created Python helper script at ${scriptPath}`);
}

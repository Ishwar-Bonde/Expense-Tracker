import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root directory
dotenv.config({ path: join(__dirname, '..', '.env') });

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import nodeCron from 'node-cron';
import { processRecurringTransactions, getUpcomingRecurringTransactions, getProcessedRecurringTransactions, scheduleNextTransactionCheck } from './utils/recurringTransactions.js';
import { sendRecurringTransactionWarning, sendRecurringTransactionConfirmation } from './utils/emailService.js';
import { processAutomaticLoanDeductions, sendLoanPaymentReminders } from './services/loanService.js';
import User from './models/User.js';
import Loan from './models/Loan.js';
import notificationsRoutes, { createRecurringNotifications } from './routes/notifications.js';
import loansRoutes from './routes/loans.js';
import documentsRoutes from './routes/documents.js';
import Transaction from './models/Transaction.js';
import { API_URL_FRONTEND } from './config.js';
import chatbotRoutes from './routes/chatbot.js';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import settingsRoutes from './routes/settings.js';
import themeRoutes from './routes/theme.js';
import categoriesRoutes from './routes/categories.js';
import recurringTransactionsRoutes from './routes/recurringTransactions.js';
import recurringCategoriesRoutes from './routes/recurringCategories.js';
import predictionsRoutes from './routes/predictions.js';
import testRoutes from './routes/test.js';
import groupsRouter from './routes/groups.js';
import groupTransactionsRouter from './routes/groupTransactions.js';
import groupCategoriesRouter from './routes/groupCategories.js';

const app = express();

// Configure CORS with specific options
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Enable pre-flight requests for all routes
app.options('*', cors());

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/theme', themeRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/recurring-transactions', recurringTransactionsRoutes);
app.use('/api/recurring-categories', recurringCategoriesRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/test', testRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/groups', groupsRouter);
app.use('/api/group-transactions', groupTransactionsRouter);
app.use('/api/group-categories', groupCategoriesRouter);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Function to process recurring transactions for all users
async function processAllUsersRecurringTransactions() {
  try {
    console.log('Starting recurring transactions check for all users');
    const users = await User.find({}).populate('categories');
    
    for (const user of users) {
      try {
        console.log(`Processing recurring transactions for user: ${user._id}`);
        
        // Get upcoming transactions first
        const upcomingTransactions = await getUpcomingRecurringTransactions(user._id);
        if (upcomingTransactions && upcomingTransactions.length > 0) {
          console.log(`Sending warnings for ${upcomingTransactions.length} upcoming transactions`);
          // Pass user's categories to the email service
          await sendRecurringTransactionWarning(user, upcomingTransactions);
        }
        
        // Process recurring transactions
        const processedTransactions = await processRecurringTransactions(user._id);
        
        // Send confirmation emails for processed transactions
        if (processedTransactions && processedTransactions.length > 0) {
          console.log(`Sending confirmations for ${processedTransactions.length} processed transactions`);
          // Pass user's categories to the email service
          await sendRecurringTransactionConfirmation(user, processedTransactions);
        }
        
        // Create notifications for processed transactions
        if (processedTransactions && processedTransactions.length > 0) {
          await createRecurringNotifications(user._id, processedTransactions);
        }

      } catch (error) {
        console.error(`Error processing recurring transactions for user ${user._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in processAllUsersRecurringTransactions:', error);
  }
}

// Schedule recurring transaction processing every minute
nodeCron.schedule('* * * * *', async () => {
  console.log('Running scheduled recurring transactions check');
  await processAllUsersRecurringTransactions();
});

// Schedule loan payment processing (every hour)
nodeCron.schedule('0 * * * *', async () => {
  console.log('Running hourly loan payment processing...');
  try {
    const users = await User.find({ status: 'active' });
    for (const user of users) {
      try {
        await processAutomaticLoanDeductions(user._id);
        console.log(`Successfully processed loan payments for user ${user._id}`);
      } catch (error) {
        console.error(`Error processing loan payments for user ${user._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in loan payment processing job:', error);
  }
});

// Schedule loan payment reminders (daily at 9 AM)
nodeCron.schedule('0 9 * * *', async () => {
  console.log('Sending daily loan payment reminders...');
  try {
    const users = await User.find({ status: 'active' });
    for (const user of users) {
      try {
        await sendLoanPaymentReminders(user._id);
      } catch (error) {
        console.error(`Error sending loan payment reminders for user ${user._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in loan payment reminder job:', error);
  }
});

// Function to safely schedule next check within 32-bit integer limits
const safeScheduleNextCheck = (userId, nextCheckDate) => {
  const now = new Date();
  const timeUntilNextCheck = nextCheckDate.getTime() - now.getTime();
  
  // Maximum safe timeout value (about 24.8 days)
  const MAX_TIMEOUT = 2147483647;
  
  if (timeUntilNextCheck <= MAX_TIMEOUT) {
    // If next check is within safe range, schedule directly
    setTimeout(() => checkRecurringTransactions(userId), timeUntilNextCheck);
  } else {
    // If next check is too far, schedule intermediate check
    setTimeout(() => {
      safeScheduleNextCheck(userId, nextCheckDate);
    }, MAX_TIMEOUT);
  }
  
  console.log(`Scheduled next check for user ${userId} at ${nextCheckDate.toLocaleString()}`);
};

// Function to check recurring transactions
const checkRecurringTransactions = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Track processed transactions to avoid duplicates
    const processedTransactionIds = new Set();

    // Check for upcoming transactions in the next 24 hours
    const upcomingTransactions = await Transaction.find({
      user: userId,
      isRecurring: true,
      nextDueDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
      }
    });

    if (upcomingTransactions.length > 0) {
      // Filter out transactions that we've already notified about
      const newUpcomingTransactions = upcomingTransactions.filter(tx => {
        const key = `${tx._id}_upcoming`;
        if (processedTransactionIds.has(key)) return false;
        processedTransactionIds.add(key);
        return true;
      });

      if (newUpcomingTransactions.length > 0) {
        // Send warning email using the imported function
        await sendRecurringTransactionWarning(
          user,
          newUpcomingTransactions.map(tx => ({
            ...tx.toObject(),
            dueIn: `${Math.round((tx.nextDueDate - new Date()) / (1000 * 60))} minutes`
          })),
          'warning'
        );
        console.log(`Sent warning email to ${user.email} for ${newUpcomingTransactions.length} upcoming transactions`);
        
        // Create notifications
        await createRecurringNotifications(userId, newUpcomingTransactions, 'upcoming');
      }
    }

    // Check for transactions that should have been processed
    const now = new Date();
    const processedTransactions = await Transaction.find({
      user: userId,
      isRecurring: true,
      nextDueDate: { $lt: now }
    });

    if (processedTransactions.length > 0) {
      // Process each due transaction
      for (const tx of processedTransactions) {
        const key = `${tx._id}_processed`;
        if (!processedTransactionIds.has(key)) {
          processedTransactionIds.add(key);

          // Create the new transaction instance
          const newTransaction = new Transaction({
            user: userId,
            category: tx.category,
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            date: tx.nextDueDate,
            isRecurring: false,
            parentTransaction: tx._id
          });

          await newTransaction.save();

          // Update the next due date based on frequency
          const nextDueDate = new Date(tx.nextDueDate);
          switch (tx.frequency) {
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
          }

          // Update the original recurring transaction
          tx.nextDueDate = nextDueDate;
          tx.lastProcessedDate = now;
          await tx.save();
        }
      }

      // Send confirmation email using the imported function
      await sendRecurringTransactionConfirmation(user, processedTransactions);
      console.log(`Sent confirmation email to ${user.email} for ${processedTransactions.length} processed transactions`);
      
      // Create notifications for processed transactions
      await createRecurringNotifications(userId, processedTransactions, 'processed');
    }

    // Schedule next check in 1 hour for daily transactions
    const nextCheckDate = new Date(Date.now() + 60 * 60 * 1000);
    safeScheduleNextCheck(userId, nextCheckDate);

  } catch (error) {
    console.error('Error checking recurring transactions:', error);
    // Retry in 5 minutes if there was an error
    const retryDate = new Date(Date.now() + 5 * 60 * 1000);
    safeScheduleNextCheck(userId, retryDate);
  }
};

// Initialize transaction scheduler
const initializeTransactionScheduler = async () => {
  try {
    const users = await User.find({});
    console.log(`Initializing transaction scheduler for ${users.length} users`);
    
    for (const user of users) {
      const nextCheckDate = await scheduleNextTransactionCheck(user._id);
      
      if (nextCheckDate) {
        safeScheduleNextCheck(user._id, nextCheckDate);
      }
    }
  } catch (error) {
    console.error('Error initializing transaction scheduler:', error);
  }
};

// Start the scheduler after database connection is established
mongoose.connection.once('open', () => {
  console.log('MongoDB connected successfully');
  initializeTransactionScheduler();
});

// Add user to scheduler when they log in
app.post('/api/auth/login', async (req, res) => {
  try {
    // ... existing login logic ...
    
    // Schedule transaction checks for the logged-in user
    const nextCheckDate = await scheduleNextTransactionCheck(req.user._id);
    
    if (nextCheckDate) {
      safeScheduleNextCheck(req.user._id, nextCheckDate);
    }
    
    res.json({ /* existing response */ });
  } catch (error) {
    res.status(500).json({ message: 'Error during login' });
  }
});

// Remove user from scheduler when they log out
app.post('/api/auth/logout', (req, res) => {
  try {
    const userId = req.user._id;
    // No need to clear timeout here, as it's handled by the safeScheduleNextCheck function
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error during logout' });
  }
});

// Keep server alive
setInterval(() => {
  console.log('Server is alive:', new Date().toISOString());
  
  // Ping your MongoDB to keep connection alive
  mongoose.connection.db.admin().ping((err, result) => {
    if (err) {
      console.error('MongoDB ping failed:', err);
    } else {
      console.log('MongoDB is alive');
    }
  });
}, 5 * 60 * 1000); // Every 5 minutes

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

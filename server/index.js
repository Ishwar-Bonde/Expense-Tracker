import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
import { API_URL_FRONTEND, ALLOWED_ORIGINS } from './config.js';
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
console.log('Frontend Origin from env:', API_URL_FRONTEND);

// Configure CORS with specific options
app.use(cors({
  origin: API_URL_FRONTEND,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

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

async function processAllUsersRecurringTransactions() {
  try {
    console.log('Starting recurring transactions check for all users');
    const users = await User.find({}).populate('categories');
    
    for (const user of users) {
      try {
        console.log(`Processing recurring transactions for user: ${user._id}`);
        
        const upcomingTransactions = await getUpcomingRecurringTransactions(user._id);
        if (upcomingTransactions && upcomingTransactions.length > 0) {
          console.log(`Sending warnings for ${upcomingTransactions.length} upcoming transactions`);
          await sendRecurringTransactionWarning(user, upcomingTransactions);
        }
        
        const processedTransactions = await processRecurringTransactions(user._id);
        
        if (processedTransactions && processedTransactions.length > 0) {
          console.log(`Sending confirmations for ${processedTransactions.length} processed transactions`);
          await sendRecurringTransactionConfirmation(user, processedTransactions);
        }
        
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

nodeCron.schedule('* * * * *', async () => {
  console.log('Running scheduled recurring transactions check');
  await processAllUsersRecurringTransactions();
});

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

const safeScheduleNextCheck = (userId, nextCheckDate) => {
  const now = new Date();
  const timeUntilNextCheck = nextCheckDate.getTime() - now.getTime();
  
  const MAX_TIMEOUT = 2147483647;
  
  if (timeUntilNextCheck <= MAX_TIMEOUT) {
    setTimeout(() => checkRecurringTransactions(userId), timeUntilNextCheck);
  } else {
    setTimeout(() => {
      safeScheduleNextCheck(userId, nextCheckDate);
    }, MAX_TIMEOUT);
  }
  
  console.log(`Scheduled next check for user ${userId} at ${nextCheckDate.toLocaleString()}`);
};

const checkRecurringTransactions = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const processedTransactionIds = new Set();

    const upcomingTransactions = await Transaction.find({
      user: userId,
      isRecurring: true,
      nextDueDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
      }
    });

    if (upcomingTransactions.length > 0) {
      const newUpcomingTransactions = upcomingTransactions.filter(tx => {
        const key = `${tx._id}_upcoming`;
        if (processedTransactionIds.has(key)) return false;
        processedTransactionIds.add(key);
        return true;
      });

      if (newUpcomingTransactions.length > 0) {
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

          tx.nextDueDate = nextDueDate;
          tx.lastProcessedDate = now;
          await tx.save();
        }
      }

      await sendRecurringTransactionConfirmation(user, processedTransactions);
      console.log(`Sent confirmation email to ${user.email} for ${processedTransactions.length} processed transactions`);
      await createRecurringNotifications(userId, processedTransactions, 'processed');
    }

    const nextCheckDate = new Date(Date.now() + 60 * 60 * 1000);
    safeScheduleNextCheck(userId, nextCheckDate);

  } catch (error) {
    console.error('Error checking recurring transactions:', error);
    const retryDate = new Date(Date.now() + 5 * 60 * 1000);
    safeScheduleNextCheck(userId, retryDate);
  }
};

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

mongoose.connection.once('open', () => {
  console.log('MongoDB connected successfully');
  initializeTransactionScheduler();
});

app.post('/api/auth/login', async (req, res) => {
  try {
    
    const nextCheckDate = await scheduleNextTransactionCheck(req.user._id);
    
    if (nextCheckDate) {
      safeScheduleNextCheck(req.user._id, nextCheckDate);
    }
    
    res.json({ });
  } catch (error) {
    res.status(500).json({ message: 'Error during login' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const userId = req.user._id;
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error during logout' });
  }
});

setInterval(() => {
  console.log('Server is alive:', new Date().toISOString());
  
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

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import nodeCron from 'node-cron';
import { processRecurringTransactions } from './utils/recurringTransactions.js';
import transactionsRouter from './routes/transactions.js';
import categoriesRouter from './routes/categories.js';
import recurringTransactionsRouter from './routes/recurringTransactions.js';
import usersRouter from './routes/users.js';
import settingsRouter from './routes/settings.js';
import insightsRouter from './routes/insights.js';
import loansRouter from './routes/loans.js';
import testRouter from './routes/test.js';
import groupsRouter from './routes/groups.js';
import authRouter from './routes/auth.js';
import { API_URL_FRONTEND, ALLOWED_ORIGINS } from './config.js';

const app = express();
console.log('Frontend Origin from env:', API_URL_FRONTEND);

// Configure CORS
app.use(cors({
  origin: API_URL_FRONTEND,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Enable pre-flight requests for all routes
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount all routes
app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/recurring-transactions', recurringTransactionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/loans', loansRouter);
app.use('/api/test', testRouter);
app.use('/api/groups', groupsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Not Found',
    path: req.path
  });
});

// Schedule recurring transactions processing
// Run every hour
nodeCron.schedule('0 * * * *', async () => {
  try {
    console.log('Processing recurring transactions...');
    const users = await mongoose.model('User').find({});
    
    for (const user of users) {
      await processRecurringTransactions(user._id);
    }
    
    console.log('Finished processing recurring transactions');
  } catch (error) {
    console.error('Error in recurring transactions cron job:', error);
  }
});

export default app;

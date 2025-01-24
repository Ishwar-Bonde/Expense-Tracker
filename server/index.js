import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import nodeCron from 'node-cron';
import { processRecurringTransactions } from './utils/recurringTransactions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

// Configure CORS with specific options
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import settingsRoutes from './routes/settings.js';
import themeRoutes from './routes/theme.js';
import categoriesRoutes from './routes/categories.js';
import recurringTransactionsRoutes from './routes/recurringTransactions.js';
import recurringCategoriesRoutes from './routes/recurringCategories.js';
import predictionsRoutes from './routes/predictions.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/theme', themeRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/recurring-transactions', recurringTransactionsRoutes);
app.use('/api/recurring-categories', recurringCategoriesRoutes);
app.use('/api/predictions', predictionsRoutes);

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
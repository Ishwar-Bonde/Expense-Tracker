const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const { processRecurringTransactions } = require('./utils/recurringTransactions');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/recurring-transactions', require('./routes/recurringTransactions'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/insights', require('./routes/insights'));

// Schedule recurring transactions processing
// Run every hour
cron.schedule('0 * * * *', async () => {
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
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;

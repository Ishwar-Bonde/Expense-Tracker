import express from 'express';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import Transaction from '../models/Transaction.js';
import { getFinancialInsights } from './financialInsights.js';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Ensure environment variables are loaded
dotenv.config();

// Create email transporter with retry mechanism
const createTransporter = () => {
  console.log('Creating email transporter...');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('Email configuration missing:');
    console.error('EMAIL_USER exists:', !!process.env.EMAIL_USER);
    console.error('EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD);
    return null;
  }

  try {
    console.log('Attempting to create transporter with:', {
      user: process.env.EMAIL_USER,
      passwordExists: !!process.env.EMAIL_PASSWORD
    });

    const transport = nodemailer.createTransport({
      service: 'gmail',  // Using Gmail service instead of manual SMTP config
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Verify the connection
    transport.verify((error, success) => {
      if (error) {
        console.error('Email transporter verification failed:', error);
      } else {
        console.log('Email transporter is ready to send emails');
      }
    });

    return transport;
  } catch (error) {
    console.error('Error creating email transporter:', error);
    return null;
  }
};

const transporter = createTransporter();

// Email queue and processing flag
let emailQueue = [];
let isProcessingQueue = false;

// Add email to queue
const queueEmail = async (mailOptions) => {
  console.log('Queueing email:', {
    to: mailOptions.to,
    subject: mailOptions.subject
  });
  
  emailQueue.push(mailOptions);
  if (!isProcessingQueue) {
    processEmailQueue();
  }
};

// Process email queue
const processEmailQueue = async () => {
  if (emailQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  const mailOptions = emailQueue.shift();

  try {
    console.log('Processing email from queue:', {
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    await sendEmailWithRetry(mailOptions);
    console.log('Email sent successfully');
    
    // Wait 1 second before sending next email to avoid rate limiting
    setTimeout(() => processEmailQueue(), 1000);
  } catch (error) {
    console.error('Failed to send email:', error);
    // If failed, add back to queue with exponential backoff
    if (!mailOptions.retryCount || mailOptions.retryCount < 3) {
      mailOptions.retryCount = (mailOptions.retryCount || 0) + 1;
      mailOptions.nextRetry = Date.now() + (Math.pow(2, mailOptions.retryCount) * 1000);
      console.log(`Requeueing email for retry #${mailOptions.retryCount}`);
      emailQueue.push(mailOptions);
    } else {
      console.error('Max retries reached for email:', mailOptions);
    }
    setTimeout(() => processEmailQueue(), 1000);
  }
};

// Enhanced email sending with better error handling
const sendEmailWithRetry = async (mailOptions, maxRetries = 3) => {
  if (!transporter) {
    throw new Error('Email transporter not initialized');
  }

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return info;
    } catch (error) {
      lastError = error;
      console.error(`Email sending attempt ${attempt} failed:`, error.message);
      
      // Check for specific error types
      if (error.code === 'EAUTH') {
        throw new Error('Email authentication failed. Please check credentials.');
      }
      if (error.code === 'ECONNECTION') {
        throw new Error('Failed to connect to email server. Please check your internet connection.');
      }
      
      // Wait before retrying with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to send email after ${maxRetries} attempts: ${lastError.message}`);
};

// Helper function to send email with retries
async function sendEmailWithRetryHelper(mailOptions, maxRetries = 3) {
  try {
    await sendEmailWithRetry(mailOptions, maxRetries);
  } catch (error) {
    console.error('Failed to send email:', error);
    // If failed, add to queue with exponential backoff
    if (!mailOptions.retryCount || mailOptions.retryCount < 3) {
      mailOptions.retryCount = (mailOptions.retryCount || 0) + 1;
      mailOptions.nextRetry = Date.now() + (Math.pow(2, mailOptions.retryCount) * 1000);
      queueEmail(mailOptions);
    } else {
      console.error('Max retries reached for email:', mailOptions);
    }
  }
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

function formatPercentage(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
}

function getTransactionTypeEmoji(type) {
  return type === 'expense' ? '💸' : '💰';
}

function getBudgetStatusColor(percentage) {
  if (percentage <= 50) return '#27ae60';
  if (percentage <= 80) return '#f39c12';
  return '#e74c3c';
}

function formatTransactionRow(tx) {
  const emoji = getTransactionTypeEmoji(tx.type);
  const amount = formatCurrency(tx.amount, tx.currency);
  const category = tx.categoryId ? tx.categoryId.name : 'Uncategorized';
  const categoryColor = tx.categoryId?.color || '#808080';
  
  return `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${emoji} ${tx.title}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; background-color: ${categoryColor}; color: white; font-size: 12px;">
          ${category}
        </span>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${tx.frequency}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; ${tx.type === 'expense' ? 'color: #e74c3c;' : 'color: #27ae60;'}">${amount}</td>
    </tr>
  `;
}

function generateInsightSection(insights) {
  const { monthlyOverview, topCategories, monthOverMonth, budgetImpact, recurringImpact } = insights;
  
  return `
    <div style="margin-top: 30px; background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
      <h3 style="color: #2c3e50; margin-top: 0;">📊 Financial Insights</h3>
      
      <!-- Monthly Overview -->
      <div style="margin-bottom: 20px;">
        <h4 style="color: #34495e; margin-bottom: 10px;">Monthly Overview</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
          <div style="background: white; padding: 10px; border-radius: 5px; text-align: center;">
            <div style="color: #27ae60; font-weight: bold;">${formatCurrency(monthlyOverview.income, monthlyOverview.currency)}</div>
            <div style="color: #666; font-size: 12px;">Income</div>
          </div>
          <div style="background: white; padding: 10px; border-radius: 5px; text-align: center;">
            <div style="color: #e74c3c; font-weight: bold;">${formatCurrency(monthlyOverview.expenses, monthlyOverview.currency)}</div>
            <div style="color: #666; font-size: 12px;">Expenses</div>
          </div>
          <div style="background: white; padding: 10px; border-radius: 5px; text-align: center;">
            <div style="color: ${monthlyOverview.balance >= 0 ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
              ${formatCurrency(monthlyOverview.balance, monthlyOverview.currency)}
            </div>
            <div style="color: #666; font-size: 12px;">Balance</div>
          </div>
        </div>
      </div>

      <!-- Top Categories -->
      <div style="margin-bottom: 20px;">
        <h4 style="color: #34495e; margin-bottom: 10px;">Top Spending Categories</h4>
        ${topCategories.map(cat => `
          <div style="background: white; padding: 10px; border-radius: 5px; margin-bottom: 5px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>${cat.name}</span>
              <span style="color: #e74c3c;">${formatCurrency(cat.amount, monthlyOverview.currency)}</span>
            </div>
            <div style="margin-top: 5px; background: #f1f1f1; border-radius: 10px; height: 6px;">
              <div style="width: ${cat.percentage}%; background: #e74c3c; height: 100%; border-radius: 10px;"></div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #666;">${formatPercentage(cat.percentage)} of expenses</div>
          </div>
        `).join('')}
      </div>

      <!-- Month over Month -->
      <div style="margin-bottom: 20px;">
        <h4 style="color: #34495e; margin-bottom: 10px;">Month-over-Month Comparison</h4>
        <div style="background: white; padding: 15px; border-radius: 5px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>Expense Change</span>
            <span style="color: ${monthOverMonth.trend === 'increase' ? '#e74c3c' : '#27ae60'}; font-weight: bold;">
              ${monthOverMonth.trend === 'increase' ? '↑' : '↓'} ${formatPercentage(Math.abs(monthOverMonth.expenseChange))}
            </span>
          </div>
        </div>
      </div>

      ${budgetImpact.totalBudgeted > 0 ? `
        <!-- Budget Impact -->
        <div style="margin-bottom: 20px;">
          <h4 style="color: #34495e; margin-bottom: 10px;">Budget Status</h4>
          <div style="background: white; padding: 15px; border-radius: 5px;">
            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Overall Budget</span>
                <span>${formatCurrency(budgetImpact.totalBudgeted, monthlyOverview.currency)}</span>
              </div>
              <div style="margin-bottom: 5px;">
                <div style="background: #f1f1f1; height: 8px; border-radius: 4px;">
                  <div style="width: ${(budgetImpact.totalSpent / budgetImpact.totalBudgeted) * 100}%; 
                              background: ${getBudgetStatusColor((budgetImpact.totalSpent / budgetImpact.totalBudgeted) * 100)}; 
                              height: 100%; 
                              border-radius: 4px;"></div>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <span>Spent: ${formatCurrency(budgetImpact.totalSpent, monthlyOverview.currency)}</span>
                <span>Remaining: ${formatCurrency(budgetImpact.remaining, monthlyOverview.currency)}</span>
              </div>
            </div>

            ${budgetImpact.categories.map(cat => `
              <div style="margin-top: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span>${cat.name}</span>
                  <span style="color: #e74c3c;">${formatPercentage(cat.percentage)}</span>
                </div>
                <div style="background: #f1f1f1; height: 6px; border-radius: 3px;">
                  <div style="width: ${cat.percentage}%; 
                              background: ${getBudgetStatusColor(cat.percentage)}; 
                              height: 100%; 
                              border-radius: 3px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Recurring Impact -->
      <div>
        <h4 style="color: #34495e; margin-bottom: 10px;">Recurring Transaction Impact</h4>
        <div style="background: white; padding: 15px; border-radius: 5px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Total Recurring Amount</span>
            <span>${formatCurrency(recurringImpact.amount, recurringImpact.currency)}</span>
          </div>
          <div style="color: #666; font-size: 12px; text-align: right;">
            ${formatPercentage(recurringImpact.percentage)} of monthly expenses
          </div>
        </div>
      </div>
    </div>
  `;
}

// Function to get category details
function getCategoryDetails(categoryId, userCategories = []) {
  if (!categoryId) return { name: 'Uncategorized', color: '#718096', icon: '📦' };
  
  // Handle both populated and unpopulated categoryId
  const id = typeof categoryId === 'object' ? categoryId._id : categoryId;
  const category = userCategories.find(cat => cat._id.toString() === id.toString());
  
  if (category) {
    return {
      name: category.name,
      color: category.color,
      icon: category.icon
    };
  }
  
  // If category is populated but not in user's categories
  if (typeof categoryId === 'object') {
    return {
      name: categoryId.name,
      color: categoryId.color,
      icon: categoryId.icon
    };
  }
  
  return { name: 'Uncategorized', color: '#718096', icon: '📦' };
}

// Function to generate transaction email template
async function generateTransactionEmailTemplate(user, transaction, isUpcoming = false) {
  console.log('=== Email Template Financial Data ===');
  console.log('Transaction:', {
    id: transaction._id,
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    isRecurring: transaction.isRecurring,
    date: transaction.date
  });

  // Get all transactions up to this transaction's date
  const transactionDate = new Date(transaction.date);
  const startOfMonth = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1);
  const endOfMonth = new Date(transactionDate.getFullYear(), transactionDate.getMonth() + 1, 0, 23, 59, 59, 999);

  console.log('Calculating totals up to:', transactionDate);

  const allMonthlyTransactions = await Transaction.find({
    userId: user._id,
    date: { 
      $gte: startOfMonth,
      $lte: transactionDate
    }
  }).sort({ date: 1 }).select('amount type title date');

  console.log('All Monthly Transactions:', JSON.stringify(allMonthlyTransactions.map(t => ({
    id: t._id,
    title: t.title,
    type: t.type,
    amount: t.amount,
    date: t.date
  })), null, 2));

  // Calculate monthly totals up to this transaction
  const monthlyIncome = allMonthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = allMonthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  console.log('Monthly Totals:', {
    income: monthlyIncome,
    expenses: monthlyExpenses,
    upToDate: transactionDate
  });

  // Get all transactions for total balance up to this transaction
  const allTransactions = await Transaction.find({
    userId: user._id,
    date: { $lte: transactionDate }
  }).sort({ date: 1 }).select('amount type date');

  // Calculate total balance up to this transaction
  const totalIncome = allTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = allTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = totalIncome - totalExpenses;

  // Calculate remaining balance after this transaction
  const remainingBalance = transaction.type === 'expense' 
    ? currentBalance - transaction.amount 
    : currentBalance;

  console.log('Balance Calculations:', {
    totalIncome,
    totalExpenses,
    currentBalance,
    remainingBalance,
    transactionAmount: transaction.amount,
    transactionType: transaction.type
  });

  // Format amounts
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: transaction.currency
  }).format(transaction.amount);

  const formattedIncome = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: transaction.currency
  }).format(monthlyIncome);

  const formattedExpenses = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: transaction.currency
  }).format(monthlyExpenses);

  const formattedBalance = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: transaction.currency
  }).format(currentBalance);

  const formattedRemainingBalance = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: transaction.currency
  }).format(remainingBalance);

  // Format date and time
  const txDate = new Date();  // Use current time for recurring transactions
  const hours = txDate.getHours();
  const minutes = txDate.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12; // Convert 24h to 12h format
  const formattedMinutes = minutes.toString().padStart(2, '0');
  
  const formattedDate = txDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const formattedTime = `${formattedHours}:${formattedMinutes} ${ampm}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1A202C; color: #FFFFFF; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 30px; background: #2D3748; padding: 20px; border-radius: 8px;">
        <h1 style="color: #FFFFFF; margin-bottom: 10px; font-size: 24px;">
          ${isUpcoming ? '🔔 Upcoming Transaction Alert' : '✅ Transaction Processed'}
        </h1>
        <p style="color: #A0AEC0; font-size: 1.1em; margin: 0;">
          ${transaction.title}
        </p>
        <p style="color: #718096; font-size: 0.9em; margin-top: 5px;">
          ${formattedDate} at ${formattedTime}
        </p>
      </div>

      <div style="background: #2D3748; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; padding: 15px 30px; background: ${transaction.type === 'expense' ? '#FC8181' : '#68D391'}; border-radius: 8px;">
            <p style="font-size: 1.5em; margin: 0; color: #FFFFFF; font-weight: bold;">
              ${formattedAmount}
            </p>
            <p style="margin: 5px 0 0; color: #FFFFFF; font-size: 0.9em;">
              ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
            </p>
          </div>
        </div>

        <div style="border-top: 2px solid #4A5568; padding-top: 20px;">
          <h3 style="color: #FFFFFF; margin-bottom: 15px; text-align: center;">Monthly Overview</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div style="text-align: center; padding: 15px; background: #2C5282; border-radius: 8px;">
              <p style="margin: 0; color: #90CDF4; font-weight: bold;">Income</p>
              <p style="margin: 5px 0; font-size: 1.1em; color: #FFFFFF;">${formattedIncome}</p>
            </div>
            <div style="text-align: center; padding: 15px; background: #C53030; border-radius: 8px;">
              <p style="margin: 0; color: #FED7D7; font-weight: bold;">Expenses</p>
              <p style="margin: 5px 0; font-size: 1.1em; color: #FFFFFF;">${formattedExpenses}</p>
            </div>
          </div>
        </div>

        <div style="margin-top: 20px; text-align: center; padding: 20px; background: #234E52; border-radius: 8px;">
          <p style="margin: 0; color: #81E6D9; font-weight: bold;">Current Balance</p>
          <p style="margin: 5px 0; font-size: 1.5em; color: #FFFFFF;">${formattedBalance}</p>
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #4A5568;">
            <p style="margin: 0; color: #81E6D9; font-size: 0.9em;">After this transaction</p>
            <p style="margin: 5px 0; font-size: 1.2em; color: ${remainingBalance >= 0 ? '#68D391' : '#FC8181'};">
              ${formattedRemainingBalance}
            </p>
          </div>
        </div>
      </div>

      <div style="text-align: center; padding: 15px; background: #2D3748; border-radius: 8px;">
        <p style="color: #A0AEC0; margin: 0;">This is an automated message from your Expense Tracker</p>
        <p style="color: #718096; font-size: 0.8em; margin-top: 5px;">
          Transaction ID: ${transaction._id}
        </p>
      </div>
    </div>
  `;
}

// Email service functions
export async function sendRecurringTransactionWarning(user, upcomingTransactions) {
  try {
    console.log('Sending warning for upcoming transactions:', upcomingTransactions);
    const transactionsArray = Array.isArray(upcomingTransactions) ? upcomingTransactions : [upcomingTransactions];
    
    // Get user with populated categories if not already populated
    const populatedUser = user.categories ? user : await User.findById(user._id).populate('categories');
    if (!populatedUser) throw new Error('User not found');

    // Send email for each transaction
    for (const transaction of transactionsArray) {
      const template = await generateTransactionEmailTemplate(
        populatedUser,
        transaction,
        true // isUpcoming
      );

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: populatedUser.email,
        subject: `🔔 Upcoming Transaction: ${transaction.title}`,
        html: template
      };

      console.log('Queueing warning email for:', transaction.title);
      await queueEmail(mailOptions);
    }
  } catch (error) {
    console.error('Error sending transaction warning:', error);
    throw error;
  }
}

export async function sendRecurringTransactionConfirmation(user, processedTransactions) {
  try {
    console.log('Sending confirmation for recurring transactions:', processedTransactions);
    const transactionsArray = Array.isArray(processedTransactions) ? processedTransactions : [processedTransactions];
    
    // Get user with populated categories if not already populated
    const populatedUser = user.categories ? user : await User.findById(user._id).populate('categories');
    if (!populatedUser) throw new Error('User not found');

    // Send email for each transaction
    for (const transaction of transactionsArray) {
      const template = await generateTransactionEmailTemplate(
        populatedUser,
        transaction,
        false // not upcoming
      );

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: populatedUser.email,
        subject: `✅ Transaction Processed: ${transaction.title}`,
        html: template
      };

      console.log('Queueing confirmation email for:', transaction.title);
      await queueEmail(mailOptions);
    }
  } catch (error) {
    console.error('Error sending transaction confirmation:', error);
    throw error;
  }
}

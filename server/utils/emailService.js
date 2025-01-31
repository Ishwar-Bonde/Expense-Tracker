import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { getFinancialInsights } from './financialInsights.js';

// Ensure environment variables are loaded
dotenv.config();

// Create email transporter with retry mechanism
const createTransporter = () => {
  console.log('Creating email transporter...');
  console.log('Email User:', process.env.EMAIL_USER);
  console.log('Email Password exists:', !!process.env.EMAIL_PASSWORD);
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('Email configuration missing. Please set EMAIL_USER and EMAIL_PASSWORD in .env file');
    return null;
  }

  try {
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // use SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false
      }
    });
    console.log('Email transporter created successfully');
    return transport;
  } catch (error) {
    console.error('Error creating email transporter:', error);
    return null;
  }
};

const transporter = createTransporter();

// Email queue to handle rate limiting and failures
const emailQueue = [];
let isProcessingQueue = false;

// Add email to queue
const queueEmail = async (mailOptions) => {
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
    await sendEmailWithRetry(mailOptions);
    // Wait 1 second before sending next email to avoid rate limiting
    setTimeout(() => processEmailQueue(), 1000);
  } catch (error) {
    console.error('Failed to send email:', error);
    // If failed, add back to queue with exponential backoff
    if (!mailOptions.retryCount || mailOptions.retryCount < 3) {
      mailOptions.retryCount = (mailOptions.retryCount || 0) + 1;
      mailOptions.nextRetry = Date.now() + (Math.pow(2, mailOptions.retryCount) * 1000);
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

export async function sendRecurringTransactionWarning(user, transactions) {
  if (!user || !user.email) {
    console.error('No user email provided for recurring transaction warning');
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Upcoming Recurring Transactions',
    html: `
      <h2>Upcoming Recurring Transactions</h2>
      <p>Hello ${user.firstName},</p>
      <p>You have the following recurring transactions coming up:</p>
      <ul>
        ${transactions.map(tx => `
          <li>
            <strong>${tx.title}</strong><br>
            Amount: ${formatCurrency(tx.amount, tx.currency)}<br>
            Due Date: ${new Date(tx.nextDueDate).toLocaleDateString()}<br>
            Type: ${tx.type}
          </li>
        `).join('')}
      </ul>
      <p>Best regards,<br>Your Expense Tracker Team</p>
    `
  };

  try {
    await queueEmail(mailOptions);
  } catch (error) {
    console.error('Error sending recurring transaction warning:', error);
  }
}

export async function sendRecurringTransactionConfirmation(user, transactions) {
  if (!user || !user.email) {
    console.error('No user email provided for recurring transaction confirmation');
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Recurring Transaction Processed',
    html: `
      <h2>Recurring Transaction Update</h2>
      <p>Hello ${user.firstName},</p>
      <p>The following recurring transactions have been processed:</p>
      <ul>
        ${transactions.map(tx => `
          <li>
            <strong>${tx.title}</strong><br>
            Amount: ${formatCurrency(tx.amount, tx.currency)}<br>
            Date: ${new Date(tx.date).toLocaleDateString()}<br>
            Type: ${tx.type}
          </li>
        `).join('')}
      </ul>
      <p>Best regards,<br>Your Expense Tracker Team</p>
    `
  };

  try {
    await queueEmail(mailOptions);
  } catch (error) {
    console.error('Error sending recurring transaction confirmation:', error);
  }
}

export async function sendLoanPaymentReminder(user, loan) {
  const daysUntilDue = Math.ceil((loan.nextPaymentDate - new Date()) / (1000 * 60 * 60 * 24));
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">💰 Loan Payment Reminder</h2>
      <p>Hello ${user.name || user.email},</p>
      
      <div style="background-color: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;">Your loan payment for <strong>${loan.title}</strong> is due in ${daysUntilDue} days.</p>
      </div>

      <div style="background: white; border: 1px solid #e1e1e1; border-radius: 5px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #34495e; margin-top: 0;">Payment Details</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;">Payment Amount:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">
              ${formatCurrency(loan.installmentAmount, loan.currency)}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Due Date:</td>
            <td style="padding: 8px 0; text-align: right;">
              ${loan.nextPaymentDate.toLocaleDateString()}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Remaining Balance:</td>
            <td style="padding: 8px 0; text-align: right;">
              ${formatCurrency(loan.remainingAmount, loan.currency)}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Loan Type:</td>
            <td style="padding: 8px 0; text-align: right; text-transform: capitalize;">
              ${loan.type}
            </td>
          </tr>
        </table>

        ${loan.contact ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e1e1e1;">
            <h4 style="color: #34495e; margin-top: 0;">Contact Information</h4>
            <p style="margin: 5px 0;">Name: ${loan.contact.name}</p>
            ${loan.contact.phone ? `<p style="margin: 5px 0;">Phone: ${loan.contact.phone}</p>` : ''}
            ${loan.contact.email ? `<p style="margin: 5px 0;">Email: ${loan.contact.email}</p>` : ''}
          </div>
        ` : ''}
      </div>

      <div style="margin-top: 20px;">
        <p style="color: #666;">
          To view complete loan details or make a payment, please log in to your Expense Tracker account.
        </p>
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        <p>This is an automated message from your Expense Tracker.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `🔔 Loan Payment Reminder: ${loan.title}`,
    html
  };

  return sendEmailWithRetryHelper(mailOptions);
}

import Loan from '../models/Loan.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Process automatic loan deductions
export async function processAutomaticLoanDeductions(userId) {
  try {
    const now = new Date();
    console.log(`Processing loan payments for user ${userId} at ${now}`);
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find all active loans
    const activeLoans = await Loan.find({
      userId,
      status: 'active'
    });

    console.log(`Found ${activeLoans.length} active loans`);

    const processedPayments = [];
    const errors = [];

    // Sort loans by next payment date
    activeLoans.sort((a, b) => new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate));

    for (const loan of activeLoans) {
      try {
        console.log(`Processing loan: ${loan.title} (${loan._id})`);
        console.log(`Next payment date: ${loan.nextPaymentDate}`);
        
        const nextPaymentDate = new Date(loan.nextPaymentDate);
        
        // If next payment date is in the future, skip this loan
        if (nextPaymentDate > now) {
          console.log(`Next payment date ${nextPaymentDate} is in the future, skipping`);
          continue;
        }

        // Calculate EMI
        const principal = loan.amount;
        const ratePerMonth = loan.interestRate / (12 * 100); // Monthly interest rate
        const totalMonths = loan.tenure * 12; // Convert tenure years to months
        
        // EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
        const emi = (principal * ratePerMonth * Math.pow(1 + ratePerMonth, totalMonths)) / 
                   (Math.pow(1 + ratePerMonth, totalMonths) - 1);
        
        // Round to 2 decimal places
        const paymentAmount = Math.round(emi * 100) / 100;

        console.log(`Calculated EMI for loan ${loan.title}: ${paymentAmount}`);

        // Create transaction for the payment
        const transaction = new Transaction({
          userId: loan.userId,
          type: loan.type === 'borrowed' ? 'expense' : 'income',
          title: `Loan Payment - ${loan.title}`,
          description: `Monthly payment for loan: ${loan.title}`,
          amount: paymentAmount,
          currency: 'INR',
          categoryId: loan.categoryId,
          date: nextPaymentDate,
          isLoanPayment: true,
          loanId: loan._id
        });

        // Save transaction
        await transaction.save();
        console.log(`Created transaction for loan payment: ${transaction._id}`);

        // Calculate interest component of this EMI
        const interestAmount = loan.remainingAmount * ratePerMonth;
        const principalAmount = paymentAmount - interestAmount;

        // Update loan details using findByIdAndUpdate to avoid validation
        const updatedLoan = await Loan.findByIdAndUpdate(
          loan._id,
          {
            $set: {
              remainingAmount: Math.max(0, loan.remainingAmount - principalAmount),
              lastPaymentDate: nextPaymentDate,
              nextPaymentDate: new Date(nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)),
              status: loan.remainingAmount <= principalAmount ? 'completed' : 'active'
            }
          },
          { new: true }
        );

        if (!updatedLoan) {
          throw new Error('Failed to update loan');
        }

        console.log(`Updated loan ${loan.title}:
          Previous remaining: ${loan.remainingAmount}
          Payment amount: ${paymentAmount}
          Principal paid: ${principalAmount}
          Interest paid: ${interestAmount}
          New remaining: ${updatedLoan.remainingAmount}`);

        // Send email notification
        try {
          await sendLoanPaymentConfirmation(user, transaction, updatedLoan);
          // Add delay between processing payments
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (emailError) {
          console.error('Error sending loan payment confirmation:', emailError);
        }

        processedPayments.push({
          loanId: loan._id,
          transactionId: transaction._id,
          amount: paymentAmount,
          date: nextPaymentDate
        });

      } catch (error) {
        console.error(`Error processing loan ${loan._id}:`, error);
        errors.push({ loanId: loan._id, error: error.message });
      }
    }

    return {
      success: true,
      processedPayments,
      errors
    };

  } catch (error) {
    console.error('Error processing loan payments:', error);
    throw error;
  }
}

// Send loan payment reminders
export async function sendLoanPaymentReminders(userId) {
  try {
    const now = new Date();
    const reminderDate = new Date(now);
    reminderDate.setDate(reminderDate.getDate() + 5); // 5 days ahead

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const upcomingPayments = await Loan.find({
      userId,
      status: 'active',
      nextPaymentDate: {
        $gte: now,
        $lte: reminderDate
      }
    });

    for (const loan of upcomingPayments) {
      try {
        await sendLoanPaymentReminder(user, loan);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between emails
      } catch (error) {
        console.error(`Error sending reminder for loan ${loan._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error sending loan payment reminders:', error);
    throw error;
  }
}

// Send loan payment confirmation
async function sendLoanPaymentConfirmation(user, transaction, loan) {
  try {
    const template = await generateLoanPaymentTemplate(user, transaction, loan);
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Loan Payment Processed - ${loan.title}`,
      html: template
    };

    await transporter.sendMail(mailOptions);
    console.log('Loan payment confirmation email sent successfully');
  } catch (error) {
    console.error('Error sending loan payment confirmation:', error);
    throw error;
  }
}

// Send loan payment reminder
export async function sendLoanPaymentReminder(user, loan) {
  try {
    const template = await generateLoanReminderTemplate(user, loan);
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Upcoming Loan Payment Reminder - ${loan.title}`,
      html: template
    };

    await transporter.sendMail(mailOptions);
    console.log('Loan payment reminder email sent successfully');
  } catch (error) {
    console.error('Error sending loan payment reminder:', error);
    throw error;
  }
}

// Generate loan payment email template
async function generateLoanPaymentTemplate(user, transaction, loan) {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(transaction.amount);

  const formattedRemaining = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(loan.remainingAmount);

  const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const nextPaymentDate = new Date(loan.nextPaymentDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Loan Payment Processed</h2>
      <p>Dear ${user.name},</p>
      <p>Your loan payment has been processed successfully.</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Payment Details</h3>
        <p><strong>Loan:</strong> ${loan.title}</p>
        <p><strong>Amount Paid:</strong> ${formattedAmount}</p>
        <p><strong>Payment Date:</strong> ${formattedDate}</p>
        <p><strong>Remaining Balance:</strong> ${formattedRemaining}</p>
        <p><strong>Next Payment Due:</strong> ${nextPaymentDate}</p>
      </div>

      <p>Thank you for your payment!</p>
    </div>
  `;
}

// Generate loan reminder email template
async function generateLoanReminderTemplate(user, loan) {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(loan.paymentAmount);

  const formattedRemaining = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(loan.remainingAmount);

  const paymentDate = new Date(loan.nextPaymentDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Upcoming Loan Payment Reminder</h2>
      <p>Dear ${user.name},</p>
      <p>This is a reminder about your upcoming loan payment.</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Payment Details</h3>
        <p><strong>Loan:</strong> ${loan.title}</p>
        <p><strong>Payment Amount:</strong> ${formattedAmount}</p>
        <p><strong>Due Date:</strong> ${paymentDate}</p>
        <p><strong>Current Balance:</strong> ${formattedRemaining}</p>
      </div>

      <p>Please ensure your payment is made on time to avoid any late fees.</p>
    </div>
  `;
}

import Loan from '../models/Loan.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { sendLoanPaymentReminder, sendLoanPaymentConfirmation } from './emailService.js';

// Process missed loan payments
export async function processMissedLoanPayments(userId) {
  try {
    const now = new Date();
    console.log(`Processing missed loan payments for user ${userId} at ${now}`);
    
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

        // Calculate interest amount
        const interestAmount = (loan.remainingAmount * (loan.interestRate / 100)) / 12; // Monthly interest
        const paymentAmount = loan.paymentAmount || interestAmount;

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

        // Update loan details
        loan.remainingAmount = Math.max(0, loan.remainingAmount - (paymentAmount - interestAmount));
        loan.lastPaymentDate = nextPaymentDate;
        
        // Calculate next payment date
        const nextDate = new Date(nextPaymentDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
        loan.nextPaymentDate = nextDate;

        if (loan.remainingAmount <= 0) {
          loan.status = 'completed';
        }

        await loan.save();

        // Send email notification
        try {
          const populatedUser = await User.findById(userId);
          await sendLoanPaymentConfirmation(populatedUser, transaction, loan);
          
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
    console.error('Error processing missed loan payments:', error);
    throw error;
  }
}

// Get upcoming loan payments
export async function getUpcomingLoanPayments(userId, daysThreshold = 5) {
  try {
    const now = new Date();
    const thresholdTime = new Date(now);
    thresholdTime.setDate(thresholdTime.getDate() + daysThreshold);

    console.log(`Checking for upcoming loan payments between ${now.toISOString()} and ${thresholdTime.toISOString()}`);

    // Find loans with payments due soon
    const loans = await Loan.find({
      userId,
      status: 'active',
      nextPaymentDate: {
        $gte: now,
        $lte: thresholdTime
      }
    }).sort({ nextPaymentDate: 1 });

    console.log(`Found ${loans.length} upcoming loan payments`);
    
    return loans;
  } catch (error) {
    console.error('Error getting upcoming loan payments:', error);
    throw error;
  }
}

// Check and process loan payments
export async function checkAndProcessLoanPayments() {
  try {
    const users = await User.find({});
    
    for (const user of users) {
      // Process missed payments
      await processMissedLoanPayments(user._id);
      
      // Check for upcoming payments and send reminders
      const upcomingPayments = await getUpcomingLoanPayments(user._id);
      
      for (const loan of upcomingPayments) {
        try {
          await sendLoanPaymentReminder(user, loan);
        } catch (error) {
          console.error(`Error sending reminder for loan ${loan._id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in loan payment check:', error);
  }
}

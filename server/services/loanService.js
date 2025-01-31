import Loan from '../models/Loan.js';
import Transaction from '../models/Transaction.js';
import { sendLoanPaymentConfirmation, sendLoanPaymentReminder } from './emailService.js';

// Process automatic loan deductions
export async function processAutomaticLoanDeductions(userId) {
  try {
    // Find all active loans for the user
    const loans = await Loan.find({
      userId,
      status: 'active',
      nextPaymentDate: { $lte: new Date() }
    });

    for (const loan of loans) {
      try {
        await processLoanPayment(loan);
      } catch (error) {
        console.error(`Error processing loan payment for loan ${loan._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in processAutomaticLoanDeductions:', error);
    throw error;
  }
}

// Process a single loan payment
async function processLoanPayment(loan) {
  const emi = loan.calculateEMI();
  
  // Create transaction for loan payment
  const transaction = new Transaction({
    userId: loan.userId,
    type: loan.type === 'given' ? 'income' : 'expense',
    title: `Loan Payment - ${loan.title}`,
    description: `Automatic payment for loan: ${loan.title}`,
    amount: emi,
    currency: loan.currency,
    date: new Date(),
    isLoanPayment: true,
    loanId: loan._id
  });

  // Calculate principal and interest components
  const interestPayment = (loan.interestRate / 1200) * loan.remainingAmount;
  const principalPayment = emi - interestPayment;

  // Update loan details
  loan.remainingAmount -= principalPayment;
  loan.paymentHistory.push({
    amount: emi,
    date: new Date(),
    type: 'principal',
    notes: 'Automatic deduction'
  });

  // Update loan status
  loan.updateStatus();

  // Calculate next payment date
  const nextDate = loan.calculateNextPaymentDate();
  if (nextDate) {
    loan.nextPaymentDate = nextDate;
  }

  // Save changes
  await Promise.all([
    transaction.save(),
    loan.save()
  ]);

  // Send confirmation email
  try {
    await sendLoanPaymentConfirmation(loan.userId, [{
      loan,
      transaction,
      paymentDetails: {
        paymentNumber: loan.paymentHistory.length,
        principalPayment,
        interestPayment,
        balance: loan.remainingAmount
      }
    }]);
  } catch (error) {
    console.error('Error sending loan payment confirmation:', error);
  }
}

// Send reminders for upcoming loan payments
export async function sendLoanPaymentReminders(userId) {
  try {
    // Find loans with upcoming payments (within next 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const loans = await Loan.find({
      userId,
      status: 'active',
      nextPaymentDate: {
        $gt: new Date(),
        $lte: threeDaysFromNow
      }
    });

    if (loans.length > 0) {
      await sendLoanPaymentReminder(userId, loans);
    }
  } catch (error) {
    console.error('Error in sendLoanPaymentReminders:', error);
    throw error;
  }
}

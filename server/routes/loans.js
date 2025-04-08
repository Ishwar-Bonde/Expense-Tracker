import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Loan from '../models/Loan.js';
import { sendLoanPaymentReminder } from '../services/loanService.js';

const router = express.Router();

// Get all loans for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.user.id });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get loan by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    res.json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new loan
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      purpose,
      amount,
      currency,
      interestRate,
      startDate,
      endDate,
      paymentFrequency,
      contact,
      documents,
      collateral,
      guarantor,
      penalties,
      installmentAmount
    } = req.body;

    // Create a new loan instance
    const loan = new Loan({
      userId: req.user.id,
      title,
      description,
      type,
      purpose,
      amount: parseFloat(amount),
      currency,
      interestRate: parseFloat(interestRate),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      paymentFrequency,
      contact,
      documents,
      collateral,
      guarantor,
      penalties,
      status: 'active',
      remainingAmount: parseFloat(amount), // Set initial remaining amount to full amount
      installmentAmount: parseFloat(installmentAmount) // Get from request body
    });

    // The pre-save hook will handle nextPaymentDate calculation
    const savedLoan = await loan.save();
    res.status(201).json(savedLoan);
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update loan details
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const allowedUpdates = [
      'title', 'description', 'contact', 'documents', 
      'reminderEnabled', 'reminderDays'
    ];
    
    Object.keys(req.body).forEach(update => {
      if (allowedUpdates.includes(update)) {
        loan[update] = req.body[update];
      }
    });

    await loan.save();
    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update loan status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    if (!['active', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    loan.status = status;
    await loan.save();

    res.json({ message: 'Loan status updated successfully', loan });
  } catch (error) {
    console.error('Error updating loan status:', error);
    res.status(500).json({ message: 'Error updating loan status' });
  }
});

// Record a loan payment
router.post('/:id/payments', authenticateToken, async (req, res) => {
  try {
    const { amount, method, notes, date } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (amount > loan.remainingAmount) {
      return res.status(400).json({ message: 'Payment amount exceeds remaining loan amount' });
    }

    // Initialize payments array if it doesn't exist
    if (!Array.isArray(loan.payments)) {
      loan.payments = [];
    }

    // Add the payment
    loan.payments.push({
      amount: Number(amount),
      method: method || 'cash',
      date: new Date(date || Date.now()),
      notes: notes || '',
      status: 'completed'
    });

    // Update remaining amount
    loan.remainingAmount = Math.max(0, loan.remainingAmount - Number(amount));

    // Update loan status if fully paid
    if (loan.remainingAmount === 0) {
      loan.status = 'completed';
    }

    await loan.save();

    res.json({ 
      message: 'Payment recorded successfully',
      loan: loan
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ message: 'Error recording payment' });
  }
});

// Get loan statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const [givenLoans, takenLoans] = await Promise.all([
      Loan.find({ userId: req.user.id, type: 'given' }),
      Loan.find({ userId: req.user.id, type: 'taken' })
    ]);

    const stats = {
      totalGiven: givenLoans.reduce((sum, loan) => sum + loan.amount, 0),
      totalTaken: takenLoans.reduce((sum, loan) => sum + loan.amount, 0),
      activeLoans: [...givenLoans, ...takenLoans].filter(loan => loan.status === 'active').length,
      completedLoans: [...givenLoans, ...takenLoans].filter(loan => loan.status === 'completed').length,
      totalInterestPaid: [...givenLoans, ...takenLoans].reduce((sum, loan) => sum + loan.totalInterestPaid, 0),
      upcomingPayments: [...givenLoans, ...takenLoans]
        .filter(loan => loan.status === 'active')
        .map(loan => ({
          loanId: loan._id,
          title: loan.title,
          amount: loan.installmentAmount,
          dueDate: loan.nextPaymentDate,
          type: loan.type
        }))
        .sort((a, b) => a.dueDate - b.dueDate)
        .slice(0, 5)
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payment schedule
router.get('/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const totalInstallments = loan.getTotalInstallments();
    const schedule = [];
    let remainingPrincipal = loan.amount;
    let currentDate = new Date(loan.startDate);

    for (let i = 0; i < totalInstallments; i++) {
      const installment = loan.calculateEMI();
      const interestPayment = (remainingPrincipal * loan.interestRate) / (12 * 100);
      const principalPayment = installment - interestPayment;
      
      schedule.push({
        installmentNumber: i + 1,
        dueDate: new Date(currentDate),
        totalPayment: installment,
        principalPayment,
        interestPayment,
        remainingPrincipal: Math.max(0, remainingPrincipal - principalPayment)
      });

      remainingPrincipal = Math.max(0, remainingPrincipal - principalPayment);
      
      // Move to next payment date
      switch(loan.paymentFrequency) {
        case 'daily': currentDate.setDate(currentDate.getDate() + 1); break;
        case 'weekly': currentDate.setDate(currentDate.getDate() + 7); break;
        case 'monthly': currentDate.setMonth(currentDate.getMonth() + 1); break;
        case 'quarterly': currentDate.setMonth(currentDate.getMonth() + 3); break;
        case 'yearly': currentDate.setFullYear(currentDate.getFullYear() + 1); break;
      }
    }

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

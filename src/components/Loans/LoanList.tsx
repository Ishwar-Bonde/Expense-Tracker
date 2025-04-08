import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Paper,
  Container,
  Modal,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  Calculate as CalculateIcon,
  Compare as CompareIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Payment as PaymentIcon,
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Percent as PercentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';
import { API_BASE_URL } from '../../config';

interface Loan {
  _id: string;
  title: string;
  type: 'given' | 'taken';
  purpose: 'education' | 'personal' | 'home' | 'vehicle' | 'business' | 'other';
  amount: number;
  interestRate: number;
  startDate: string;
  endDate: string;
  paymentFrequency: string;
  description: string;
  installmentAmount: number;
  remainingAmount: number;
  payments: Array<{
    amount: number;
    date: string;
    method: string;
    notes?: string;
    status: 'completed' | 'pending' | 'failed';
    _id?: string;
  }>;
  contact: {
    name: string;
    phone: string;
    email: string;
    relationship: string;
    address: string;
  };
  collateral: {
    type: 'property' | 'vehicle' | 'jewelry' | 'investment' | 'other' | 'none';
    description: string;
    value: number;
  };
  guarantor: {
    name: string;
    phone: string;
    email: string;
    relationship: string;
    address: string;
  };
  penalties: {
    rate: number;
    amount: number;
  };
  status: string;
  nextPaymentDate: string;
}

const LoanList: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const navigate = useNavigate();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/loans`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch loans');
      }

      const data = await response.json();
      setLoans(data);
    } catch (error) {
      setError('Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  // Add transaction for loan payment or new loan
  const addTransaction = async (amount: number, type: 'income' | 'expense', description: string) => {
    try {
      // Get user's default currency from localStorage or use INR as fallback
      const userCurrency = localStorage.getItem('defaultCurrency') || 'INR';

      const response = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: description, // Required field
          amount: Number(amount), // Ensure amount is a number
          type, // Required field: 'income' for received payments, 'expense' for payments made
          description,
          category: 'Loans', // Using predefined category name
          currency: userCurrency, // Use user's preferred currency
          date: new Date().toISOString(),
          paymentMethod,
          notes: paymentNotes || description,
          tags: ['loan-payment'] // Add a tag to identify loan payments
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add transaction');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const handlePayment = async () => {
    if (!selectedLoan || !paymentAmount) return;

    try {
      // First record the loan payment
      const response = await fetch(`${API_BASE_URL}/api/loans/${selectedLoan._id}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Number(paymentAmount),
          method: paymentMethod,
          notes: paymentNotes,
          date: new Date().toISOString(),
          status: 'completed'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record payment');
      }

      // Then add a transaction for the payment
      const description = `Loan Payment - ${selectedLoan.purpose} (${selectedLoan.type === 'given' ? 'Given' : 'Taken'})`;
      await addTransaction(
        Number(paymentAmount),
        // For given loans, receiving payment is income; for taken loans, paying is expense
        selectedLoan.type === 'given' ? 'income' : 'expense',
        description
      );

      await fetchLoans(); // Refresh loans data
      setSelectedLoan(null);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setPaymentNotes('');
      setSuccess('Payment recorded successfully');
      setPaymentModalOpen(false); // Close the modal after successful payment
    } catch (error) {
      console.error('Error recording payment:', error);
      setError(error instanceof Error ? error.message : 'Failed to record payment');
    }
  };

  const handleNewLoan = async (loanData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/loans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loanData)
      });

      if (!response.ok) {
        throw new Error('Failed to create loan');
      }

      // Add transaction for the new loan
      const description = `New Loan - ${loanData.purpose} (${loanData.type === 'given' ? 'Given' : 'Taken'})`;
      await addTransaction(
        loanData.amount,
        loanData.type === 'given' ? 'expense' : 'income',
        description
      );

      await fetchLoans();
      setSuccess('Loan created successfully');
    } catch (error) {
      console.error('Error creating loan:', error);
      setError('Failed to create loan');
    }
  };

  const updateLoanStatus = async (loanId: string, status: 'active' | 'completed') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/loans/${loanId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to update loan status');
      }

      setSuccess('Loan status updated successfully');
      fetchLoans(); // Refresh loans data
    } catch (error) {
      setError('Failed to update loan status');
    }
  };

  const getLoanStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return {
          bg: '#22c55e20',
          color: '#22c55e'
        };
      case 'pending':
        return {
          bg: '#eab30820',
          color: '#eab308'
        };
      case 'completed':
        return {
          bg: '#6366f120',
          color: '#6366f1'
        };
      default:
        return {
          bg: '#64748b20',
          color: '#64748b'
        };
    }
  };

  const calculateLoanStats = () => {
    if (!loans) return {
      totalLoans: 0,
      activeLoans: 0,
      totalLent: 0,
      totalBorrowed: 0,
      totalInterest: 0
    };

    return loans.reduce((stats, loan) => {
      // Calculate total and active loans
      stats.totalLoans++;
      if (loan.status === 'active') stats.activeLoans++;

      // Calculate total lent and borrowed
      if (loan.type === 'given') {
        stats.totalLent += loan.amount;
      } else {
        stats.totalBorrowed += loan.amount;
      }

      // Calculate total interest for the entire loan period
      if (loan.status === 'active') {
        const totalMonths = Math.ceil(
          (new Date(loan.endDate).getTime() - new Date(loan.startDate).getTime()) / 
          (1000 * 60 * 60 * 24 * 30)
        );
        const totalInterest = (loan.amount * (loan.interestRate / 100) * totalMonths) / 12;
        stats.totalInterest += totalInterest;
      }

      return stats;
    }, {
      totalLoans: 0,
      activeLoans: 0,
      totalLent: 0,
      totalBorrowed: 0,
      totalInterest: 0
    });
  };

  const calculateRemainingInterest = (loan: Loan) => {
    if (loan.status !== 'active') return 0;
    
    const remainingMonths = Math.ceil(
      (new Date(loan.endDate).getTime() - new Date().getTime()) / 
      (1000 * 60 * 60 * 24 * 30)
    );
    
    return (loan.remainingAmount * (loan.interestRate / 100) * remainingMonths) / 12;
  };

  const renderStats = () => {
    const stats = calculateLoanStats();

    return (
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3,
                bgcolor: theme => theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
                borderRadius: 2,
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: '12px', 
                  bgcolor: theme => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc'
                }}>
                  <AccountBalanceIcon sx={{ fontSize: 24, color: '#6366f1' }} />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {stats.totalLoans}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Loans
                  </Typography>
                  <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {stats.activeLoans} Active
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3,
                bgcolor: theme => theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
                borderRadius: 2,
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: '12px', 
                  bgcolor: theme => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc'
                }}>
                  <TrendingUpIcon sx={{ fontSize: 24, color: '#22c55e' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatCurrency(stats.totalLent)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Lent
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3,
                bgcolor: theme => theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
                borderRadius: 2,
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: '12px', 
                  bgcolor: theme => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc'
                }}>
                  <TrendingDownIcon sx={{ fontSize: 24, color: '#ef4444' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatCurrency(stats.totalBorrowed)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Borrowed
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3,
                bgcolor: theme => theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
                borderRadius: 2,
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: '12px', 
                  bgcolor: theme => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc'
                }}>
                  <PercentIcon sx={{ fontSize: 24, color: '#f59e0b' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatCurrency(stats.totalInterest)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Interest
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {renderStats()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              My Loans
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Manage and track all your loans in one place
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<CalculateIcon />}
              onClick={() => navigate('/loans/calculator')}
              sx={{
                borderColor: theme => theme.palette.mode === 'dark' ? '#475569' : '#e2e8f0',
                color: 'text.primary',
                '&:hover': {
                  borderColor: theme => theme.palette.mode === 'dark' ? '#64748b' : '#cbd5e1',
                  bgcolor: theme => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc'
                }
              }}
            >
              Calculator
            </Button>
            <Button
              variant="outlined"
              startIcon={<CompareIcon />}
              onClick={() => navigate('/loans/compare')}
              sx={{
                borderColor: theme => theme.palette.mode === 'dark' ? '#475569' : '#e2e8f0',
                color: 'text.primary',
                '&:hover': {
                  borderColor: theme => theme.palette.mode === 'dark' ? '#64748b' : '#cbd5e1',
                  bgcolor: theme => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc'
                }
              }}
            >
              Compare
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/loans/new')}
              sx={{
                bgcolor: theme => theme.palette.mode === 'dark' ? '#818cf8' : '#6366f1',
                '&:hover': {
                  bgcolor: theme => theme.palette.mode === 'dark' ? '#6366f1' : '#4f46e5'
                }
              }}
            >
              New Loan
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {loans.map((loan) => (
            <Grid item xs={12} md={6} key={loan._id}>
              <Card 
                elevation={0}
                sx={{ 
                  bgcolor: theme => theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
                  borderRadius: 2,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  },
                  height: '100%'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {loan.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {loan.type === 'given' ? 'Lent to' : 'Borrowed from'}: {loan.contact.name}
                      </Typography>
                    </Box>
                    <Chip 
                      label={loan.status}
                      size="small"
                      onClick={() => updateLoanStatus(loan._id, loan.status === 'active' ? 'completed' : 'active')}
                      sx={{ 
                        bgcolor: getLoanStatusColor(loan.status).bg,
                        color: getLoanStatusColor(loan.status).color,
                        fontWeight: 500,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: loan.status === 'active' ? '#22c55e30' : '#64748b30'
                        }
                      }}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2,
                          bgcolor: theme => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
                          borderRadius: 2
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Amount
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MoneyIcon sx={{ fontSize: 20 }} />
                          {formatCurrency(loan.amount)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2,
                          bgcolor: theme => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
                          borderRadius: 2
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Interest Rate
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1, color: '#f59e0b' }}>
                          {loan.interestRate}%
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2,
                          bgcolor: theme => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
                          borderRadius: 2
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Next Payment
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          {loan.nextPaymentDate ? new Date(loan.nextPaymentDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }) : 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2,
                          bgcolor: theme => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
                          borderRadius: 2
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Remaining
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1, color: '#ef4444' }}>
                          {formatCurrency(loan.remainingAmount)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2,
                          bgcolor: theme => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
                          borderRadius: 2
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Remaining Interest
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1, color: '#f59e0b' }}>
                          {formatCurrency(calculateRemainingInterest(loan))}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      startIcon={<PaymentIcon />}
                      onClick={() => {
                        setSelectedLoan(loan);
                        setPaymentModalOpen(true);
                      }}
                      sx={{
                        borderColor: theme => theme.palette.mode === 'dark' ? '#475569' : '#e2e8f0',
                        color: 'text.primary',
                        '&:hover': {
                          borderColor: theme => theme.palette.mode === 'dark' ? '#64748b' : '#cbd5e1',
                          bgcolor: theme => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc'
                        }
                      }}
                    >
                      Record Payment
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ArrowUpIcon />}
                      onClick={() => {
                        setSelectedLoan(loan);
                        setTransactionModalOpen(true);
                      }}
                      sx={{
                        borderColor: theme => theme.palette.mode === 'dark' ? '#475569' : '#e2e8f0',
                        color: 'text.primary',
                        '&:hover': {
                          borderColor: theme => theme.palette.mode === 'dark' ? '#64748b' : '#cbd5e1',
                          bgcolor: theme => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc'
                        }
                      }}
                    >
                      View Transactions
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {loans.length === 0 && (
            <Grid item xs={12}>
              <Box 
                sx={{ 
                  textAlign: 'center',
                  py: 8,
                  bgcolor: theme => theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
                  borderRadius: 2
                }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  No loans found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Get started by adding your first loan
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/loans/new')}
                  sx={{
                    bgcolor: theme => theme.palette.mode === 'dark' ? '#818cf8' : '#6366f1',
                    '&:hover': {
                      bgcolor: theme => theme.palette.mode === 'dark' ? '#6366f1' : '#4f46e5'
                    }
                  }}
                >
                  Add New Loan
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Payment Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        aria-labelledby="payment-modal"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
        }}>
          <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
            Record Payment
          </Typography>
          {selectedLoan && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Loan: {selectedLoan.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Remaining: {formatCurrency(selectedLoan.remainingAmount)}
              </Typography>
              <TextField
                label="Payment Amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                fullWidth
                required
                sx={{ mb: 2 }}
              />
              <TextField
                select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="upi">UPI</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
              <TextField
                label="Notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                fullWidth
                multiline
                rows={3}
                sx={{ mb: 3 }}
              />
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button onClick={() => setPaymentModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="contained"
                  onClick={handlePayment}
                  disabled={!paymentAmount || Number(paymentAmount) <= 0}
                >
                  Record Payment
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Modal>

      {/* Transaction History Modal */}
      <Modal
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        aria-labelledby="transaction-modal"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          maxHeight: '80vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          overflow: 'auto'
        }}>
          <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
            Transaction History
          </Typography>
          {selectedLoan && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Loan: {selectedLoan.title}
              </Typography>
              {selectedLoan.payments && selectedLoan.payments.length > 0 ? (
                selectedLoan.payments.map((payment, index) => (
                  <Paper
                    key={payment._id || index}
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 2,
                      bgcolor: theme => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc',
                      borderRadius: 2
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                        {formatCurrency(payment.amount)}
                      </Typography>
                      <Chip
                        label={payment.status}
                        size="small"
                        color={payment.status === 'completed' ? 'success' : 'default'}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(payment.date.toString())}
                    </Typography>
                    {payment.notes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {payment.notes}
                      </Typography>
                    )}
                  </Paper>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  No transactions found
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Modal>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LoanList;

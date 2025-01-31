import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Modal,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Paper,
  Tooltip,
  Alert,
  Snackbar,
  LinearProgress,
  useTheme,
  styled,
} from '@mui/material';
import {
  Add as AddIcon,
  Calculate as CalculateIcon,
  Compare as CompareIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CalendarToday as CalendarIcon,
  Percent as PercentIcon,
  AccountBalance as AccountBalanceIcon,
  DeleteOutlined,
} from '@mui/icons-material';
import { API_BASE_URL } from '../../config';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(45deg, rgba(66, 66, 66, 0.9) 0%, rgba(33, 33, 33, 0.9) 100%)'
    : 'linear-gradient(45deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 240, 240, 0.9) 100%)',
  backdropFilter: 'blur(10px)',
  borderRadius: '16px',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 8px 32px rgba(0, 0, 0, 0.3)'
    : '0 8px 32px rgba(31, 38, 135, 0.15)',
  border: theme.palette.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(255, 255, 255, 0.5)',
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
  },
}));

const StatCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, rgba(66, 66, 66, 0.9) 0%, rgba(33, 33, 33, 0.9) 100%)'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 240, 240, 0.9) 100%)',
  borderRadius: '16px',
  backdropFilter: 'blur(10px)',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 4px 20px rgba(0, 0, 0, 0.2)'
    : '0 4px 20px rgba(31, 38, 135, 0.1)',
  border: theme.palette.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(255, 255, 255, 0.5)',
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  textTransform: 'none',
  padding: '8px 24px',
  fontWeight: 600,
  boxShadow: 'none',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
}));

const StatusChip = styled(Chip)(({ theme }) => ({
  borderRadius: '8px',
  fontWeight: 600,
  padding: '0 12px',
}));

interface Loan {
  _id: string;
  title: string;
  type: 'given' | 'taken';
  purpose: string;
  amount: number;
  interestRate: number;
  startDate: string;
  endDate: string;
  status: string;
  nextPaymentDate?: string;
  remainingAmount: number;
}

const Loans: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);

  useEffect(() => {
    fetchLoans();
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location.state]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (loan: any) => {
    setSelectedLoan(loan);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/loans/${selectedLoan._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setLoans(loans.filter(loan => loan._id !== selectedLoan._id));
      setDeleteModalVisible(false);
      setSuccessMessage('Loan deleted successfully');
    } catch (error) {
      setError('Failed to delete loan');
    }
  };

  const getTotalLent = () => loans.filter(loan => loan.type === 'given').reduce((sum, loan) => sum + loan.amount, 0);
  const getTotalBorrowed = () => loans.filter(loan => loan.type === 'taken').reduce((sum, loan) => sum + loan.amount, 0);
  const getTotalInterest = () => loans.reduce((sum, loan) => sum + (loan.amount * loan.interestRate / 100), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Loan Management
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Track and manage all your loans in one place
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ActionButton
            variant="outlined"
            startIcon={<CalculateIcon />}
            onClick={() => navigate('/loan-calculator')}
          >
            Calculator
          </ActionButton>
          <ActionButton
            variant="outlined"
            startIcon={<CompareIcon />}
            onClick={() => navigate('/compare-loans')}
          >
            Compare
          </ActionButton>
          <ActionButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/add-loan')}
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white',
            }}
          >
            New Loan
          </ActionButton>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <AccountBalanceIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
              <Typography variant="h6">Total Loans</Typography>
              <Typography variant="h4" fontWeight="bold">{loans.length}</Typography>
              <Typography variant="body2" color="text.secondary">Active: {loans.filter(loan => loan.status === 'active').length}</Typography>
            </Box>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: theme.palette.success.main }} />
              <Typography variant="h6">Total Lent</Typography>
              <Typography variant="h4" fontWeight="bold">{formatCurrency(getTotalLent())}</Typography>
              <Typography variant="body2" color="text.secondary">Given to others</Typography>
            </Box>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <TrendingDownIcon sx={{ fontSize: 40, color: theme.palette.error.main }} />
              <Typography variant="h6">Total Borrowed</Typography>
              <Typography variant="h4" fontWeight="bold">{formatCurrency(getTotalBorrowed())}</Typography>
              <Typography variant="body2" color="text.secondary">Taken from others</Typography>
            </Box>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <PercentIcon sx={{ fontSize: 40, color: theme.palette.warning.main }} />
              <Typography variant="h6">Total Interest</Typography>
              <Typography variant="h4" fontWeight="bold">{formatCurrency(getTotalInterest())}</Typography>
              <Typography variant="body2" color="text.secondary">Accumulated interest</Typography>
            </Box>
          </StatCard>
        </Grid>
      </Grid>

      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>My Loans</Typography>

      <Grid container spacing={3}>
        {loans.map((loan) => (
          <Grid item xs={12} md={6} key={loan._id}>
            <StyledCard>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">{loan.title}</Typography>
                  <StatusChip
                    label={loan.status}
                    color={loan.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                  <IconButton onClick={() => handleDelete(loan)}>
                    <DeleteOutlined />
                  </IconButton>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Amount</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(loan.amount)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Interest Rate</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {loan.interestRate}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Next Payment</Typography>
                    <Typography variant="body1">
                      {loan.nextPaymentDate ? new Date(loan.nextPaymentDate).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Remaining</Typography>
                    <Typography variant="body1">
                      {formatCurrency(loan.remainingAmount)}
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Chip
                    label={loan.type === 'given' ? 'Lent to' : 'Borrowed from'}
                    size="small"
                    color={loan.type === 'given' ? 'success' : 'error'}
                    sx={{ borderRadius: '8px' }}
                  />
                  <Chip
                    label={loan.purpose}
                    size="small"
                    color="primary"
                    sx={{ borderRadius: '8px' }}
                  />
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Modal
        open={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          border: '2px solid #000',
          boxShadow: 24,
          p: 4,
        }}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Delete Loan
          </Typography>
          <Typography id="modal-modal-description" sx={{ mt: 2 }}>
            Are you sure you want to delete this loan? This action cannot be undone.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={() => setDeleteModalVisible(false)}>Cancel</Button>
            <Button onClick={confirmDelete} variant="contained" color="error">Delete</Button>
          </Box>
        </Box>
      </Modal>
    </Container>
  );
};

export default Loans;

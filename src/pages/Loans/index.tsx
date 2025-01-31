import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
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
  alpha,
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
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import Navbar from '../../components/Navbar';
import { API_BASE_URL } from '../../config';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`
    : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
  backdropFilter: 'blur(20px)',
  borderRadius: '20px',
  border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.2 : 0.1)}`,
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: `0 20px 40px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.1)}`,
    borderColor: theme.palette.primary.main,
  },
}));

const StatCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
  backdropFilter: 'blur(10px)',
  borderRadius: '24px',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: `0 8px 30px ${alpha(theme.palette.primary.main, 0.15)}`,
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  padding: '10px 24px',
  fontWeight: 600,
  textTransform: 'none',
  transition: 'all 0.3s ease',
  '&.MuiButton-contained': {
    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.5)}`,
    },
  },
  '&.MuiButton-outlined': {
    borderColor: alpha(theme.palette.primary.main, 0.5),
    '&:hover': {
      background: alpha(theme.palette.primary.main, 0.05),
      borderColor: theme.palette.primary.main,
    },
  },
}));

const IconContainer = styled(Box)(({ theme }) => ({
  width: 60,
  height: 60,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.3)} 100%)`,
  boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.2)}`,
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

const LoansPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

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

  const getTotalLent = () => loans.filter(loan => loan.type === 'given').reduce((sum, loan) => sum + loan.amount, 0);
  const getTotalBorrowed = () => loans.filter(loan => loan.type === 'taken').reduce((sum, loan) => sum + loan.amount, 0);
  const getTotalInterest = () => loans.reduce((sum, loan) => sum + (loan.amount * loan.interestRate / 100), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      color: 'text.primary',
      pb: 8
    }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 4
        }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Loans
          </Typography>
          <Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/loans/new')}
              sx={{ mr: 2 }}
            >
              Add Loan
            </Button>
            <Button
              variant="outlined"
              startIcon={<CalculateIcon />}
              onClick={() => navigate('/loans/calculator')}
              sx={{ mr: 2 }}
            >
              Calculator
            </Button>
            <Button
              variant="outlined"
              startIcon={<CompareIcon />}
              onClick={() => navigate('/loans/compare')}
            >
              Compare
            </Button>
          </Box>
        </Box>

        <Grid container spacing={4} sx={{ mb: 6 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard elevation={0}>
              <IconContainer>
                <AccountBalanceIcon sx={{ fontSize: 30, color: theme.palette.primary.main }} />
              </IconContainer>
              <Typography variant="h4" fontWeight="bold">
                {loans.length}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
                Total Loans
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.success.main }}>
                {loans.filter(loan => loan.status === 'active').length} Active
              </Typography>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard elevation={0}>
              <IconContainer>
                <TrendingUpIcon sx={{ fontSize: 30, color: theme.palette.success.main }} />
              </IconContainer>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(getTotalLent())}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Total Lent
              </Typography>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard elevation={0}>
              <IconContainer>
                <TrendingDownIcon sx={{ fontSize: 30, color: theme.palette.error.main }} />
              </IconContainer>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(getTotalBorrowed())}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Total Borrowed
              </Typography>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard elevation={0}>
              <IconContainer>
                <PercentIcon sx={{ fontSize: 30, color: theme.palette.warning.main }} />
              </IconContainer>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(getTotalInterest())}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Total Interest
              </Typography>
            </StatCard>
          </Grid>
        </Grid>

        <Typography 
          variant="h5" 
          sx={{ 
            mb: 4, 
            fontWeight: 700,
            position: 'relative',
            '&:after': {
              content: '""',
              position: 'absolute',
              bottom: -8,
              left: 0,
              width: 60,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.palette.primary.main,
            }
          }}
        >
          My Loans
        </Typography>

        {loading ? (
          <Box sx={{ width: '100%', mt: 2 }}>
            <LinearProgress sx={{ borderRadius: 1 }} />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {loans.map((loan) => (
              <Grid item xs={12} md={6} key={loan._id}>
                <StyledCard>
                  <CardContent sx={{ height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h5" fontWeight="bold">
                        {loan.title}
                      </Typography>
                      <Chip
                        label={loan.status}
                        color={loan.status === 'active' ? 'success' : 'default'}
                        sx={{ 
                          borderRadius: '8px',
                          fontWeight: 600,
                          background: loan.status === 'active' 
                            ? `linear-gradient(45deg, ${theme.palette.success.light}, ${theme.palette.success.main})`
                            : undefined,
                        }}
                      />
                    </Box>

                    <Grid container spacing={3}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Amount
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" sx={{ color: theme.palette.primary.main }}>
                          {formatCurrency(loan.amount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Interest Rate
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" sx={{ color: theme.palette.warning.main }}>
                          {loan.interestRate}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Next Payment
                        </Typography>
                        <Typography variant="body1">
                          {loan.nextPaymentDate 
                            ? new Date(loan.nextPaymentDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })
                            : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Remaining
                        </Typography>
                        <Typography variant="body1" sx={{ color: theme.palette.error.main }}>
                          {formatCurrency(loan.remainingAmount)}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                      <Chip
                        label={loan.type === 'given' ? 'Lent to' : 'Borrowed from'}
                        size="small"
                        sx={{
                          borderRadius: '8px',
                          background: loan.type === 'given'
                            ? `linear-gradient(45deg, ${theme.palette.success.light}, ${theme.palette.success.main})`
                            : `linear-gradient(45deg, ${theme.palette.error.light}, ${theme.palette.error.main})`,
                          color: '#fff',
                          fontWeight: 600,
                        }}
                      />
                      <Chip
                        label={loan.purpose}
                        size="small"
                        sx={{
                          borderRadius: '8px',
                          background: `linear-gradient(45deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                          color: '#fff',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  </CardContent>
                </StyledCard>
              </Grid>
            ))}
          </Grid>
        )}

        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSuccessMessage('')} 
            severity="success" 
            sx={{ 
              width: '100%',
              borderRadius: 2,
              background: theme.palette.success.main,
              color: '#fff'
            }}
          >
            {successMessage}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setError('')} 
            severity="error" 
            sx={{ 
              width: '100%',
              borderRadius: 2,
              background: theme.palette.error.main,
              color: '#fff'
            }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default LoansPage;

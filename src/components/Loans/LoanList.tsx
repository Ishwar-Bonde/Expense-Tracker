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
  Container
} from '@mui/material';
import {
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  Calculate as CalculateIcon,
  Compare as CompareIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';
import { Loan } from '../../interfaces/Loan';
import { API_BASE_URL } from '../../config';

const LoanList: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

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
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
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
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {loan.purpose}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {loan.type === 'given' ? 'Lent to' : 'Borrowed from'}: {loan.borrower}
                      </Typography>
                    </Box>
                    <Chip 
                      label={loan.status}
                      size="small"
                      sx={{ 
                        bgcolor: getLoanStatusColor(loan.status).bg,
                        color: getLoanStatusColor(loan.status).color,
                        fontWeight: 500
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
                        <Typography variant="h6" sx={{ mt: 1 }}>
                          {loan.interestRate}%
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Next Payment
                      </Typography>
                      <Typography sx={{ color: theme => theme.palette.mode === 'dark' ? '#818cf8' : '#6366f1' }}>
                        {formatCurrency(loan.monthlyInstallment)} on {new Date(loan.nextPaymentDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" color="text.secondary">
                        Remaining
                      </Typography>
                      <Typography>
                        {formatCurrency(loan.remainingAmount)}
                      </Typography>
                    </Box>
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
    </Container>
  );
};

export default LoanList;

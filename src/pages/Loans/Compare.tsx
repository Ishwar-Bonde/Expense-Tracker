import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  IconButton,
  Paper,
  useTheme,
  Fade,
  Grow,
  Slide,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Compare as CompareIcon,
  CurrencyRupee as CurrencyIcon,
  Percent as PercentIcon,
  AccessTime as TimeIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import Navbar from '../../components/Navbar';

interface LoanInput {
  amount: string;
  interestRate: string;
  term: string;
}

interface LoanResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
}

const LoanCompare: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loans, setLoans] = useState<LoanInput[]>([
    { amount: '', interestRate: '', term: '' },
    { amount: '', interestRate: '', term: '' }
  ]);
  const [results, setResults] = useState<LoanResult[]>([]);

  const handleChange = (index: number, field: keyof LoanInput, value: string) => {
    const newLoans = [...loans];
    newLoans[index] = { ...newLoans[index], [field]: value };
    setLoans(newLoans);
  };

  const addLoan = () => {
    setLoans([...loans, { amount: '', interestRate: '', term: '' }]);
  };

  const removeLoan = (index: number) => {
    setLoans(loans.filter((_, i) => i !== index));
    setResults(results.filter((_, i) => i !== index));
  };

  const calculateComparisons = () => {
    const newResults = loans.map(loan => {
      const principal = parseFloat(loan.amount) || 0;
      const annualRate = (parseFloat(loan.interestRate) || 0) / 100;
      const termYears = parseFloat(loan.term) || 0;
      
      const monthlyRate = annualRate / 12;
      const totalPayments = termYears * 12;
      
      const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
      const totalPayment = monthlyPayment * totalPayments;
      const totalInterest = totalPayment - principal;
      
      return {
        monthlyPayment: isNaN(monthlyPayment) ? 0 : monthlyPayment,
        totalPayment: isNaN(totalPayment) ? 0 : totalPayment,
        totalInterest: isNaN(totalInterest) ? 0 : totalInterest
      };
    });
    setResults(newResults);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        minHeight: '100vh',
        pt: 4,
        pb: 8,
        background: (theme) => theme.palette.mode === 'dark' 
          ? `linear-gradient(45deg, ${alpha(theme.palette.primary.dark, 0.1)}, ${alpha(theme.palette.secondary.dark, 0.1)})`
          : `linear-gradient(45deg, ${alpha(theme.palette.primary.light, 0.1)}, ${alpha(theme.palette.secondary.light, 0.1)})`,
      }}
    >
      <Navbar />
      
      <Container maxWidth="xl">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              mb: 2,
              background: (theme) => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: (theme) => `0 2px 4px ${alpha(theme.palette.common.black, 0.1)}`
            }}
          >
            Loan Comparison Calculator
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Compare multiple loan scenarios and make informed financial decisions
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
          <Button
            variant="contained"
            onClick={addLoan}
            disabled={loans.length >= 4}
            startIcon={<AddIcon />}
            sx={{
              borderRadius: '100px',
              px: 4,
              py: 1.5,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: (theme) => `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
              '&:hover': {
                bgcolor: 'primary.dark',
                transform: 'translateY(-2px)',
                boxShadow: (theme) => `0 12px 20px ${alpha(theme.palette.primary.main, 0.4)}`
              },
              '&.Mui-disabled': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.4),
                color: 'primary.contrastText'
              }
            }}
          >
            {loans.length < 4 ? 'Add New Loan' : 'Maximum Loans Added'} ({loans.length}/4)
          </Button>
        </Box>

        <Box 
          sx={{ 
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: 4,
            mb: 6,
            width: '100%',
            minHeight: 600,
            overflowX: 'auto',
            overflowY: 'hidden',
            px: 4,
            py: 2,
          }}
        >
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 4,
              width: '100%',
              maxWidth: '800px',
              mx: 'auto'
            }}
          >
            {loans.map((loan, index) => (
              <Grow
                key={index}
                in={true}
                style={{ transformOrigin: '50% 0 0' }}
                {...(index === loans.length - 1 ? { timeout: 1000 } : { timeout: 0 })}
              >
                <Paper
                  elevation={4}
                  sx={{
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 4,
                    background: (theme) => theme.palette.mode === 'dark'
                      ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.background.paper, 0.7)})`
                      : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)}, ${alpha(theme.palette.background.paper, 0.85)})`,
                    backdropFilter: 'blur(20px)',
                    border: '1px solid',
                    borderColor: (theme) => alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.3 : 0.1),
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: (theme) => `0 20px 40px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.1)}`,
                      borderColor: 'primary.main',
                      '& .loan-number': {
                        transform: 'scale(1.1) rotate(10deg)'
                      }
                    }
                  }}
                >
                  <Box sx={{ p: 4 }}>
                    <Box sx={{ position: 'relative', mb: 4 }}>
                      <Typography 
                        className="loan-number"
                        sx={{ 
                          position: 'absolute',
                          top: -20,
                          right: -20,
                          width: 64,
                          height: 64,
                          borderRadius: '24px',
                          background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          color: 'primary.contrastText',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.75rem',
                          fontWeight: 700,
                          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: (theme) => `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`
                        }}
                      >
                        {index + 1}
                      </Typography>
                      
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          fontWeight: 700,
                          color: 'primary.main',
                          mb: 1,
                          textShadow: (theme) => `0 2px 4px ${alpha(theme.palette.common.black, 0.1)}`
                        }}
                      >
                        Loan Option {index + 1}
                      </Typography>
                      
                      {loans.length > 2 && (
                        <IconButton
                          onClick={() => removeLoan(index)}
                          sx={{ 
                            position: 'absolute',
                            right: -12,
                            top: -12,
                            bgcolor: 'error.main',
                            color: 'white',
                            width: 36,
                            height: 36,
                            '&:hover': {
                              bgcolor: 'error.dark',
                              transform: 'rotate(90deg)'
                            },
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    <Box sx={{ mb: 4 }}>
                      <TextField
                        fullWidth
                        label="Loan Amount"
                        value={loan.amount}
                        onChange={(e) => handleChange(index, 'amount', e.target.value)}
                        type="number"
                        placeholder="Enter amount"
                        InputProps={{
                          startAdornment: <CurrencyIcon sx={{ mr: 1, color: 'primary.main' }} />,
                          sx: {
                            height: 56,
                            '&:hover': {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main'
                              }
                            }
                          }
                        }}
                        sx={{ 
                          mb: 3,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.2 : 0.8),
                            backdropFilter: 'blur(8px)',
                            transition: 'all 0.3s',
                            '&.Mui-focused': {
                              bgcolor: 'background.paper',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                                borderWidth: 2
                              }
                            }
                          },
                          '& .MuiInputLabel-root': {
                            '&.Mui-focused': {
                              color: 'primary.main'
                            }
                          }
                        }}
                      />

                      <TextField
                        fullWidth
                        label="Interest Rate (%)"
                        value={loan.interestRate}
                        onChange={(e) => handleChange(index, 'interestRate', e.target.value)}
                        type="number"
                        placeholder="Enter rate"
                        InputProps={{
                          startAdornment: <PercentIcon sx={{ mr: 1, color: 'primary.main' }} />,
                          inputProps: { min: 0, max: 100, step: 0.1 },
                          sx: {
                            height: 56,
                            '&:hover': {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main'
                              }
                            }
                          }
                        }}
                        sx={{ 
                          mb: 3,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.2 : 0.8),
                            backdropFilter: 'blur(8px)',
                            transition: 'all 0.3s',
                            '&.Mui-focused': {
                              bgcolor: 'background.paper',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                                borderWidth: 2
                              }
                            }
                          },
                          '& .MuiInputLabel-root': {
                            '&.Mui-focused': {
                              color: 'primary.main'
                            }
                          }
                        }}
                      />

                      <TextField
                        fullWidth
                        label="Loan Term (Years)"
                        value={loan.term}
                        onChange={(e) => handleChange(index, 'term', e.target.value)}
                        type="number"
                        placeholder="Enter term"
                        InputProps={{
                          startAdornment: <TimeIcon sx={{ mr: 1, color: 'primary.main' }} />,
                          inputProps: { min: 1, max: 30, step: 1 },
                          sx: {
                            height: 56,
                            '&:hover': {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main'
                              }
                            }
                          }
                        }}
                        sx={{ 
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.2 : 0.8),
                            backdropFilter: 'blur(8px)',
                            transition: 'all 0.3s',
                            '&.Mui-focused': {
                              bgcolor: 'background.paper',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                                borderWidth: 2
                              }
                            }
                          },
                          '& .MuiInputLabel-root': {
                            '&.Mui-focused': {
                              color: 'primary.main'
                            }
                          }
                        }}
                      />
                    </Box>

                    {results[index] && (
                      <Slide direction="up" in timeout={500}>
                        <Box>
                          <Box 
                            sx={{ 
                              p: 3,
                              borderRadius: 3,
                              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.8)})`,
                              color: 'primary.contrastText',
                              mb: 3,
                              textAlign: 'center',
                              position: 'relative',
                              overflow: 'hidden',
                              boxShadow: (theme) => `0 8px 32px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.4 : 0.2)}`,
                              '&::after': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: (theme) => `linear-gradient(45deg, ${alpha(theme.palette.common.white, 0.1)} 0%, ${alpha(theme.palette.common.white, 0)} 100%)`,
                                zIndex: 1
                              }
                            }}
                          >
                            <Typography variant="overline" sx={{ opacity: 0.9, letterSpacing: 2 }}>
                              Monthly Payment
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
                              {formatCurrency(results[index].monthlyPayment)}
                            </Typography>
                          </Box>

                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Box 
                                sx={{ 
                                  p: 2,
                                  borderRadius: 3,
                                  bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.6 : 0.8),
                                  textAlign: 'center',
                                  height: '100%',
                                  transition: 'all 0.3s',
                                  border: '1px solid',
                                  borderColor: (theme) => alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.2 : 0.1),
                                  '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: (theme) => `0 12px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.3 : 0.1)}`,
                                    borderColor: 'primary.main',
                                    bgcolor: 'background.paper'
                                  }
                                }}
                              >
                                <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1 }}>
                                  Total Payment
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mt: 1 }}>
                                  {formatCurrency(results[index].totalPayment)}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6}>
                              <Box 
                                sx={{ 
                                  p: 2,
                                  borderRadius: 3,
                                  bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.6 : 0.8),
                                  textAlign: 'center',
                                  height: '100%',
                                  transition: 'all 0.3s',
                                  border: '1px solid',
                                  borderColor: (theme) => alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.2 : 0.1),
                                  '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: (theme) => `0 12px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.3 : 0.1)}`,
                                    borderColor: 'primary.main',
                                    bgcolor: 'background.paper'
                                  }
                                }}
                              >
                                <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1 }}>
                                  Total Interest
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mt: 1 }}>
                                  {formatCurrency(results[index].totalInterest)}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      </Slide>
                    )}
                  </Box>
                </Paper>
              </Grow>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<CompareIcon />}
            onClick={calculateComparisons}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 700,
              textTransform: 'none',
              background: (theme) => `linear-gradient(45deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.8)})`,
              boxShadow: (theme) => `0 8px 16px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.4 : 0.2)}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: (theme) => `0 12px 20px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.4 : 0.2)}`,
              }
            }}
          >
            Compare Loans
          </Button>
        </Box>

        {/* Results section */}
        {results.length > 0 && (
          <Slide direction="up" in={results.length > 0} mountOnEnter unmountOnExit>
            <Box sx={{ mt: 6 }}>
              {/* Rest of the results content */}
            </Box>
          </Slide>
        )}
      </Container>
    </Box>
  );
};

export default LoanCompare;
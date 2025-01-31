import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  MenuItem,
  useTheme
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  CurrencyRupee as CurrencyIcon,
  Percent as PercentIcon,
  AccessTime as TimeIcon,
  CalendarMonth as FrequencyIcon,
  AccountBalance as AccountIcon
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/format';

const LoanCalculator: React.FC = () => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    amount: '',
    interestRate: '',
    term: '',
    paymentFrequency: 'monthly',
    monthlyIncome: ''
  });

  const [result, setResult] = useState<{
    monthlyPayment: number;
    totalPayment: number;
    totalInterest: number;
  } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateLoan = () => {
    const amount = Number(formData.amount);
    const annualRate = Number(formData.interestRate) / 100;
    const monthlyRate = annualRate / 12;
    const totalMonths = Number(formData.term) * 12;

    const monthlyPayment =
      (amount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1);

    const totalPayment = monthlyPayment * totalMonths;
    const totalInterest = totalPayment - amount;

    setResult({
      monthlyPayment,
      totalPayment,
      totalInterest
    });
  };

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2, p: 3 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Loan Amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            type="number"
            InputProps={{
              startAdornment: <CurrencyIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Interest Rate (%)"
            name="interestRate"
            value={formData.interestRate}
            onChange={handleChange}
            type="number"
            InputProps={{
              startAdornment: <PercentIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Loan Term (Years)"
            name="term"
            value={formData.term}
            onChange={handleChange}
            type="number"
            InputProps={{
              startAdornment: <TimeIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            select
            label="Payment Frequency"
            name="paymentFrequency"
            value={formData.paymentFrequency}
            onChange={handleChange}
            InputProps={{
              startAdornment: <FrequencyIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ mb: 3 }}
          >
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="quarterly">Quarterly</MenuItem>
            <MenuItem value="annually">Annually</MenuItem>
          </TextField>

          <TextField
            fullWidth
            label="Monthly Income (Optional)"
            name="monthlyIncome"
            value={formData.monthlyIncome}
            onChange={handleChange}
            type="number"
            helperText="Used to calculate affordability"
            InputProps={{
              startAdornment: <AccountIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ mb: 4 }}
          />

          <Button
            fullWidth
            variant="contained"
            onClick={calculateLoan}
            startIcon={<CalculateIcon />}
            sx={{
              py: 1.5,
              bgcolor: '#6366f1',
              '&:hover': {
                bgcolor: '#4f46e5'
              }
            }}
          >
            Calculate
          </Button>
        </Grid>

        {result && (
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 3, bgcolor: '#f8fafc', borderRadius: 2, mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Monthly Payment
              </Typography>
              <Typography variant="h4" sx={{ color: '#6366f1', fontWeight: 600 }}>
                {formatCurrency(result.monthlyPayment)}
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={6}>
                <Box sx={{ p: 3, bgcolor: '#f8fafc', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Total Payment
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatCurrency(result.totalPayment)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 3, bgcolor: '#f8fafc', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Total Interest
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatCurrency(result.totalInterest)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default LoanCalculator;

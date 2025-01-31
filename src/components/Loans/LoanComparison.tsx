import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  BarChart as ChartIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';
import { LoanComparison as ILoanComparison } from '../../interfaces/Loan';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface EditDialogState {
  open: boolean;
  loan: ILoanComparison | null;
}

const LoanComparison: React.FC = () => {
  const [comparisons, setComparisons] = useState<ILoanComparison[]>([]);
  const [showChart, setShowChart] = useState<boolean>(false);
  const [editDialog, setEditDialog] = useState<EditDialogState>({ open: false, loan: null });
  const navigate = useNavigate();

  useEffect(() => {
    loadComparisons();
  }, []);

  const loadComparisons = () => {
    const saved = JSON.parse(localStorage.getItem('loanComparisons') || '[]');
    setComparisons(saved);
  };

  const handleDelete = (id: number) => {
    const updated = comparisons.filter(loan => loan.id !== id);
    localStorage.setItem('loanComparisons', JSON.stringify(updated));
    setComparisons(updated);
  };

  const handleEdit = (loan: ILoanComparison) => {
    setEditDialog({ open: true, loan });
  };

  const handleSaveEdit = () => {
    if (!editDialog.loan) return;

    const updated = comparisons.map(loan => 
      loan.id === editDialog.loan?.id ? editDialog.loan : loan
    );
    localStorage.setItem('loanComparisons', JSON.stringify(updated));
    setComparisons(updated);
    setEditDialog({ open: false, loan: null });
  };

  const getChartData = () => {
    return comparisons.map(loan => ({
      name: loan?.name,
      'Monthly EMI': loan?.emi,
      'Total Interest': loan?.totalInterest,
      'Principal': loan?.principal
    }));
  };

  const getBestOption = () => {
    if (comparisons.length === 0) return null;
    
    const sorted = [...comparisons].sort((a, b) => {
      // First prioritize affordability if monthly income is provided
      if (a.monthlyIncomeRatio && b.monthlyIncomeRatio) {
        if (a.monthlyIncomeRatio > 40 && b.monthlyIncomeRatio <= 40) return 1;
        if (b.monthlyIncomeRatio > 40 && a.monthlyIncomeRatio <= 40) return -1;
      }
      
      // Then compare total cost
      return a.totalPayment - b.totalPayment;
    });
    
    return sorted[0];
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Loan Comparison
        </Typography>
        <Box>
          <Tooltip title="Show Chart">
            <IconButton onClick={() => setShowChart(!showChart)} sx={{ mr: 1 }}>
              <ChartIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/loans/calculator')}
          >
            Add Option
          </Button>
        </Box>
      </Box>

      {comparisons.length > 0 ? (
        <>
          {showChart && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Visual Comparison
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip />
                    <Legend />
                    <Bar dataKey="Monthly EMI" fill="#8884d8" />
                    <Bar dataKey="Total Interest" fill="#82ca9d" />
                    <Bar dataKey="Principal" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {getBestOption() && (
            <Card sx={{ mb: 3, bgcolor: 'success.light' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recommended Option: {getBestOption()?.name}
                </Typography>
                <Typography variant="body1">
                  This option offers the best balance of affordability and total cost.
                </Typography>
                <Box mt={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2">
                        Monthly EMI: {formatCurrency(getBestOption()!.emi)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2">
                        Total Interest: {formatCurrency(getBestOption()!.totalInterest)}
                      </Typography>
                    </Grid>
                    {getBestOption()?.monthlyIncomeRatio && (
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2">
                          EMI to Income Ratio: {Math.round(getBestOption()!.monthlyIncomeRatio!)}%
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          )}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Principal</TableCell>
                  <TableCell align="right">Interest Rate</TableCell>
                  <TableCell align="right">EMI</TableCell>
                  <TableCell align="right">Total Interest</TableCell>
                  <TableCell align="right">Total Payment</TableCell>
                  <TableCell align="right">EMI/Income</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {comparisons.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>{loan.name}</TableCell>
                    <TableCell align="right">{formatCurrency(loan.principal)}</TableCell>
                    <TableCell align="right">{loan.rate}%</TableCell>
                    <TableCell align="right">{formatCurrency(loan.emi)}</TableCell>
                    <TableCell align="right">{formatCurrency(loan.totalInterest)}</TableCell>
                    <TableCell align="right">{formatCurrency(loan.totalPayment)}</TableCell>
                    <TableCell align="right">
                      {loan.monthlyIncomeRatio ? (
                        <Chip
                          label={`${Math.round(loan.monthlyIncomeRatio)}%`}
                          color={
                            loan.monthlyIncomeRatio > 40 ? 'error' :
                            loan.monthlyIncomeRatio > 30 ? 'warning' :
                            'success'
                          }
                          size="small"
                        />
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(loan)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(loan.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center" 
          p={3}
        >
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No loan options to compare
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/loans/calculator')}
          >
            Add Your First Option
          </Button>
        </Box>
      )}

      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, loan: null })}>
        <DialogTitle>Edit Loan Option</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={editDialog.loan?.name || ''}
            onChange={(e) => setEditDialog(prev => ({
              ...prev,
              loan: prev.loan ? { ...prev.loan, name: e.target.value } : null
            }))}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, loan: null })}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoanComparison;

import React from 'react';
import { Box, Container, useTheme } from '@mui/material';
import AddLoan from '../../components/Loans/AddLoan';
import Navbar from '../../components/Navbar';

const NewLoanPage: React.FC = () => {
  const theme = useTheme();

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary'
      }}
    >
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 3 }}>
          <AddLoan />
        </Box>
      </Container>
    </Box>
  );
};

export default NewLoanPage;

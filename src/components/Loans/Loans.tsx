import React from 'react';
import { Container } from '@mui/material';
import LoanList from './LoanList';
import Navbar from '../Navbar';

const Loans: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Navbar />
      <LoanList />
    </Container>
  );
};

export default Loans;

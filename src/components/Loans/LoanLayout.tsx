import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Paper, Tabs, Tab, Box, ThemeProvider } from '@mui/material';
import { getCurrentTheme } from '../../utils/theme';

interface LoanLayoutProps {
  children: React.ReactNode;
}

const LoanLayout: React.FC<LoanLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    switch (location.pathname) {
      case '/loans':
        return 0;
      case '/loans/calculator':
        return 1;
      case '/loans/compare':
        return 2;
      default:
        return 0;
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/loans');
        break;
      case 1:
        navigate('/loans/calculator');
        break;
      case 2:
        navigate('/loans/compare');
        break;
    }
  };

  return (
    <ThemeProvider theme={getCurrentTheme()}>
      <div className="min-h-screen bg-gray-900">
        <Container maxWidth="lg" sx={{ pt: 10, pb: 4 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              bgcolor: '#1e293b', // Dark blue background
              color: 'white'
            }}
          >
            <Tabs
              value={getActiveTab()}
              onChange={handleTabChange}
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
              sx={{
                '& .MuiTab-root': {
                  color: '#94a3b8', // Light gray text
                  '&.Mui-selected': {
                    color: '#818cf8' // Purple when selected
                  }
                }
              }}
            >
              <Tab label="My Loans" />
              <Tab label="Loan Calculator" />
              <Tab label="Compare Loans" />
            </Tabs>
          </Paper>
          <Box sx={{ bgcolor: '#1e293b', borderRadius: 2, p: 3 }}>
            {children}
          </Box>
        </Container>
      </div>
    </ThemeProvider>
  );
};

export default LoanLayout;

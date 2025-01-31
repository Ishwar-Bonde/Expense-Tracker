import { useEffect, useState } from 'react';
import { RouterProvider, createBrowserRouter, Route, createRoutesFromElements } from 'react-router-dom';
import { API_BASE_URL } from './config';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AddIncome from './pages/AddIncome';
import AddExpense from './pages/AddExpense';
import Settings from './pages/Settings';
import RecurringTransactions from './pages/RecurringTransactions';
import Predictions from './pages/Predictions';
import { Toaster } from 'react-hot-toast';
import PrivateRoute from './components/PrivateRoute';
import Intro from './pages/Intro';
import LoansPage from './pages/Loans';
import LoanCalculatorPage from './pages/Loans/Calculator';
import LoanComparePage from './pages/Loans/Compare';
import NewLoanPage from './pages/Loans/New';
import { getCurrentTheme, applyTheme } from './utils/theme';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Intro/>} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
      <Route path="/add-income" element={<PrivateRoute><AddIncome /></PrivateRoute>} />
      <Route path="/add-expense" element={<PrivateRoute><AddExpense /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/recurring" element={<PrivateRoute><RecurringTransactions /></PrivateRoute>} />
      <Route path="/predictions" element={<PrivateRoute><Predictions /></PrivateRoute>} />
      <Route path="/loans" element={<PrivateRoute><LoansPage /></PrivateRoute>} />
      <Route path="/loans/new" element={<PrivateRoute><NewLoanPage /></PrivateRoute>} />
      <Route path="/loans/calculator" element={<PrivateRoute><LoanCalculatorPage /></PrivateRoute>} />
      <Route path="/loans/compare" element={<PrivateRoute><LoanComparePage /></PrivateRoute>} />
    </>
  ),
  {
    future: {
      v7_relativeSplatPath: true
    }
  }
);

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState(getCurrentTheme());

  useEffect(() => {
    const initializeApp = async () => {
      // Load theme from API and apply it
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/theme`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.theme === 'light' || data.theme === 'dark') {
              applyTheme(data.theme);
              setTheme(getCurrentTheme());
            }
          }
        } catch (error) {
          console.error('Error loading theme:', error);
        }
      }
      setIsLoading(false);
    };

    initializeApp();

    // Listen for theme changes
    const handleThemeChange = () => {
      setTheme(getCurrentTheme());
    };

    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
          },
        }} 
      />
    </ThemeProvider>
  );
}

export default App;
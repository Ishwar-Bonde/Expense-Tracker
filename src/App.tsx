import { useEffect, useState } from 'react';
import { RouterProvider, createBrowserRouter, Route, createRoutesFromElements } from 'react-router-dom';
import { applyTheme } from './utils/theme';
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
// import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';
import PrivateRoute from './components/PrivateRoute';
import Intro from './pages/Intro';

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

  useEffect(() => {
    const initializeTheme = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Fetch theme from MongoDB if user is logged in
          const response = await fetch(`${API_BASE_URL}/api/theme`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            applyTheme(data.theme);
          }
          else {
            applyTheme('light');
          }
        } catch (error) {
          console.error('Error fetching theme:', error);
          applyTheme('light'); // Fallback to light theme if fetch fails
        }
      } else {
        applyTheme('light'); // Fallback to light theme if user is not logged in
      }
      
      setIsLoading(false);
    };

    initializeTheme();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" />
    </>
  );
}

export default App;
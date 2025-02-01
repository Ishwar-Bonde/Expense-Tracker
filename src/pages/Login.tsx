import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';
import { fadeIn, formItemAnimation, buttonAnimation } from '../utils/animations';
import { API_BASE_URL } from '../config';
import { applyTheme } from '../utils/theme';
import toast from 'react-hot-toast';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Set token expiry time (1 hour from now)
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + 1);
        localStorage.setItem('tokenExpiry', expiryTime.toISOString());

        // Fetch user's theme from MongoDB
        try {
          const themeResponse = await fetch(`${API_BASE_URL}/api/theme`, {
            headers: {
              'Authorization': `Bearer ${data.token}`
            }
          });
          
          if (themeResponse.ok) {
            const themeData = await themeResponse.json();
            applyTheme(themeData.theme);
          }
        } catch (themeError) {
          console.error('Error fetching theme:', themeError);
          // Fallback to light theme if theme fetch fails
          applyTheme('light');
        }

        toast.success('Login successful!');
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setError(data.message || 'Login failed');
        toast.error(data.message || 'Login failed');
      }
    } catch (error) {
      setError('An error occurred during login');
      toast.error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4 py-12"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/3 top-1/4 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute right-1/3 bottom-1/4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute left-1/2 bottom-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <motion.div 
        className="max-w-md w-full bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 relative z-10"
        whileHover={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
        transition={{ duration: 0.3 }}
      >
        <motion.div 
          className="flex justify-center mb-8"
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <LogIn className="w-16 h-16 text-purple-600" />
        </motion.div>

        <motion.h2 
          className="text-3xl font-bold text-center mb-2 text-gray-800"
          variants={fadeIn}
        >
          Welcome Back
        </motion.h2>
        
        <motion.p 
          className="text-center text-gray-600 mb-8"
          variants={fadeIn}
        >
          Sign in to manage your expenses
        </motion.p>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md mb-6"
          >
            Login successful! Redirecting to dashboard...
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div variants={formItemAnimation} custom={0} className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Mail className="w-4 h-4 mr-2 text-gray-400 group-focus-within:text-purple-500" />
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900"
              placeholder="your@email.com"
            />
          </motion.div>

          <motion.div variants={formItemAnimation} custom={1} className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Lock className="w-4 h-4 mr-2 text-gray-400 group-focus-within:text-purple-500" />
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900"
              placeholder="••••••••"
            />
          </motion.div>

          <motion.button
            type="submit"
            disabled={isLoading}
            variants={buttonAnimation}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className={`w-full py-4 px-6 rounded-lg shadow-lg text-white text-lg font-semibold 
              ${isLoading ? 'bg-gray-400' : 'bg-gradient-to-r from-purple-500 to-indigo-600'} 
              transform transition-all duration-200 
              ${isLoading ? 'cursor-not-allowed' : 'hover:translate-y-[-2px]'}`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-3 border-white border-t-transparent rounded-full mr-3"
                />
                Signing in...
              </div>
            ) : 'Sign in'}
          </motion.button>
        </form>

        <motion.p 
          variants={fadeIn}
          className="mt-8 text-center text-sm text-gray-600"
        >
          Don't have an account?{' '}
          <Link 
            to="/signup" 
            className="font-medium text-purple-600 hover:text-purple-500 transition-colors duration-200"
          >
            Sign up
          </Link>
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

export default Login;
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeIn, formItemAnimation, buttonAnimation } from '../utils/animations';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'INR'];

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    defaultCurrency: 'USD'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setSuccess(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        data = { message: 'Server error occurred' };
      }
      
      if (response.ok) {
        setSuccess(true);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Account created successfully!');
        navigate('/dashboard');
      } else {
        const errorMessage = data.details || data.message || 'Signup failed';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (err) {
      setError('An error occurred during signup');
      toast.error('An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
          <UserPlus className="w-16 h-16 text-purple-600" />
        </motion.div>

        <motion.h2 
          className="text-3xl font-bold text-center mb-2 text-gray-800"
          variants={fadeIn}
        >
          Create Account
        </motion.h2>
        
        <motion.p 
          className="text-center text-gray-600 mb-8"
          variants={fadeIn}
        >
          Join us to manage your finances better
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
            Account created successfully! Redirecting to dashboard...
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <motion.div variants={formItemAnimation} custom={0} className="group">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <User className="w-4 h-4 mr-2 text-gray-400 group-focus-within:text-purple-500" />
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </motion.div>

            <motion.div variants={formItemAnimation} custom={1} className="group">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <User className="w-4 h-4 mr-2 text-gray-400 group-focus-within:text-purple-500" />
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </motion.div>
          </div>

          <motion.div variants={formItemAnimation} custom={2} className="group">
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
              className="block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </motion.div>

          <motion.div variants={formItemAnimation} custom={3} className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Lock className="w-4 h-4 mr-2 text-gray-400 group-focus-within:text-purple-500" />
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              className="block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </motion.div>

          <motion.div variants={formItemAnimation} custom={4} className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-gray-400 group-focus-within:text-purple-500" />
              Default Currency
            </label>
            <select
              name="defaultCurrency"
              value={formData.defaultCurrency}
              onChange={handleChange}
              className="block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            >
              {CURRENCIES.map(currency => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
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
                Creating Account...
              </div>
            ) : 'Create Account'}
          </motion.button>
        </form>

        <motion.p 
          variants={fadeIn}
          className="mt-8 text-center text-sm text-gray-600"
        >
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="font-medium text-purple-600 hover:text-purple-500 transition-colors duration-200"
          >
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

export default Signup;
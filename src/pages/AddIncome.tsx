import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, DollarSign, Calendar, FileText, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import { fadeIn, formItemAnimation, buttonAnimation } from '../utils/animations';
import { formatCurrency, CurrencyCode, CURRENCIES } from '../utils/currency';
import { API_BASE_URL } from '../config';
import CategorySelect from '../components/CategorySelect';
import { getDefaultCategoryForType } from '../utils/categories';

interface FormData {
  title: string;
  description: string;
  amount: string;
  date: string;
  categoryId: string;
}

interface Transaction {
  _id: string;
  title: string;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  categoryId: string;
  createdAt: string;
}

const AddIncome: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    amount: '0.00',
    date: new Date().toISOString().split('T')[0],
    categoryId: getDefaultCategoryForType('income').id
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userCurrency, setUserCurrency] = useState<CurrencyCode>('USD');
  const [recentIncomes, setRecentIncomes] = useState<Transaction[]>([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserCurrency(user.defaultCurrency || 'USD');

    // Listen for currency changes
    const handleCurrencyChange = (event: CustomEvent) => {
      setUserCurrency(event.detail.currency);
    };

    window.addEventListener('currencyChange', handleCurrencyChange as EventListener);
    return () => {
      window.removeEventListener('currencyChange', handleCurrencyChange as EventListener);
    };
  }, []);

  useEffect(() => {
    fetchRecentIncomes();
  }, []);

  useEffect(() => {
    setRecentIncomes(recentIncomes);
  }, [recentIncomes]);

  const fetchRecentIncomes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions?type=income&limit=5`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch recent incomes');
      const data = await response.json();
      // Sort by createdAt in descending order
      const sortedIncomes = data.sort((a: Transaction, b: Transaction) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRecentIncomes(sortedIncomes.slice(0, 5)); // Only show last 5 incomes
    } catch (error) {
      toast.error('Failed to fetch recent incomes');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setSuccess(false);

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const currency = user.defaultCurrency || 'USD';

      // Validate category
      if (!formData.categoryId) {
        throw new Error('Please select a category');
      }

      const response = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          amount: parseFloat(formData.amount),
          date: formData.date,
          type: 'income',
          currency: currency,
          categoryId: formData.categoryId // Ensure categoryId is included
        })
      });

      const data = await response.json();
      console.log('Response from server:', data); // Debug log

      if (response.ok) {
        setSuccess(true);
        toast.success('Income added successfully!');
        navigate('/dashboard');
      } else {
        setError(data.message || 'Failed to add income');
        toast.error(data.message || 'Failed to add income');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An error occurred while adding income');
      toast.error(error.message || 'An error occurred while adding income');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryChange = (categoryId: string) => {
    console.log('Category changed to:', categoryId); // Debug log
    setFormData(prev => ({
      ...prev,
      categoryId
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      {isLoading && <Loading />}
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Add New Income</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your earnings and keep your finances organized</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 border border-green-100 dark:border-green-900"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <PlusCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Income Details</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enter the details of your income</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title Input */}
              <motion.div variants={formItemAnimation} custom={0}>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Title
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 dark:text-white"
                    placeholder="Salary, Freelance, etc."
                    required
                  />
                </div>
              </motion.div>

              {/* Amount Input */}
              <motion.div variants={formItemAnimation} custom={1}>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Amount
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="number"
                    name="amount"
                    id="amount"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm dark:text-gray-400">
                      {userCurrency}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Date Input */}
              <motion.div variants={formItemAnimation} custom={2}>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Date
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="date"
                    name="date"
                    id="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </motion.div>

              {/* Description Input */}
              <motion.div variants={formItemAnimation} custom={3}>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Description (Optional)
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    name="description"
                    id="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 dark:text-white"
                    placeholder="Add any additional notes..."
                  />
                </div>
              </motion.div>

              {/* Category Select */}
              <motion.div
                variants={formItemAnimation}
                className="space-y-2"
              >
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Category
                </label>
                <CategorySelect
                  type="income"
                  value={formData.categoryId}
                  onChange={handleCategoryChange}
                />
              </motion.div>

              {/* Submit Button */}
              <motion.button
                variants={buttonAnimation}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className={`w-full px-4 py-3 text-white bg-green-500 rounded-xl hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Adding Income...' : 'Add Income'}
              </motion.button>
            </form>
          </motion.div>

          {/* Recent Incomes Section */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 border border-green-100 dark:border-green-900"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Incomes</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your latest income entries</p>
              </div>
            </div>

            <div className="space-y-4">
              {recentIncomes.length === 0 ? (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-4"
                  >
                    <PlusCircle className="w-12 h-12 mx-auto text-gray-400" />
                  </motion.div>
                  <p className="text-gray-600 dark:text-gray-400">No recent incomes</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Your recent incomes will appear here</p>
                </div>
              ) : (
                recentIncomes.map((income, index) => (
                  <motion.div
                    key={income._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {income.title}
                        </h3>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(income.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })} at {new Date(income.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </div>
                      <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                        +{formatCurrency(income.amount, userCurrency)}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AddIncome;
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MinusCircle, DollarSign, Calendar, FileText, Tag } from 'lucide-react';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import { fadeIn, formItemAnimation, buttonAnimation } from '../utils/animations';
import { formatCurrency, CurrencyCode, CURRENCIES, convertCurrencyWithRates, getExchangeRates } from '../utils/currency';
import { API_BASE_URL } from '../config';
import toast from 'react-hot-toast';
import CategorySelect from '../components/CategorySelect';
import { getDefaultCategoryForType } from '../utils/categories';

interface FormData {
  title: string;
  description: string;
  amount: number;
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
  createdAt: string;
  currency: string;
}

function AddExpense() {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    categoryId: getDefaultCategoryForType('expense').id
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userCurrency, setUserCurrency] = useState<CurrencyCode>('USD');
  const [recentExpenses, setRecentExpenses] = useState<Transaction[]>([]);
  const [convertedAmounts, setConvertedAmounts] = useState<Record<string, number>>({});

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
    fetchRecentExpenses();
  }, []);

  useEffect(() => {
    const updateAmounts = async () => {
      if (recentExpenses.length > 0) {
        const rates = await getExchangeRates(userCurrency);
        if (!rates) return;

        const converted: Record<string, number> = {};
        for (const expense of recentExpenses) {
          const sourceCurrency = (expense.currency || 'USD') as CurrencyCode;
          const targetCurrency = userCurrency as CurrencyCode;
          const convertedAmount = await convertCurrencyWithRates(expense.amount, sourceCurrency, targetCurrency, rates);
          converted[expense._id] = convertedAmount;
        }
        setConvertedAmounts(converted);
      }
    };

    updateAmounts();
  }, [recentExpenses, userCurrency]);

  const fetchRecentExpenses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions?type=expense&limit=5`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch recent expenses');
      const data = await response.json();
      // Sort by createdAt in descending order
      const sortedExpenses = data.sort((a: Transaction, b: Transaction) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRecentExpenses(sortedExpenses.slice(0, 5)); // Only show last 5 expenses
    } catch (error) {
      toast.error('Failed to fetch recent expenses');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          type: 'expense',
          currency: userCurrency
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success('Expense added successfully!');
        fetchRecentExpenses();
        setFormData({
          title: '',
          description: '',
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          categoryId: getDefaultCategoryForType('expense').id
        });
      } else {
        setError(data.message || 'Failed to add expense');
        toast.error(data.message || 'Failed to add expense');
      }
    } catch (err) {
      setError('An error occurred while adding the expense');
      toast.error('An error occurred while adding the expense');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    console.log('Category changed to:', categoryId); // Debug log
    setFormData(prev => ({
      ...prev,
      categoryId
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      {isLoading && <Loading />}
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Add New Expense</h1>
          <p className="text-gray-600 dark:text-gray-400">Keep track of your spending and manage your budget</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 border border-red-100 dark:border-red-900"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <MinusCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Details</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enter the details of your expense</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div variants={formItemAnimation}>
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
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 dark:text-white"
                    placeholder="Rent, Groceries, etc."
                    required
                  />
                </div>
              </motion.div>

              <motion.div variants={formItemAnimation}>
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
                    className="block w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 dark:text-white"
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

              <motion.div variants={formItemAnimation}>
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
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </motion.div>

              <motion.div variants={formItemAnimation}>
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
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 dark:text-white"
                    placeholder="Add any additional notes..."
                  />
                </div>
              </motion.div>

              <motion.div variants={formItemAnimation}>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Category
                </label>
                <CategorySelect
                  type="expense"
                  value={formData.categoryId}
                  onChange={handleCategoryChange}
                />
              </motion.div>

              <motion.button
                variants={buttonAnimation}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
              >
                {isLoading ? 'Adding Expense...' : 'Add Expense'}
              </motion.button>
            </form>
          </motion.div>

          {/* Recent Expenses Section */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 border border-red-100 dark:border-red-900"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <DollarSign className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Expenses</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your latest expense entries</p>
              </div>
            </div>

            <div className="space-y-4">
              {recentExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-4"
                  >
                    <MinusCircle className="w-12 h-12 mx-auto text-gray-400" />
                  </motion.div>
                  <p className="text-gray-600 dark:text-gray-400">No recent expenses</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Your recent expenses will appear here</p>
                </div>
              ) : (
                recentExpenses.map((expense) => (
                  <motion.div
                    key={expense._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {expense.title}
                        </h3>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(expense.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })} at {new Date(expense.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </div>
                      <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                        -{formatCurrency(convertedAmounts[expense._id] || expense.amount, userCurrency)}
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
}

export default AddExpense;
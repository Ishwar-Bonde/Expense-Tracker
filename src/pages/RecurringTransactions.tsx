import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { format } from 'date-fns';
import { RecurringTransaction } from '../interfaces/RecurringTransaction';
import { RecurringCategory } from '../interfaces/RecurringCategory';
import { fetchWithAuth } from '../utils/fetchInterceptor';
import { API_BASE_URL } from '../config';
import { convertCurrencyWithRates, Currency } from '../utils/currencyConverter';
import { calculateNextOccurrence } from '../utils/recurringDates';
import { PlusIcon, PencilIcon, TrashIcon, CalendarIcon, ArrowPathIcon, BanknotesIcon, ClockIcon, XMarkIcon, TagIcon, SwatchIcon, ArrowDownCircleIcon, ArrowUpCircleIcon, ChevronDownIcon, ExclamationTriangleIcon, CurrencyDollarIcon, } from '@heroicons/react/24/outline';
import Navbar from '../components/Navbar';
import CategorySelect from '../components/CategorySelect';

interface CategoryFormData {
  name: string;
  type: 'income' | 'expense' | 'both';
  color: string;
  icon: string;
}

interface TransactionFormData {
  title: string;
  description: string;
  amount: string;
  type: 'income' | 'expense';
  categoryId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  currency: string;
  icon: string;
}

const RecurringTransactions: React.FC = () => {
  const navigate = useNavigate();
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<RecurringCategory[]>([]);
  const [userCurrency, setUserCurrency] = useState<string>('USD');
  const [convertedAmounts, setConvertedAmounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);
  const [editingCategory, setEditingCategory] = useState<RecurringCategory | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<RecurringTransaction | null>(null);
  const [preferences, setPreferences] = useState<{ theme: 'light' | 'dark' }>({ theme: 'light' });

  const [transactionFormData, setTransactionFormData] = useState<TransactionFormData>({
    title: '',
    description: '',
    amount: '0',
    type: 'expense',
    categoryId: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    currency: userCurrency,
    icon: '💰'
  });

  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    name: '',
    type: 'both',
    color: '#000000',
    icon: '💰',
  });

  const formatCurrency = (amount: number, currency: string = userCurrency) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  useEffect(() => {
    const convertAmounts = async () => {
      try {
        const newConvertedAmounts: Record<string, number> = {};
        for (const transaction of recurringTransactions) {
          try {
            const converted = await convertCurrencyWithRates(
              transaction.amount,
              transaction.currency as Currency,
              userCurrency as Currency
            );
            newConvertedAmounts[transaction._id] = converted;
          } catch (error) {
            console.error(`Error converting amount for transaction ${transaction._id}:`, error);
            newConvertedAmounts[transaction._id] = transaction.amount;
          }
        }
        setConvertedAmounts(newConvertedAmounts);
      } catch (error) {
        console.error('Error in convertAmounts:', error);
        toast.error('Failed to convert currencies. Using original amounts.');
      }
    };
    convertAmounts();
  }, [recurringTransactions, userCurrency]);

  useEffect(() => {
    const fetchUserCurrency = async () => {
      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/settings/currency`);
        const data = await response.json();
        setUserCurrency(data.currency);
      } catch (error) {
        console.error('Error fetching user currency:', error);
        toast.error('Failed to fetch user currency');
      }
    };

    fetchUserCurrency();
  }, []);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/theme`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch theme');
        }

        const data = await response.json();
        if (data && data.theme) {
          setPreferences(prev => ({
            ...prev,
            theme: data.theme
          }));
        }
      } catch (error) {
        console.error('Error fetching theme:', error);
      }
    };

    fetchTheme();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch recurring transactions
  const fetchRecurringTransactions = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/recurring-transactions`);
      if (!response.ok) throw new Error('Failed to fetch recurring transactions');
      const data = await response.json();
      
      // Map the transactions to include originalAmount and originalCurrency if they exist
      const mappedTransactions = data.map((transaction: any) => ({
        ...transaction,
        originalAmount: transaction.originalAmount || transaction.amount,
        originalCurrency: transaction.originalCurrency || transaction.currency,
        amount: transaction.amount,
        currency: transaction.displayCurrency || transaction.currency
      }));
      
      setRecurringTransactions(mappedTransactions);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch recurring transactions');
    } finally {
      setLoading(false);
    }
  };

  // Load recurring categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`${API_BASE_URL}/api/recurring-categories`);
      if (!response.ok) throw new Error('Failed to fetch recurring categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load recurring categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchRecurringTransactions(),
        loadCategories()
      ]);
    };
    loadData();
  }, []);

    // Handle transaction form submission
    const handleTransactionSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
        // Client-side validation
        const requiredFields = {
          title: 'Title',
          amount: 'Amount',
          type: 'Type',
          categoryId: 'Category',
          frequency: 'Frequency',
          startDate: 'Start Date'
        };

        const missingFields = Object.entries(requiredFields).filter(
          ([key]) => !transactionFormData[key as keyof typeof transactionFormData]
        );

        if (missingFields.length > 0) {
          const missingFieldNames = missingFields.map(([_, label]) => label).join(', ');
          toast.error(`Please fill in all required fields: ${missingFieldNames}`);
          return;
        }

        // Validate amount
        const amount = Number(transactionFormData.amount);
        if (isNaN(amount) || amount <= 0) {
          toast.error('Please enter a valid amount greater than 0');
          return;
        }

        // Validate and process dates
        const startDate = new Date(transactionFormData.startDate);
        if (isNaN(startDate.getTime())) {
          toast.error('Please enter a valid start date');
          return;
        }

        let endDate = null;
        if (transactionFormData.endDate) {
          endDate = new Date(transactionFormData.endDate);
          if (isNaN(endDate.getTime())) {
            toast.error('Please enter a valid end date');
            return;
          }
          if (endDate < startDate) {
            toast.error('End date must be after start date');
            return;
          }
        }

        // Calculate the next occurrence using the new utility
        const nextDueDate = calculateNextOccurrence({
          startDate,
          frequency: transactionFormData.frequency,
          endDate: endDate || undefined
        });

        // Prepare the payload
        const payload = {
          title: transactionFormData.title.trim(),
          description: transactionFormData.description?.trim() || '',
          amount: Number(transactionFormData.amount),
          type: transactionFormData.type,
          categoryId: transactionFormData.categoryId,
          frequency: transactionFormData.frequency,
          startDate: startDate.toISOString(),
          endDate: endDate?.toISOString() || null,
          nextDueDate: nextDueDate.toISOString(),
          currency: transactionFormData.currency,
          icon: transactionFormData.icon || '💰'
        };

        console.log('Submitting transaction:', {
          type: editingTransaction ? 'UPDATE' : 'CREATE',
          id: editingTransaction?._id,
          payload
        });

        const url = editingTransaction 
          ? `${API_BASE_URL}/api/recurring-transactions/${editingTransaction._id}`
          : `${API_BASE_URL}/api/recurring-transactions`;

        const response = await fetchWithAuth(url, {
          method: editingTransaction ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
          console.log('Server error response:', responseData);
          let errorMessage = 'Failed to save transaction';
          
          if (responseData.message) {
            errorMessage = responseData.message;
          }
          
          if (responseData.errors && Array.isArray(responseData.errors)) {
            errorMessage += ': ' + responseData.errors.join(', ');
          }
          
          toast.error(errorMessage);
          return;
        }

        console.log('Transaction saved successfully:', responseData);

        await fetchRecurringTransactions();
        setShowModal(false);
        resetTransactionForm();
        setEditingTransaction(null);
        
        toast.success(editingTransaction 
          ? 'Recurring transaction updated successfully'
          : 'Recurring transaction created successfully'
        );
      } catch (error) {
        console.error('Error saving transaction:', error);
        toast.error('Failed to save recurring transaction. Please try again.');
      }
    };
    
      // Handle category form submission
      const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
          const endpoint = editingCategory 
            ? `${API_BASE_URL}/api/recurring-categories/${editingCategory._id}`
            : `${API_BASE_URL}/api/recurring-categories`;
          
          const method = editingCategory ? 'PUT' : 'POST';
          const response = await fetchWithAuth(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryFormData),
          });
    
          if (!response.ok) throw new Error('Failed to save recurring category');
          
          toast.success(editingCategory 
            ? 'Recurring category updated successfully'
            : 'Recurring category created successfully'
          );
          
          setShowCategoryModal(false);
          setEditingCategory(null);
          resetCategoryForm();
          loadCategories();
        } catch (error) {
          console.error('Error:', error);
          toast.error('Failed to save recurring category');
        }
      };
    
      const handleDeleteTransaction = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this recurring transaction?')) return;
        
        try {
          const response = await fetchWithAuth(
            `${API_BASE_URL}/api/recurring-transactions/${id}`,
            { method: 'DELETE' }
          );
          
          if (!response.ok) throw new Error('Failed to delete recurring transaction');
          
          toast.success('Recurring transaction deleted successfully');
          fetchRecurringTransactions();
        } catch (error) {
          console.error('Error:', error);
          toast.error('Failed to delete recurring transaction');
        }
      };
    
      const handleDeleteCategoryConfirm = async (categoryId: string) => {
        if (!categoryId) return;

        try {
          const response = await fetchWithAuth(`${API_BASE_URL}/api/recurring-categories/${categoryId}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete category');
          }

          toast.success('Category and related transactions deleted successfully');
          // Refresh both categories and transactions
          await Promise.all([
            loadCategories(),
            fetchRecurringTransactions()
          ]);
          setShowDeleteModal(false);
        } catch (error) {
          console.error('Error:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to delete category');
        }
      };

      const handleDeleteCategory = (categoryId: string) => {
        const category = categories.find(cat => cat._id === categoryId);
        if (!category) return;

        // Find all transactions that use this category
        const relatedTransactions = recurringTransactions.filter(
          trans => trans.categoryId === categoryId
        );
        
        setCategoryToDelete({ ...category, transactionCount: relatedTransactions.length });
        setShowDeleteModal(true);
      };
    
      const resetTransactionForm = () => {
        setTransactionFormData({
          title: '',
          description: '',
          amount: '0',
          type: 'expense',
          categoryId: '',
          frequency: 'monthly',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          currency: userCurrency,
          icon: '💰'
        });
        setEditingTransaction(null);
      };
    
      const resetCategoryForm = () => {
        setCategoryFormData({
          name: '',
          type: 'both',
          color: '#000000',
          icon: '💰',
        });
      };
    
      const handleEditTransaction = async (transaction: RecurringTransaction) => {
        console.log('Editing transaction:', transaction);
        setEditingTransaction(transaction);

        // Convert the amount back to the original currency's value
        const amount = transaction.amount;

        setTransactionFormData({
          title: transaction.title,
          description: transaction.description || '',
          amount: amount.toString(),
          type: transaction.type,
          categoryId: transaction.categoryId,
          frequency: transaction.frequency,
          startDate: new Date(transaction.startDate).toISOString().split('T')[0],
          endDate: transaction.endDate ? new Date(transaction.endDate).toISOString().split('T')[0] : '',
          currency: transaction.currency,
          icon: transaction.icon || '💰'
        });
        setShowModal(true);
      };

      const handleCurrencyChange = async (newCurrency: string) => {
        if (!transactionFormData.amount) {
          setTransactionFormData(prev => ({ ...prev, currency: newCurrency }));
          return;
        }

        try {
          const currentAmount = parseFloat(transactionFormData.amount);
          if (isNaN(currentAmount)) {
            setTransactionFormData(prev => ({ ...prev, currency: newCurrency }));
            return;
          }

          const fromCurrency = transactionFormData.currency || userCurrency;
          const convertedAmount = await convertCurrencyWithRates(
            currentAmount,
            fromCurrency as Currency,
            newCurrency as Currency
          );

          setTransactionFormData(prev => ({
            ...prev,
            currency: newCurrency,
            amount: convertedAmount.toFixed(2)
          }));
        } catch (error) {
          console.error('Error converting amount:', error);
          setTransactionFormData(prev => ({ ...prev, currency: newCurrency }));
        }
      };

      const handleEditCategory = (category: RecurringCategory) => {
        setEditingCategory(category);
        setCategoryFormData({
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        });
        setShowCategoryModal(true);
      };
    
      const getFrequencyColor = (frequency: string) => {
        switch (frequency) {
          case 'daily': return 'bg-purple-100 text-purple-800';
          case 'weekly': return 'bg-blue-100 text-blue-800';
          case 'monthly': return 'bg-green-100 text-green-800';
          case 'yearly': return 'bg-orange-100 text-orange-800';
          default: return 'bg-gray-100 text-gray-800';
        }
      };

      const getCategoryName = (categoryId: string) => {
        const category = categories.find(cat => cat._id === categoryId);
        return category ? category.name : '';
      };

      const onEmojiClick = (emojiObject: any) => {
        setCategoryFormData({ ...categoryFormData, icon: emojiObject.emoji });
        setShowEmojiPicker(false);
      };

      const handleEditClick = (transaction: RecurringTransaction) => {
        setTransactionFormData({
          title: transaction.title,
          description: transaction.description || '',
          amount: transaction.amount?.toString() || '0',
          type: transaction.type,
          categoryId: transaction.categoryId,
          frequency: transaction.frequency,
          startDate: transaction.startDate.split('T')[0],
          endDate: transaction.endDate ? transaction.endDate.split('T')[0] : '',
          currency: transaction.currency,
          icon: transaction.icon || '💰'
        });
        setEditingTransaction(transaction);
        setShowModal(true);
      };

      const handleDeleteClick = (transaction: RecurringTransaction) => {
        setTransactionToDelete(transaction);
      };

      const handleDeleteConfirm = async () => {
        if (!transactionToDelete) return;

        try {
          const response = await fetchWithAuth(`${API_BASE_URL}/api/recurring-transactions/${transactionToDelete._id}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            throw new Error('Failed to delete recurring transaction');
          }

          fetchRecurringTransactions();
          setTransactionToDelete(null);
        } catch (error) {
          console.error('Error:', error);
          toast.error('Failed to delete recurring transaction');
        }
      };

      const handleDeleteCancel = () => {
        setTransactionToDelete(null);
        setShowDeleteModal(false);
      };

      const renderTransactionAmount = (transaction: RecurringTransaction) => {
        try {
          // Show original amount and currency if available, otherwise show converted amount
          const amount = transaction.originalAmount?.toString() || transaction.amount.toString();
          const currency = transaction.originalCurrency || transaction.currency;
          
          return (
            <span className={`font-semibold ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
              {transaction.type === 'income' ? '+' : '-'} {currency} {amount}
            </span>
          );
        } catch (error) {
          console.error('Error rendering transaction amount:', error);
          return (
            <span className="text-red-500">Error displaying amount</span>
          );
        }
      };

      const getRelatedTransactionsCount = (categoryId: string) => {
        return recurringTransactions.filter(t => t.categoryId === categoryId).length;
      };

      const formatNextDueDate = (transaction: RecurringTransaction) => {
        const nextDue = new Date(transaction.nextDueDate);
        return format(nextDue, 'MMM d, yyyy');
      };

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Navbar />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Recurring Transactions
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Manage your recurring expenses and income
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    resetCategoryForm();
                    setShowCategoryModal(true);
                  }}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg border border-transparent hover:bg-green-700 transition-colors"
                >
                  <TagIcon className="w-5 h-5 mr-2" />
                  Add Category
                </button>
                <button
                  onClick={() => {
                    resetTransactionForm();
                    setShowModal(true);
                  }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg border border-transparent hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add Transaction
                </button>
              </div>
            </div>

            {/* Currency Note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <CurrencyDollarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-400 mb-1">Multi-Currency Support</h3>
                  <p className="text-blue-800 dark:text-blue-300 text-sm leading-relaxed">
                    Transactions are displayed in their original currency while being converted to your default currency for calculations.
                    This helps you track expenses in different currencies while maintaining accurate totals.
                  </p>
                </div>
              </div>
            </div>

            {/* Categories Section */}
            <div className="mb-12">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Recurring Categories
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {categories.map((category) => (
                  <motion.div
                    key={category._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">{category.icon}</span>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                            {category.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        {!category.isDefault && (
                          <button
                            onClick={() => {
                              setCategoryToDelete(category);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div
                      className="mt-2 w-full h-1 rounded"
                      style={{ backgroundColor: category.color }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Transactions Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Recurring Transactions
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recurringTransactions.map((transaction) => (
                  <motion.div
                    key={transaction._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {transaction.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {getCategoryName(transaction.categoryId)}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleEditTransaction(transaction)}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setTransactionToDelete(transaction);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <BanknotesIcon className="w-5 h-5 mr-2" />
                            <span>Amount</span>
                          </div>
                          <span className={`font-medium ${
                            transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {renderTransactionAmount(transaction)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <ArrowPathIcon className="w-5 h-5 mr-2" />
                            <span>Frequency</span>
                          </div>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {transaction.frequency.charAt(0).toUpperCase() + transaction.frequency.slice(1)}
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <CalendarIcon className="w-4 h-4" />
                              <span>Original Start</span>
                            </div>
                            <span className="text-gray-900 dark:text-gray-100">
                              {format(new Date(transaction.startDate), 'MMM d, yyyy')}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <ClockIcon className="w-4 h-4" />
                              <span>Last Processed</span>
                            </div>
                            <span className="text-gray-900 dark:text-gray-100">
                              {transaction.lastProcessedDate 
                                ? format(new Date(transaction.lastProcessedDate), 'MMM d, yyyy')
                                : 'Not processed yet'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <CalendarIcon className="w-4 h-4" />
                              <span>Next Due</span>
                            </div>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {format(new Date(transaction.nextDueDate), 'MMM d, yyyy')}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <CalendarIcon className="w-4 h-4" />
                              <span>End Date</span>
                            </div>
                            <span className="text-gray-900 dark:text-gray-100">
                              {transaction.endDate 
                                ? format(new Date(transaction.endDate), 'MMM d, yyyy')
                                : 'Not set'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 relative"
                >
                  <button
                    onClick={() => {
                      setShowCategoryModal(false);
                      setEditingCategory(null);
                      resetCategoryForm();
                    }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
    
                  <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
                    {editingCategory ? 'Edit' : 'Add'} Recurring Category
                  </h2>
    
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={categoryFormData.name}
                          onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setCategoryFormData({ ...categoryFormData, type: 'expense' })}
                            className={`flex items-center justify-center gap-2 p-3 rounded-lg border ${
                              categoryFormData.type === 'expense'
                                ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800'
                                : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                            }`}
                          >
                            <ArrowDownCircleIcon className="w-5 h-5" />
                            <span>Expense</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryFormData({ ...categoryFormData, type: 'income' })}
                            className={`flex items-center justify-center gap-2 p-3 rounded-lg border ${
                              categoryFormData.type === 'income'
                                ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/30 dark:border-green-800'
                                : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                            }`}
                          >
                            <ArrowUpCircleIcon className="w-5 h-5" />
                            <span>Income</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Color
                        </label>
                        <div className="flex gap-2">
                          {['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#6366F1', '#D946EF'].map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setCategoryFormData({ ...categoryFormData, color })}
                              className={`w-8 h-8 rounded-full ${
                                categoryFormData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          <input
                            type="color"
                            value={categoryFormData.color}
                            onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                            className="w-8 h-8 p-0 border-0 rounded-full cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Icon
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="w-10 h-10 flex items-center justify-center text-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                          >
                            {categoryFormData.icon}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="flex-1 h-10 px-4 text-left bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400"
                          >
                            Select an emoji
                          </button>
                        </div>
                        {showEmojiPicker && (
                          <div className="fixed inset-0 flex items-center justify-center z-50">
                            <div ref={emojiPickerRef} className="relative">
                              <EmojiPicker
                                onEmojiClick={(emojiObject) => {
                                  setCategoryFormData({ ...categoryFormData, icon: emojiObject.emoji });
                                  setShowEmojiPicker(false);
                                }}
                                theme={preferences?.theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
    
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCategoryModal(false);
                          setEditingCategory(null);
                          resetCategoryForm();
                        }}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg border border-transparent"
                      >
                        {editingCategory ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
    
            {/* Delete Confirmation Modal */}
            {showDeleteModal && categoryToDelete && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4 bg-red-100 dark:bg-red-900/20 p-3 rounded-full">
                      <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                      Delete Category
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      Are you sure you want to delete this category? This action cannot be undone.
                    </p>
                    <p className="text-red-500 dark:text-red-400 text-sm mb-4">
                      Warning: All transactions associated with this category will also be permanently deleted.
                    </p>

                    <div className="w-full space-y-3 mb-6">
                      <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Category:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {categoryToDelete.name}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Related Transactions:</span>
                        <span className="font-medium text-red-600 dark:text-red-500">
                          {getRelatedTransactionsCount(categoryToDelete._id)}
                        </span>
                      </div>
                      {/* Show related transactions if any exist */}
                      {getRelatedTransactionsCount(categoryToDelete._id) > 0 && (
                        <div className="mt-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Related Transactions:</h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {recurringTransactions
                              .filter(t => t.categoryId === categoryToDelete._id)
                              .map(transaction => (
                                <div key={transaction._id} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">{transaction.title}</span>
                                  <span className="text-gray-900 dark:text-white">{renderTransactionAmount(transaction)}</span>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => {
                          setShowDeleteModal(false);
                          setCategoryToDelete(null);
                        }}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteCategoryConfirm(categoryToDelete._id)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg border border-transparent"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Delete Modal */}
            {showDeleteModal && transactionToDelete && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg">
                      <ExclamationTriangleIcon className="w-6 h-6 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium">Delete Confirmation</p>
                        <p className="text-sm text-red-600/90 dark:text-red-400/90">
                          Are you sure you want to delete this recurring transaction? This action cannot be undone.
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {transactionToDelete.title}
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${
                            transactionToDelete.type === 'income'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                          }`}>
                            {transactionToDelete.type === 'income' ? 'Income' : 'Expense'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Amount</span>
                            <span className={`font-medium ${
                              transactionToDelete.type === 'income'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {renderTransactionAmount(transactionToDelete)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Frequency</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {transactionToDelete.frequency.charAt(0).toUpperCase() + transactionToDelete.frequency.slice(1)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Next Due</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatNextDueDate(transactionToDelete)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={handleDeleteCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(transactionToDelete._id)}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Modal */}
            {showModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
                >
                  {/* Type Selection Header */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setTransactionFormData(prev => ({ ...prev, type: 'expense' }))}
                      className={`flex-1 p-4 text-center ${
                        transactionFormData.type === 'expense'
                        ? 'bg-red-500 text-white dark:bg-red-600'
                        : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">💸</span>
                        <span className="font-medium">Expense</span>
                      </div>
                    </button>
                    <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
                    <button
                      type="button"
                      onClick={() => setTransactionFormData(prev => ({ ...prev, type: 'income' }))}
                      className={`flex-1 p-4 text-center ${
                        transactionFormData.type === 'income'
                        ? 'bg-green-500 text-white dark:bg-green-600'
                        : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">💰</span>
                        <span className="font-medium">Income</span>
                      </div>
                    </button>
                  </div>

                  {/* Main Content */}
                  <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                    <div className="space-y-5">
                      {/* Amount Input - Featured */}
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="relative">
                          <input
                            type="number"
                            value={transactionFormData.amount}
                            onChange={(e) => {
                              const newAmount = e.target.value;
                              setTransactionFormData(prev => ({ ...prev, amount: newAmount }));
                            }}
                            className="w-full text-3xl font-bold px-12 py-3 bg-transparent border-none focus:ring-0 text-center text-gray-700 dark:text-gray-200"
                            placeholder="0.00"
                            step="0.01"
                          />
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 pl-4 text-2xl font-bold text-gray-400 dark:text-gray-500">
                            {transactionFormData.currency === 'INR' ? '₹' : 
                             transactionFormData.currency === 'USD' ? '$' :
                             transactionFormData.currency === 'EUR' ? '€' :
                             transactionFormData.currency === 'GBP' ? '£' : '$'}
                          </div>
                        </div>
                      </div>

                      {/* Title, Category and Currency */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                            Title
                          </label>
                          <input
                            type="text"
                            value={transactionFormData.title}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, title: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring focus:ring-blue-500/20 text-gray-900 dark:text-gray-100"
                            placeholder="Enter title"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                            Category
                          </label>
                          <select
                            value={transactionFormData.categoryId}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, categoryId: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring focus:ring-blue-500/20 text-gray-900 dark:text-gray-100"
                          >
                            <option value="">Select category</option>
                            {categories
                              .filter(cat => cat.type === 'both' || cat.type === transactionFormData.type)
                              .map(category => (
                                <option key={category._id} value={category._id}>
                                  {category.icon} {category.name}
                                </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                            Currency
                          </label>
                          <select
                            value={transactionFormData.currency || userCurrency}
                            onChange={(e) => handleCurrencyChange(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring focus:ring-blue-500/20 text-gray-900 dark:text-gray-100"
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="INR">INR</option>
                          </select>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                          Description
                        </label>
                        <textarea
                          value={transactionFormData.description}
                          onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring focus:ring-blue-500/20 resize-none text-gray-900 dark:text-gray-100"
                          placeholder="Add notes..."
                        />
                      </div>

                      {/* Frequency and Dates */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                            Frequency
                          </label>
                          <select
                            value={transactionFormData.frequency}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, frequency: e.target.value as any })}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring focus:ring-blue-500/20 text-gray-900 dark:text-gray-100"
                          >
                            <option value="daily">Daily 📅</option>
                            <option value="weekly">Weekly 📆</option>
                            <option value="monthly">Monthly 📅</option>
                            <option value="yearly">Yearly 🗓️</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={transactionFormData.startDate}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, startDate: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring focus:ring-blue-500/20 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={transactionFormData.endDate}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, endDate: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring focus:ring-blue-500/20 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          resetTransactionForm();
                        }}
                        className="text-gray-500 dark:text-gray-400"
                      >
                        Cancel
                      </button>
                      <div className="flex gap-3">
                        <button
                          onClick={handleTransactionSubmit}
                          type="button"
                          className={`px-6 py-2 rounded-lg font-medium text-white ${
                            transactionFormData.type === 'expense'
                            ? 'bg-red-500 dark:bg-red-600'
                            : 'bg-green-500 dark:bg-green-600'
                          }`}
                        >
                          {editingTransaction ? 'Update Transaction' : 'Add Transaction'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      );
    }

export default RecurringTransactions;
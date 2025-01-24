import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { formatCurrency, CurrencyCode } from '../utils/currency';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Chart as ChartJS } from 'chart.js';
import {
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { ChartPieIcon } from '@heroicons/react/24/outline';

import Navbar from '../components/Navbar';
import { API_BASE_URL } from '../config';
import { fetchWithAuth } from '../utils/fetchInterceptor';
import { CURRENCIES, convertCurrencyWithRates,getExchangeRates } from '../utils/currency';
import { Category, DEFAULT_CATEGORIES, getCategoryById, fetchCategories } from '../utils/categories';
import { sendNotification, isNotificationsEnabled } from '../utils/notifications';

interface Transaction {
  _id: string;
  title: string;
  description: string;
  amount: number;
  originalAmount?: number;
  formattedAmount: string;
  formattedOriginalAmount?: string;
  date: string;
  formattedDate: string;
  formattedTime: string;
  type: 'income' | 'expense';
  categoryId: string;
  createdAt: string;
}

interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  recentTransactions: Transaction[];
  monthlyData: {
    income: { [key: string]: number };
    expense: { [key: string]: number };
  };
}

interface Settings {
  budgetLimit: number;
  savingsGoal: number;
  notifications: {
    budgetAlerts: boolean;
  };
  defaultCurrency?: string;
}

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Dashboard() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [updateCountdown, setUpdateCountdown] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension: number;
    }[];
  }>({
    labels: [],
    datasets: []
  });
  const [defaultCurrency, setDefaultCurrency] = useState<string>('INR');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalIncome: 0,
    totalExpense: 0,
    recentTransactions: [],
    monthlyData: { income: {}, expense: {} }
  });
  const [settings, setSettings] = useState<Settings>({
    budgetLimit: 0,
    savingsGoal: 0,
    notifications: { budgetAlerts: true }
  });
  const [monthlySavings, setMonthlySavings] = useState<number>(0);
  const [userCurrency, setUserCurrency] = useState<CurrencyCode>('INR');
  const [originalBudgetLimit, setOriginalBudgetLimit] = useState<number>(0);
  const [originalSavingsGoal, setOriginalSavingsGoal] = useState<number>(0);
  const [savingsProgress, setSavingsProgress] = useState<number>(0);
  const [progress, setProgress] = useState({
    budgetProgress: 0,
    savingsProgress: 0
  });
  const [convertedAmounts, setConvertedAmounts] = useState({
    expenses: 0,
    budgetLimit: 0,
    savings: 0,
    savingsGoal: 0
  });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [newBudgetLimit, setNewBudgetLimit] = useState(0);
  const [newSavingsGoal, setNewSavingsGoal] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const notificationSentRef = useRef<{[key: string]: boolean}>({});
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('bar');
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showSavingsGoalModal, setShowSavingsGoalModal] = useState(false);

  // Format for chart labels
  const formatChartCurrency = (value: number) => {
    if (typeof value !== 'number') return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: userCurrency || 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getCurrencySymbol = (currency: string) => {
    switch(currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'INR': return '₹';
      default: return '$';
    }
  };

  const fetchUserSettings = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/settings`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch settings');
      }

      console.log('Fetched settings:', data); // Debug log

      setDefaultCurrency(data.defaultCurrency || 'INR');
      setUserCurrency(data.defaultCurrency || 'INR');
      setOriginalBudgetLimit(data.budgetLimit || 0);
      setOriginalSavingsGoal(data.savingsGoal || 0);
      
      setSettings({
        budgetLimit: data.budgetLimit || 0,
        savingsGoal: data.savingsGoal || 0,
        notifications: data.notifications || { budgetAlerts: true },
        defaultCurrency: data.defaultCurrency || 'INR'
      });

    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch user settings');
      setError('Failed to fetch user settings');
    }
  };

  // Fetch all data including transactions, totals, and chart data
  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`${API_BASE_URL}/api/transactions`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch transactions');
      }

      const data = await response.json();
      console.log('API Response:', data); // Debug log
      
      // Process transactions - handle both array and object formats
      const transactions = Array.isArray(data) ? data : data?.transactions;
      
      if (!transactions || !Array.isArray(transactions)) {
        console.error('Invalid data structure:', data); // Debug log
        throw new Error('Invalid response format: transactions data is missing or invalid');
      }

      const sortedTransactions: Transaction[] = transactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(transaction => {
          // Extract the correct amount from the transaction
          const amount = transaction.amount?.original || transaction.amount;
          
          // Ensure categoryId has a default value if undefined
          const categoryId = transaction.categoryId || (transaction.type === 'income' ? 'other_income' : 'other_expense');
          
          return {
            ...transaction,
            // Ensure amount and categoryId are properly set
            amount: Number(amount),
            categoryId,
            formattedAmount: formatCurrency(Number(amount), userCurrency),
            formattedDate: new Date(transaction.date).toLocaleDateString(),
            formattedTime: (new Date(transaction.createdAt).toLocaleTimeString as any)('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          };
        });

      console.log('Processed transactions:', sortedTransactions); // Debug log

      // Update the transactions state
      setTransactions(sortedTransactions);

      // Calculate totals
      const { totalIncome, totalExpense } = sortedTransactions.reduce<{ totalIncome: number; totalExpense: number }>(
        (acc, curr) => {
          if (curr.type === 'income') {
            acc.totalIncome += Number(curr.amount);
          } else {
            acc.totalExpense += Number(curr.amount);
          }
          return acc;
        },
        { totalIncome: 0, totalExpense: 0 }
      );

      // Process monthly data
      const monthlyData = sortedTransactions.reduce(
        (acc: { income: { [key: string]: number }; expense: { [key: string]: number } }, curr: Transaction) => {
          const date = new Date(curr.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (curr.type === 'income') {
            acc.income[monthKey] = (acc.income[monthKey] || 0) + curr.amount;
          } else {
            acc.expense[monthKey] = (acc.expense[monthKey] || 0) + curr.amount;
          }
          
          return acc;
        },
        { income: {}, expense: {} }
      );

      // Prepare chart data
      const months = Object.keys(monthlyData.income).sort();
      const chartData = {
        labels: months.map(month => {
          const [year, monthNum] = month.split('-');
          return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('default', { month: 'short', year: 'numeric' });
        }),
        datasets: [
          {
            label: 'Income',
            data: months.map(month => monthlyData.income[month] || 0),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4
          },
          {
            label: 'Expenses',
            data: months.map(month => monthlyData.expense[month] || 0),
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4
          }
        ]
      };

      setTotalIncome(totalIncome);
      setTotalExpenses(totalExpense);
      setChartData(chartData);
      setDashboardData({
        totalIncome,
        totalExpense,
        recentTransactions: sortedTransactions
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5),
        monthlyData
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch dashboard data');
      setError('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const calculateTotals = () => {
      const totals = transactions.reduce(
        (acc: { totalIncome: number; totalExpense: number }, transaction: Transaction) => {
          const amount = transaction.amount || 0;
          if (transaction.type === 'income') {
            acc.totalIncome += amount;
          } else {
            acc.totalExpense += amount;
          }
          return acc;
        },
        { totalIncome: 0, totalExpense: 0 }
      );

      setTotalIncome(totals.totalIncome);
      setTotalExpenses(totals.totalExpense);
      setSavingsProgress(((totals.totalIncome - totals.totalExpense) / (settings?.savingsGoal || 1)) * 100);
    };

    calculateTotals();
  }, [transactions, settings]);

  // Initial data fetch
  useEffect(() => {
    const init = async () => {
      await fetchUserSettings();
      await fetchAllData();
    };
    init();
  }, [navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (updateCountdown > 0) {
      timer = setTimeout(() => {
        setUpdateCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [updateCountdown]);

  const handleUpdateBalance = async () => {
    if (updateCountdown > 0) return;
    
    setIsUpdating(true);
    try {
      await fetchAllData();
      toast.success('Dashboard updated successfully');
      setUpdateCountdown(30); // Start 30-second countdown
    } catch (error) {
      toast.error('Failed to update dashboard');
    } finally {
      setIsUpdating(false);
    }
  };

  // Auto refresh when returning to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isUpdating) {
        fetchAllData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isUpdating]);

  // Update progress and converted amounts when relevant values change
  useEffect(() => {
    const newProgress = calculateProgress();
    setProgress(newProgress);

    const monthlySavings = dashboardData.totalIncome - dashboardData.totalExpense;
    setConvertedAmounts({
      expenses: dashboardData.totalExpense,
      budgetLimit: settings.budgetLimit,
      savings: monthlySavings,
      savingsGoal: settings.savingsGoal
    });

    console.log('Updated values:', {
      progress: newProgress,
      convertedAmounts: {
        expenses: dashboardData.totalExpense,
        budgetLimit: settings.budgetLimit,
        savings: monthlySavings,
        savingsGoal: settings.savingsGoal
      }
    });
  }, [dashboardData.totalIncome, dashboardData.totalExpense, settings.budgetLimit, settings.savingsGoal]);

  // Update monthly savings whenever income or expenses change
  useEffect(() => {
    const savings = dashboardData.totalIncome - dashboardData.totalExpense;
    setMonthlySavings(savings);
    console.log('Updated monthly savings:', {
      totalIncome: dashboardData.totalIncome,
      totalExpense: dashboardData.totalExpense,
      savings
    });
  }, [dashboardData.totalIncome, dashboardData.totalExpense]);

  // Load categories function
  const loadCategories = async () => {
    try {
      const allCategories = await fetchCategories();
      const incomeCategories = allCategories.filter(cat => cat.type === 'income');
      const expenseCategories = allCategories.filter(cat => cat.type === 'expense');
      
      setIncomeCategories(incomeCategories);
      setExpenseCategories(expenseCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    }
  };

  // Initial load of categories
  useEffect(() => {
    loadCategories();
  }, []);

  // Reload categories when they change
  useEffect(() => {
    const handleCategoriesChange = () => {
      loadCategories();
    };

    window.addEventListener('categoriesChanged', handleCategoriesChange);
    return () => window.removeEventListener('categoriesChanged', handleCategoriesChange);
  }, []);

  // Common chart options
  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle' as const,
          padding: 15,
          color: 'rgb(156, 163, 175)',
          font: {
            size: 12,
            family: "'Inter', sans-serif",
            weight: 500
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'rgb(229, 231, 235)',
        bodyColor: 'rgb(229, 231, 235)',
        padding: 12,
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        bodyFont: {
          size: 14,
          family: 'Inter var, sans-serif'
        },
        titleFont: {
          size: 14,
          family: 'Inter var, sans-serif',
          weight: 600
        },
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y, userCurrency);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 12,
            family: 'Inter var, sans-serif'
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 12,
            family: 'Inter var, sans-serif'
          },
          callback: function(value: any) {
            return formatCurrency(value, userCurrency);
          }
        }
      }
    }
  };

  // Bar chart options
  const barChartOptions = {
    ...commonChartOptions,
    plugins: {
      ...commonChartOptions.plugins,
      legend: {
        ...commonChartOptions.plugins.legend,
      }
    },
    scales: {
      ...commonChartOptions.scales,
      y: {
        ...commonChartOptions.scales.y,
        beginAtZero: true
      }
    }
  };

  // Line chart options
  const lineChartOptions = {
    ...commonChartOptions,
    elements: {
      line: {
        tension: 0.4
      },
      point: {
        radius: 4,
        hitRadius: 8,
        hoverRadius: 6
      }
    }
  };

  // Pie chart options
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    layout: {
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
      }
    },
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          color: 'rgb(156, 163, 175)',
          font: {
            size: 12,
            family: "'Inter', sans-serif",
            weight: 500
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'rgb(229, 231, 235)',
        bodyColor: 'rgb(229, 231, 235)',
        padding: 12,
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = formatCurrency(context.raw, userCurrency);
            const percentage = ((context.raw / context.dataset.data.reduce((a: number, b: number) => a + b, 0)) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Enhanced chart data
  const getChartData = () => {
    const months = Object.keys(dashboardData.monthlyData.income).sort();
    const labels = months.map(month => {
      const [year, monthNum] = month.split('-');
      return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('default', { month: 'short', year: 'numeric' });
    });

    return {
      labels,
      datasets: [
        {
          label: 'Income',
          data: months.map(month => dashboardData.monthlyData.income[month] || 0),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: chartType === 'area' 
            ? 'rgba(34, 197, 94, 0.1)'
            : chartType === 'bar' 
              ? 'rgba(34, 197, 94, 0.7)'
              : 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Expenses',
          data: months.map(month => dashboardData.monthlyData.expense[month] || 0),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: chartType === 'area' 
            ? 'rgba(239, 68, 68, 0.1)'
            : chartType === 'bar' 
              ? 'rgba(239, 68, 68, 0.7)'
              : 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return (date.toLocaleTimeString as any)('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const checkBudgetLimit = async () => {
    try {
      if (!settings?.notifications?.budgetAlerts || !settings?.budgetLimit || isLoading) {
        return;
      }

      const currentDate = new Date();
      const notificationKey = `budget-notification-${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      const lastNotification = localStorage.getItem(notificationKey);
      
      // Calculate budget percentage
      const percentage = (totalExpenses / settings.budgetLimit) * 100;

      // Show notification based on percentage and notification settings
      if (Notification.permission === 'granted' && settings.notifications.budgetAlerts) {
        if (percentage >= 100 && (!lastNotification || lastNotification !== 'exceeded')) {
          sendNotification('Budget Alert! 🚨', {
            body: `You have exceeded your monthly budget limit of ${formatCurrency(settings.budgetLimit, userCurrency)}!`,
            icon: '/logo.png'
          });
          toast.error('You have exceeded your monthly budget limit!', {
            duration: 5000,
            position: 'top-center'
          });
          localStorage.setItem(notificationKey, 'exceeded');
        } else if (percentage >= 90 && (!lastNotification || lastNotification !== 'approaching')) {
          sendNotification('Budget Warning! ⚠️', {
            body: `You are approaching your monthly budget limit of ${formatCurrency(settings.budgetLimit, userCurrency)}!`,
            icon: '/logo.png'
          });
          toast('You are approaching your monthly budget limit!', {
            duration: 5000,
            position: 'top-center',
            icon: '⚠️'
          });
          localStorage.setItem(notificationKey, 'approaching');
        }
      }
    } catch (error) {
      console.error('Error checking budget limit:', error);
    }
  };

  // Call budget check whenever expenses update
  useEffect(() => {
    if (totalExpenses > 0 && settings?.budgetLimit) {
      checkBudgetLimit();
    }
  }, [totalExpenses, settings?.budgetLimit]);

  const calculateProgress = () => {
    // Use raw numbers instead of formatted currency strings
    const currentExpense = dashboardData.totalExpense || 0;
    const currentIncome = dashboardData.totalIncome || 0;
    const budgetLimit = settings.budgetLimit || 0;
    const savingsGoal = settings.savingsGoal || 0;

    // Calculate budget progress
    const budgetProgress = budgetLimit > 0 ? (currentExpense / budgetLimit) * 100 : 0;
    
    // Calculate savings progress
    const monthlySavings = currentIncome - currentExpense;
    const savingsProgress = savingsGoal > 0 ? (monthlySavings / savingsGoal) * 100 : 0;

    console.log('Progress calculation:', {
      currentExpense,
      currentIncome,
      budgetLimit,
      savingsGoal,
      budgetProgress,
      savingsProgress
    });

    return {
      budgetProgress: Math.min(Math.max(budgetProgress, 0), 100),
      savingsProgress: Math.min(Math.max(savingsProgress, 0), 100)
    };
  };

  const formatAmount = (amount: number) => {
    return formatCurrency(amount, userCurrency);
  };

  const handleNavigateToSettings = () => {
    navigate('/settings#budget-section');
  };

  const handleSaveBudget = async () => {
    try {
      console.log('Saving budget:', newBudgetLimit); // Debug log
      const response = await fetchWithAuth(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...settings,
          budgetLimit: newBudgetLimit
        })
      });

      const data = await response.json();
      console.log('Save budget response:', data); // Debug log

      if (!response.ok) {
        throw new Error('Failed to update budget limit');
      }

      setSettings(prev => ({
        ...prev,
        budgetLimit: newBudgetLimit
      }));

      await fetchUserSettings(); // Refresh settings after update
      toast.success('Monthly budget limit updated successfully');
      setShowBudgetModal(false);
    } catch (error) {
      console.error('Error saving budget:', error); // Debug log
      toast.error('Failed to update monthly budget limit');
    }
  };

  const handleSaveSavings = async () => {
    if (newSavingsGoal <= 0) {
      toast.error('Please enter a savings goal greater than 0');
      return;
    }

    try {
      console.log('Saving savings goal:', newSavingsGoal); // Debug log
      const response = await fetchWithAuth(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...settings,
          savingsGoal: newSavingsGoal
        })
      });

      const data = await response.json();
      console.log('Save savings response:', data); // Debug log

      if (!response.ok) {
        throw new Error('Failed to update savings goal');
      }

      setSettings(prev => ({
        ...prev,
        savingsGoal: newSavingsGoal
      }));

      await fetchUserSettings(); // Refresh settings after update
      toast.success('Monthly savings goal updated successfully');
      setShowSavingsModal(false);
    } catch (error) {
      console.error('Error saving savings goal:', error); // Debug log
      toast.error('Failed to update monthly savings goal');
    }
  };
  const handleRemoveGoal = async () => {
    try {
      console.log('removing savings goal:', newSavingsGoal); // Debug log
      const response = await fetchWithAuth(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...settings,
          savingsGoal: 0
        })
      });

      const data = await response.json();
      console.log('Save savings response:', data); // Debug log

      if (!response.ok) {
        throw new Error('Failed to remove savings goal');
      }

      setSettings(prev => ({
        ...prev,
        savingsGoal: 0
      }));

      await fetchUserSettings(); // Refresh settings after update
      toast.success('Monthly savings goal removed successfully');
      setShowSavingsModal(false);
    } catch (error) {
      toast.error('Failed to remove monthly savings goal');
      console.error('Error removing savings goal:', error);
    }
  };

  // Helper function to prepare pie chart data
  const preparePieChartData = (transactions: Transaction[], type: 'income' | 'expense') => {
    const filteredTransactions = transactions.filter(t => t.type === type);
    return filteredTransactions.reduce((acc, transaction) => {
      const { categoryId, amount } = transaction;
      acc[categoryId] = (acc[categoryId] || 0) + amount;
      return acc;
    }, {} as { [key: string]: number });
  };

  const getFilteredTransactions = () => {
    console.log('Current transactions:', transactions); // Debug log
    let filtered = [...transactions];
    
    // Filter by category if not 'all'
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => {
        // Make sure we're using the exact categoryId match
        return t.categoryId === selectedCategory;
      });
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(t => {
        return t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    
    // Filter by date range
    if (selectedPeriod !== 'all') {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      const lastMonth = new Date(today);
      lastMonth.setMonth(today.getMonth() - 1);
      const lastYear = new Date(today);
      lastYear.setFullYear(today.getFullYear() - 1);
      
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        switch (selectedPeriod) {
          case 'today':
            return transactionDate.toDateString() === today.toDateString();
          case 'yesterday':
            return transactionDate.toDateString() === yesterday.toDateString();
          case 'thisWeek':
            return transactionDate >= lastWeek;
          case 'thisMonth':
            return transactionDate >= lastMonth;
          case 'lastMonth':
            return transactionDate >= lastYear && transactionDate < lastMonth;
          case 'thisYear':
            return transactionDate >= lastYear;
          case 'lastYear':
            return transactionDate < lastYear;
          default:
            return true;
        }
      });
    }
    
    // Sort by latest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Limit to 5 most recent transactions
    filtered = filtered.slice(0, 5);
    
    console.log('Filtered transactions:', filtered); // Debug log
    return filtered;
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
  };

  const renderStatsCard = (title: string, amount: number, icon: React.ReactNode, link: string, linkText: string, showLink: boolean = true) => (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </h3>
          <p className="text-2xl font-semibold text-gray-700 dark:text-gray-200">
            {formatAmount(amount)}
          </p>
        </div>
        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
          {icon}
        </div>
      </div>
      {showLink && (
        <Link
          to={link}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          {linkText}
        </Link>
      )}
      {title === 'Monthly Savings' && settings.savingsGoal > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
            <span>Progress</span>
            <span>{Math.min(100, Math.round((amount / settings.savingsGoal) * 100))}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                amount >= settings.savingsGoal
                  ? 'bg-green-500 dark:bg-green-400'
                  : 'bg-green-300 dark:bg-green-600'
              }`}
              style={{
                width: `${Math.min(100, Math.round((amount / settings.savingsGoal) * 100))}%`
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  const incomeData = preparePieChartData(transactions, 'income');
  const expenseData = preparePieChartData(transactions, 'expense');

  const handleSaveGoal = async () => {
    if (newSavingsGoal <= 0) {
      toast.error('Please enter a savings goal greater than 0');
      return;
    }

    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          savingsGoal: newSavingsGoal
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update savings goal');
      }

      // Update local settings
      setSettings(prev => ({
        ...prev,
        savingsGoal: newSavingsGoal
      }));

      // Close modal and show success message
      setShowSavingsGoalModal(false);
      toast.success('Savings goal updated successfully!');
    } catch (error) {
      toast.error('Failed to update savings goal');
      console.error('Error updating savings goal:', error);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <Toaster position="top-center" />
      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Balance */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 relative group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Balance
                  </h3>
                  <div className="group relative ml-2">
                  <AlertTriangle size={16} className="text-gray-400 hover:text-gray-600 cursor-help" />

                    <div className="hidden group-hover:block absolute z-10 w-48 p-2 mt-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg">
                      {totalIncome - totalExpenses < 0
                        ? "A negative balance indicates you've spent more than your income"
                        : "Your total income minus total expenses"}
                    </div>
                  </div>
                </div>
                <p className={`text-2xl font-semibold ${totalIncome - totalExpenses < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatAmount(totalIncome - totalExpenses)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <button
              onClick={handleUpdateBalance}
              disabled={updateCountdown > 0 || isUpdating}
              className={`px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transform-gpu flex items-center gap-2 ${
                updateCountdown > 0 || isUpdating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {updateCountdown > 0 
                ? `Update in ${updateCountdown}s`
                : isUpdating 
                  ? 'Updating...' 
                  : 'Update balance'
              }
            </button>
          </motion.div>

          {/* Total Income */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Income
                </h3>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {formatAmount(totalIncome)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <ArrowUpRight className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>All earnings</span>
            </div>
          </motion.div>

          {/* Total Expenses */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Expenses
                </h3>
                <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                  {formatAmount(totalExpenses)}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                <ArrowDownRight className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="flex items-center text-sm text-red-600 dark:text-red-400">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span>All expenses</span>
            </div>
          </motion.div>

          {/* Monthly Goal */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 relative group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {settings.savingsGoal ? (monthlySavings < 0 ? 'Monthly Deficit' : 'Monthly Savings') : 'Monthly Goal'}
                  </h3>
                  <div className="group relative ml-2">
                    <AlertTriangle size={16} className="text-gray-400 hover:text-gray-600 cursor-help" />
                    <div className="hidden group-hover:block absolute z-10 w-48 p-2 mt-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg">
                      {settings.savingsGoal 
                        ? (monthlySavings < 0 
                          ? "You're spending more than your monthly income"
                          : "The amount you're saving this month")
                        : "Set a monthly savings goal to track your progress"}
                    </div>
                  </div>
                </div>
                {settings.savingsGoal ? (
                  <p className={`text-2xl font-semibold ${monthlySavings < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {formatAmount(Math.abs(monthlySavings))}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-2xl font-semibold text-gray-400 dark:text-gray-500">
                      --
                    </p>
                    <button
                      onClick={() => {
                        setNewSavingsGoal(settings.savingsGoal);
                        setShowSavingsModal(true);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                    >
                      Set Goal
                    </button>
                  </div>
                )}
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <PiggyBank className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            {settings.savingsGoal > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Progress</span>
                  <span className={`${monthlySavings < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {Math.min(Math.round(Math.abs(monthlySavings) / settings.savingsGoal * 100), 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      monthlySavings < 0 ? 'bg-red-600 dark:bg-red-500' : 'bg-green-600 dark:bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min(Math.abs(monthlySavings) / settings.savingsGoal * 100, 100)}%`
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>

          
        </div>

        {/* Budget Warning */}
        {totalExpenses > settings.budgetLimit && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded"
          >
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <p>
                <span className="font-bold">Warning:</span> You've exceeded your monthly budget by {formatAmount(totalExpenses - settings.budgetLimit)}
              </p>
            </div>
          </motion.div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Budget Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Budget Progress
              </h3>
              <button
                onClick={() => {
                  setNewBudgetLimit(settings.budgetLimit);
                  setShowBudgetModal(true);
                }}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transform-gpu"
              >
                {settings.budgetLimit === 0 ? 'Set Budget' : 'Edit Budget'}
              </button>
            </div>
            {settings.budgetLimit === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p className="text-sm">Set a monthly budget to track your spending</p>
              </div>
            ) : (
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold inline-block text-blue-600">
                      Budget Progress ({formatCurrency(convertedAmounts.expenses, userCurrency)} / {formatCurrency(convertedAmounts.budgetLimit, userCurrency)})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {progress.budgetProgress.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                  <div
                    style={{ 
                      width: `${progress.budgetProgress}%`,
                      backgroundColor: progress.budgetProgress >= 100 
                        ? '#ef4444'  // red
                        : progress.budgetProgress >= 80 
                        ? '#f59e0b'  // yellow
                        : '#3b82f6'  // blue
                    }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Savings Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Savings Progress
              </h3>
              {settings.savingsGoal > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setNewSavingsGoal(settings.savingsGoal);
                      setShowSavingsModal(true);
                    }}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transform-gpu"
                  >
                    Edit Goal
                  </button>
                  <button
                    onClick={handleRemoveGoal}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transform-gpu"
                  >
                    Remove Goal
                  </button>
                </div>
              )}
            </div>
            {settings.savingsGoal === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p className="text-sm">Set a monthly savings goal to track your progress</p>
              </div>
            ) : (
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold inline-block text-green-600">
                      Savings Progress ({formatAmount(Math.abs(monthlySavings))} / {formatAmount(settings.savingsGoal)})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-green-600">
                      {Math.min(Math.round(Math.abs(monthlySavings) / settings.savingsGoal * 100), 100)}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-200">
                  <div
                    style={{ 
                      width: `${Math.min(Math.abs(monthlySavings) / settings.savingsGoal * 100, 100)}%`,
                      backgroundColor: '#10b981'  // green
                    }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Financial Overview */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">
                Financial Overview
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setChartType('line')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    chartType === 'line'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Line
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    chartType === 'bar'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Bar
                </button>
                <button
                  onClick={() => setChartType('area')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    chartType === 'area'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Area
                </button>
              </div>
            </div>
            <div className="h-[400px] relative">
              {chartType === 'bar' ? (
                <Bar 
                  data={{
                    labels: Object.keys(dashboardData.monthlyData.income),
                    datasets: [
                      {
                        label: 'Income',
                        data: Object.values(dashboardData.monthlyData.income),
                        backgroundColor: 'rgba(34, 197, 94, 0.5)',
                        borderColor: 'rgb(34, 197, 94)',
                        borderWidth: 2,
                        borderRadius: 4,
                        categoryPercentage: 0.7,
                        barPercentage: 0.8
                      },
                      {
                        label: 'Expenses',
                        data: Object.values(dashboardData.monthlyData.expense),
                        backgroundColor: 'rgba(239, 68, 68, 0.5)',
                        borderColor: 'rgb(239, 68, 68)',
                        borderWidth: 2,
                        borderRadius: 4,
                        categoryPercentage: 0.7,
                        barPercentage: 0.8
                      }
                    ]
                  }}
                  options={barChartOptions}
                />
              ) : (
                <Line
                  data={{
                    labels: Object.keys(dashboardData.monthlyData.income),
                    datasets: [
                      {
                        label: 'Income',
                        data: Object.values(dashboardData.monthlyData.income),
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true
                      },
                      {
                        label: 'Expenses',
                        data: Object.values(dashboardData.monthlyData.expense),
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true
                      }
                    ]
                  }}
                  options={lineChartOptions}
                />
              )}
            </div>
          </motion.div>

          {/* Savings Trend */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Savings Trend</h3>
            <div className="h-[400px]">
              <Line
                data={{
                  labels: Object.keys(dashboardData.monthlyData.income),
                  datasets: [
                    {
                      label: 'Monthly Savings',
                      data: Object.keys(dashboardData.monthlyData.income).map(month => {
                        const income = dashboardData.monthlyData.income[month] || 0;
                        const expense = dashboardData.monthlyData.expense[month] || 0;
                        return income - expense;
                      }),
                      borderColor: 'rgb(34, 197, 94)',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      tension: 0.4,
                      fill: true
                    }
                  ]
                }}
                options={lineChartOptions}
              />
            </div>
          </motion.div>

          {/* Income Distribution */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 min-h-[400px]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Income Distribution
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total: {formatCurrency(totalIncome, userCurrency)}
              </div>
            </div>
            <div className="h-[400px] relative">
              {Object.keys(incomeData).length > 0 ? (
                <Pie
                  data={{
                    labels: Object.keys(incomeData).map(categoryId => 
                      getCategoryById(categoryId)?.name || 'Other'
                    ),
                    datasets: [{
                      data: Object.values(incomeData),
                      backgroundColor: [
                        'rgba(34, 197, 94, 0.9)',  // Green
                        'rgba(59, 130, 246, 0.9)', // Blue
                        'rgba(168, 85, 247, 0.9)', // Purple
                        'rgba(249, 115, 22, 0.9)', // Orange
                        'rgba(236, 72, 153, 0.9)'  // Pink
                      ],
                      borderWidth: 2,
                      borderColor: '#ffffff',
                      hoverOffset: 4
                    }]
                  }}
                  options={pieChartOptions}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <ChartPieIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No income data available</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Expense Distribution */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 min-h-[400px]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Expense Distribution
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total: {formatCurrency(totalExpenses, userCurrency)}
              </div>
            </div>
            <div className="h-[400px] relative">
              {Object.keys(expenseData).length > 0 ? (
                <Pie
                  data={{
                    labels: Object.keys(expenseData).map(categoryId => 
                      getCategoryById(categoryId)?.name || 'Other'
                    ),
                    datasets: [{
                      data: Object.values(expenseData),
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.9)',   // Red
                        'rgba(245, 158, 11, 0.9)',  // Yellow
                        'rgba(16, 185, 129, 0.9)',  // Emerald
                        'rgba(99, 102, 241, 0.9)',  // Indigo
                        'rgba(236, 72, 153, 0.9)'   // Pink
                      ],
                      borderWidth: 2,
                      borderColor: '#ffffff',
                      hoverOffset: 4
                    }]
                  }}
                  options={pieChartOptions}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <ChartPieIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No expense data available</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
          {/* Left side - Search */}
          <div className="relative w-full md:w-1/3">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-700 dark:text-gray-200"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Right side - Filters */}
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-2/3">
            {/* Category Filter */}
            <div className="relative w-full sm:w-1/2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-700 dark:text-gray-200 appearance-none"
              >
                <option value="all">All Categories</option>
                {incomeCategories.length > 0 && (
                  <optgroup label="Income Categories" className="font-semibold">
                    {incomeCategories.map(category => (
                      <option 
                        key={category.id} 
                        value={category.id}
                        className="py-1.5 px-2"
                      >
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {expenseCategories.length > 0 && (
                  <optgroup label="Expense Categories" className="font-semibold">
                    {expenseCategories.map(category => (
                      <option 
                        key={category.id} 
                        value={category.id}
                        className="py-1.5 px-2"
                      >
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="relative w-full sm:w-1/2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-700 dark:text-gray-200 appearance-none cursor-pointer pr-10"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisYear">This Year</option>
                <option value="lastYear">Last Year</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <motion.div
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">Recent Transactions</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {getFilteredTransactions().map((transaction) => (
                  <tr 
                    key={transaction._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {transaction.formattedDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {transaction.formattedTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {transaction.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {transaction.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === 'income'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {getCategoryById(transaction.categoryId)?.name || 'Other'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      transaction.type === 'income'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{transaction.formattedAmount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {getFilteredTransactions().length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
              <div className="relative">
                {/* Header with icon */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-6 sm:px-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-white">Set Monthly Budget Limit</h2>
                </div>

                {/* Content */}
                <div className="px-4 py-6 sm:px-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Enter your monthly budget limit in {userCurrency}
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">{userCurrency}</span>
                        </div>
                        <input
                          type="number"
                          value={newBudgetLimit}
                          onChange={(e) => setNewBudgetLimit(Number(e.target.value))}
                          className="block w-full pl-12 pr-4 py-3 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-4 sm:px-6 bg-gray-50 dark:bg-gray-700/50 flex flex-col sm:flex-row-reverse gap-2">
                  <button
                    type="button"
                    onClick={handleSaveBudget}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Save Budget
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBudgetModal(false)}
                    className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Savings Modal */}
      {showSavingsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
              <div className="relative">
                {/* Header with icon */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-6 sm:px-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-white">Set Monthly Savings Goal</h2>
                </div>

                {/* Content */}
                <div className="px-4 py-6 sm:px-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Enter your monthly savings target in INR
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">{userCurrency}</span>
                        </div>
                        <input
                          type="number"
                          value={newSavingsGoal}
                          onChange={(e) => setNewSavingsGoal(Math.max(1, Number(e.target.value)))}
                          className="block w-full pl-12 pr-4 py-3 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                          placeholder="Enter amount greater than 0"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-4 sm:px-6 bg-gray-50 dark:bg-gray-700/50 flex flex-col sm:flex-row-reverse gap-2">
                  <button
                    type="button"
                    onClick={handleSaveSavings}
                    className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                    disabled={newSavingsGoal <= 0}
                  >
                    Save Goal
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSavingsModal(false)}
                    className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Savings Goal Modal */}
      {showSavingsGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Set Monthly Savings Goal
            </h2>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                Enter your monthly savings target in INR
              </label>
              <input
                type="number"
                value={newSavingsGoal}
                onChange={(e) => setNewSavingsGoal(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter amount greater than 0"
                min="1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSavingsGoalModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoal}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Save Goal
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default Dashboard;
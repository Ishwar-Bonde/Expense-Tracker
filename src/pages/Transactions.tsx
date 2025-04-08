import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowUpDown, Calendar, Trash2, AlertCircle, Tag, DollarSign, AlertTriangle, Download, Upload, FileText, X, CheckCircle, XCircle, Loader2, Check } from 'lucide-react';
import { CSVLink, CSVDownload } from 'react-csv';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import { formatCurrency, convertCurrencyWithRates, getUserCurrency, CurrencyCode } from '../utils/currency';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-toastify/dist/ReactToastify.css';
import { fetchWithAuth } from '../utils/fetchInterceptor';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { fetchCategories, Category, DEFAULT_CATEGORIES } from '../utils/categories';
import Modal from '../components/Modal';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';

interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  title: string;
  description: string;
  amount: number;
  date: string;
  createdAt: string;
  timestamp: number;
  currency: CurrencyCode;
  categoryId: string;
  convertedAmount?: number;
}

type SortField = 'date' | 'amount' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type DateFilterType = 'none' | 'single' | 'range';
type TransactionType = 'all' | 'income' | 'expense';

interface CSVPreviewData {
  isValid: boolean;
  row: string[];
  errors: string[];
  parsedData: {
    date: string;
    title: string;
    amount: number;
    type: 'income' | 'expense';
    currency: string;
    category: string;
    description: string;
    categoryId: string;
    isDuplicate?: boolean;
  };
}

interface ImportStats {
  total: number;
  success: number;
  failed: number;
  duplicates: number;
}

const Transactions: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userCurrency, setUserCurrency] = useState<CurrencyCode>('USD');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isAmountMenuOpen, setIsAmountMenuOpen] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('none');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [selectedType, setSelectedType] = useState<TransactionType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvPreviewData, setCSVPreviewData] = useState<CSVPreviewData[]>([]);
  const [importStats, setImportStats] = useState<ImportStats>({ total: 0, success: 0, failed: 0, duplicates: 0 });
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showSingleDeleteDialog, setShowSingleDeleteDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add this validation function at the top of your component
  const isValidCurrency = (currency: string): currency is CurrencyCode => {
    return ['USD', 'EUR', 'GBP', 'JPY', 'INR'].includes(currency);
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`${API_BASE_URL}/api/transactions`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch transactions');
      }

      // Convert amounts before setting transactions
      const currency = await getUserCurrency();
      const transactionsWithConversion = await Promise.all(
        data.map(async (transaction: Transaction) => {
          if (transaction.currency === currency) {
            return { ...transaction, convertedAmount: transaction.amount };
          }
          try {
            const convertedAmount = await convertCurrencyWithRates(
              transaction.amount,
              transaction.currency,
              currency
            );
            return { ...transaction, convertedAmount };
          } catch (error) {
            console.error('Error converting amount:', error);
            return { ...transaction, convertedAmount: transaction.amount };
          }
        })
      );

      setTransactions(transactionsWithConversion);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const fetchedCategories = await fetchCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        toast.error('Failed to load categories');
      }
    };
    
    loadCategories();
    fetchTransactions();
  }, [navigate]);

  // Initialize user currency and fetch data
  useEffect(() => {
    const init = async () => {
      try {
        const currency = await getUserCurrency();
        setUserCurrency(currency);
        await fetchTransactions();
      } catch (error) {
        console.error('Error initializing:', error);
        toast.error('Failed to initialize');
      }
    };
    
    init();
  }, []);

  // Update converted amounts when currency changes
  useEffect(() => {
    if (transactions.length > 0) {
      const updateAmounts = async () => {
        const updatedTransactions = await Promise.all(
          transactions.map(async (transaction) => {
            if (transaction.currency === userCurrency) {
              return { ...transaction, convertedAmount: transaction.amount };
            }
            
            try {
              const convertedAmount = await convertCurrencyWithRates(
                transaction.amount,
                transaction.currency,
                userCurrency
              );
              return { ...transaction, convertedAmount };
            } catch (error) {
              console.error('Error converting amount:', error);
              return { ...transaction, convertedAmount: transaction.amount };
            }
          })
        );
        setTransactions(updatedTransactions);
      };
      
      updateAmounts();
    }
  }, [userCurrency]);

  // Handle currency updates
  useEffect(() => {
    const updateUserCurrency = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          if (user.defaultCurrency && user.defaultCurrency !== userCurrency) {
            const newCurrency = user.defaultCurrency as CurrencyCode;
            if (isValidCurrency(newCurrency)) {
              setUserCurrency(newCurrency);
            } else {
              console.error(`Invalid currency: ${newCurrency}`);
            }
          }
        }
      } catch (error) {
        setError('Failed to update currency');
      }
    };

    updateUserCurrency();

    const handleCurrencyChange = (event: CustomEvent<{ currency: string }>) => {
      if (isValidCurrency(event.detail.currency)) {
        setUserCurrency(event.detail.currency);
      } else {
        console.error(`Invalid currency: ${event.detail.currency}`);
      }
    };

    window.addEventListener('currencyChange', handleCurrencyChange as EventListener);

    return () => {
      window.removeEventListener('currencyChange', handleCurrencyChange as EventListener);
    };
  }, []);

  // Handle type filter
  const handleTypeFilter = (type: TransactionType) => {
    // Clear other filters
    setDateFilterType('none');
    setSelectedDate('');
    setDateRange({ start: '', end: '' });
    setSelectedCategory('all');
    setSortField('createdAt');
    setSortOrder('desc');
    
    // Set new type filter
    setSelectedType(type);
    setIsTypeMenuOpen(false);
  };

  // Handle category filter
  const handleCategoryFilter = (categoryId: string) => {
    // Clear other filters except type
    setDateFilterType('none');
    setSelectedDate('');
    setDateRange({ start: '', end: '' });
    setSortField('createdAt');
    setSortOrder('desc');
    
    // Set new category filter
    setSelectedCategory(categoryId);
    setIsCategoryMenuOpen(false);
  };

  // Handle date filter
  const handleDateFilterClick = (type: DateFilterType) => {
    // Clear other filters except type
    setSelectedCategory('all');
    setSortField('createdAt');
    setSortOrder('desc');
    
    // Set new date filter
    setDateFilterType(type);
    if (type === 'none') {
      setSelectedDate('');
      setDateRange({ start: '', end: '' });
    }
    setIsDateMenuOpen(false);
  };

  // Handle amount sort
  const handleSort = (field: SortField, order?: SortOrder) => {
    // Clear other filters except type
    setSelectedCategory('all');
    setDateFilterType('none');
    setSelectedDate('');
    setDateRange({ start: '', end: '' });
    
    // Set new sort
    setSortField(field);
    setSortOrder(order || 'desc');
    setIsAmountMenuOpen(false);
  };

  // Filter transactions based on active filter only
  const filteredAndSortedTransactions = [...transactions]
    .filter(transaction => {
      // Type filter is always applied
      if (selectedType !== 'all') {
        return transaction.type === selectedType;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        return transaction.categoryId === selectedCategory;
      }

      // Date filter
      if (dateFilterType !== 'none') {
        const transactionDate = new Date(transaction.date).getTime();
        
        if (dateFilterType === 'single') {
          if (!selectedDate) return true;
          const selectedDateTime = new Date(selectedDate).getTime();
          return new Date(transactionDate).toISOString().split('T')[0] === new Date(selectedDateTime).toISOString().split('T')[0];
        }
        
        if (dateFilterType === 'range') {
          if (!dateRange.start || !dateRange.end) return true;
          const startDate = new Date(dateRange.start).getTime();
          const endDate = new Date(dateRange.end).getTime();
          return transactionDate >= startDate && transactionDate <= endDate + (24 * 60 * 60 * 1000 - 1);
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortField === 'amount') {
        const amountA = a.convertedAmount ?? a.amount;
        const amountB = b.convertedAmount ?? b.amount;
        return sortOrder === 'desc' ? amountB - amountA : amountA - amountB;
      }
      // Default sort by date
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

  // Clear all filters but keep type filter
  const clearFilters = () => {
    setSelectedDate('');
    setDateFilterType('none');
    setSortField('createdAt');
    setSortOrder('desc');
    setSelectedCategory('all');
  };

  // Delete transaction handlers
  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setShowSingleDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in again');
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `application/json`
        }
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setTransactions(prev => prev.filter(t => t._id !== transactionToDelete._id));
        toast.success('Transaction deleted successfully');
        setShowSingleDeleteDialog(false);
        setTransactionToDelete(null);
      } else {
        toast.error(data.message || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const handleDeleteCancel = () => {
    setShowSingleDeleteDialog(false);
    setTransactionToDelete(null);
  };

  const handleBulkDeleteClick = () => {
    if (selectedTransactions.length === 0) {
      toast.error('No transactions selected');
      return;
    }
    setShowBulkDeleteDialog(true);
  };

  const handleBulkDelete = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`${API_BASE_URL}/api/transactions/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds: selectedTransactions })
      });

      const data = await response.json();

      if (response.ok) {
        // Immediately update the UI by filtering out deleted transactions
        setTransactions(prevTransactions => 
          prevTransactions.filter(t => !selectedTransactions.includes(t._id))
        );
        
        // Clear selections
        setSelectedTransactions([]);
        setSelectAll(false);
        
        // Show success message
        toast.success(`Successfully deleted ${data.deletedCount} transactions`, {
          icon: '✅',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        });
      } else {
        throw new Error(data.message || 'Failed to delete transactions');
      }
    } catch (error) {
      console.error('Error deleting transactions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete transactions');
    } finally {
      setIsLoading(false);
      setShowBulkDeleteDialog(false);
    }
  };

  // Format transaction amount
  const formatTransactionAmount = (transaction: Transaction) => {
    const amount = transaction.convertedAmount ?? transaction.amount;
    return formatCurrency(amount, userCurrency);
  };

  // Get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Other';
  };

  // Get category color function
  const getCategoryColor = (categoryId: string) => {
    const category = [...DEFAULT_CATEGORIES, ...categories].find(cat => cat.id === categoryId);
    return category?.color || '#718096';
  };

  // Get category icon function
  const getCategoryIcon = (categoryId: string) => {
    const category = [...DEFAULT_CATEGORIES, ...categories].find(cat => cat.id === categoryId);
    return category?.icon || '📦';
  };

  // Function to handle CSV export
  const prepareCSVData = () => {
    // First row is headers
    const headers = {
      date: 'Date',
      time: 'Time',
      title: 'Title',
      description: 'Description',
      originalAmount: 'Original Amount',
      originalCurrency: 'Original Currency',
      convertedAmount: 'Converted Amount',
      displayCurrency: 'Display Currency',
      type: 'Type',
      category: 'Category'
    };

    // Convert transactions to CSV format
    const data = filteredAndSortedTransactions.map(t => {
      const transactionDate = new Date(t.date);
      const category = categories.find(c => c.id === t.categoryId);
      
      return {
        [headers.date]: transactionDate.toLocaleDateString('en-IN'),
        [headers.time]: new Date(t.createdAt).toLocaleTimeString('en-IN'),
        [headers.title]: t.title,
        [headers.description]: t.description || '',
        [headers.originalAmount]: t.amount,
        [headers.originalCurrency]: t.currency,
        [headers.convertedAmount]: t.convertedAmount ?? t.amount,
        [headers.displayCurrency]: userCurrency,
        [headers.type]: t.type.charAt(0).toUpperCase() + t.type.slice(1),
        [headers.category]: category?.name || 'Uncategorized'
      };
    });

    return data;
  };

  // Function to handle CSV import
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error('No file selected');
      return;
    }

    setIsImportLoading(true);
    setShowImportModal(true);

    try {
      // Reset the file input value to ensure change event fires even if same file is selected
      event.target.value = '';
      
      const text = await file.text();
      // Split into rows and filter out empty rows
      const rows = text.split(/\r?\n/)
        .map(row => row.split(','))
        .filter(row => row.some(cell => cell.trim().length > 0)); // Filter out completely empty rows

      if (rows.length < 2) {
        toast.error('CSV file must have at least a header row and one data row');
        setIsImportLoading(false);
        return;
      }

      const headerRow = rows[0].map(header => header.trim());

      // Get column indices
      const getColumnIndex = (fieldName: string): number => {
        const index = headerRow.findIndex(header => header.toLowerCase() === fieldName.toLowerCase());
        return index;
      };

      const dateIndex = getColumnIndex('date');
      const titleIndex = getColumnIndex('title');
      const amountIndex = getColumnIndex('amount');
      const typeIndex = getColumnIndex('type');
      const categoryIndex = getColumnIndex('category');
      const descriptionIndex = getColumnIndex('description');

      // Process data rows (skip header and empty rows)
      const dataRows = rows.slice(1).filter(row => row.some(cell => cell.trim().length > 0));
      const processedData: CSVPreviewData[] = dataRows.map((row) => {
        const errors: string[] = [];
        const parsedData: {
          date: string;
          title: string;
          amount: number;
          type: 'income' | 'expense';
          currency: string;
          category: string;
          description: string;
          categoryId: string;
          isDuplicate?: boolean;
        } = {
          date: '',
          title: '',
          amount: 0,
          type: 'expense',
          currency: userCurrency,
          category: '',
          description: '',
          categoryId: '',
          isDuplicate: false
        };

        try {
          // Validate date
          const dateStr = row[dateIndex];
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            errors.push('Invalid date format');
          }
          parsedData.date = date.toISOString();

          // Validate title
          const title = row[titleIndex]?.trim();
          if (!title || title.length < 3) {
            errors.push('Title must be at least 3 characters long');
          }
          parsedData.title = title;

          // Validate amount
          const amountStr = row[amountIndex].replace(/[^0-9.-]+/g, '');
          const amount = parseFloat(amountStr);
          if (isNaN(amount) || amount <= 0) {
            errors.push('Amount must be a positive number');
          }
          parsedData.amount = amount;

          // Validate type
          const type = row[typeIndex].toLowerCase().trim();
          if (type !== 'income' && type !== 'expense') {
            errors.push('Type must be either "income" or "expense"');
          }
          parsedData.type = type === 'income' ? 'income' : 'expense';

          // Validate category
          const categoryName = row[categoryIndex]?.trim();
          const category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
          if (!category) {
            errors.push(`Category "${categoryName}" not found`);
          } else {
            parsedData.category = categoryName;
            parsedData.categoryId = category.id;
          }

          // Get description (optional)
          if (descriptionIndex !== -1) {
            parsedData.description = row[descriptionIndex]?.trim() || '';
          }

          // Check for duplicates
          const isDuplicate = transactions.some(t => {
            // Convert both dates to start of day to ignore time
            const existingDate = new Date(t.date);
            existingDate.setHours(0, 0, 0, 0);
            const newDate = new Date(parsedData.date);
            newDate.setHours(0, 0, 0, 0);

            // Compare all relevant fields
            return (
              existingDate.getTime() === newDate.getTime() &&
              t.title.toLowerCase().trim() === parsedData.title.toLowerCase().trim() &&
              Math.abs(t.amount - parsedData.amount) < 0.01 && // Use small epsilon for floating point comparison
              t.type === parsedData.type &&
              t.categoryId === parsedData.categoryId
            );
          });

          if (isDuplicate) {
            errors.push('Duplicate transaction found');
            parsedData.isDuplicate = true;
          }

        } catch (error) {
          errors.push('Failed to parse row data');
        }

        return {
          isValid: errors.length === 0,
          row,
          errors,
          parsedData,
        };
      });

      // Update preview data and stats
      const stats = processedData.reduce((acc, row) => {
        acc.total++;
        if (row.parsedData.isDuplicate) acc.duplicates++;
        else if (row.isValid) acc.success++;
        else acc.failed++;
        return acc;
      }, { total: 0, success: 0, failed: 0, duplicates: 0 });

      setCSVPreviewData(processedData);
      setImportStats(stats);
    } catch (error) {
      console.error('Error processing CSV:', error);
      toast.error(error instanceof Error ? error.message : 'Error processing CSV file');
      setShowImportModal(false);
    } finally {
      setIsImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    const validTransactions = csvPreviewData
      .filter(row => row.isValid && !row.parsedData.isDuplicate)
      .map(row => ({
        date: row.parsedData.date,
        title: row.parsedData.title,
        amount: row.parsedData.amount,
        type: row.parsedData.type,
        currency: row.parsedData.currency,
        categoryId: row.parsedData.categoryId || '',
        description: row.parsedData.description
      }));

    if (validTransactions.length === 0) {
      toast.error('No valid transactions to import');
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/transactions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: validTransactions }),
      });

      if (!response.ok) {
        throw new Error('Failed to import transactions');
      }

      toast.success(`Successfully imported ${validTransactions.length} transactions`);
      fetchTransactions();
      setShowImportModal(false);
      setCSVPreviewData([]);
    } catch (error) {
      console.error('Error importing transactions:', error);
      toast.error('Failed to import transactions');
    } finally {
      setIsImporting(false);
    }
  };

  // Function to generate and download PDF
  const handlePDFDownload = () => {
    const doc = new jsPDF();
    
    // Add background color to header
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, doc.internal.pageSize.width, 50, 'F');
    
    // Add title with white color
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Expense Tracker', 14, 20);
    doc.setFontSize(14);
    doc.text('Transaction Report', 14, 35);
    
    // Add generated date with white color
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}`, doc.internal.pageSize.width - 14, 20, { align: 'right' });

    // Add summary section
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    // Reset text color to black for summary
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    
    // Add summary boxes
    const boxWidth = 50;
    const boxHeight = 25;
    const startY = 60;
    const gap = 10;
    
    // Income Box (Green)
    doc.setFillColor(46, 204, 113);
    doc.roundedRect(14, startY, boxWidth, boxHeight, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('Total Income', 14 + boxWidth/2, startY + 8, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${userCurrency} ${income.toFixed(2)}`, 14 + boxWidth/2, startY + 18, { align: 'center' });

    // Expense Box (Red)
    doc.setFillColor(231, 76, 60);
    doc.roundedRect(14 + boxWidth + gap, startY, boxWidth, boxHeight, 3, 3, 'F');
    doc.text('Total Expense', 14 + boxWidth + gap + boxWidth/2, startY + 8, { align: 'center' });
    doc.text(`${userCurrency} ${expense.toFixed(2)}`, 14 + boxWidth + gap + boxWidth/2, startY + 18, { align: 'center' });

    // Balance Box (Blue)
    doc.setFillColor(52, 152, 219);
    doc.roundedRect(14 + (boxWidth + gap) * 2, startY, boxWidth, boxHeight, 3, 3, 'F');
    doc.text('Balance', 14 + (boxWidth + gap) * 2 + boxWidth/2, startY + 8, { align: 'center' });
    doc.text(`${userCurrency} ${balance.toFixed(2)}`, 14 + (boxWidth + gap) * 2 + boxWidth/2, startY + 18, { align: 'center' });

    // Sort transactions
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA.getTime() === dateB.getTime()) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return dateB.getTime() - dateA.getTime();
    });

    // Prepare table data
    const tableData = sortedTransactions.map(t => {
      const transactionDate = new Date(t.date);
      const createdTime = new Date(t.createdAt);
      const formattedDate = transactionDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const formattedTime = createdTime.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      return [
        `${formattedDate}\n${formattedTime}`,
        t.title,
        t.description || '-',
        `${t.amount} ${t.currency}`,
        t.type.charAt(0).toUpperCase() + t.type.slice(1),
        categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized'
      ];
    });

    // Add table with enhanced styling
    (doc as any).autoTable({
      head: [['Date & Time', 'Title', 'Description', 'Amount', 'Type', 'Category']],
      body: tableData,
      startY: startY + boxHeight + 15,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 40, fontSize: 8 }, // Date & Time
        1: { cellWidth: 35 }, // Title
        2: { cellWidth: 35 }, // Description
        3: { cellWidth: 25, halign: 'right' }, // Amount
        4: { cellWidth: 20, halign: 'center' }, // Type
        5: { cellWidth: 30 } // Category
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      bodyStyles: {
        fontSize: 9
      },
      didDrawCell: (data: any) => {
        // Add color to Type column based on transaction type
        if (data.column.index === 4 && data.row.index >= 0) {
          const type = data.cell.text[0].toLowerCase();
          if (type === 'income') {
            doc.setTextColor(46, 204, 113); // Green for income
          } else {
            doc.setTextColor(231, 76, 60); // Red for expense
          }
        } else {
          doc.setTextColor(0, 0, 0); // Reset to black for other cells
        }
      }
    });

    // Add footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Download PDF
    doc.save('transactions.pdf');
  };

  const handleRowSelect = (transactionId: string) => {
    setSelectedTransactions(prev => {
      const isSelected = prev.includes(transactionId);
      const newSelection = isSelected
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId];
      
      // Update selectAll state based on whether all visible transactions are selected
      setSelectAll(newSelection.length === filteredAndSortedTransactions.length);
      
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelectedTransactions(selectAll ? [] : filteredAndSortedTransactions.map(t => t._id));
  };

  useEffect(() => {
    setSelectedTransactions([]);
    setSelectAll(false);
  }, [transactions]);

  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <div className="flex gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </button>
            <CSVLink
              data={prepareCSVData()}
              filename="transactions.csv"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </CSVLink>
            <button
              onClick={handlePDFDownload}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Download PDF
            </button>
          </div>
        </div>
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-3">
              <ArrowUpDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </span>
            Transactions History
          </h1>

          <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            {/* Transaction Type Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsTypeMenuOpen(!isTypeMenuOpen);
                  setIsDateMenuOpen(false);
                  setIsAmountMenuOpen(false);
                  setIsCategoryMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 
                  ${selectedType !== 'all' 
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus:ring-indigo-500 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
              >
                {selectedType === 'income' && <TrendingUp className="w-4 h-4" />}
                {selectedType === 'expense' && <TrendingDown className="w-4 h-4" />}
                {selectedType === 'all' && <ArrowUpDown className="w-4 h-4" />}
                {selectedType === 'all' ? 'All Types' : selectedType === 'income' ? 'Income' : 'Expense'}
              </button>

              {isTypeMenuOpen && (
                <div className="absolute left-0 z-10 mt-2 w-48 rounded-xl shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <button
                      onClick={() => handleTypeFilter('all')}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
                      role="menuitem"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                      All Types
                    </button>
                    <button
                      onClick={() => handleTypeFilter('income')}
                      className="w-full text-left px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 dark:text-green-200 dark:hover:bg-green-900/30 flex items-center gap-2"
                      role="menuitem"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Income
                    </button>
                    <button
                      onClick={() => handleTypeFilter('expense')}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-900/30 flex items-center gap-2"
                      role="menuitem"
                    >
                      <TrendingDown className="w-4 h-4" />
                      Expense
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Category Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsCategoryMenuOpen(!isCategoryMenuOpen);
                  setIsDateMenuOpen(false);
                  setIsAmountMenuOpen(false);
                  setIsTypeMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 
                  ${selectedCategory !== 'all' 
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus:ring-indigo-500 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
              >
                <Tag className="w-4 h-4" />
                {selectedCategory === 'all' ? 'All Categories' : getCategoryName(selectedCategory)}
              </button>

              {isCategoryMenuOpen && (
                <div className="absolute left-0 z-10 mt-2 w-56 rounded-xl shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top">
                  <div className="py-1 max-h-60 overflow-y-auto" role="menu" aria-orientation="vertical">
                    <button
                      onClick={() => handleCategoryFilter('all')}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
                      role="menuitem"
                    >
                      <Tag className="w-4 h-4" />
                      All Categories
                    </button>
                    {categories
                      .filter(cat => selectedType === 'all' || cat.type === selectedType || cat.type === 'both')
                      .map(category => (
                        <button
                          key={category.id}
                          onClick={() => handleCategoryFilter(category.id)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
                          role="menuitem"
                        >
                          <span className="text-lg">{category.icon}</span>
                          {category.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Date Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsDateMenuOpen(!isDateMenuOpen);
                  setIsAmountMenuOpen(false);
                  setIsTypeMenuOpen(false);
                  setIsCategoryMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 
                  ${dateFilterType !== 'none' 
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus:ring-indigo-500 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
              >
                <Calendar className="w-4 h-4" />
                {dateFilterType === 'none' ? 'Date' : dateFilterType === 'single' ? 'Single Date' : 'Date Range'}
              </button>

              {isDateMenuOpen && (
                <div className="absolute left-0 z-10 mt-2 w-56 rounded-xl shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <button
                      onClick={() => handleDateFilterClick('none')}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
                      role="menuitem"
                    >
                      <Calendar className="w-4 h-4" />
                      All Dates
                    </button>
                    <button
                      onClick={() => handleDateFilterClick('single')}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
                      role="menuitem"
                    >
                      <Calendar className="w-4 h-4" />
                      Single Date
                    </button>
                    <button
                      onClick={() => handleDateFilterClick('range')}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
                      role="menuitem"
                    >
                      <Calendar className="w-4 h-4" />
                      Date Range
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Amount Sort */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsAmountMenuOpen(!isAmountMenuOpen);
                  setIsDateMenuOpen(false);
                  setIsTypeMenuOpen(false);
                  setIsCategoryMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 
                  ${sortField === 'amount' 
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus:ring-indigo-500 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
              >
                <DollarSign className="w-4 h-4" />
                {sortField === 'amount' ? (sortOrder === 'desc' ? 'Highest First' : 'Lowest First') : 'Sort by Amount'}
              </button>

              {isAmountMenuOpen && (
                <div className="absolute left-0 z-10 mt-2 w-48 rounded-xl shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <button
                      onClick={() => {
                        handleSort('amount', 'desc');
                        setIsAmountMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
                      role="menuitem"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Highest First
                    </button>
                    <button
                      onClick={() => {
                        handleSort('amount', 'asc');
                        setIsAmountMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
                      role="menuitem"
                    >
                      <TrendingDown className="w-4 h-4" />
                      Lowest First
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Clear Filters */}
            {(selectedType !== 'all' || selectedCategory !== 'all' || dateFilterType !== 'none' || sortField !== 'createdAt') && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
              >
                <AlertCircle className="w-4 h-4" />
                Clear Filters
              </button>
            )}

            {/* Bulk Delete */}
            {selectedTransactions.length > 0 && (
              <button
                onClick={handleBulkDeleteClick}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-red-900/30 rounded-lg hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedTransactions.length})
              </button>
            )}
          </div>

          {/* Date Filter Inputs */}
          {dateFilterType === 'single' && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={clearFilters}
                  className="mt-6 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {dateFilterType === 'range' && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    max={dateRange.end || new Date().toISOString().split('T')[0]}
                    className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    min={dateRange.start}
                    max={new Date().toISOString().split('T')[0]}
                    className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={clearFilters}
                  className="mt-6 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredAndSortedTransactions.length} transaction{filteredAndSortedTransactions.length !== 1 ? 's' : ''}
            {dateFilterType === 'single' && selectedDate && (
              <> for {new Date(selectedDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</>
            )}
            {dateFilterType === 'range' && dateRange.start && dateRange.end && (
              <> from {new Date(dateRange.start).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })} to {new Date(dateRange.end).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</>
            )}
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          )}

          {transactions.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <div className="mb-4">
                <ArrowUpDown className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No Transactions Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                Start adding your income and expenses to track them here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th scope="col" className="w-[5%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <Checkbox
                            checked={selectAll}
                            onCheckedChange={handleSelectAll}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-indigo-600"
                          />
                        </th>
                        <th scope="col" className="w-[12%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Time
                        </th>
                        <th scope="col" className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Title
                        </th>
                        <th scope="col" className="w-[25%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="w-[13%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th scope="col" className="w-[12%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="w-[8%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredAndSortedTransactions.map((transaction) => (
                        <tr 
                          key={transaction._id}
                          className={`${
                            selectedTransactions.includes(transaction._id) 
                              ? 'bg-indigo-50 dark:bg-indigo-900/20' 
                              : 'bg-white dark:bg-gray-900'
                          } hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Checkbox
                              checked={selectedTransactions.includes(transaction._id)}
                              onCheckedChange={() => handleRowSelect(transaction._id)}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-indigo-600"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate">
                            {new Date(transaction.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate">
                            {new Date(transaction.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {transaction.title}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {transaction.description || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium truncate"
                              style={{
                                backgroundColor: `${getCategoryColor(transaction.categoryId)}15`,
                                color: getCategoryColor(transaction.categoryId),
                                borderColor: `${getCategoryColor(transaction.categoryId)}30`
                              }}
                            >
                              <span className="mr-1">{getCategoryIcon(transaction.categoryId)}</span>
                              {getCategoryName(transaction.categoryId)}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-sm font-medium truncate ${
                            transaction.type === 'income'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'} {formatTransactionAmount(transaction)}
                            {transaction.currency !== userCurrency && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                ({formatCurrency(transaction.amount, transaction.currency)})
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <button
                              onClick={() => handleDeleteClick(transaction)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Single Transaction Delete Dialog */}
      <Dialog open={showSingleDeleteDialog} onOpenChange={setShowSingleDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Delete Transaction
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {transactionToDelete && (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg my-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Title:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{transactionToDelete.title}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Amount:</p>
                  <p className={`font-medium ${
                    transactionToDelete.type === 'income'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {transactionToDelete.type === 'income' ? '+' : '-'} {formatTransactionAmount(transactionToDelete)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Type:</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{transactionToDelete.type}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Date:</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(transactionToDelete.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={handleDeleteCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Confirm Bulk Delete</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Are you sure you want to delete {selectedTransactions.length} selected transaction{selectedTransactions.length !== 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowBulkDeleteDialog(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      {showImportModal && (
        <Modal
          isOpen={showImportModal}
          onClose={() => {
            if (!isImportLoading) {
              setShowImportModal(false);
              setCSVPreviewData([]);
              setImportStats({ total: 0, success: 0, failed: 0, duplicates: 0 });
            }
          }}
          title="Import Transactions"
          size="xl"
        >
          <div className="p-6">
            {isImportLoading ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-gray-400">Processing your file...</p>
              </div>
            ) : (
              <>
                {/* Preview table and other content */}
                <div className="space-y-6">
                  {/* Import Summary */}
                  <div>
                    <h3 className="text-base text-gray-200 mb-4">Import Summary</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <div className="flex items-center justify-between">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <span className="text-2xl font-bold text-white">{importStats.total}</span>
                        </div>
                        <div className="mt-1">
                          <div className="text-xs text-gray-400">Total</div>
                          <div className="text-xs text-gray-400">Rows</div>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-800/50 rounded-lg border border-green-700/50">
                        <div className="flex items-center justify-between">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-2xl font-bold text-green-500">{importStats.success}</span>
                        </div>
                        <div className="mt-1">
                          <div className="text-xs text-green-500">Valid</div>
                          <div className="text-xs text-green-500">Entries</div>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-800/50 rounded-lg border border-red-700/50">
                        <div className="flex items-center justify-between">
                          <XCircle className="w-5 h-5 text-red-500" />
                          <span className="text-2xl font-bold text-red-500">{importStats.failed}</span>
                        </div>
                        <div className="mt-1">
                          <div className="text-xs text-red-500">Invalid</div>
                          <div className="text-xs text-red-500">Entries</div>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-800/50 rounded-lg border border-yellow-700/50">
                        <div className="flex items-center justify-between">
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                          <span className="text-2xl font-bold text-yellow-500">{importStats.duplicates}</span>
                        </div>
                        <div className="mt-1">
                          <div className="text-xs text-yellow-500">Duplicates</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-gray-300">
                      <thead className="text-xs uppercase bg-gray-800/50">
                        <tr>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Title</th>
                          <th className="px-4 py-3 text-left">Amount</th>
                          <th className="px-4 py-3 text-left">Type</th>
                          <th className="px-4 py-3 text-left">Category</th>
                          <th className="px-4 py-3 text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {csvPreviewData.map((row, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3">
                              {row.parsedData.isDuplicate ? (
                                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                              ) : row.isValid ? (
                                <Check className="w-5 h-5 text-green-500" />
                              ) : (
                                <X className="w-5 h-5 text-red-500" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-300">{row.parsedData.date}</td>
                            <td className="px-4 py-3 text-gray-300">{row.parsedData.title}</td>
                            <td className="px-4 py-3 text-gray-300">{row.parsedData.amount}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                row.parsedData.type === 'income' 
                                  ? 'bg-green-900/30 text-green-500 border border-green-700/50' 
                                  : 'bg-red-900/30 text-red-500 border border-red-700/50'
                              }`}>
                                {row.parsedData.type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                categories.find(c => c.name.toLowerCase() === row.parsedData.category.toLowerCase())
                                  ? 'bg-blue-900/30 text-blue-400 border border-blue-700/50'
                                  : 'bg-red-900/30 text-red-400 border border-red-700/50'
                              }`}>
                                {row.parsedData.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400">{row.parsedData.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded focus:outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={importStats.success === 0}
                      className={`px-4 py-2 text-sm font-medium rounded flex items-center space-x-2 ${
                        importStats.success === 0
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>
                        Import {importStats.success} Transaction{importStats.success !== 1 ? 's' : ''}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Transactions;
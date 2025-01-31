import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import { 
  Settings as SettingsIcon,
  User,
  Save,
  Trash2,
  Sun,
  Moon,
  DollarSign,
  AlertTriangle,
  Key,
  Mail,
  Bell,
  PiggyBank,
  CheckCircle,
  Tag,
  Plus,
  Edit2,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Folder
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import { fadeIn, formItemAnimation, buttonAnimation } from '../utils/animations';
import { API_BASE_URL } from '../config';
import { CURRENCIES } from '../utils/currency';
import { applyTheme } from '../utils/theme';
import { toast } from 'react-hot-toast';
import { sendNotification } from '../utils/notifications';
import {fetchWithAuth} from '../utils/auth';
import Modal from '../components/Modal';

interface Category {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  isDefault: boolean;
}

interface Settings {
  budgetLimit: number;
  savingsGoal: number;
  notifications: {
    budgetAlerts: boolean;
  };
  defaultCurrency: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    preferences: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword: ''
  });
  const [preferences, setPreferences] = useState<{
    defaultCurrency: string;
    theme: 'light' | 'dark';
    notifications: {
      budgetAlerts: boolean;
    };
  }>({
    defaultCurrency: 'USD',
    theme: 'light',
    notifications: { budgetAlerts: false }
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    icon: '💰',
    color: '#000000'
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
    fetchTheme();
    fetchCategories();
  }, []);

  useEffect(() => {
    // Apply theme whenever it changes
    applyTheme(preferences.theme);
  }, [preferences.theme]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || ''
      });

      setPreferences(prev => ({
        ...prev,
        defaultCurrency: data.defaultCurrency || 'USD',
        notifications: data.notifications || { budgetAlerts: false }
      }));

    } catch (error) {
      setError('Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  };

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
      setError('Failed to fetch theme');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch categories');
    }
  };

  const clearCategoriesCache = async () => {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/categories/clear-cache`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to clear categories cache');
      }
      
      const data = await response.json();
      setCategories(data.categories);
      toast.success('Categories cache cleared successfully');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to clear categories cache');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, profile: true }));
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      // Update local storage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = {
        ...user,
        firstName: profile.firstName,
        lastName: profile.lastName
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setSuccess('Profile updated successfully');
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, password: true }));
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: password.currentPassword,
          newPassword: password.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update password');
      }

      setSuccess('Password updated successfully');
      setPassword({ currentPassword: '', newPassword: '' });
    } catch (error: any) {
      setError(error.message || 'Failed to update password');
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, preferences: true }));
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      // Update the user data in localStorage with the new currency
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = {
        ...user,
        defaultCurrency: preferences.defaultCurrency
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Dispatch currency change event
      window.dispatchEvent(new CustomEvent('currencyChange', { 
        detail: { currency: preferences.defaultCurrency }
      }));

      setSuccess('Preferences updated successfully');
    } catch (error) {
      setError('Failed to update preferences');
      toast.error('Failed to update preferences');
    } finally {
      setLoading(prev => ({ ...prev, preferences: false }));
    }
  };

  const handleThemeToggle = async (newTheme: 'light' | 'dark') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/theme`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ theme: newTheme })
      });

      if (!response.ok) {
        throw new Error('Failed to update theme');
      }

      const data = await response.json();
      if (data && data.theme) {
        setPreferences(prev => ({
          ...prev,
          theme: data.theme
        }));
        applyTheme(data.theme);
      }
    } catch (error) {
      setError('Failed to update theme');
      toast.error('Failed to update theme');
    }
  };

  const handleNotificationsToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Check if notifications are supported
        if (!('Notification' in window)) {
          toast.error('Notifications are not supported in your browser');
          return;
        }

        // Check if already denied
        if (Notification.permission === 'denied') {
          toast.error('Notifications are blocked. Please enable them in your browser settings.');
          return;
        }

        // Request permission if not already granted
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error('Notification permission was denied');
          return;
        }

        // Only update settings if permission was granted
        setPreferences(prev => ({ 
          ...prev, 
          notifications: { budgetAlerts: true }  
        }));
        localStorage.setItem('notificationsEnabled', 'true');
        
        // Send test notification
        setTimeout(() => {
          sendNotification('Expense Tracker Notifications Enabled! 🎉', {
            body: 'You will now receive notifications for budget alerts and important updates.',
            icon: '/logo.png',
            badge: '/logo.png'
          });
        }, 1000);
      } else {
        // Disabling notifications doesn't require permission check
        setPreferences(prev => ({ 
          ...prev, 
          notifications: { budgetAlerts: false }  
        }));
        localStorage.setItem('notificationsEnabled', 'false');
      }

      // Only update server if the state actually changed
      const response = await fetchWithAuth(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...preferences,
          notifications: { budgetAlerts: enabled }  
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update notification settings');
      }

      // Only show success toast if the operation was successful
      if ((enabled && Notification.permission === 'granted') || !enabled) {
        toast.success(enabled ? 'Notifications enabled' : 'Notifications disabled');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update notification settings');
      
      // Revert the local state if server update failed
      setPreferences(prev => ({ 
        ...prev, 
        notifications: { budgetAlerts: !enabled }  
      }));
      localStorage.setItem('notificationsEnabled', (!enabled).toString());
    }
  };

  useEffect(() => {
    const checkNotificationPermission = async () => {
      if ('Notification' in window) {
        if (Notification.permission === 'denied' && preferences.notifications.budgetAlerts) {
          // If notifications are blocked but enabled in settings, disable them
          setPreferences(prev => ({ 
            ...prev, 
            notifications: { budgetAlerts: false }  
          }));
          localStorage.setItem('notificationsEnabled', 'false');
          
          // Update server
          try {
            await fetchWithAuth(`${API_BASE_URL}/api/settings`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...preferences,
                notifications: { budgetAlerts: false }  
              })
            });
          } catch (error) {
            console.error('Error updating notification settings:', error);
          }
        }
      }
    };

    checkNotificationPermission();
  }, []);

  useEffect(() => {
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    setPreferences(prev => ({ ...prev, notifications: { budgetAlerts: notificationsEnabled } }));
  }, []);

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: deletePassword })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete account');
      }

      localStorage.clear();
      navigate('/login');
    } catch (error: any) {
      setError(error.message || 'Failed to delete account');
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(categoryForm)
      });

      if (!response.ok) {
        throw new Error('Failed to create category');
      }

      const data = await response.json();

      // Clear categories cache and notify other components
      clearCategoriesCache();
      window.dispatchEvent(new Event('categoriesChanged'));

      // Update local state
      setCategories(prev => [...prev, data]);

      setShowCategoryModal(false);
      setCategoryForm({
        name: '',
        type: 'expense',
        icon: '💰',
        color: '#000000'
      });
      toast.success('Category created successfully');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete category');
      }

      // Clear categories cache to force a fresh fetch
      clearCategoriesCache();
      
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleCategoryFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCategoryForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loading className="w-8 h-8 text-blue-500" />
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="container mx-auto px-4 pt-8 max-w-4xl"
        >
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Account Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your account preferences and settings</p>
          </div>

          <div className="grid gap-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                <p className="text-green-600 dark:text-green-400">{success}</p>
              </motion.div>
            )}

            {/* Profile Section */}
            <motion.div 
              variants={formItemAnimation}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <User className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Profile Information</h2>
              </div>
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <motion.div variants={formItemAnimation} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white transition-colors duration-200"
                    />
                  </motion.div>
                  <motion.div variants={formItemAnimation} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white transition-colors duration-200"
                    />
                  </motion.div>
                </div>
                <motion.div variants={formItemAnimation} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 dark:text-gray-400"
                  />
                </motion.div>
                <motion.button
                  variants={buttonAnimation}
                  type="submit"
                  disabled={loading.profile}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading.profile ? (
                    <Loading className="w-5 h-5" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>

            {/* Security Section */}
            <motion.div 
              variants={formItemAnimation}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <Key className="w-6 h-6 text-purple-500 dark:text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Security Settings</h2>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-5">
                <motion.div variants={formItemAnimation} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password.currentPassword}
                    onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white transition-colors duration-200"
                  />
                </motion.div>
                <motion.div variants={formItemAnimation} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password.newPassword}
                    onChange={(e) => setPassword({ ...password, newPassword: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white transition-colors duration-200"
                  />
                </motion.div>
                <motion.button
                  variants={buttonAnimation}
                  type="submit"
                  disabled={loading.password}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading.password ? (
                    <Loading className="w-5 h-5" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Update Password
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>

            {/* Preferences Section */}
            <motion.div 
              variants={formItemAnimation}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <SettingsIcon className="w-6 h-6 text-green-500 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Preferences</h2>
              </div>
              <form onSubmit={handleSavePreferences} className="space-y-5">
                <motion.div variants={formItemAnimation} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Default Currency
                  </label>
                  <select
                    value={preferences.defaultCurrency}
                    onChange={(e) => setPreferences({ ...preferences, defaultCurrency: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white transition-colors duration-200"
                  >
                    {Object.values(CURRENCIES).map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.name} ({currency.symbol})
                      </option>
                    ))}
                  </select>
                </motion.div>

                <motion.button
                  variants={buttonAnimation}
                  type="submit"
                  disabled={loading.preferences}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading.preferences ? (
                    <Loading className="w-5 h-5" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Currency
                    </>
                  )}
                </motion.button>

                <motion.div variants={formItemAnimation} className="space-y-2 pt-4 border-t dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notifications
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.notifications.budgetAlerts}
                        onChange={(e) => handleNotificationsToggle(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Get notified about budget alerts and important updates
                      <span className="ml-1 text-xs text-blue-500">(Coming Soon)</span>
                    </span>
                  </div>
                </motion.div>

                <motion.div variants={formItemAnimation} className="space-y-2 pt-4 border-t dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    {preferences.theme === 'dark' ? (
                      <Moon className="w-4 h-4" />
                    ) : (
                      <Sun className="w-4 h-4" />
                    )}
                    Theme
                  </label>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => handleThemeToggle('light')}
                      className={`px-4 py-2 rounded-lg ${
                        preferences.theme === 'light'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => handleThemeToggle('dark')}
                      className={`px-4 py-2 rounded-lg ${
                        preferences.theme === 'dark'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Dark
                    </button>
                  </div>
                </motion.div>
              </form>
            </motion.div>

            {/* Category Management Section */}
            <div className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Folder className="w-5 h-5 text-blue-500" />
                    Category Management
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Organize your transactions with custom categories</p>
                </div>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium shadow-md transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              </div>

              {/* Categories List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Income Categories */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <ArrowUpCircle className="w-5 h-5 text-green-500" />
                    Income Categories
                  </h4>
                  <div className="space-y-3">
                    {categories
                      .filter(cat => cat.type === 'income')
                      .map(category => (
                        <motion.div
                          key={category._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl" role="img" aria-label={category.name}>
                              {category.icon}
                            </span>
                            <div>
                              <h5 className="font-medium text-gray-900 dark:text-white">{category.name}</h5>
                            </div>
                          </div>
                          {!category.isDefault && (
                            <button
                              onClick={() => handleDeleteCategory(category._id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete Category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                  </div>
                </div>

                {/* Expense Categories */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <ArrowDownCircle className="w-5 h-5 text-red-500" />
                    Expense Categories
                  </h4>
                  <div className="space-y-3">
                    {categories
                      .filter(cat => cat.type === 'expense')
                      .map(category => (
                        <motion.div
                          key={category._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl" role="img" aria-label={category.name}>
                              {category.icon}
                            </span>
                            <div>
                              <h5 className="font-medium text-gray-900 dark:text-white">{category.name}</h5>
                            </div>
                          </div>
                          {!category.isDefault && (
                            <button
                              onClick={() => handleDeleteCategory(category._id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete Category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Delete Account Section */}
            <motion.div 
              variants={formItemAnimation}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <Trash2 className="w-5 h-5 text-red-500" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Delete Account</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </motion.div>

            {/* Delete Account Confirmation Modal */}
            <Modal
              isOpen={showDeleteConfirm}
              onClose={() => {
                setShowDeleteConfirm(false);
                setDeletePassword('');
                setError('');
              }}
              title="Delete Account Confirmation"
            >
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center text-center p-4">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Are you absolutely sure?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </p>
                </div>

                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-red-600 dark:text-red-400">
                    <li>All your transactions will be deleted</li>
                    <li>Your categories and settings will be removed</li>
                    <li>Your profile information will be erased</li>
                    <li>You won't be able to recover any of this data</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Please enter your password to confirm:
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeletePassword('');
                        setError('');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={!deletePassword}
                      className={`flex-1 px-4 py-2 bg-red-500 text-white rounded-lg flex items-center justify-center gap-2
                        ${!deletePassword && 'opacity-50 cursor-not-allowed'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </Modal>
          </div>
        </motion.div>
      )}

      {/* Category Form Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md relative"
          >
            <button
              onClick={() => setShowCategoryModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" />
              Add New Category
            </h3>

            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                  placeholder="Enter category name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setCategoryForm({ ...categoryForm, type: 'income' })}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                      categoryForm.type === 'income'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryForm({ ...categoryForm, type: 'expense' })}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                      categoryForm.type === 'expense'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Expense
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Icon
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={categoryForm.icon}
                    readOnly
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors duration-200 cursor-pointer"
                    placeholder="Click to select emoji"
                    required
                  />
                  {showEmojiPicker && (
                    <>
                      <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-40"
                        onClick={() => setShowEmojiPicker(false)}
                      />
                      <div className="fixed z-50" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
                          <EmojiPicker
                            onEmojiClick={(emojiData) => {
                              setCategoryForm(prev => ({ ...prev, icon: emojiData.emoji }));
                              setShowEmojiPicker(false);
                            }}
                            theme={preferences.theme as Theme}
                            width={350}
                            height={450}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium shadow-md transition-all duration-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

import { Theme } from 'emoji-picker-react';

export default Settings;

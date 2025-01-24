import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Home, 
  PlusCircle, 
  MinusCircle, 
  LogOut,
  Settings as SettingsIcon,
  BarChart2,
  DollarSign,
  Tag,
  RefreshCw,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import Modal from './Modal'; // Assuming you have a Modal component in a separate file

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/add-income', label: 'Add Income', icon: PlusCircle },
  { path: '/add-expense', label: 'Add Expense', icon: MinusCircle },
  { path: '/transactions', label: 'Transactions', icon: BarChart2 },
  { path: '/recurring', label: 'Recurring', icon: RefreshCw },
  { path: '/predictions', label: 'Predictions', icon: TrendingUp },
  { path: '/settings', label: 'Settings', icon: SettingsIcon }
];

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    setShowLogoutModal(false);
  };

  const variants = {
    open: { opacity: 1, x: 0 },
    closed: { opacity: 0, x: "-100%" }
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex-shrink-0 flex items-center">
            <Link 
              to="/dashboard" 
              className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-bold text-xl"
            >
              <DollarSign className="w-8 h-8" />
              <span>ExpenseTracker</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    location.pathname === item.path
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900 hover:text-purple-700 dark:hover:text-purple-200'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 transition-colors duration-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500"
            >
              {isOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={variants}
            className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                      location.pathname === item.path
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900 hover:text-purple-700 dark:hover:text-purple-200'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => {
                  setShowLogoutModal(true);
                  setIsOpen(false);
                }}
                className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Dialog */}
      <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} title="Confirm Logout">
        <div className="text-center">
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            Are you sure you want to logout?
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 dark:hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Logout
            </button>
          </div>
        </div>
      </Modal>

    </nav>
  );
}

export default Navbar;
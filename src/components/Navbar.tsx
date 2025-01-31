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
  TrendingUp,
  ChevronDown
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import Modal from './Modal';

const mainMenuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/add-income', label: 'Add Income', icon: PlusCircle },
  { path: '/add-expense', label: 'Add Expense', icon: MinusCircle },
  { path: '/transactions', label: 'Transactions', icon: BarChart2 },
  { path: '/recurring', label: 'Recurring', icon: RefreshCw },
  { path: '/predictions', label: 'Predictions', icon: TrendingUp },
];

const loanMenuItems = [
  { path: '/loans', label: 'My Loans', icon: DollarSign },
  { path: '/loans/calculator', label: 'Loan Calculator', icon: Tag },
  { path: '/loans/compare', label: 'Compare Loans', icon: AlertTriangle },
];

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showLoanMenu, setShowLoanMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    setShowLogoutDialog(false);
  };

  const isLoanPath = location.pathname.startsWith('/loans');

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <Link 
              to="/dashboard" 
              className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-bold text-lg shrink-0"
            >
              <DollarSign className="w-6 h-6" />
              <span className="bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                ExpenseTracker
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:space-x-1 flex-1 justify-center">
              <div className="flex items-center bg-gray-50/80 dark:bg-gray-800/50 rounded-xl p-1">
                {mainMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-purple-600 dark:hover:text-purple-400'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mr-1.5 ${isActive ? 'stroke-2' : 'stroke-1'}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {/* Loans Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowLoanMenu(!showLoanMenu)}
                  className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isLoanPath
                      ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400'
                  }`}
                >
                  <DollarSign className={`w-4 h-4 mr-1.5 ${isLoanPath ? 'stroke-2' : 'stroke-1'}`} />
                  Loans
                  <ChevronDown className={`w-4 h-4 ml-1 transform transition-transform duration-200 ${showLoanMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Loans Dropdown Menu */}
                <AnimatePresence>
                  {showLoanMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-1 w-48 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 focus:outline-none"
                    >
                      <div className="p-1">
                        {loanMenuItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = location.pathname === item.path;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 ${
                                isActive
                                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                              }`}
                              onClick={() => setShowLoanMenu(false)}
                            >
                              <Icon className={`w-4 h-4 mr-1.5 ${isActive ? 'stroke-2' : 'stroke-1'}`} />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="hidden md:flex md:items-center md:space-x-1">
              <Link
                to="/settings"
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === '/settings'
                    ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <SettingsIcon className={`w-4 h-4 mr-1.5 ${location.pathname === '/settings' ? 'stroke-2' : 'stroke-1'}`} />
                Settings
              </Link>

              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1"></div>

              <button
                onClick={() => setShowLogoutDialog(true)}
                className="flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Logout
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400 focus:outline-none transition-colors duration-200"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            >
              <div className="px-4 pt-2 pb-3 space-y-1.5">
                {mainMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className={`w-4 h-4 mr-3 ${isActive ? 'stroke-2' : 'stroke-1'}`} />
                      {item.label}
                    </Link>
                  );
                })}

                {/* Mobile Loans Menu */}
                <div className="space-y-1 pl-4 border-l-2 border-gray-100 dark:border-gray-800">
                  {loanMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400'
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon className={`w-4 h-4 mr-3 ${isActive ? 'stroke-2' : 'stroke-1'}`} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                <div className="pt-2 space-y-1.5">
                  <Link
                    to="/settings"
                    className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      location.pathname === '/settings'
                        ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <SettingsIcon className={`w-4 h-4 mr-3 ${location.pathname === '/settings' ? 'stroke-2' : 'stroke-1'}`} />
                    Settings
                  </Link>

                  <button
                    onClick={() => setShowLogoutDialog(true)}
                    className="flex items-center w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      <div className="h-16"></div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-500" />
              Confirm Logout
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Are you sure you want to logout? You will need to login again to access your account.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowLogoutDialog(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-600"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Navbar;
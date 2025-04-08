import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Avatar,
  Chip,
  useTheme,
  Tooltip,
  Divider,
  Grid,
  Tab,
  Tabs,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Checkbox,
  InputAdornment
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { Users as UsersIcon, Plus as AddIcon, LogOut as ExitIcon, ArrowRight, DollarSign, Settings as SettingsIcon, PieChart as StatsIcon, Plus as PlusOne } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '../utils/fetchInterceptor';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Split {
  user: User;
  amount: number;
  status: 'pending' | 'settled';
  settledAt?: Date;
}

interface GroupTransaction {
  _id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  paidBy: User;
  splits: Split[];
  status: 'pending' | 'partially_settled' | 'settled';
  createdAt: string;
  updatedAt: string;
}

interface GroupMember {
  user: User;
  role: string;
}

interface GroupSettings {
  defaultCurrency: string;
  expenseCategories: Array<{
    name: string;
    color: string;
    icon: string;
  }>;
  budgetLimit?: number;
  notificationPreferences: {
    email: boolean;
    push: boolean;
  };
}

interface GroupStatistics {
  totalExpenses: number;
  monthlyExpenses: number;
  categoryBreakdown: {
    category: string;
    total: number;
  }[];
  memberBalances: {
    userId: string;
    userName: string;
    totalOwed: number;
    totalPaid: number;
    balance: number;
  }[];
}

interface Group {
  _id: string;
  name: string;
  description: string;
  members: GroupMember[];
  createdBy: User;
  settings: GroupSettings;
  statistics: GroupStatistics;
  transactions: GroupTransaction[];
  createdAt: string;
  updatedAt: string;
}

interface GroupCategory {
  _id: string;
  name: string;
  color: string;
  icon: string;
  groupId: string;
  createdAt: string;
}

interface ExpenseCategory {
  name: string;
  color: string;
  icon: string;
}

const Groups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [openNewGroup, setOpenNewGroup] = useState(false);
  const [openNewTransaction, setOpenNewTransaction] = useState(false);
  const [openAddMember, setOpenAddMember] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    defaultCurrency: 'INR'
  });

  const [newTransactionData, setNewTransactionData] = useState({
    title: '',
    description: '',
    amount: 0,
    currency: 'INR',
    category: '',
    splits: [] as { userId: string; amount: number }[]
  });

  const [newMemberData, setNewMemberData] = useState({
    email: '',
    role: 'member'
  });

  const [settingsData, setSettingsData] = useState({
    defaultCurrency: 'INR',
    budgetLimit: 0,
    expenseCategories: [] as { name: string; color: string; icon: string }[],
    notificationPreferences: {
      email: true,
      push: true
    }
  });

  const [emailError, setEmailError] = useState<string>('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [categoryForm, setCategoryForm] = useState<ExpenseCategory>({
    name: '',
    color: '#6366F1',
    icon: '💰'
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  const [openAddCategory, setOpenAddCategory] = useState(false);

  const [categories, setCategories] = useState<GroupCategory[]>([]);

  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [participants, setParticipants] = useState<Array<{
    userId: string;
    amount: number;
    isParticipating: boolean;
  }>>([]);

  useEffect(() => {
    if (selectedGroup) {
      setSettingsData({
        defaultCurrency: selectedGroup.settings?.defaultCurrency || 'INR',
        budgetLimit: selectedGroup.settings?.budgetLimit || 0,
        expenseCategories: selectedGroup.settings?.expenseCategories || [],
        notificationPreferences: {
          email: selectedGroup.settings?.notificationPreferences?.email ?? true,
          push: selectedGroup.settings?.notificationPreferences?.push ?? true
        }
      });
      loadCategories(selectedGroup._id);
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedGroup && openNewTransaction) {
      const initialParticipants = selectedGroup.members.map(member => ({
        userId: member.user._id,
        amount: newTransactionData.amount / selectedGroup.members.length,
        isParticipating: true
      }));
      setParticipants(initialParticipants);
    }
  }, [selectedGroup, openNewTransaction, newTransactionData.amount]);

  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (!token || !user) {
      navigate('/login');
      return;
    }
    
    fetchGroups();
  }, [navigate]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchWithAuth('/api/groups');
      
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }

      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch groups');
      toast.error('Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetails = async (groupId: string) => {
    try {
      const [groupResponse, transactionsResponse, statsResponse] = await Promise.all([
        fetchWithAuth(`/api/groups/${groupId}`),
        fetchWithAuth(`/api/group-transactions/${groupId}`),
        fetchWithAuth(`/api/group-transactions/${groupId}/statistics`)
      ]);

      if (!groupResponse.ok || !transactionsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch group details');
      }

      const [groupData, transactionsData, statsData] = await Promise.all([
        groupResponse.json(),
        transactionsResponse.json(),
        statsResponse.json()
      ]);

      const updatedGroup = {
        ...groupData,
        transactions: transactionsData,
        statistics: statsData
      };

      setSelectedGroup(updatedGroup);
      return updatedGroup;
    } catch (error) {
      console.error('Error fetching group details:', error);
      toast.error('Failed to fetch group details');
      return null;
    }
  };

  const loadCategories = async (groupId: string) => {
    try {
      const response = await fetchWithAuth(`/api/group-categories/${groupId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleCreateGroup = async () => {
    try {
      const response = await fetchWithAuth('/api/groups', {
        method: 'POST',
        body: JSON.stringify(newGroupData)
      });

      if (!response.ok) {
        throw new Error('Failed to create group');
      }

      const newGroup = await response.json();
      setGroups(prev => [newGroup, ...prev]);
      setOpenNewGroup(false);
      setNewGroupData({ name: '', description: '', defaultCurrency: 'INR' });
      toast.success('Group created successfully');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create group');
    }
  };

  const handleCreateTransaction = async (groupId: string) => {
    try {
      const response = await fetchWithAuth(`/api/group-transactions/${groupId}`, {
        method: 'POST',
        body: JSON.stringify(newTransactionData)
      });

      if (!response.ok) {
        throw new Error('Failed to create transaction');
      }

      const newTransaction = await response.json();
      
      // Update the selected group's transactions
      if (selectedGroup) {
        setSelectedGroup(prev => prev ? {
          ...prev,
          transactions: [newTransaction, ...prev.transactions]
        } : null);
      }

      setOpenNewTransaction(false);
      setNewTransactionData({
        title: '',
        description: '',
        amount: 0,
        currency: selectedGroup?.settings.defaultCurrency || 'INR',
        category: '',
        splits: []
      });

      // Refresh group statistics
      await fetchGroupDetails(groupId);
      toast.success('Transaction created successfully');
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create transaction');
    }
  };

  const handleCreateSplitTransaction = async () => {
    try {
      if (!selectedGroup?._id) return;

      // Filter out non-participating members and format the data
      const activeParticipants = participants
        .filter(p => p.isParticipating)
        .map(p => ({
          userId: p.userId,
          amount: Number(p.amount)
        }));

      // Validate total amount matches
      const totalSplitAmount = activeParticipants.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(totalSplitAmount - newTransactionData.amount) >= 0.01) {
        toast.error('Total split amount must match the transaction amount');
        return;
      }

      // Validate at least one participant
      if (activeParticipants.length === 0) {
        toast.error('Please select at least one participant');
        return;
      }

      const response = await fetchWithAuth(`/api/group-transactions/${selectedGroup._id}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTransactionData.title,
          description: newTransactionData.description,
          amount: newTransactionData.amount,
          currency: newTransactionData.currency || 'INR',
          category: newTransactionData.category,
          splitType,
          participants: activeParticipants
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create transaction');
      }

      // Refresh group details and show success message
      await fetchGroupDetails(selectedGroup._id);
      toast.success('Split transaction created successfully');

      // Reset form
      setOpenNewTransaction(false);
      setNewTransactionData({
        title: '',
        description: '',
        amount: 0,
        currency: selectedGroup.settings?.defaultCurrency || 'INR',
        category: '',
        splits: []
      });
      setSplitType('equal');
      setParticipants([]);
    } catch (error) {
      console.error('Error creating split transaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create transaction');
    }
  };

  useEffect(() => {
    if (splitType === 'equal' && participants.length > 0) {
      const activeParticipants = participants.filter(p => p.isParticipating);
      if (activeParticipants.length === 0) return;

      const amountPerPerson = newTransactionData.amount / activeParticipants.length;
      
      setParticipants(prev => prev.map(p => ({
        ...p,
        amount: p.isParticipating ? amountPerPerson : 0
      })));
    }
  }, [newTransactionData.amount, splitType]);

  const handleAddMember = async (groupId: string) => {
    try {
      const response = await fetchWithAuth(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newMemberData.email,
          role: newMemberData.role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Failed to add member');
        return;
      }

      const updatedGroup = await response.json();
      setGroups(prevGroups =>
        prevGroups.map(group =>
          group._id === groupId ? updatedGroup : group
        )
      );
      setSelectedGroup(updatedGroup);
      setOpenAddMember(false);
      setNewMemberData({ email: '', role: 'member' });
      setFoundUser(null);
      setShowConfirmation(false);
      toast.success('Member added successfully');
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const checkUserExists = async (email: string) => {
    try {
      const response = await fetchWithAuth(`/api/groups/check-user/${encodeURIComponent(email)}`);
      if (!response.ok) {
        const error = await response.json();
        setEmailError(error.message || 'User not found');
        setFoundUser(null);
        setShowConfirmation(false);
        return false;
      }
      const { user } = await response.json();
      setFoundUser(user);
      setEmailError('');
      setShowConfirmation(true);
      return true;
    } catch (error) {
      console.error('Error checking user:', error);
      setEmailError('Failed to check user');
      setFoundUser(null);
      setShowConfirmation(false);
      return false;
    }
  };

  const handleUpdateSettings = async (groupId: string) => {
    try {
      const response = await fetchWithAuth(`/api/groups/${groupId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(settingsData)
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const updatedGroup = await response.json();
      setGroups(prev => prev.map(group => 
        group._id === groupId ? updatedGroup : group
      ));
      
      if (selectedGroup?._id === groupId) {
        setSelectedGroup(updatedGroup);
      }

      setOpenSettings(false);
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update settings');
    }
  };

  const handleSettleTransaction = async (transactionId: string) => {
    try {
      const response = await fetchWithAuth(`/api/group-transactions/${transactionId}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to settle transaction');
      }

      // Success response - no need to parse JSON for the transaction data
      // Just refresh the group details to show updated status
      await fetchGroupDetails(selectedGroup?._id as string);
      toast.success('Payment settled successfully');

      // Add the settled amount to the main balance separately
      try {
        // Find the transaction in the current group data
        const transaction = selectedGroup?.transactions.find(t => t._id === transactionId);
        if (transaction) {
          // Get current user
          const userStr = localStorage.getItem('user');
          const user = userStr ? JSON.parse(userStr) : null;
          const userId = user?._id;
          
          if (userId) {
            // Find the user's split
            const userSplit = transaction.splits.find((split: Split) => split.user._id === userId);
            if (userSplit && userSplit.status === 'pending') {
              // Add the settled amount to the user's main balance
              const updateBalanceResponse = await fetchWithAuth('/api/transactions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: 'expense',
                  title: `Split payment for ${transaction.title}`,
                  description: `Settled payment for group expense: ${transaction.title}`,
                  amount: userSplit.amount,
                  date: new Date().toISOString(),
                  currency: transaction.currency || 'INR',
                  categoryId: transaction.category
                })
              });
              
              if (updateBalanceResponse.ok) {
                toast.success(`Added ${transaction.currency} ${userSplit.amount} to your expenses`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error updating main balance:', error);
        // Continue even if updating the main balance fails
      }
    } catch (error) {
      console.error('Error settling transaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to settle transaction');
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    try {
      const response = await fetchWithAuth(`/api/groups/${groupId}/leave`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to leave group');
      }

      setGroups(prev => prev.filter(group => group._id !== groupId));
      if (selectedGroup?._id === groupId) {
        setSelectedGroup(null);
      }
      toast.success('Left group successfully');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to leave group');
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      if (!selectedGroup?._id) return;
      
      const response = await fetchWithAuth(`/api/group-transactions/${selectedGroup._id}/${transactionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      // Refresh group details to update the transactions list
      await fetchGroupDetails(selectedGroup._id);
      toast.success('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return '?';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getFullName = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'Unknown User';
    return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown User';
  };

  const getRandomColor = () => {
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const ROLE_COLORS = {
    creator: '#10B981', // Teal for creator
    admin: '#6366F1',   // Indigo for admin
    member: '#6B7280'   // Gray for member
  };

  const recalculateAmounts = (updatedParticipants: typeof participants) => {
    const activeParticipants = updatedParticipants.filter(p => p.isParticipating);
    if (activeParticipants.length === 0) return updatedParticipants;

    const amountPerPerson = newTransactionData.amount / activeParticipants.length;
    
    return updatedParticipants.map(participant => ({
      ...participant,
      amount: participant.isParticipating ? amountPerPerson : 0
    }));
  };

  const handleParticipantToggle = (userId: string) => {
    const updatedParticipants = participants.map(p => 
      p.userId === userId ? { ...p, isParticipating: !p.isParticipating } : p
    );
    
    if (splitType === 'equal') {
      setParticipants(recalculateAmounts(updatedParticipants));
    } else {
      setParticipants(updatedParticipants.map(p => ({
        ...p,
        amount: p.isParticipating ? p.amount : 0
      })));
    }
  };

  const handleSplitTypeChange = (newType: 'equal' | 'custom') => {
    setSplitType(newType);
    if (newType === 'equal') {
      setParticipants(recalculateAmounts(participants));
    }
  };

  const handleAmountChange = (userId: string, amount: number) => {
    setParticipants(participants.map(p =>
      p.userId === userId ? { ...p, amount: amount } : p
    ));
  };

  const handleAddCategory = async () => {
    try {
      if (!selectedGroup) return;

      const response = await fetchWithAuth(`/api/group-categories/${selectedGroup._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryForm),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Failed to add category');
        return;
      }

      const newCategory = await response.json();
      setCategories(prev => [...prev, newCategory]);
      setCategoryForm({ name: '', color: '#6366F1', icon: '💰' });
      setOpenAddCategory(false);
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      if (!selectedGroup) return;

      const response = await fetchWithAuth(
        `/api/group-categories/${selectedGroup._id}/${categoryId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete category');
        return;
      }

      setCategories(prev => prev.filter(cat => cat._id !== categoryId));
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  return (
    <Box>
      <Navbar />
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{
          p: 3,
          maxWidth: '1200px',
          mx: 'auto'
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography variant="h6" component="div" sx={{ mt: 2, mb: 1, color: 'error.main' }}>
            {error}
          </Typography>
        ) : (
          <>
            <Box 
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 4
              }}
            >
              <Typography 
                variant="h4" 
                component="div"
                sx={{ 
                  fontWeight: 600,
                  color: theme.palette.primary.main
                }}
              >
                {selectedGroup ? selectedGroup.name : 'My Groups'}
              </Typography>
              {!selectedGroup ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenNewGroup(true)}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none'
                  }}
                >
                  Create Group
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<ArrowRight />}
                    onClick={() => setSelectedGroup(null)}
                    sx={{
                      borderRadius: '8px',
                      textTransform: 'none'
                    }}
                  >
                    Back to Groups
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<DollarSign />}
                    onClick={() => {
                      if (selectedGroup) {
                        setOpenNewTransaction(true);
                      }
                    }}
                    sx={{
                      borderRadius: '8px',
                      textTransform: 'none'
                    }}
                  >
                    New Transaction
                  </Button>
                </Box>
              )}
            </Box>

            {selectedGroup ? (
              <>
                <Tabs
                  value={activeTab}
                  onChange={(_, newValue) => setActiveTab(newValue)}
                  sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
                >
                  <Tab label="Transactions" />
                  <Tab label="Members" />
                  <Tab label="Statistics" />
                  <Tab label="Settings" />
                </Tabs>

                <Box sx={{ mt: 2 }}>
                  {activeTab === 0 && (
                    <Box>
                      {selectedGroup.transactions.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <DollarSign size={48} color={theme.palette.text.secondary} style={{ margin: '0 auto' }} />
                          <Typography variant="h6" component="div" sx={{ mt: 2, color: 'text.secondary' }}>
                            No Transactions Yet
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Create your first group transaction to start tracking expenses
                          </Typography>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => {
                              if (selectedGroup) {
                                setOpenNewTransaction(true);
                              }
                            }}
                            sx={{ borderRadius: '8px', textTransform: 'none' }}
                          >
                            Add Transaction
                          </Button>
                        </Box>
                      ) : (
                        <Box>
                          {selectedGroup.transactions.map((transaction) => (
                            <Card key={transaction._id} sx={{ mb: 2, p: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box>
                                  <Typography variant="h6">{transaction.title}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {transaction.description}
                                  </Typography>
                                  <Typography variant="subtitle1">
                                    Total: {transaction.currency} {transaction.amount}
                                  </Typography>
                                  <Typography variant="body2">
                                    Paid by: {transaction.paidBy.firstName} {transaction.paidBy.lastName}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={transaction.status}
                                  color={
                                    transaction.status === 'settled' 
                                      ? 'success' 
                                      : transaction.status === 'partially_settled' 
                                        ? 'warning' 
                                        : 'default'
                                  }
                                />
                              </Box>

                              <Divider sx={{ my: 2 }} />

                              <Typography variant="subtitle2" sx={{ mb: 1 }}>Split Details:</Typography>
                              {transaction.splits.map((split) => (
                                <Box key={split.user._id} sx={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  mb: 1,
                                  p: 1.5,
                                  borderRadius: 1,
                                  bgcolor: 'background.paper',
                                  border: '1px solid',
                                  borderColor: 'divider'
                                }}>
                                  <Box>
                                    <Typography variant="body1" sx={{ fontWeight: split.user._id === transaction.paidBy._id ? 'bold' : 'normal' }}>
                                      {split.user && split.user.firstName ? (
                                        <>
                                          <strong>{split.user.firstName} {split.user.lastName}</strong>
                                        </>
                                      ) : (
                                        <strong>User</strong>
                                      )}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {transaction.currency} {split.amount}
                                    </Typography>
                                  </Box>
                                  
                                  {split.status === 'settled' ? (
                                    <Chip
                                      size="small"
                                      label={`Settled${split.settledAt ? ` on ${new Date(split.settledAt).toLocaleDateString()}` : ''}`}
                                      color="success"
                                    />
                                  ) : split.status === 'pending' ? (
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <Chip
                                        size="small"
                                        label="Pending"
                                        color="default"
                                      />
                                      {split.user._id !== transaction.paidBy._id && (
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          color="primary"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSettleTransaction(transaction._id);
                                          }}
                                          sx={{ fontSize: '0.75rem', py: 0.5 }}
                                        >
                                          Amount Settled
                                        </Button>
                                      )}
                                    </Box>
                                  ) : (
                                    <Chip
                                      size="small"
                                      label="Unknown"
                                      color="error"
                                    />
                                  )}
                                </Box>
                              ))}
                            </Card>
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}
                  {activeTab === 1 && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => {
                            if (selectedGroup) {
                              setOpenAddMember(true);
                            }
                          }}
                          sx={{ borderRadius: '8px', textTransform: 'none' }}
                        >
                          Add Member
                        </Button>
                      </Box>

                      <Grid container spacing={3}>
                        {selectedGroup.members.map((member) => (
                          <Grid item xs={12} sm={6} md={4} key={member.user._id}>
                            <Box sx={{ 
                              bgcolor: 'background.paper', 
                              borderRadius: 2,
                              p: 2
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar
                                  sx={{
                                    bgcolor: member.role === 'admin' ? '#6366F1' : '#6B7280',
                                    width: 40,
                                    height: 40,
                                    mr: 2
                                  }}
                                >
                                  {getInitials(member.user.firstName, member.user.lastName)}
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500 }}>
                                    {getFullName(member.user.firstName, member.user.lastName)}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {member.user.email}
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                    <Chip
                                      size="small"
                                      label={member.role}
                                      sx={{ 
                                        bgcolor: member.role === 'admin' ? '#6366F1' : '#6B7280',
                                        color: 'white',
                                        textTransform: 'capitalize',
                                        height: '24px'
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                  {activeTab === 2 && (
                    <Box>
                      <Grid container spacing={3}>
                        {/* Overview Cards */}
                        <Grid item xs={12} sm={6} md={4}>
                          <Card>
                            <CardContent>
                              <Typography color="text.secondary" gutterBottom component="div">
                                Total Expenses
                              </Typography>
                              <Typography variant="h4" component="div" color="primary">
                                {selectedGroup.settings.defaultCurrency} {selectedGroup.statistics?.totalExpenses?.toFixed(2) || '0.00'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                All time total
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Card>
                            <CardContent>
                              <Typography color="text.secondary" gutterBottom component="div">
                                Monthly Expenses
                              </Typography>
                              <Typography variant="h4" component="div" color="primary">
                                {selectedGroup.settings.defaultCurrency} {selectedGroup.statistics?.monthlyExpenses?.toFixed(2) || '0.00'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Current month
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Card>
                            <CardContent>
                              <Typography color="text.secondary" gutterBottom component="div">
                                Active Members
                              </Typography>
                              <Typography variant="h4" component="div" color="primary">
                                {selectedGroup.members?.length || 0}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Total participants
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>

                        {/* Category Breakdown */}
                        <Grid item xs={12} md={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" gutterBottom component="div">
                                Expense Categories
                              </Typography>
                              <List>
                                {selectedGroup.statistics?.categoryBreakdown?.map((category) => (
                                  <ListItem key={category.category}>
                                    <ListItemText
                                      primary={category.category}
                                      secondary={`${selectedGroup.settings.defaultCurrency} ${category.total.toFixed(2)}`}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                      {((category.total / (selectedGroup.statistics?.totalExpenses || 1)) * 100).toFixed(1)}%
                                    </Typography>
                                  </ListItem>
                                )) || <ListItem><ListItemText primary="No categories yet" /></ListItem>}
                              </List>
                            </CardContent>
                          </Card>
                        </Grid>

                        {/* Member Balances */}
                        <Grid item xs={12} md={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" gutterBottom component="div">
                                Member Balances
                              </Typography>
                              <List>
                                {selectedGroup.statistics?.memberBalances?.map((balance) => {
                                  const member = selectedGroup.members?.find(m => m.user._id === balance.userId);
                                  if (!member) return null;
                                  const netBalance = balance.totalPaid - balance.totalOwed;
                                  return (
                                    <ListItem key={balance.userId}>
                                      <ListItemText
                                        primary={`${member.user.firstName} ${member.user.lastName}`}
                                        secondary={`Paid: ${selectedGroup.settings.defaultCurrency} ${balance.totalPaid.toFixed(2)}`}
                                      />
                                      <Box sx={{ textAlign: 'right' }}>
                                        <Typography
                                          variant="body2"
                                          color={netBalance >= 0 ? 'success.main' : 'error.main'}
                                        >
                                          {netBalance >= 0 ? 'Gets back' : 'Owes'}: {selectedGroup.settings.defaultCurrency} {Math.abs(netBalance).toFixed(2)}
                                        </Typography>
                                      </Box>
                                    </ListItem>
                                  );
                                }) || <ListItem><ListItemText primary="No member balances yet" /></ListItem>}
                              </List>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                  {activeTab === 3 && (
                    <Box>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom component="div">
                            Group Settings
                          </Typography>
                          <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth margin="normal">
                                <InputLabel>Default Currency</InputLabel>
                                <Select
                                  value={settingsData.defaultCurrency}
                                  label="Default Currency"
                                  onChange={(e) => setSettingsData(prev => ({
                                    ...prev,
                                    defaultCurrency: e.target.value
                                  }))}
                                >
                                  <MenuItem value="INR">INR</MenuItem>
                                  <MenuItem value="USD">USD</MenuItem>
                                  <MenuItem value="EUR">EUR</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                margin="normal"
                                label="Budget Limit (Optional)"
                                type="number"
                                value={settingsData.budgetLimit || ''}
                                onChange={(e) => setSettingsData(prev => ({
                                  ...prev,
                                  budgetLimit: e.target.value ? parseFloat(e.target.value) : 0
                                }))}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }} component="div">
                                Expense Categories
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {categories.map((category) => (
                                  <Chip
                                    key={category._id}
                                    label={category.name}
                                    icon={<span role="img" aria-label="category icon">{category.icon}</span>}
                                    sx={{
                                      bgcolor: category.color,
                                      color: 'white',
                                      '& .MuiChip-icon': {
                                        color: 'white'
                                      }
                                    }}
                                    onDelete={() => handleDeleteCategory(category._id)}
                                  />
                                ))}
                                <Button
                                  variant="contained"
                                  onClick={() => setOpenAddCategory(true)}
                                  startIcon={<PlusOne size={20} />}
                                  sx={{ borderRadius: '8px' }}
                                >
                                  Add Category
                                </Button>
                              </Box>
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }} component="div">
                                Notification Preferences
                              </Typography>
                              <FormControl component="fieldset">
                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={6}>
                                    <FormControl>
                                      <Select
                                        value={settingsData.notificationPreferences.email}
                                        onChange={(e) => setSettingsData(prev => ({
                                          ...prev,
                                          notificationPreferences: {
                                            ...prev.notificationPreferences,
                                            email: e.target.value === 'true'
                                          }
                                        }))}
                                      >
                                        <MenuItem value="true">Email Notifications On</MenuItem>
                                        <MenuItem value="false">Email Notifications Off</MenuItem>
                                      </Select>
                                    </FormControl>
                                  </Grid>
                                  <Grid item xs={12} sm={6}>
                                    <FormControl>
                                      <Select
                                        value={settingsData.notificationPreferences.push}
                                        onChange={(e) => setSettingsData(prev => ({
                                          ...prev,
                                          notificationPreferences: {
                                            ...prev.notificationPreferences,
                                            push: e.target.value === 'true'
                                          }
                                        }))}
                                      >
                                        <MenuItem value="true">Push Notifications On</MenuItem>
                                        <MenuItem value="false">Push Notifications Off</MenuItem>
                                      </Select>
                                    </FormControl>
                                  </Grid>
                                </Grid>
                              </FormControl>
                            </Grid>
                          </Grid>
                          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                              variant="contained"
                              onClick={() => {
                                if (selectedGroup) {
                                  handleUpdateSettings(selectedGroup._id);
                                }
                              }}
                            >
                              Save Settings
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  )}
                </Box>
              </>
            ) : (
              <Grid container spacing={3}>
                {groups.map((group) => (
                  <Grid item xs={12} sm={6} md={4} key={group._id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: theme.shadows[4]
                        }
                      }}
                      onClick={() => fetchGroupDetails(group._id)}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom component="div">
                          {group.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {group.description}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            {group.members.length} members
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            {group.members.slice(0, 3).map((member) => (
                              <Tooltip key={member.user._id} title={getFullName(member.user.firstName, member.user.lastName)}>
                                <Avatar
                                  sx={{
                                    bgcolor: getRandomColor(),
                                    width: 32,
                                    height: 32,
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  {getInitials(member.user.firstName, member.user.lastName)}
                                </Avatar>
                              </Tooltip>
                            ))}
                            {group.members.length > 3 && (
                              <Avatar
                                sx={{
                                  bgcolor: theme.palette.grey[300],
                                  width: 32,
                                  height: 32,
                                  fontSize: '0.875rem'
                                }}
                              >
                                +{group.members.length - 3}
                              </Avatar>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Box>

      {/* Dialogs */}
      <Dialog 
        open={openNewTransaction} 
        onClose={() => setOpenNewTransaction(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Transaction</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={newTransactionData.title}
                onChange={(e) => setNewTransactionData(prev => ({ ...prev, title: e.target.value }))}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={newTransactionData.description}
                onChange={(e) => setNewTransactionData(prev => ({ ...prev, description: e.target.value }))}
                margin="normal"
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={newTransactionData.amount}
                onChange={(e) => setNewTransactionData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                margin="normal"
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Category</InputLabel>
                <Select
                  value={newTransactionData.category}
                  onChange={(e) => setNewTransactionData(prev => ({ ...prev, category: e.target.value }))}
                  label="Category"
                >
                  {categories.map((category) => (
                    <MenuItem key={category._id} value={category._id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Split Type</InputLabel>
                <Select
                  value={splitType}
                  onChange={(e) => handleSplitTypeChange(e.target.value as 'equal' | 'custom')}
                  label="Split Type"
                >
                  <MenuItem value="equal">Equal Split</MenuItem>
                  <MenuItem value="custom">Custom Split</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Select Participants
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <List>
                  {participants.map((participant) => {
                    const member = selectedGroup?.members.find(m => m.user._id === participant.userId)?.user;
                    if (!member) return null;

                    return (
                      <ListItem
                        key={participant.userId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          opacity: participant.isParticipating ? 1 : 0.5
                        }}
                      >
                        <Checkbox
                          checked={participant.isParticipating}
                          onChange={() => handleParticipantToggle(participant.userId)}
                        />
                        
                        <ListItemText
                          primary={`${member.firstName} ${member.lastName}`}
                          secondary={member.email}
                          sx={{ flex: 1 }}
                        />
                        
                        <TextField
                          type="number"
                          size="small"
                          value={participant.amount}
                          onChange={(e) => handleAmountChange(participant.userId, Number(e.target.value))}
                          disabled={!participant.isParticipating || splitType === 'equal'}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          }}
                          sx={{ width: 150 }}
                        />
                      </ListItem>
                    );
                  })}
                </List>

                {splitType === 'custom' && (
                  <Box sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}>
                    <Typography>
                      Total Split Amount: ₹
                      {participants.reduce((sum, p) => sum + (p.isParticipating ? p.amount : 0), 0).toFixed(2)}
                    </Typography>
                    <Typography color={
                      Math.abs(
                        participants.reduce((sum, p) => sum + (p.isParticipating ? p.amount : 0), 0) - 
                        newTransactionData.amount
                      ) < 0.01 ? 'success.main' : 'error.main'
                    }>
                      {Math.abs(
                        participants.reduce((sum, p) => sum + (p.isParticipating ? p.amount : 0), 0) - 
                        newTransactionData.amount
                      ) < 0.01 ? '✓ Amounts Match' : '✗ Amounts Don\'t Match'}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenNewTransaction(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateSplitTransaction}
            disabled={
              !newTransactionData.title ||
              !newTransactionData.amount ||
              !newTransactionData.category ||
              participants.filter(p => p.isParticipating).length === 0 ||
              (splitType === 'custom' && Math.abs(
                participants.reduce((sum, p) => sum + (p.isParticipating ? p.amount : 0), 0) - 
                newTransactionData.amount
              ) >= 0.01)
            }
          >
            Create Transaction
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog
        open={openAddMember}
        onClose={() => {
          setOpenAddMember(false);
          setNewMemberData({ email: '', role: 'member' });
          setFoundUser(null);
          setShowConfirmation(false);
          setEmailError('');
        }}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            bgcolor: 'background.default'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>Add New Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Email Address"
            type="email"
            variant="outlined"
            value={newMemberData.email}
            onChange={(e) => {
              setNewMemberData(prev => ({ ...prev, email: e.target.value }));
              setEmailError('');
              setFoundUser(null);
              setShowConfirmation(false);
            }}
            error={!!emailError}
            helperText={emailError || "Enter the email address of the user you want to add"}
            sx={{ mt: 1 }}
          />
          {foundUser && showConfirmation && (
            <Box sx={{ mt: 3, bgcolor: 'background.paper', borderRadius: 1, p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom component="div">
                User Found:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Avatar
                  sx={{
                    bgcolor: '#6B7280',
                    width: 40,
                    height: 40,
                    mr: 2
                  }}
                >
                  {getInitials(foundUser.firstName, foundUser.lastName)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }} component="div">
                    {getFullName(foundUser.firstName, foundUser.lastName)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {foundUser.email}
                  </Typography>
                </Box>
              </Box>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <Select
                  value={newMemberData.role}
                  onChange={(e) => setNewMemberData(prev => ({ ...prev, role: e.target.value }))}
                  displayEmpty
                  sx={{ 
                    borderRadius: '8px',
                    '& .MuiSelect-select': {
                      py: 1.5
                    }
                  }}
                >
                  <MenuItem value="member">Member</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => {
              setOpenAddMember(false);
              setNewMemberData({ email: '', role: 'member' });
              setFoundUser(null);
              setShowConfirmation(false);
              setEmailError('');
            }}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          {!showConfirmation ? (
            <Button
              variant="contained"
              onClick={() => checkUserExists(newMemberData.email)}
              disabled={!newMemberData.email}
              sx={{ borderRadius: '8px', textTransform: 'none' }}
            >
              Check User
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => {
                if (selectedGroup && foundUser) {
                  handleAddMember(selectedGroup._id);
                }
              }}
              disabled={!foundUser || !newMemberData.role}
              sx={{ borderRadius: '8px', textTransform: 'none' }}
            >
              Add Member
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog 
        open={openAddCategory} 
        onClose={() => {
          setOpenAddCategory(false);
          setCategoryForm({ name: '', color: '#6366F1', icon: '💰' });
          setCategoryError('');
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Category Name"
              fullWidth
              value={categoryForm.name}
              onChange={(e) => {
                setCategoryForm(prev => ({ ...prev, name: e.target.value }));
                setCategoryError('');
              }}
              error={!!categoryError}
              helperText={categoryError || "Enter a name for the category"}
            />
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom component="div">
                  Icon
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  sx={{ minWidth: 'auto', p: 1 }}
                >
                  {categoryForm.icon}
                </Button>
                {showEmojiPicker && (
                  <Box sx={{ position: 'absolute', zIndex: 1, mt: 1 }}>
                    <EmojiPicker
                      onEmojiClick={(emojiData: EmojiClickData) => {
                        setCategoryForm(prev => ({ ...prev, icon: emojiData.emoji }));
                        setShowEmojiPicker(false);
                      }}
                      height={350}
                      width={350}
                    />
                  </Box>
                )}
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom component="div">
                  Color
                </Typography>
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                  style={{ width: 40, height: 40, padding: 0, border: 'none' }}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={() => {
              setOpenAddCategory(false);
              setCategoryForm({ name: '', color: '#6366F1', icon: '💰' });
              setCategoryError('');
            }}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddCategory}
            disabled={!categoryForm.name}
            sx={{ borderRadius: '8px' }}
          >
            Add Category
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Group Dialog */}
      <Dialog 
        open={openNewGroup} 
        onClose={() => {
          setOpenNewGroup(false);
          setNewGroupData({ name: '', description: '', defaultCurrency: 'INR' });
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            bgcolor: 'background.default'
          }
        }}
      >
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              fullWidth
              label="Group Name"
              value={newGroupData.name}
              onChange={(e) => setNewGroupData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Trip to Goa"
            />
            <TextField
              fullWidth
              label="Description"
              value={newGroupData.description}
              onChange={(e) => setNewGroupData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What's this group for?"
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Default Currency</InputLabel>
              <Select
                value={newGroupData.defaultCurrency}
                label="Default Currency"
                onChange={(e) => setNewGroupData(prev => ({ ...prev, defaultCurrency: e.target.value }))}
              >
                <MenuItem value="INR">INR</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={() => {
              setOpenNewGroup(false);
              setNewGroupData({ name: '', description: '', defaultCurrency: 'INR' });
            }}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateGroup}
            disabled={!newGroupData.name}
            sx={{ borderRadius: '8px' }}
          >
            Create Group
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Groups;

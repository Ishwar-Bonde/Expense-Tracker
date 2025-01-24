export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  // Income Categories
  {
    id: 'salary',
    name: 'Salary',
    type: 'income',
    icon: '💰',
    color: '#10B981'
  },
  {
    id: 'freelance',
    name: 'Freelance',
    type: 'income',
    icon: '💻',
    color: '#3B82F6'
  },
  {
    id: 'business',
    name: 'Business',
    type: 'income',
    icon: '🏢',
    color: '#6366F1'
  },
  {
    id: 'investments',
    name: 'Investments',
    type: 'income',
    icon: '📈',
    color: '#8B5CF6'
  },
  {
    id: 'rental',
    name: 'Rental Income',
    type: 'income',
    icon: '🏠',
    color: '#EC4899'
  },
  {
    id: 'dividends',
    name: 'Dividends',
    type: 'income',
    icon: '💎',
    color: '#F59E0B'
  },
  {
    id: 'gifts',
    name: 'Gifts Received',
    type: 'income',
    icon: '🎁',
    color: '#F472B6'
  },
  {
    id: 'other_income',
    name: 'Other Income',
    type: 'income',
    icon: '💵',
    color: '#71717A'
  },

  // Expense Categories
  {
    id: 'housing',
    name: 'Housing & Rent',
    type: 'expense',
    icon: '🏠',
    color: '#EF4444'
  },
  {
    id: 'transportation',
    name: 'Transportation',
    type: 'expense',
    icon: '🚗',
    color: '#F59E0B'
  },
  {
    id: 'groceries',
    name: 'Groceries',
    type: 'expense',
    icon: '🛒',
    color: '#10B981'
  },
  {
    id: 'utilities',
    name: 'Utilities',
    type: 'expense',
    icon: '💡',
    color: '#3B82F6'
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    type: 'expense',
    icon: '🎬',
    color: '#8B5CF6'
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    type: 'expense',
    icon: '🏥',
    color: '#EC4899'
  },
  {
    id: 'shopping',
    name: 'Shopping',
    type: 'expense',
    icon: '🛍️',
    color: '#F472B6'
  },
  {
    id: 'dining',
    name: 'Dining Out',
    type: 'expense',
    icon: '🍽️',
    color: '#F97316'
  },
  {
    id: 'education',
    name: 'Education',
    type: 'expense',
    icon: '📚',
    color: '#6366F1'
  },
  {
    id: 'insurance',
    name: 'Insurance',
    type: 'expense',
    icon: '🛡️',
    color: '#0EA5E9'
  },
  {
    id: 'fitness',
    name: 'Fitness & Sports',
    type: 'expense',
    icon: '🏃',
    color: '#22C55E'
  },
  {
    id: 'travel',
    name: 'Travel',
    type: 'expense',
    icon: '✈️',
    color: '#14B8A6'
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    type: 'expense',
    icon: '📱',
    color: '#A855F7'
  },
  {
    id: 'gifts_given',
    name: 'Gifts Given',
    type: 'expense',
    icon: '🎁',
    color: '#F43F5E'
  },
  {
    id: 'other_expense',
    name: 'Other Expense',
    type: 'expense',
    icon: '📝',
    color: '#71717A'
  }
];

import {API_BASE_URL} from '../config';
import { fetchWithAuth } from './auth';

// This will store our cached categories
let cachedCategories: Category[] = [];
let isFetching = false;

// Function to fetch categories from the API
export const fetchCategories = async (): Promise<Category[]> => {
  // If we already have cached categories, return them combined with defaults
  if (cachedCategories.length > 0) {
    return [...DEFAULT_CATEGORIES, ...cachedCategories];
  }

  // If we're already fetching, return default categories
  if (isFetching) {
    return DEFAULT_CATEGORIES;
  }

  try {
    isFetching = true;
    const response = await fetchWithAuth(`${API_BASE_URL}/api/categories`);
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    const data = await response.json();
    
    // Transform the data to match our Category interface and filter out recurring categories
    cachedCategories = data
      .filter((cat: any) => !cat.isRecurring)
      .map((cat: any) => ({
        id: cat._id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color
      }));
    
    return [...DEFAULT_CATEGORIES, ...cachedCategories];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return DEFAULT_CATEGORIES;
  } finally {
    isFetching = false;
  }
};

// Function to clear the cache (useful when adding/removing categories)
export const clearCategoriesCache = () => {
  cachedCategories = [];
};

export const getCategoryById = (id: string): Category | undefined => {
  // First check in default categories
  const defaultCategory = DEFAULT_CATEGORIES.find(cat => cat.id === id);
  if (defaultCategory) return defaultCategory;

  // Then check in cached custom categories
  return cachedCategories.find(cat => cat.id === id);
};

export const getCategoriesByType = (type: 'income' | 'expense' | 'both'): Category[] => {
  const allCategories = [...DEFAULT_CATEGORIES, ...cachedCategories];
  return allCategories.filter(category => category.type === type || category.type === 'both');
};

export const getDefaultCategoryForType = (type: 'income' | 'expense'): Category => {
  return type === 'income' 
    ? DEFAULT_CATEGORIES.find(cat => cat.id === 'other_income')! 
    : DEFAULT_CATEGORIES.find(cat => cat.id === 'other_expense')!;
};

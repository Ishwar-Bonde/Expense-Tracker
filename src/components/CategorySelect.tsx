import React, { useEffect, useState } from 'react';
import { Category, getCategoriesByType, fetchCategories, DEFAULT_CATEGORIES, clearCategoriesCache } from '../utils/categories';
import { API_BASE_URL } from '../config';
import { fetchWithAuth } from '../utils/fetchInterceptor';

interface CategorySelectProps {
  type: 'income' | 'expense';
  value: string;
  onChange: (categoryId: string) => void;
  className?: string;
  isRecurring?: boolean;
}

const CategorySelect: React.FC<CategorySelectProps> = ({ 
  type, 
  value, 
  onChange, 
  className = '',
  isRecurring = false 
}) => {
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const defaultCategories = DEFAULT_CATEGORIES.filter(cat => cat.type === type);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (isRecurring) {
          // Fetch recurring categories
          const response = await fetchWithAuth(`${API_BASE_URL}/api/recurring-categories`);
          if (!response.ok) throw new Error('Failed to fetch recurring categories');
          const data = await response.json();
          const categories = data.map((cat: any) => ({
            id: cat._id,
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            color: cat.color
          }));
          setCustomCategories(categories.filter((cat: Category) => cat.type === type));
        } else {
          // Clear cache and fetch fresh categories
          clearCategoriesCache();
          const allCategories = await fetchCategories();
          const filteredCategories = allCategories.filter(cat => 
            cat.type === type && 
            !DEFAULT_CATEGORIES.some(defaultCat => defaultCat.id === cat.id)
          );
          setCustomCategories(filteredCategories);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setCustomCategories([]);
      }
    };

    loadCategories();
  }, [type, isRecurring]);

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 
          shadow-sm focus:ring-2 focus:ring-${type === 'income' ? 'green' : 'red'}-500 
          focus:border-transparent transition-all duration-200 
          bg-white dark:bg-gray-700 dark:text-white appearance-none
          ${className}`}
        required
      >
        <option value="">Select a category</option>

        {(!isRecurring && defaultCategories.length === 0 && customCategories.length === 0) && (
          <option value="" disabled>
            No {type} categories available
          </option>
        )}

        {!isRecurring && defaultCategories.length > 0 && (
          <optgroup label="Default Categories">
            {defaultCategories.map((category) => (
              <option 
                key={category.id} 
                value={category.id}
                className="py-2"
              >
                {category.icon} {category.name}
              </option>
            ))}
          </optgroup>
        )}
        
        {customCategories.length > 0 ? (
          <optgroup label={isRecurring ? "Recurring Categories" : "Custom Categories"}>
            {customCategories.map((category) => (
              <option 
                key={category.id} 
                value={category.id}
                className="py-2"
              >
                {category.icon} {category.name}
              </option>
            ))}
          </optgroup>
        ) : (
          isRecurring && (
            <option value="" disabled>
              No recurring {type} categories available
            </option>
          )
        )}
      </select>
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-lg">
        {value ? [...defaultCategories, ...customCategories].find(c => c.id === value)?.icon || '📁' : '📁'}
      </div>
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default CategorySelect;

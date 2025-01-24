import { RecurringCategory } from './RecurringCategory';

export interface RecurringTransaction {
  _id: string;
  title: string;
  description?: string;
  amount: number;
  originalAmount: number;
  currency: string;
  originalCurrency: string;
  type: 'income' | 'expense';
  categoryId: string;
  category?: RecurringCategory;
  icon?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;           // Original start date when transaction was created
  lastProcessedDate: string;   // Date when the transaction was last processed
  endDate?: string;           // Optional end date
  nextDueDate: string;        // Next occurrence date
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

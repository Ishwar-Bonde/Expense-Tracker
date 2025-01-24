export interface RecurringCategory {
  _id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

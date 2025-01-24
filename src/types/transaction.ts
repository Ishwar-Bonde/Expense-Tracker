export interface Transaction {
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
  categoryId: string;  // New field
  createdAt: string;
}

export interface TransactionFormData {
  title: string;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  categoryId: string;
}

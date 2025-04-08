export interface Contact {
  name: string;
  phone?: string;
  email?: string;
  relationship?: string;
}

export interface Document {
  _id?: string;
  title: string;
  url: string;
  type: string;
}

export interface Payment {
  _id?: string;
  amount: number;
  date: Date;
  type: 'principal' | 'interest';
  status: 'pending' | 'completed' | 'failed';
  notes?: string;
}

export interface Loan {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  type: 'given' | 'taken';
  amount: number;
  currency: string;
  interestRate: number;
  startDate: Date;
  endDate: Date;
  paymentFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  installmentAmount: number;
  status: 'active' | 'completed' | 'defaulted';
  contact: Contact;
  documents: Document[];
  payments: Payment[];
  remainingAmount: number;
  totalInterestPaid: number;
  nextPaymentDate: Date;
  reminderEnabled: boolean;
  reminderDays: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LoanCalculation {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  monthlyIncomeRatio?: number;
  schedule: Array<{
    paymentNumber: number;
    emi: number;
    principalPayment: number;
    interestPayment: number;
    balance: number;
    totalInterest: number;
  }>;
}

export interface LoanComparison {
  id: number;
  name: string;
  principal: number;
  rate: number;
  tenure: number;
  frequency: string;
  monthlyIncome?: number;
  emi: number;
  totalPayment: number;
  totalInterest: number;
  interestToLoanRatio: number;
  monthlyIncomeRatio?: number;
}

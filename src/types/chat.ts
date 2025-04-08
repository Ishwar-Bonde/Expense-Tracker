export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface FinancialAnalysis {
    totalIncome: number;
    totalExpenses: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsRate: number;
    topCategories: [string, number][];
    expensesByCategory: Record<string, number>;
    transactionCount: number;
}

export interface ChatResponse {
    message: string;
    analysis: FinancialAnalysis;
}

import React, { useState } from 'react';
import { FaCalculator } from 'react-icons/fa';
import Navbar from '../../components/Navbar';

interface LoanFormData {
  principal: number;
  interestRate: number;
  loanTerm: number;
}

interface LoanCalculation {
  emi: number;
  totalPayment: number;
  totalInterest: number;
}

const LoanCalculator: React.FC = () => {
  const [formData, setFormData] = useState<LoanFormData>({
    principal: 100000,
    interestRate: 10,
    loanTerm: 12,
  });
  const [calculation, setCalculation] = useState<LoanCalculation | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const validateForm = (): boolean => {
    if (formData.principal <= 0) {
      setError('Principal amount must be greater than 0');
      return false;
    }
    if (formData.interestRate <= 0 || formData.interestRate > 100) {
      setError('Interest rate must be between 0 and 100');
      return false;
    }
    if (formData.loanTerm <= 0) {
      setError('Loan term must be greater than 0');
      return false;
    }
    setError('');
    return true;
  };

  const calculateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const monthlyRate = (formData.interestRate / 12) / 100;
    const numberOfPayments = formData.loanTerm;

    const emi = (
      formData.principal *
      monthlyRate *
      Math.pow(1 + monthlyRate, numberOfPayments)
    ) / (
      Math.pow(1 + monthlyRate, numberOfPayments) - 1
    );

    const totalPayment = emi * numberOfPayments;
    const totalInterest = totalPayment - formData.principal;

    setCalculation({
      emi,
      totalPayment,
      totalInterest,
    });
    
    setIsLoading(false);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-8 flex items-center justify-center gap-3">
            <FaCalculator className="text-purple-600" />
            Loan EMI Calculator
          </h1>

          <form onSubmit={calculateLoan} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Loan Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  name="principal"
                  value={formData.principal}
                  onChange={handleInputChange}
                  min="1000"
                  className="block w-full pl-8 pr-4 py-2.5 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Interest Rate
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="interestRate"
                  value={formData.interestRate}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
                  step="0.1"
                  className="block w-full px-4 py-2.5 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent pr-8"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Loan Term (Months)
              </label>
              <input
                type="number"
                name="loanTerm"
                value={formData.loanTerm}
                onChange={handleInputChange}
                min="1"
                className="block w-full px-4 py-2.5 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm flex items-center gap-2">
                ⚠️ {error}
              </div>
            )}

            <button 
              type="submit" 
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 text-white font-medium rounded-md transition-colors duration-200 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Calculating...' : 'Calculate EMI'}
              <FaCalculator />
            </button>
          </form>

          {calculation && (
            <div className="mt-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-600 rounded-lg p-6 text-white">
                  <div className="text-sm opacity-90 mb-1">Monthly EMI</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(calculation.emi)}
                  </div>
                </div>

                <div className="bg-gray-700 dark:bg-gray-700 rounded-lg p-6 text-white">
                  <div className="text-sm opacity-90 mb-1">Total Payment</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(calculation.totalPayment)}
                  </div>
                </div>

                <div className="bg-gray-700 dark:bg-gray-700 rounded-lg p-6 text-white">
                  <div className="text-sm opacity-90 mb-1">Total Interest</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(calculation.totalInterest)}
                  </div>
                </div>

                <div className="bg-gray-700 dark:bg-gray-700 rounded-lg p-6 text-white">
                  <div className="text-sm opacity-90 mb-1">Principal Amount</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(formData.principal)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoanCalculator;
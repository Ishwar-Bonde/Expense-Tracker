import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Info, DollarSign, PiggyBank, Target } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatCurrency, getUserCurrency, CurrencyCode, convertCurrencyWithRates, getExchangeRates } from '../utils/currency';
import { API_BASE_URL } from '../config';
import { fetchWithAuth } from '../utils/fetchInterceptor';
import Navbar from '../components/Navbar';
import Tooltip from '../components/Tooltip';

interface PredictionData {
  currentStats: {
    averageIncome: number;
    averageExpenses: number;
    monthlySavings: number;
  };
  prediction: {
    nextMonthExpenses: number;
    predictedSavings: number;
    confidence: number;
  };
}

const Predictions: React.FC = () => {
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userCurrency, setUserCurrency] = useState<CurrencyCode>('USD');
  const [convertedData, setConvertedData] = useState<PredictionData | null>(null);

  useEffect(() => {
    const initCurrency = async () => {
      const currency = await getUserCurrency();
      setUserCurrency(currency);
    };
    initCurrency();
  }, []);

  useEffect(() => {
    fetchPredictions();
  }, []);

  useEffect(() => {
    if (predictionData && userCurrency) {
      convertPredictionData();
    }
  }, [predictionData, userCurrency]);

  const convertPredictionData = async () => {
    if (!predictionData) return;

    try {
      const rates = await getExchangeRates(userCurrency);
      
      const convertedStats = {
        averageIncome: await convertCurrencyWithRates(
          predictionData.currentStats.averageIncome,
          'USD',
          userCurrency,
          rates
        ),
        averageExpenses: await convertCurrencyWithRates(
          predictionData.currentStats.averageExpenses,
          'USD',
          userCurrency,
          rates
        ),
        monthlySavings: await convertCurrencyWithRates(
          predictionData.currentStats.monthlySavings,
          'USD',
          userCurrency,
          rates
        ),
      };

      const convertedPrediction = {
        nextMonthExpenses: await convertCurrencyWithRates(
          predictionData.prediction.nextMonthExpenses,
          'USD',
          userCurrency,
          rates
        ),
        predictedSavings: await convertCurrencyWithRates(
          predictionData.prediction.predictedSavings,
          'USD',
          userCurrency,
          rates
        ),
        confidence: predictionData.prediction.confidence,
      };

      setConvertedData({
        currentStats: convertedStats,
        prediction: convertedPrediction,
      });
    } catch (error) {
      console.error('Error converting currency:', error);
      toast.error('Failed to convert currency');
    }
  };

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`${API_BASE_URL}/api/predictions/future-expenses`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch predictions');
      }

      const data = await response.json();
      setPredictionData(data);
    } catch (error: unknown) {
      console.error('Error fetching predictions:', error);
      setError(error instanceof Error ? error.message : 'Failed to load predictions');
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (title: string, value: number, icon: React.ReactNode, description?: string, trend?: number) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl p-6 border border-gray-100/50 dark:border-gray-700/50"
    >
      <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-16 -translate-y-16">
        <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500 dark:bg-blue-400 rounded-xl text-white shadow-lg shadow-blue-500/20 dark:shadow-blue-400/20">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
              {description && (
                <Tooltip content={description}>
                  <Info size={16} className="inline-block ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                </Tooltip>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(value, userCurrency)}
            </span>
            {trend && (
              <span className={`text-sm font-medium ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderPredictionChart = () => {
    if (!convertedData) return null;

    const isDark = document.documentElement.classList.contains('dark');
    
    const data = {
      labels: ['Current Average', 'Next Month (Predicted)'],
      datasets: [
        {
          label: 'Monthly Expenses',
          data: [convertedData.currentStats.averageExpenses, convertedData.prediction.nextMonthExpenses],
          borderColor: isDark ? '#60A5FA' : '#3B82F6',
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return null;
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            if (isDark) {
              gradient.addColorStop(0, 'rgba(96, 165, 250, 0)');
              gradient.addColorStop(1, 'rgba(96, 165, 250, 0.2)');
            } else {
              gradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
              gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
            }
            return gradient;
          },
          borderWidth: 3,
          tension: 0.4,
          pointBackgroundColor: isDark ? '#60A5FA' : '#3B82F6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: isDark ? '#60A5FA' : '#3B82F6',
          pointHoverBorderWidth: 3,
          pointHoverRadius: 8,
          pointRadius: 6,
        }
      ]
    };

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDark ? '#F1F5F9' : '#1E293B',
          bodyColor: isDark ? '#CBD5E1' : '#475569',
          borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.2)',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            title: () => 'Monthly Expenses',
            label: (context: any) => formatCurrency(context.raw, userCurrency),
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          border: {
            display: false,
          },
          grid: {
            color: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(203, 213, 225, 0.2)',
          },
          ticks: {
            callback: function(tickValue: number | string) {
              return formatCurrency(Number(tickValue), userCurrency);
            },
            padding: 10,
            color: isDark ? '#CBD5E1' : '#475569',
          },
        },
        x: {
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
          ticks: {
            color: isDark ? '#CBD5E1' : '#475569',
          },
        },
      },
    };

    return <Line data={data} options={options} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Analyzing your expenses...</p>
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-red-100 dark:border-red-900/50"
          >
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-lg font-semibold">Error Loading Predictions</h2>
            </div>
            <p className="mt-3 text-gray-600 dark:text-gray-300">{error}</p>
            <button
              onClick={fetchPredictions}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all duration-200"
            >
              Try Again
            </button>
          </motion.div>
        ) : convertedData ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderStatCard(
                'Average Income',
                convertedData.currentStats.averageIncome,
                <DollarSign className="w-5 h-5" />,
                'Your average monthly income based on historical data',
                5
              )}
              {renderStatCard(
                'Average Expenses',
                convertedData.currentStats.averageExpenses,
                <PiggyBank className="w-5 h-5" />,
                'Your average monthly expenses based on historical data',
                convertedData.prediction.nextMonthExpenses > convertedData.currentStats.averageExpenses ? 
                  Math.round((convertedData.prediction.nextMonthExpenses - convertedData.currentStats.averageExpenses) / convertedData.currentStats.averageExpenses * 100) : 
                  Math.round((convertedData.currentStats.averageExpenses - convertedData.prediction.nextMonthExpenses) / convertedData.currentStats.averageExpenses * 100) * -1
              )}
              {renderStatCard(
                'Monthly Savings',
                convertedData.currentStats.monthlySavings,
                <Target className="w-5 h-5" />,
                'Your average monthly savings (Income - Expenses)',
                convertedData.prediction.predictedSavings > convertedData.currentStats.monthlySavings ? 
                  Math.round((convertedData.prediction.predictedSavings - convertedData.currentStats.monthlySavings) / convertedData.currentStats.monthlySavings * 100) : 
                  Math.round((convertedData.currentStats.monthlySavings - convertedData.prediction.predictedSavings) / convertedData.currentStats.monthlySavings * 100) * -1
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100/50 dark:border-gray-700/50"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Expense Prediction</h2>
                <div className={`px-4 py-2 rounded-full ${
                  convertedData.prediction.confidence >= 0.7
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : convertedData.prediction.confidence >= 0.5
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  <span className="text-sm font-semibold">
                    {Math.round(convertedData.prediction.confidence * 100)}% Confidence
                  </span>
                </div>
              </div>
              <div className="h-[400px]">
                {renderPredictionChart()}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-2xl shadow-xl p-6 border border-blue-100/50 dark:border-blue-800/50"
            >
              <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                <Info className="w-6 h-6" />
                <h2 className="text-lg font-semibold">Prediction Analysis</h2>
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                  <span className="text-gray-600 dark:text-gray-300">Next Month's Expenses</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(convertedData.prediction.nextMonthExpenses, userCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                  <span className="text-gray-600 dark:text-gray-300">Expected Savings</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(convertedData.prediction.predictedSavings, userCurrency)}
                  </span>
                </div>
                {convertedData.prediction.predictedSavings < 0 && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/50">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Attention Needed</span>
                    </div>
                    <p className="mt-2 text-red-600/90 dark:text-red-400/90">
                      Your predicted expenses exceed your average income. Consider reviewing your budget.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};

export default Predictions;

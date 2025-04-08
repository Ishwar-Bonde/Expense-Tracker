import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, DollarSign, PiggyBank, Target, RefreshCw, Brain } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { fetchWithAuth } from '../utils/fetchInterceptor';
import Navbar from '../components/Navbar';
import Tooltip from '../components/Tooltip';
import { convertCurrencyWithRates, formatCurrency, getUserCurrency, type CurrencyCode } from '../utils/currency';

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

interface ModelStatus {
  hasPersonalizedModel: boolean;
  created?: string;
  lastTrained?: string;
  trainingCount?: number;
  transactionCount?: number;
  personalModelWeight?: number;
  baseModelWeight?: number;
  message: string;
}

const Predictions: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [userCurrency, setUserCurrency] = useState<CurrencyCode>('INR');
  const [convertedData, setConvertedData] = useState<PredictionData | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [isRetraining, setIsRetraining] = useState(false);

  useEffect(() => {
    const init = async () => {
      const currency = await getUserCurrency();
      setUserCurrency(currency);
      await fetchPredictions();
      await fetchModelStatus();
    };
    init();
  }, []);

  // Convert prediction data to user's preferred currency
  useEffect(() => {
    const convertData = async () => {
      if (!predictionData || !userCurrency) return;

      try {
        // Convert all amounts from INR to user's preferred currency
        const convertedStats = {
          averageIncome: await convertCurrencyWithRates(predictionData.currentStats.averageIncome, 'INR', userCurrency),
          averageExpenses: await convertCurrencyWithRates(predictionData.currentStats.averageExpenses, 'INR', userCurrency),
          monthlySavings: await convertCurrencyWithRates(predictionData.currentStats.monthlySavings, 'INR', userCurrency)
        };

        const convertedPrediction = {
          nextMonthExpenses: await convertCurrencyWithRates(predictionData.prediction.nextMonthExpenses, 'INR', userCurrency),
          predictedSavings: await convertCurrencyWithRates(predictionData.prediction.predictedSavings, 'INR', userCurrency),
          confidence: predictionData.prediction.confidence
        };

        setConvertedData({
          currentStats: convertedStats,
          prediction: convertedPrediction
        });
      } catch (error) {
        console.error('Error converting currency:', error);
        toast.error('Failed to convert currency');
      }
    };

    convertData();
  }, [predictionData, userCurrency]);

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

  const fetchModelStatus = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/predictions/model-status`);
      
      if (!response.ok) {
        console.error('Failed to fetch model status');
        return;
      }

      const data = await response.json();
      setModelStatus(data);
    } catch (error) {
      console.error('Error fetching model status:', error);
    }
  };

  const retrainModel = async () => {
    try {
      setIsRetraining(true);
      toast.loading('Starting model retraining...', { duration: 2000 });
      
      const response = await fetchWithAuth(`${API_BASE_URL}/api/predictions/retrain-model`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to start model retraining');
      }

      const data = await response.json();
      toast.success(data.message || 'Model retraining started');
      
      // Poll for model status updates
      const pollInterval = setInterval(async () => {
        await fetchModelStatus();
      }, 10000); // Check every 10 seconds
      
      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsRetraining(false);
        fetchModelStatus(); // One final check
        fetchPredictions(); // Refresh predictions with new model
        toast.success('Model retraining completed');
      }, 120000);
      
    } catch (error: unknown) {
      console.error('Error retraining model:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to retrain model');
      setIsRetraining(false);
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Expense Predictions</h1>
            <p className="text-gray-600 dark:text-gray-300">
              View predictions for your future expenses based on your spending patterns.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {modelStatus && (
              <Tooltip content={modelStatus.message}>
                <div className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Brain size={20} className={modelStatus.hasPersonalizedModel ? "text-purple-500" : "text-gray-400"} />
                  <span className="ml-2 text-sm font-medium">
                    {modelStatus.hasPersonalizedModel 
                      ? `Personalized (${modelStatus.personalModelWeight}%)` 
                      : "Base Model"}
                  </span>
                </div>
              </Tooltip>
            )}
            
            <button
              onClick={retrainModel}
              disabled={isRetraining}
              className={`flex items-center px-4 py-2 rounded-lg text-white ${isRetraining 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <RefreshCw size={18} className={`mr-2 ${isRetraining ? 'animate-spin' : ''}`} />
              {isRetraining ? 'Retraining...' : 'Retrain Model'}
            </button>
          </div>
        </div>
        
        {/* Model info card */}
        {modelStatus && modelStatus.hasPersonalizedModel && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
              <Brain size={20} className="text-purple-500 mr-2" />
              Personalized Prediction Model
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Created</div>
                <div className="font-medium">{modelStatus.created}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Last Trained</div>
                <div className="font-medium">{modelStatus.lastTrained}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Training Count</div>
                <div className="font-medium">{modelStatus.trainingCount} times</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Transactions Used</div>
                <div className="font-medium">{modelStatus.transactionCount} transactions</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500" 
                  style={{ width: `${modelStatus.personalModelWeight}%` }}
                ></div>
              </div>
              <div className="ml-4 text-sm">
                <span className="font-medium text-purple-500">{modelStatus.personalModelWeight}%</span> personalized
              </div>
            </div>
          </motion.div>
        )}
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
            
            <div className="h-[400px]">
              {renderPredictionChart()}
            </div>
            
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
                    {convertedData && formatCurrency(convertedData.prediction.nextMonthExpenses, userCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                  <span className="text-gray-600 dark:text-gray-300">Expected Savings</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {convertedData && formatCurrency(convertedData.prediction.predictedSavings, userCurrency)}
                  </span>
                </div>
                {convertedData && convertedData.prediction.predictedSavings < 0 && (
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

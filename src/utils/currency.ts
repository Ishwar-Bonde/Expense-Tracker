import { API_BASE_URL } from '../config';

export const CURRENCIES = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€'
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£'
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥'
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹'
  }
};

export type CurrencyCode = keyof typeof CURRENCIES;

// Cache for exchange rates
let ratesCache: { [key: string]: number } | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

// Function to fetch real-time exchange rates
export const fetchLatestRates = async (baseCurrency: CurrencyCode): Promise<{ [key: string]: number }> => {
  try {
    console.log(`Fetching rates for base currency: ${baseCurrency}`);
    
    // Using Exchange Rate API (more reliable and no API key needed)
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
    if (!response.ok) throw new Error('Failed to fetch rates');
    
    const data = await response.json();
    console.log('Raw API response:', data);
    
    if (!data || !data.rates || typeof data.rates !== 'object') {
      throw new Error('Invalid rate data received from API');
    }
    
    // Add base currency rate (1.0) explicitly
    const rates = {
      ...data.rates,
      [baseCurrency]: 1.0
    };
    
    // Add fallback rates for any missing currencies
    Object.keys(CURRENCIES).forEach(currency => {
      if (rates[currency] === undefined) {
        console.warn(`Missing rate for ${currency}, using 1.0`);
        rates[currency] = 1.0;
      }
    });
    
    console.log('Final rates after processing:', rates);
    return rates;
  } catch (error) {
    console.error('Error fetching rates:', error);
    throw error;
  }
};

// Get exchange rates with caching
export const getExchangeRates = async (baseCurrency: CurrencyCode): Promise<{ [key: string]: number }> => {
  const now = Date.now();
  
  if (ratesCache) {
    console.log('Current cache:', ratesCache);
    console.log('Cache age:', (now - lastFetchTime) / 1000, 'seconds');
  }
  
  // Always fetch fresh rates if cache is empty or expired
  if (!ratesCache || !lastFetchTime || (now - lastFetchTime >= CACHE_DURATION)) {
    console.log('Cache miss or expired, fetching fresh rates...');
    try {
      const rates = await fetchLatestRates(baseCurrency);
      ratesCache = rates;
      lastFetchTime = now;
      return rates;
    } catch (error) {
      // If API fails, create default rates
      const defaultRates = Object.keys(CURRENCIES).reduce((acc, curr) => {
        acc[curr] = 1.0;
        return acc;
      }, {} as { [key: string]: number });
      
      if (!ratesCache) {
        console.warn('Using default rates (1.0) due to API error:', defaultRates);
        return defaultRates;
      }
      
      console.warn('Using cached rates due to API error:', ratesCache);
      return ratesCache;
    }
  }
  
  console.log('Using cached rates:', ratesCache);
  return ratesCache;
};

// Convert amount from one currency to another using real-time rates
export const convertCurrencyWithRates = async (
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rates?: { [key: string]: number }
): Promise<number> => {
  try {
    console.log(`Converting ${amount} from ${fromCurrency} to ${toCurrency}`);
    
    if (fromCurrency === toCurrency) {
      console.log('Same currency, returning original amount');
      return amount;
    }
    
    // Get rates with the source currency as base for more accurate conversion
    const currentRates = rates || await getExchangeRates(fromCurrency);
    console.log('Using conversion rates:', currentRates);
    
    const rate = currentRates[toCurrency] || 1.0;
    console.log(`Conversion rate for ${toCurrency}: ${rate}`);
    
    const convertedAmount = amount * rate;
    const finalAmount = Number(convertedAmount.toFixed(2));
    
    console.log(`Converted amount: ${amount} ${fromCurrency} = ${finalAmount} ${toCurrency}`);
    
    return finalAmount;
  } catch (error) {
    console.error('Currency conversion error:', error);
    console.warn(`Failed to convert from ${fromCurrency} to ${toCurrency}, using original amount`);
    return amount;
  }
};

// Format amount with currency symbol
export function formatCurrency(amount: number | undefined | null, currencyCode?: CurrencyCode): string {
  if (amount === undefined || amount === null) return CURRENCIES[currencyCode || 'USD'].symbol + '0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Get currency symbol
export const getCurrencySymbol = (currencyCode: CurrencyCode): string => {
  return CURRENCIES[currencyCode]?.symbol || '$';
};

// Get user's preferred currency from settings or localStorage
export const getUserCurrency = async (): Promise<CurrencyCode> => {
  try {
    // First try to get from settings API
    const response = await fetch('/api/settings/currency', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const { currency } = await response.json();
      return currency;
    }
  } catch (error) {
    console.error('Error fetching currency from settings:', error);
  }

  // Fallback to localStorage
  const savedCurrency = localStorage.getItem('preferredCurrency');
  return (savedCurrency as CurrencyCode) || 'USD';
};

// Set user's preferred currency
export const setUserCurrency = async (currency: CurrencyCode): Promise<boolean> => {
  try {
    const response = await fetch('/api/settings/currency', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ currency })
    });

    if (response.ok) {
      localStorage.setItem('preferredCurrency', currency);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error setting currency:', error);
    return false;
  }
};

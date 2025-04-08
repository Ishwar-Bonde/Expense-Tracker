// Currency codes and their configurations
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

// Cache for exchange rates
let ratesCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

// Function to fetch real-time exchange rates
const fetchLatestRates = async (baseCurrency) => {
  try {
    console.log(`Fetching rates for base currency: ${baseCurrency}`);
    
    // Using Exchange Rate API
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
    if (!response.ok) throw new Error('Failed to fetch rates');
    
    const data = await response.json();
    console.log('Raw API response:', data);
    
    if (!data || !data.rates || typeof data.rates !== 'object') {
      throw new Error('Invalid rate data received from API');
    }

    return data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
};

// Get exchange rates with caching
export const getExchangeRates = async (baseCurrency = 'USD') => {
  const now = Date.now();

  // Return cached rates if they're still valid
  if (ratesCache && lastFetchTime && (now - lastFetchTime < CACHE_DURATION)) {
    console.log('Using cached exchange rates');
    return ratesCache;
  }

  // Fetch new rates
  const rates = await fetchLatestRates(baseCurrency);
  if (rates) {
    ratesCache = rates;
    lastFetchTime = now;
    return rates;
  }

  // Return cached rates if fetch failed and we have a cache
  if (ratesCache) {
    console.log('Fetch failed, using cached rates');
    return ratesCache;
  }

  // Return null if no rates available
  return null;
};

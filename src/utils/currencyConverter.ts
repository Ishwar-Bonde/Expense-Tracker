import { API_BASE_URL } from '../config';

// Define valid currency types
export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR';

// Exchange rates as of January 2024 (example rates)
const EXCHANGE_RATES: Record<Currency, number> = {
  'USD': 0.012,  // 1 INR = 0.012 USD
  'EUR': 0.011,  // 1 INR = 0.011 EUR
  'GBP': 0.0095, // 1 INR = 0.0095 GBP
  'INR': 1,      // 1 INR = 1 INR (base currency)
};

export const convertCurrencyWithRates = async (
  amount: number, 
  fromCurrency: Currency, 
  toCurrency: Currency
): Promise<number> => {
  try {
    // If currencies are the same, return the original amount
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // First convert to INR (base currency)
    const amountInINR = amount * (1 / EXCHANGE_RATES[fromCurrency]);
    
    // Then convert from INR to target currency
    const convertedAmount = amountInINR * EXCHANGE_RATES[toCurrency];

    return Number(convertedAmount.toFixed(2));
  } catch (error) {
    console.error('Error converting currency:', error);
    return amount; // Return original amount if conversion fails
  }
};

// Function to get current exchange rates
export const getExchangeRates = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/exchange-rates`);
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return EXCHANGE_RATES; // Return hardcoded rates as fallback
  }
};

// Exchange rates relative to USD (as of a recent date)
const exchangeRates = {
    'USD': 1,
    'EUR': 0.91,
    'GBP': 0.79,
    'JPY': 145.50,
    'INR': 83.12
};

export const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return amount;
    
    // Convert to USD first (if not already USD)
    const amountInUSD = fromCurrency === 'USD' 
        ? amount 
        : amount / exchangeRates[fromCurrency];
    
    // Convert from USD to target currency
    return amountInUSD * exchangeRates[toCurrency];
};

export const formatCurrency = (amount, currency) => {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    });
    return formatter.format(amount);
};

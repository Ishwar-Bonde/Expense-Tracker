/**
 * Formats a number as currency with the specified locale and currency code
 * @param value The number to format
 * @param locale The locale to use for formatting (default: 'en-IN')
 * @param currency The currency code to use (default: 'INR')
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number,
  locale: string = 'en-IN',
  currency: string = 'INR'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(value);
};

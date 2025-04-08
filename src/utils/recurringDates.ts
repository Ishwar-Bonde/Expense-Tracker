import { addDays, addWeeks, addMonths, addYears, isBefore, startOfDay, endOfDay, isValid } from 'date-fns';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface RecurringDateOptions {
  startDate: Date;
  frequency: RecurringFrequency;
  endDate?: Date | null;
}

/**
 * Calculates the next occurrence date for a recurring transaction
 * taking into account various edge cases and maintaining the same
 * day of month when possible.
 */
export function calculateNextOccurrence(options: RecurringDateOptions): Date {
  const { startDate, frequency, endDate } = options;

  // Validate inputs
  if (!isValid(startDate)) {
    throw new Error('Invalid start date');
  }
  if (endDate && !isValid(endDate)) {
    throw new Error('Invalid end date');
  }
  if (endDate && isBefore(endDate, startDate)) {
    throw new Error('End date must be after start date');
  }

  const today = startOfDay(new Date());
  let nextDate = startOfDay(startDate);

  // Helper function to get next date based on frequency
  const getNextDate = (date: Date): Date => {
    const originalDay = date.getDate();
    let nextDate: Date;

    switch (frequency) {
      case 'daily':
        nextDate = addDays(date, 1);
        break;
      case 'weekly':
        nextDate = addWeeks(date, 1);
        break;
      case 'monthly':
        // For monthly, we try to maintain the same day of month
        nextDate = addMonths(date, 1);
        // Check if we've moved to a different day of month (e.g., 31st -> 1st)
        if (nextDate.getDate() !== originalDay) {
          // If so, move back to the last day of the intended month
          nextDate = endOfDay(addMonths(date, 1));
          nextDate.setDate(0); // Move to last day of previous month
        }
        break;
      case 'yearly':
        nextDate = addYears(date, 1);
        // Handle February 29 in leap years
        if (nextDate.getDate() !== originalDay) {
          nextDate = endOfDay(addYears(date, 1));
          nextDate.setDate(0);
        }
        break;
      default:
        throw new Error(`Invalid frequency: ${frequency}`);
    }

    return startOfDay(nextDate);
  };

  // If the start date is in the future, use it as the next occurrence
  if (isBefore(today, nextDate)) {
    return nextDate;
  }

  // Find the next occurrence after today
  while (isBefore(nextDate, today) || nextDate.getTime() === today.getTime()) {
    nextDate = getNextDate(nextDate);
    
    // Check if we've passed the end date
    if (endDate && isBefore(endDate, nextDate)) {
      return endDate;
    }
  }

  return nextDate;
}

/**
 * Gets all occurrences between two dates for a recurring transaction
 */
export function getOccurrencesBetweenDates(
  options: RecurringDateOptions & { endDate: Date }
): Date[] {
  const { startDate, frequency, endDate } = options;
  const occurrences: Date[] = [];
  let currentDate = startOfDay(startDate);

  // Validate inputs
  if (!isValid(startDate) || !isValid(endDate)) {
    throw new Error('Invalid date input');
  }
  if (isBefore(endDate, startDate)) {
    throw new Error('End date must be after start date');
  }

  while (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) {
    occurrences.push(currentDate);
    currentDate = calculateNextOccurrence({ startDate: currentDate, frequency, endDate });
    
    // Safety check to prevent infinite loops
    if (occurrences.length > 1000) {
      console.warn('Too many occurrences calculated, breaking loop');
      break;
    }
  }

  return occurrences;
}

/**
 * Validates if a given date is a valid occurrence for a recurring transaction
 */
export function isValidOccurrence(date: Date, options: RecurringDateOptions): boolean {
  try {
    const { startDate, frequency, endDate } = options;
    const normalizedDate = startOfDay(date);
    const normalizedStart = startOfDay(startDate);

    // Check basic validity
    if (!isValid(date) || !isValid(startDate)) {
      return false;
    }

    // Check if date is before start date
    if (isBefore(normalizedDate, normalizedStart)) {
      return false;
    }

    // Check if date is after end date
    if (endDate && isBefore(endDate, normalizedDate)) {
      return false;
    }

    // Get all occurrences up to this date
    const occurrences = getOccurrencesBetweenDates({
      startDate,
      frequency,
      endDate: date
    });

    // Check if this date matches any occurrence
    return occurrences.some(
      occurrence => occurrence.getTime() === normalizedDate.getTime()
    );
  } catch (error) {
    console.error('Error in isValidOccurrence:', error);
    return false;
  }
}

/**
 * Process recurring transactions and update their next due dates
 */
export async function processRecurringTransactions(transaction: any, API_BASE_URL: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recurring-transactions/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ transactionId: transaction._id })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to process recurring transaction');
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing recurring transaction:', error);
    throw error;
  }
}

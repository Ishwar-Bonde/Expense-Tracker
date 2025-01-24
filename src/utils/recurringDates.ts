import { addDays, addWeeks, addMonths, addYears, isBefore, startOfDay } from 'date-fns';

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
  const today = startOfDay(new Date());
  let nextDate: Date;

  // Helper function to get next date based on frequency
  const getNextDate = (date: Date): Date => {
    switch (frequency) {
      case 'daily':
        return addDays(date, 1);
      case 'weekly':
        return addWeeks(date, 1);
      case 'monthly':
        // For monthly, we try to maintain the same day of month
        const nextMonth = addMonths(date, 1);
        // Check if we've moved to a different day of month (e.g., 31st -> 1st)
        if (nextMonth.getDate() !== date.getDate()) {
          // If so, move back to the last day of the intended month
          nextMonth.setDate(0);
        }
        return nextMonth;
      case 'yearly':
        return addYears(date, 1);
      default:
        throw new Error(`Invalid frequency: ${frequency}`);
    }
  };

  // Start with the initial date
  nextDate = startOfDay(startDate);

  // If the start date is in the future, use it as the next occurrence
  if (isBefore(today, nextDate)) {
    return nextDate;
  }

  // Keep advancing the date until we find the next occurrence
  while (isBefore(nextDate, today) || nextDate.getTime() === today.getTime()) {
    nextDate = getNextDate(nextDate);
  }

  // If there's an end date and we've passed it, return null
  if (endDate && isBefore(endDate, nextDate)) {
    return endDate;
  }

  return nextDate;
}

/**
 * Gets all occurrences between two dates for a recurring transaction
 */
export function getOccurrencesBetweenDates(
  options: RecurringDateOptions & { endDate: Date }
): Date[] {
  const { startDate, endDate } = options;
  const occurrences: Date[] = [];
  let currentDate = startOfDay(startDate);

  while (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) {
    occurrences.push(currentDate);
    currentDate = calculateNextOccurrence({ ...options, startDate: currentDate });
    
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
  const occurrenceDate = calculateNextOccurrence({
    ...options,
    startDate: date
  });
  return occurrenceDate.getTime() === startOfDay(date).getTime();
}

export function calculateEMI(principal, rate, tenure, frequency = 'monthly') {
  // Convert annual rate to monthly/periodic rate
  let periodicRate;
  let totalPeriods;

  switch (frequency.toLowerCase()) {
    case 'daily':
      periodicRate = (rate / 100) / 365;
      totalPeriods = tenure * 365;
      break;
    case 'weekly':
      periodicRate = (rate / 100) / 52;
      totalPeriods = tenure * 52;
      break;
    case 'monthly':
      periodicRate = (rate / 100) / 12;
      totalPeriods = tenure * 12;
      break;
    case 'quarterly':
      periodicRate = (rate / 100) / 4;
      totalPeriods = tenure * 4;
      break;
    case 'yearly':
      periodicRate = (rate / 100);
      totalPeriods = tenure;
      break;
    default:
      periodicRate = (rate / 100) / 12;
      totalPeriods = tenure * 12;
  }

  if (rate === 0) {
    return principal / totalPeriods;
  }

  const emi = (principal * periodicRate * Math.pow(1 + periodicRate, totalPeriods)) /
              (Math.pow(1 + periodicRate, totalPeriods) - 1);
  
  return Math.round(emi * 100) / 100;
}

export function calculateTotalPayment(emi, tenure, frequency = 'monthly') {
  let totalPeriods;
  switch (frequency.toLowerCase()) {
    case 'daily': totalPeriods = tenure * 365; break;
    case 'weekly': totalPeriods = tenure * 52; break;
    case 'monthly': totalPeriods = tenure * 12; break;
    case 'quarterly': totalPeriods = tenure * 4; break;
    case 'yearly': totalPeriods = tenure; break;
    default: totalPeriods = tenure * 12;
  }
  
  return Math.round(emi * totalPeriods * 100) / 100;
}

export function calculateAmortizationSchedule(principal, rate, tenure, frequency = 'monthly') {
  const emi = calculateEMI(principal, rate, tenure, frequency);
  const schedule = [];
  let balance = principal;
  let totalInterest = 0;
  let periodicRate;

  switch (frequency.toLowerCase()) {
    case 'daily': periodicRate = (rate / 100) / 365; break;
    case 'weekly': periodicRate = (rate / 100) / 52; break;
    case 'monthly': periodicRate = (rate / 100) / 12; break;
    case 'quarterly': periodicRate = (rate / 100) / 4; break;
    case 'yearly': periodicRate = (rate / 100); break;
    default: periodicRate = (rate / 100) / 12;
  }

  let paymentNumber = 1;
  while (balance > 0) {
    const interestPayment = balance * periodicRate;
    const principalPayment = Math.min(emi - interestPayment, balance);
    balance -= principalPayment;
    totalInterest += interestPayment;

    schedule.push({
      paymentNumber,
      emi,
      principalPayment: Math.round(principalPayment * 100) / 100,
      interestPayment: Math.round(interestPayment * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100
    });

    paymentNumber++;
  }

  return schedule;
}

export function compareLoanOptions(options) {
  return options.map(option => {
    const emi = calculateEMI(option.principal, option.rate, option.tenure, option.frequency);
    const totalPayment = calculateTotalPayment(emi, option.tenure, option.frequency);
    const schedule = calculateAmortizationSchedule(option.principal, option.rate, option.tenure, option.frequency);
    const totalInterest = schedule[schedule.length - 1].totalInterest;

    return {
      ...option,
      emi,
      totalPayment,
      totalInterest,
      interestToLoanRatio: (totalInterest / option.principal) * 100,
      monthlyIncomeRatio: option.monthlyIncome ? (emi / option.monthlyIncome) * 100 : null
    };
  }).sort((a, b) => a.totalPayment - b.totalPayment);
}

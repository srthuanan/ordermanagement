export type RepaymentMethod = 'declining' | 'annuity';

export interface LoanScheduleItem {
  month: number;
  beginningBalance: number;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  endingBalance: number;
  rate: number;
}

export interface LoanSummary {
  totalPrincipal: number;
  totalInterest: number;
  totalPayment: number;
  schedule: LoanScheduleItem[];
}

/**
 * Tính toán lịch trả nợ chuẩn ngân hàng
 */
export function generateLoanSchedule(
  principal: number,
  termMonths: number,
  fixedRate: number,
  fixedMonths: number,
  floatingRate: number,
  method: RepaymentMethod
): LoanSummary {
  const schedule: LoanScheduleItem[] = [];
  let currentBalance = principal;
  let totalInterest = 0;

  for (let month = 1; month <= termMonths; month++) {
    const currentAnnualRate = month <= fixedMonths ? fixedRate : floatingRate;
    const monthlyRate = currentAnnualRate / 100 / 12;

    let principalPayment = 0;
    let interestPayment = 0;
    let totalPayment = 0;

    if (method === 'declining') {
      principalPayment = principal / termMonths;
      interestPayment = currentBalance * monthlyRate;
      totalPayment = principalPayment + interestPayment;
    } else {
      const remainingMonths = termMonths - month + 1;
      if (monthlyRate === 0) {
        totalPayment = currentBalance / remainingMonths;
      } else {
        totalPayment =
          (currentBalance * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) /
          (Math.pow(1 + monthlyRate, remainingMonths) - 1);
      }
      interestPayment = currentBalance * monthlyRate;
      principalPayment = totalPayment - interestPayment;
    }

    principalPayment = Math.round(principalPayment);
    interestPayment = Math.round(interestPayment);
    totalPayment = principalPayment + interestPayment;

    if (month === termMonths) {
      principalPayment = currentBalance;
      totalPayment = principalPayment + interestPayment;
    }

    const endingBalance = Math.max(0, currentBalance - principalPayment);

    schedule.push({
      month,
      beginningBalance: currentBalance,
      principalPayment,
      interestPayment,
      totalPayment,
      endingBalance,
      rate: currentAnnualRate
    });

    totalInterest += interestPayment;
    currentBalance = endingBalance;
  }

  return {
    totalPrincipal: principal,
    totalInterest,
    totalPayment: principal + totalInterest,
    schedule
  };
}

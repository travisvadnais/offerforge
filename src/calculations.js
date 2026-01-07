// OfferForge Calculation Functions
window.OfferForge = window.OfferForge || {};

OfferForge.calculations = {
  // Calculate monthly principal and interest payment
  calculateMonthlyPI(principal, annualRate, termYears) {
    if (annualRate === 0) {
      return principal / (termYears * 12);
    }
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = termYears * 12;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  },

  // Calculate remaining balance after X months
  calculateRemainingBalance(principal, annualRate, termYears, monthsElapsed) {
    if (annualRate === 0) {
      const monthlyPayment = principal / (termYears * 12);
      return principal - (monthlyPayment * monthsElapsed);
    }
    const monthlyRate = annualRate / 100 / 12;
    const monthlyPayment = this.calculateMonthlyPI(principal, annualRate, termYears);
    const remainingBalance = principal * Math.pow(1 + monthlyRate, monthsElapsed) -
      monthlyPayment * ((Math.pow(1 + monthlyRate, monthsElapsed) - 1) / monthlyRate);
    return Math.max(0, remainingBalance);
  },

  // Get motivation level based on days on market
  getMotivationLevel(daysOnMarket) {
    const thresholds = OfferForge.config.MOTIVATION_THRESHOLDS;
    if (daysOnMarket > thresholds.VERY_HIGH) return 'very_high';
    if (daysOnMarket > thresholds.HIGH) return 'high';
    if (daysOnMarket > thresholds.MODERATE) return 'moderate';
    return 'low';
  },

  // Get recommended terms based on motivation
  getRecommendedTerms(motivation) {
    return OfferForge.config.RECOMMENDED_TERMS[motivation] ||
           OfferForge.config.RECOMMENDED_TERMS.low;
  },

  // Get motivation display info
  getMotivationDisplay(motivation) {
    const displays = {
      very_high: { text: 'Very High', color: '#e74c3c' },
      high: { text: 'High', color: '#e67e22' },
      moderate: { text: 'Moderate', color: '#f1c40f' },
      low: { text: 'Low', color: '#888' }
    };
    return displays[motivation] || displays.low;
  },

  // Calculate full offer details
  calculateOffer(state) {
    const offerPrice = state.listPrice * (state.offerPricePercent / 100);
    const downPayment = offerPrice * (state.downPaymentPercent / 100);
    const loanAmount = offerPrice - downPayment;

    const monthlyPI = this.calculateMonthlyPI(loanAmount, state.interestRate, state.loanTermYears);
    const monthlyTaxes = state.annualTaxes / 12;
    const monthlyInsurance = state.annualInsurance / 12;
    const monthlyHoa = state.monthlyHoa;
    const totalPITI = monthlyPI + monthlyTaxes + monthlyInsurance + monthlyHoa;

    let balloonPayment = 0;
    if (state.balloonYears > 0) {
      const monthsUntilBalloon = state.balloonYears * 12;
      balloonPayment = this.calculateRemainingBalance(
        loanAmount, state.interestRate, state.loanTermYears, monthsUntilBalloon
      );
    }

    const commissionRate = OfferForge.config.COMMISSION_RATE;
    const traditionalCommission = state.listPrice * commissionRate;
    const traditionalNet = state.listPrice - traditionalCommission;
    const sellerNetAtClose = downPayment - traditionalCommission;

    const motivation = this.getMotivationLevel(state.daysOnMarket);
    const motivationDisplay = this.getMotivationDisplay(motivation);

    return {
      offerPrice,
      downPayment,
      loanAmount,
      monthlyPI,
      monthlyTaxes,
      monthlyInsurance,
      monthlyHoa,
      totalPITI,
      balloonPayment,
      traditionalCommission,
      traditionalNet,
      sellerNetAtClose,
      motivation,
      motivationText: motivationDisplay.text,
      motivationColor: motivationDisplay.color
    };
  }
};

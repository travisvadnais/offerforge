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

  // Calculate appraisal risk based on list price vs estimate
  calculateAppraisalRisk(listPrice, estimate) {
    if (!estimate || !listPrice) {
      return null; // Can't calculate without both values
    }

    const difference = listPrice - estimate;
    const percentDiff = (difference / estimate) * 100;

    let risk, status, color, icon;

    if (percentDiff > 20) {
      risk = 'high';
      status = 'Unlikely to Appraise';
      color = '#e74c3c';
      icon = '⚠️';
    } else if (percentDiff > 10) {
      risk = 'moderate';
      status = 'May Have Issues';
      color = '#e67e22';
      icon = '⚡';
    } else if (percentDiff > 0) {
      risk = 'low';
      status = 'Likely to Appraise';
      color = '#f1c40f';
      icon = '✓';
    } else {
      risk = 'none';
      status = 'Should Appraise';
      color = '#27ae60';
      icon = '✓';
    }

    return {
      risk,
      status,
      color,
      icon,
      estimate,
      listPrice,
      difference,
      percentDiff: percentDiff.toFixed(1)
    };
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

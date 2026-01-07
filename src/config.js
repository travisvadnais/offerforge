// OfferForge Configuration and Constants
window.OfferForge = window.OfferForge || {};

OfferForge.config = {
  // Base defaults (for low motivation sellers)
  BASE_DEFAULTS: {
    listPrice: 350000,
    daysOnMarket: 30,
    annualTaxes: 4200,
    annualInsurance: 1750,
    monthlyHoa: 0,
    offerPricePercent: 100,
    downPaymentPercent: 10,
    interestRate: 5,
    loanTermYears: 30,
    balloonYears: 5
  },

  // Motivation thresholds (days on market)
  MOTIVATION_THRESHOLDS: {
    VERY_HIGH: 90,
    HIGH: 60,
    MODERATE: 30
  },

  // Recommended terms by motivation level
  RECOMMENDED_TERMS: {
    very_high: {
      offerPricePercent: 95,
      downPaymentPercent: 5,
      interestRate: 4,
      balloonYears: 7
    },
    high: {
      offerPricePercent: 97,
      downPaymentPercent: 7,
      interestRate: 4.5,
      balloonYears: 5
    },
    moderate: {
      offerPricePercent: 100,
      downPaymentPercent: 8,
      interestRate: 5,
      balloonYears: 5
    },
    low: {
      offerPricePercent: 100,
      downPaymentPercent: 10,
      interestRate: 5.5,
      balloonYears: 5
    }
  },

  // Commission rate for traditional sales
  COMMISSION_RATE: 0.06,

  // Estimation rates when data isn't scraped
  TAX_ESTIMATE_RATE: 0.012,      // ~1.2% of home value
  INSURANCE_ESTIMATE_RATE: 0.005 // ~0.5% of home value
};

// OfferForge - Seller Finance Offer Calculator
// Injects a calculator into real estate listing pages

(function() {
  'use strict';

  // ===========================================
  // SITE DETECTION & URL VALIDATION
  // ===========================================

  function detectSite() {
    const hostname = window.location.hostname;
    if (hostname.includes('zillow.com')) return 'zillow';
    if (hostname.includes('redfin.com')) return 'redfin';
    return 'unknown';
  }

  // Check if we're on a listing detail page
  function isListingPage() {
    const site = detectSite();
    if (site === 'unknown') return false;

    const url = window.location.href;
    const pathname = window.location.pathname;

    if (site === 'zillow') {
      // Zillow listing URLs contain /homedetails/ and end with _zpid
      // e.g., /homedetails/415-Winsor-St-Ludlow-MA-01056/56193012_zpid/
      const isListing = url.includes('/homedetails/') || url.includes('_zpid');
      console.log('OfferForge Zillow check:', { url, pathname, isListing });
      return isListing;
    }

    if (site === 'redfin') {
      // Redfin listing URLs contain /home/ followed by digits
      // e.g., /MA/Chicopee/82-Mitchell-Dr-01022/unit-82/home/199481538
      const isListing = /\/home\/\d+/.test(url);
      console.log('OfferForge Redfin check:', { url, pathname, isListing });
      return isListing;
    }

    return false;
  }

  // Helper: Parse currency string to number
  function parseCurrency(str) {
    if (!str) return null;
    const cleaned = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  // Helper: Get text from first matching selector
  function getTextFromSelectors(selectors) {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        return el.textContent || el.innerText;
      }
    }
    return null;
  }

  // ===========================================
  // ZILLOW SCRAPER
  // ===========================================

  function scrapeZillow() {
    const data = {};

    // List Price - try multiple selectors
    const priceSelectors = [
      '[data-testid="price"] span',
      '[data-testid="price"]',
      '.summary-container [data-testid="price"]',
      '.ds-summary-row span[data-testid="price"]',
      '.price',
      'span[data-test="property-card-price"]',
      'h3.ds-price'
    ];

    let priceText = getTextFromSelectors(priceSelectors);

    // Also try finding price by pattern in the page
    if (!priceText) {
      const allSpans = document.querySelectorAll('span, h3, div');
      for (const el of allSpans) {
        const text = el.textContent;
        if (/^\$[\d,]+$/.test(text.trim()) && text.includes(',')) {
          const val = parseCurrency(text);
          if (val && val > 50000 && val < 50000000) {
            priceText = text;
            break;
          }
        }
      }
    }

    data.listPrice = parseCurrency(priceText);

    // Days on Market - Zillow shows "Time on Zillow"
    const allText = document.body.innerText || '';
    const daysMatch = allText.match(/(\d+)\s*days?\s*on\s*zillow/i);
    if (daysMatch) {
      data.daysOnMarket = parseInt(daysMatch[1], 10);
    }

    // Property taxes - often in the "Monthly cost" section
    // Zillow shows monthly, so multiply by 12
    const taxPatterns = [
      /property\s*tax[:\s]*\$?([\d,]+)/i,
      /tax[:\s]*\$?([\d,]+)\s*\/?\s*(?:mo|month)/i
    ];

    for (const pattern of taxPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const taxValue = parseCurrency(match[1]);
        if (taxValue && taxValue < 10000) {
          // If under $1000, assume it's monthly and multiply by 12
          data.annualTaxes = taxValue < 1000 ? taxValue * 12 : taxValue;
          break;
        }
      }
    }

    // HOA - Zillow formats: "HOA: $368" or "$368/mo HOA"
    const zillowHoaPatterns = [
      /\$([\d,]+)\/mo\s*hoa/i,                 // $368/mo HOA
      /hoa[:\s]*\$([\d,]+)/i,                  // HOA: $368 or HOA $368
      /hoa[:\s]*([\d,]+)\s*\/?\s*(?:mo|month)/i // HOA: 368/mo
    ];
    for (const pattern of zillowHoaPatterns) {
      const hoaMatch = allText.match(pattern);
      if (hoaMatch) {
        const hoaVal = parseCurrency(hoaMatch[1]);
        if (hoaVal && hoaVal > 0 && hoaVal < 2000) {
          data.monthlyHoa = hoaVal;
          console.log('OfferForge Zillow HOA found:', { pattern: pattern.toString(), value: hoaVal });
          break;
        }
      }
    }

    // Insurance estimate - often shown in monthly cost breakdown
    const insuranceMatch = allText.match(/insurance[:\s]*\$?([\d,]+)\s*\/?\s*(?:mo|month)?/i);
    if (insuranceMatch) {
      const monthlyIns = parseCurrency(insuranceMatch[1]);
      if (monthlyIns && monthlyIns < 2000) {
        data.annualInsurance = monthlyIns * 12;
      }
    }

    return data;
  }

  // ===========================================
  // REDFIN SCRAPER
  // ===========================================

  function scrapeRedfin() {
    const data = {};
    const allText = document.body.innerText || '';

    // List Price
    const priceSelectors = [
      '.statsValue [data-rf-test-id="abp-price"]',
      '[data-rf-test-id="abp-price"]',
      '.price-section .statsValue',
      '.HomeInfoV2 .price',
      '.price'
    ];

    let priceText = getTextFromSelectors(priceSelectors);

    // Try pattern matching
    if (!priceText) {
      const priceMatch = allText.match(/\$[\d,]+(?=\s|$)/);
      if (priceMatch) {
        const val = parseCurrency(priceMatch[0]);
        if (val && val > 50000) {
          priceText = priceMatch[0];
        }
      }
    }

    data.listPrice = parseCurrency(priceText);

    // Days on Redfin
    const daysMatch = allText.match(/(\d+)\s*days?\s*on\s*redfin/i);
    if (daysMatch) {
      data.daysOnMarket = parseInt(daysMatch[1], 10);
    } else {
      // Try "Listed X days ago"
      const listedMatch = allText.match(/listed\s*(\d+)\s*days?\s*ago/i);
      if (listedMatch) {
        data.daysOnMarket = parseInt(listedMatch[1], 10);
      }
    }

    // Property taxes - Redfin ALWAYS shows monthly, so always multiply by 12
    // Look for patterns like "Property Taxes $444" or "Property taxes$444"
    const taxMatch = allText.match(/property\s*tax(?:es)?\s*\$?([\d,]+)/i);
    if (taxMatch) {
      const monthlyTax = parseCurrency(taxMatch[1]);
      if (monthlyTax) {
        data.annualTaxes = monthlyTax * 12;
        console.log('OfferForge Redfin tax:', { raw: taxMatch[1], monthly: monthlyTax, annual: data.annualTaxes });
      }
    }

    // HOA - Redfin shows as "Association Fee: $335" or "HOA Dues $250"
    const hoaPatterns = [
      /association\s*fee[:\s]*\$\s*([\d,]+)/i, // Association Fee: $335
      /hoa\s*dues?\s*\$\s*([\d,]+)/i,          // HOA Dues $250
      /hoa\s*dues?\s*([\d,]+)/i,               // HOA Dues 250
      /hoa\s*\$\s*([\d,]+)/i,                  // HOA $250
      /hoa\s*fee[s]?\s*\$?\s*([\d,]+)/i        // HOA Fees $250
    ];

    for (const pattern of hoaPatterns) {
      const hoaMatch = allText.match(pattern);
      if (hoaMatch) {
        const hoaVal = parseCurrency(hoaMatch[1]);
        console.log('OfferForge HOA pattern match:', { pattern: pattern.toString(), raw: hoaMatch[0], value: hoaVal });
        if (hoaVal && hoaVal > 0 && hoaVal < 2000) { // Reasonable monthly HOA range
          data.monthlyHoa = hoaVal;
          console.log('OfferForge Redfin HOA found:', { monthly: hoaVal });
          break;
        }
      }
    }

    // Insurance - Redfin shows monthly
    const insuranceMatch = allText.match(/(?:home\s*)?insurance\s*\$?([\d,]+)/i);
    if (insuranceMatch) {
      const monthlyIns = parseCurrency(insuranceMatch[1]);
      if (monthlyIns && monthlyIns < 1000) {
        data.annualInsurance = monthlyIns * 12;
      }
    }

    return data;
  }

  // ===========================================
  // MAIN SCRAPER
  // ===========================================

  function scrapeListingData() {
    const site = detectSite();
    let scrapedData = {};

    switch (site) {
      case 'zillow':
        scrapedData = scrapeZillow();
        break;
      case 'redfin':
        scrapedData = scrapeRedfin();
        break;
      default:
        scrapedData = {};
    }

    console.log('OfferForge scraped data:', scrapedData, 'from site:', site);
    return { site, data: scrapedData };
  }

  // ===========================================
  // STATE & DEFAULTS
  // ===========================================

  // Base defaults (for low motivation sellers)
  const BASE_DEFAULTS = {
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
  };

  // Current state
  let state = { ...BASE_DEFAULTS };
  let currentSite = 'unknown';
  let hasScraped = false;

  // Estimate taxes/insurance based on price if not found
  function estimateMissingValues() {
    if (!state.annualTaxes && state.listPrice) {
      // Estimate ~1.2% of home value for property taxes
      state.annualTaxes = Math.round(state.listPrice * 0.012);
    }
    if (!state.annualInsurance && state.listPrice) {
      // Estimate ~0.5% of home value for insurance
      state.annualInsurance = Math.round(state.listPrice * 0.005);
    }
  }

  // Apply scraped data to state
  function applyScrapedData() {
    const { site, data } = scrapeListingData();
    currentSite = site;

    if (data.listPrice) state.listPrice = data.listPrice;
    if (data.daysOnMarket !== undefined && data.daysOnMarket !== null) {
      state.daysOnMarket = data.daysOnMarket;
    }
    if (data.annualTaxes) state.annualTaxes = data.annualTaxes;
    if (data.annualInsurance) state.annualInsurance = data.annualInsurance;
    if (data.monthlyHoa !== undefined) state.monthlyHoa = data.monthlyHoa || 0;

    estimateMissingValues();
    applyRecommendedTerms();
    hasScraped = true;
  }

  // Get motivation level and adjust defaults accordingly
  function getMotivationLevel(daysOnMarket) {
    if (daysOnMarket > 90) return 'very_high';
    if (daysOnMarket > 60) return 'high';
    if (daysOnMarket > 30) return 'moderate';
    return 'low';
  }

  // Get recommended terms based on seller motivation
  function getRecommendedTerms(motivation) {
    switch (motivation) {
      case 'very_high':
        return {
          offerPricePercent: 95,
          downPaymentPercent: 5,
          interestRate: 4,
          balloonYears: 7
        };
      case 'high':
        return {
          offerPricePercent: 97,
          downPaymentPercent: 7,
          interestRate: 4.5,
          balloonYears: 5
        };
      case 'moderate':
        return {
          offerPricePercent: 100,
          downPaymentPercent: 8,
          interestRate: 5,
          balloonYears: 5
        };
      default:
        return {
          offerPricePercent: 100,
          downPaymentPercent: 10,
          interestRate: 5.5,
          balloonYears: 5
        };
    }
  }

  function applyRecommendedTerms() {
    const motivation = getMotivationLevel(state.daysOnMarket);
    const recommended = getRecommendedTerms(motivation);
    state.offerPricePercent = recommended.offerPricePercent;
    state.downPaymentPercent = recommended.downPaymentPercent;
    state.interestRate = recommended.interestRate;
    state.balloonYears = recommended.balloonYears;
  }

  // ===========================================
  // CALCULATIONS
  // ===========================================

  function calculateMonthlyPI(principal, annualRate, termYears) {
    if (annualRate === 0) {
      return principal / (termYears * 12);
    }
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = termYears * 12;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  function calculateRemainingBalance(principal, annualRate, termYears, monthsElapsed) {
    if (annualRate === 0) {
      const monthlyPayment = principal / (termYears * 12);
      return principal - (monthlyPayment * monthsElapsed);
    }
    const monthlyRate = annualRate / 100 / 12;
    const monthlyPayment = calculateMonthlyPI(principal, annualRate, termYears);
    const remainingBalance = principal * Math.pow(1 + monthlyRate, monthsElapsed) -
      monthlyPayment * ((Math.pow(1 + monthlyRate, monthsElapsed) - 1) / monthlyRate);
    return Math.max(0, remainingBalance);
  }

  function calculateOffer() {
    const offerPrice = state.listPrice * (state.offerPricePercent / 100);
    const downPayment = offerPrice * (state.downPaymentPercent / 100);
    const loanAmount = offerPrice - downPayment;

    const monthlyPI = calculateMonthlyPI(loanAmount, state.interestRate, state.loanTermYears);
    const monthlyTaxes = state.annualTaxes / 12;
    const monthlyInsurance = state.annualInsurance / 12;
    const monthlyHoa = state.monthlyHoa;
    const totalPITI = monthlyPI + monthlyTaxes + monthlyInsurance + monthlyHoa;

    let balloonPayment = 0;
    if (state.balloonYears > 0) {
      const monthsUntilBalloon = state.balloonYears * 12;
      balloonPayment = calculateRemainingBalance(loanAmount, state.interestRate, state.loanTermYears, monthsUntilBalloon);
    }

    const traditionalCommission = state.listPrice * 0.06;
    const traditionalNet = state.listPrice - traditionalCommission;
    // Seller's net at close = down payment minus commission (commission comes out of down payment)
    const sellerNetAtClose = downPayment - traditionalCommission;

    const motivation = getMotivationLevel(state.daysOnMarket);
    let motivationDisplay = 'Low';
    let motivationColor = '#888';
    if (motivation === 'very_high') {
      motivationDisplay = 'Very High';
      motivationColor = '#e74c3c';
    } else if (motivation === 'high') {
      motivationDisplay = 'High';
      motivationColor = '#e67e22';
    } else if (motivation === 'moderate') {
      motivationDisplay = 'Moderate';
      motivationColor = '#f1c40f';
    }

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
      motivationDisplay,
      motivationColor
    };
  }

  // ===========================================
  // FORMATTING
  // ===========================================

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  function formatMonthly(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // ===========================================
  // COPY OFFER
  // ===========================================

  function generateOfferMessage() {
    const calc = calculateOffer();
    const balloonText = state.balloonYears > 0
      ? `with a balloon payment due in ${state.balloonYears} years`
      : 'with no balloon payment';

    return `Hi there,

I'm interested in the property listed at ${formatCurrency(state.listPrice)} and wanted to reach out about a potential seller financing arrangement.

Here's what I had in mind:

- Purchase Price: ${formatCurrency(calc.offerPrice)}
- Down Payment: ${formatCurrency(calc.downPayment)} (${state.downPaymentPercent}%)
- Interest Rate: ${state.interestRate}%
- Loan Term: ${state.loanTermYears} years ${balloonText}
- Monthly P&I: ${formatMonthly(calc.monthlyPI)}

The down payment would cover the typical commission costs, so the seller wouldn't have those out-of-pocket expenses at closing. Plus, they'd receive steady monthly income at ${state.interestRate}% interest, which is a nice return in today's environment.

I'm flexible on terms and happy to discuss what works best for the seller. Would they be open to exploring this option?

Thanks!`;
  }

  function copyOfferToClipboard() {
    const message = generateOfferMessage();
    navigator.clipboard.writeText(message).then(() => {
      const btn = document.querySelector('.offerforge-copy-btn');
      if (btn) {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy Offer to Clipboard';
          btn.classList.remove('copied');
        }, 2000);
      }
    });
  }

  // ===========================================
  // UI
  // ===========================================

  function getSiteDisplayName() {
    switch (currentSite) {
      case 'zillow': return 'Zillow';
      case 'redfin': return 'Redfin';
      default: return 'this page';
    }
  }

  function createModalHTML() {
    const calc = calculateOffer();
    const siteName = getSiteDisplayName();
    const dataSource = hasScraped
      ? `<span class="offerforge-data-source">Data from ${siteName}</span>`
      : '<span class="offerforge-data-source offerforge-manual">Manual entry</span>';

    return `
      <div class="offerforge-modal-content">
        <div class="offerforge-header">
          <h2>🔥 OfferForge</h2>
          <button class="offerforge-close">&times;</button>
        </div>

        <div class="offerforge-body">
          <!-- Property Details Section -->
          <div class="offerforge-section">
            <div class="offerforge-section-header">
              <h3>Property Details</h3>
              ${dataSource}
              <button class="offerforge-refresh-btn" title="Re-scan page for listing data">↻ Refresh</button>
            </div>
            <div class="offerforge-grid">
              <div class="offerforge-field">
                <label>List Price</label>
                <div class="offerforge-input-wrapper">
                  <span class="offerforge-prefix">$</span>
                  <input type="number" id="of-listPrice" value="${state.listPrice}" />
                </div>
              </div>
              <div class="offerforge-field">
                <label>Days on Market</label>
                <input type="number" id="of-daysOnMarket" value="${state.daysOnMarket}" />
                <span class="offerforge-motivation" style="color: ${calc.motivationColor}">
                  Seller Motivation: ${calc.motivationDisplay}
                </span>
              </div>
              <div class="offerforge-field">
                <label>Annual Property Taxes</label>
                <div class="offerforge-input-wrapper">
                  <span class="offerforge-prefix">$</span>
                  <input type="number" id="of-annualTaxes" value="${state.annualTaxes}" />
                </div>
              </div>
              <div class="offerforge-field">
                <label>Annual Insurance</label>
                <div class="offerforge-input-wrapper">
                  <span class="offerforge-prefix">$</span>
                  <input type="number" id="of-annualInsurance" value="${state.annualInsurance}" />
                </div>
              </div>
              <div class="offerforge-field">
                <label>Monthly HOA</label>
                <div class="offerforge-input-wrapper">
                  <span class="offerforge-prefix">$</span>
                  <input type="number" id="of-monthlyHoa" value="${state.monthlyHoa}" />
                </div>
              </div>
            </div>
          </div>

          <!-- Offer Terms Section -->
          <div class="offerforge-section">
            <h3>Offer Terms</h3>

            <div class="offerforge-slider-field">
              <div class="offerforge-slider-header">
                <label>Offer Price</label>
                <span class="offerforge-slider-value" id="of-display-offerPrice">${state.offerPricePercent}% (${formatCurrency(calc.offerPrice)})</span>
              </div>
              <input type="range" id="of-offerPricePercent" min="85" max="105" step="1" value="${state.offerPricePercent}" />
            </div>

            <div class="offerforge-slider-field">
              <div class="offerforge-slider-header">
                <label>Down Payment</label>
                <span class="offerforge-slider-value" id="of-display-downPayment">${state.downPaymentPercent}% (${formatCurrency(calc.downPayment)})</span>
              </div>
              <input type="range" id="of-downPaymentPercent" min="3" max="30" step="1" value="${state.downPaymentPercent}" />
            </div>

            <div class="offerforge-slider-field">
              <div class="offerforge-slider-header">
                <label>Interest Rate</label>
                <span class="offerforge-slider-value" id="of-display-interestRate">${state.interestRate}%</span>
              </div>
              <input type="range" id="of-interestRate" min="2" max="10" step="0.25" value="${state.interestRate}" />
            </div>

            <div class="offerforge-grid">
              <div class="offerforge-field">
                <label>Loan Term</label>
                <select id="of-loanTermYears">
                  <option value="15" ${state.loanTermYears === 15 ? 'selected' : ''}>15 years</option>
                  <option value="20" ${state.loanTermYears === 20 ? 'selected' : ''}>20 years</option>
                  <option value="25" ${state.loanTermYears === 25 ? 'selected' : ''}>25 years</option>
                  <option value="30" ${state.loanTermYears === 30 ? 'selected' : ''}>30 years</option>
                </select>
              </div>
              <div class="offerforge-field">
                <label>Balloon Due In</label>
                <select id="of-balloonYears">
                  <option value="0" ${state.balloonYears === 0 ? 'selected' : ''}>No balloon</option>
                  <option value="3" ${state.balloonYears === 3 ? 'selected' : ''}>3 years</option>
                  <option value="5" ${state.balloonYears === 5 ? 'selected' : ''}>5 years</option>
                  <option value="7" ${state.balloonYears === 7 ? 'selected' : ''}>7 years</option>
                  <option value="10" ${state.balloonYears === 10 ? 'selected' : ''}>10 years</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Results Section -->
          <div class="offerforge-section offerforge-results">
            <h3>Monthly Payment Breakdown</h3>
            <div class="offerforge-breakdown">
              <div class="offerforge-breakdown-row">
                <span>Principal & Interest</span>
                <span>${formatMonthly(calc.monthlyPI)}</span>
              </div>
              <div class="offerforge-breakdown-row">
                <span>Property Taxes</span>
                <span>${formatMonthly(calc.monthlyTaxes)}</span>
              </div>
              <div class="offerforge-breakdown-row">
                <span>Insurance</span>
                <span>${formatMonthly(calc.monthlyInsurance)}</span>
              </div>
              ${calc.monthlyHoa > 0 ? `
              <div class="offerforge-breakdown-row">
                <span>HOA</span>
                <span>${formatMonthly(calc.monthlyHoa)}</span>
              </div>
              ` : ''}
              <div class="offerforge-breakdown-row offerforge-total">
                <span>Total PITI</span>
                <span>${formatMonthly(calc.totalPITI)}</span>
              </div>
            </div>

            <h3>Offer Summary</h3>
            <div class="offerforge-summary">
              <div class="offerforge-summary-item">
                <span class="offerforge-summary-label">Offer Price</span>
                <span class="offerforge-summary-value">${formatCurrency(calc.offerPrice)}</span>
              </div>
              <div class="offerforge-summary-item">
                <span class="offerforge-summary-label">Down Payment</span>
                <span class="offerforge-summary-value">${formatCurrency(calc.downPayment)}</span>
              </div>
              <div class="offerforge-summary-item">
                <span class="offerforge-summary-label">Loan Amount</span>
                <span class="offerforge-summary-value">${formatCurrency(calc.loanAmount)}</span>
              </div>
              ${state.balloonYears > 0 ? `
              <div class="offerforge-summary-item offerforge-balloon">
                <span class="offerforge-summary-label">Balloon Due</span>
                <span class="offerforge-summary-value">${state.balloonYears} years</span>
              </div>
              <div class="offerforge-summary-item offerforge-balloon-amount">
                <span class="offerforge-summary-label">Balloon Payment Amount</span>
                <span class="offerforge-summary-value">${formatCurrency(calc.balloonPayment)}</span>
              </div>
              ` : ''}
            </div>

            <h3>Seller Comparison</h3>
            <div class="offerforge-comparison">
              <div class="offerforge-comparison-row">
                <span class="offerforge-tooltip" data-tooltip="If the seller accepts a traditional offer at list price, they'd pay ~6% in agent commissions (split between buyer's and seller's agents). This is what they'd actually net after those fees.">Traditional Sale (6% commission)</span>
                <span>Net: ${formatCurrency(calc.traditionalNet)}</span>
              </div>
              <div class="offerforge-comparison-row offerforge-highlight">
                <span class="offerforge-tooltip" data-tooltip="With seller financing, your down payment covers the agent commissions (~6%). This is what the seller actually nets at closing after paying the agents.">Your Offer (at close)</span>
                <span>Net: ${formatCurrency(calc.sellerNetAtClose)}</span>
              </div>
              <div class="offerforge-comparison-note">
                ${formatCurrency(calc.downPayment)} down − ${formatCurrency(calc.traditionalCommission)} commission = ${formatCurrency(calc.sellerNetAtClose)} net + ${formatMonthly(calc.monthlyPI)}/mo
              </div>
            </div>

            <button class="offerforge-copy-btn">Copy Offer to Clipboard</button>
          </div>
        </div>
      </div>
    `;
  }

  function updateModal() {
    const modal = document.getElementById('offerforge-modal');
    if (modal) {
      modal.innerHTML = createModalHTML();
      attachEventListeners();
    }
  }

  // Lightweight update for sliders - only updates display text, doesn't re-render inputs
  function updateDisplays() {
    const calc = calculateOffer();

    // Update slider display values
    const offerPriceDisplay = document.getElementById('of-display-offerPrice');
    if (offerPriceDisplay) {
      offerPriceDisplay.textContent = `${state.offerPricePercent}% (${formatCurrency(calc.offerPrice)})`;
    }

    const downPaymentDisplay = document.getElementById('of-display-downPayment');
    if (downPaymentDisplay) {
      downPaymentDisplay.textContent = `${state.downPaymentPercent}% (${formatCurrency(calc.downPayment)})`;
    }

    const interestRateDisplay = document.getElementById('of-display-interestRate');
    if (interestRateDisplay) {
      interestRateDisplay.textContent = `${state.interestRate}%`;
    }

    // Update motivation display
    const motivationDisplay = document.querySelector('.offerforge-motivation');
    if (motivationDisplay) {
      motivationDisplay.textContent = `Seller Motivation: ${calc.motivationDisplay}`;
      motivationDisplay.style.color = calc.motivationColor;
    }

    // Update results section by re-rendering just that part
    const resultsSection = document.querySelector('.offerforge-results');
    if (resultsSection) {
      resultsSection.innerHTML = createResultsHTML(calc);
      // Re-attach copy button listener
      const copyBtn = resultsSection.querySelector('.offerforge-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', copyOfferToClipboard);
      }
    }
  }

  // Create just the results HTML
  function createResultsHTML(calc) {
    return `
      <h3>Monthly Payment Breakdown</h3>
      <div class="offerforge-breakdown">
        <div class="offerforge-breakdown-row">
          <span>Principal & Interest</span>
          <span>${formatMonthly(calc.monthlyPI)}</span>
        </div>
        <div class="offerforge-breakdown-row">
          <span>Property Taxes</span>
          <span>${formatMonthly(calc.monthlyTaxes)}</span>
        </div>
        <div class="offerforge-breakdown-row">
          <span>Insurance</span>
          <span>${formatMonthly(calc.monthlyInsurance)}</span>
        </div>
        ${calc.monthlyHoa > 0 ? `
        <div class="offerforge-breakdown-row">
          <span>HOA</span>
          <span>${formatMonthly(calc.monthlyHoa)}</span>
        </div>
        ` : ''}
        <div class="offerforge-breakdown-row offerforge-total">
          <span>Total PITI</span>
          <span>${formatMonthly(calc.totalPITI)}</span>
        </div>
      </div>

      <h3>Offer Summary</h3>
      <div class="offerforge-summary">
        <div class="offerforge-summary-item">
          <span class="offerforge-summary-label">Offer Price</span>
          <span class="offerforge-summary-value">${formatCurrency(calc.offerPrice)}</span>
        </div>
        <div class="offerforge-summary-item">
          <span class="offerforge-summary-label">Down Payment</span>
          <span class="offerforge-summary-value">${formatCurrency(calc.downPayment)}</span>
        </div>
        <div class="offerforge-summary-item">
          <span class="offerforge-summary-label">Loan Amount</span>
          <span class="offerforge-summary-value">${formatCurrency(calc.loanAmount)}</span>
        </div>
        ${state.balloonYears > 0 ? `
        <div class="offerforge-summary-item offerforge-balloon">
          <span class="offerforge-summary-label">Balloon Due</span>
          <span class="offerforge-summary-value">${state.balloonYears} years</span>
        </div>
        <div class="offerforge-summary-item offerforge-balloon-amount">
          <span class="offerforge-summary-label">Balloon Payment Amount</span>
          <span class="offerforge-summary-value">${formatCurrency(calc.balloonPayment)}</span>
        </div>
        ` : ''}
      </div>

      <h3>Seller Comparison</h3>
      <div class="offerforge-comparison">
        <div class="offerforge-comparison-row">
          <span class="offerforge-tooltip" data-tooltip="If the seller accepts a traditional offer at list price, they'd pay ~6% in agent commissions (split between buyer's and seller's agents). This is what they'd actually net after those fees.">Traditional Sale (6% commission)</span>
          <span>Net: ${formatCurrency(calc.traditionalNet)}</span>
        </div>
        <div class="offerforge-comparison-row offerforge-highlight">
          <span class="offerforge-tooltip" data-tooltip="With seller financing, your down payment covers the agent commissions (~6%). This is what the seller actually nets at closing after paying the agents.">Your Offer (at close)</span>
          <span>Net: ${formatCurrency(calc.sellerNetAtClose)}</span>
        </div>
        <div class="offerforge-comparison-note">
          ${formatCurrency(calc.downPayment)} down − ${formatCurrency(calc.traditionalCommission)} commission = ${formatCurrency(calc.sellerNetAtClose)} net + ${formatMonthly(calc.monthlyPI)}/mo
        </div>
      </div>

      <button class="offerforge-copy-btn">Copy Offer to Clipboard</button>
    `;
  }

  function attachEventListeners() {
    const modal = document.getElementById('offerforge-modal');

    // Close button
    modal.querySelector('.offerforge-close').addEventListener('click', () => {
      modal.classList.remove('offerforge-visible');
    });

    // Refresh button
    const refreshBtn = modal.querySelector('.offerforge-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        applyScrapedData();
        updateModal();
      });
    }

    // Copy button
    const copyBtn = modal.querySelector('.offerforge-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', copyOfferToClipboard);
    }

    // Property detail inputs - use 'input' for real-time display updates, 'change' for full re-render
    const propertyInputs = [
      { id: 'of-listPrice', key: 'listPrice' },
      { id: 'of-annualTaxes', key: 'annualTaxes' },
      { id: 'of-annualInsurance', key: 'annualInsurance' },
      { id: 'of-monthlyHoa', key: 'monthlyHoa' }
    ];

    propertyInputs.forEach(({ id, key }) => {
      const element = document.getElementById(id);
      if (element) {
        // Real-time display updates as user types (doesn't re-render inputs)
        element.addEventListener('input', (e) => {
          const value = parseInt(e.target.value, 10);
          if (!isNaN(value)) {
            state[key] = value;
            updateDisplays();
          }
        });
      }
    });

    // Select dropdowns - use 'change' event and full re-render
    const selectInputs = [
      { id: 'of-loanTermYears', key: 'loanTermYears' },
      { id: 'of-balloonYears', key: 'balloonYears' }
    ];

    selectInputs.forEach(({ id, key }) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', (e) => {
          const value = parseInt(e.target.value, 10);
          if (!isNaN(value)) {
            state[key] = value;
            updateModal();
          }
        });
      }
    });

    // Sliders - use 'input' event for real-time feedback
    const sliderInputs = [
      { id: 'of-offerPricePercent', key: 'offerPricePercent', type: 'number' },
      { id: 'of-downPaymentPercent', key: 'downPaymentPercent', type: 'number' },
      { id: 'of-interestRate', key: 'interestRate', type: 'float' }
    ];

    sliderInputs.forEach(({ id, key, type }) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('input', (e) => {
          const value = type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
          if (!isNaN(value)) {
            state[key] = value;
            updateDisplays();  // Use lightweight update for sliders
          }
        });
      }
    });

    // Days on market - input for real-time display, change to apply recommended terms
    const daysInput = document.getElementById('of-daysOnMarket');
    if (daysInput) {
      // Real-time motivation display update
      daysInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
          state.daysOnMarket = value;
          updateDisplays();
        }
      });
      // Apply recommended terms when user finishes editing
      daysInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
          state.daysOnMarket = value;
          applyRecommendedTerms();
          updateModal();
        }
      });
    }
  }

  // ===========================================
  // INITIALIZATION
  // ===========================================

  // Only show button on listing pages (URLs with zip codes)
  if (!isListingPage()) {
    console.log('OfferForge: Not a listing page, button hidden. Site:', detectSite(), 'URL:', window.location.href);
    return; // Exit early, don't inject anything
  }

  // Create the floating button
  const button = document.createElement('div');
  button.id = 'offerforge-button';
  button.innerHTML = '🔥';
  button.title = 'OfferForge - Seller Finance Calculator';
  document.body.appendChild(button);

  // Create the modal container
  const modal = document.createElement('div');
  modal.id = 'offerforge-modal';
  document.body.appendChild(modal);

  // Toggle modal when button is clicked
  button.addEventListener('click', () => {
    // Scrape data on first open
    if (!hasScraped) {
      applyScrapedData();
    }
    modal.innerHTML = createModalHTML();
    attachEventListeners();
    modal.classList.toggle('offerforge-visible');
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('offerforge-visible');
    }
  });

  console.log('OfferForge loaded on listing page! Site:', detectSite());
})();

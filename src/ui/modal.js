// OfferForge Modal HTML Generation
window.OfferForge = window.OfferForge || {};
OfferForge.ui = OfferForge.ui || {};

OfferForge.ui.modal = {
  // Create the appraisal indicator HTML
  createAppraisalHTML(state) {
    const { formatCurrency } = OfferForge.utils;
    const appraisal = OfferForge.calculations.calculateAppraisalRisk(state.listPrice, state.estimate);

    if (!appraisal) {
      return ''; // No estimate available
    }

    const diffSign = appraisal.difference >= 0 ? '+' : '';
    const diffText = `${diffSign}${appraisal.percentDiff}%`;

    return `
      <div class="offerforge-section offerforge-appraisal">
        <div class="offerforge-appraisal-card offerforge-appraisal-${appraisal.risk}">
          <div class="offerforge-appraisal-header">
            <span class="offerforge-appraisal-icon">${appraisal.icon}</span>
            <span class="offerforge-appraisal-status" style="color: ${appraisal.color}">${appraisal.status}</span>
          </div>
          <div class="offerforge-appraisal-details">
            <div class="offerforge-appraisal-row">
              <span>List Price</span>
              <span>${formatCurrency(state.listPrice)}</span>
            </div>
            <div class="offerforge-appraisal-row">
              <span>${state.estimateSource || 'Estimate'}</span>
              <span>${formatCurrency(state.estimate)}</span>
            </div>
            <div class="offerforge-appraisal-row offerforge-appraisal-diff" style="color: ${appraisal.color}">
              <span>Difference</span>
              <span>${diffText} (${formatCurrency(Math.abs(appraisal.difference))})</span>
            </div>
          </div>
          <div class="offerforge-appraisal-note">
            ${appraisal.risk === 'high' ? 'Properties listed >20% above estimate often fail to appraise at contract price.' :
              appraisal.risk === 'moderate' ? 'This property may face appraisal challenges. Consider negotiating.' :
              appraisal.risk === 'low' ? 'Slight premium over estimate, but should appraise.' :
              'Listed at or below estimate - appraisal should not be an issue.'}
          </div>
        </div>
      </div>
    `;
  },

  // Create the results section HTML
  createResultsHTML(calc, state) {
    const { formatCurrency, formatMonthly } = OfferForge.utils;

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
  },

  // Create the full modal HTML
  createModalHTML(state, currentSite, hasScraped) {
    const { formatCurrency } = OfferForge.utils;
    const calc = OfferForge.calculations.calculateOffer(state);
    const siteName = OfferForge.utils.getSiteDisplayName(currentSite);

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
                  Seller Motivation: ${calc.motivationText}
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

          <!-- Appraisal Risk Indicator -->
          ${this.createAppraisalHTML(state)}

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
            ${this.createResultsHTML(calc, state)}
          </div>
        </div>
      </div>
    `;
  }
};

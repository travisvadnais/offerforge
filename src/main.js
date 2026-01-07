// OfferForge Main Entry Point
(function() {
  'use strict';

  const { config, utils, calculations, scrapers, ui } = OfferForge;

  // ===========================================
  // STATE MANAGEMENT
  // ===========================================

  let state = { ...config.BASE_DEFAULTS };
  let currentSite = 'unknown';
  let hasScraped = false;

  // Estimate taxes/insurance based on price if not found
  function estimateMissingValues() {
    if (!state.annualTaxes && state.listPrice) {
      state.annualTaxes = Math.round(state.listPrice * config.TAX_ESTIMATE_RATE);
    }
    if (!state.annualInsurance && state.listPrice) {
      state.annualInsurance = Math.round(state.listPrice * config.INSURANCE_ESTIMATE_RATE);
    }
  }

  // Apply recommended terms based on motivation
  function applyRecommendedTerms() {
    const motivation = calculations.getMotivationLevel(state.daysOnMarket);
    const recommended = calculations.getRecommendedTerms(motivation);
    state.offerPricePercent = recommended.offerPricePercent;
    state.downPaymentPercent = recommended.downPaymentPercent;
    state.interestRate = recommended.interestRate;
    state.balloonYears = recommended.balloonYears;
  }

  // Apply scraped data to state
  function applyScrapedData() {
    const { site, data } = scrapers.scrapeListingData();
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

  // ===========================================
  // MODAL MANAGEMENT
  // ===========================================

  function updateModal() {
    const modal = document.getElementById('offerforge-modal');
    if (modal) {
      modal.innerHTML = ui.modal.createModalHTML(state, currentSite, hasScraped);
      ui.events.attachEventListeners(state, {
        onRefresh: () => {
          applyScrapedData();
          updateModal();
        },
        onUpdateModal: updateModal
      });
    }
  }

  // ===========================================
  // INITIALIZATION
  // ===========================================

  // Only show button on listing pages
  if (!utils.isListingPage()) {
    console.log('OfferForge: Not a listing page, button hidden. Site:', utils.detectSite(), 'URL:', window.location.href);
    return;
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
    modal.innerHTML = ui.modal.createModalHTML(state, currentSite, hasScraped);
    ui.events.attachEventListeners(state, {
      onRefresh: () => {
        applyScrapedData();
        updateModal();
      },
      onUpdateModal: updateModal
    });
    modal.classList.toggle('offerforge-visible');
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('offerforge-visible');
    }
  });

  console.log('OfferForge loaded on listing page! Site:', utils.detectSite());
})();

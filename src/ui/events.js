// OfferForge Event Handlers
window.OfferForge = window.OfferForge || {};
OfferForge.ui = OfferForge.ui || {};

OfferForge.ui.events = {
  // Lightweight update for real-time feedback (doesn't re-render inputs)
  updateDisplays(state) {
    const { formatCurrency } = OfferForge.utils;
    const calc = OfferForge.calculations.calculateOffer(state);

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
      motivationDisplay.textContent = `Seller Motivation: ${calc.motivationText}`;
      motivationDisplay.style.color = calc.motivationColor;
    }

    // Update results section
    const resultsSection = document.querySelector('.offerforge-results');
    if (resultsSection) {
      resultsSection.innerHTML = OfferForge.ui.modal.createResultsHTML(calc, state);
      // Re-attach copy button listener
      const copyBtn = resultsSection.querySelector('.offerforge-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          OfferForge.ui.clipboard.copyOfferToClipboard(state);
        });
      }
    }
  },

  // Attach all event listeners to the modal
  attachEventListeners(state, callbacks) {
    const modal = document.getElementById('offerforge-modal');
    if (!modal) return;

    const { onRefresh, onUpdateModal } = callbacks;

    // Close button
    modal.querySelector('.offerforge-close').addEventListener('click', () => {
      modal.classList.remove('offerforge-visible');
    });

    // Refresh button
    const refreshBtn = modal.querySelector('.offerforge-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', onRefresh);
    }

    // Copy button
    const copyBtn = modal.querySelector('.offerforge-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        OfferForge.ui.clipboard.copyOfferToClipboard(state);
      });
    }

    // Property detail inputs - real-time display updates
    const propertyInputs = [
      { id: 'of-listPrice', key: 'listPrice' },
      { id: 'of-annualTaxes', key: 'annualTaxes' },
      { id: 'of-annualInsurance', key: 'annualInsurance' },
      { id: 'of-monthlyHoa', key: 'monthlyHoa' }
    ];

    propertyInputs.forEach(({ id, key }) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('input', (e) => {
          const value = parseInt(e.target.value, 10);
          if (!isNaN(value)) {
            state[key] = value;
            this.updateDisplays(state);
          }
        });
      }
    });

    // Select dropdowns - full re-render on change
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
            onUpdateModal();
          }
        });
      }
    });

    // Sliders - lightweight updates
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
            this.updateDisplays(state);
          }
        });
      }
    });

    // Days on market - special handling
    const daysInput = document.getElementById('of-daysOnMarket');
    if (daysInput) {
      // Real-time motivation display update
      daysInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
          state.daysOnMarket = value;
          this.updateDisplays(state);
        }
      });

      // Apply recommended terms when user finishes editing
      daysInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
          state.daysOnMarket = value;
          // Apply recommended terms
          const motivation = OfferForge.calculations.getMotivationLevel(value);
          const recommended = OfferForge.calculations.getRecommendedTerms(motivation);
          state.offerPricePercent = recommended.offerPricePercent;
          state.downPaymentPercent = recommended.downPaymentPercent;
          state.interestRate = recommended.interestRate;
          state.balloonYears = recommended.balloonYears;
          onUpdateModal();
        }
      });
    }
  }
};

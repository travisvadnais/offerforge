// OfferForge Clipboard Functions
window.OfferForge = window.OfferForge || {};
OfferForge.ui = OfferForge.ui || {};

OfferForge.ui.clipboard = {
  // Generate the offer message text
  generateOfferMessage(state) {
    const { formatCurrency, formatMonthly } = OfferForge.utils;
    const calc = OfferForge.calculations.calculateOffer(state);

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
  },

  // Copy offer to clipboard and show feedback
  copyOfferToClipboard(state) {
    const message = this.generateOfferMessage(state);

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
};

// OfferForge Utility Functions
window.OfferForge = window.OfferForge || {};

OfferForge.utils = {
  // Parse currency string to number
  parseCurrency(str) {
    if (!str) return null;
    const cleaned = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  },

  // Format number as currency (no decimals)
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  // Format number as currency with decimals (for monthly amounts)
  formatMonthly(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  },

  // Get text content from first matching selector
  getTextFromSelectors(selectors) {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        return el.textContent || el.innerText;
      }
    }
    return null;
  },

  // Detect which real estate site we're on
  detectSite() {
    const hostname = window.location.hostname;
    if (hostname.includes('zillow.com')) return 'zillow';
    if (hostname.includes('redfin.com')) return 'redfin';
    return 'unknown';
  },

  // Check if we're on a listing detail page
  isListingPage() {
    const site = this.detectSite();
    if (site === 'unknown') return false;

    const url = window.location.href;

    if (site === 'zillow') {
      // Zillow listing URLs contain /homedetails/ and end with _zpid
      const isListing = url.includes('/homedetails/') || url.includes('_zpid');
      console.log('OfferForge Zillow check:', { url, isListing });
      return isListing;
    }

    if (site === 'redfin') {
      // Redfin listing URLs contain /home/ followed by digits
      const isListing = /\/home\/\d+/.test(url);
      console.log('OfferForge Redfin check:', { url, isListing });
      return isListing;
    }

    return false;
  },

  // Get display name for current site
  getSiteDisplayName(site) {
    switch (site) {
      case 'zillow': return 'Zillow';
      case 'redfin': return 'Redfin';
      default: return 'this page';
    }
  }
};

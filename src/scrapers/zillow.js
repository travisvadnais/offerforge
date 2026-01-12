// OfferForge Zillow Scraper
window.OfferForge = window.OfferForge || {};
OfferForge.scrapers = OfferForge.scrapers || {};

OfferForge.scrapers.zillow = {
  scrape() {
    const { parseCurrency, getTextFromSelectors } = OfferForge.utils;
    const data = {};
    const allText = document.body.innerText || '';

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
    const hoaPatterns = [
      /\$([\d,]+)\/mo\s*hoa/i,                 // $368/mo HOA
      /hoa[:\s]*\$([\d,]+)/i,                  // HOA: $368 or HOA $368
      /hoa[:\s]*([\d,]+)\s*\/?\s*(?:mo|month)/i // HOA: 368/mo
    ];

    for (const pattern of hoaPatterns) {
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

    // Zestimate - Zillow's property value estimate
    // Format: "$380,800 Zestimate®" or "$380,800Zestimate"
    const zestimatePatterns = [
      /\$([\d,]+)\s*Zestimate/i,
      /Zestimate[®:\s]*\$([\d,]+)/i
    ];

    for (const pattern of zestimatePatterns) {
      const zestMatch = allText.match(pattern);
      if (zestMatch) {
        const zestVal = parseCurrency(zestMatch[1]);
        if (zestVal && zestVal > 50000 && zestVal < 50000000) {
          data.estimate = zestVal;
          data.estimateSource = 'Zestimate';
          console.log('OfferForge Zestimate found:', zestVal);
          break;
        }
      }
    }

    return data;
  }
};

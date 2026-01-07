// OfferForge Redfin Scraper
window.OfferForge = window.OfferForge || {};
OfferForge.scrapers = OfferForge.scrapers || {};

OfferForge.scrapers.redfin = {
  scrape() {
    const { parseCurrency, getTextFromSelectors } = OfferForge.utils;
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
        if (hoaVal && hoaVal > 0 && hoaVal < 2000) {
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
};

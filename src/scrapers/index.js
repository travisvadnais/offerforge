// OfferForge Scraper Dispatcher
window.OfferForge = window.OfferForge || {};
OfferForge.scrapers = OfferForge.scrapers || {};

OfferForge.scrapers.scrapeListingData = function() {
  const site = OfferForge.utils.detectSite();
  let scrapedData = {};

  switch (site) {
    case 'zillow':
      scrapedData = OfferForge.scrapers.zillow.scrape();
      break;
    case 'redfin':
      scrapedData = OfferForge.scrapers.redfin.scrape();
      break;
    default:
      scrapedData = {};
  }

  console.log('OfferForge scraped data:', scrapedData, 'from site:', site);
  return { site, data: scrapedData };
};

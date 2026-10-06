import type { AssetType } from '../types';

export const fetchStockPriceAndName = async (ticker: string, fallbackName?: string) => {
  if (!ticker) return { price: null, name: fallbackName || '', currency: 'PLN', type: 'stock' };
  
  try {
    const cleanTicker = ticker.trim().toUpperCase();
    
    // Niezawodne proxy AllOrigins omijające błędy CORS bez konfiguracji serwera
    const targetUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${cleanTicker}`;
    const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const quote = data?.quoteResponse?.result?.[0];
      
      if (quote) {
        return {
          price: quote.regularMarketPrice || null,
          name: quote.longName || quote.shortName || fallbackName || cleanTicker,
          currency: quote.currency || 'PLN',
          type: (quote.quoteType === 'ETF' ? 'etf' : 'stock') as AssetType,
        };
      }
    }
  } catch (err) {
    console.error('Błąd pobierania z Yahoo API:', err);
  }
  
  return { price: null, name: fallbackName || ticker, currency: 'PLN', type: 'stock' };
};

export const fetchNbpRates = async () => {
  try {
    const resUsd = await fetch('https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json');
    const dataUsd = await resUsd.json();
    const resEur = await fetch('https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json');
    const dataEur = await resEur.json();

    return {
      usd: dataUsd?.rates?.[0]?.mid || 3.88,
      eur: dataEur?.rates?.[0]?.mid || 4.28,
    };
  } catch (err) {
    console.error('Błąd pobierania kursów NBP:', err);
    return { usd: 3.88, eur: 4.28 };
  }
};
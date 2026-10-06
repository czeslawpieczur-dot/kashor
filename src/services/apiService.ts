import type { AssetType } from '../types';

export const fetchStockPriceAndName = async (ticker: string, fallbackName?: string) => {
  if (!ticker) return { price: null, name: fallbackName || '', currency: 'PLN', type: 'stock' as AssetType };

  try {
    const cleanTicker = ticker.trim().toUpperCase();

    // v8/chart jest znacznie bardziej niezawodne niż v7/quote
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}?interval=1d&range=1d`;
    const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      const meta = result?.meta;

      if (meta && meta.regularMarketPrice != null) {
        let type: AssetType = 'stock';
        if (meta.instrumentType === 'ETF') type = 'etf';
        if (meta.instrumentType === 'CRYPTOCURRENCY' || cleanTicker.includes('-USD')) type = 'crypto';
        if (meta.instrumentType === 'FUTURE' || cleanTicker.includes('=F')) type = 'commodity';

        return {
          price: meta.regularMarketPrice,
          name: meta.shortName || meta.longName || fallbackName || cleanTicker,
          currency: meta.currency || 'PLN',
          type,
        };
      }
    }
  } catch (err) {
    console.error('Błąd pobierania z Yahoo API:', err);
  }

  return { price: null, name: fallbackName || ticker, currency: 'PLN', type: 'stock' as AssetType };
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
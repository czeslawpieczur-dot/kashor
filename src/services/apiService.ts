import { getMetaBySymbol } from './knownCompanies';

export const fetchStockPriceAndName = async (symbol: string, userCustomName?: string) => {
  const cleanSymbol = symbol.trim().toUpperCase();
  const meta = getMetaBySymbol(cleanSymbol);

  try {
    const response = await fetch(
      `https://corsproxy.io/?${encodeURIComponent(
        `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?interval=1d&range=1d`
      )}`
    );

    if (response.ok) {
      const data = await response.json();
      const chartMeta = data?.chart?.result?.[0]?.meta;

      const price = chartMeta?.regularMarketPrice;
      const fetchedName = chartMeta?.shortName || chartMeta?.longName;
      let detectedCurrency = chartMeta?.currency || meta?.currency || (cleanSymbol.endsWith('.WA') ? 'PLN' : 'USD');
      if (detectedCurrency === 'GBp') detectedCurrency = 'GBP';

      const finalName = userCustomName || meta?.name || fetchedName || cleanSymbol;

      return {
        price: price ? parseFloat(price) : null,
        name: finalName,
        currency: detectedCurrency,
        type: meta?.type || 'stock',
      };
    }
  } catch (error) {
    console.error('Błąd pobierania danych kursu:', error);
  }

  return {
    price: null,
    name: userCustomName || meta?.name || cleanSymbol,
    currency: meta?.currency || (cleanSymbol.endsWith('.WA') ? 'PLN' : 'USD'),
    type: meta?.type || 'stock',
  };
};

export const fetchNbpRates = async () => {
  let usd = 3.88;
  let eur = 4.28;

  try {
    const usdRes = await fetch('https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json');
    const usdData = await usdRes.json();
    if (usdData?.rates?.[0]?.mid) usd = usdData.rates[0].mid;

    const eurRes = await fetch('https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json');
    const eurData = await eurRes.json();
    if (eurData?.rates?.[0]?.mid) eur = eurData.rates[0].mid;
  } catch (error) {
    console.error('Błąd NBP:', error);
  }

  return { usd, eur };
};

export const fetchNbpHistoricalRate = async (currency: string, dateStr: string): Promise<number | null> => {
  if (currency === 'PLN') return 1;
  const curr = currency.toLowerCase();
  
  try {
    // Zapytanie o kurs z konkretnego dnia
    const res = await fetch(`https://api.nbp.pl/api/exchangerates/rates/a/${curr}/${dateStr}/?format=json`);
    if (res.ok) {
      const data = await res.json();
      return data?.rates?.[0]?.mid || null;
    }
    
    // Jeśli weekend/święto – pobieramy tabelę z ostatnich 10 dni przed tą datą
    const fallbackRes = await fetch(`https://api.nbp.pl/api/exchangerates/rates/a/${curr}/last/10/?format=json`);
    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      const rates = fallbackData?.rates || [];
      const match = rates.filter((r: any) => r.effectiveDate <= dateStr).pop();
      return match ? match.mid : rates[0]?.mid || null;
    }
  } catch (err) {
    console.error('Błąd pobierania kursu historycznego NBP:', err);
  }
  return null;
};
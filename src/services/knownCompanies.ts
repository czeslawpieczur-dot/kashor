import { GLOBAL_DATABASE } from '../data/globalBaza';
import type { AssetMeta } from '../data/globalBaza';
import type { TickerSuggestion } from '../types';

export const searchGlobalBaza = async (query: string): Promise<TickerSuggestion[]> => {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  // 1. Dopasowanie lokalne
  const localMatches: TickerSuggestion[] = GLOBAL_DATABASE.filter(
    item =>
      item.symbol.toLowerCase().includes(cleanQuery) ||
      item.name.toLowerCase().includes(cleanQuery)
  ).map(item => ({
    symbol: item.symbol,
    name: item.name,
    type: item.type,
    currency: item.currency,
    exchDisp: item.symbol.endsWith('.WA') ? 'GPW' : item.type.toUpperCase(),
  }));

  // 2. Wyszukiwanie sieciowe
  try {
    const searchUrl = `https://corsproxy.io/?${encodeURIComponent(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${cleanQuery}&quotesCount=10&newsCount=0`
    )}`;
    
    const apiRes = await fetch(searchUrl);
    if (apiRes.ok) {
      const data = await apiRes.json();
      const quotes = data?.quotes || [];

      const apiResults: TickerSuggestion[] = quotes
        .filter((q: any) => q.symbol && (q.shortname || q.longname))
        .map((q: any) => {
          const sym = q.symbol.toUpperCase();
          const name = q.longname || q.shortname || sym;
          const isPL = sym.endsWith('.WA');
          
          let type: 'stock' | 'etf' | 'commodity' | 'crypto' = 'stock';
          if (q.quoteType === 'ETF') type = 'etf';
          if (q.quoteType === 'CRYPTOCURRENCY' || sym.includes('-USD')) type = 'crypto';

          return {
            symbol: sym,
            name: name,
            type: type,
            currency: isPL ? 'PLN' : 'USD',
            exchDisp: isPL ? 'GPW' : (q.exchDisp || 'ZAGRANICA'),
          };
        });

      const combined = [...localMatches];
      for (const item of apiResults) {
        if (!combined.some(c => c.symbol === item.symbol)) {
          combined.push(item);
        }
      }
      return combined.slice(0, 10);
    }
  } catch (err) {
    console.error('Błąd wyszukiwania API:', err);
  }

  return localMatches.slice(0, 10);
};

export const getMetaBySymbol = (symbol: string): AssetMeta | undefined => {
  const clean = symbol.trim().toUpperCase();
  return GLOBAL_DATABASE.find(item => item.symbol.toUpperCase() === clean);
};
import type { TickerSuggestion, AssetType } from '../types';

export interface AssetMeta {
  symbol: string;
  name: string;
  type: AssetType;
  currency: string;
}

export const GLOBAL_DATABASE: AssetMeta[] = [
  { symbol: 'CDR.WA', name: 'CD Projekt S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'PKO.WA', name: 'PKO Bank Polski', type: 'stock', currency: 'PLN' },
  { symbol: 'PEO.WA', name: 'Bank Pekao S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'KGH.WA', name: 'KGHM Polska Miedź', type: 'stock', currency: 'PLN' },
  { symbol: 'PKN.WA', name: 'ORLEN S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'DNP.WA', name: 'Dino Polska S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'LPP.WA', name: 'LPP S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'ALE.WA', name: 'Allegro.eu S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'PZU.WA', name: 'PZU S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'SPL.WA', name: 'Santander Bank Polska', type: 'stock', currency: 'PLN' },
  { symbol: 'KRU.WA', name: 'KRUK S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'XTB.WA', name: 'XTB S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'CPS.WA', name: 'Cyfrowy Polsat S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'PGE.WA', name: 'PGE Polska Grupa Energetyczna', type: 'stock', currency: 'PLN' },
  { symbol: 'SNT.WA', name: 'Synektik S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'ATR.WA', name: 'Atrem S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'WTC.WA', name: 'Wirtualna Polska Holding', type: 'stock', currency: 'PLN' },
  { symbol: 'DOM.WA', name: 'Dom Development S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'S2B.WA', name: 'Software Incentive Group', type: 'stock', currency: 'PLN' },
  { symbol: 'ABE.WA', name: 'AB S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'TPE.WA', name: 'Tauron Polska Energia', type: 'stock', currency: 'PLN' },
  { symbol: 'ALR.WA', name: 'Alior Bank S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'BHW.WA', name: 'Bank Handlowy', type: 'stock', currency: 'PLN' },
  { symbol: 'MBK.WA', name: 'mBank S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'CCC.WA', name: 'CCC S.A.', type: 'stock', currency: 'PLN' },
  { symbol: 'TEN.WA', name: 'Ten Square Games', type: 'stock', currency: 'PLN' },
  { symbol: '11B.WA', name: '11 bit studios', type: 'stock', currency: 'PLN' },

  { symbol: 'ETFBM40TR.WA', name: 'Beta ETF mWIG40TR', type: 'etf', currency: 'PLN' },
  { symbol: 'ETFBS80TR.WA', name: 'Beta ETF sWIG80TR', type: 'etf', currency: 'PLN' },
  { symbol: 'ETFBW20TR.WA', name: 'Beta ETF WIG20TR', type: 'etf', currency: 'PLN' },
  { symbol: 'ETFBSPX.WA', name: 'Beta ETF S&P 500 PLN-Hedged', type: 'etf', currency: 'PLN' },
  { symbol: 'ETFNDX.WA', name: 'Beta ETF Nasdaq-100 PLN-Hedged', type: 'etf', currency: 'PLN' },
  { symbol: 'IWDA.UK', name: 'iShares Core MSCI World UCITS ETF', type: 'etf', currency: 'USD' },
  { symbol: 'VWCE.DE', name: 'Vanguard FTSE All-World UCITS ETF', type: 'etf', currency: 'EUR' },
  { symbol: 'EUNL.DE', name: 'iShares Core MSCI World EUR', type: 'etf', currency: 'EUR' },
  { symbol: 'SWRD.L', name: 'SPDR MSCI World UCITS ETF', type: 'etf', currency: 'USD' },

  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', currency: 'USD' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', currency: 'USD' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', currency: 'USD' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', currency: 'USD' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', type: 'stock', currency: 'USD' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', currency: 'USD' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', currency: 'USD' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'stock', currency: 'USD' },
  { symbol: 'INTC', name: 'Intel Corporation', type: 'stock', currency: 'USD' },
  { symbol: 'PLTR', name: 'Palantir Technologies', type: 'stock', currency: 'USD' },

  { symbol: 'BTC-USD', name: 'Bitcoin', type: 'crypto', currency: 'USD' },
  { symbol: 'ETH-USD', name: 'Ethereum', type: 'crypto', currency: 'USD' },
  { symbol: 'SOL-USD', name: 'Solana', type: 'crypto', currency: 'USD' },
  { symbol: 'GC=F', name: 'Złoto (Gold Futures)', type: 'commodity', currency: 'USD' },
  { symbol: 'SI=F', name: 'Srebro (Silver Futures)', type: 'commodity', currency: 'USD' },
  { symbol: 'CL=F', name: 'Ropa Naftowa Crude Oil', type: 'commodity', currency: 'USD' },
];

export const searchGlobalBaza = async (query: string): Promise<TickerSuggestion[]> => {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

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

  // Wyszukiwanie sieciowe przez darmowe proxy AllOrigins
  try {
    const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${cleanQuery}&quotesCount=10&newsCount=0`;
    const searchUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    
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
          
          let type: AssetType = 'stock';
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
  if (!symbol) return undefined;
  const clean = symbol.trim().toUpperCase()
    .replace(/\.PL$/, '.WA')
    .replace(/\.US$/, '');

  const rawSymbol = clean.replace(/\.WA$/, '').replace(/\.DE$/, '').replace(/\.UK$/, '').replace(/\.L$/, '');

  return GLOBAL_DATABASE.find(item => {
    const itemSym = item.symbol.toUpperCase();
    const itemRaw = itemSym
      .replace(/\.WA$/, '')
      .replace(/\.DE$/, '')
      .replace(/\.UK$/, '')
      .replace(/\.L$/, '')
      .replace(/\.US$/, '');
    return itemSym === clean || itemRaw === rawSymbol || itemSym === symbol.trim().toUpperCase();
  });
};
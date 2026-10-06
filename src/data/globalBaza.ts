export interface AssetMeta {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'commodity' | 'crypto';
  currency: 'PLN' | 'USD' | 'EUR';
}

export const GLOBAL_DATABASE: AssetMeta[] = [
  // GPW - Polska
  { symbol: 'CDR.WA', name: 'CD Projekt SA', type: 'stock', currency: 'PLN' },
  { symbol: 'PKO.WA', name: 'PKO Bank Polski', type: 'stock', currency: 'PLN' },
  { symbol: 'PEO.WA', name: 'Bank Pekao SA', type: 'stock', currency: 'PLN' },
  { symbol: 'KGH.WA', name: 'KGHM Polska Miedź SA', type: 'stock', currency: 'PLN' },
  { symbol: 'PKN.WA', name: 'ORLEN SA', type: 'stock', currency: 'PLN' },
  { symbol: 'DNP.WA', name: 'Dino Polska SA', type: 'stock', currency: 'PLN' },
  { symbol: 'LPP.WA', name: 'LPP SA (Reserved)', type: 'stock', currency: 'PLN' },
  { symbol: 'ALE.WA', name: 'Allegro.eu SA', type: 'stock', currency: 'PLN' },
  { symbol: 'CPS.WA', name: 'Cyfrowy Polsat SA', type: 'stock', currency: 'PLN' },
  { symbol: 'PZU.WA', name: 'PZU SA', type: 'stock', currency: 'PLN' },
  { symbol: 'KRU.WA', name: 'KRUK SA', type: 'stock', currency: 'PLN' },
  { symbol: 'SPL.WA', name: 'Santander Bank Polska', type: 'stock', currency: 'PLN' },
  { symbol: 'MBK.WA', name: 'mBank SA', type: 'stock', currency: 'PLN' },
  { symbol: 'ALR.WA', name: 'Alior Bank SA', type: 'stock', currency: 'PLN' },
  { symbol: 'PCO.WA', name: 'Pepco Group NV', type: 'stock', currency: 'PLN' },
  { symbol: 'ACP.WA', name: 'Asseco Poland SA', type: 'stock', currency: 'PLN' },
  { symbol: 'JSW.WA', name: 'Jastrzębska Spółka Węglowa', type: 'stock', currency: 'PLN' },
  { symbol: 'TPE.WA', name: 'Tauron Polska Energia', type: 'stock', currency: 'PLN' },
  { symbol: 'PGE.WA', name: 'Polska Grupa Energetyczna', type: 'stock', currency: 'PLN' },
  { symbol: 'XTB.WA', name: 'XTB SA', type: 'stock', currency: 'PLN' },
  { symbol: 'ASB.WA', name: 'ASBISc Enterprises Plc', type: 'stock', currency: 'PLN' },
  { symbol: 'NEU.WA', name: 'Neuca SA', type: 'stock', currency: 'PLN' },
  { symbol: 'ATR.WA', name: 'Atrem SA', type: 'stock', currency: 'PLN' },
  { symbol: 'SNT.WA', name: 'Synektik SA', type: 'stock', currency: 'PLN' },
  { symbol: 'DOM.WA', name: 'Dom Development SA', type: 'stock', currency: 'PLN' },
  { symbol: '1AT.WA', name: 'Atal SA', type: 'stock', currency: 'PLN' },
  { symbol: 'EAT.WA', name: 'AmRest Holdings SE', type: 'stock', currency: 'PLN' },

  // USA - Akcje
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', currency: 'USD' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', currency: 'USD' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', currency: 'USD' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', currency: 'USD' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', type: 'stock', currency: 'USD' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', currency: 'USD' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', currency: 'USD' },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', type: 'stock', currency: 'USD' },
  { symbol: 'PLTR', name: 'Palantir Technologies', type: 'stock', currency: 'USD' },
  { symbol: 'INTC', name: 'Intel Corporation', type: 'stock', currency: 'USD' },

  // ETF-y
  { symbol: 'CSPX.L', name: 'iShares Core S&P 500 UCITS ETF', type: 'etf', currency: 'USD' },
  { symbol: 'VWCE.DE', name: 'Vanguard FTSE All-World UCITS ETF', type: 'etf', currency: 'EUR' },
  { symbol: 'EUNL.DE', name: 'iShares Core MSCI World UCITS ETF', type: 'etf', currency: 'EUR' },
  { symbol: 'ETFSP500.WA', name: 'Beta ETF S&P 500 PLN-Hedged', type: 'etf', currency: 'PLN' },
  { symbol: 'ETFW20L.WA', name: 'Beta ETF WIG20LEV', type: 'etf', currency: 'PLN' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq-100)', type: 'etf', currency: 'USD' },

  // Surowce (Commodities)
  { symbol: 'GC=F', name: 'Złoto (Gold Futures)', type: 'commodity', currency: 'USD' },
  { symbol: 'SI=F', name: 'Srebro (Silver Futures)', type: 'commodity', currency: 'USD' },
  { symbol: 'CL=F', name: 'Ropa Naftowa WTI', type: 'commodity', currency: 'USD' },

  // Kryptowaluty
  { symbol: 'BTC-USD', name: 'Bitcoin', type: 'crypto', currency: 'USD' },
  { symbol: 'ETH-USD', name: 'Ethereum', type: 'crypto', currency: 'USD' },
  { symbol: 'SOL-USD', name: 'Solana', type: 'crypto', currency: 'USD' }
];
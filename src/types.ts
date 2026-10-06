export type AssetType = 'stock' | 'etf' | 'commodity' | 'crypto';

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  type: AssetType;
  shares: number;
  buyPrice: number;
  currentPrice: number;
  currency: string;
  purchaseDate: string;
  broker?: string; // <--- NOWE POLE
}

export interface TickerSuggestion {
  symbol: string;
  name: string;
  type: AssetType;
  currency: string;
  exchDisp?: string;
}

export type SortField = 'ticker' | 'shares' | 'valuePLN' | 'profitLossPLN';
export type SortOrder = 'asc' | 'desc';

export interface CurrencyHistoryPoint {
  date: string;
  rate: number;
}
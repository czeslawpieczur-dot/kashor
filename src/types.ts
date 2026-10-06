export type AssetType = 'stock' | 'etf' | 'commodity' | 'crypto';

export interface PriceHistory {
  prevClose?: number;
  days7?: number;
  days30?: number;
  ytd?: number;
  days365?: number;
}

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  type: AssetType;
  shares: number;
  buyPrice: number;
  currentPrice: number;
  currency: string;
  purchaseDate?: string;
  priceHistory?: PriceHistory;
}

export interface TickerSuggestion {
  symbol: string;
  name: string;
  type: AssetType;
  currency: string;
  exchDisp?: string;
}

export interface CurrencyHistoryPoint {
  date: string;
  rate: number;
}

export type TimeRange = '1D' | '7D' | '30D' | 'YTD' | '12M';
export type SortField = 'ticker' | 'shares' | 'valuePLN' | 'profitLossPLN';
export type SortOrder = 'asc' | 'desc';
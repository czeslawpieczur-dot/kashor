import { GLOBAL_DATABASE, AssetMeta } from '../data/globalBaza';
import { TickerSuggestion } from '../types';

export const searchGlobalBaza = (query: string): TickerSuggestion[] => {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery || cleanQuery.length < 1) return [];

  // Przeszukiwanie bazy offline po symbolu lub nazwie
  const matches = GLOBAL_DATABASE.filter(
    item =>
      item.symbol.toLowerCase().includes(cleanQuery) ||
      item.name.toLowerCase().includes(cleanQuery)
  );

  return matches.slice(0, 8).map(item => ({
    symbol: item.symbol,
    name: item.name,
    type: item.type,
    currency: item.currency,
    exchDisp: item.symbol.endsWith('.WA') ? 'GPW' : item.type.toUpperCase(),
  }));
};

export const getMetaBySymbol = (symbol: string): AssetMeta | undefined => {
  const clean = symbol.trim().toUpperCase();
  return GLOBAL_DATABASE.find(item => item.symbol.toUpperCase() === clean);
};
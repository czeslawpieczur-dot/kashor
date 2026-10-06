import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Plus, Wallet, Trash2, RefreshCw, Upload, Eraser, LogOut, Lock, Mail, UserCheck, PieChart as PieChartIcon, ArrowUpDown, ArrowUp, ArrowDown, X, LineChart as LineChartIcon, Search, KeyRound, Edit2, Check } from 'lucide-react';
import Papa from 'papaparse';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

const APP_VERSION = 'v1.5.4';
const BUILD_TIME = '2026-10-06 18:35';

const KNOWN_NAMES: { [key: string]: string } = {
  'PKO.WA': 'PKO Bank Polski',
  'PEO.WA': 'Bank Pekao',
  'KGH.WA': 'KGHM Polska Miedź',
  'PKN.WA': 'ORLEN',
  'CDR.WA': 'CD Projekt',
  'DNP.WA': 'Dino Polska',
  'LPP.WA': 'LPP (Reserved)',
  'ALE.WA': 'Allegro',
  'CPS.WA': 'Cyfrowy Polsat',
  'PZU.WA': 'PZU SA',
  'KRU.WA': 'KRUK SA',
  'SPL.WA': 'Santander Bank Polska',
  'MBK.WA': 'mBank',
  'ALR.WA': 'Alior Bank',
  'PCO.WA': 'Pepco Group',
  'ACP.WA': 'Asseco Poland',
  'JSW.WA': 'JSW',
  'TPE.WA': 'Tauron PE',
  'PGE.WA': 'PGE',
  'XTB.WA': 'XTB SA',
  'ASB.WA': 'ASBISc Enterprises',
  'NEU.WA': 'Neuca',
  'ATR.WA': 'Atrem',
  'SNT.WA': 'Synektik',
  'DOM.WA': 'Dom Development',
  'AAPL': 'Apple Inc.',
  'NVDA': 'NVIDIA Corporation',
  'MSFT': 'Microsoft Corporation',
  'AMZN': 'Amazon.com Inc.',
  'GOOGL': 'Alphabet Inc.',
  'TSLA': 'Tesla Inc.',
  'META': 'Meta Platforms',
  'AMD': 'Advanced Micro Devices',
};

interface Holding {
  id: string;
  ticker: string;
  name: string;
  type: 'stock' | 'etf';
  shares: number;
  buyPrice: number;
  currentPrice: number;
  currency: string;
}

interface TickerSuggestion {
  symbol: string;
  name: string;
  exchDisp?: string;
  typeDisp?: string;
}

interface CurrencyHistoryPoint {
  date: string;
  rate: number;
}

type SortField = 'ticker' | 'shares' | 'valuePLN' | 'profitLossPLN';
type SortOrder = 'asc' | 'desc';

const CHART_COLORS = [
  '#38bdf8', '#22c55e', '#eab308', '#f97316', '#a855f7',
  '#ec4899', '#06b6d4', '#10b981', '#f43f5e', '#6366f1',
  '#8b5cf6', '#d946ef', '#64748b'
];

const translateAuthError = (message: string): string => {
  const msg = message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Nieprawidłowy e-mail lub hasło.';
  if (msg.includes('user already registered') || msg.includes('already exists')) return 'Konto o tym adresie e-mail już istnieje.';
  if (msg.includes('password should be at least')) return 'Hasło musi mieć co najmniej 6 znaków.';
  if (msg.includes('unable to validate email address')) return 'Wprowadź poprawny adres e-mail.';
  if (msg.includes('email not confirmed')) return 'Adres e-mail nie został jeszcze potwierdzony.';
  if (msg.includes('rate limit')) return 'Zbyt wiele prób. Spróbuj ponownie za chwilę.';
  return 'Wystąpił błąd autoryzacji: ' + message;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('kashor_is_guest') === 'true';
  });

  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [usdPln, setUsdPln] = useState<number>(3.88);
  const [eurPln, setEurPln] = useState<number>(4.28);

  const [ticker, setTicker] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [assetType, setAssetType] = useState<'stock' | 'etf'>('stock');
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [loading, setLoading] = useState(false);

  // EDYCJA NAZWY W TABELI
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  // AUTOCOMPLETE TICKERA
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // MODAL WYKRESU WALUT (NBP)
  const [currencyModal, setCurrencyModal] = useState<{ open: boolean; code: 'USD' | 'EUR'; range: '1M' | '3M' | '1R' }>({
    open: false,
    code: 'USD',
    range: '1M',
  });
  const [currencyHistory, setCurrencyHistory] = useState<CurrencyHistoryPoint[]>([]);
  const [currencyHistoryLoading, setCurrencyHistoryLoading] = useState(false);

  // SORTOWANIE
  const [sortField, setSortField] = useState<SortField>('valuePLN');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // SŁOWNIK NAZW SPÓŁEK LOKALNY
  const [companyNames, setCompanyNames] = useState<{ [ticker: string]: string }>(() => {
    try {
      const saved = localStorage.getItem('kashor_names');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('kashor_names', JSON.stringify(companyNames));
  }, [companyNames]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsGuest(false);
        localStorage.removeItem('kashor_is_guest');
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordResetMode(true);
      }
      if (session?.user) {
        setUser(session.user);
        setIsGuest(false);
        localStorage.removeItem('kashor_is_guest');
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchHoldingsFromSupabase();
    } else if (isGuest) {
      const saved = localStorage.getItem('kashor_holdings');
      if (saved) {
        try { setHoldings(JSON.parse(saved)); } catch (e) { console.error(e); }
      } else {
        setHoldings([]);
      }
    } else {
      setHoldings([]);
    }
  }, [user, isGuest]);

  useEffect(() => {
    if (isGuest && !user) {
      localStorage.setItem('kashor_holdings', JSON.stringify(holdings));
    }
  }, [holdings, isGuest, user]);

  const fetchHoldingsFromSupabase = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Błąd pobierania z bazy:', error);
    } else if (data) {
      const formatted: Holding[] = data.map((item) => {
        const bestName = item.name || KNOWN_NAMES[item.ticker] || companyNames[item.ticker] || item.ticker;
        return {
          id: item.id,
          ticker: item.ticker,
          name: bestName,
          type: item.type || 'stock',
          shares: Number(item.shares),
          buyPrice: Number(item.buy_price),
          currentPrice: Number(item.current_price),
          currency: item.currency || 'PLN',
        };
      });
      setHoldings(formatted);
    }
    setLoading(false);
  };

  const fetchExchangeRates = async () => {
    try {
      const usdRes = await fetch('https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json');
      const usdData = await usdRes.json();
      if (usdData?.rates?.[0]?.mid) setUsdPln(usdData.rates[0].mid);

      const eurRes = await fetch('https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json');
      const eurData = await eurRes.json();
      if (eurData?.rates?.[0]?.mid) setEurPln(eurData.rates[0].mid);
    } catch (error) {
      console.error('Błąd NBP:', error);
    }
  };

  useEffect(() => {
    fetchExchangeRates();
  }, []);

  useEffect(() => {
    if (!currencyModal.open) return;

    const fetchCurrencyHistory = async () => {
      setCurrencyHistoryLoading(true);
      let count = 30;
      if (currencyModal.range === '3M') count = 90;
      if (currencyModal.range === '1R') count = 255;

      try {
        const response = await fetch(
          `https://api.nbp.pl/api/exchangerates/rates/a/${currencyModal.code.toLowerCase()}/last/${count}/?format=json`
        );
        const data = await response.json();
        const points: CurrencyHistoryPoint[] = (data?.rates || []).map((r: any) => ({
          date: r.effectiveDate.slice(5),
          rate: r.mid,
        }));
        setCurrencyHistory(points);
      } catch (err) {
        console.error('Błąd historii NBP:', err);
      }
      setCurrencyHistoryLoading(false);
    };

    fetchCurrencyHistory();
  }, [currencyModal.open, currencyModal.code, currencyModal.range]);

  const handleTickerChange = (value: string) => {
    setTicker(value);
    setSelectedName('');

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://corsproxy.io/?${encodeURIComponent(
            `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(value)}&quotesCount=6`
          )}`
        );
        const data = await response.json();
        const quotes: TickerSuggestion[] = (data?.quotes || []).map((q: any) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          exchDisp: q.exchDisp || q.exchange,
          typeDisp: q.typeDisp,
        }));
        setSuggestions(quotes);
        setShowSuggestions(quotes.length > 0);
      } catch {
        setSuggestions([]);
      }
      setSearchLoading(false);
    }, 300);
  };

  const selectSuggestion = (s: TickerSuggestion) => {
    setTicker(s.symbol);
    setSelectedName(s.name);
    setShowSuggestions(false);

    if (s.typeDisp?.toLowerCase().includes('etf')) setAssetType('etf');
    else setAssetType('stock');

    if (s.symbol.endsWith('.WA')) setCurrency('PLN');
    else if (s.symbol.endsWith('.DE') || s.symbol.endsWith('.PA') || s.symbol.endsWith('.AS')) setCurrency('EUR');
    else setCurrency('USD');
  };

  const fetchStockData = async (symbol: string) => {
    const cleanSymbol = symbol.trim().toUpperCase();
    const known = KNOWN_NAMES[cleanSymbol] || companyNames[cleanSymbol];

    try {
      const response = await fetch(
        `https://corsproxy.io/?${encodeURIComponent(
          `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?interval=1d&range=1d`
        )}`
      );

      if (response.ok) {
        const data = await response.json();
        const meta = data?.chart?.result?.[0]?.meta;

        const price = meta?.regularMarketPrice;
        const fetchedName = meta?.shortName || meta?.longName;
        let detectedCurrency = meta?.currency || (cleanSymbol.endsWith('.WA') ? 'PLN' : 'USD');
        if (detectedCurrency === 'GBp') detectedCurrency = 'GBP';

        const finalName = selectedName || fetchedName || known || cleanSymbol;

        if (finalName && finalName !== cleanSymbol) {
          setCompanyNames(prev => ({ ...prev, [cleanSymbol]: finalName }));
        }

        return { price: price ? parseFloat(price) : null, name: finalName, currency: detectedCurrency };
      }
    } catch (error) {
      console.error(error);
    }

    return { price: null, name: selectedName || known || cleanSymbol, currency: cleanSymbol.endsWith('.WA') ? 'PLN' : 'USD' };
  };

  const saveCustomName = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, name: newName } : h));

    const targetHolding = holdings.find(h => h.id === id);
    if (targetHolding) {
      setCompanyNames(prev => ({ ...prev, [targetHolding.ticker]: newName }));
    }

    if (user) {
      await supabase.from('holdings').update({ name: newName }).eq('id', id).eq('user_id', user.id);
    }
    setEditingId(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setLoading(true);

    if (isForgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) {
        setAuthError(translateAuthError(error.message));
      } else {
        setAuthSuccess('Wysłano link do zresetowania hasła. Sprawdź swoją skrzynkę e-mail!');
      }
    } else if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setAuthError(translateAuthError(error.message));
      } else {
        setAuthSuccess('Konto zostało utworzone! Możesz się teraz zalogować.');
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(translateAuthError(error.message));
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setAuthError(translateAuthError(error.message));
    } else {
      setAuthSuccess('Hasło zostało pomyślnie zmienione! Zostałeś zalogowany.');
      setIsPasswordResetMode(false);
    }
    setLoading(false);
  };

  const handleGuestLogin = () => {
    setIsGuest(true);
    localStorage.setItem('kashor_is_guest', 'true');
  };

  const handleLogout = async () => {
    if (user) await supabase.auth.signOut();
    setIsGuest(false);
    setUser(null);
    localStorage.removeItem('kashor_is_guest');
  };

  const addHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !shares || !buyPrice) return;

    setLoading(true);
    const numShares = parseFloat(shares);
    const numPrice = parseFloat(buyPrice);
    const cleanTicker = ticker.trim().toUpperCase();

    const stockData = await fetchStockData(cleanTicker);
    const newId = Date.now().toString();

    const selectedCurrency = currency || stockData.currency;
    const finalName = selectedName || KNOWN_NAMES[cleanTicker] || stockData.name || cleanTicker;

    const newHoldingObj: Holding = {
      id: newId,
      ticker: cleanTicker,
      name: finalName,
      type: assetType,
      shares: numShares,
      buyPrice: numPrice,
      currentPrice: stockData.price !== null ? stockData.price : numPrice,
      currency: selectedCurrency,
    };

    if (user) {
      const { error } = await supabase.from('holdings').insert([{
        id: newId,
        user_id: user.id,
        ticker: cleanTicker,
        name: finalName,
        type: assetType,
        shares: numShares,
        buy_price: numPrice,
        current_price: newHoldingObj.currentPrice,
        currency: selectedCurrency,
      }]);

      if (error) alert('Błąd zapisu w bazie: ' + error.message);
      else fetchHoldingsFromSupabase();
    } else {
      setHoldings((prev) => [...prev, newHoldingObj]);
    }

    setTicker('');
    setSelectedName('');
    setShares('');
    setBuyPrice('');
    setSuggestions([]);
    setShowSuggestions(false);
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: async (results: Papa.ParseResult<string[]>) => {
        const rows = results.data;
        if (!rows || rows.length === 0) return;

        let headerIndex = -1;
        for (let i = 0; i < rows.length; i++) {
          const rowStr = rows[i].join(',').replace(/\ufeff/g, '');
          if (rowStr.includes('Ticker') || rowStr.includes('Instrument')) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex === -1) return;

        const headers = rows[headerIndex].map((h) =>
          h ? h.replace(/\ufeff/g, '').replace(/"/g, '').trim() : ''
        );

        let tickerCol = headers.indexOf('Ticker');
        if (tickerCol === -1) tickerCol = headers.indexOf('Instrument');
        
        const volumeCol = headers.indexOf('Volume');
        const openPriceCol = headers.indexOf('Open Price');
        const closePriceCol = headers.indexOf('Close Price');

        if (tickerCol === -1 || volumeCol === -1 || openPriceCol === -1) return;

        const aggregated: { 
          [ticker: string]: { totalCost: number; totalShares: number; latestCurrentPrice: number } 
        } = {};

        for (let i = headerIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length <= Math.max(tickerCol, volumeCol, openPriceCol)) continue;

          let rawTicker = row[tickerCol];
          let rawVolume = row[volumeCol];
          let rawPrice = row[openPriceCol];
          let rawClosePrice = closePriceCol !== -1 ? row[closePriceCol] : rawPrice;

          if (!rawTicker || !rawVolume || !rawPrice) continue;

          const volume = parseFloat(rawVolume.toString().replace(/"/g, '').replace(',', '.').trim());
          const price = parseFloat(rawPrice.toString().replace(/"/g, '').replace(',', '.').trim());
          const currentPrice = parseFloat((rawClosePrice || rawPrice).toString().replace(/"/g, '').replace(',', '.').trim());

          if (isNaN(volume) || isNaN(price) || volume <= 0) continue;

          let formattedTicker = rawTicker.toString().replace(/"/g, '').trim().toUpperCase();
          if (formattedTicker.endsWith('.PL')) formattedTicker = formattedTicker.replace('.PL', '.WA');
          else if (formattedTicker.endsWith('.US')) formattedTicker = formattedTicker.replace('.US', '');

          if (!aggregated[formattedTicker]) {
            aggregated[formattedTicker] = { totalCost: 0, totalShares: 0, latestCurrentPrice: currentPrice || price };
          }

          aggregated[formattedTicker].totalShares += volume;
          aggregated[formattedTicker].totalCost += volume * price;
          if (!isNaN(currentPrice) && currentPrice > 0) {
            aggregated[formattedTicker].latestCurrentPrice = currentPrice;
          }
        }

        setLoading(true);
        const importedHoldings: Holding[] = [];
        const supabaseRows = [];

        for (const [symbol, data] of Object.entries(aggregated)) {
          const avgBuyPrice = data.totalCost / data.totalShares;
          const id = Date.now().toString() + Math.random().toString();
          const stockData = await fetchStockData(symbol);
          const nameToUse = KNOWN_NAMES[symbol] || stockData.name || symbol;
          const detectedType: 'stock' | 'etf' = symbol.toLowerCase().includes('etf') || symbol.endsWith('.DE') ? 'etf' : 'stock';

          importedHoldings.push({
            id,
            ticker: symbol,
            name: nameToUse,
            type: detectedType,
            shares: parseFloat(data.totalShares.toFixed(4)),
            buyPrice: parseFloat(avgBuyPrice.toFixed(2)),
            currentPrice: parseFloat(data.latestCurrentPrice.toFixed(2)),
            currency: stockData.currency,
          });

          if (user) {
            supabaseRows.push({
              id,
              user_id: user.id,
              ticker: symbol,
              name: nameToUse,
              type: detectedType,
              shares: parseFloat(data.totalShares.toFixed(4)),
              buy_price: parseFloat(avgBuyPrice.toFixed(2)),
              current_price: parseFloat(data.latestCurrentPrice.toFixed(2)),
              currency: stockData.currency,
            });
          }
        }

        if (user && supabaseRows.length > 0) {
          await supabase.from('holdings').delete().eq('user_id', user.id);
          const { error } = await supabase.from('holdings').insert(supabaseRows);
          if (error) alert('Błąd zapisu w chmurze: ' + error.message);
          else fetchHoldingsFromSupabase();
        } else if (importedHoldings.length > 0) {
          setHoldings(importedHoldings);
        }

        setLoading(false);
        e.target.value = '';
      }
    });
  };

  const removeHolding = async (id: string) => {
    if (user) {
      await supabase.from('holdings').delete().eq('id', id).eq('user_id', user.id);
    }
    setHoldings(holdings.filter((h) => h.id !== id));
  };

  const clearAllHoldings = async () => {
    if (holdings.length === 0) return;
    if (window.confirm('Czy na pewno chcesz usunąć WSZYSTKIE akcje z portfela?')) {
      if (user) {
        await supabase.from('holdings').delete().eq('user_id', user.id);
      }
      setHoldings([]);
      localStorage.removeItem('kashor_holdings');
    }
  };

  const refreshPrices = async () => {
    if (holdings.length === 0) return;
    setLoading(true);
    await fetchExchangeRates();

    const updatedHoldings = await Promise.all(
      holdings.map(async (item) => {
        const stockData = await fetchStockData(item.ticker);
        const newPrice = stockData.price !== null ? stockData.price : item.currentPrice;

        if (user) {
          await supabase
            .from('holdings')
            .update({ current_price: newPrice, currency: stockData.currency, name: item.name })
            .eq('id', item.id)
            .eq('user_id', user.id);
        }

        return {
          ...item,
          currentPrice: newPrice,
          currency: stockData.currency,
        };
      })
    );

    setHoldings(updatedHoldings);
    setLoading(false);
  };

  const getPLNValue = (amount: number, curr: string) => {
    if (curr === 'USD') return amount * (usdPln || 3.88);
    if (curr === 'EUR') return amount * (eurPln || 4.28);
    return amount;
  };

  const totalCostPLN = holdings.reduce((sum, h) => sum + getPLNValue(h.shares * h.buyPrice, h.currency), 0);
  const totalValuePLN = holdings.reduce((sum, h) => sum + getPLNValue(h.shares * h.currentPrice, h.currency), 0);
  const totalProfitLossPLN = totalValuePLN - totalCostPLN;
  const totalProfitLossPercent = totalCostPLN > 0 ? (totalProfitLossPLN / totalCostPLN) * 100 : 0;

  const rawChartData = holdings.map((h) => {
    const valuePLN = getPLNValue(h.shares * h.currentPrice, h.currency);
    const displayName = companyNames[h.ticker] || KNOWN_NAMES[h.ticker] || h.name || h.ticker;
    return {
      ticker: h.ticker,
      name: displayName,
      value: parseFloat(valuePLN.toFixed(2)),
      percentNum: totalValuePLN > 0 ? (valuePLN / totalValuePLN) * 100 : 0,
    };
  }).sort((a, b) => b.value - a.value);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedHoldings = [...holdings].sort((a, b) => {
    const aValuePLN = getPLNValue(a.shares * a.currentPrice, a.currency);
    const bValuePLN = getPLNValue(b.shares * b.currentPrice, b.currency);
    
    const aProfitPLN = aValuePLN - getPLNValue(a.shares * a.buyPrice, a.currency);
    const bProfitPLN = bValuePLN - getPLNValue(b.shares * b.buyPrice, b.currency);

    let comp = 0;
    if (sortField === 'ticker') comp = a.ticker.localeCompare(b.ticker);
    else if (sortField === 'shares') comp = a.shares - b.shares;
    else if (sortField === 'valuePLN') comp = aValuePLN - bValuePLN;
    else if (sortField === 'profitLossPLN') comp = aProfitPLN - bProfitPLN;

    return sortOrder === 'asc' ? comp : -comp;
  });

  if (authLoading) {
    return (
      <div style={{ backgroundColor: '#0b0f19', color: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Ładowanie Kashor...</h2>
      </div>
    );
  }

  if (isPasswordResetMode) {
    return (
      <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#0b0f19', color: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ backgroundColor: '#151d30', padding: '40px', borderRadius: '16px', border: '1px solid #1e293b', maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <KeyRound size={48} color="#38bdf8" style={{ marginBottom: '10px' }} />
            <h1 style={{ margin: 0, fontSize: '24px' }}>Ustaw nowe hasło</h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>Wprowadź swoje nowe hasło poniżej.</p>
          </div>

          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Nowe hasło</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {authError && <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{authError}</div>}
            {authSuccess && <div style={{ color: '#22c55e', fontSize: '13px', textAlign: 'center' }}>{authSuccess}</div>}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#38bdf8',
                color: '#0b0f19',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Zapisywanie...' : 'Zapisz nowe hasło'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#0b0f19', color: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ backgroundColor: '#151d30', padding: '40px', borderRadius: '16px', border: '1px solid #1e293b', maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <Wallet size={48} color="#38bdf8" style={{ marginBottom: '10px' }} />
              <h1 style={{ margin: 0, fontSize: '28px', letterSpacing: '-0.5px' }}>Kashor</h1>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px' }}>
                {isForgotPassword ? 'Resetowanie hasła' : isSignUp ? 'Rejestracja konta' : 'Logowanie do portfela'}
              </p>
            </div>

            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Adres E-mail</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                  <input
                    type="email"
                    required
                    placeholder="twoj@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ color: '#94a3b8', fontSize: '13px' }}>Hasło</label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setAuthError(''); setAuthSuccess(''); }}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                      >
                        Zapomniałeś hasła?
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              {authError && <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{authError}</div>}
              {authSuccess && <div style={{ color: '#22c55e', fontSize: '13px', textAlign: 'center' }}>{authSuccess}</div>}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#38bdf8',
                  color: '#0b0f19',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '10px',
                }}
              >
                {loading ? 'Przetwarzanie...' : isForgotPassword ? 'Wyślij link do resetu' : isSignUp ? 'Zarejestruj się' : 'Zaloguj się'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {isForgotPassword ? (
                <button
                  onClick={() => { setIsForgotPassword(false); setAuthError(''); setAuthSuccess(''); }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
                >
                  Powrót do logowania
                </button>
              ) : (
                <button
                  onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); setAuthSuccess(''); }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
                >
                  {isSignUp ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
                </button>
              )}

              <button
                onClick={handleGuestLogin}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px dashed #334155',
                  color: '#38bdf8',
                  padding: '10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <UserCheck size={16} /> Kontynuuj bez rejestracji (Lokalnie)
              </button>
            </div>
          </div>
        </div>

        <footer style={{ textAlign: 'center', padding: '10px 0', color: '#475569', fontSize: '12px' }}>
          Kashor {APP_VERSION} | Ostatnia kompilacja: {BUILD_TIME}
        </footer>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#0b0f19', color: '#f8fafc', minHeight: '100vh', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '24px 16px', boxSizing: 'border-box' }}>
        
        {/* NAGŁÓWEK */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid #1e293b', paddingBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <Wallet size={32} color="#38bdf8" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', color: '#fff' }}>Kashor</h1>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span>Status: <strong style={{ color: user ? '#22c55e' : '#eab308' }}>{user ? `Zalogowany (${user.email})` : 'Tryb Lokalny (Gość)'}</strong></span>
                
                <span
                  onClick={() => setCurrencyModal({ open: true, code: 'USD', range: '1M' })}
                  style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                  title="Kliknij, aby zobaczyć wykres USD/PLN"
                >
                  USD/PLN: <strong style={{ color: '#38bdf8' }}>{usdPln ? `${usdPln.toFixed(4)} zł` : '...'}</strong>
                </span>

                <span
                  onClick={() => setCurrencyModal({ open: true, code: 'EUR', range: '1M' })}
                  style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                  title="Kliknij, aby zobaczyć wykres EUR/PLN"
                >
                  EUR/PLN: <strong style={{ color: '#a855f7' }}>{eurPln ? `${eurPln.toFixed(4)} zł` : '...'}</strong>
                </span>
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <label
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Upload size={16} /> Importuj z XTB (CSV)
              <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            <button
              onClick={refreshPrices}
              disabled={loading || holdings.length === 0}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#151d30',
                color: '#38bdf8',
                fontWeight: '600',
                fontSize: '13px',
                cursor: loading || holdings.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: holdings.length === 0 ? 0.5 : 1,
              }}
            >
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'Odświeżanie...' : 'Odśwież kursy'}
            </button>

            <button
              onClick={clearAllHoldings}
              disabled={holdings.length === 0}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontWeight: '600',
                fontSize: '13px',
                cursor: holdings.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: holdings.length === 0 ? 0.5 : 1,
              }}
            >
              <Eraser size={16} /> Wyczyść
            </button>

            <button
              onClick={handleLogout}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0b0f19',
                color: '#94a3b8',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <LogOut size={16} /> {user ? 'Wyloguj' : 'Wyjdź'}
            </button>
          </div>
        </header>

        {/* KARTY PODSUMOWANIA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{ backgroundColor: '#151d30', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Wartość Portfela (PLN)</span>
            <h2 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>{totalValuePLN.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł</h2>
          </div>

          <div style={{ backgroundColor: '#151d30', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Koszt Zakupu (PLN)</span>
            <h2 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>{totalCostPLN.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł</h2>
          </div>

          <div style={{ backgroundColor: '#151d30', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Zysk / Strata całkowita</span>
            <h2 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px', color: totalProfitLossPLN >= 0 ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {totalProfitLossPLN >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              {totalProfitLossPLN >= 0 ? '+' : ''}{totalProfitLossPLN.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł ({totalProfitLossPercent.toFixed(2)}%)
            </h2>
          </div>
        </div>

        {/* MODUŁ WYKRESU ALOKACJI */}
        {holdings.length > 0 && (
          <div style={{ backgroundColor: '#151d30', padding: '24px', borderRadius: '16px', marginBottom: '28px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <PieChartIcon size={20} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>Struktura i Alokacja Portfela</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center' }}>
              <div style={{ height: '260px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rawChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {rawChartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="#151d30" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '13px' }}
                      formatter={(value: any, _name: any, item: any) => [
                        `${Number(value).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł (${item.payload.percentNum.toFixed(1)}%)`,
                        item.payload.name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* LEGENDA WYKRESU: TYLKO NAZWA GŁÓWNA + TICKER POD SPODEM */}
              <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rawChartData.map((item, index) => (
                    <div key={item.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0b0f19', border: '1px solid #1e293b', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: CHART_COLORS[index % CHART_COLORS.length], flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '700', color: '#fff', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>{item.name}</span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{item.ticker}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: '600', color: '#38bdf8' }}>{item.percentNum.toFixed(1)}%</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{item.value.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FORMULARZ DODAWANIA AKCJI Z WYBOREM TYPU */}
        <form onSubmit={addHolding} style={{ backgroundColor: '#151d30', padding: '20px', borderRadius: '12px', marginBottom: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap', border: '1px solid #1e293b', alignItems: 'center', position: 'relative' }}>
          
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value as 'stock' | 'etf')}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#38bdf8', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
          >
            <option value="stock">Akcje</option>
            <option value="etf">ETF</option>
          </select>

          <div style={{ flex: 2, minWidth: '180px', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Wpisz ticker lub nazwę (np. NVDA, PKO)"
                value={ticker}
                onChange={(e) => handleTickerChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                style={{ width: '100%', padding: '10px 36px 10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <Search size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: '#64748b' }} />
            </div>

            {showSuggestions && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', borderRadius: '8px', zIndex: 100, maxHeight: '220px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                {searchLoading ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Szukanie...</div>
                ) : (
                  suggestions.map((s) => (
                    <div
                      key={s.symbol}
                      onClick={() => selectSuggestion(s)}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#151d30'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: '#38bdf8', fontSize: '13px' }}>{s.name}</div>
                        <div style={{ color: '#94a3b8', fontSize: '12px' }}>{s.symbol}</div>
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>
                        {s.exchDisp || 'Giełda'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <input
            type="number"
            placeholder="Liczba akcji"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            style={{ flex: 1, minWidth: '110px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff', fontSize: '14px' }}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Cena zakupu"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            style={{ flex: 1.5, minWidth: '130px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff', fontSize: '14px' }}
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#38bdf8', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
          >
            <option value="PLN">PLN (zł)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>

          <button type="submit" disabled={loading} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#38bdf8', color: '#0b0f19', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} /> Dodaj Pozycję
          </button>
        </form>

        {/* TABELA POSIADANYCH AKCJI Z NAZWĄ NA GÓRZE */}
        <div style={{ backgroundColor: '#151d30', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
          {holdings.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Portfel jest pusty. Zaimportuj plik z XTB lub dodaj pozycje ręcznie powyżej!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0b0f19', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th onClick={() => handleSort('ticker')} style={{ padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Nazwa / Symbol
                        {sortField === 'ticker' ? (sortOrder === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />) : <ArrowUpDown size={14} color="#334155" />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('shares')} style={{ padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Liczba
                        {sortField === 'shares' ? (sortOrder === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />) : <ArrowUpDown size={14} color="#334155" />}
                      </div>
                    </th>
                    <th style={{ padding: '14px 18px' }}>Śr. cena zakupu</th>
                    <th style={{ padding: '14px 18px' }}>Aktualny kurs</th>
                    <th onClick={() => handleSort('valuePLN')} style={{ padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Wartość (PLN)
                        {sortField === 'valuePLN' ? (sortOrder === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />) : <ArrowUpDown size={14} color="#334155" />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('profitLossPLN')} style={{ padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Wynik (PLN)
                        {sortField === 'profitLossPLN' ? (sortOrder === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />) : <ArrowUpDown size={14} color="#334155" />}
                      </div>
                    </th>
                    <th style={{ padding: '14px 18px', textAlign: 'center' }}>Akcja</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHoldings.map((h) => {
                    const currencySymbol = h.currency === 'USD' ? '$' : h.currency === 'EUR' ? '€' : 'zł';
                    const holdingCostPLN = getPLNValue(h.shares * h.buyPrice, h.currency);
                    const holdingValuePLN = getPLNValue(h.shares * h.currentPrice, h.currency);
                    const profitLossPLN = holdingValuePLN - holdingCostPLN;
                    const profitLossPercent = holdingCostPLN > 0 ? (profitLossPLN / holdingCostPLN) * 100 : 0;
                    const isProfit = profitLossPLN >= 0;
                    const displayName = companyNames[h.ticker] || KNOWN_NAMES[h.ticker] || h.name || h.ticker;

                    return (
                      <tr key={h.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '14px 18px' }}>
                          {/* DUŻA NAZWA NA GÓRZE, MAŁY TICKER NA DOLE */}
                          {editingId === h.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="text"
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #38bdf8', backgroundColor: '#0b0f19', color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                              />
                              <button onClick={() => saveCustomName(h.id, editingNameValue)} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', padding: 0 }}>
                                <Check size={18} />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => { setEditingId(h.id); setEditingNameValue(displayName); }}
                              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                              title="Kliknij, aby edytować nazwę"
                            >
                              <div style={{ fontWeight: '700', color: '#fff', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{displayName}</span>
                                <Edit2 size={12} color="#475569" />
                                {h.type === 'etf' && (
                                  <span style={{ fontSize: '10px', backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#a855f7', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.4)' }}>ETF</span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{h.ticker}</div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: '14px' }}>{h.shares}</td>
                        <td style={{ padding: '14px 18px', fontSize: '14px' }}>{h.buyPrice.toFixed(2)} {currencySymbol}</td>
                        <td style={{ padding: '14px 18px', fontSize: '14px' }}>{h.currentPrice.toFixed(2)} {currencySymbol}</td>
                        <td style={{ padding: '14px 18px', fontSize: '14px', fontWeight: '600' }}>{holdingValuePLN.toFixed(2)} zł</td>
                        <td style={{ padding: '14px 18px', fontSize: '14px', color: isProfit ? '#22c55e' : '#ef4444', fontWeight: '700' }}>
                          {isProfit ? '+' : ''}{profitLossPLN.toFixed(2)} zł ({profitLossPercent.toFixed(2)}%)
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <button onClick={() => removeHolding(h.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* MODAL HISTORII KURSU WALUTY (NBP) */}
      {currencyModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#151d30', border: '1px solid #334155', borderRadius: '16px', maxWidth: '600px', width: '100%', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LineChartIcon size={24} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                  Kurs {currencyModal.code}/PLN (NBP)
                </h3>
              </div>
              <button
                onClick={() => setCurrencyModal({ ...currencyModal, open: false })}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {(['1M', '3M', '1R'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setCurrencyModal({ ...currencyModal, range: r })}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    backgroundColor: currencyModal.range === r ? '#38bdf8' : '#0b0f19',
                    color: currencyModal.range === r ? '#0b0f19' : '#94a3b8',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            <div style={{ height: '240px', width: '100%' }}>
              {currencyHistoryLoading ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Pobieranie historii kursu z NBP...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currencyHistory}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#475569" fontSize={11} />
                    <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={11} tickFormatter={(v) => `${v.toFixed(2)} zł`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} />
                    <Area type="monotone" dataKey="rate" name="Kurs (zł)" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorRate)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: '12px', borderTop: '1px solid #1e293b', marginTop: '40px' }}>
        Kashor {APP_VERSION} | Ostatnia kompilacja: {BUILD_TIME}
      </footer>
    </div>
  );
}
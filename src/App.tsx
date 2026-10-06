import React, { useState, useEffect } from 'react';
import { 
  Wallet, Trash2, Edit2, Check, ArrowUpDown, ArrowUp, ArrowDown, 
  Search, Plus, RefreshCw, Upload, Eraser, LogOut, KeyRound, 
  TrendingUp, TrendingDown, Calendar, HelpCircle 
} from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { Holding, TickerSuggestion, SortField, SortOrder, AssetType, CurrencyHistoryPoint } from './types';
import { searchGlobalBaza, getMetaBySymbol } from './services/knownCompanies';
import { fetchStockPriceAndName, fetchNbpRates } from './services/apiService';
import { AllocationChart } from './components/AllocationChart';
import { CurrencyModal } from './components/CurrencyModal';

const APP_VERSION = 'v2.1.4';
const BUILD_TIME = '2026-10-06 21:50';

const CHART_COLORS = [
  '#38bdf8', '#22c55e', '#eab308', '#f97316', '#a855f7',
  '#ec4899', '#06b6d4', '#10b981', '#f43f5e', '#6366f1',
  '#8b5cf6', '#d946ef', '#64748b'
];

const getTodayString = () => new Date().toISOString().split('T')[0];

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
  const [isGuest, setIsGuest] = useState<boolean>(() => localStorage.getItem('kashor_is_guest') === 'true');

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
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [purchaseDate, setPurchaseDate] = useState<string>(getTodayString());
  const [loading, setLoading] = useState(false);
  const [showXtbHelp, setShowXtbHelp] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [currencyModal, setCurrencyModal] = useState<{ open: boolean; code: 'USD' | 'EUR'; range: '1M' | '3M' | '1R' }>({
    open: false,
    code: 'USD',
    range: '1M',
  });
  const [currencyHistory, setCurrencyHistory] = useState<CurrencyHistoryPoint[]>([]);
  const [currencyHistoryLoading, setCurrencyHistoryLoading] = useState(false);

  const [sortField, setSortField] = useState<SortField>('valuePLN');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsGuest(false);
        localStorage.removeItem('kashor_is_guest');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordResetMode(true);
      if (session?.user) {
        setUser(session.user);
        setIsGuest(false);
        localStorage.removeItem('kashor_is_guest');
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshExchangeRates = async () => {
    const rates = await fetchNbpRates();
    setUsdPln(rates.usd);
    setEurPln(rates.eur);
  };

  useEffect(() => {
    refreshExchangeRates();
  }, []);

  useEffect(() => {
    if (user) {
      fetchHoldingsFromSupabase();
    } else if (isGuest) {
      const saved = localStorage.getItem('kashor_holdings');
      if (saved) {
        try { 
          const parsed = JSON.parse(saved);
          const formatted = parsed.map((item: any) => {
            const cleanTicker = (item.ticker || '').trim().toUpperCase();
            const meta = getMetaBySymbol(cleanTicker);
            let finalName = item.name;
            
            if (!finalName || finalName.toUpperCase() === cleanTicker || finalName.toUpperCase() === cleanTicker + '.WA' || finalName.includes('.WA')) {
              if (meta?.name) finalName = meta.name;
            }
            return {
              ...item,
              name: finalName || cleanTicker,
              purchaseDate: item.purchaseDate || getTodayString()
            };
          });
          setHoldings(formatted); 
        } catch (e) { console.error(e); }
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

  const fetchHoldingsFromSupabase = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('holdings').select('*').eq('user_id', user.id);
    if (data) {
      const formatted: Holding[] = data.map(item => {
        const cleanTicker = (item.ticker || '').trim().toUpperCase();
        const meta = getMetaBySymbol(cleanTicker);
        
        let finalName = item.name;
        if (!finalName || finalName.toUpperCase() === cleanTicker || finalName.toUpperCase() === cleanTicker + '.WA' || finalName.includes('.WA')) {
          if (meta?.name) {
            finalName = meta.name;
          }
        }

        return {
          id: item.id,
          ticker: cleanTicker,
          name: finalName || cleanTicker,
          type: item.type || meta?.type || 'stock',
          shares: Number(item.shares),
          buyPrice: Number(item.buy_price),
          currentPrice: Number(item.current_price),
          currency: item.currency || meta?.currency || 'PLN',
          purchaseDate: item.purchase_date || getTodayString(),
        };
      });
      setHoldings(formatted);
    }
    setLoading(false);
  };

  const handleTickerChange = async (value: string) => {
    setTicker(value);
    setSelectedName('');

    if (value.trim().length >= 1) {
      const results = await searchGlobalBaza(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (s: TickerSuggestion) => {
    setTicker(s.symbol);
    setSelectedName(s.name);
    setAssetType(s.type);
    setCurrency(s.currency);
    setShowSuggestions(false);
  };

  const addHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !shares || !buyPrice) return;

    setLoading(true);
    const numShares = parseFloat(shares);
    const numPrice = parseFloat(buyPrice);
    const cleanTicker = ticker.trim().toUpperCase();

    const stockData = await fetchStockPriceAndName(cleanTicker, selectedName);
    const meta = getMetaBySymbol(cleanTicker);
    let resolvedName = stockData.name;
    if (!resolvedName || resolvedName.toUpperCase() === cleanTicker || resolvedName.includes('.WA')) {
      if (meta?.name) resolvedName = meta.name;
    }

    const newId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();

    const newHoldingObj: Holding = {
      id: newId,
      ticker: cleanTicker,
      name: resolvedName || cleanTicker,
      type: assetType,
      shares: numShares,
      buyPrice: numPrice,
      currentPrice: stockData.price !== null ? stockData.price : numPrice,
      currency: currency || stockData.currency,
      purchaseDate: purchaseDate || getTodayString(),
    };

    setHoldings(prev => [...prev, newHoldingObj]);

    if (user) {
      const { error } = await supabase.from('holdings').insert([{
        id: newId,
        user_id: user.id,
        ticker: cleanTicker,
        name: newHoldingObj.name,
        type: assetType,
        shares: numShares,
        buy_price: numPrice,
        current_price: newHoldingObj.currentPrice,
        currency: newHoldingObj.currency,
        purchase_date: newHoldingObj.purchaseDate,
      }]);

      if (error) {
        console.error('Błąd zapisu w Supabase:', error);
      } else {
        fetchHoldingsFromSupabase();
      }
    }

    setTicker('');
    setSelectedName('');
    setShares('');
    setBuyPrice('');
    setPurchaseDate(getTodayString());
    setShowSuggestions(false);
    setLoading(false);
  };

  const refreshPrices = async () => {
    if (holdings.length === 0) return;
    setLoading(true);
    await refreshExchangeRates();

    const updatedHoldings = await Promise.all(
      holdings.map(async (item) => {
        const stockData = await fetchStockPriceAndName(item.ticker, item.name);
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

  const saveCustomName = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, name: newName } : h));
    if (user) {
      await supabase.from('holdings').update({ name: newName }).eq('id', id).eq('user_id', user.id);
    }
    setEditingId(null);
  };

  const removeHolding = async (id: string) => {
    if (user) await supabase.from('holdings').delete().eq('id', id).eq('user_id', user.id);
    setHoldings(prev => prev.filter(h => h.id !== id));
  };

  const clearAllHoldings = async () => {
    if (holdings.length === 0) return;
    if (window.confirm('Czy na pewno chcesz usunąć WSZYSTKIE pozycje z portfela?')) {
      if (user) await supabase.from('holdings').delete().eq('user_id', user.id);
      setHoldings([]);
      localStorage.removeItem('kashor_holdings');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      delimitersToGuess: [',', ';', '\t', '|'],
      complete: async (results: Papa.ParseResult<string[]>) => {
        const rows = results.data;
        if (!rows || rows.length === 0) {
          alert('Plik jest pusty lub uszkodzony.');
          setLoading(false);
          return;
        }

        let headerIndex = -1;
        for (let i = 0; i < rows.length; i++) {
          const rowStr = rows[i].join(' ').toLowerCase();
          if (rowStr.includes('ticker') || rowStr.includes('open price') || rowStr.includes('cena otwarcia')) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex === -1) {
          alert('Nie rozpoznałem nagłówków w pliku CSV z XTB. Upewnij się, że eksportujesz zakładkę Open Positions.');
          setLoading(false);
          return;
        }

        const headers = rows[headerIndex].map((h) => h ? h.replace(/"/g, '').trim().toLowerCase() : '');
        
        let tickerCol = headers.indexOf('ticker');
        if (tickerCol === -1) tickerCol = headers.findIndex(h => h === 'symbol' || h === 'instrument' || h.includes('instrument'));
        
        let volumeCol = headers.findIndex(h => h.includes('volume') || h.includes('wolumen') || h.includes('ilość') || h.includes('ilosc'));
        let openPriceCol = headers.findIndex(h => h.includes('open price') || h.includes('cena otwarcia'));
        let dateCol = headers.findIndex(h => h.includes('time') || h.includes('czas'));

        if (tickerCol === -1 || volumeCol === -1 || openPriceCol === -1) {
          alert('Plik CSV nie zawiera wszystkich wymaganych kolumn (Ticker, Volume, Open Price).');
          setLoading(false);
          return;
        }

        const importedHoldings: Holding[] = [];
        let currentTicker = '';
        const apiCache: Record<string, any> = {};

        for (let i = headerIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;

          // Obsługa "zlepionych" tickerów z Excela
          const cellTicker = row[tickerCol] ? row[tickerCol].toString().replace(/"/g, '').trim().toUpperCase() : '';
          if (cellTicker && !cellTicker.includes('SUMA') && !cellTicker.includes('TOTAL') && !cellTicker.includes('IKZE')) {
            currentTicker = cellTicker;
          }
          if (!currentTicker) continue;

          // KLUCZOWY FIX: Weryfikujemy format daty. Wiersze podsumowujące (np. SUMY) nie mają pełnej daty transakcji!
          const dateStr = dateCol !== -1 && row[dateCol] ? row[dateCol].toString() : '';
          const dateMatch = dateStr.match(/\d{4}-\d{2}-\d{2}/);
          
          // Jeśli wiersz nie ma daty, pomijamy go z automatu - to musi być ogólne podsumowanie, a nie nasza transakcja
          if (!dateMatch) continue;
          const parsedDate = dateMatch[0];

          let rawTicker = currentTicker;
          if (rawTicker.endsWith('.PL')) rawTicker = rawTicker.replace('.PL', '.WA');
          else if (rawTicker.endsWith('.US')) rawTicker = rawTicker.replace('.US', '');

          const volumeStr = row[volumeCol] ? row[volumeCol].toString() : '';
          const priceStr = row[openPriceCol] ? row[openPriceCol].toString() : '';

          const volume = parseFloat(volumeStr.replace(',', '.'));
          const price = parseFloat(priceStr.replace(',', '.'));

          if (isNaN(volume) || isNaN(price) || volume <= 0) continue;

          // Cache API (żeby import z XTB był błyskawiczny)
          if (!apiCache[rawTicker]) {
            try {
              const stockData = await fetchStockPriceAndName(rawTicker);
              const meta = getMetaBySymbol(rawTicker);
              let resolvedName = stockData.name;
              if (!resolvedName || resolvedName.toUpperCase() === rawTicker || resolvedName.includes('.WA')) {
                if (meta?.name) resolvedName = meta.name;
              }
              apiCache[rawTicker] = {
                name: resolvedName || rawTicker,
                type: stockData.type,
                price: stockData.price,
                currency: stockData.currency
              };
            } catch (err) {
              // W razie awarii API dodajemy wartość domyślną i jedziemy dalej
              const meta = getMetaBySymbol(rawTicker);
              apiCache[rawTicker] = {
                name: meta?.name || rawTicker,
                type: meta?.type || 'stock',
                price: price,
                currency: meta?.currency || 'PLN'
              };
            }
          }

          const cachedData = apiCache[rawTicker];
          const newId = Date.now().toString() + Math.floor(Math.random() * 100000).toString();

          importedHoldings.push({
            id: newId,
            ticker: rawTicker,
            name: cachedData.name,
            type: cachedData.type,
            shares: volume,
            buyPrice: price,
            currentPrice: cachedData.price || price,
            currency: cachedData.currency,
            purchaseDate: parsedDate,
          });
        }

        if (importedHoldings.length === 0) {
          alert('Plik został załadowany, ale nie znaleziono w nim szczegółowych transakcji (sprawdź format danych).');
          setLoading(false);
          e.target.value = '';
          return;
        }

        // Pomyślny import: zapisujemy do bazy danych
        if (user) {
          await supabase.from('holdings').delete().eq('user_id', user.id);
          const supabaseRows = importedHoldings.map(h => ({
            id: h.id,
            user_id: user.id,
            ticker: h.ticker,
            name: h.name,
            type: h.type,
            shares: h.shares,
            buy_price: h.buyPrice,
            current_price: h.currentPrice,
            currency: h.currency,
            purchase_date: h.purchaseDate,
          }));
          await supabase.from('holdings').insert(supabaseRows);
          fetchHoldingsFromSupabase();
        } else {
          setHoldings(importedHoldings);
        }

        alert(`Sukces! Poprawnie zaimportowano ${importedHoldings.length} pojedynczych transakcji z XTB.`);
        setLoading(false);
        e.target.value = '';
      }
    });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setLoading(true);

    if (isForgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) setAuthError(translateAuthError(error.message));
      else setAuthSuccess('Wysłano link do zresetowania hasła. Sprawdź e-mail!');
    } else if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(translateAuthError(error.message));
      else { setAuthSuccess('Konto utworzone! Zaloguj się.'); setIsSignUp(false); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(translateAuthError(error.message));
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(''); setAuthSuccess(''); setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setAuthError(translateAuthError(error.message));
    else { setAuthSuccess('Hasło zmienione!'); setIsPasswordResetMode(false); }
    setLoading(false);
  };

  const handleLogout = async () => {
    if (user) await supabase.auth.signOut();
    setIsGuest(false);
    setUser(null);
    localStorage.removeItem('kashor_is_guest');
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
    return {
      ticker: h.ticker,
      name: h.name,
      value: parseFloat(valuePLN.toFixed(2)),
      percentNum: totalValuePLN > 0 ? (valuePLN / totalValuePLN) * 100 : 0,
    };
  }).sort((a, b) => b.value - a.value);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  const sortedHoldings = [...holdings].sort((a, b) => {
    const aVal = getPLNValue(a.shares * a.currentPrice, a.currency);
    const bVal = getPLNValue(b.shares * b.currentPrice, b.currency);
    const aProf = aVal - getPLNValue(a.shares * a.buyPrice, a.currency);
    const bProf = bVal - getPLNValue(b.shares * b.buyPrice, b.currency);

    let comp = 0;
    if (sortField === 'ticker') comp = a.name.localeCompare(b.name);
    else if (sortField === 'shares') comp = a.shares - b.shares;
    else if (sortField === 'valuePLN') comp = aVal - bVal;
    else if (sortField === 'profitLossPLN') comp = aProf - bProf;

    return sortOrder === 'asc' ? comp : -comp;
  });

  if (isPasswordResetMode) {
    return (
      <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#0b0f19', color: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ backgroundColor: '#151d30', padding: '40px', borderRadius: '16px', border: '1px solid #1e293b', maxWidth: '400px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <KeyRound size={48} color="#38bdf8" style={{ marginBottom: '10px' }} />
            <h1 style={{ margin: 0, fontSize: '24px' }}>Ustaw nowe hasło</h1>
          </div>
          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="password" required placeholder="Nowe hasło" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff' }} />
            {authError && <div style={{ color: '#ef4444', fontSize: '13px' }}>{authError}</div>}
            {authSuccess && <div style={{ color: '#22c55e', fontSize: '13px' }}>{authSuccess}</div>}
            <button type="submit" style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#38bdf8', color: '#0b0f19', fontWeight: 'bold' }}>Zapisz nowe hasło</button>
          </form>
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#0b0f19', color: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ backgroundColor: '#151d30', padding: '40px', borderRadius: '16px', border: '1px solid #1e293b', maxWidth: '400px', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <Wallet size={48} color="#38bdf8" style={{ marginBottom: '10px' }} />
              <h1 style={{ margin: 0, fontSize: '28px' }}>Kashor {APP_VERSION}</h1>
            </div>

            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Adres E-mail</label>
                <input type="email" required placeholder="twoj@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff', boxSizing: 'border-box' }} />
              </div>

              {!isForgotPassword && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ color: '#94a3b8', fontSize: '13px' }}>Hasło</label>
                    {!isSignUp && <button type="button" onClick={() => setIsForgotPassword(true)} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer' }}>Zapomniałeś hasła?</button>}
                  </div>
                  <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff', boxSizing: 'border-box' }} />
                </div>
              )}

              {authError && <div style={{ color: '#ef4444', fontSize: '13px' }}>{authError}</div>}
              {authSuccess && <div style={{ color: '#22c55e', fontSize: '13px' }}>{authSuccess}</div>}

              <button type="submit" disabled={loading} style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#38bdf8', color: '#0b0f19', fontWeight: 'bold', cursor: 'pointer' }}>
                {loading ? 'Przetwarzanie...' : isForgotPassword ? 'Wyślij link' : isSignUp ? 'Zarejestruj się' : 'Zaloguj się'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>
                {isSignUp ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
              </button>

              <button onClick={() => { setIsGuest(true); localStorage.setItem('kashor_is_guest', 'true'); }} style={{ backgroundColor: 'transparent', border: '1px dashed #334155', color: '#38bdf8', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                Kontynuuj bez rejestracji (Lokalnie)
              </button>
            </div>
          </div>
        </div>

        <footer style={{ textAlign: 'center', padding: '10px 0', color: '#475569', fontSize: '12px' }}>
          Kashor {APP_VERSION} | Kompilacja: {BUILD_TIME}
        </footer>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#0b0f19', color: '#f8fafc', minHeight: '100vh', padding: '24px 16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        
        {/* NAGŁÓWEK */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid #1e293b', paddingBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <Wallet size={32} color="#38bdf8" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#fff' }}>Kashor {APP_VERSION}</h1>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span>Status: <strong style={{ color: user ? '#22c55e' : '#eab308' }}>{user ? `Zalogowany (${user.email})` : 'Tryb Lokalny (Gość)'}</strong></span>
                <span onClick={() => setCurrencyModal({ open: true, code: 'USD', range: '1M' })} style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                  USD/PLN: <strong style={{ color: '#38bdf8' }}>{usdPln.toFixed(4)} zł</strong>
                </span>
                <span onClick={() => setCurrencyModal({ open: true, code: 'EUR', range: '1M' })} style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                  EUR/PLN: <strong style={{ color: '#a855f7' }}>{eurPln.toFixed(4)} zł</strong>
                </span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.3)', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={16} /> Importuj z XTB (CSV)
                <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
              
              <button 
                type="button"
                onClick={() => setShowXtbHelp(true)}
                title="Jak pobrać plik z XTB?"
                style={{ background: 'none', border: '1px solid #334155', borderRadius: '8px', padding: '9px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <HelpCircle size={16} />
              </button>
            </div>

            <button onClick={refreshPrices} disabled={loading || holdings.length === 0} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#151d30', color: '#38bdf8', fontWeight: '600', fontSize: '13px', cursor: loading || holdings.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'Odświeżanie...' : 'Odśwież kursy'}
            </button>

            <button onClick={clearAllHoldings} disabled={holdings.length === 0} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eraser size={16} /> Wyczyść
            </button>

            <button onClick={handleLogout} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#94a3b8', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogOut size={16} /> {user ? 'Wyloguj' : 'Wyjdź'}
            </button>
          </div>
        </header>

        {/* KARTY PODSUMOWANIA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{ backgroundColor: '#151d30', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>Wartość Portfela</span>
            <h2 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: '700' }}>{totalValuePLN.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</h2>
          </div>
          <div style={{ backgroundColor: '#151d30', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>Koszt Zakupu</span>
            <h2 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: '700' }}>{totalCostPLN.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</h2>
          </div>
          <div style={{ backgroundColor: '#151d30', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>Zysk / Strata całkowita</span>
            <h2 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: '700', color: totalProfitLossPLN >= 0 ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {totalProfitLossPLN >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              {totalProfitLossPLN >= 0 ? '+' : ''}{totalProfitLossPLN.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł ({totalProfitLossPercent.toFixed(2)}%)
            </h2>
          </div>
        </div>

        {/* WYKRES ALOKACJI */}
        <AllocationChart data={rawChartData} colors={CHART_COLORS} />

        {/* FORMULARZ Z KALENDARZEM */}
        <form onSubmit={addHolding} style={{ backgroundColor: '#151d30', padding: '20px', borderRadius: '12px', marginBottom: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap', border: '1px solid #1e293b', alignItems: 'center', position: 'relative' }}>
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value as AssetType)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#38bdf8', fontWeight: 'bold' }}
          >
            <option value="stock">Akcje</option>
            <option value="etf">ETF</option>
            <option value="commodity">Surowce</option>
            <option value="crypto">Krypto</option>
          </select>

          <div style={{ flex: 2, minWidth: '200px', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Wpisz nazwę lub ticker (np. cd proj, pko, btc)"
                value={ticker}
                onChange={(e) => handleTickerChange(e.target.value)}
                style={{ width: '100%', padding: '10px 36px 10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff', boxSizing: 'border-box' }}
              />
              <Search size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: '#64748b' }} />
            </div>

            {showSuggestions && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', borderRadius: '8px', zIndex: 100, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                {suggestions.map((s) => (
                  <div
                    key={s.symbol}
                    onClick={() => selectSuggestion(s)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: '#fff', fontSize: '14px' }}>{s.name}</div>
                      <div style={{ color: '#64748b', fontSize: '12px' }}>{s.symbol}</div>
                    </div>
                    <span style={{ fontSize: '10px', color: '#38bdf8', backgroundColor: '#151d30', padding: '2px 6px', borderRadius: '4px' }}>
                      {s.type.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <input type="number" placeholder="Liczba" value={shares} onChange={(e) => setShares(e.target.value)} style={{ flex: 1, minWidth: '90px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff' }} />
          <input type="number" step="0.01" placeholder="Cena zakupu" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} style={{ flex: 1, minWidth: '110px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff' }} />
          
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#38bdf8', fontWeight: 'bold' }}>
            <option value="PLN">PLN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              title="Data zakupu"
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#94a3b8', fontSize: '13px' }}
            />
          </div>

          <button type="submit" disabled={loading} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#38bdf8', color: '#0b0f19', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} /> Dodaj
          </button>
        </form>

        {/* TABELA AKTYWÓW Z DATĄ ZAKUPU */}
        <div style={{ backgroundColor: '#151d30', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0b0f19', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                <th onClick={() => handleSort('ticker')} style={{ padding: '14px 18px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Nazwa / Symbol
                    {sortField === 'ticker' ? (sortOrder === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />) : <ArrowUpDown size={14} color="#334155" />}
                  </div>
                </th>
                <th style={{ padding: '14px 18px' }}>Data zakupu</th>
                <th onClick={() => handleSort('shares')} style={{ padding: '14px 18px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Liczba
                    {sortField === 'shares' ? (sortOrder === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />) : <ArrowUpDown size={14} color="#334155" />}
                  </div>
                </th>
                <th style={{ padding: '14px 18px' }}>Cena zakupu</th>
                <th style={{ padding: '14px 18px' }}>Aktualny kurs</th>
                <th onClick={() => handleSort('valuePLN')} style={{ padding: '14px 18px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Wartość (PLN)
                    {sortField === 'valuePLN' ? (sortOrder === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />) : <ArrowUpDown size={14} color="#334155" />}
                  </div>
                </th>
                <th onClick={() => handleSort('profitLossPLN')} style={{ padding: '14px 18px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Wynik
                    {sortField === 'profitLossPLN' ? (sortOrder === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />) : <ArrowUpDown size={14} color="#334155" />}
                  </div>
                </th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {sortedHoldings.map((h) => {
                const currencySymbol = h.currency === 'USD' ? '$' : h.currency === 'EUR' ? '€' : 'zł';
                const valPLN = getPLNValue(h.shares * h.currentPrice, h.currency);
                const costPLN = getPLNValue(h.shares * h.buyPrice, h.currency);
                const profitPLN = valPLN - costPLN;
                const profitPct = costPLN > 0 ? (profitPLN / costPLN) * 100 : 0;

                return (
                  <tr key={h.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 18px' }}>
                      {editingId === h.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #38bdf8', backgroundColor: '#0b0f19', color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                          />
                          <button onClick={() => saveCustomName(h.id, editingNameValue)} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer' }}>
                            <Check size={18} />
                          </button>
                        </div>
                      ) : (
                        <div onClick={() => { setEditingId(h.id); setEditingNameValue(h.name); }} style={{ cursor: 'pointer' }}>
                          <div style={{ fontWeight: '700', color: '#fff', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{h.name}</span>
                            <Edit2 size={12} color="#475569" />
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{h.ticker} • {h.type.toUpperCase()}</div>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '13px', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} color="#64748b" />
                        <span>{h.purchaseDate || getTodayString()}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '14px' }}>{h.shares}</td>
                    <td style={{ padding: '14px 18px', fontSize: '14px' }}>{h.buyPrice.toFixed(2)} {currencySymbol}</td>
                    <td style={{ padding: '14px 18px', fontSize: '14px' }}>{h.currentPrice.toFixed(2)} {currencySymbol}</td>
                    <td style={{ padding: '14px 18px', fontWeight: 'bold', fontSize: '14px' }}>{valPLN.toFixed(2)} zł</td>
                    <td style={{ padding: '14px 18px', color: profitPLN >= 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold', fontSize: '14px' }}>
                      {profitPLN >= 0 ? '+' : ''}{profitPLN.toFixed(2)} zł ({profitPct.toFixed(2)}%)
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <button onClick={() => removeHolding(h.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL NBP */}
      <CurrencyModal
        open={currencyModal.open}
        code={currencyModal.code}
        range={currencyModal.range}
        history={currencyHistory}
        loading={currencyHistoryLoading}
        onClose={() => setCurrencyModal({ ...currencyModal, open: false })}
        onRangeChange={(range: '1M' | '3M' | '1R') => setCurrencyModal({ ...currencyModal, range })}
      />

      {/* MODAL POMOCY XTB */}
      {showXtbHelp && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#151d30', border: '1px solid #334155', borderRadius: '16px', padding: '24px', maxWidth: '460px', width: '100%', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={20} /> Jak pobrać CSV z XTB?
              </h3>
              <button onClick={() => setShowXtbHelp(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            
            <ol style={{ paddingLeft: '20px', margin: 0, color: '#94a3b8', fontSize: '14px', lineHeight: '1.7' }}>
              <li>Zaloguj się do platformy **xStation 5** na komputerze.</li>
              <li>Wybierz zakładkę **Moje Transakcje** w lewym pionowym menu.</li>
              <li>W prawym górnym rogu kliknij **Eksport** i wybierz format Excel (XLSX).</li>
              <li>Otwórz plik i przejdź do zakładki **Open Positions** (na dole ekranu).</li>
              <li>Kliknij **Plik &gt; Zapisz jako...** i wybierz format **Tekst CSV (.csv)**.</li>
              <li>Zaimportuj wygenerowany plik do Kashora.</li>
            </ol>

            <button onClick={() => setShowXtbHelp(false)} style={{ marginTop: '20px', width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#38bdf8', color: '#0b0f19', fontWeight: 'bold', cursor: 'pointer' }}>
              Rozumiem!
            </button>
          </div>
        </div>
      )}

      {/* STOPKA */}
      <footer style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: '12px', borderTop: '1px solid #1e293b', marginTop: '40px' }}>
        Kashor {APP_VERSION} | Kompilacja: {BUILD_TIME}
      </footer>
    </div>
  );
}
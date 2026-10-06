import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Plus, Wallet, Trash2, RefreshCw, Upload, Eraser, LogOut, Lock, Mail, UserCheck, PieChart as PieChartIcon } from 'lucide-react';
import Papa from 'papaparse';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

const APP_VERSION = 'v1.3.0';
const BUILD_TIME = '2026-10-06 15:25';

interface Holding {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  buyPrice: number;
  currentPrice: number;
  currency: string;
}

const CHART_COLORS = [
  '#38bdf8', '#22c55e', '#eab308', '#f97316', '#a855f7',
  '#ec4899', '#06b6d4', '#10b981', '#f43f5e', '#6366f1',
  '#8b5cf6', '#d946ef', '#64748b'
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('kashor_is_guest') === 'true';
  });

  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [usdPln, setUsdPln] = useState<number>(3.88);
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [loading, setLoading] = useState(false);

  // Słownik zapamiętanych nazw spółek
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      const formatted: Holding[] = data.map((item) => ({
        id: item.id,
        ticker: item.ticker,
        name: companyNames[item.ticker] || item.ticker,
        shares: Number(item.shares),
        buyPrice: Number(item.buy_price),
        currentPrice: Number(item.current_price),
        currency: item.currency,
      }));
      setHoldings(formatted);
    }
    setLoading(false);
  };

  const fetchUsdRateFromNBP = async () => {
    try {
      const response = await fetch('https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json');
      const data = await response.json();
      const rate = data?.rates?.[0]?.mid;
      if (rate) setUsdPln(rate);
    } catch (error) {
      console.error('Błąd NBP:', error);
    }
  };

  useEffect(() => {
    fetchUsdRateFromNBP();
  }, []);

  const fetchStockData = async (symbol: string) => {
    try {
      const cleanSymbol = symbol.trim().toUpperCase();
      const response = await fetch(
        `https://corsproxy.io/?${encodeURIComponent(
          `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?interval=1d&range=1d`
        )}`
      );

      if (!response.ok) return { price: null, name: cleanSymbol, currency: cleanSymbol.endsWith('.WA') ? 'PLN' : 'USD' };

      const data = await response.json();
      const meta = data?.chart?.result?.[0]?.meta;

      const price = meta?.regularMarketPrice;
      const fetchedName = meta?.shortName || meta?.longName || cleanSymbol;
      let currency = meta?.currency || (cleanSymbol.endsWith('.WA') ? 'PLN' : 'USD');

      if (fetchedName && fetchedName !== cleanSymbol) {
        setCompanyNames(prev => ({ ...prev, [cleanSymbol]: fetchedName }));
      }

      return { price: price ? parseFloat(price) : null, name: fetchedName, currency };
    } catch (error) {
      return { price: null, name: symbol, currency: symbol.endsWith('.WA') ? 'PLN' : 'USD' };
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setAuthError(error.message);
      } else {
        alert('Konto zostało utworzone! Możesz się teraz zalogować.');
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
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

    const newHoldingObj: Holding = {
      id: newId,
      ticker: cleanTicker,
      name: stockData.name,
      shares: numShares,
      buyPrice: numPrice,
      currentPrice: stockData.price !== null ? stockData.price : numPrice,
      currency: stockData.currency,
    };

    if (user) {
      const { error } = await supabase.from('holdings').insert([{
        id: newId,
        user_id: user.id,
        ticker: cleanTicker,
        shares: numShares,
        buy_price: numPrice,
        current_price: newHoldingObj.currentPrice,
        currency: stockData.currency,
      }]);

      if (error) alert('Błąd zapisu w bazie: ' + error.message);
      else fetchHoldingsFromSupabase();
    } else {
      setHoldings((prev) => [...prev, newHoldingObj]);
    }

    setTicker('');
    setShares('');
    setBuyPrice('');
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

          importedHoldings.push({
            id,
            ticker: symbol,
            name: stockData.name,
            shares: parseFloat(data.totalShares.toFixed(4)),
            buyPrice: parseFloat(avgBuyPrice.toFixed(2)),
            currentPrice: parseFloat(data.latestCurrentPrice.toFixed(2)),
            currency: symbol.endsWith('.WA') ? 'PLN' : 'USD',
          });

          if (user) {
            supabaseRows.push({
              id,
              user_id: user.id,
              ticker: symbol,
              shares: parseFloat(data.totalShares.toFixed(4)),
              buy_price: parseFloat(avgBuyPrice.toFixed(2)),
              current_price: parseFloat(data.latestCurrentPrice.toFixed(2)),
              currency: symbol.endsWith('.WA') ? 'PLN' : 'USD',
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
    await fetchUsdRateFromNBP();

    const updatedHoldings = await Promise.all(
      holdings.map(async (item) => {
        const stockData = await fetchStockData(item.ticker);
        const newPrice = stockData.price !== null ? stockData.price : item.currentPrice;

        if (user) {
          await supabase
            .from('holdings')
            .update({ current_price: newPrice, currency: stockData.currency })
            .eq('id', item.id)
            .eq('user_id', user.id);
        }

        return {
          ...item,
          name: stockData.name || item.name,
          currentPrice: newPrice,
          currency: stockData.currency,
        };
      })
    );

    setHoldings(updatedHoldings);
    setLoading(false);
  };

  const getPLNValue = (amount: number, currency: string) => {
    if (currency === 'USD') return amount * (usdPln || 3.88);
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
      name: companyNames[h.ticker] || h.name || h.ticker,
      value: parseFloat(valuePLN.toFixed(2)),
      percentNum: totalValuePLN > 0 ? (valuePLN / totalValuePLN) * 100 : 0,
    };
  }).sort((a, b) => b.value - a.value);

  if (authLoading) {
    return (
      <div style={{ backgroundColor: '#0b0f19', color: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Ładowanie Kashor...</h2>
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
              <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px' }}>Tracker portfela inwestycyjnego</p>
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

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Hasło</label>
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

              {authError && (
                <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{authError}</div>
              )}

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
                {loading ? 'Przetwarzanie...' : isSignUp ? 'Zarejestruj się' : 'Zaloguj się'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
              >
                {isSignUp ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
              </button>

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
      
      <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '24px 16px' }}>
        
        {/* NAGŁÓWEK */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid #1e293b', paddingBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <Wallet size={32} color="#38bdf8" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', color: '#fff' }}>Kashor</h1>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>Status: <strong style={{ color: user ? '#22c55e' : '#eab308' }}>{user ? `Zalogowany (${user.email})` : 'Tryb Lokalny (Gość)'}</strong></span>
                <span>USD/PLN: <strong style={{ color: '#38bdf8' }}>{usdPln ? `${usdPln.toFixed(4)} zł` : '...'}</strong></span>
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

        {/* MODUŁ WYKRESU ALOKACJI DWRUKOLUMNOWY */}
        {holdings.length > 0 && (
          <div style={{ backgroundColor: '#151d30', padding: '24px', borderRadius: '16px', marginBottom: '28px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <PieChartIcon size={20} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>Struktura i Alokacja Portfela</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center' }}>
              
              {/* WYKRES KOŁOWY */}
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

              {/* DEDYKOWANA, DOWOLNIE PRZEWIJANA LEGENDA Z PEŁNYMI NAZWAMI */}
              <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rawChartData.map((item, index) => (
                    <div key={item.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0b0f19', border: '1px solid #1e293b', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: CHART_COLORS[index % CHART_COLORS.length], flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '700', color: '#fff' }}>{item.ticker}</span>
                          <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{item.name}</span>
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

        {/* FORMULARZ DODAWANIA AKCJI */}
        <form onSubmit={addHolding} style={{ backgroundColor: '#151d30', padding: '20px', borderRadius: '12px', marginBottom: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap', border: '1px solid #1e293b' }}>
          <input
            type="text"
            placeholder="Ticker (np. PKO.WA, AAPL)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            style={{ flex: 1, minWidth: '160px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff', fontSize: '14px' }}
          />
          <input
            type="number"
            placeholder="Liczba akcji"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            style={{ flex: 1, minWidth: '120px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff', fontSize: '14px' }}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Cena zakupu"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            style={{ flex: 1, minWidth: '160px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff', fontSize: '14px' }}
          />
          <button type="submit" disabled={loading} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#38bdf8', color: '#0b0f19', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} /> Dodaj Akcję
          </button>
        </form>

        {/* TABELA POSIADANYCH AKCJI */}
        <div style={{ backgroundColor: '#151d30', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
          {holdings.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Portfel jest pusty. Zaimportuj plik z XTB lub dodaj akcje ręcznie powyżej!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0b0f19', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '14px 18px' }}>Symbol / Spółka</th>
                    <th style={{ padding: '14px 18px' }}>Ilość</th>
                    <th style={{ padding: '14px 18px' }}>Śr. cena zakupu</th>
                    <th style={{ padding: '14px 18px' }}>Aktualny kurs</th>
                    <th style={{ padding: '14px 18px' }}>Wartość (PLN)</th>
                    <th style={{ padding: '14px 18px' }}>Wynik (PLN)</th>
                    <th style={{ padding: '14px 18px', textAlign: 'center' }}>Akcja</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => {
                    const currencySymbol = h.currency === 'USD' ? '$' : 'zł';
                    const holdingCostPLN = getPLNValue(h.shares * h.buyPrice, h.currency);
                    const holdingValuePLN = getPLNValue(h.shares * h.currentPrice, h.currency);
                    const profitLossPLN = holdingValuePLN - holdingCostPLN;
                    const profitLossPercent = holdingCostPLN > 0 ? (profitLossPLN / holdingCostPLN) * 100 : 0;
                    const isProfit = profitLossPLN >= 0;
                    const displayName = companyNames[h.ticker] || h.name || h.ticker;

                    return (
                      <tr key={h.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: '700', color: '#fff', fontSize: '14px' }}>{h.ticker}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{displayName}</div>
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

      <footer style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: '12px', borderTop: '1px solid #1e293b', marginTop: '40px' }}>
        Kashor {APP_VERSION} | Ostatnia kompilacja: {BUILD_TIME}
      </footer>
    </div>
  );
}
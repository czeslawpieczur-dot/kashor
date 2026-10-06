import React, { useState, useEffect } from 'react';
import { Wallet, RefreshCw, Upload, Eraser, LogOut, Search, Plus, Trash2, Edit2, Check, ArrowUpDown, ArrowUp, ArrowDown, PieChart as PieChartIcon, TrendingUp, TrendingDown, KeyRound, Mail, Lock, UserCheck, X, LineChart as LineChartIcon } from 'lucide-react';
import Papa from 'papaparse';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';
import { Holding, TickerSuggestion, SortField, SortOrder, AssetType, CurrencyHistoryPoint } from './types';
import { searchGlobalBaza } from './services/knownCompanies';
import { fetchStockPriceAndName, fetchNbpRates } from './services/apiService';

const APP_VERSION = 'v2.0.0';
const BUILD_TIME = '2026-10-06 18:40';

const CHART_COLORS = [
  '#38bdf8', '#22c55e', '#eab308', '#f97316', '#a855f7',
  '#ec4899', '#06b6d4', '#10b981', '#f43f5e', '#6366f1',
  '#8b5cf6', '#d946ef', '#64748b'
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => localStorage.getItem('kashor_is_guest') === 'true');

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
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [loading, setLoading] = useState(false);

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
      setAuthLoading(false);
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
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchNbpRates().then(rates => {
      setUsdPln(rates.usd);
      setEurPln(rates.eur);
    });
  }, []);

  useEffect(() => {
    if (user) {
      fetchHoldingsFromSupabase();
    } else if (isGuest) {
      const saved = localStorage.getItem('kashor_holdings');
      if (saved) {
        try { setHoldings(JSON.parse(saved)); } catch (e) { console.error(e); }
      }
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
    const { data } = await supabase.from('holdings').select('*').eq('user_id', user.id);
    if (data) {
      const formatted: Holding[] = data.map(item => ({
        id: item.id,
        ticker: item.ticker,
        name: item.name || item.ticker,
        type: item.type || 'stock',
        shares: Number(item.shares),
        buyPrice: Number(item.buy_price),
        currentPrice: Number(item.current_price),
        currency: item.currency || 'PLN',
      }));
      setHoldings(formatted);
    }
    setLoading(false);
  };

  const handleTickerChange = (value: string) => {
    setTicker(value);
    setSelectedName('');

    if (value.trim().length >= 1) {
      const results = searchGlobalBaza(value);
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
    const newId = Date.now().toString();

    const newHoldingObj: Holding = {
      id: newId,
      ticker: cleanTicker,
      name: stockData.name,
      type: assetType,
      shares: numShares,
      buyPrice: numPrice,
      currentPrice: stockData.price !== null ? stockData.price : numPrice,
      currency: currency || stockData.currency,
    };

    if (user) {
      await supabase.from('holdings').insert([{
        id: newId,
        user_id: user.id,
        ticker: cleanTicker,
        name: stockData.name,
        type: assetType,
        shares: numShares,
        buy_price: numPrice,
        current_price: newHoldingObj.currentPrice,
        currency: newHoldingObj.currency,
      }]);
      fetchHoldingsFromSupabase();
    } else {
      setHoldings(prev => [...prev, newHoldingObj]);
    }

    setTicker('');
    setSelectedName('');
    setShares('');
    setBuyPrice('');
    setShowSuggestions(false);
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

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#0b0f19', color: '#f8fafc', minHeight: '100vh', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid #1e293b', paddingBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <Wallet size={32} color="#38bdf8" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#fff' }}>Kashor v2.0</h1>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                USD/PLN: <strong style={{ color: '#38bdf8' }}>{usdPln.toFixed(4)} zł</strong> | EUR/PLN: <strong style={{ color: '#a855f7' }}>{eurPln.toFixed(4)} zł</strong>
              </p>
            </div>
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
            <span style={{ color: '#64748b', fontSize: '13px' }}>Zysk / Strata</span>
            <h2 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: '700', color: totalProfitLossPLN >= 0 ? '#22c55e' : '#ef4444' }}>
              {totalProfitLossPLN >= 0 ? '+' : ''}{totalProfitLossPLN.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł ({totalProfitLossPercent.toFixed(2)}%)
            </h2>
          </div>
        </div>

        {/* FORMULARZ Z SZYBKIM BŁYSKAWICZNYM AUTOCOMPLETE */}
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
            <input
              type="text"
              placeholder="Wpisz nazwę lub ticker (np. cd proj, pko, btc)"
              value={ticker}
              onChange={(e) => handleTickerChange(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff', boxSizing: 'border-box' }}
            />

            {showSuggestions && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', borderRadius: '8px', zIndex: 100, maxHeight: '250px', overflowY: 'auto' }}>
                {suggestions.map((s) => (
                  <div
                    key={s.symbol}
                    onClick={() => selectSuggestion(s)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between' }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: '#fff', fontSize: '14px' }}>{s.name}</div>
                      <div style={{ color: '#64748b', fontSize: '12px' }}>{s.symbol}</div>
                    </div>
                    <span style={{ fontSize: '10px', color: '#38bdf8', backgroundColor: '#151d30', padding: '2px 6px', borderRadius: '4px', height: 'fit-content' }}>
                      {s.type.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <input type="number" placeholder="Liczba" value={shares} onChange={(e) => setShares(e.target.value)} style={{ flex: 1, minWidth: '100px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff' }} />
          <input type="number" step="0.01" placeholder="Cena zakupu" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#fff' }} />
          
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f19', color: '#38bdf8', fontWeight: 'bold' }}>
            <option value="PLN">PLN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>

          <button type="submit" disabled={loading} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#38bdf8', color: '#0b0f19', fontWeight: 'bold', cursor: 'pointer' }}>
            Dodaj
          </button>
        </form>

        {/* TABELA AKTYWÓW */}
        <div style={{ backgroundColor: '#151d30', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0b0f19', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 18px' }}>Nazwa / Symbol</th>
                <th style={{ padding: '14px 18px' }}>Liczba</th>
                <th style={{ padding: '14px 18px' }}>Cena zakupu</th>
                <th style={{ padding: '14px 18px' }}>Aktualny kurs</th>
                <th style={{ padding: '14px 18px' }}>Wartość (PLN)</th>
                <th style={{ padding: '14px 18px' }}>Wynik</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const valPLN = getPLNValue(h.shares * h.currentPrice, h.currency);
                const costPLN = getPLNValue(h.shares * h.buyPrice, h.currency);
                const profitPLN = valPLN - costPLN;
                const profitPct = costPLN > 0 ? (profitPLN / costPLN) * 100 : 0;

                return (
                  <tr key={h.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: '700', color: '#fff', fontSize: '15px' }}>{h.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{h.ticker} • {h.type.toUpperCase()}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>{h.shares}</td>
                    <td style={{ padding: '14px 18px' }}>{h.buyPrice.toFixed(2)} {h.currency}</td>
                    <td style={{ padding: '14px 18px' }}>{h.currentPrice.toFixed(2)} {h.currency}</td>
                    <td style={{ padding: '14px 18px', fontWeight: 'bold' }}>{valPLN.toFixed(2)} zł</td>
                    <td style={{ padding: '14px 18px', color: profitPLN >= 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
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
    </div>
  );
}
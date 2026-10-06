import React from 'react';
import { LineChart as LineChartIcon, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { CurrencyHistoryPoint } from '../types';

export interface CurrencyModalProps {
  open: boolean;
  code: 'USD' | 'EUR';
  range: '1M' | '3M' | '1R';
  history: CurrencyHistoryPoint[];
  loading: boolean;
  onClose: () => void;
  onRangeChange: (range: '1M' | '3M' | '1R') => void;
}

export const CurrencyModal: React.FC<CurrencyModalProps> = ({
  open, code, range, history, loading, onClose, onRangeChange
}) => {
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ backgroundColor: '#151d30', border: '1px solid #334155', borderRadius: '16px', maxWidth: '600px', width: '100%', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LineChartIcon size={24} color="#38bdf8" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Kurs {code}/PLN (NBP)</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {(['1M', '3M', '1R'] as const).map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: range === r ? '#38bdf8' : '#0b0f19',
                color: range === r ? '#0b0f19' : '#94a3b8',
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
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Pobieranie historii kursu z NBP...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
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
  );
};

export default CurrencyModal;
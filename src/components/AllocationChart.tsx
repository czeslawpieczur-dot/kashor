import React from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ChartItem {
  ticker: string;
  name: string;
  value: number;
  percentNum: number;
}

interface AllocationChartProps {
  data: ChartItem[];
  colors: string[];
}

export const AllocationChart: React.FC<AllocationChartProps> = ({ data, colors }) => {
  if (data.length === 0) return null;

  return (
    <div style={{ backgroundColor: '#151d30', padding: '24px', borderRadius: '16px', marginBottom: '28px', border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <PieChartIcon size={20} color="#38bdf8" />
        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>Struktura i Alokacja Portfela</h3>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center' }}>
        <div style={{ height: '260px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2} dataKey="value">
                {data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="#151d30" strokeWidth={2} />
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

        <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.map((item, index) => (
              <div key={item.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0b0f19', border: '1px solid #1e293b', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colors[index % colors.length], flexShrink: 0 }} />
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
  );
};
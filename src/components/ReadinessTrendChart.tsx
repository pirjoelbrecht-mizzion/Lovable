import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getReadinessHistory } from '@/lib/database';
import { useT } from '@/i18n';
import type { DbReadinessScore } from '@/lib/database';

type ReadinessTrendChartProps = {
  defaultDays?: 7 | 14;
};

export default function ReadinessTrendChart({ defaultDays = 7 }: ReadinessTrendChartProps) {
  const t = useT();
  const [days, setDays] = useState<7 | 14>(defaultDays);
  const [data, setData] = useState<DbReadinessScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const history = await getReadinessHistory(days);
        setData(history);
      } catch (error) {
        console.error('Failed to fetch readiness history:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [days]);

  if (loading) {
    return (
      <div className="card" style={{ minHeight: 280 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
          <div className="small" style={{ color: 'var(--muted)' }}>
            {t('readiness.loading_trend', 'Loading trend...')}
          </div>
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: item.value,
    category: item.category,
  }));

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'high':
        return '#22c55e';
      case 'moderate':
        return '#eab308';
      case 'low':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const color = getCategoryColor(payload.category);
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={color}
        stroke="var(--card)"
        strokeWidth={2}
      />
    );
  };

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="h2">{t('readiness.trend_title', 'Readiness Trend')}</h3>
        <div className="row" style={{ gap: 8 }}>
          <button
            className={`btn small ${days === 7 ? 'primary' : ''}`}
            onClick={() => setDays(7)}
            style={{ fontSize: 12 }}
          >
            {t('readiness.last_7_days', '7 Days')}
          </button>
          <button
            className={`btn small ${days === 14 ? 'primary' : ''}`}
            onClick={() => setDays(14)}
            style={{ fontSize: 12 }}
          >
            {t('readiness.last_14_days', '14 Days')}
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📊</div>
          <div className="small" style={{ color: 'var(--muted)', marginBottom: 8 }}>
            {t('readiness.no_trend_data', 'No readiness data available yet')}
          </div>
          <div className="small" style={{ color: 'var(--muted)', fontSize: 11 }}>
            Log your sleep, HRV, and training to track your readiness over time
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.3} />

            <XAxis
              dataKey="date"
              stroke="var(--muted)"
              style={{ fontSize: 12 }}
              tick={{ fill: 'var(--muted)' }}
            />

            <YAxis
              domain={[0, 100]}
              stroke="var(--muted)"
              style={{ fontSize: 12 }}
              tick={{ fill: 'var(--muted)' }}
            />

            <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="3 3" opacity={0.3} />
            <ReferenceLine y={60} stroke="#eab308" strokeDasharray="3 3" opacity={0.3} />

            <Tooltip
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value}`, 'Score']}
              labelStyle={{ color: 'var(--text)' }}
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--brand)"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="row" style={{ gap: 16, marginTop: 16, justifyContent: 'center' }}>
        <div className="row small" style={{ gap: 6, alignItems: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
          <span>{t('readiness.high', 'High (80+)')}</span>
        </div>
        <div className="row small" style={{ gap: 6, alignItems: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308' }} />
          <span>{t('readiness.moderate', 'Moderate (60-79)')}</span>
        </div>
        <div className="row small" style={{ gap: 6, alignItems: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
          <span>{t('readiness.low', 'Low (<60)')}</span>
        </div>
      </div>
    </div>
  );
}

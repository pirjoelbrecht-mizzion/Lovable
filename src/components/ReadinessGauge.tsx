import { motion } from 'framer-motion';

type ReadinessGaugeProps = {
  value: number;
  category: 'high' | 'moderate' | 'low';
  trend?: number;
  size?: number;
};

export default function ReadinessGauge({ value, category, trend, size = 100 }: ReadinessGaugeProps) {
  const radius = (size / 2) - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const categoryColors = {
    high: '#22c55e',
    moderate: '#eab308',
    low: '#ef4444',
  };

  const color = categoryColors[category];

  return (
    <div className="readiness-gauge" style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth="8"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{ fontSize: size * 0.28, fontWeight: 700, lineHeight: 1, color }}
        >
          {value}
        </motion.div>
        {trend !== undefined && trend !== 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            style={{
              fontSize: size * 0.12,
              marginTop: 2,
              color: trend > 0 ? '#22c55e' : '#ef4444',
            }}
          >
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}
          </motion.div>
        )}
      </div>
    </div>
  );
}

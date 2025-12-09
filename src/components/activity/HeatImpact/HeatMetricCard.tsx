import React from 'react';

interface HeatMetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  severity?: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
}

export function HeatMetricCard({ icon, label, value, unit, severity }: HeatMetricCardProps) {
  const getSeverityColor = () => {
    switch (severity) {
      case 'LOW':
        return 'text-green-600 dark:text-green-400';
      case 'MODERATE':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'HIGH':
        return 'text-orange-600 dark:text-orange-400';
      case 'EXTREME':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="text-gray-500 dark:text-gray-400 flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
            {label}
          </div>
          <div className={`text-2xl font-bold ${getSeverityColor()}`}>
            {value}
            {unit && <span className="text-sm ml-1">{unit}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

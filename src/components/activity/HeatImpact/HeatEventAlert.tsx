import React from 'react';
import { Heart, Activity, AlertTriangle, Flame, Droplet } from 'lucide-react';

interface HeatEventAlertProps {
  event: {
    km: number;
    description: string;
    severity: 'LOW' | 'MODERATE' | 'HIGH';
    icon?: string;
  };
}

export function HeatEventAlert({ event }: HeatEventAlertProps) {
  const getSeverityStyles = () => {
    switch (event.severity) {
      case 'LOW':
        return {
          border: 'border-l-green-500',
          bg: 'bg-green-50 dark:bg-green-900/10',
          iconColor: 'text-green-600 dark:text-green-400',
          badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
        };
      case 'MODERATE':
        return {
          border: 'border-l-yellow-500',
          bg: 'bg-yellow-50 dark:bg-yellow-900/10',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
        };
      case 'HIGH':
        return {
          border: 'border-l-red-500',
          bg: 'bg-red-50 dark:bg-red-900/10',
          iconColor: 'text-red-600 dark:text-red-400',
          badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
        };
      default:
        return {
          border: 'border-l-gray-300',
          bg: 'bg-gray-50 dark:bg-gray-800',
          iconColor: 'text-gray-600 dark:text-gray-400',
          badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
        };
    }
  };

  const getIcon = () => {
    const iconClass = `w-5 h-5 ${getSeverityStyles().iconColor}`;

    switch (event.icon) {
      case 'heart':
        return <Heart className={iconClass} />;
      case 'pace':
        return <Activity className={iconClass} />;
      case 'warning':
        return <AlertTriangle className={iconClass} />;
      case 'flame':
        return <Flame className={iconClass} />;
      case 'droplet':
        return <Droplet className={iconClass} />;
      default:
        return <AlertTriangle className={iconClass} />;
    }
  };

  const styles = getSeverityStyles();

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border-l-4 ${styles.border} ${styles.bg} shadow-sm`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
          {event.description}
        </p>
      </div>
      <div className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold ${styles.badge}`}>
        {event.km.toFixed(1)} km
      </div>
    </div>
  );
}

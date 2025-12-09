import React from 'react';
import { Droplet, Gauge, Snowflake, ShirtIcon, Thermometer, CheckCircle2 } from 'lucide-react';

interface HeatRecommendationCardProps {
  category: 'hydration' | 'pacing' | 'cooling' | 'clothing' | 'acclimation';
  recommendations: string[];
  severity?: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
}

export function HeatRecommendationCard({ category, recommendations, severity }: HeatRecommendationCardProps) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const getCategoryConfig = () => {
    switch (category) {
      case 'hydration':
        return {
          icon: <Droplet className="w-5 h-5" />,
          title: 'Hydration Strategy',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/10'
        };
      case 'pacing':
        return {
          icon: <Gauge className="w-5 h-5" />,
          title: 'Pacing Adjustments',
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-900/10'
        };
      case 'cooling':
        return {
          icon: <Snowflake className="w-5 h-5" />,
          title: 'Cooling Techniques',
          color: 'text-cyan-600 dark:text-cyan-400',
          bgColor: 'bg-cyan-50 dark:bg-cyan-900/10'
        };
      case 'clothing':
        return {
          icon: <ShirtIcon className="w-5 h-5" />,
          title: 'Gear & Clothing',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/10'
        };
      case 'acclimation':
        return {
          icon: <Thermometer className="w-5 h-5" />,
          title: 'Heat Acclimation',
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/10'
        };
      default:
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          title: 'Recommendations',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-800'
        };
    }
  };

  const getSeverityBgColor = () => {
    if (severity === 'HIGH' || severity === 'EXTREME') {
      return 'bg-orange-50 dark:bg-orange-900/10';
    }
    return 'bg-green-50 dark:bg-green-900/10';
  };

  const config = getCategoryConfig();

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${getSeverityBgColor()}`}>
      <div className={`flex items-center gap-3 p-4 ${config.bgColor} border-b border-gray-200 dark:border-gray-700`}>
        <div className={config.color}>
          {config.icon}
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {config.title}
        </h3>
      </div>
      <div className="p-4">
        <ul className="space-y-2">
          {recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

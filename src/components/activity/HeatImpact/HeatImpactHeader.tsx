import React from 'react';
import { Flame } from 'lucide-react';

interface HeatImpactHeaderProps {
  score: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
}

export function HeatImpactHeader({ score, severity }: HeatImpactHeaderProps) {
  const getSeverityConfig = () => {
    switch (severity) {
      case 'LOW':
        return {
          gradient: 'from-green-500 to-emerald-600',
          textColor: 'text-green-50',
          title: 'Low Heat Impact',
          subtitle: 'Minimal heat stress detected - conditions were favorable'
        };
      case 'MODERATE':
        return {
          gradient: 'from-yellow-500 to-amber-600',
          textColor: 'text-yellow-50',
          title: 'Moderate Heat Impact',
          subtitle: 'Noticeable heat stress - performance slightly affected'
        };
      case 'HIGH':
        return {
          gradient: 'from-orange-500 to-red-600',
          textColor: 'text-orange-50',
          title: 'High Heat Impact',
          subtitle: 'Significant heat stress - performance notably affected'
        };
      case 'EXTREME':
        return {
          gradient: 'from-red-600 to-rose-700',
          textColor: 'text-red-50',
          title: 'Extreme Heat Impact',
          subtitle: 'Severe heat stress - major performance impact and safety concerns'
        };
      default:
        return {
          gradient: 'from-gray-500 to-gray-600',
          textColor: 'text-gray-50',
          title: 'Heat Impact Analysis',
          subtitle: 'Analysis complete'
        };
    }
  };

  const config = getSeverityConfig();

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${config.gradient} p-6 shadow-lg relative overflow-hidden`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 transform rotate-12">
          <Flame className="w-full h-full" />
        </div>
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Flame className={`w-6 h-6 ${config.textColor}`} />
            <h2 className={`text-2xl font-bold ${config.textColor}`}>
              {config.title}
            </h2>
          </div>
          <p className={`text-sm ${config.textColor} opacity-90`}>
            {config.subtitle}
          </p>
        </div>

        {/* Score badge */}
        <div className="flex-shrink-0 ml-6">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
            <div className="text-center">
              <div className={`text-2xl font-bold ${config.textColor}`}>
                {score}
              </div>
              <div className={`text-xs ${config.textColor} opacity-80`}>
                / 100
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

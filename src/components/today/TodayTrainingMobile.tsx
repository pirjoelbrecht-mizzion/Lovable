import { FC } from 'react';
import { TrainingSummaryCard } from './TrainingSummaryCard';
import { WeatherTimelineCompact } from './WeatherTimelineCompact';
import { RouteSuggestionCard } from './RouteSuggestionCard';
import { PaceSuggestionCard } from './PaceSuggestionCard';
import { GearSuggestionCard } from './GearSuggestionCard';
import { InstructionsCard } from './InstructionsCard';
import { TodayActions } from './TodayActions';
import type { HydrationNeeds, FuelingNeeds } from '@/lib/environmental-learning/hydration';

export interface TodayTrainingData {
  summary: {
    title: string;
    duration: string;
    distance: string;
    pace: string;
  };
  weather: {
    current: { temp: number; summary: string };
    hours: Array<{
      time: string;
      temp: number;
      icon: string;
      precipitation?: number;
      windSpeed?: number;
    }>;
  };
  route: {
    id: string;
    name: string;
    distance: number;
    elevation: string;
    thumbnail?: string;
    surface?: string;
  };
  pace: {
    suggested: string;
    explanation: string;
    confidence: number;
  };
  gear: {
    items: string[];
    temperature: number;
    conditions: string;
  };
  hydration?: HydrationNeeds;
  fueling?: FuelingNeeds;
  instructions: {
    text: string;
    coachTip?: string;
  };
}

interface Props {
  data: TodayTrainingData;
  onComplete?: () => void;
  onEdit?: () => void;
  onSkip?: () => void;
  onRouteChange?: () => void;
}

export const TodayTrainingMobile: FC<Props> = ({
  data,
  onComplete,
  onEdit,
  onSkip,
  onRouteChange,
}) => {
  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 bg-bg-light dark:bg-bg-dark">
      <TrainingSummaryCard
        title={data.summary.title}
        duration={data.summary.duration}
        distance={data.summary.distance}
        pace={data.summary.pace}
        status="today"
      />

      <WeatherTimelineCompact
        current={data.weather.current}
        hours={data.weather.hours}
      />

      <RouteSuggestionCard
        route={data.route}
        onChange={onRouteChange}
        matchScore={0.85}
      />

      <PaceSuggestionCard
        pace={data.pace.suggested}
        explanation={data.pace.explanation}
        confidence={data.pace.confidence}
      />

      {data.hydration && (
        <div className="p-4 rounded-2xl bg-surface1-light dark:bg-surface1-dark shadow-elevated">
          <h3 className="text-sm font-semibold text-primary-light dark:text-primary-dark mb-2">
            Hydration & Fueling
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-muted-light dark:text-muted-dark">
              <span>Hydration needed:</span>
              <span className="font-medium text-primary-light dark:text-primary-dark">
                {data.hydration.liters}L ({data.hydration.litersPerHour}L/hr)
              </span>
            </div>

            {data.fueling && (
              <div className="flex justify-between text-muted-light dark:text-muted-dark">
                <span>Carbs needed:</span>
                <span className="font-medium text-primary-light dark:text-primary-dark">
                  {data.fueling.totalCarbs}g ({data.fueling.carbsPerHour}g/hr)
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-700 dark:border-gray-600">
              <p className="text-success font-medium mb-1">💧 Carry:</p>
              <p className="text-muted-light dark:text-muted-dark">
                {data.hydration.carryAmount}
              </p>
            </div>

            {data.hydration.recommendations.length > 0 && (
              <div className="pt-2">
                <p className="text-muted-light dark:text-muted-dark">
                  {data.hydration.recommendations[0]}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <GearSuggestionCard
        items={data.gear.items}
        temperature={data.gear.temperature}
        conditions={data.gear.conditions}
      />

      <InstructionsCard
        text={data.instructions.text}
        coachTip={data.instructions.coachTip}
      />

      <TodayActions
        onComplete={onComplete}
        onEdit={onEdit}
        onSkip={onSkip}
      />
    </div>
  );
};

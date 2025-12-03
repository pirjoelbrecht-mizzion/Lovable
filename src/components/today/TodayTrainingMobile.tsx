import { FC, useState } from 'react';
import { TodayTrainingTabs } from './TodayTrainingTabs';
import { OverviewTab } from './OverviewTab';
import { IntelligenceTab } from './IntelligenceTab';
import { PreparationTab } from './PreparationTab';
import { RouteSelectionModal } from './RouteSelectionModal';
import { useEnhancedTodayTraining } from '@/hooks/useEnhancedTodayTraining';
import type { DbSavedRoute } from '@/lib/database';

export interface TodayTrainingData {
  type: string;
  duration: string;
  distance?: string;
  pace?: string;
  isToday: boolean;
  isAdapted?: boolean;
}

interface Props {
  data: TodayTrainingData;
  onComplete?: () => void;
  onEdit?: () => void;
  onSkip?: () => void;
}

export const TodayTrainingMobile: FC<Props> = ({
  data,
  onComplete,
  onEdit,
  onSkip,
}) => {
  const {
    data: trainingData,
    loading,
    error,
    activeTab,
    setActiveTab,
    refreshWeather,
    refetch,
  } = useEnhancedTodayTraining(data);

  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<DbSavedRoute | null>(null);
  const [checklistComplete, setChecklistComplete] = useState(false);

  const handleRouteSelect = (route: DbSavedRoute) => {
    setSelectedRoute(route);
    setShowRouteModal(false);
  };

  const handleStart = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const currentHour = new Date().getHours();
  const timeOfDay = currentHour < 6 ? 'night'
    : currentHour < 12 ? 'morning'
    : currentHour < 18 ? 'afternoon'
    : currentHour < 21 ? 'evening'
    : 'night';

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-light dark:text-muted-dark">Loading your training plan...</p>
        </div>
      </div>
    );
  }

  if (error || !trainingData) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-primary-light dark:text-primary-dark mb-2">
            Unable to load training data
          </p>
          <button
            onClick={() => refetch()}
            className="text-sm text-primary-light dark:text-primary-dark hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{
        width: '100%',
        maxWidth: '448px',
        margin: '0 auto',
        height: '100vh',
        backgroundColor: '#0f1014',
        overflow: 'hidden'
      }}>
        <TodayTrainingTabs activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === 'overview' && (
            <OverviewTab
              workoutData={trainingData.workout}
              readiness={trainingData.readiness}
              weather={trainingData.weather}
              streak={trainingData.streak}
              xpToEarn={trainingData.xpToEarn}
              daysToRace={trainingData.daysToRace}
              coachMessage={trainingData.coachMessage}
              onStart={handleStart}
              onRefreshWeather={refreshWeather}
            />
          )}

          {activeTab === 'intelligence' && (
            <IntelligenceTab
              paceData={trainingData.paceData}
              hrZones={trainingData.hrZones}
              route={selectedRoute || trainingData.route}
              alternativeRoutes={trainingData.alternativeRoutes}
              hydration={trainingData.hydration}
              fueling={trainingData.fueling}
              onRouteSelect={() => setShowRouteModal(true)}
            />
          )}

          {activeTab === 'preparation' && trainingData.weather && (
            <PreparationTab
              temperature={trainingData.weather.current.temp}
              duration={trainingData.workout.durationMin}
              timeOfDay={timeOfDay}
              uvIndex={trainingData.weather.uvIndex}
              workoutType={trainingData.workout.type}
              onChecklistComplete={setChecklistComplete}
            />
          )}
        </TodayTrainingTabs>
      </div>

      <RouteSelectionModal
        isOpen={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        onSelect={handleRouteSelect}
        currentRoute={selectedRoute || trainingData.route}
        targetDistance={trainingData.workout.distanceKm}
        location={trainingData.location}
      />
    </>
  );
};

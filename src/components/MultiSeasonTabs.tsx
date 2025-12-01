import { useState } from 'react';
import type { MacrocycleGroup } from '@/types/seasonPlan';
import SeasonWheel from './SeasonWheel';
import SeasonTimeline from './SeasonTimeline';

interface MultiSeasonTabsProps {
  macrocycleGroups: MacrocycleGroup[];
  viewMode: 'circular' | 'linear';
}

export default function MultiSeasonTabs({ macrocycleGroups, viewMode }: MultiSeasonTabsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (macrocycleGroups.length === 0) {
    return (
      <div className="card" style={{ padding: 20, textAlign: 'center' }}>
        <p className="small" style={{ color: 'var(--muted)' }}>
          No macrocycle groups available
        </p>
      </div>
    );
  }

  const selectedGroup = macrocycleGroups[selectedIndex];
  const seasonStart = selectedGroup.macrocycles[0].startDate;
  const seasonEnd = selectedGroup.macrocycles[selectedGroup.macrocycles.length - 1].endDate;
  const totalWeeks = selectedGroup.macrocycles.reduce((sum, m) => sum + m.durationWeeks, 0);

  const seasonPlan = {
    raceId: selectedGroup.raceId,
    raceName: selectedGroup.raceName,
    seasonStart,
    seasonEnd,
    totalWeeks,
    macrocycles: selectedGroup.macrocycles,
    macrocycleGroups: [selectedGroup],
    isManual: false,
    lastGenerated: new Date().toISOString(),
  };

  return (
    <div>
      {macrocycleGroups.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {macrocycleGroups.map((group, index) => {
              const isSelected = index === selectedIndex;
              const raceDate = new Date(group.raceDate);
              const isPast = raceDate < new Date();

              return (
                <button
                  key={index}
                  className={`btn ${isSelected ? 'primary' : ''}`}
                  onClick={() => setSelectedIndex(index)}
                  style={{
                    opacity: isPast ? 0.6 : 1,
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: isSelected ? 'white' : 'var(--brand)',
                        color: isSelected ? 'var(--brand)' : 'white',
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: '20px',
                        textAlign: 'center',
                      }}
                    >
                      {group.priority}
                    </span>
                    <span>{group.raceName}</span>
                  </div>
                  <div className="small" style={{ marginTop: 4, opacity: 0.8 }}>
                    {raceDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  {isPast && (
                    <div
                      className="small"
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        background: 'var(--muted)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 9,
                      }}
                    >
                      Past
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
          <div>
            <h3 className="h2" style={{ margin: 0 }}>
              {selectedGroup.raceName}
            </h3>
            <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
              {new Date(selectedGroup.raceDate).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
          <div
            style={{
              padding: '6px 12px',
              background: 'var(--brand-bg)',
              border: '1px solid var(--brand)',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--brand)',
            }}
          >
            Priority {selectedGroup.priority}
          </div>
        </div>

        {selectedGroup.tuneUpRaces && selectedGroup.tuneUpRaces.length > 0 && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              background: 'var(--bg-secondary)',
              borderRadius: 6,
            }}
          >
            <div className="small" style={{ fontWeight: 600, marginBottom: 8 }}>
              Tune-up Races ({selectedGroup.tuneUpRaces.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selectedGroup.tuneUpRaces.map((race, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--bg)',
                    borderRadius: 4,
                    border: '1px solid var(--line)',
                    fontSize: 12,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{race.priority}</span>
                  <span style={{ margin: '0 6px', color: 'var(--muted)' }}>·</span>
                  <span>{race.name}</span>
                  <span style={{ marginLeft: 6, color: 'var(--muted)' }}>
                    ({new Date(race.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'circular' ? (
          <SeasonWheel seasonPlan={seasonPlan} />
        ) : (
          <SeasonTimeline seasonPlan={seasonPlan} />
        )}

        <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 6 }}>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="small" style={{ color: 'var(--muted)' }}>Total Duration</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{totalWeeks} weeks</div>
            </div>
            <div>
              <div className="small" style={{ color: 'var(--muted)' }}>Training Start</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>
                {new Date(seasonStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div>
              <div className="small" style={{ color: 'var(--muted)' }}>Recovery End</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>
                {new Date(seasonEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div>
              <div className="small" style={{ color: 'var(--muted)' }}>Base Phase</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>
                {selectedGroup.macrocycles.find(m => m.phase === 'base_building')?.durationWeeks || 0}w
              </div>
            </div>
            <div>
              <div className="small" style={{ color: 'var(--muted)' }}>Sharpen Phase</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>
                {selectedGroup.macrocycles.find(m => m.phase === 'sharpening')?.durationWeeks || 0}w
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

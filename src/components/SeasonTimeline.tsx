import type { SeasonPlan, Macrocycle } from '@/types/seasonPlan';

interface SeasonTimelineProps {
  seasonPlan: SeasonPlan;
  showTodayMarker?: boolean;
}

export default function SeasonTimeline({ seasonPlan, showTodayMarker = true }: SeasonTimelineProps) {
  const allRaceMarkers = seasonPlan.macrocycleGroups || [];
  const today = new Date();
  const seasonStartDate = new Date(seasonPlan.seasonStart);
  const seasonEndDate = new Date(seasonPlan.seasonEnd);
  const totalDays = (seasonEndDate.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24);

  const getPositionPercent = (date: Date): number => {
    const daysSinceStart = (date.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24);
    return (daysSinceStart / totalDays) * 100;
  };

  const todayPercent = getPositionPercent(today);
  const isActive = todayPercent >= 0 && todayPercent <= 100;

  const tuneUpRaces = seasonPlan.macrocycleGroups?.flatMap(g => g.tuneUpRaces || []) || [];

  return (
    <div style={{ width: '100%', padding: '20px 0' }}>
      <div style={{ position: 'relative', width: '100%', minHeight: 180 }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 80,
            background: 'var(--bg-secondary)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {seasonPlan.macrocycles.map((macro, index) => {
            const startDate = new Date(macro.startDate);
            const endDate = new Date(macro.endDate);
            const startPercent = getPositionPercent(startDate);
            const widthPercent = getPositionPercent(endDate) - startPercent;

            const isCurrent =
              today >= startDate && today <= endDate;

            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                  height: '100%',
                  background: macro.color,
                  opacity: isCurrent ? 1 : 0.7,
                  borderRight: index < seasonPlan.macrocycles.length - 1 ? '2px solid var(--bg)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.2s',
                }}
              >
                <div
                  style={{
                    color: 'var(--bg)',
                    fontWeight: 600,
                    fontSize: 12,
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    textAlign: 'center',
                    padding: '0 4px',
                  }}
                >
                  {macro.displayName}
                  {isCurrent && <div style={{ fontSize: 10, marginTop: 2 }}>● Current</div>}
                </div>
              </div>
            );
          })}

          {showTodayMarker && isActive && (
            <div
              style={{
                position: 'absolute',
                left: `${todayPercent}%`,
                top: 0,
                bottom: 0,
                width: 2,
                background: 'var(--brand)',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '2px 6px',
                  background: 'var(--brand)',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 600,
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                Today
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: -8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '6px solid var(--brand)',
                }}
              />
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {seasonPlan.macrocycles.map((macro, index) => {
            const startDate = new Date(macro.startDate);
            const startPercent = getPositionPercent(startDate);

            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: `${startPercent}%`,
                  transform: 'translateX(-50%)',
                  textAlign: 'center',
                }}
              >
                <div style={{ width: 1, height: 8, background: 'var(--line)', marginBottom: 4 }} />
                <div className="small" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                <div className="small" style={{ color: 'var(--muted)', fontSize: 10, marginTop: 2 }}>
                  {macro.durationWeeks}w
                </div>
              </div>
            );
          })}
          <div
            style={{
              position: 'absolute',
              left: '100%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
            }}
          >
            <div style={{ width: 1, height: 8, background: 'var(--line)', marginBottom: 4 }} />
            <div className="small" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              {seasonEndDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        {(allRaceMarkers.length > 0 || tuneUpRaces.length > 0) && (
          <div style={{ marginTop: 40 }}>
            <div className="small" style={{ color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
              Race Schedule
            </div>
            <div style={{ position: 'relative', height: 60 }}>
              {allRaceMarkers.map((raceGroup, index) => {
                const raceDate = new Date(raceGroup.raceDate);
                const racePercent = getPositionPercent(raceDate);

                if (racePercent < 0 || racePercent > 100) return null;

                return (
                  <div
                    key={`race-${index}`}
                    style={{
                      position: 'absolute',
                      left: `${racePercent}%`,
                      transform: 'translateX(-50%)',
                      top: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        background: raceGroup.priority === 'A' ? 'var(--brand)' : '#999',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'white',
                        cursor: 'pointer',
                        border: '2px solid var(--bg)',
                      }}
                      title={`${raceGroup.raceName} - Priority ${raceGroup.priority}`}
                    >
                      {raceGroup.priority}
                    </div>
                    <div
                      className="small"
                      style={{
                        position: 'absolute',
                        top: 28,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                        color: 'var(--text)',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {raceGroup.raceName.length > 20 ? raceGroup.raceName.slice(0, 20) + '...' : raceGroup.raceName}
                    </div>
                  </div>
                );
              })}
              {tuneUpRaces.map((race, index) => {
                const raceDate = new Date(race.date);
                const racePercent = getPositionPercent(raceDate);

                if (racePercent < 0 || racePercent > 100) return null;

                return (
                  <div
                    key={`tune-${index}`}
                    style={{
                      position: 'absolute',
                      left: `${racePercent}%`,
                      transform: 'translateX(-50%)',
                      top: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        background: '#666',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        fontWeight: 600,
                        color: 'white',
                        cursor: 'pointer',
                        border: '1px solid var(--bg)',
                      }}
                      title={`${race.name} - Tune-up (${race.priority})`}
                    >
                      {race.priority}
                    </div>
                    <div
                      className="small"
                      style={{
                        position: 'absolute',
                        top: 22,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                        color: 'var(--muted)',
                        fontSize: 8,
                      }}
                    >
                      {race.name.length > 12 ? race.name.slice(0, 12) + '...' : race.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
        {seasonPlan.macrocycles.map((macro, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: macro.color,
              }}
            />
            <span className="small" style={{ color: 'var(--text)' }}>
              {macro.displayName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useCommunitySearch } from '@/hooks/useCommunitySearch';
import RunnerCard from '@/components/RunnerCard';
import { TERRAIN_OPTIONS, DAY_OPTIONS, type CompanionMatch } from '@/types/community';

interface FindCompanionsProps {
  onInvite?: (match: CompanionMatch) => void;
}

export default function FindCompanions({ onInvite }: FindCompanionsProps) {
  const { matches, localMatches, virtualMatches, loading, filters, updateFilters, refresh } = useCommunitySearch();
  const [viewMode, setViewMode] = useState<'all' | 'local' | 'virtual'>('all');
  const [selectedTerrain, setSelectedTerrain] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const displayMatches = viewMode === 'local' ? localMatches : viewMode === 'virtual' ? virtualMatches : matches;

  const handleTerrainFilter = (terrain: string) => {
    const newTerrain = selectedTerrain === terrain ? null : terrain;
    setSelectedTerrain(newTerrain);
    updateFilters({ terrain: newTerrain || undefined });
  };

  const handleDayToggle = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    setSelectedDays(newDays);
    updateFilters({ days: newDays.length > 0 ? newDays : undefined });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section className="card">
        <h2 className="h2">Find Your Running Crew</h2>
        <p className="small" style={{ marginTop: 6, color: 'var(--muted)' }}>
          Connect with runners who match your pace, schedule, and terrain preference
        </p>

        <div style={{ marginTop: 16 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button
              className={viewMode === 'all' ? 'btn primary' : 'btn'}
              onClick={() => setViewMode('all')}
            >
              All Matches ({matches.length})
            </button>
            <button
              className={viewMode === 'local' ? 'btn primary' : 'btn'}
              onClick={() => setViewMode('local')}
            >
              📍 Local ({localMatches.length})
            </button>
            <button
              className={viewMode === 'virtual' ? 'btn primary' : 'btn'}
              onClick={() => setViewMode('virtual')}
            >
              🌍 Virtual ({virtualMatches.length})
            </button>
            <button className="btn" onClick={refresh} style={{ marginLeft: 'auto' }}>
              🔄 Refresh
            </button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="small" style={{ marginBottom: 6, fontWeight: 600 }}>
              Filter by Terrain:
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {TERRAIN_OPTIONS.map(terrain => (
                <button
                  key={terrain.key}
                  className={selectedTerrain === terrain.key ? 'btn primary' : 'btn'}
                  onClick={() => handleTerrainFilter(terrain.key)}
                  style={{ fontSize: 13 }}
                >
                  {terrain.emoji} {terrain.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="small" style={{ marginBottom: 6, fontWeight: 600 }}>
              Filter by Running Days:
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {DAY_OPTIONS.map(day => (
                <button
                  key={day.key}
                  className={selectedDays.includes(day.key) ? 'btn primary' : 'btn'}
                  onClick={() => handleDayToggle(day.key)}
                  style={{ fontSize: 13, minWidth: 60 }}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <section className="card">
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div className="h2">Finding your matches...</div>
            <p className="small" style={{ color: 'var(--muted)', marginTop: 6 }}>
              Searching for compatible running partners
            </p>
          </div>
        </section>
      )}

      {!loading && displayMatches.length === 0 && (
        <section className="card">
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>👥</div>
            <div className="h2">No matches found</div>
            <p className="small" style={{ color: 'var(--muted)', marginTop: 6, maxWidth: 400, margin: '6px auto 0' }}>
              {viewMode === 'local' && localMatches.length === 0 && virtualMatches.length > 0
                ? `No local runners found nearby. Check out ${virtualMatches.length} virtual partners who can run with you remotely!`
                : 'Try adjusting your filters or inviting friends to join Unity'}
            </p>
            {viewMode === 'local' && virtualMatches.length > 0 && (
              <button
                className="btn primary"
                onClick={() => setViewMode('virtual')}
                style={{ marginTop: 16 }}
              >
                View Virtual Matches
              </button>
            )}
          </div>
        </section>
      )}

      {!loading && displayMatches.length > 0 && (
        <>
          {localMatches.length > 0 && viewMode === 'all' && (
            <section>
              <h3 className="h2" style={{ marginBottom: 12 }}>
                📍 Local Runners ({localMatches.length})
              </h3>
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                {localMatches.map(match => (
                  <RunnerCard key={match.id} match={match} onInvite={onInvite} onConnect={refresh} />
                ))}
              </div>
            </section>
          )}

          {virtualMatches.length > 0 && viewMode === 'all' && (
            <section>
              <h3 className="h2" style={{ marginBottom: 12 }}>
                🌍 Virtual Partners ({virtualMatches.length})
              </h3>
              <p className="small" style={{ marginBottom: 16, color: 'var(--muted)' }}>
                Connect with runners worldwide who match your pace and schedule
              </p>
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                {virtualMatches.map(match => (
                  <RunnerCard key={match.id} match={match} onInvite={onInvite} onConnect={refresh} />
                ))}
              </div>
            </section>
          )}

          {viewMode !== 'all' && (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {displayMatches.map(match => (
                <RunnerCard key={match.id} match={match} onInvite={onInvite} onConnect={refresh} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

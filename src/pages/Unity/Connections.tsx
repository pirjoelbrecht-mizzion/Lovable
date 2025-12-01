import { useState, useEffect } from 'react';
import {
  getMyConnections,
  getPendingConnectionRequests,
  acceptConnectionRequest,
  declineConnectionRequest,
  getCommunityStats,
} from '@/lib/community';
import type { CommunityConnection, CommunityStats } from '@/types/community';
import { toast } from '@/components/ToastHost';

export default function Connections() {
  const [connections, setConnections] = useState<CommunityConnection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CommunityConnection[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'connections' | 'pending'>('connections');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [connectionsData, pendingData, statsData] = await Promise.all([
        getMyConnections(),
        getPendingConnectionRequests(),
        getCommunityStats(),
      ]);
      setConnections(connectionsData.filter(c => c.status === 'accepted'));
      setPendingRequests(pendingData);
      setStats(statsData);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    const success = await acceptConnectionRequest(id);
    if (success) {
      toast('Connection accepted!', 'success');
      loadData();
    } else {
      toast('Failed to accept connection', 'error');
    }
  };

  const handleDecline = async (id: string) => {
    const success = await declineConnectionRequest(id);
    if (success) {
      toast('Connection declined', 'success');
      loadData();
    } else {
      toast('Failed to decline connection', 'error');
    }
  };

  if (loading) {
    return (
      <section className="card">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="h2">Loading connections...</div>
        </div>
      </section>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {stats && (
        <section className="card">
          <h2 className="h2">Your Unity Stats</h2>
          <div className="row" style={{ gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#06b6d4' }}>
                {stats.total_connections}
              </div>
              <div className="small" style={{ color: 'var(--muted)' }}>Connections</div>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>
                {stats.total_runs}
              </div>
              <div className="small" style={{ color: 'var(--muted)' }}>Runs Together</div>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>
                {stats.total_km.toFixed(1)}
              </div>
              <div className="small" style={{ color: 'var(--muted)' }}>Kilometers Together</div>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#8b5cf6' }}>
                {stats.active_invites}
              </div>
              <div className="small" style={{ color: 'var(--muted)' }}>Pending Invites</div>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <div className="row" style={{ gap: 8, marginBottom: 16 }}>
          <button
            className={activeTab === 'connections' ? 'btn primary' : 'btn'}
            onClick={() => setActiveTab('connections')}
          >
            My Connections ({connections.length})
          </button>
          <button
            className={activeTab === 'pending' ? 'btn primary' : 'btn'}
            onClick={() => setActiveTab('pending')}
          >
            Pending Requests ({pendingRequests.length})
          </button>
        </div>

        {activeTab === 'connections' && (
          <>
            {connections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
                <div className="h2">No connections yet</div>
                <p className="small" style={{ color: 'var(--muted)', marginTop: 6 }}>
                  Start by finding companions and sending connection requests
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {connections.map(conn => (
                  <article
                    key={conn.id}
                    className="card"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(6, 182, 212, 0.05))',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="h2" style={{ marginBottom: 4 }}>
                          Connection #{conn.id.slice(0, 8)}
                        </div>
                        <div className="small" style={{ color: 'var(--muted)' }}>
                          <span
                            style={{
                              background: conn.connection_type === 'local' ? '#06b6d4' : '#8b5cf6',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              marginRight: 8,
                            }}
                          >
                            {conn.connection_type === 'local' ? '📍 Local' : '🌍 Virtual'}
                          </span>
                          Connected {new Date(conn.accepted_at!).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {conn.runs_together > 0 && (
                          <>
                            <div style={{ fontWeight: 600, fontSize: 18 }}>
                              {conn.runs_together} runs
                            </div>
                            <div className="small" style={{ color: 'var(--muted)' }}>
                              {conn.total_km_together.toFixed(1)} km together
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'pending' && (
          <>
            {pendingRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✉️</div>
                <div className="h2">No pending requests</div>
                <p className="small" style={{ color: 'var(--muted)', marginTop: 6 }}>
                  Connection requests from other runners will appear here
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {pendingRequests.map(req => (
                  <article
                    key={req.id}
                    className="card"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(59, 130, 246, 0.05))',
                      border: '2px solid #8b5cf6',
                    }}
                  >
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="h2" style={{ marginBottom: 4 }}>
                          Connection Request
                        </div>
                        <div className="small" style={{ color: 'var(--muted)' }}>
                          <span
                            style={{
                              background: req.connection_type === 'local' ? '#06b6d4' : '#8b5cf6',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              marginRight: 8,
                            }}
                          >
                            {req.connection_type === 'local' ? '📍 Local' : '🌍 Virtual'}
                          </span>
                          Received {new Date(req.requested_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <button
                          className="btn primary"
                          onClick={() => handleAccept(req.id)}
                        >
                          ✅ Accept
                        </button>
                        <button
                          className="btn"
                          onClick={() => handleDecline(req.id)}
                        >
                          ❌ Decline
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

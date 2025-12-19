import { useState, useEffect } from 'react';
import useSession from '@/hooks/useSession';
import { useStrengthTraining } from '@/hooks/useStrengthTraining';
import {
  StrengthExerciseCard,
  StrengthSessionView,
  SorenessCheckModal,
  TerrainAccessSettings,
  type SorenessSubmission,
} from '@/components/strength';
import {
  fetchStrengthExercises,
  fetchMESessionTemplates,
  detectTerrainFromActivities,
} from '@/services/strengthTrainingService';
import type { MESessionTemplate, StrengthExercise } from '@/types/strengthTraining';
import { Dumbbell, Mountain, Settings, Activity, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

type TabType = 'overview' | 'terrain' | 'exercises' | 'session' | 'soreness';

export default function StrengthTraining() {
  const { user } = useSession();
  const userId = user?.id;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [exercises, setExercises] = useState<StrengthExercise[]>([]);
  const [templates, setTemplates] = useState<MESessionTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MESessionTemplate | null>(null);
  const [showSessionView, setShowSessionView] = useState(false);
  const [showSorenessModal, setShowSorenessModal] = useState(false);
  const [detectedGrade, setDetectedGrade] = useState<number | null>(null);

  const {
    terrainAccess,
    recentSoreness,
    activeLoadAdjustment,
    pendingFollowups,
    meAssignment,
    loadRegulation,
    coachingMessage,
    loading,
    updateTerrainAccess,
    submitSoreness,
    completeStrengthSession,
    checkRecovery,
    refreshData,
    shouldPromptSoreness,
  } = useStrengthTraining(null, 'base');

  useEffect(() => {
    loadExercises();
    detectTerrain();
  }, []);

  const loadExercises = async () => {
    const [exercisesData, templatesData] = await Promise.all([
      fetchStrengthExercises(),
      fetchMESessionTemplates(),
    ]);
    setExercises(exercisesData);
    setTemplates(templatesData);
  };

  const detectTerrain = async () => {
    if (userId) {
      const { maxGrade } = await detectTerrainFromActivities(userId);
      setDetectedGrade(maxGrade);
    }
  };

  const handleStartSession = (template: MESessionTemplate) => {
    setSelectedTemplate(template);
    setShowSessionView(true);
  };

  const handleSessionComplete = async (completedExercises: any[], notes: string) => {
    if (selectedTemplate) {
      await completeStrengthSession(selectedTemplate.id, completedExercises, notes);
      setShowSessionView(false);
      setSelectedTemplate(null);
      setShowSorenessModal(true);
      await refreshData();
    }
  };

  const handleSorenessSubmit = async (data: SorenessSubmission) => {
    await submitSoreness({
      triggerSessionId: null,
      bodyAreas: data.bodyAreas,
      overallSoreness: data.overallSoreness,
      isFollowup: data.isFollowup,
      originalRecordId: null,
      hasPain: data.hasPain,
      notes: data.notes,
    });
    setShowSorenessModal(false);
    await refreshData();
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: <TrendingUp size={18} /> },
    { id: 'terrain' as TabType, label: 'Terrain Setup', icon: <Mountain size={18} /> },
    { id: 'exercises' as TabType, label: 'Exercise Library', icon: <Dumbbell size={18} /> },
    { id: 'session' as TabType, label: 'Start Session', icon: <Activity size={18} /> },
    { id: 'soreness' as TabType, label: 'Track Soreness', icon: <AlertCircle size={18} /> },
  ];

  if (!userId) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p>Please sign in to access strength training features.</p>
      </div>
    );
  }

  if (showSessionView && selectedTemplate) {
    return (
      <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
        <StrengthSessionView
          template={selectedTemplate}
          exercises={exercises}
          meAssignment={meAssignment}
          loadRegulation={loadRegulation || {
            shouldAdjust: false,
            adjustmentType: null,
            adjustmentPercent: null,
            reason: '',
            exitCriteria: [],
          }}
          onSessionComplete={handleSessionComplete}
          onCancel={() => {
            setShowSessionView(false);
            setSelectedTemplate(null);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: 32, fontWeight: 700 }}>
            Adaptive Strength Training
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: 'var(--muted)' }}>
            Terrain-based ME assignment with automatic load regulation
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 24,
            overflowX: 'auto',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--primary)' : 'transparent'}`,
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--muted)',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'var(--primary-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)',
                    }}
                  >
                    <Mountain size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>ME Type</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                      {meAssignment ? meAssignment.meType.replace('_', ' ').toUpperCase() : 'Not set'}
                    </p>
                  </div>
                </div>
                {meAssignment && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                    {meAssignment.reason}
                  </p>
                )}
              </div>

              <div
                style={{
                  background: loadRegulation?.shouldAdjust ? 'var(--warning-bg)' : 'var(--success-bg)',
                  border: `1px solid ${loadRegulation?.shouldAdjust ? 'var(--warning)' : 'var(--success)'}`,
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: loadRegulation?.shouldAdjust ? 'var(--warning)' : 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    {loadRegulation?.shouldAdjust ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Load Status</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                      {loadRegulation?.shouldAdjust ? 'Adjusted' : 'Normal'}
                    </p>
                  </div>
                </div>
                {loadRegulation && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                    {loadRegulation.reason}
                  </p>
                )}
              </div>

              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'var(--primary-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)',
                    }}
                  >
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Recent Soreness</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                      {recentSoreness.length} records (7 days)
                    </p>
                  </div>
                </div>
                {recentSoreness.length > 0 && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                    Latest: {recentSoreness[0].overallSoreness}/10
                  </p>
                )}
              </div>
            </div>

            {coachingMessage && (
              <div
                style={{
                  background: 'var(--primary-bg)',
                  border: '1px solid var(--primary)',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>Coach Message</h3>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
                  {coachingMessage}
                </p>
              </div>
            )}

            {pendingFollowups.length > 0 && (
              <div
                style={{
                  background: 'var(--warning-bg)',
                  border: '1px solid var(--warning)',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>Pending 48h Check-ins</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--muted)' }}>
                  You have {pendingFollowups.length} soreness record(s) awaiting follow-up
                </p>
                <button
                  onClick={() => setShowSorenessModal(true)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--warning)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Complete Follow-up Check
                </button>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 600 }}>Quick Actions</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <button
                  onClick={() => setActiveTab('terrain')}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Settings size={20} color="var(--primary)" style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 600 }}>Configure Terrain</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Set equipment access</div>
                </button>
                <button
                  onClick={() => setActiveTab('session')}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Activity size={20} color="var(--success)" style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 600 }}>Start Session</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Begin strength training</div>
                </button>
                <button
                  onClick={() => setShowSorenessModal(true)}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <AlertCircle size={20} color="var(--warning)" style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 600 }}>Log Soreness</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Track recovery</div>
                </button>
                <button
                  onClick={() => setActiveTab('exercises')}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Dumbbell size={20} color="var(--primary)" style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 600 }}>Browse Exercises</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{exercises.length} available</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'terrain' && (
          <TerrainAccessSettings
            currentAccess={terrainAccess}
            detectedMaxGrade={detectedGrade}
            onSave={updateTerrainAccess}
          />
        )}

        {activeTab === 'exercises' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 600 }}>
                Exercise Library ({exercises.length} exercises)
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
                Browse all available strength exercises with video demos and technique cues
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {exercises.slice(0, 12).map((exercise) => (
                <StrengthExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  sets={3}
                  reps={exercise.exerciseType === 'isometric' ? undefined : 10}
                  duration={exercise.exerciseType === 'isometric' ? 30 : undefined}
                  showRecordButton={false}
                />
              ))}
            </div>

            {exercises.length > 12 && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                  Showing 12 of {exercises.length} exercises
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'session' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 600 }}>
                Available ME Sessions
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
                Select a session template to begin your strength training
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {templates.map((template) => {
                const isRecommended = meAssignment?.meType === template.meType;
                return (
                  <div
                    key={template.id}
                    style={{
                      background: isRecommended ? 'var(--primary-bg)' : 'var(--card)',
                      border: `2px solid ${isRecommended ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 12,
                      padding: 20,
                    }}
                  >
                    {isRecommended && (
                      <div
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          background: 'var(--primary)',
                          color: 'white',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          marginBottom: 12,
                        }}
                      >
                        RECOMMENDED FOR YOU
                      </div>
                    )}
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600 }}>
                      {template.name}
                    </h3>
                    <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>
                      {template.durationMinutes} minutes • {template.exercises.length} exercises
                    </div>
                    {template.description && (
                      <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                        {template.description}
                      </p>
                    )}
                    <button
                      onClick={() => handleStartSession(template)}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        borderRadius: 8,
                        border: 'none',
                        background: isRecommended ? 'var(--primary)' : 'var(--muted-bg)',
                        color: isRecommended ? 'white' : 'var(--foreground)',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Start Session
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'soreness' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 600 }}>
                Soreness Tracking
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
                Track your recovery and help the system adjust your training load automatically
              </p>
            </div>

            <button
              onClick={() => setShowSorenessModal(true)}
              style={{
                width: '100%',
                maxWidth: 400,
                padding: '16px 24px',
                borderRadius: 12,
                border: 'none',
                background: 'var(--primary)',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 24,
              }}
            >
              Log Current Soreness
            </button>

            {recentSoreness.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                  Recent Soreness Records
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recentSoreness.map((record) => (
                    <div
                      key={record.id}
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          {new Date(record.recordedAt).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                          {record.bodyAreas.length} area(s) affected
                          {record.isFollowup && ' • 48h follow-up'}
                          {record.hasPain && ' • Pain reported'}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          color: record.overallSoreness >= 7 ? 'var(--error)' : record.overallSoreness >= 5 ? 'var(--warning)' : 'var(--success)',
                        }}
                      >
                        {record.overallSoreness}/10
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <SorenessCheckModal
        isOpen={showSorenessModal}
        onClose={() => setShowSorenessModal(false)}
        onSubmit={handleSorenessSubmit}
        type={shouldPromptSoreness.type}
      />
    </div>
  );
}

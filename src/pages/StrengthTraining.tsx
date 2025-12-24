import { useState, useEffect } from 'react';
import useSession from '@/lib/useSession';
import { useStrengthTraining } from '@/hooks/useStrengthTraining';
import { useCoreTraining } from '@/hooks/useCoreTraining';
import {
  StrengthExerciseCard,
  StrengthSessionView,
  SorenessCheckModal,
  TerrainAccessSettings,
  type SorenessSubmission,
} from '@/components/strength';
import { CoreSessionCard } from '@/components/CoreSessionCard';
import {
  fetchStrengthExercises,
  fetchMESessionTemplates,
  detectTerrainFromActivities,
} from '@/services/strengthTrainingService';
import type { MESessionTemplate, StrengthExercise } from '@/types/strengthTraining';
import { Dumbbell, Mountain, Settings, Activity, AlertCircle, CheckCircle, TrendingUp, Target, RefreshCw } from 'lucide-react';

type TabType = 'overview' | 'terrain' | 'exercises' | 'session' | 'soreness' | 'core' | 'progression';

export default function StrengthTraining() {
  const { user, loading: authLoading, isAuthed } = useSession();
  const userId = user?.id;

  useEffect(() => {
    console.log('[StrengthTraining] Auth state:', { user: user?.email, userId, isAuthed });
  }, [user, userId, isAuthed]);

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

  const {
    coreExercises,
    coreEmphasis,
    coreFrequency,
    coreProgress,
    selectedCoreSession,
    meProgress,
    meProgressionState,
    meTemplates: coreTrainingMETemplates,
    currentMETemplate,
    upperBodyEligibility,
    sorenessAdjustment,
    completeMESession,
    restartMEProgression,
    reportCoreSoreness,
    refreshData: refreshCoreData,
  } = useCoreTraining({
    raceType: 'trail',
    period: 'base',
    terrainAccess,
    painReports: [],
    isRecoveryWeek: false,
  });

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
    { id: 'core' as TabType, label: 'Core Training', icon: <Target size={18} /> },
    { id: 'progression' as TabType, label: 'ME Progression', icon: <RefreshCw size={18} /> },
    { id: 'terrain' as TabType, label: 'Terrain Setup', icon: <Mountain size={18} /> },
    { id: 'exercises' as TabType, label: 'Exercise Library', icon: <Dumbbell size={18} /> },
    { id: 'session' as TabType, label: 'Start Session', icon: <Activity size={18} /> },
    { id: 'soreness' as TabType, label: 'Track Soreness', icon: <AlertCircle size={18} /> },
  ];

  if (authLoading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthed) {
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

        {activeTab === 'core' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 600 }}>
                Core Training
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
                Targeted core work based on your race type and current needs
              </p>
            </div>

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
                      background: 'rgba(34, 197, 94, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Target size={20} color="#22c55e" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Core Emphasis</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                      {coreEmphasis ? coreEmphasis.primary.replace('_', ' ') : 'Not set'}
                    </p>
                  </div>
                </div>
                {coreEmphasis && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ padding: '4px 10px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: 6, fontSize: 11, color: '#22c55e' }}>
                      {coreEmphasis.primary.replace('_', ' ')}
                    </span>
                    <span style={{ padding: '4px 10px', background: 'rgba(20, 184, 166, 0.2)', borderRadius: 6, fontSize: 11, color: '#14b8a6' }}>
                      {coreEmphasis.secondary.replace('_', ' ')}
                    </span>
                  </div>
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
                      background: 'rgba(59, 130, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Activity size={20} color="#3b82f6" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Weekly Frequency</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                      {coreFrequency.frequency}x per week, {coreFrequency.durationMinutes} min
                    </p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                  Intensity: {coreFrequency.intensity}
                </p>
              </div>
            </div>

            <CoreSessionCard
              exercises={selectedCoreSession}
              emphasis={coreEmphasis}
              frequency={coreFrequency}
              sessionsThisWeek={coreProgress?.sessionsThisWeek || 0}
              sorenessAdjustment={sorenessAdjustment}
              onComplete={async () => {
                await reportCoreSoreness(3);
                await refreshCoreData();
              }}
            />

            {coreExercises.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                  All Core Exercises ({coreExercises.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {coreExercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: 16,
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{exercise.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                        {exercise.coreCategories.map(c => c.replace('_', ' ')).join(' + ')}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 11 }}>
                          {exercise.difficulty}
                        </span>
                        <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 11 }}>
                          {exercise.eccentricLoad} eccentric
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'progression' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 600 }}>
                ME Progression
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
                Track your 12-workout muscular endurance progression
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000',
                      fontSize: 20,
                      fontWeight: 700,
                    }}
                  >
                    {meProgressionState?.targetWorkoutNumber || 1}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Current Workout</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                      of 12 in progression
                    </p>
                  </div>
                </div>

                {meProgressionState && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Progress</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {Math.round((meProgressionState.targetWorkoutNumber / 12) * 100)}%
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(meProgressionState.targetWorkoutNumber / 12) * 100}%`,
                          background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div
                  style={{
                    padding: '12px',
                    background: meProgressionState?.progressionAction === 'advance' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                    border: `1px solid ${meProgressionState?.progressionAction === 'advance' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    {meProgressionState?.progressionAction || 'Ready'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {meProgressionState?.reason || 'Start your first ME session'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Upper Body Eligibility</h3>
                <div
                  style={{
                    padding: '12px',
                    background: upperBodyEligibility.type === 'full' ? 'rgba(34, 197, 94, 0.1)' : upperBodyEligibility.type === 'maintenance' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${upperBodyEligibility.type === 'full' ? 'rgba(34, 197, 94, 0.3)' : upperBodyEligibility.type === 'maintenance' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    {upperBodyEligibility.type === 'full' ? 'Full Upper Body ME' : upperBodyEligibility.type === 'maintenance' ? 'Maintenance Only' : 'Lower Body Focus'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {upperBodyEligibility.reason}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to restart your ME progression from workout 1?')) {
                      await restartMEProgression();
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 8,
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Restart Progression
                </button>
              </div>
            </div>

            {currentMETemplate && (
              <div
                style={{
                  background: 'var(--card)',
                  border: '2px solid var(--primary)',
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ padding: '4px 12px', background: 'var(--primary)', color: 'white', borderRadius: 6, fontSize: 12, fontWeight: 600, display: 'inline-block', marginBottom: 8 }}>
                      NEXT WORKOUT
                    </div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{currentMETemplate.name}</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--muted)' }}>
                      {currentMETemplate.durationMinutes} min - {currentMETemplate.phase} phase
                    </p>
                  </div>
                </div>
                {currentMETemplate.description && (
                  <p style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
                    {currentMETemplate.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {currentMETemplate.exercises.slice(0, 5).map((ex, i) => (
                    <span
                      key={i}
                      style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, fontSize: 12 }}
                    >
                      {ex.name}
                    </span>
                  ))}
                  {currentMETemplate.exercises.length > 5 && (
                    <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, fontSize: 12, color: 'var(--muted)' }}>
                      +{currentMETemplate.exercises.length - 5} more
                    </span>
                  )}
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

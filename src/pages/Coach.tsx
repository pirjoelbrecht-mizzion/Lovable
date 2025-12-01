import { useState, useEffect, useRef } from 'react';
import { useT } from '@/i18n';
import { askCoach } from '@/ai/coach';
import { getOrCreateActiveConversation, saveCoachMessage, getConversationMessages, clearConversationHistory } from '@/lib/coachMessages';
import { getUserSettings } from '@/lib/userSettings';
import { loadUserProfile } from '@/state/userData';
import { load } from '@/utils/storage';
import { speak, canSpeak, createRecognizer } from '@/lib/voice';
import { toast } from '@/components/ToastHost';
import type { CoachMessage } from '@/lib/coachMessages';
import { reasonWeekly, DEFAULT_WEIGHTS, type Activity, type HealthState } from '@/ai/brain';
import { toneLine } from '@/ai/personality';
import { useReadinessScore } from '@/hooks/useReadinessScore';
import type { LogEntry } from '@/types';

export default function Coach() {
  const t = useT();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string>('');
  const [voiceOutEnabled, setVoiceOutEnabled] = useState(false);
  const [listening, setListening] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<ReturnType<typeof createRecognizer> | null>(null);

  const { readinessScore, loading: readinessLoading } = useReadinessScore();
  const logEntries = load<LogEntry[]>('logEntries', []);
  const profile = loadUserProfile();
  const health = load<HealthState>('health', 'ok');
  const raceWeeks = load<number>('raceWeeks', 12);
  const weights = load('weights', DEFAULT_WEIGHTS);

  const recentActivities: Activity[] = logEntries.slice(0, 7).map(entry => ({
    dateISO: entry.dateISO,
    km: entry.km || 0,
    rpe: entry.rpe || 5,
    sleepHours: entry.sleepHours || 7,
    hrv: entry.hrv || 60,
  }));

  const aiInsight = reasonWeekly({
    recentActivities,
    health,
    weights,
    raceProximityWeeks: raceWeeks,
    last4WeeksKm: [40, 46, 52, 48],
    thisWeekPlannedKm: 50,
  });

  useEffect(() => {
    initializeCoach();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeCoach = async () => {
    setLoading(true);
    try {
      const settings = await getUserSettings();
      setVoiceOutEnabled(settings.voice_output_enabled);

      const convId = await getOrCreateActiveConversation('coach');
      setConversationId(convId);

      const history = await getConversationMessages(convId);
      setMessages(history);
    } catch (error) {
      console.error('Error initializing coach:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || busy) return;

    setInput('');
    setBusy(true);

    const userMsg: CoachMessage = {
      conversation_id: conversationId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);

    await saveCoachMessage(conversationId, 'user', text);

    try {
      const profile = loadUserProfile();
      const recentActivities = load('recentActivities', []);
      const health = load('health', 'ok');

      const context = {
        health: health as any,
        recent: recentActivities,
        userName: profile.name,
      };

      const reply = await askCoach(text, context);

      const assistantMsg: CoachMessage = {
        conversation_id: conversationId,
        role: 'assistant',
        content: reply,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await saveCoachMessage(conversationId, 'assistant', reply);

      if (voiceOutEnabled && canSpeak()) {
        speak(reply, 'en-US');
      }
    } catch (error) {
      console.error('Error getting coach response:', error);
      const errorMsg: CoachMessage = {
        conversation_id: conversationId,
        role: 'assistant',
        content: 'Sorry, I ran into a problem. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all conversation history with AI Coach?')) return;

    const success = await clearConversationHistory(conversationId);
    if (success) {
      setMessages([]);
      toast('Conversation history cleared', 'success');
      await initializeCoach();
    } else {
      toast('Failed to clear history', 'error');
    }
  };

  const toggleMic = async () => {
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {}
      setListening(false);
    } else {
      const chunks: string[] = [];
      const r = createRecognizer((finalText) => {
        if (finalText) chunks.push(finalText);
      }, 'en-US');
      recRef.current = r;
      setListening(true);

      (r as any).onend = () => {
        setListening(false);
        const text = chunks.join(' ').trim();
        if (text) {
          setInput(text);
        }
      };

      try {
        r.start();
      } catch {
        setListening(false);
        toast('Microphone not available', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="grid" style={{ gap: 20 }}>
        <section className="card">
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="h2">Loading AI Coach...</div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 20, maxWidth: 900, height: 'calc(100vh - 120px)' }}>
      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="h2" style={{ marginBottom: 4 }}>AI Coach</h1>
            <p className="small" style={{ color: 'var(--muted)' }}>
              Your personal running advisor
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={handleClearHistory} title="Clear conversation history">
              🗑️ Clear
            </button>
          </div>
        </div>
      </section>

      {/* AI Insight & Readiness Summary */}
      {aiInsight && (
        <section className="grid cols-2" style={{ gap: 12 }}>
          <div className="card">
            <h2 className="h2">{t("home.ai_insight", "AI Insight")}</h2>
            <div className="small">{toneLine(profile.persona, aiInsight.reason)}</div>
            <hr style={{ margin: '12px 0' }} />
            <div className="kv">
              <span>{t("home.fatigue_score", "Fatigue score")}</span>
              <b>{aiInsight.fatigueScore.toFixed(2)}</b>
            </div>
            {"volumeCutPct" in aiInsight.adjustments && (
              <div className="kv">
                <span>{t("home.adjustment", "Adjustment")}</span>
                <b>
                  -{(aiInsight.adjustments as any).volumeCutPct}% {t("home.volume", "volume")}
                </b>
              </div>
            )}
            {"volumeBoostPct" in aiInsight.adjustments && (
              <div className="kv">
                <span>{t("home.adjustment", "Adjustment")}</span>
                <b>
                  +{(aiInsight.adjustments as any).volumeBoostPct}% {t("home.volume", "volume")}
                </b>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="h2">{t("readiness.title", "Readiness")}</h2>
            {readinessLoading ? (
              <div className="small" style={{ color: 'var(--muted)' }}>Loading...</div>
            ) : readinessScore !== undefined && readinessScore !== null ? (
              <>
                <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>
                  {readinessScore >= 80 ? '🟢' : readinessScore >= 60 ? '🟡' : '🔴'}
                </div>
                <div className="kv">
                  <span>{t("readiness.score", "Score")}</span>
                  <b>{readinessScore.toFixed(0)}%</b>
                </div>
                <div className="small" style={{ color: 'var(--muted)', marginTop: 8 }}>
                  {readinessScore >= 80
                    ? t("readiness.high", "You're ready for intense training")
                    : readinessScore >= 60
                    ? t("readiness.moderate", "Consider lighter training today")
                    : t("readiness.low", "Focus on recovery today")}
                </div>
              </>
            ) : (
              <div className="small" style={{ color: 'var(--muted)' }}>
                No readiness data available yet
              </div>
            )}
          </div>
        </section>
      )}

      <section
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            background: '#121316',
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, opacity: 0.7 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
              <p className="small">
                Ask me anything about your training, recovery, race prep, or running in general.
              </p>
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                <button className="btn" onClick={() => setInput("How should I taper for my race?")} style={{ fontSize: 12 }}>
                  How should I taper for my race?
                </button>
                <button className="btn" onClick={() => setInput("Analyze my recent training load")} style={{ fontSize: 12 }}>
                  Analyze my recent training load
                </button>
                <button className="btn" onClick={() => setInput("What's the best way to build endurance?")} style={{ fontSize: 12 }}>
                  What's the best way to build endurance?
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: 12,
                      borderRadius: 12,
                      background: msg.role === 'user' ? '#2563eb' : '#2a2a2a',
                      color: '#fff',
                    }}
                  >
                    <div className="small" style={{ opacity: 0.7, marginBottom: 4 }}>
                      {msg.role === 'user' ? 'You' : 'AI Coach'}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  </div>
                  {msg.created_at && (
                    <div className="small" style={{ opacity: 0.5, marginTop: 4, fontSize: 11 }}>
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              ))}
              {busy && (
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>AI Coach is thinking...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            disabled={busy}
            style={{ flex: 1 }}
          />
          {createRecognizer(() => {}, 'en-US').isSupported && (
            <button
              className="btn"
              onClick={toggleMic}
              disabled={busy}
              style={{
                background: listening ? '#ef4444' : undefined,
                color: listening ? '#fff' : undefined,
              }}
              title={listening ? 'Stop recording' : 'Voice input'}
            >
              {listening ? '⏹️' : '🎤'}
            </button>
          )}
          <button className="btn primary" onClick={sendMessage} disabled={busy || !input.trim()}>
            {busy ? '...' : 'Send'}
          </button>
        </div>
      </section>
    </div>
  );
}

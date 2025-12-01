import { useState, useEffect } from "react";
import { useT } from "@/i18n";
import { hasUnityEnabled, getPendingConnectionCount } from "@/lib/community";
import FindCompanions from "./Unity/FindCompanions";
import MyProfile from "./Unity/MyProfile";
import Connections from "./Unity/Connections";
import TravelBuddyPrompt from "@/components/TravelBuddyPrompt";
import { load, save } from "@/utils/storage";
import { rewardCoinsForStreak } from "@/utils/rewards";
import { MISSIONS } from "@/missions/catalog";
import { toast } from "@/components/ToastHost";

type TabType = 'discover' | 'profile' | 'connections';

export default function Unity() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [isUnityEnabled, setIsUnityEnabled] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<number>(load("streak", 3));
  const [coins, setCoins] = useState<number>(0);

  useEffect(() => {
    checkUnityStatus();
    const c = rewardCoinsForStreak(streak);
    setCoins(c);
  }, []);

  useEffect(() => save("streak", streak), [streak]);

  const incStreak = () => {
    const newStreak = streak + 1;
    setStreak(newStreak);
    setCoins(rewardCoinsForStreak(newStreak));
  };

  const decStreak = () => {
    const newStreak = Math.max(0, streak - 1);
    setStreak(newStreak);
    setCoins(rewardCoinsForStreak(newStreak));
  };

  const checkUnityStatus = async () => {
    setLoading(true);
    try {
      const enabled = await hasUnityEnabled();
      setIsUnityEnabled(enabled);
      if (enabled) {
        const count = await getPendingConnectionCount();
        setPendingCount(count);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid" style={{ gap: 20 }}>
        <section className="card">
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="h2">Loading Unity...</div>
          </div>
        </section>
      </div>
    );
  }

  if (!isUnityEnabled && activeTab === 'discover') {
    return (
      <div className="grid" style={{ gap: 20, maxWidth: 600, margin: '0 auto' }}>
        <section className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🤝</div>
          <h2 className="h2" style={{ marginBottom: 12 }}>
            Welcome to Unity
          </h2>
          <p className="small" style={{ color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
            Find your running crew! Connect with runners who match your pace, schedule, and goals.
            Run together locally or virtually from anywhere in the world.
          </p>

          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(139, 92, 246, 0.1))',
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
          }}>
            <div className="row" style={{ gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32 }}>📍</div>
                <div className="small" style={{ fontWeight: 600, marginTop: 4 }}>Local Matches</div>
                <div className="small" style={{ color: 'var(--muted)', fontSize: 11 }}>
                  Find runners nearby
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32 }}>🌍</div>
                <div className="small" style={{ fontWeight: 600, marginTop: 4 }}>Virtual Partners</div>
                <div className="small" style={{ color: 'var(--muted)', fontSize: 11 }}>
                  Connect worldwide
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32 }}>⚡</div>
                <div className="small" style={{ fontWeight: 600, marginTop: 4 }}>Smart Matching</div>
                <div className="small" style={{ color: 'var(--muted)', fontSize: 11 }}>
                  Pace + schedule sync
                </div>
              </div>
            </div>
          </div>

          <button
            className="btn primary"
            onClick={() => setActiveTab('profile')}
            style={{ padding: '12px 32px', fontSize: 16 }}
          >
            🚀 Set Up My Profile
          </button>

          <p className="small" style={{ color: 'var(--muted)', marginTop: 16, fontSize: 11 }}>
            Your privacy matters: location shared as proximity only, never exact address
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 className="h2">{t("unity.title", "Unity")}</h2>
            <p className="small" style={{ color: "var(--muted)", marginTop: 4 }}>
              Your running community
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              className={activeTab === 'discover' ? 'btn primary' : 'btn'}
              onClick={() => setActiveTab('discover')}
            >
              🔍 Discover
            </button>
            <button
              className={activeTab === 'connections' ? 'btn primary' : 'btn'}
              onClick={() => setActiveTab('connections')}
              style={{ position: 'relative' }}
            >
              🤝 Connections
              {pendingCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              className={activeTab === 'profile' ? 'btn primary' : 'btn'}
              onClick={() => setActiveTab('profile')}
            >
              ⚙️ My Profile
            </button>
          </div>
        </div>
      </section>

      {activeTab === 'discover' && <FindCompanions />}
      {activeTab === 'connections' && <Connections />}
      {activeTab === 'profile' && <MyProfile onProfileUpdated={checkUnityStatus} />}

      {isUnityEnabled && (
        <>
          {/* Streak & Coins */}
          <section className="card">
            <h2 className="h2">{t("home.streak_coins", "Streak & Coins")}</h2>
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <button className="btn" onClick={decStreak}>
                – {t("home.day", "day")}
              </button>
              <button className="btn" onClick={incStreak}>
                + {t("home.day", "day")}
              </button>
            </div>
            <div className="kv">
              <span>{t("home.streak", "Streak")}</span>
              <b>
                {streak} {t("home.days", "days")}
              </b>
            </div>
            <div className="kv">
              <span>{t("home.reward_this_week", "Reward this week")}</span>
              <b>
                {coins} {t("home.coins", "coins")}
              </b>
            </div>
          </section>

          {/* Quick Missions */}
          <section className="card">
            <h2 className="h2">{t("home.select_mission", "Group Challenges")}</h2>
            <p className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
              Complete these challenges with your running companions
            </p>
            <div className="grid" style={{ gap: 12 }}>
              {MISSIONS.slice(0, 3).map((m) => (
                <div key={m.id} className="card" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.title}</div>
                      <div className="small" style={{ color: 'var(--muted)' }}>{m.tagline}</div>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => toast(`${t("home.selected", "Selected")}: ${m.title}`, 'success')}
                      style={{ flexShrink: 0, marginLeft: 12 }}
                    >
                      {t("home.start", "Start")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <TravelBuddyPrompt />
        </>
      )}
    </div>
  );
}

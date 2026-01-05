import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { runDailyAdaptation } from "@/lib/scheduler";
import ErrorBoundary from "@/components/ErrorBoundary";
import ToastHost from "@/components/ToastHost";
import DebugBanner from "@/components/DebugBanner";
import LangSwitch from "@/components/LangSwitch";
import ConnectionsBadge from "@/components/ConnectionsBadge";
import FloatingCoach from "@/components/FloatingCoach";
import CoachBubble from "@/components/CoachBubble";
import AutoCalculationStatus from "@/components/AutoCalculationStatus";
import { useT } from "@/i18n";
import { getPendingConnectionCount } from "@/lib/community";
import { initializeApp } from "@/lib/initApp";

export default function App() {
  const { pathname } = useLocation();
  const t = useT();
  const [unityBadgeCount, setUnityBadgeCount] = useState(0);

  const hideNavigation = pathname.startsWith('/auth') || pathname.startsWith('/onboarding') || pathname === '/';
  const hideCoach = pathname.startsWith('/auth') || pathname.startsWith('/onboarding') || pathname === '/';

  useEffect(() => {
    console.log('App pathname:', pathname, 'hideCoach:', hideCoach);
  }, [pathname, hideCoach]);

  useEffect(() => {
    initializeApp();
    loadUnityBadge();
    const interval = setInterval(loadUnityBadge, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadUnityBadge = async () => {
    const count = await getPendingConnectionCount();
    setUnityBadgeCount(count);
  };

  const NavLink = ({ to, label, icon, badgeCount }: { to: string; label: string; icon: string; badgeCount?: number }) => (
    <Link
      to={to}
      className="bottom-nav-item"
      aria-current={pathname === to ? "page" : undefined}
      style={{ position: 'relative' }}
    >
      <div className="bottom-nav-icon">{icon}</div>
      <div className="bottom-nav-label">{label}</div>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 4,
            right: 12,
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </Link>
  );

  return (
    <ErrorBoundary>
      <>
        <div className="app-container">
          <div className="app-content">
            <Outlet />
          </div>

          {!hideNavigation && (
            <nav className="bottom-nav">
              <NavLink to="/quest" label={t("nav.quest", "Quest")} icon="🎯" />
              <NavLink to="/mirror" label={t("nav.mirror", "Mirror")} icon="📊" />
              <NavLink to="/unity" label={t("nav.unity", "Unity")} icon="🤝" badgeCount={unityBadgeCount} />
              <NavLink to="/coach" label={t("nav.coach", "Coach")} icon="🧠" />
              <NavLink to="/settings" label={t("nav.settings", "Settings")} icon="⚙️" />
            </nav>
          )}
        </div>

        {!hideCoach && <CoachBubble />}
        <ToastHost />
        <DebugBanner />
        {!hideCoach && <FloatingCoach />}
        <AutoCalculationStatus />
      </>
    </ErrorBoundary>
  );
}
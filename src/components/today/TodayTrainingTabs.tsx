import { FC, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type TabId = 'overview' | 'intelligence' | 'preparation';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

interface Props {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  children: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: '⚡' },
  { id: 'intelligence', label: 'Intelligence', icon: '🧠' },
  { id: 'preparation', label: 'Preparation', icon: '🎒' },
];

export const TodayTrainingTabs: FC<Props> = ({ activeTab, onTabChange, children }) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    const currentIndex = TABS.findIndex(t => t.id === activeTab);

    if (isLeftSwipe && currentIndex < TABS.length - 1) {
      onTabChange(TABS[currentIndex + 1].id);
      triggerHapticFeedback();
    }

    if (isRightSwipe && currentIndex > 0) {
      onTabChange(TABS[currentIndex - 1].id);
      triggerHapticFeedback();
    }
  };

  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleTabClick = (tabId: TabId) => {
    onTabChange(tabId);
    triggerHapticFeedback();
  };

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && TABS.some(t => t.id === hash)) {
      onTabChange(hash as TabId);
    }
  }, []);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  const activeIndex = TABS.findIndex(t => t.id === activeTab);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#0f1014',
      color: '#f9fafb',
      overflow: 'hidden'
    }}>
      {/* Tab Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#1e2228',
        borderBottom: '1px solid #2a2d3a',
        borderRadius: '12px 12px 0 0',
        margin: '0',
        padding: '4px 8px',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          position: 'relative',
          gap: '4px'
        }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  minWidth: '44px',
                  minHeight: '44px',
                  color: isActive ? '#f9fafb' : '#9ca3af'
                }}
              >
                <span style={{ fontSize: '18px' }}>{tab.icon}</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}>
                  {tab.label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '10%',
                      right: '10%',
                      height: '2px',
                      borderRadius: '2px',
                      backgroundColor: '#22c55e'
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div
        ref={contentRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          position: 'relative'
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeIndex > TABS.findIndex(t => t.id === activeTab) ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeIndex < TABS.findIndex(t => t.id === activeTab) ? 20 : -20 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ minHeight: '100%' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

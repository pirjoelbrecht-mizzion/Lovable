import { FC, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type TabId = 'overview' | 'intelligence' | 'preparation';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

interface Props {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  children: React.ReactNode;
}

const TabIcon: FC<{ type: TabId; active: boolean }> = ({ type, active }) => {
  const color = active ? '#10b981' : '#6b7280';
  const props = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2 };

  switch (type) {
    case 'overview':
      return (
        <svg {...props}>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      );
    case 'intelligence':
      return (
        <svg {...props}>
          <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2"/>
          <path d="M12 12l3-3"/>
          <path d="M12 8v4"/>
          <circle cx="12" cy="12" r="1"/>
        </svg>
      );
    case 'preparation':
      return (
        <svg {...props}>
          <path d="M9 5H2v14h7"/>
          <path d="M22 5h-7v14h7"/>
          <path d="M12 5v14"/>
          <path d="M9 12h6"/>
        </svg>
      );
  }
};

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: null },
  { id: 'intelligence', label: 'Intelligence', icon: null },
  { id: 'preparation', label: 'Preparation', icon: null },
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
      backgroundColor: '#0a0b0e',
      color: '#f9fafb',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#0a0b0e',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '12px 16px 8px',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '4px'
        }}>
          <motion.div
            layoutId="tabBackground"
            style={{
              position: 'absolute',
              top: '4px',
              bottom: '4px',
              width: `calc(${100 / TABS.length}% - 4px)`,
              left: `calc(${activeIndex * (100 / TABS.length)}% + 2px)`,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)',
              borderRadius: '10px',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />

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
                  padding: '10px 8px',
                  borderRadius: '10px',
                  transition: 'all 0.2s',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  minHeight: '52px',
                  zIndex: 1
                }}
              >
                <TabIcon type={tab.id} active={isActive} />
                <span style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 500,
                  whiteSpace: 'nowrap',
                  color: isActive ? '#10b981' : '#6b7280',
                  transition: 'color 0.2s'
                }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '10px'
        }}>
          {TABS.map((tab, idx) => (
            <div
              key={tab.id}
              style={{
                width: activeIndex === idx ? '20px' : '6px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: activeIndex === idx ? '#10b981' : 'rgba(255, 255, 255, 0.15)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>

      <div
        ref={contentRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="scrollbar-hide"
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ minHeight: '100%' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

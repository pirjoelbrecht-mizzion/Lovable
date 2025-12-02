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
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'intelligence', label: 'Intelligence', icon: '🧠' },
  { id: 'preparation', label: 'Prep', icon: '🎒' },
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
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark">
      <div className="sticky top-0 z-20 bg-bg-light dark:bg-bg-dark border-b border-line-light dark:border-line-dark">
        <div className="flex items-center justify-around relative px-2 pt-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-t-xl
                transition-all duration-200 relative
                ${activeTab === tab.id
                  ? 'text-primary-light dark:text-primary-dark'
                  : 'text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark'
                }
              `}
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium whitespace-nowrap">{tab.label}</span>

              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-light dark:bg-primary-dark rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={contentRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y'
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeIndex > TABS.findIndex(t => t.id === activeTab) ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeIndex < TABS.findIndex(t => t.id === activeTab) ? 20 : -20 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

import { useState, useEffect, useRef } from 'react';

type ScrollDirection = 'up' | 'down' | 'none';

type UseScrollDirectionOptions = {
  threshold?: number;
  throttleMs?: number;
};

export function useScrollDirection(options: UseScrollDirectionOptions = {}) {
  const { threshold = 50, throttleMs = 100 } = options;
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('none');
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const delta = scrollY - lastScrollY.current;

      if (Math.abs(delta) > threshold) {
        if (delta > 0) {
          setScrollDirection('down');
          setIsVisible(false);
        } else {
          setScrollDirection('up');
          setIsVisible(true);
        }
      }

      lastScrollY.current = scrollY;
      ticking.current = false;

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setIsVisible(true);
      }, 3000);
    };

    const onScroll = () => {
      if (!ticking.current) {
        window.setTimeout(() => {
          updateScrollDirection();
        }, throttleMs);
        ticking.current = true;
      }
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [threshold, throttleMs]);

  const forceVisible = () => {
    setIsVisible(true);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  };

  return { scrollDirection, isVisible, forceVisible };
}

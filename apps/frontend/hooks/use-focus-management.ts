import { useEffect, useRef } from 'react';

export function useFocusTrap(isActive: boolean = false) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstFocusable?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
}

export function useFocusReturn() {
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement;

    return () => {
      returnFocusRef.current?.focus();
    };
  }, []);

  return returnFocusRef;
}

export function useArrowKeyNavigation(itemsCount: number) {
  const currentIndexRef = useRef(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        currentIndexRef.current =
          currentIndexRef.current > 0
            ? currentIndexRef.current - 1
            : itemsCount - 1;
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        currentIndexRef.current =
          currentIndexRef.current < itemsCount - 1
            ? currentIndexRef.current + 1
            : 0;
        break;
      case 'Home':
        e.preventDefault();
        currentIndexRef.current = 0;
        break;
      case 'End':
        e.preventDefault();
        currentIndexRef.current = itemsCount - 1;
        break;
    }

    return currentIndexRef.current;
  };

  return { handleKeyDown, currentIndex: currentIndexRef.current };
}

export function useAnnouncement() {
  const announcementRef = useRef<HTMLDivElement>(null);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcementRef.current) return;

    announcementRef.current.setAttribute('aria-live', priority);
    announcementRef.current.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = '';
      }
    }, 1000);
  };

  return { announcementRef, announce };
}
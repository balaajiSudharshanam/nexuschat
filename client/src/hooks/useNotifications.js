import { useEffect, useCallback } from 'react';

const supported = typeof window !== 'undefined' && 'Notification' in window;

export function useNotifications() {
  useEffect(() => {
    if (supported && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const notify = useCallback((body) => {
    if (!supported) return;
    if (document.visibilityState === 'visible') return;
    if (Notification.permission !== 'granted') return;
    new Notification('Nexus', { body });
  }, []);

  return { notify };
}

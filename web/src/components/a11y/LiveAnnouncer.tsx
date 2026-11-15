import React, { useEffect, useRef, useState } from 'react';
import { liveAnnouncer } from '../../services/a11yAnnouncer';

/**
 * Always-mounted global live regions (polite & assertive).
 * Never conditionally unmounted so assistive tech always observes updates.
 * Uses a clear -> 100ms setTimeout pattern so screen readers (NVDA/Narrator)
 * reliably re-announce consecutive or rapid updates.
 */
export const LiveAnnouncer: React.FC = () => {
  const [politeText, setPoliteText] = useState('');
  const [assertiveText, setAssertiveText] = useState('');
  const politeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assertiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = liveAnnouncer.subscribe(({ politeness, message }) => {
      if (politeness === 'polite') {
        if (politeTimerRef.current) clearTimeout(politeTimerRef.current);
        setPoliteText('');
        politeTimerRef.current = setTimeout(() => {
          setPoliteText(message);
          politeTimerRef.current = null;
        }, 100);
      } else {
        if (assertiveTimerRef.current) clearTimeout(assertiveTimerRef.current);
        setAssertiveText('');
        assertiveTimerRef.current = setTimeout(() => {
          setAssertiveText(message);
          assertiveTimerRef.current = null;
        }, 100);
      }
    });

    return () => {
      unsub();
      if (politeTimerRef.current) clearTimeout(politeTimerRef.current);
      if (assertiveTimerRef.current) clearTimeout(assertiveTimerRef.current);
    };
  }, []);

  return (
    <>
      <div
        data-testid="global-live-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeText}
      </div>
      <div
        data-testid="global-live-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveText}
      </div>
    </>
  );
};

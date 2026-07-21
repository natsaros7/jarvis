import { useEffect, useRef, useCallback, useState } from 'react';
import { PurgeEvent } from '../types';
import { SSE_URL } from '../lib/api';

export function useSSE(onEvent: (event: PurgeEvent) => void) {
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const retries = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    const es = new EventSource(SSE_URL);
    esRef.current = es;

    es.onopen = () => { setConnected(true); retries.current = 0; };

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as PurgeEvent;
        onEventRef.current(event);
      } catch { /* ignore malformed */ }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      if (retries.current < 5) {
        retries.current++;
        setTimeout(connect, 2000 * retries.current);
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => esRef.current?.close();
  }, [connect]);

  return { connected };
}

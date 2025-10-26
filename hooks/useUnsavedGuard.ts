import { useEffect, useState, useRef } from 'react';
import Router from 'next/router';
import {
  computeDiff,
  PlanNormalizedMap,
  buildNormalizedFromData,
} from '@/lib/planner';

export function useUnsavedGuard(
  data: Record<string, any>,
  baseDataRef: React.RefObject<PlanNormalizedMap>,
  openConfirm: () => void
) {
  const [unsaved, setUnsaved] = useState<ReturnType<typeof computeDiff>>([]);
  const nextUrlRef = useRef<string | null>(null);

  function calcDiff() {
    const current = buildNormalizedFromData(data);
    const diff = computeDiff(baseDataRef.current, current);
    setUnsaved(diff);
  }
  // Track diff
  useEffect(() => {
    calcDiff();
  }, [data, baseDataRef]);

  // beforeunload
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (unsaved.length === 0) return;
      e.preventDefault();
      e.returnValue = '';
      openConfirm();
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [unsaved.length, openConfirm]);

  // Next.js route guard
  useEffect(() => {
    const onRouteChangeStart = (url: string) => {
      if (unsaved.length === 0 || nextUrlRef.current === url) return;
      nextUrlRef.current = url;
      openConfirm();
      Router.events.emit('routeChangeError');
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 'Route change aborted due to unsaved changes.';
    };
    Router.events.on('routeChangeStart', onRouteChangeStart);
    return () => {
      Router.events.off('routeChangeStart', onRouteChangeStart);
    };
  }, [unsaved.length]);

  return { unsaved, nextUrlRef, calcDiff };
}

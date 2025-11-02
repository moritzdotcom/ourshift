import { useEffect, useState, useRef, useMemo } from 'react';
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

  const unsavedCount = useMemo(() => {
    return unsaved.reduce((a, b) => a + b.changes.length, 0);
  }, [unsaved]);

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
      if (unsavedCount === 0) return;
      e.preventDefault();
      e.returnValue = '';
      openConfirm();
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [unsavedCount, openConfirm]);

  // Next.js route guard
  useEffect(() => {
    const onRouteChangeStart = (url: string) => {
      if (unsavedCount === 0 || nextUrlRef.current === url) return;
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
  }, [unsavedCount]);

  return { unsaved, unsavedCount, nextUrlRef, calcDiff };
}

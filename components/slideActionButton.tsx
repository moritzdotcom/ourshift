import {
  DndContext,
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
  useDraggable,
} from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import {
  IconArrowRightDashed,
  IconCheck,
  IconLoader2,
} from '@tabler/icons-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

function getWidth(el: HTMLElement | null) {
  if (!el) return 0;
  // Safari: getBoundingClientRect ist zuverlässiger
  const rect = el.getBoundingClientRect();
  // Fallback
  return rect.width || el.clientWidth || el.offsetWidth || 0;
}

function useMaxTravel(
  trackRef: React.RefObject<HTMLElement | null>,
  handleRef: React.RefObject<HTMLElement | null>
) {
  const [maxX, setMaxX] = useState(0);

  const measure = useCallback(() => {
    const trackW = getWidth(trackRef.current as HTMLElement);
    const handleW = getWidth(handleRef.current as HTMLElement);
    setMaxX(Math.max(0, Math.floor(trackW - handleW)));
  }, []);

  useLayoutEffect(() => {
    measure();
    // Fonts können Breite ändern (Safari!)
    if ((document as any).fonts?.ready) {
      (document as any).fonts.ready.then(measure).catch(() => {});
    }

    const ro = new (window as any).ResizeObserver(() => measure());
    if (ro && trackRef.current) ro.observe(trackRef.current);
    if (ro && handleRef.current) ro.observe(handleRef.current);

    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      ro?.disconnect?.();
    };
  }, [measure, trackRef, handleRef]);

  return { maxX, remeasure: measure };
}

type SlideState = 'idle' | 'loading' | 'success';

export default function SlideActionButton({
  id,
  color,
  children,
  disabled,
  onComplete,
  threshold = 0.95, // wie weit muss man sliden? 0..1
  successDuration = 900, // ms, wie lange Success angezeigt wird
  snapDuration = 200, // ms, Animationsdauer beim Snappen
}: {
  id: string;
  color?: 'red' | 'green';
  children: React.ReactNode;
  disabled?: boolean;
  onComplete?: () => Promise<void> | void; // darf async sein
  threshold?: number;
  successDuration?: number;
  snapDuration?: number;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLButtonElement | null>(null);

  const { maxX, remeasure } = useMaxTravel(trackRef, handleRef);

  // kontrollierte Position, wenn NICHT aktiv gedragt wird
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<SlideState>('idle');

  // Wir brauchen während Drag den Live-x (aus transform.x), ohne Re-renders zu spammen:
  const liveXRef = useRef(0);

  const handleDragStart = useCallback(
    (_: DragStartEvent) => {
      // Safari: sicherheitshalber nochmal messen
      remeasure();
      setDragging(true);
    },
    [remeasure]
  );

  const handleDragMove = useCallback((e: DragMoveEvent) => {
    liveXRef.current = Math.max(0, e.delta.x);
  }, []);

  const animateTo = useCallback(
    (targetX: number) =>
      new Promise<void>((resolve) => {
        // weiche Transition
        setDragging(false);
        // kleine async, damit der style-Transition greift
        requestAnimationFrame(() => {
          setX(Math.max(0, Math.min(maxX, targetX)));
          // Warte grob snapDuration, dann resolve
          setTimeout(resolve, snapDuration);
        });
      }),
    [maxX, snapDuration]
  );

  const reset = useCallback(async () => {
    await animateTo(0);
    setState('idle');
  }, [animateTo]);

  const handleDragEnd = useCallback(
    async (_e: DragEndEvent) => {
      setDragging(false);
      const dist = Math.max(0, liveXRef.current);
      const hit = maxX > 0 && dist / maxX >= threshold;

      if (!hit) {
        // snap zurück
        await animateTo(0);
        return;
      }

      // snap ans Ende
      await animateTo(maxX);

      // Loading → Success → Reset
      try {
        setState('loading');
        await Promise.resolve(onComplete?.());
        if (navigator.vibrate) navigator.vibrate(10);
        setState('success');
      } catch (err) {
        // optional: Fehler-Handling (shake/farbe etc.)
        await reset();
        return;
      }

      setTimeout(() => {
        reset();
      }, successDuration);
    },
    [animateTo, maxX, onComplete, reset, successDuration, threshold]
  );

  const canDrag = !disabled && state === 'idle';

  return (
    <DndContext
      modifiers={[restrictToParentElement]}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full bg-slate-200 border border-slate-300 rounded-lg relative overflow-hidden">
        {/* Label */}
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black">
          {children}
        </span>

        {/* Progress-Fill */}
        <div ref={trackRef} className="m-1 relative h-10">
          <Handle
            id={id}
            color={color}
            disabled={!canDrag}
            state={state}
            x={x}
            dragging={dragging}
            setNode={(el) => (handleRef.current = el)}
            snapDuration={snapDuration}
          />
        </div>
      </div>
    </DndContext>
  );
}

function Handle({
  id,
  color,
  disabled,
  state,
  x,
  dragging,
  setNode,
  snapDuration,
}: {
  id: string;
  color?: 'red' | 'green';
  disabled: boolean;
  state: SlideState;
  x: number; // kontrollierte pos (wenn nicht dragging)
  dragging: boolean; // wenn true, dnd-kit transform übernimmt
  setNode: (el: HTMLButtonElement | null) => void;
  snapDuration: number;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    disabled,
  });

  // Farbe & Icons
  const bgColor = color === 'red' ? 'bg-red-500' : 'bg-green-500';

  const content =
    state === 'loading' ? (
      <IconLoader2 className="animate-spin" />
    ) : state === 'success' ? (
      <IconCheck />
    ) : (
      <IconArrowRightDashed />
    );

  // Style Priorität:
  // - während Drag: transform vom dnd-kit
  // - sonst: kontrollierte X-Position + Transition (Snap)
  const style =
    dragging && transform
      ? { transform: `translate3d(${Math.max(0, transform.x)}px, 0, 0)` }
      : {
          transform: `translate3d(${x}px, 0, 0)`,
          transition: `transform ${snapDuration}ms ease`,
        };

  return (
    <button
      ref={(el) => {
        setNodeRef(el);
        setNode(el);
      }}
      type="button"
      className={`absolute left-0 top-1/2 -translate-y-1/2 py-2 px-5 rounded-lg ${bgColor} disabled:opacity-60 text-white [touch-action:none] select-none`}
      style={style}
      disabled={disabled}
      {...(!disabled ? listeners : {})}
      {...attributes}
    >
      {content}
    </button>
  );
}

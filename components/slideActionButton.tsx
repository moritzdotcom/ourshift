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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

  // kontrollierte Position, wenn NICHT aktiv gedragt wird
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<SlideState>('idle');

  // max Strecke
  const maxX = useMemo(() => {
    const t = trackRef.current;
    const h = handleRef.current;
    if (!t || !h) return 0;
    return Math.max(0, t.clientWidth - h.clientWidth);
  }, [children]); // falls Text/Größe sich ändert

  // Prozent-Progress (für Füllung)
  const progressPct = (() => {
    const cur = dragging
      ? // während Drag liefert dnd-kit transform.x – wir lesen ihn im move-Handler in tempRef
        undefined
      : x;
    const val = cur == null || maxX === 0 ? 0 : Math.min(1, cur / maxX);
    return val;
  })();

  // Wir brauchen während Drag den Live-x (aus transform.x), ohne Re-renders zu spammen:
  const liveXRef = useRef(0);

  const handleDragStart = useCallback((_e: DragStartEvent) => {
    setDragging(true);
  }, []);

  const handleDragMove = useCallback((e: DragMoveEvent) => {
    // clamp nach rechts
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

  // progress während drag per rAF visualisieren (ohne Re-render jedes Events)
  const [_, force] = useState(0);
  useEffect(() => {
    if (!dragging) return;
    let raf = 0;
    const tick = () => {
      // trigger minimal Re-render für progress-balken
      force((v) => v + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dragging]);

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
          {children}({x}/{maxX}px)
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

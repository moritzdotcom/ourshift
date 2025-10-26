import { useRef, useState, useLayoutEffect } from 'react';

export default function BandText({
  text,
  speed = 50,
  pauseOnHover = true,
  fade = true,
}: {
  text: string;
  speed?: number;
  pauseOnHover?: boolean;
  fade?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pRef = useRef<HTMLParagraphElement>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const p = pRef.current;
    if (!wrap || !p) return;

    let ro: ResizeObserver | null = null;

    function measure() {
      if (!wrap || !p) return;
      const container = wrap.clientWidth;
      const content = p.scrollWidth;
      const distance = content - container;
      if (distance > 2) {
        const durationSec = Math.max(
          4,
          Math.round((distance / speed) * 10) / 10
        );
        wrap.style.setProperty('--band-distance', `${distance}px`);
        wrap.style.setProperty('--band-duration', `${durationSec}s`);
        setAnimate(true);
      } else {
        setAnimate(false);
      }
    }
    // SSR-safe + Feature-Detection
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => {
        measure(); // deine Messfunktion
      });
      ro.observe(wrap);
      ro.observe(p);
    } else {
      // @ts-ignore (Fallback)
      window.addEventListener('resize', measure);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', measure);
    };
  }, [text, speed]);

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden ${fade ? 'band-fade' : ''} ${
        pauseOnHover ? 'band-hover' : ''
      }`}
    >
      <p
        ref={pRef}
        className={`inline-block m-0 whitespace-nowrap ${
          animate ? 'band-track' : ''
        }`}
      >
        {text}
      </p>

      <style jsx>{`
        .band-track {
          will-change: transform;
          animation: band-sway var(--band-duration, 8s) ease-in-out infinite
            alternate;
        }
        .band-hover:hover .band-track {
          animation-play-state: paused;
        }
        @keyframes band-sway {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-1 * var(--band-distance, 0px)));
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .band-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

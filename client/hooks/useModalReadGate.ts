import { useEffect, useRef, useState } from "react";

/**
 * Read gate for pacing modals: a 15-second timer plus scroll-to-bottom
 * before the CTA unlocks. Matches the Ascent PacingModal behavior.
 * Pass skipTimer=true for Summit Bound / Completed (scroll gate still applies).
 */
export function useModalReadGate(skipTimer: boolean, seconds = 15) {
  const [secondsLeft, setSecondsLeft] = useState(skipTimer ? 0 : seconds);

  useEffect(() => {
    if (skipTimer) { setSecondsLeft(0); return; }
    setSecondsLeft(seconds);
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1_000);
    return () => clearInterval(id);
  }, [skipTimer, seconds]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(true);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const check = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setCanScrollDown(distanceFromBottom > 20);
      // Once they reach the bottom, stay unlocked
      if (distanceFromBottom <= 20) setHasScrolledToBottom(true);
    };
    const initialOverflow = el.scrollHeight > el.clientHeight + 20;
    setHasScrolledToBottom(!initialOverflow);
    setCanScrollDown(initialOverflow);
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(() => {
      const overflow = el.scrollHeight > el.clientHeight + 20;
      if (!overflow) { setHasScrolledToBottom(true); setCanScrollDown(false); }
      else { check(); }
    });
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, []);

  const timerActive = secondsLeft > 0;
  return {
    bodyRef,
    secondsLeft,
    timerActive,
    canScrollDown,
    hasScrolledToBottom,
    locked: timerActive || !hasScrolledToBottom,
  };
}

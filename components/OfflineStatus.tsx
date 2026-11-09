/** Offline status for Pro, and the lock that keeps the free plan from working without a network. */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function OfflineBanner({ title, body, counts }: { title: string; body: string; counts: string }) {
  return (
    <div role="status" aria-live="polite" data-testid="offline-banner" className="bg-amber-50 border-b border-amber-200 text-amber-950 text-sm px-4 py-2.5">
      <div className="max-w-6xl mx-auto">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5">{body}</p>
        <p className="text-xs mt-1 text-amber-900" data-testid="offline-counts">{counts}</p>
      </div>
    </div>
  );
}

export function OfflineLock({ title, body }: { title: string; body: string }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { panelRef.current?.focus(); }, [mounted]);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="offline-lock-title" data-testid="offline-lock">
      <div ref={panelRef} tabIndex={-1} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl outline-none">
        <h2 id="offline-lock-title" className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-sm text-slate-600">{body}</p>
      </div>
    </div>,
    document.body,
  );
}

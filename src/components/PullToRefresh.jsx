import React, { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 70;

const isAtTop = (node) => {
  if (window.scrollY > 0) return false;
  let parent = node?.parentElement;
  while (parent) {
    if (parent.scrollTop > 0) return false;
    parent = parent.parentElement;
  }
  return true;
};

export default function PullToRefresh({ children, onRefresh }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const busy = useRef(false);

  const handleTouchStart = (event) => {
    if (busy.current) return;
    startY.current = isAtTop(event.currentTarget) ? event.touches[0].clientY : null;
  };

  const handleTouchMove = (event) => {
    if (startY.current === null) return;
    const delta = event.touches[0].clientY - startY.current;
    setPull(delta <= 0 ? 0 : Math.min(delta * 0.5, 90));
  };

  const handleTouchEnd = async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull < THRESHOLD) {
      setPull(0);
      return;
    }
    setPull(THRESHOLD);
    setRefreshing(true);
    busy.current = true;
    try {
      if (onRefresh) await onRefresh();
      else window.location.reload();
    } finally {
      busy.current = false;
      setRefreshing(false);
      setPull(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className="flex items-end justify-center overflow-hidden transition-[height] duration-200 md:hidden"
        style={{ height: pull }}
      >
        <RefreshCw
          className={cn("mb-2 h-5 w-5 text-primary", refreshing && "animate-spin")}
          style={
            refreshing
              ? undefined
              : { opacity: Math.min(pull / THRESHOLD, 1), transform: `rotate(${pull * 4}deg)` }
          }
        />
      </div>
      {children}
    </div>
  );
}
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { UserCursor, CursorPosition } from '@/hooks/useCursors';

interface CursorOverlayProps {
  cursors: UserCursor[];
  onCursorMove: (position: CursorPosition | null) => void;
  containerRef: React.RefObject<HTMLElement | null>;
}

export function CursorOverlay({ cursors, onCursorMove, containerRef }: CursorOverlayProps) {
  const rafRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [containerOffset, setContainerOffset] = useState({ left: 0, top: 0 });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;

      // Cancel any pending RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Calculate position relative to container
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Only send if within bounds
        if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
          onCursorMove({ x, y });
        }
      });
    },
    [containerRef, onCursorMove]
  );

  const handleMouseLeave = useCallback(() => {
    onCursorMove(null);
  }, [onCursorMove]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [containerRef, handleMouseMove, handleMouseLeave]);

  // Update current time periodically to filter stale cursors
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  // Update container offset when container changes
  useEffect(() => {
    const updateOffset = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerOffset({ left: rect.left, top: rect.top });
      }
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);
    window.addEventListener('scroll', updateOffset);

    return () => {
      window.removeEventListener('resize', updateOffset);
      window.removeEventListener('scroll', updateOffset);
    };
  }, [containerRef]);

  // Filter out cursors with no position or stale cursors (> 5 seconds old)
  const activeCursors = cursors.filter(
    (cursor) => cursor.cursor && currentTime - cursor.lastUpdate < 5000
  );

  if (activeCursors.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {activeCursors.map((user) => (
        <div
          key={user.id}
          className="absolute transition-all duration-75 ease-out"
          style={{
            left: (user.cursor?.x || 0) + containerOffset.left,
            top: (user.cursor?.y || 0) + containerOffset.top,
          }}
        >
          {/* Cursor pointer */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: user.color }}
            className="drop-shadow-md"
          >
            <path
              d="M5.65376 3.50039L21.0002 12.0004L12.5002 14.5004L9.50024 21.0004L5.65376 3.50039Z"
              fill="currentColor"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* User name label */}
          <div
            className="absolute left-4 top-4 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium text-white shadow-md"
            style={{ backgroundColor: user.color }}
          >
            {user.displayName || user.email.split('@')[0]}
          </div>
        </div>
      ))}
    </div>
  );
}

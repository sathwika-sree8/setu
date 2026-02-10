"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  storageKey?: string;
  bounds?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  };
  snapThreshold?: number;
  snapEdges?: boolean;
}

interface UseDraggableReturn {
  position: Position;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  resetPosition: () => void;
  setPosition: (pos: Position) => void;
  updatePosition: (pos: Position) => void;
}

const DEFAULT_POSITION: Position = { x: -20, y: -20 };
const DEFAULT_BOUNDS = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
const DEFAULT_SNAP_THRESHOLD = 50;

export function useDraggable(options: UseDraggableOptions = {}): UseDraggableReturn {
  const {
    initialPosition = DEFAULT_POSITION,
    storageKey = "floating-chat-position",
    bounds = DEFAULT_BOUNDS,
    snapThreshold = DEFAULT_SNAP_THRESHOLD,
    snapEdges = true,
  } = options;

  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  // Load position from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPosition(parsed);
          return;
        }
      } catch (e) {
        console.warn("Failed to parse saved position:", e);
      }
    }

    // Default position: bottom-right corner
    setPosition({
      x: window.innerWidth - 80,
      y: window.innerHeight - 100,
    });
  }, [storageKey]);

  // Save position to localStorage when it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(storageKey, JSON.stringify(position));
  }, [position, storageKey]);

  const snapToEdge = useCallback(
    (x: number, y: number): Position => {
      if (!snapEdges) return { x, y };

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const elementWidth = 60; // Approximate width of chat button
      const elementHeight = 60;

      let newX = x;
      let newY = y;

      // Snap to left or right
      if (x < snapThreshold) {
        newX = 16;
      } else if (x > viewportWidth - elementWidth - snapThreshold) {
        newX = viewportWidth - elementWidth - 16;
      }

      // Snap to top or bottom
      if (y < snapThreshold) {
        newY = 16;
      } else if (y > viewportHeight - elementHeight - snapThreshold) {
        newY = viewportHeight - elementHeight - 16;
      }

      return { x: newX, y: newY };
    },
    [snapEdges, snapThreshold]
  );

  const calculateConstrainedPosition = useCallback(
    (x: number, y: number): Position => {
      const { minX = 0, maxX = 0, minY = 0, maxY = 0 } = bounds;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const elementWidth = 60;
      const elementHeight = 60;

      const effectiveMaxX = maxX > 0 ? maxX : viewportWidth - elementWidth;
      const effectiveMaxY = maxY > 0 ? maxY : viewportHeight - elementHeight;

      return {
        x: Math.max(minX, Math.min(x, effectiveMaxX)),
        y: Math.max(minY, Math.min(y, effectiveMaxY)),
      };
    },
    [bounds]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialX: position.x,
        initialY: position.y,
      };
    },
    [position.x, position.y]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      setIsDragging(true);

      dragRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        initialX: position.x,
        initialY: position.y,
      };
    },
    [position.x, position.y]
  );

  useEffect(() => {
    if (!isDragging || !dragRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { startX, startY, initialX, initialY } = dragRef.current!;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newX = initialX + deltaX;
      const newY = initialY + deltaY;

      const constrained = calculateConstrainedPosition(newX, newY);
      setPosition(constrained);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const { startX, startY, initialX, initialY } = dragRef.current!;

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      const newX = initialX + deltaX;
      const newY = initialY + deltaY;

      const constrained = calculateConstrainedPosition(newX, newY);
      setPosition(constrained);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      const snapped = snapToEdge(position.x, position.y);
      if (snapped.x !== position.x || snapped.y !== position.y) {
        setPosition(snapped);
      }
      dragRef.current = null;
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      const snapped = snapToEdge(position.x, position.y);
      if (snapped.x !== position.x || snapped.y !== position.y) {
        setPosition(snapped);
      }
      dragRef.current = null;
    };

    // Add event listeners
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, position, calculateConstrainedPosition, snapToEdge]);

  const resetPosition = useCallback(() => {
    const newPos = {
      x: window.innerWidth - 80,
      y: window.innerHeight - 100,
    };
    setPosition(newPos);
  }, []);

  const updatePosition = useCallback(
    (newPos: Position) => {
      setPosition(newPos);
    },
    [setPosition]
  );

  return {
    position,
    isDragging,
    handleMouseDown,
    handleTouchStart,
    resetPosition,
    setPosition,
    updatePosition,
  };
}

export default useDraggable;


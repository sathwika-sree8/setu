import React, { useEffect, useState, useRef } from "react";
import * as Sentry from "@sentry/react";

/**
 * PresetSentryButton
 *
 * - Four preset positions: "top-left", "top-right", "bottom-left", "bottom-right"
 * - Small settings "pill" opens a tiny menu to pick a preset position
 * - Position persisted to localStorage (so it stays where user put it)
 * - Accessible: keyboard operable (Enter/Space) and ARIA labels
 *
 * Usage: Render <PresetSentryButton /> near the root of the app (e.g. in _app.tsx or Layout)
 */

type Preset = "top-left" | "top-right" | "bottom-left" | "bottom-right";
const STORAGE_KEY = "sentryButtonPresetPosition";
const DEFAULT: Preset = "bottom-left";

const presetStyles: Record<Preset, React.CSSProperties> = {
  "top-left": { top: 20, left: 20 },
  "top-right": { top: 20, right: 20 },
  "bottom-left": { bottom: 20, left: 20 },
  "bottom-right": { bottom: 20, right: 20 },
};

export default function PresetSentryButton() {
  const [preset, setPreset] = useState<Preset>(() => {
    try {
      const raw = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
      return (raw as Preset) || DEFAULT;
    } catch {
      return DEFAULT;
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preset);
    } catch {
      // ignore
    }
  }, [preset]);

  // close menu when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuOpen) return;
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", onDocClick);
    return () => window.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  function openSentryDialog() {
    try {
      if (typeof Sentry.showReportDialog === "function") {
        Sentry.showReportDialog();
      } else {
        console.warn("Sentry.showReportDialog is not available. Ensure Sentry is initialized.");
      }
    } catch (err) {
      console.error("Failed to open Sentry report dialog", err);
    }
  }

  function toggleMenu() {
    setMenuOpen((s) => !s);
  }

  function handlePresetSelect(p: Preset) {
    setPreset(p);
    setMenuOpen(false);
  }

  const containerBase: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    display: "flex",
    gap: 8,
    alignItems: "center",
    pointerEvents: "auto",
  };

  const mainButtonStyle: React.CSSProperties = {
    width: 56,
    height: 56,
    borderRadius: 28,
    background: "linear-gradient(135deg,#ff6b6b,#ff9f43)",
    color: "#fff",
    boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    cursor: "pointer",
    userSelect: "none",
    outline: "none",
    border: "none",
  };

  const settingsPillStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 18,
    background: "#ffffff",
    color: "#333",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    cursor: "pointer",
    border: "none",
  };

  const menuStyle: React.CSSProperties = {
    position: "absolute",
    minWidth: 160,
    background: "#fff",
    color: "#111",
    boxShadow: "0 6px 24px rgba(0,0,0,0.16)",
    borderRadius: 8,
    padding: 8,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };

  const menuButtonStyle: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 6,
    background: "transparent",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
  };

  // compute position for container (we align container to chosen corner)
  const computedStyle: React.CSSProperties = {
    ...containerBase,
    ...presetStyles[preset],
  };

  // position the menu relative to settings pill depending on corner
  function menuPlacement(): React.CSSProperties {
    const base: React.CSSProperties = { zIndex: 10000 };
    // For top corners -> menu should expand downward; bottom corners -> upwards
    if (preset.startsWith("top")) {
      // place menu below pill
      if (preset.endsWith("left")) {
        return { ...base, marginTop: 8, left: 0 };
      } else {
        // top-right: menu align to right edge
        return { ...base, marginTop: 8, right: 0 };
      }
    } else {
      // bottom corners: show menu above pill
      if (preset.endsWith("left")) {
        return { ...base, marginBottom: 8, left: 0, bottom: "100%" };
      } else {
        return { ...base, marginBottom: 8, right: 0, bottom: "100%" };
      }
    }
  }

  return (
    <div style={computedStyle} aria-hidden={false}>
      {/* Show main button first or second depending on visual preference;
          We'll keep main button first, settings pill next to it. */}
      <button
        aria-label="Report a bug"
        title="Report a bug"
        style={mainButtonStyle}
        onClick={() => openSentryDialog()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openSentryDialog();
          }
        }}
      >
        Bug
      </button>

      <div style={{ position: "relative" }} ref={menuRef}>
        <button
          aria-haspopup="true"
          aria-expanded={menuOpen}
          aria-label="Sentry button settings"
          title="Settings"
          style={settingsPillStyle}
          onClick={toggleMenu}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleMenu();
            } else if (e.key === "Escape") {
              setMenuOpen(false);
            }
          }}
        >
          ⚙
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Choose preset position"
            style={{ ...menuStyle, ...menuPlacement() }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px" }}>
              <strong style={{ fontSize: 13 }}>Position</strong>
              <button
                onClick={() => {
                  setPreset(DEFAULT);
                  setMenuOpen(false);
                }}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#0070f3" }}
              >
                Reset
              </button>
            </div>

            <button
              role="menuitem"
              style={{
                ...menuButtonStyle,
                background: preset === "top-left" ? "rgba(0,0,0,0.06)" : "transparent",
              }}
              onClick={() => handlePresetSelect("top-left")}
            >
              Top left
            </button>

            <button
              role="menuitem"
              style={{
                ...menuButtonStyle,
                background: preset === "top-right" ? "rgba(0,0,0,0.06)" : "transparent",
              }}
              onClick={() => handlePresetSelect("top-right")}
            >
              Top right
            </button>

            <button
              role="menuitem"
              style={{
                ...menuButtonStyle,
                background: preset === "bottom-left" ? "rgba(0,0,0,0.06)" : "transparent",
              }}
              onClick={() => handlePresetSelect("bottom-left")}
            >
              Bottom left
            </button>

            <button
              role="menuitem"
              style={{
                ...menuButtonStyle,
                background: preset === "bottom-right" ? "rgba(0,0,0,0.06)" : "transparent",
              }}
              onClick={() => handlePresetSelect("bottom-right")}
            >
              Bottom right
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
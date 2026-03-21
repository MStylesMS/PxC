import React, { useEffect, useRef, useState } from "react";
import "./LedClock.css";

const NAMED_RGB = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  orange: [255, 165, 0],
  purple: [128, 0, 128],
  pink: [255, 192, 203],
  gray: [128, 128, 128],
  silver: [192, 192, 192],
  navy: [0, 0, 128],
  teal: [0, 128, 128],
  lime: [0, 255, 0],
};

const parseHex = (value) => {
  const raw = value.startsWith('#') ? value.slice(1) : value;
  if (raw.length === 3) {
    return [
      parseInt(raw[0] + raw[0], 16),
      parseInt(raw[1] + raw[1], 16),
      parseInt(raw[2] + raw[2], 16),
    ];
  }
  if (raw.length === 6) {
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
    ];
  }
  return null;
};

const parseColorToRgb = (value, fallback) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const lower = trimmed.toLowerCase();
  if (NAMED_RGB[lower]) {
    return [...NAMED_RGB[lower]];
  }

  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return parseHex(trimmed) || fallback;
  }

  return fallback;
};

const toCssRgb = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

const lerp = (start, end, t) => start + ((end - start) * t);

const lerpRgb = (start, end, t) => [
  Math.round(lerp(start[0], end[0], t)),
  Math.round(lerp(start[1], end[1], t)),
  Math.round(lerp(start[2], end[2], t)),
];

// Props: time (seconds), hint (string), displayColors (object), visible (bool)
export default function LedClock({ time = 0, hint = '', displayColors = {}, visible = true }) {
  const [renderedColors, setRenderedColors] = useState(() => ({
    backgroundRgb: parseColorToRgb(displayColors.backgroundColor, NAMED_RGB.white),
    textRgb: parseColorToRgb(displayColors.textColor, NAMED_RGB.black),
    textAlpha: Number.isFinite(displayColors.textAlpha) ? displayColors.textAlpha : 1,
  }));
  const renderedColorsRef = useRef(renderedColors);
  const colorAnimationRef = useRef(null);

  useEffect(() => {
    renderedColorsRef.current = renderedColors;
  }, [renderedColors]);

  useEffect(() => {
    if (colorAnimationRef.current) {
      clearInterval(colorAnimationRef.current);
      colorAnimationRef.current = null;
    }

    const start = renderedColorsRef.current;
    const target = {
      backgroundRgb: parseColorToRgb(displayColors.backgroundColor, start.backgroundRgb),
      textRgb: parseColorToRgb(displayColors.textColor, start.textRgb),
      textAlpha: Number.isFinite(displayColors.textAlpha) ? displayColors.textAlpha : start.textAlpha,
    };
    const fadeMs = Number.isFinite(displayColors.fadeTime) && displayColors.fadeTime > 0
      ? displayColors.fadeTime * 1000
      : 0;

    if (fadeMs <= 0) {
      setRenderedColors(target);
      return undefined;
    }

    const startedAt = Date.now();
    colorAnimationRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const t = Math.min(1, elapsed / fadeMs);
      const next = {
        backgroundRgb: lerpRgb(start.backgroundRgb, target.backgroundRgb, t),
        textRgb: lerpRgb(start.textRgb, target.textRgb, t),
        textAlpha: lerp(start.textAlpha, target.textAlpha, t),
      };
      setRenderedColors(next);

      if (t >= 1) {
        clearInterval(colorAnimationRef.current);
        colorAnimationRef.current = null;
      }
    }, 50);

    return () => {
      if (colorAnimationRef.current) {
        clearInterval(colorAnimationRef.current);
        colorAnimationRef.current = null;
      }
    };
  }, [displayColors.backgroundColor, displayColors.textColor, displayColors.textAlpha, displayColors.fadeTime]);

  // Format MM:SS
  const mm = String(Math.floor(time / 60)).padStart(2, "0");
  const ss = String(time % 60).padStart(2, "0");
  const timeStr = `${mm}:${ss}`;
  const containerStyle = {
    backgroundColor: toCssRgb(renderedColors.backgroundRgb),
  };

  const textStyle = {
    color: toCssRgb(renderedColors.textRgb),
    opacity: renderedColors.textAlpha,
  };

  return (
    <div className={`led-clock-container ${visible ? "visible" : "hidden"}`} style={containerStyle}>
      <div className="led-clock-time" style={textStyle}>{timeStr}</div>
      {hint && <div className="led-clock-hint shown" style={textStyle}>{hint}</div>}
    </div>
  );
}

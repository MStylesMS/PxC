import React from "react";
import "./LedClock.css";

// Props: time (seconds), hint (string), visible (bool)
export default function LedClock({ time = 0, hint = '', visible = true }) {
  // Format MM:SS
  const mm = String(Math.floor(time / 60)).padStart(2, "0");
  const ss = String(time % 60).padStart(2, "0");
  const timeStr = `${mm}:${ss}`;

  return (
    <div className={`led-clock-container ${visible ? "visible" : "hidden"}`}> 
      <div className="led-clock-time">{timeStr}</div>
      {hint && (
        <div className="led-clock-hint">{hint}</div>
      )}
    </div>
  );
}

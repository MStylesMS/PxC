import React, { useMemo, useRef } from 'react';
import './MinutesHand.css';

const MinutesHand = React.memo(({ time, adjusting = false }) => {
  // Memoize rotation calculation for performance
  const prevRotationRef = useRef(null);

  const rotate = useMemo(() => {
    // Original elliptical mapping scaled for minutes hand progression
    let raw = Math.PI * (3 / 2) +
      Math.atan2(
        Math.cos((-Math.PI * time) / 1800),
        (3 / 5) * Math.sin((-Math.PI * time) / 1800)
      );

    const twoPi = 2 * Math.PI;
    if (prevRotationRef.current == null) {
      prevRotationRef.current = raw;
      return raw;
    }
    // Choose the shortest angular path between previous and new angle.
    // Normalize delta to (-PI, PI] and apply it directly so the hand
    // can move clockwise or counter-clockwise depending on which
    // is shorter (prevents large full-rotation jumps).
    let delta = raw - prevRotationRef.current;
    delta = ((delta + Math.PI) % twoPi) - Math.PI;
    const adjusted = prevRotationRef.current + delta;
    prevRotationRef.current = adjusted;
    return adjusted;
  }, [time]);

  // Memoize transform style; add smooth transition only when adjusting
  const transformStyle = useMemo(() => ({
    transform: `translate(0px, calc(85vh / 2.5 / 2)) rotate(${rotate}rad) translate(0px, calc(-85vh / 2.5 / 2))`,
    transition: adjusting ? 'transform 800ms ease-out' : undefined,
  }), [rotate, adjusting]);

  return (
    <div className="mm">
      <div
        className="m"
        style={transformStyle}
        data-testid="minutes-hand"
      />
    </div>
  );
});

MinutesHand.displayName = 'MinutesHand';

export default MinutesHand;
